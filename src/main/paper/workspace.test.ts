import { EventEmitter } from 'node:events'
import type { BrowserWindow } from 'electron'
import { beforeEach, describe, expect, it, vi } from 'vitest'

interface ViewMock {
  options: { webPreferences?: Electron.WebPreferences }
  webContents: EventEmitter & {
    loadFile: ReturnType<typeof vi.fn>
    loadURL: ReturnType<typeof vi.fn>
    setWindowOpenHandler: ReturnType<typeof vi.fn>
    close: ReturnType<typeof vi.fn>
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
        loadFile: vi.fn(async () => undefined),
        loadURL: vi.fn(async () => undefined),
        setWindowOpenHandler: vi.fn(),
        close: vi.fn(),
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
  it('creates Paper lazily once, preserving both documents when switching modes', () => {
    const { owner, workspace } = fixture()
    workspace.setMode('retell')
    expect(mocks.views).toHaveLength(0)
    workspace.setMode('paper')
    const view = mocks.views[0]!
    expect(view.options.webPreferences).toMatchObject({
      sandbox: true,
      backgroundThrottling: false,
    })
    expect(mocks.register).toHaveBeenCalledWith(owner, view.webContents)
    expect(owner.contentView.addChildView).toHaveBeenCalledOnce()
    expect(view.webContents.loadFile).toHaveBeenCalledWith(
      expect.stringMatching(/renderer\/paper\/index.html$/),
    )
    workspace.setMode('retell')
    expect(view.setVisible).toHaveBeenLastCalledWith(false)
    workspace.setMode('paper')
    expect(mocks.views).toHaveLength(1)
    expect(view.webContents.loadFile).toHaveBeenCalledOnce()
    expect(view.webContents.close).not.toHaveBeenCalled()
    expect(owner.webContents.send).toHaveBeenLastCalledWith('workspace:modeChanged', 'paper')
  })
  it('keeps bounds below the shell bar and resizes without reloading', () => {
    const { owner, workspace } = fixture()
    workspace.setMode('paper')
    const view = mocks.views[0]!
    expect(view.setBounds).toHaveBeenLastCalledWith({ x: 0, y: 52, width: 1000, height: 648 })
    owner.getContentSize.mockReturnValue([1100, 40])
    owner.emit('resize')
    expect(view.setBounds).toHaveBeenLastCalledWith({ x: 0, y: 52, width: 1100, height: 0 })
    owner.webContents.emit('did-finish-load')
    expect(owner.webContents.send).toHaveBeenLastCalledWith('workspace:modeChanged', 'paper')
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
