import { beforeAll, describe, expect, it, vi } from 'vitest'
import { rememberPaperRole } from './trust'

const mock = vi.hoisted(() => {
  const appEvents = new Map<string, (...args: unknown[]) => unknown>()
  const handlers = new Map<string, (...args: unknown[]) => unknown>()
  const events = new Map<string, (...args: unknown[]) => unknown>()
  const windowEvents = new Map<string, (...args: unknown[]) => unknown>()
  const wcEvents = new Map<string, (...args: unknown[]) => unknown>()
  const mainFrame = { url: 'http://localhost:5173/history/index.html' }
  const wc = {
    id: 71,
    mainFrame,
    isDestroyed: () => false,
    getLastWebPreferences: () => ({ additionalArguments: ['--orbis-role=history'] }),
    send: vi.fn(),
    on: (name: string, cb: (...args: unknown[]) => unknown) => wcEvents.set(name, cb),
    once: (name: string, cb: (...args: unknown[]) => unknown) => wcEvents.set(name, cb),
  }
  const win = {
    webContents: wc,
    isDestroyed: () => false,
    close: vi.fn(),
    minimize: vi.fn(),
    isMaximized: () => false,
    maximize: vi.fn(),
    unmaximize: vi.fn(),
    on: (name: string, cb: (...args: unknown[]) => unknown) => windowEvents.set(name, cb),
    once: (name: string, cb: (...args: unknown[]) => unknown) => windowEvents.set(name, cb),
  }
  return {
    appEvents,
    quit: vi.fn(),
    handlers,
    events,
    windowEvents,
    wcEvents,
    wc,
    win,
    mainFrame,
    fromWebContents: vi.fn((sender: unknown) => (sender === wc ? win : null)),
    vaultFs: vi.fn(),
    vaultSize: vi.fn(),
    openExternal: vi.fn(),
    openDialog: vi.fn(async () => ({ canceled: false, filePaths: ['/chosen/file'] })),
    saveDialog: vi.fn(async () => ({ canceled: false, filePath: '/chosen/save' })),
    grantRead: vi.fn(),
    grantWrite: vi.fn(),
    clear: vi.fn(),
    externalCall: vi.fn(),
  }
})
vi.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: () => '/data',
    quit: mock.quit,
    on: (name: string, cb: (...args: unknown[]) => unknown) => mock.appEvents.set(name, cb),
  },
  BrowserWindow: { getAllWindows: () => [mock.win], fromWebContents: mock.fromWebContents },
  ipcMain: {
    handle: (channel: string, cb: (...args: unknown[]) => unknown) =>
      mock.handlers.set(channel, cb),
    on: (channel: string, cb: (...args: unknown[]) => unknown) => mock.events.set(channel, cb),
  },
  dialog: { showOpenDialog: mock.openDialog, showSaveDialog: mock.saveDialog },
  shell: { openExternal: mock.openExternal },
}))
vi.mock('./service', async (importOriginal) => {
  const original = await importOriginal<typeof import('./service')>()
  return {
    ...original,
    createVaultService: () => ({ fs: mock.vaultFs, size: mock.vaultSize }),
    ExternalPermissions: class {
      grantRead = mock.grantRead
      grantWrite = mock.grantWrite
      clear = mock.clear
      call = mock.externalCall
    },
  }
})

beforeAll(async () => {
  process.env['ELECTRON_RENDERER_URL'] = 'http://localhost:5173'
  const { registerPaperIpc } = await import('./index')
  rememberPaperRole(mock.wc, 'history')
  registerPaperIpc()
})
const event = () => ({ sender: mock.wc, senderFrame: mock.mainFrame })
const invoke = (channel: string, ...args: unknown[]) =>
  mock.handlers.get(channel)!(event(), ...args)

