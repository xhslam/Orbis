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
  getReadingWorkspace: () => null,
}))
import { registerReadingWorkspaceIpc } from './reading-workspace'
const savedArticles: any[] = []
const mockStore = {
  saveArticle: vi.fn((art: any) => { savedArticles.push(art) }),
}
beforeAll(() => {
  process.env['ELECTRON_RENDERER_URL'] = 'http://localhost:5173'
  rememberPaperRole(mock.wc, 'reading')
  registerReadingWorkspaceIpc({ store: mockStore as any })
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

  it('handles sendToRetell: enforces paper sender, creates article with highlights, saves to store', async () => {
    // Reading sender is rejected
    rememberPaperRole(mock.wc, 'reading')
    mock.frame.url = 'http://localhost:5173/reading/index.html'
    await expect(
      invoke('sendToRetell', {
        title: 'Sample Passage',
        text: 'This is a test paragraph.',
        origin: { bookId: 'b1', bookTitle: 'Book 1' },
      }),
    ).rejects.toThrow('untrusted')

    // Switch to paper sender
    rememberPaperRole(mock.wc, 'paper')
    mock.frame.url = 'http://localhost:5173/paper/index.html'

    // Invalid payload rejected
    await expect(invoke('sendToRetell', null)).rejects.toThrow('invalid sendToRetell payload')
    await expect(invoke('sendToRetell', { text: '', origin: { bookId: 'b1', bookTitle: 'Book 1' } })).rejects.toThrow('invalid sendToRetell payload')

    // Valid payload with highlight auto-mapping
    const res = (await invoke('sendToRetell', {
      title: 'Passage Title',
      text: 'First paragraph with keyword.\n\nSecond paragraph here.',
      origin: { bookId: 'book-123', bookTitle: 'Epic Book', cfi: 'epubcfi(/6/4)' },
      highlights: ['keyword'],
    })) as { ok: boolean; articleId: string }

    expect(res.ok).toBe(true)
    expect(res.articleId).toBeDefined()
    expect(mockStore.saveArticle).toHaveBeenCalled()
    const saved = savedArticles[savedArticles.length - 1]
    expect(saved.title).toBe('Passage Title')
    expect(saved.sourceType).toBe('paper')
    expect(saved.origin.bookId).toBe('book-123')
    expect(saved.origin.cfi).toBe('epubcfi(/6/4)')
    expect(saved.highlights.length).toBe(1)
    expect(saved.highlights[0].text).toBe('keyword')

    // Reset sender back to reading
    rememberPaperRole(mock.wc, 'reading')
    mock.frame.url = 'http://localhost:5173/reading/index.html'
  })

  it('handles saveToPaperCard: enforces reading sender and returns error when workspace inactive', async () => {
    // Paper sender is rejected
    rememberPaperRole(mock.wc, 'paper')
    mock.frame.url = 'http://localhost:5173/paper/index.html'
    await expect(
      invoke('saveToPaperCard', {
        kind: 'Recall',
        body: 'Question body',
        answer: 'Answer',
        source: 'Book',
        bookId: 'b1',
        cfi: null,
      }),
    ).rejects.toThrow('untrusted')

    // Reading sender with no workspace
    rememberPaperRole(mock.wc, 'reading')
    mock.frame.url = 'http://localhost:5173/reading/index.html'

    // Invalid payload
    const invalidRes = (await invoke('saveToPaperCard', null)) as any
    expect(invalidRes.ok).toBe(false)
    expect(invalidRes.error).toContain('Invalid RetellToPaperCardPayload')

    // Valid payload with inactive workspace
    const res = (await invoke('saveToPaperCard', {
      kind: 'Recall',
      body: 'Question body',
      answer: 'Answer',
      source: 'Book',
      bookId: 'b1',
      cfi: null,
    })) as any
    expect(res.ok).toBe(false)
    expect(res.error).toContain('Reading workspace not active')
  })
})
