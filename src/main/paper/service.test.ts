import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import * as fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {
  createVaultService,
  ExternalPermissions,
  externalUrl,
  MAX_FILE_BYTES,
  MAX_RANGE_BYTES,
  dialogOptions,
} from './service'

let temp: string
beforeEach(async () => {
  temp = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'orbis-paper-')))
})
afterEach(async () => {
  await fs.rm(temp, { recursive: true, force: true })
})
const encoded = (value: string) => new TextEncoder().encode(value)

describe('vault boundary', () => {
  it('isolates its root and supports the node host methods', async () => {
    const vault = createVaultService(path.join(temp, 'vault'))
    await vault.fs('mkdir', ['books'])
    await vault.fs('writeAtomic', ['books/book.json', encoded('one'), 'full'])
    await vault.fs('appendFile', ['books/book.json', encoded('two')])
    expect(await vault.fs('readRange', ['books/book.json', 3, 3])).toEqual(encoded('two'))
    expect(await vault.size('bytesAt', ['books/book.json'])).toBe(6)
    await vault.fs('rename', ['books/book.json', 'books/other.json'])
    expect(await vault.fs('exists', ['books/other.json'])).toBe(true)
    await vault.fs('fsync', ['books/other.json', 'barrier'])
    await vault.fs('remove', ['books/other.json'])
    await vault.fs('removeDir', ['books'])
  })
  it('rejects traversal, invalid paths and destructive root operations', async () => {
    const vault = createVaultService(path.join(temp, 'vault'))
    for (const value of [
      '../outside',
      'a/../b',
      '/etc/passwd',
      'C:\\outside',
      'D:outside',
      'a\\b',
      null,
      12,
    ]) {
      await expect(vault.fs('exists', [value])).rejects.toThrow()
    }
    for (const operation of ['remove', 'removeDir', 'rename', 'writeFile', 'writeAtomic']) {
      await expect(vault.fs(operation, ['.', encoded('x'), 'full'])).rejects.toThrow('root')
    }
    await expect(vault.fs('rename', ['valid', ''])).rejects.toThrow('root')
  })
  it('refuses symlink ancestors, targets, and size-walk escapes', async () => {
    const root = path.join(temp, 'vault')
    const vault = createVaultService(root)
    await vault.fs('mkdir', [''])
    await fs.writeFile(path.join(temp, 'secret'), 'secret')
    await fs.symlink(temp, path.join(root, 'escape'), 'dir')
    await fs.symlink(path.join(temp, 'secret'), path.join(root, 'link'))
    for (const target of ['escape/secret', 'link']) {
      await expect(vault.fs('readFile', [target])).rejects.toThrow('symbolic')
      await expect(vault.fs('writeFile', [target, encoded('bad')])).rejects.toThrow('symbolic')
      await expect(vault.size('bytesAt', [target])).rejects.toThrow('symbolic')
    }
    await expect(vault.size('libraryBytes', [])).rejects.toThrow('symbolic')
    expect(await fs.readFile(path.join(temp, 'secret'), 'utf8')).toBe('secret')
  })
  it('validates bytes, ranges, levels, ids, and bounded whole-file reads', async () => {
    const vault = createVaultService(path.join(temp, 'vault'))
    await vault.fs('writeFile', ['file', encoded('data')])
    await expect(vault.fs('writeFile', ['file', [1, 2]])).rejects.toThrow('bytes')
    await expect(vault.fs('fsync', ['file', 'anything'])).rejects.toThrow('level')
    for (const range of [
      [-1, 1],
      [0, 1.5],
      [0, MAX_RANGE_BYTES + 1],
      [NaN, 1],
      [Number.MAX_SAFE_INTEGER, 1],
    ]) {
      await expect(vault.fs('readRange', ['file', ...range])).rejects.toThrow('range')
    }
    await expect(vault.size('contentBytes', ['../evil'])).rejects.toThrow()
    await fs.truncate(path.join(temp, 'vault/file'), MAX_FILE_BYTES + 1)
    await expect(vault.fs('readFile', ['file'])).rejects.toThrow('bounded')
  })
})

