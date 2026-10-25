import { afterEach, describe, expect, it, vi } from 'vitest'
import { chooseAudiobookPath, tauriAudiobook } from './audiobookTauri'

afterEach(() => vi.unstubAllGlobals())
describe('the Phase 1 audio export boundary', () => {
  it('cancels the chooser and rejects export without touching any host capability', async () => {
    const touched = vi.fn(() => { throw new Error('No audio host is permitted') })
    const view = Object.defineProperty({}, 'orbisPaper', { get: touched })
    vi.stubGlobal('window', view)
    const find = vi.fn(async () => null)
    const hold = vi.fn(async () => 0)
    expect(await chooseAudiobookPath('A book')).toBeNull()
    await expect(tauriAudiobook([], find, hold)).rejects.toThrow('unsupported')
    expect(touched).not.toHaveBeenCalled()
    expect(find).not.toHaveBeenCalled()
    expect(hold).not.toHaveBeenCalled()
  })
})
