import { afterEach, describe, expect, it, vi } from 'vitest'
import { tauriVaultFs } from './vaultFsTauri'
import { libraryFs, importFs, pickBooks, pickFolder, readBookAt } from './bookFiles'
import { inTauri } from '../ui/inTauri'
import { openExternal } from '../ui/openExternal'
import { importMarksFromFile } from '../ui/marksFiles'
import { importTagsFromFile } from '../ui/tagFiles'
import { ARCHIVE_MAX_BYTES } from './importLimits'

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('the trusted Paper adapter boundary', () => {
  it('does not mistake a legacy marker for the Orbis bridge', () => {
    vi.stubGlobal('window', { ['__' + 'TAURI_INTERNALS__']: {} })
    expect(inTauri()).toBe(false)
    vi.stubGlobal('window', { orbisPaper: {} })
    expect(inTauri()).toBe(true)
  })

  it('forwards every vault operation without changing paths, bytes, or sync levels', async () => {
    const methods = ['readFile', 'writeFile', 'exists', 'mkdir', 'remove', 'rename', 'removeDir', 'appendFile', 'writeAtomic', 'fsync', 'readRange'] as const
    const fs = Object.fromEntries(methods.map((name) => [name, vi.fn().mockResolvedValue(undefined)]))
    vi.stubGlobal('window', { orbisPaper: { fs } })
    const bytes = new Uint8Array([0, 255])
    await tauriVaultFs.readFile('books/a/content.epub')
    await tauriVaultFs.writeFile('books/a/content.epub', bytes)
    await tauriVaultFs.exists('books/a')
    await tauriVaultFs.mkdir('books/a')
    await tauriVaultFs.remove('books/a/old')
    await tauriVaultFs.rename('books/a/old', 'books/a/new')
    await tauriVaultFs.removeDir('trash/a')
    await tauriVaultFs.appendFile!('journal', bytes)
    await tauriVaultFs.writeAtomic!('store.json', bytes, 'full')
    await tauriVaultFs.fsync!('journal', 'barrier')
    await tauriVaultFs.readRange!('books/a/content.epub', 8, 16)
    const arguments_ = [
      ['books/a/content.epub'], ['books/a/content.epub', bytes], ['books/a'], ['books/a'],
      ['books/a/old'], ['books/a/old', 'books/a/new'], ['trash/a'], ['journal', bytes],
      ['store.json', bytes, 'full'], ['journal', 'barrier'], ['books/a/content.epub', 8, 16],
    ]
    methods.forEach((method, i) => expect(fs[method]).toHaveBeenCalledExactlyOnceWith(...arguments_[i]!))
    expect(fs.writeFile!.mock.calls[0]![1]).toBe(bytes)
  })

  it('never sends a vault path to the external filesystem or the reverse', async () => {
    const vaultRead = vi.fn().mockResolvedValue([])
    const outsideRead = vi.fn().mockResolvedValue([])
    vi.stubGlobal('window', { orbisPaper: { fs: { readDir: vaultRead }, externalFs: { readDir: outsideRead } } })
    await libraryFs.readDir('books')
    await importFs.readDir('/chosen/books')
    expect(vaultRead).toHaveBeenCalledExactlyOnceWith('books')
    expect(outsideRead).toHaveBeenCalledExactlyOnceWith('/chosen/books')
  })

  it('constructs the File in the renderer, with exact bytes and a cross-platform name', async () => {
    const readFile = vi.fn(async () => new Uint8Array([1, 0, 255]))
    vi.stubGlobal('window', { orbisPaper: { externalFs: { readFile } } })
    const file = await readBookAt('C:\\Books\\世界.epub')
    expect(file).toBeInstanceOf(File)
    expect(file.name).toBe('世界.epub')
    expect(new Uint8Array(await file.arrayBuffer())).toEqual(new Uint8Array([1, 0, 255]))
    expect(readFile).toHaveBeenCalledExactlyOnceWith('C:\\Books\\世界.epub')
  })

  it('reads picks sequentially and keeps other books when one is unreadable', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const order: string[] = []
    const open = vi.fn(async () => ['/a.epub', '/bad.epub', '/c.pdf'])
    const readFile = vi.fn(async (path: string) => {
      order.push(`start:${path}`)
      await Promise.resolve()
      order.push(`end:${path}`)
      if (path === '/bad.epub') throw new Error('unreadable')
      return new Uint8Array([1])
    })
    vi.stubGlobal('window', { orbisPaper: { dialog: { open }, externalFs: { readFile } } })
    expect((await pickBooks()).map(({ path }) => path)).toEqual(['/a.epub', '/c.pdf'])
    expect(order).toEqual(['/a.epub', '/bad.epub', '/c.pdf'].flatMap((p) => [`start:${p}`, `end:${p}`]))
    expect(open).toHaveBeenCalledWith(expect.objectContaining({ multiple: true, directory: false }))
  })

  it('treats native picker cancellation and a single-folder array as the declared contract', async () => {
    const open = vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(null).mockResolvedValueOnce(['/chosen'])
    const readFile = vi.fn()
    vi.stubGlobal('window', { orbisPaper: { dialog: { open }, externalFs: { readFile } } })
    expect(await pickBooks()).toEqual([])
    expect(await pickFolder()).toBeNull()
    expect(await pickFolder()).toBe('/chosen')
    expect(readFile).not.toHaveBeenCalled()
    expect(open).toHaveBeenLastCalledWith({ directory: true, multiple: false })
  })

  it('validates an external URL before crossing the native boundary', async () => {
    const native = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('window', { orbisPaper: { openExternal: native } })
    expect(await openExternal('javascript:alert(1)')).toBeTruthy()
    expect(native).not.toHaveBeenCalled()
    expect(await openExternal('https://example.org/book')).toBeNull()
    expect(native).toHaveBeenCalledExactlyOnceWith('https://example.org/book')
    native.mockRejectedValue(new Error('native refused'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await openExternal('https://example.org/book')).toBe('That link could not be opened.')
  })

  it.each([['marks', importMarksFromFile], ['tags', importTagsFromFile]] as const)(
    'bounds %s archive imports before allocating their text', async (_name, importArchive) => {
      const open = vi.fn(async () => ['/picked.json'])
      const stat = vi.fn(async () => ({ size: ARCHIVE_MAX_BYTES + 1, isFile: true, isDirectory: false }))
      const readTextFile = vi.fn()
      vi.stubGlobal('window', { orbisPaper: { dialog: { open }, externalFs: { stat, readTextFile } } })
      await expect(importArchive()).rejects.toThrow('past the')
      expect(stat).toHaveBeenCalledExactlyOnceWith('/picked.json')
      expect(readTextFile).not.toHaveBeenCalled()
    },
  )
})
