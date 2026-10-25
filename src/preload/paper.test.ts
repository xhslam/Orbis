import { describe, expect, it, vi } from 'vitest'
import { createPaperBridge } from './paper'
import { PAPER_CLOSE } from '@shared/paper'

function harness() {
  let request!: (event: unknown, token: string) => void
  const ipc = {
    invoke: vi.fn(async (_channel: string, ..._args: unknown[]): Promise<unknown> => undefined),
    send: vi.fn(),
    on: vi.fn((_channel: string, listener: typeof request) => {
      request = listener
    }),
  }
  const api = createPaperBridge(ipc)
  return { api, ipc, request: (token: string) => request({}, token) }
}

const settle = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

describe('Paper preload bridge', () => {
  it('forwards only hard-coded filesystem channels and preserves binary arguments', async () => {
    const { api, ipc } = harness()
    const bytes = new Uint8Array([1, 255])
    await api.fs.writeAtomic('books/a/book.json', bytes, 'full')
    expect(ipc.invoke).toHaveBeenCalledWith(
      'paper:fs:writeAtomic',
      'books/a/book.json',
      bytes,
      'full',
    )
    await api.fs.readRange('books/a/content.pdf', 4, 10)
    expect(ipc.invoke).toHaveBeenCalledWith('paper:fs:readRange', 'books/a/content.pdf', 4, 10)
    expect('invoke' in api).toBe(false)
    expect('send' in api).toBe(false)
  })

  it('uses the namespace channels for dialog, external files, sizes and windows', async () => {
    const { api, ipc } = harness()
    await api.dialog.open({ directory: true })
    await api.externalFs.stat('/selected/book.epub')
    await api.size.libraryBytes()
    await api.openExternal('https://example.com')
    await api.window.close()
    expect(ipc.invoke.mock.calls.map(([channel]) => channel)).toEqual([
      'paper:dialog:open',
      'paper:externalFs:stat',
      'paper:size:libraryBytes',
      'paper:openExternal',
      'paper:window:close',
    ])
  })

  it('does not acknowledge a close until every subscriber has finished', async () => {
    const { api, ipc, request } = harness()
    let finish!: () => void
    const waiting = new Promise<void>((resolve) => {
      finish = resolve
    })
    const first = vi.fn(() => waiting)
    const second = vi.fn(async () => {})
    api.window.onBeforeClose(first)
    api.window.onBeforeClose(second)
    expect(ipc.send).toHaveBeenCalledTimes(1)
    expect(ipc.send).toHaveBeenCalledWith(PAPER_CLOSE.subscribe)
    request('close-1')
    await settle()
    expect(first).toHaveBeenCalledOnce()
    expect(second).toHaveBeenCalledOnce()
    expect(ipc.send).not.toHaveBeenCalledWith(PAPER_CLOSE.ready, 'close-1', true)
    finish()
    await settle()
    expect(ipc.send).toHaveBeenCalledWith(PAPER_CLOSE.ready, 'close-1', true)
  })

  it('unsubscribes only after the final callback and disposal is idempotent', () => {
    const { api, ipc } = harness()
    const stopA = api.window.onBeforeClose(async () => {})
    const stopB = api.window.onBeforeClose(async () => {})
    stopA()
    stopA()
    expect(ipc.send).not.toHaveBeenCalledWith(PAPER_CLOSE.unsubscribe)
    stopB()
    stopB()
    expect(
      ipc.send.mock.calls.filter(([channel]) => channel === PAPER_CLOSE.unsubscribe),
    ).toHaveLength(1)
  })

  it('re-flushes on a fresh close after another window cancelled an application quit', async () => {
    const { api, ipc, request } = harness()
    const prepare = vi.fn(async () => {})
    api.window.onBeforeClose(prepare)
    request('first')
    await settle()
    request('second')
    await settle()
    expect(prepare).toHaveBeenCalledTimes(2)
    expect(ipc.send).toHaveBeenCalledWith(PAPER_CLOSE.ready, 'second', true)
  })

  it('reports preparation errors instead of acknowledging success, and can retry', async () => {
    const { api, ipc, request } = harness()
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const prepare = vi
      .fn()
      .mockRejectedValueOnce(new Error('disk full'))
      .mockResolvedValueOnce(undefined)
    api.window.onBeforeClose(prepare)
    request('failed')
    await settle()
    expect(ipc.send).toHaveBeenCalledWith(PAPER_CLOSE.ready, 'failed', false)
    request('retry')
    await settle()
    expect(prepare).toHaveBeenCalledTimes(2)
    expect(ipc.send).toHaveBeenCalledWith(PAPER_CLOSE.ready, 'retry', true)
    log.mockRestore()
  })
})
