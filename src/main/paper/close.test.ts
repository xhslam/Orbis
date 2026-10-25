import { afterEach, describe, expect, it, vi } from 'vitest'
import { PaperCloseController } from './close'

afterEach(() => vi.useRealTimers())
function fixture() {
  const host = { send: vi.fn<(token: string) => void>(), close: vi.fn(), warn: vi.fn() }
  return { host, controller: new PaperCloseController(host, 50) }
}
describe('native window close handshake', () => {
  it('prepares for quit without independently closing and waits through unsubscribe', async () => {
    const { host, controller } = fixture()
    controller.subscribe()
    const prepared = controller.prepareForQuit()
    controller.unsubscribe()
    expect(controller.needsPreparation).toBe(true)
    controller.ready(host.send.mock.calls[0]![0], true)
    await expect(prepared).resolves.toBe(true)
    expect(host.close).not.toHaveBeenCalled()
    controller.allowQuit()
    expect(controller.closing()).toBe(true)
  })
  it('allows immediate close without subscribers', () => {
    expect(fixture().controller.closing()).toBe(true)
  })
  it('blocks repeated native close until the same token is acknowledged ok', () => {
    const { host, controller } = fixture()
    controller.subscribe()
    expect(controller.closing()).toBe(false)
    const token = host.send.mock.calls[0]![0]
    expect(controller.closing()).toBe(false)
    expect(host.send).toHaveBeenCalledTimes(1)
    controller.ready('wrong', true)
    controller.ready(token, 'yes')
    expect(host.close).not.toHaveBeenCalled()
    controller.ready(token, true)
    expect(host.close).toHaveBeenCalledTimes(1)
    expect(controller.closing()).toBe(true)
  })
  it('cancels on failed preparation, permitting a fresh retry', () => {
    const { host, controller } = fixture()
    controller.subscribe()
    controller.closing()
    controller.ready(host.send.mock.calls[0]![0], false)
    expect(host.close).not.toHaveBeenCalled()
    expect(controller.closing()).toBe(false)
    expect(host.send).toHaveBeenCalledTimes(2)
    controller.clear()
  })
  it('times out once, logs and cancels shutdown so flush cannot be bypassed', () => {
    vi.useFakeTimers()
    const { host, controller } = fixture()
    controller.subscribe()
    controller.closing()
    controller.closing()
    vi.advanceTimersByTime(49)
    expect(host.close).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(host.close).not.toHaveBeenCalled()
    expect(host.warn).toHaveBeenCalledWith(expect.stringContaining('timed out'))
    expect(controller.closing()).toBe(false)
    controller.clear()
  })
  it('cleans pending tokens on navigation/destruction but preserves pending work on unsubscribe', () => {
    vi.useFakeTimers()
    const { host, controller } = fixture()
    controller.subscribe()
    controller.closing()
    const oldToken = host.send.mock.calls[0]![0]
    controller.clear()
    controller.ready(oldToken, true)
    vi.advanceTimersByTime(100)
    expect(host.close).not.toHaveBeenCalled()
    expect(controller.closing()).toBe(true)
    controller.subscribe()
    controller.closing()
    const token = host.send.mock.calls.at(-1)![0]
    controller.unsubscribe()
    expect(host.close).not.toHaveBeenCalled()
    expect(controller.closing()).toBe(false)
    controller.ready(token, true)
    expect(host.close).toHaveBeenCalledTimes(1)
  })
})
