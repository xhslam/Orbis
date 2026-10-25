import { afterEach, describe, expect, it, vi } from 'vitest'
import { tauriSizePort } from './bookSizesTauri'

// The walk and filesystem semantics belong to the main host. This adapter must
// forward every method, preserve unknown (null) and empty (zero), and propagate
// failures rather than presenting an incomplete total as a measurement.
afterEach(() => vi.unstubAllGlobals())
describe('Orbis size adapter', () => {
  it('forwards all measurements with their original paths and IDs', async () => {
    const size = {
      contentBytes: vi.fn(async (_id: string) => 100),
      libraryBytes: vi.fn(async () => 0),
      bytesAt: vi.fn(async (_path: string) => null),
    }
    vi.stubGlobal('window', { orbisPaper: { size } })
    expect(await tauriSizePort.contentBytes('book:one')).toBe(100)
    expect(size.contentBytes).toHaveBeenCalledExactlyOnceWith('book:one')
    expect(await tauriSizePort.libraryBytes()).toBe(0)
    expect(size.libraryBytes).toHaveBeenCalledExactlyOnceWith()
    expect(await tauriSizePort.bytesAt('books/one/content.epub')).toBeNull()
    expect(size.bytesAt).toHaveBeenCalledExactlyOnceWith('books/one/content.epub')
  })
  it('does not manufacture a total when the host refuses measurement', async () => {
    const cause = new Error('unreadable data root')
    vi.stubGlobal('window', { orbisPaper: { size: { libraryBytes: vi.fn().mockRejectedValue(cause) } } })
    await expect(tauriSizePort.libraryBytes()).rejects.toBe(cause)
  })
})
