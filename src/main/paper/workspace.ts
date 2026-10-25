import { app, WebContentsView } from 'electron'
import type { BrowserWindow } from 'electron'
import { join } from 'node:path'
import {
  WORKSPACE_CHANNELS,
  type ReadingMode,
  type WorkspaceLayout,
} from '../../shared/reading-workspace'
import { registerPaperView } from './ipc'

/** Two persistent, isolated documents inside the main window's content column. */
export class ReadingWorkspace {
  private mode: ReadingMode = 'retell'
  private views = new Map<ReadingMode, WebContentsView>()
  private bounds: WorkspaceLayout = { x: 0, y: 0, width: 0, height: 0, visible: false }
  constructor(
    private readonly owner: BrowserWindow,
    private readonly preferences: Electron.WebPreferences,
    private readonly readingPreferences: Electron.WebPreferences = preferences,
  ) {
    owner.on('resize', () => this.layout())
    owner.webContents.on('did-finish-load', () => {
      this.bounds.visible = false
      this.layout()
    })
    owner.on('closed', () => {
      for (const view of this.views.values()) {
        if (!view.webContents.isDestroyed()) view.webContents.close()
      }
      this.views.clear()
    })
  }
  getMode(): ReadingMode {
    return this.mode
  }
  getOwner(): BrowserWindow {
    return this.owner
  }
  getPaperWebContents(): Electron.WebContents {
    return this.getView('paper').webContents
  }
  async openArticle(articleId: string): Promise<void> {
    this.setMode('retell')
    const wc = this.getView('retell').webContents
    if (wc.isLoading()) await new Promise<void>((resolve) => wc.once('did-finish-load', resolve))
    if (!wc.isDestroyed()) wc.send(WORKSPACE_CHANNELS.openArticle, articleId)
  }
  setLayout(bounds: WorkspaceLayout): void {
    this.bounds = { ...bounds }
    this.layout()
  }
  setMode(mode: ReadingMode): void {
    this.getView(mode)
    this.mode = mode
    this.layout()
    if (!this.owner.isDestroyed()) this.owner.webContents.send(WORKSPACE_CHANNELS.modeChanged, mode)
  }
  private layout(): void {
    if (this.owner.isDestroyed()) return
    const [width = 0, height = 0] = this.owner.getContentSize()
    const x = Math.min(width, this.bounds.x)
    const y = Math.min(height, this.bounds.y)
    for (const [mode, view] of this.views) {
      view.setBounds({
        x,
        y,
        width: Math.min(this.bounds.width, Math.max(0, width - x)),
        height: Math.min(this.bounds.height, Math.max(0, height - y)),
      })
      view.setVisible(this.bounds.visible && mode === this.mode)
    }
  }
  private getView(mode: ReadingMode): WebContentsView {
    const existing = this.views.get(mode)
    if (existing) return existing
    const role = mode === 'paper' ? 'paper' : 'reading'
    const view = new WebContentsView({
      webPreferences: {
        ...(mode === 'paper' ? this.preferences : this.readingPreferences),
        backgroundThrottling: false,
      },
    })
    this.views.set(mode, view)
    registerPaperView(this.owner, view.webContents, role)
    this.owner.contentView.addChildView(view)
    view.setVisible(false)
    view.webContents.on('will-navigate', (event) => event.preventDefault())
    view.webContents.on('will-frame-navigate', (event) => {
      if (event.isMainFrame) event.preventDefault()
    })
    view.webContents.on('will-redirect', (event) => {
      if (event.isMainFrame) event.preventDefault()
    })
    view.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
    const dev = app.isPackaged ? undefined : process.env['ELECTRON_RENDERER_URL']
    const loading =
      dev === undefined
        ? view.webContents.loadFile(join(__dirname, `../renderer/${role}/index.html`))
        : view.webContents.loadURL(`${dev.replace(/\/$/, '')}/${role}/index.html`)
    void loading.catch((error: unknown) => console.error(`[${role}] view failed to load`, error))
    this.layout()
    return view
  }
}