describe('external capabilities', () => {
  it('grants exact file reads, directory subtree reads, not sibling-prefix reads', async () => {
    await fs.mkdir(path.join(temp, 'dir'))
    await fs.mkdir(path.join(temp, 'dir-other'))
    await fs.writeFile(path.join(temp, 'file'), 'one')
    await fs.writeFile(path.join(temp, 'dir/child'), 'two')
    await fs.writeFile(path.join(temp, 'dir-other/child'), 'secret')
    const permission = new ExternalPermissions()
    await expect(permission.call('readFile', [path.join(temp, 'file')])).rejects.toThrow(
      'permission',
    )
    await permission.grantRead(path.join(temp, 'file'))
    expect(await permission.call('readTextFile', [path.join(temp, 'file')])).toBe('one')
    await expect(permission.call('readFile', [path.join(temp, 'file/child')])).rejects.toThrow(
      'permission',
    )
    await permission.grantRead(path.join(temp, 'dir'))
    expect(await permission.call('readTextFile', [path.join(temp, 'dir/child')])).toBe('two')
    await expect(permission.call('readFile', [path.join(temp, 'dir-other/child')])).rejects.toThrow(
      'permission',
    )
    const secondSender = new ExternalPermissions()
    await expect(secondSender.call('readFile', [path.join(temp, 'file')])).rejects.toThrow(
      'permission',
    )
    permission.clear()
    await expect(permission.call('readFile', [path.join(temp, 'file')])).rejects.toThrow(
      'permission',
    )
  })
  it('refuses links out of a selected directory and changed selected files', async () => {
    await fs.mkdir(path.join(temp, 'dir'))
    await fs.writeFile(path.join(temp, 'secret'), 'secret')
    await fs.symlink(path.join(temp, 'secret'), path.join(temp, 'dir/link'))
    const permission = new ExternalPermissions()
    await permission.grantRead(path.join(temp, 'dir'))
    await expect(permission.call('readFile', [path.join(temp, 'dir/link')])).rejects.toThrow(
      'symbolic',
    )
    await expect(permission.grantRead(path.join(temp, 'dir/link'))).rejects.toThrow()
  })
  it('requires an exact single-use native save grant and does not overwrite newly appeared files', async () => {
    const permission = new ExternalPermissions()
    const target = path.join(temp, 'output')
    await expect(permission.call('writeTextFile', [target, 'bad'])).rejects.toThrow('permission')
    await permission.grantWrite(target)
    await expect(
      permission.call('writeTextFile', [path.join(temp, 'other'), 'bad']),
    ).rejects.toThrow('permission')
    await permission.call('writeTextFile', [target, 'good'])
    await expect(permission.call('writeTextFile', [target, 'bad'])).rejects.toThrow('permission')
    expect(await fs.readFile(target, 'utf8')).toBe('good')
    await permission.grantWrite(target)
    await permission.call('writeTextFile', [target, 'confirmed replacement'])
    const raced = path.join(temp, 'raced')
    await permission.grantWrite(raced)
    await fs.writeFile(raced, 'not confirmed')
    await expect(permission.call('writeTextFile', [raced, 'bad'])).rejects.toThrow()
    expect(await fs.readFile(raced, 'utf8')).toBe('not confirmed')
  })
  it('validates URL protocols and native dialog options', () => {
    for (const url of ['file:///etc/passwd', 'javascript:alert(1)', 'data:text/plain,x'])
      expect(() => externalUrl(url)).toThrow()
    expect(externalUrl('https://example.com')).toBe('https://example.com/')
    expect(externalUrl('mailto:a@example.com')).toBe('mailto:a@example.com')
    expect(() => dialogOptions({ directory: 'yes' })).toThrow()
    expect(() => dialogOptions({ filters: [{ name: 'bad', extensions: ['../*'] }] })).toThrow()
    expect(
      dialogOptions({ directory: true, filters: [{ name: 'Books', extensions: ['epub'] }] })
        .directory,
    ).toBe(true)
  })
})
