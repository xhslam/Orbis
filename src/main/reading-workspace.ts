import { app, BrowserWindow, ipcMain } from 'electron'
import type { IpcMainInvokeEvent } from 'electron'
import { join } from 'node:path'
import { isReadingMode, WORKSPACE_CHANNELS } from '../shared/reading-workspace'
import { registeredPaperRole, trustedPaperUrl } from './paper/trust'
import { getReadingMode, setReadingMode, showReadingWindow } from './window'

let registered = false
/** Install once during startup, after app.whenReady(). */
export function registerReadingWorkspaceIpc(): void {
  if (registered) return
  registered = true
  function trusted(event: IpcMainInvokeEvent, readingOnly = false): void {
    const wc = event.sender
    const owner = BrowserWindow.fromWebContents(wc)
    const role = registeredPaperRole(wc)
    if (
      !owner ||
      owner.isDestroyed() ||
      wc.isDestroyed() ||
      wc !== owner.webContents ||
      event.senderFrame !== wc.mainFrame ||
      (role !== 'reading' && role !== 'history') ||
      (readingOnly && role !== 'reading') ||
      !trustedPaperUrl(
        wc.mainFrame.url,
        role,
        join(__dirname, '../renderer'),
        app.isPackaged ? undefined : process.env['ELECTRON_RENDERER_URL'],
      )
    )
      throw new Error('workspace: untrusted top-level sender')
  }
  ipcMain.handle(WORKSPACE_CHANNELS.open, (event, mode: unknown) => {
    trusted(event)
    if (!isReadingMode(mode)) throw new Error('workspace: invalid mode')
    showReadingWindow(mode)
  })
  ipcMain.handle(WORKSPACE_CHANNELS.setMode, (event, mode: unknown) => {
    trusted(event, true)
    if (!isReadingMode(mode)) throw new Error('workspace: invalid mode')
    setReadingMode(mode)
  })
  ipcMain.handle(WORKSPACE_CHANNELS.getMode, (event) => {
    trusted(event)
    return getReadingMode()
  })
}
