import { describe, expect, it, vi } from 'vitest'
import { bindReadingWorkspace } from './workspace'
import type { ReadingMode, ReadingWorkspaceApi } from '../../shared/reading-workspace'

function fixture() {
  let listener!: (mode: ReadingMode) => void
  let finish!: (mode: ReadingMode) => void
  const stop = vi.fn()
  const api: ReadingWorkspaceApi = {
    open: vi.fn(async () => {}), setMode: vi.fn(async () => {}),
    getMode: vi.fn(() => new Promise<ReadingMode>((resolve) => { finish = resolve })),
    onModeChanged: (handle) => { listener = handle; return stop },
  }
  return { api, stop, change: (mode: ReadingMode) => listener(mode), finish: (mode: ReadingMode) => finish(mode) }
}
const settle = async () => { await Promise.resolve(); await Promise.resolve() }

describe('persistent reading workspace binding', () => {
  it('only renders visibility on repeated mode changes, without remounting engines', async () => {
    const f = fixture(), render = vi.fn()
    const stop = bindReadingWorkspace(f.api, render)
    f.finish('retell'); await settle()
    f.change('paper'); f.change('retell'); f.change('paper')
    expect(render.mock.calls.map(([mode]) => mode)).toEqual(['retell', 'paper', 'retell', 'paper'])
    expect(f.api.setMode).not.toHaveBeenCalled()
    stop(); f.change('retell'); expect(render).toHaveBeenCalledTimes(4)
    expect(f.stop).toHaveBeenCalledOnce()
  })
  it('does not let a stale initialization reply undo a newer mode event', async () => {
    const f = fixture(), render = vi.fn()
    bindReadingWorkspace(f.api, render)
    f.change('paper'); f.finish('retell'); await settle()
    expect(render).toHaveBeenCalledExactlyOnceWith('paper')
  })
  it('accepts only the two known URL modes', async () => {
    const f = fixture()
    bindReadingWorkspace(f.api, vi.fn(), 'paper'); await settle()
    expect(f.api.setMode).toHaveBeenCalledExactlyOnceWith('paper')
    const other = fixture()
    bindReadingWorkspace(other.api, vi.fn(), '../escape')
    expect(other.api.setMode).not.toHaveBeenCalled()
  })
})
