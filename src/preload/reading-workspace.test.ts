import { describe, expect, it, vi } from 'vitest'
import { createReadingWorkspaceBridge } from './reading-workspace'

describe('reading workspace explicit preload API', () => {
  it('uses fixed channels and validates incoming mode notifications', async () => {
    let notify!: (event: unknown, mode: unknown) => void
    const ipc = { invoke: vi.fn(async () => 'paper'), on: vi.fn((_name, fn) => { notify = fn }), removeListener: vi.fn() }
    const api = createReadingWorkspaceBridge(ipc)
    await api.open('paper'); await api.setMode('retell'); expect(await api.getMode()).toBe('paper')
    expect(ipc.invoke.mock.calls).toEqual([['workspace:open', 'paper'], ['workspace:setMode', 'retell'], ['workspace:getMode']])
    const handle = vi.fn(), stop = api.onModeChanged(handle)
    notify({}, 'paper'); notify({}, 'unsafe')
    expect(handle).toHaveBeenCalledExactlyOnceWith('paper')
    stop(); expect(ipc.removeListener).toHaveBeenCalledWith('workspace:modeChanged', notify)
    expect('invoke' in api).toBe(false)
  })
})
