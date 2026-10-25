import { app, WebContentsView } from 'electron'
import type { BrowserWindow } from 'electron'
import { join } from 'node:path'
import {
  WORKSPACE_BAR_HEIGHT,
  WORKSPACE_CHANNELS,
  type ReadingMode,
} from '../../shared/reading-workspace'
import { registerPaperView } from './ipc'

/** The shell and Paper are separate documents; hiding either must not dispose its stores. */
export class ReadingWorkspace {
  private mode: ReadingMode = 'retell'
  private view: WebContentsView | null = null
  constructor(
    private readonly owner: BrowserWindow,
    private readonly preferences: Electron.WebPreferences,
  ) {
    owner.on('resize', () => this.layout())
    owner.webContents.on('did-finish-load', () => this.notify())
  }
  getMode(): ReadingMode {
    return this.mode
  }
  getOwner(): BrowserWindow {
    return this.owner
  }
  getPaperWebContents(): Electron.WebContents {
    if (!this.view) this.createPaper()
    return this.view!.webContents
  }
  setMode(mode: ReadingMode): void {
    if (mode === 'paper' && !this.view) this.createPaper()
    this.mode = mode
    this.view?.setVisible(mode === 'paper')
    this.layout()
    this.notify()
  }
  private notify(): void {
    if (!this.owner.isDestroyed())
      this.owner.webContents.send(WORKSPACE_CHANNELS.modeChanged, this.mode)
  }
  private layout(): void {
    if (!this.view || this.owner.isDestroyed()) return
    const [width = 0, height = 0] = this.owner.getContentSize()
    this.view.setBounds({
      x: 0,
      y: WORKSPACE_BAR_HEIGHT,
      width,
      height: Math.max(0, height - WORKSPACE_BAR_HEIGHT),
    })
  }
  private createPaper(): void {
    const view = new WebContentsView({
      webPreferences: { ...this.preferences, backgroundThrottling: false },
    })
    this.view = view
    registerPaperView(this.owner, view.webContents)
    this.owner.contentView.addChildView(view)
    this.layout()
    // Programmatic initial load is allowed; renderer navigation, drops and popups are not.
    view.webContents.on('will-navigate', (event) => event.preventDefault())
    view.webContents.on('will-frame-navigate', (event) => {
      // Foliate owns sandboxed child documents; only the privileged top-level
      // document is pinned here. Child frames cannot pass IPC sender validation.
      if (event.isMainFrame) event.preventDefault()
    })
    view.webContents.on('will-redirect', (event) => {
      if (event.isMainFrame) event.preventDefault()
    })
    view.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
    const dev = app.isPackaged ? undefined : process.env['ELECTRON_RENDERER_URL']
    const loading =
      dev === undefined
        ? view.webContents.loadFile(join(__dirname, '../renderer/paper/index.html'))
        : view.webContents.loadURL(`${dev.replace(/\/$/, '')}/paper/index.html`)
    void loading.catch((error: unknown) => console.error('[paper] view failed to load', error))
  }
}
