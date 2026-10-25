import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import type { IpcMainEvent, IpcMainInvokeEvent } from 'electron'
import path from 'node:path'
import { PAPER_CLOSE, PAPER_METHODS } from '../../shared/paper'
import { createVaultService, dialogOptions, ExternalPermissions, externalUrl } from './service'
import { PaperCloseController } from './close'
import { PaperQuitController } from './quit'
import { registeredPaperRole, rememberPaperRole, trustedPaperUrl } from './trust'

/** Called only by the native window factory, never by an IPC channel. */
export function registerPaperWindow(win: BrowserWindow, role: 'history' | 'reading'): void {
  rememberPaperRole(win.webContents, role)
}

let registered = false

/** Register once, after app.whenReady(). No renderer-supplied path can grant access. */
export function registerPaperIpc(): void {
  if (registered) return
  registered = true
  const vault = createVaultService(path.join(app.getPath('userData'), 'paper'))
  const states = new Map<
    number,
    { permissions: ExternalPermissions; close: PaperCloseController; generation: number }
  >()
  // Both dev and production main bundles live at out/main/index.js.
  const rendererRoot = path.join(__dirname, '../renderer')
  const devUrl = !app.isPackaged ? process.env['ELECTRON_RENDERER_URL'] : undefined

  function attach(win: BrowserWindow): void {
    const wc = win.webContents
    if (states.has(wc.id)) return
    const permissions = new ExternalPermissions()
    const close = new PaperCloseController({
      send: (token) => wc.send(PAPER_CLOSE.request, token),
      close: () => {
        if (!win.isDestroyed()) win.close()
      },
      warn: (message) => console.warn(message),
    })
    const state = { permissions, close, generation: 0 }
    states.set(wc.id, state)
    win.on('close', (event) => {
      if (!close.closing()) event.preventDefault()
    })
    const clear = (): void => {
      permissions.clear()
      close.clear()
      state.generation += 1
    }
    wc.on('did-start-navigation', (_event, _url, isInPlace, isMainFrame) => {
      if (isMainFrame && !isInPlace) clear()
    })
    wc.on('render-process-gone', clear)
    wc.once('destroyed', () => {
      clear()
      states.delete(wc.id)
    })
    win.once('closed', () => {
      clear()
      states.delete(wc.id)
    })
  }
  for (const win of BrowserWindow.getAllWindows()) attach(win)
  app.on('browser-window-created', (_event, win) => attach(win))

  const quit = new PaperQuitController({
    participants: () =>
      BrowserWindow.getAllWindows().flatMap((win) => {
        try {
          // Never enlist companion windows, stale documents, or unsubscribed
          // paper windows in application-level preparation.
          const { state } = trustedWindow(win)
          return state.close.needsPreparation ? [state.close] : []
        } catch {
          return []
        }
      }),
    quit: () => app.quit(),
    warn: (message) => console.warn(message),
  })
  app.on('before-quit', (event) => {
    if (!quit.beforeQuit()) event.preventDefault()
  })

  function trustedWindow(win: BrowserWindow) {
    const sender = win.webContents
    if (win.isDestroyed() || sender.isDestroyed()) throw new Error('paper: destroyed window')
    const role = registeredPaperRole(sender)
    if (!role || !trustedPaperUrl(sender.mainFrame.url, role, rendererRoot, devUrl))
      throw new Error('paper: untrusted document')
    attach(win)
    return { win, state: states.get(sender.id)! }
  }

  function trusted(event: IpcMainEvent | IpcMainInvokeEvent) {
    const sender = event.sender
    const win = BrowserWindow.fromWebContents(sender)
    if (!win || win.isDestroyed() || sender.isDestroyed() || event.senderFrame !== sender.mainFrame)
      throw new Error('paper: untrusted sender/frame')
    return trustedWindow(win)
  }
  for (const [namespace, methods] of Object.entries(PAPER_METHODS)) {
    for (const method of methods) {
      ipcMain.handle(`paper:${namespace}:${method}`, async (event, ...args: unknown[]) => {
        const { win, state } = trusted(event)
        switch (namespace) {
          case 'fs':
            return vault.fs(method, args)
          case 'size':
            return vault.size(method, args)
          case 'externalFs':
            return state.permissions.call(method, args)
          case 'window':
            if (method === 'minimize') win.minimize()
            else if (method === 'toggleMaximize') {
              if (win.isMaximized()) win.unmaximize()
              else win.maximize()
            } else if (method === 'close') win.close()
            return
          case 'dialog': {
            const options = dialogOptions(args[0])
            const generation = state.generation
            if (method === 'open') {
              const selected = await dialog.showOpenDialog(win, {
                ...(options.title !== undefined ? { title: options.title } : {}),
                ...(options.defaultPath !== undefined ? { defaultPath: options.defaultPath } : {}),
                ...(options.filters !== undefined ? { filters: options.filters } : {}),
                properties: [
                  options.directory ? 'openDirectory' : 'openFile',
                  ...(options.multiple ? ['multiSelections' as const] : []),
                ],
              })
              trusted(event)
              if (state.generation !== generation)
                throw new Error('paper: document changed while dialog was open')
              if (selected.canceled) return null
              for (const file of selected.filePaths) await state.permissions.grantRead(file)
              if (state.generation !== generation) {
                state.permissions.clear()
                throw new Error('paper: document changed')
              }
              return selected.filePaths
            }
            const selected = await dialog.showSaveDialog(win, {
              ...(options.title !== undefined ? { title: options.title } : {}),
              ...(options.defaultPath !== undefined ? { defaultPath: options.defaultPath } : {}),
              ...(options.filters !== undefined ? { filters: options.filters } : {}),
              properties: ['showOverwriteConfirmation', 'createDirectory'],
            })
            trusted(event)
            if (state.generation !== generation)
              throw new Error('paper: document changed while dialog was open')
            if (selected.canceled || !selected.filePath) return null
            await state.permissions.grantWrite(selected.filePath)
            if (state.generation !== generation) {
              state.permissions.clear()
              throw new Error('paper: document changed')
            }
            return selected.filePath
          }
        }
        throw new Error('paper: unknown method')
      })
    }
  }
  ipcMain.handle('paper:openExternal', async (event, url: unknown) => {
    trusted(event)
    await shell.openExternal(externalUrl(url))
  })
  // Preload uses send, not invoke, for the close handshake. Also accept invoke so
  // callers can await subscription installation before their first write.
  for (const channel of [PAPER_CLOSE.subscribe, PAPER_CLOSE.unsubscribe, PAPER_CLOSE.ready]) {
    const receive = (event: IpcMainEvent | IpcMainInvokeEvent, ...args: unknown[]): void => {
      const { state } = trusted(event)
      if (channel === PAPER_CLOSE.subscribe) state.close.subscribe()
      else if (channel === PAPER_CLOSE.unsubscribe) state.close.unsubscribe()
      else {
        const payload = args[0]
        if (payload && typeof payload === 'object') {
          const { token, ok } = payload as { token?: unknown; ok?: unknown }
          state.close.ready(token, ok)
        } else state.close.ready(payload, args[1])
      }
    }
    ipcMain.handle(channel, receive)
    ipcMain.on(channel, (event, ...args: unknown[]) => {
      try {
        receive(event, ...args)
      } catch {
        console.warn('paper: rejected untrusted close handshake')
      }
    })
  }
}