describe('paper IPC registration and sender enforcement', () => {
  it('leaves app quit untouched for unsubscribed and non-paper windows', async () => {
    const preventDefault = vi.fn()
    mock.appEvents.get('before-quit')!({ preventDefault })
    expect(preventDefault).not.toHaveBeenCalled()
    await invoke('paper:close:subscribe')
    const previousUrl = mock.mainFrame.url
    mock.mainFrame.url = 'http://localhost:5173/companion/index.html'
    mock.appEvents.get('before-quit')!({ preventDefault })
    expect(preventDefault).not.toHaveBeenCalled()
    mock.mainFrame.url = previousUrl
    await invoke('paper:close:unsubscribe')
  })
  it('registers every operation and the openExternal channel', async () => {
    const { PAPER_METHODS } = await import('../../shared/paper')
    for (const [namespace, methods] of Object.entries(PAPER_METHODS))
      for (const method of methods)
        expect(mock.handlers.has(`paper:${namespace}:${method}`)).toBe(true)
    await invoke('paper:fs:exists', 'books')
    expect(mock.vaultFs).toHaveBeenCalledWith('exists', ['books'])
    await invoke('paper:openExternal', 'https://example.com')
    expect(mock.openExternal).toHaveBeenCalledWith('https://example.com/')
  })
  it('rejects child frames, non-window senders, wrong roles and wrong main document URLs', async () => {
    const handler = mock.handlers.get('paper:fs:exists')!
    await expect(
      handler({ sender: mock.wc, senderFrame: { url: mock.mainFrame.url } }, 'x'),
    ).rejects.toThrow('frame')
    await expect(
      handler({ sender: { ...mock.wc }, senderFrame: mock.mainFrame }, 'x'),
    ).rejects.toThrow('sender')
    rememberPaperRole(mock.wc, 'reading')
    await expect(invoke('paper:fs:exists', 'x')).rejects.toThrow('document')
    rememberPaperRole(mock.wc, 'history')
    const previous = mock.mainFrame.url
    mock.mainFrame.url = 'https://evil.test/history/index.html'
    await expect(invoke('paper:fs:exists', 'x')).rejects.toThrow('document')
    mock.mainFrame.url = previous
  })
  it('only grants native dialog selections, never the renderer defaultPath', async () => {
    await invoke('paper:dialog:open', { defaultPath: '/renderer-request' })
    expect(mock.grantRead).toHaveBeenCalledWith('/chosen/file')
    expect(mock.grantRead).not.toHaveBeenCalledWith('/renderer-request')
    await invoke('paper:dialog:save', { defaultPath: '/renderer-request' })
    expect(mock.grantWrite).toHaveBeenCalledWith('/chosen/save')
    expect(mock.saveDialog.mock.calls[0]).toBeDefined()
  })
  it('intercepts native close and ignores replies from other senders', async () => {
    await invoke('paper:close:subscribe')
    const preventDefault = vi.fn()
    mock.windowEvents.get('close')!({ preventDefault })
    expect(preventDefault).toHaveBeenCalledOnce()
    const token = mock.wc.send.mock.calls.at(-1)![1]
    mock.events.get('paper:close:ready')!(
      { sender: { ...mock.wc }, senderFrame: mock.mainFrame },
      token,
      true,
    )
    expect(mock.win.close).not.toHaveBeenCalled()
    await invoke('paper:close:ready', token, true)
    expect(mock.win.close).toHaveBeenCalledOnce()
    mock.wcEvents.get('did-start-navigation')!({}, 'https://evil.test', false, true)
    expect(mock.clear).toHaveBeenCalled()
    expect(mock.quit).not.toHaveBeenCalled()
  })
  it('resumes the actual application quit path only after a trusted successful ACK', async () => {
    await invoke('paper:close:subscribe')
    const preventDefault = vi.fn()
    mock.appEvents.get('before-quit')!({ preventDefault })
    mock.appEvents.get('before-quit')!({ preventDefault })
    expect(preventDefault).toHaveBeenCalledTimes(2)
    const token = mock.wc.send.mock.calls.at(-1)![1]
    await invoke('paper:close:unsubscribe')
    expect(mock.quit).not.toHaveBeenCalled()
    await invoke('paper:close:ready', token, true)
    for (let i = 0; i < 8; i++) await Promise.resolve()
    expect(mock.quit).toHaveBeenCalledTimes(1)
    const resumedPrevent = vi.fn()
    mock.appEvents.get('before-quit')!({ preventDefault: resumedPrevent })
    expect(resumedPrevent).not.toHaveBeenCalled()
    const closePrevent = vi.fn()
    mock.windowEvents.get('close')!({ preventDefault: closePrevent })
    expect(closePrevent).not.toHaveBeenCalled()
  })
})
