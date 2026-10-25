import { afterEach, describe, expect, it, vi } from 'vitest'
import { PaperQuitController } from './quit'
import { PaperCloseController } from './close'

afterEach(() => vi.useRealTimers())
function participant() {
  const host = { send: vi.fn<(token: string) => void>(), close: vi.fn(), warn: vi.fn() }
  const close = new PaperCloseController(host, 50)
  close.subscribe()
  return { host, close, ack: (ok: boolean) => close.ready(host.send.mock.calls.at(-1)![0], ok) }
}
async function flush() {
  for (let i = 0; i < 8; i++) await Promise.resolve()
}
function fixture() {
  const first = participant()
  const second = participant()
  const host = { participants: () => [first.close, second.close], quit: vi.fn(), warn: vi.fn() }
  const controller = new PaperQuitController(host, 50)
  return { first, second, host, controller }
}
describe('application quit coordination', () => {
  it('leaves ordinary native quit untouched when there are no subscribed participants', () => {
    const host = { participants: () => [], quit: vi.fn(), warn: vi.fn() }
    expect(new PaperQuitController(host).beforeQuit()).toBe(true)
    expect(host.quit).not.toHaveBeenCalled()
  })
  it('waits for every window and resumes app.quit exactly once despite repeated CmdQ', async () => {
    const { first, second, host, controller } = fixture()
    expect(controller.beforeQuit()).toBe(false)
    expect(controller.beforeQuit()).toBe(false)
    expect(first.host.send).toHaveBeenCalledTimes(1)
    expect(second.host.send).toHaveBeenCalledTimes(1)
    first.ack(true)
    await flush()
    expect(host.quit).not.toHaveBeenCalled()
    expect(first.host.close).not.toHaveBeenCalled()
    expect(controller.beforeQuit()).toBe(false)
    second.ack(true)
    await flush()
    expect(host.quit).toHaveBeenCalledTimes(1)
    expect(controller.beforeQuit()).toBe(true)
    expect(first.close.closing()).toBe(true)
    expect(second.close.closing()).toBe(true)
  })
  it('cancels the entire attempt after one failure and permits a fresh retry', async () => {
    const { first, second, host, controller } = fixture()
    controller.beforeQuit()
    const staleToken = second.host.send.mock.calls[0]![0]
    first.ack(false)
    await flush()
    expect(host.quit).not.toHaveBeenCalled()
    expect(host.warn).toHaveBeenCalledWith(expect.stringContaining('cancelled'))
    controller.beforeQuit()
    expect(second.host.send).toHaveBeenCalledTimes(2)
    second.close.ready(staleToken, true)
    first.ack(true)
    await flush()
    expect(host.quit).not.toHaveBeenCalled()
    second.ack(true)
    await flush()
    expect(host.quit).toHaveBeenCalledTimes(1)
  })
  it('cancels missing replies with a logged timeout without destroying participants', async () => {
    vi.useFakeTimers()
    const { first, host, controller } = fixture()
    controller.beforeQuit()
    first.ack(true)
    await vi.advanceTimersByTimeAsync(50)
    expect(host.quit).not.toHaveBeenCalled()
    expect(host.warn).toHaveBeenCalledWith(expect.stringContaining('timed out'))
    expect(controller.beforeQuit()).toBe(false)
  })
  it('ordinary window close never calls app.quit', async () => {
    const { first, host } = fixture()
    expect(first.close.closing()).toBe(false)
    first.ack(true)
    await flush()
    expect(first.host.close).toHaveBeenCalledTimes(1)
    expect(host.quit).not.toHaveBeenCalled()
  })
})
