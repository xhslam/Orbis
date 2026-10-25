import type { IpcMainInvokeEvent } from 'electron'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { rememberPaperRole } from './paper/trust'
const mock = vi.hoisted(() => {
  const frame = { url: 'http://localhost:5173/reading/index.html' }
  const wc = { mainFrame: frame, isDestroyed: () => false }
  const win = { webContents: wc, isDestroyed: () => false }
  return { frame, wc, win, handlers: new Map<string, Function>(), open: vi.fn(), set: vi.fn() }
})
vi.mock('electron', () => ({
  app: { isPackaged: false },
  BrowserWindow: { fromWebContents: (wc: unknown) => (wc === mock.wc ? mock.win : null) },
  ipcMain: { handle: (channel: string, handler: Function) => mock.handlers.set(channel, handler) },
}))
vi.mock('./window', () => ({
  showReadingWindow: mock.open,
  setReadingMode: mock.set,
  getReadingMode: () => 'paper',
}))
import { registerReadingWorkspaceIpc } from './reading-workspace'
beforeAll(() => {
  process.env['ELECTRON_RENDERER_URL'] = 'http://localhost:5173'
  rememberPaperRole(mock.wc, 'reading')
  registerReadingWorkspaceIpc()
})
const event = () => ({ sender: mock.wc, senderFrame: mock.frame }) as unknown as IpcMainInvokeEvent
const invoke = (channel: string, ...args: unknown[]) =>
  mock.handlers.get(`workspace:${channel}`)!(event(), ...args)

describe('workspace IPC authority', () => {
  it('opens explicit modes and only accepts valid mode values', () => {
    invoke('open', 'paper')
    expect(mock.open).toHaveBeenCalledWith('paper')
    invoke('setMode', 'retell')
    expect(mock.set).toHaveBeenCalledWith('retell')
    expect(invoke('getMode')).toBe('paper')
    expect(() => invoke('open', 'other')).toThrow('invalid mode')
    expect(() => invoke('setMode', null)).toThrow('invalid mode')
  })
  it('allows history navigation but never changing an existing workspace from history', () => {
    rememberPaperRole(mock.wc, 'history')
    mock.frame.url = 'http://localhost:5173/history/index.html'
    invoke('open', 'retell')
    expect(() => invoke('setMode', 'paper')).toThrow('untrusted')
    mock.frame.url = 'http://localhost:5173/reading/index.html'
    rememberPaperRole(mock.wc, 'reading')
  })
  it('rejects child frames, Paper views and wrong URLs', () => {
    const handler = mock.handlers.get('workspace:open')!
    expect(() => handler({ sender: mock.wc, senderFrame: { ...mock.frame } }, 'paper')).toThrow(
      'untrusted',
    )
    expect(() => handler({ sender: {}, senderFrame: mock.frame }, 'paper')).toThrow('untrusted')
    rememberPaperRole(mock.wc, 'paper')
    expect(() => invoke('open', 'paper')).toThrow('untrusted')
    rememberPaperRole(mock.wc, 'reading')
    mock.frame.url = 'https://evil.test/reading/index.html'
    expect(() => invoke('getMode')).toThrow('untrusted')
    mock.frame.url = 'http://localhost:5173/reading/index.html'
  })
})
