import { app, dialog, ipcMain, shell } from 'electron'
import type { BrowserWindow, IpcMainEvent, IpcMainInvokeEvent, WebContents } from 'electron'
import path from 'node:path'
import { PAPER_CLOSE, PAPER_METHODS } from '../../shared/paper'
import { createVaultService, dialogOptions, ExternalPermissions, externalUrl } from './service'
import { PaperCloseController } from './close'
import { PaperQuitController } from './quit'
import { PaperSession } from './session'
import { registeredPaperRole, rememberPaperRole, trustedPaperUrl } from './trust'

const owners = new WeakMap<WebContents, BrowserWindow>()
const hosts = new Set<WebContents>()
let attachHost: ((win: BrowserWindow, wc: WebContents) => void) | undefined

/** Authority is assigned by the native factory, not inferred from preferences. */
export function registerPaperWindow(win: BrowserWindow, role: 'history' | 'reading'): void {
  rememberPaperRole(win.webContents, role)
  owners.set(win.webContents, win)
  hosts.add(win.webContents)
  attachHost?.(win, win.webContents)
}

export function registerPaperView(
  owner: BrowserWindow,
  wc: WebContents,
  role: 'paper' | 'reading' = 'paper',
): void {
  rememberPaperRole(wc, role)
  owners.set(wc, owner)
  hosts.add(wc)
  attachHost?.(owner, wc)
}

let registered = false

/** Register once, after app.whenReady(). No renderer-supplied path can grant access. */
export function registerPaperIpc(): void {
  if (registered) return
  registered = true
  const vault = createVaultService(path.join(app.getPath('userData'), 'paper'))
  const states = new Map<
    number,
    {
      permissions: ExternalPermissions
      close: PaperCloseController
      generation: number
      document: object
      wc: WebContents
      win: BrowserWindow
    }
  >()
  // Both dev and production main bundles live at out/main/index.js.
  const rendererRoot = path.join(__dirname, '../renderer')
  const devUrl = !app.isPackaged ? process.env['ELECTRON_RENDERER_URL'] : undefined

  const session = new PaperSession()
  function attach(win: BrowserWindow, wc: WebContents): void {
    if (states.has(wc.id)) return
    const permissions = new ExternalPermissions()
    const close = new PaperCloseController({
      send: (token) => wc.send(PAPER_CLOSE.request, token),
      close: () => {
        void session.drain().then(() => {
          if (!win.isDestroyed()) win.close()
        })
      },
      warn: (message) => console.warn(message),
    })
    const state = { permissions, close, generation: 0, document: {}, wc, win }
    states.set(wc.id, state)
    win.on('close', (event) => {
      if (!close.closing()) event.preventDefault()
      else if (registeredPaperRole(wc) === 'paper' && session.hasPending) {
        event.preventDefault()
        void session.drain().then(() => {
          if (!win.isDestroyed()) win.close()
        })
      }
    })
    const clear = (): void => {
      session.revoke(state.document)
      state.document = {}
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
      hosts.delete(wc)
    })
    const isOwnerContents = wc === win.webContents
    win.once('closed', () => {
      clear()
      states.delete(wc.id)
      hosts.delete(wc)
      try {
        if (!isOwnerContents && !wc.isDestroyed()) wc.close()
      } catch {}
    })
  }
  attachHost = attach
  for (const wc of hosts) {
    const owner = owners.get(wc)
    if (owner) attach(owner, wc)
  }

  const quit = new PaperQuitController({
    participants: () => {
      const participants = [...states.values()].flatMap((state) => {
        try {
          trustedContents(state.wc)
          return state.close.needsPreparation ||
            (registeredPaperRole(state.wc) === 'paper' && session.hasPending)
            ? [
                {
                  prepareForQuit: async () => {
                    const ok = await state.close.prepareForQuit()
                    if (ok) await session.drain()
                    return ok
                  },
                  allowQuit: () => state.close.allowQuit(),
                  cancelPreparation: () => state.close.cancelPreparation(),
                },
              ]
            : []
        } catch {
          return []
        }
      })
      // A navigated/crashed document may no longer be trusted, but its accepted
      // disk operations still belong to the vault and must finish before exit.
      if (session.hasPending)
        participants.push({
          prepareForQuit: async () => {
            await session.drain()
            return true
          },
          allowQuit: () => {},
          cancelPreparation: () => {},
        })
      return participants
    },
    quit: () => app.quit(),
    warn: (message) => console.warn(message),
  })
  app.on('before-quit', (event) => {
    if (!quit.beforeQuit()) event.preventDefault()
  })

  function trustedContents(sender: WebContents) {
    const win = owners.get(sender)
    if (!win || win.isDestroyed() || sender.isDestroyed())
      throw new Error('paper: untrusted sender')
    const role = registeredPaperRole(sender)
    if (!role || !trustedPaperUrl(sender.mainFrame.url, role, rendererRoot, devUrl))
      throw new Error('paper: untrusted document')
    attach(win, sender)
    return { win, state: states.get(sender.id)!, role }
  }

  function trusted(event: IpcMainEvent | IpcMainInvokeEvent) {
    const sender = event.sender
    if (event.senderFrame !== sender.mainFrame) throw new Error('paper: untrusted frame')
    return trustedContents(sender)
  }
  ipcMain.handle('paper:session:acquire', async (event) => {
    const { state, role } = trusted(event)
    if (role !== 'paper') throw new Error('paper: session requires paper role')
    const document = state.document
    await session.acquire(document)
    try {
      trusted(event)
      if (state.document !== document) throw new Error('paper: document changed')
    } catch (error) {
      session.revoke(document)
      throw error
    }
  })
  for (const [namespace, methods] of Object.entries(PAPER_METHODS)) {
    for (const method of methods) {
      ipcMain.handle(`paper:${namespace}:${method}`, async (event, ...args: unknown[]) => {
        const { win, state, role } = trusted(event)
        if (namespace !== 'window' && role !== 'paper')
          throw new Error('paper: session requires paper role')
        if (namespace !== 'window') session.assert(state.document)
        const document = state.document
        const operation = async () => {
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
                  ...(options.defaultPath !== undefined
                    ? { defaultPath: options.defaultPath }
                    : {}),
                  ...(options.filters !== undefined ? { filters: options.filters } : {}),
                  properties: [
                    options.directory ? 'openDirectory' : 'openFile',
                    ...(options.multiple ? ['multiSelections' as const] : []),
                  ],
                })
                trusted(event)
                session.assert(document)
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
              session.assert(document)
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
        }
        return namespace === 'window' ? operation() : session.run(document, operation)
      })
    }
  }
  ipcMain.handle('paper:openExternal', async (event, url: unknown) => {
    const { state, role } = trusted(event)
    if (role !== 'paper') throw new Error('paper: session requires paper role')
    await session.run(state.document, () => shell.openExternal(externalUrl(url)))
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
