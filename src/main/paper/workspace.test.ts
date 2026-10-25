import { EventEmitter } from 'node:events'
import type { BrowserWindow } from 'electron'
import { beforeEach, describe, expect, it, vi } from 'vitest'

interface ViewMock {
  options: { webPreferences?: Electron.WebPreferences }
  webContents: EventEmitter & {
    send: ReturnType<typeof vi.fn>
    loadFile: ReturnType<typeof vi.fn>
    loadURL: ReturnType<typeof vi.fn>
    setWindowOpenHandler: ReturnType<typeof vi.fn>
    close: ReturnType<typeof vi.fn>
    isDestroyed: () => boolean
    isLoading: () => boolean
  }
  setVisible: ReturnType<typeof vi.fn>
  setBounds: ReturnType<typeof vi.fn>
}
const mocks = vi.hoisted(() => ({ views: [] as ViewMock[], register: vi.fn() }))
vi.mock('./ipc', () => ({ registerPaperView: mocks.register }))
vi.mock('electron', async () => {
  const { EventEmitter } = await import('node:events')
  return {
    app: { isPackaged: true },
    WebContentsView: class {
      webContents = Object.assign(new EventEmitter(), {
        send: vi.fn(),
        loadFile: vi.fn(async () => undefined),
        loadURL: vi.fn(async () => undefined),
        setWindowOpenHandler: vi.fn(),
        close: vi.fn(),
        isDestroyed: () => false,
        isLoading: () => false,
      })
      setVisible = vi.fn()
      setBounds = vi.fn()
      constructor(public options: { webPreferences?: Electron.WebPreferences }) {
        mocks.views.push(this)
      }
    },
  }
})
import { ReadingWorkspace } from './workspace'

beforeEach(() => {
  mocks.views.length = 0
  mocks.register.mockClear()
})
function fixture() {
  const owner = Object.assign(new EventEmitter(), {
    webContents: Object.assign(new EventEmitter(), { send: vi.fn() }),
    contentView: { addChildView: vi.fn() },
    getContentSize: vi.fn(() => [1000, 700]),
    isDestroyed: () => false,
  })
  return {
    owner,
    workspace: new ReadingWorkspace(owner as unknown as BrowserWindow, { sandbox: true }),
  }
}

describe('reading workspace native view lifecycle', () => {
  it('creates each engine lazily once and preserves both when switching', () => {
    const { owner, workspace } = fixture()
    expect(mocks.views).toHaveLength(0)
    workspace.setLayout({ x: 232, y: 0, width: 768, height: 700, visible: true })
    workspace.setMode('retell')
    const retell = mocks.views[0]!
    expect(mocks.register).toHaveBeenCalledWith(owner, retell.webContents, 'reading')
    workspace.setMode('paper')
    const paper = mocks.views[1]!
    expect(paper.options.webPreferences).toMatchObject({
      sandbox: true,
      backgroundThrottling: false,
    })
    expect(mocks.register).toHaveBeenCalledWith(owner, paper.webContents, 'paper')
    expect(paper.webContents.loadFile).toHaveBeenCalledWith(
      expect.stringMatching(/renderer\/paper\/index.html$/),
    )
    expect(retell.webContents.loadFile).toHaveBeenCalledWith(
      expect.stringMatching(/renderer\/reading\/index.html$/),
    )
    expect(retell.setVisible).toHaveBeenLastCalledWith(false)
    expect(paper.setVisible).toHaveBeenLastCalledWith(true)
    workspace.setMode('retell')
    expect(retell.setVisible).toHaveBeenLastCalledWith(true)
    expect(paper.setVisible).toHaveBeenLastCalledWith(false)
    expect(mocks.views).toHaveLength(2)
    expect(owner.contentView.addChildView).toHaveBeenCalledTimes(2)
    for (const view of mocks.views) {
      expect(view.webContents.loadFile).toHaveBeenCalledOnce()
      expect(view.webContents.close).not.toHaveBeenCalled()
    }
  })
  it('keeps both views inside the content column and hides them on other pages', () => {
    const { owner, workspace } = fixture()
    workspace.setMode('paper')
    const view = mocks.views[0]!
    expect(view.setVisible).toHaveBeenLastCalledWith(false)
    workspace.setLayout({ x: 232, y: 0, width: 768, height: 700, visible: true })
    expect(view.setBounds).toHaveBeenLastCalledWith({ x: 232, y: 0, width: 768, height: 700 })
    workspace.setLayout({ x: 72, y: 0, width: 928, height: 700, visible: true })
    expect(view.setBounds).toHaveBeenLastCalledWith({ x: 72, y: 0, width: 928, height: 700 })
    owner.getContentSize.mockReturnValue([900, 600])
    owner.emit('resize')
    expect(view.setBounds).toHaveBeenLastCalledWith({ x: 72, y: 0, width: 828, height: 600 })
    workspace.setLayout({ x: 72, y: 0, width: 928, height: 700, visible: false })
    expect(view.setVisible).toHaveBeenLastCalledWith(false)
    owner.webContents.emit('did-finish-load')
    expect(view.setVisible).toHaveBeenLastCalledWith(false)
  })
  it('routes Paper excerpts to the Retell document, not the navigation shell', async () => {
    const { owner, workspace } = fixture()
    await workspace.openArticle('article-1')
    expect(owner.webContents.send).toHaveBeenCalledWith('workspace:modeChanged', 'retell')
    expect(owner.webContents.send).not.toHaveBeenCalledWith('workspace:openArticle', 'article-1')
    expect(mocks.views[0]!.webContents.send).toHaveBeenCalledWith(
      'workspace:openArticle',
      'article-1',
    )
  })
  it('closes both child documents with the main window', () => {
    const { owner, workspace } = fixture()
    workspace.setMode('retell')
    workspace.setMode('paper')
    owner.emit('closed')
    for (const view of mocks.views) expect(view.webContents.close).toHaveBeenCalledOnce()
  })
  it('prevents navigation/drop redirects and denies new windows', () => {
    const { workspace } = fixture()
    workspace.setMode('paper')
    const wc = mocks.views[0]!.webContents
    for (const name of ['will-navigate', 'will-frame-navigate', 'will-redirect']) {
      const preventDefault = vi.fn()
      wc.emit(name, { preventDefault, isMainFrame: true })
      expect(preventDefault).toHaveBeenCalledOnce()
    }
    const childPrevent = vi.fn()
    wc.emit('will-frame-navigate', { preventDefault: childPrevent, isMainFrame: false })
    expect(childPrevent).not.toHaveBeenCalled()
    expect(wc.setWindowOpenHandler.mock.calls[0]![0]()).toEqual({ action: 'deny' })
  })
})
