import * as fs from 'node:fs/promises'
import path from 'node:path'
import { constants } from 'node:fs'
import { nodeIndexFs, nodeSizePort } from '../../hosts/node/fs'
import type { PaperDialogOptions } from '../../shared/paper'

export const MAX_FILE_BYTES = 256 * 1024 * 1024
export const MAX_RANGE_BYTES = 16 * 1024 * 1024
const fail = (message: string): never => {
  throw new Error(`paper: ${message}`)
}
export function text(value: unknown): string {
  if (typeof value !== 'string' || value.includes('\0') || value.length > 32768)
    return fail('invalid string')
  return value
}
export function relativePath(value: unknown): string {
  const name = text(value)
  if (
    path.isAbsolute(name) ||
    path.win32.isAbsolute(name) ||
    /^[A-Za-z]:/.test(name) ||
    name.includes('\\') ||
    name.split('/').includes('..')
  )
    return fail('invalid vault path')
  return name
}
export function contained(base: string, target: string): boolean {
  const rel = path.relative(base, target)
  return rel === '' || (!path.isAbsolute(rel) && rel !== '..' && !rel.startsWith(`..${path.sep}`))
}
/** Refuse ALL symlinks below the capability boundary, even links back inside it.
 * Node's ordinary path APIs cannot make this atomic against a hostile local process
 * replacing ancestors between checks and use; the renderer cannot create links.
 */
export async function noLinks(base: string, target: string): Promise<void> {
  if (!contained(base, target)) fail('path outside permission')
  const parts = path.relative(base, target).split(path.sep).filter(Boolean)
  let at = base
  for (const part of ['', ...parts]) {
    if (part) at = path.join(at, part)
    try {
      if ((await fs.lstat(at)).isSymbolicLink()) fail('symbolic links are not permitted')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
  }
}
function bytes(value: unknown): Uint8Array {
  if (!(value instanceof Uint8Array) || value.byteLength > MAX_FILE_BYTES)
    return fail('invalid or oversized bytes')
  return value
}
function integer(value: unknown, max = Number.MAX_SAFE_INTEGER): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0 || value > max)
    return fail('invalid range')
  return value
}
function level(value: unknown): 'full' | 'barrier' {
  if (value !== 'full' && value !== 'barrier') return fail('invalid sync level')
  return value
}
export function dialogOptions(value: unknown): PaperDialogOptions {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return fail('invalid dialog options')
  const input = value as Record<string, unknown>
  const result: PaperDialogOptions = {}
  for (const key of ['title', 'defaultPath'] as const)
    if (input[key] !== undefined) result[key] = text(input[key])
  for (const key of ['multiple', 'directory'] as const)
    if (input[key] !== undefined) {
      if (typeof input[key] !== 'boolean') fail('invalid dialog boolean')
      result[key] = input[key] as boolean
    }
  if (input.filters !== undefined) {
    if (!Array.isArray(input.filters) || input.filters.length > 32) return fail('invalid filters')
    result.filters = input.filters.map((filter: unknown) => {
      if (!filter || typeof filter !== 'object') return fail('invalid filter')
      const { name, extensions } = filter as Record<string, unknown>
      if (
        !Array.isArray(extensions) ||
        extensions.length > 32 ||
        !extensions.every((e) => typeof e === 'string' && /^(\*|[a-zA-Z0-9_-]{1,32})$/.test(e))
      )
        return fail('invalid extensions')
      return { name: text(name), extensions: extensions as string[] }
    })
  }
  return result
}

export function createVaultService(root: string) {
  const host = nodeIndexFs(root)
  const size = nodeSizePort(root)
  const ready = fs.mkdir(root, { recursive: true }).then(() => noLinks(root, root))
  async function checked(value: unknown, destructive = false): Promise<string> {
    await ready
    const name = relativePath(value)
    const full = path.resolve(root, name)
    if (destructive && full === path.resolve(root)) fail('cannot modify vault root')
    await noLinks(root, full)
    return name
  }
  async function bounded(name: string): Promise<void> {
    const info = await fs.stat(path.resolve(root, name))
    if (!info.isFile() || info.size > MAX_FILE_BYTES) fail('not a bounded regular file')
  }
  async function tree(name: string): Promise<void> {
    await checked(name)
    for (const entry of await fs.readdir(path.resolve(root, name), { withFileTypes: true })) {
      if (entry.isSymbolicLink()) fail('symbolic links are not permitted')
      if (entry.isDirectory()) await tree(path.join(name, entry.name))
    }
  }
  return {
    async fs(method: string, args: unknown[]): Promise<unknown> {
      const p = await checked(
        args[0],
        ['remove', 'removeDir', 'rename', 'writeFile', 'appendFile', 'writeAtomic'].includes(
          method,
        ),
      )
      switch (method) {
        case 'readFile':
          await bounded(p)
          return host.readFile(p)
        case 'writeFile':
          return host.writeFile(p, bytes(args[1]))
        case 'appendFile':
          return host.appendFile!(p, bytes(args[1]))
        case 'writeAtomic':
          return host.writeAtomic!(p, bytes(args[1]), level(args[2]))
        case 'fsync':
          return host.fsync!(p, level(args[1]))
        case 'readRange': {
          const offset = integer(args[1])
          const length = integer(args[2], MAX_RANGE_BYTES)
          if (!Number.isSafeInteger(offset + length)) fail('range overflow')
          if (!(await fs.stat(path.resolve(root, p))).isFile()) fail('not a regular file')
          return host.readRange!(p, offset, length)
        }
        case 'rename':
          return host.rename(p, await checked(args[1], true))
        case 'exists':
          return host.exists(p)
        case 'mkdir':
          return host.mkdir(p)
        case 'remove':
          return host.remove(p)
        case 'removeDir':
          return host.removeDir(p)
        case 'readDir':
          return host.readDir(p)
        default:
          return fail('unknown fs method')
      }
    },
    async size(method: string, args: unknown[]): Promise<unknown> {
      if (method === 'bytesAt') return size.bytesAt(await checked(args[0]))
      if (method === 'libraryBytes') {
        await ready
        await tree('')
        return size.libraryBytes()
      }
      if (method === 'contentBytes') {
        const id = text(args[0])
        if (!/^[A-Za-z0-9_-]{1,160}$/.test(id)) fail('invalid book id')
        // Check even missing folders: nodeSizePort's shared walk may probe candidate names.
        const folder = await checked(`books/${id.replace(/[^A-Za-z0-9]/g, '_')}`)
        try {
          await tree(folder)
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
        }
        return size.contentBytes(id)
      }
      return fail('unknown size method')
    },
  }
}

/** One instance per sender/document. Only native dialog results call grant*. */
export class ExternalPermissions {
  private reads: { target: string; directory: boolean }[] = []
  private writes = new Map<string, { dev: number; ino: number } | null>()
  clear(): void {
    this.reads = []
    this.writes.clear()
  }
  async grantRead(selected: string): Promise<void> {
    const target = path.resolve(selected)
    const info = await fs.lstat(target)
    if (info.isSymbolicLink() || (!info.isFile() && !info.isDirectory()))
      fail('invalid selected path')
    this.reads.push({ target, directory: info.isDirectory() })
  }
  async grantWrite(selected: string): Promise<void> {
    const target = path.resolve(selected)
    // Canonical parent binds the grant to the actual native-dialog destination.
    if ((await fs.realpath(path.dirname(target))) !== path.dirname(target))
      fail('noncanonical save parent')
    await noLinks(path.dirname(target), target)
    let identity: { dev: number; ino: number } | null = null
    try {
      const info = await fs.lstat(target)
      if (!info.isFile()) fail('save target is not a regular file')
      identity = { dev: info.dev, ino: info.ino }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
    this.writes.set(target, identity)
  }
  private async readable(value: unknown): Promise<string> {
    const target = text(value)
    if (!path.isAbsolute(target)) return fail('external path must be absolute')
    const resolved = path.resolve(target)
    const grant = this.reads.find(
      (g) => g.target === resolved || (g.directory && contained(g.target, resolved)),
    )
    if (!grant) return fail('external read permission denied')
    // Ensure an authorized directory itself has not been replaced by a symlink.
    await noLinks(grant.target, resolved)
    if ((await fs.realpath(path.dirname(grant.target))) !== path.dirname(grant.target))
      fail('selected parent changed')
    return resolved
  }
  async call(method: string, args: unknown[]): Promise<unknown> {
    if (method === 'writeTextFile') {
      const supplied = text(args[0])
      if (!path.isAbsolute(supplied)) return fail('external path must be absolute')
      const target = path.resolve(supplied)
      if (!this.writes.has(target)) return fail('external write permission denied')
      const content = textContent(args[1])
      await noLinks(path.dirname(target), target)
      if ((await fs.realpath(path.dirname(target))) !== path.dirname(target))
        fail('save parent changed')
      // Native showSaveDialog confirms replacement. A grant is single-use.
      const identity = this.writes.get(target)!
      this.writes.delete(target)
      const handle = await fs.open(
        target,
        constants.O_WRONLY |
          constants.O_NOFOLLOW |
          (identity === null ? constants.O_CREAT | constants.O_EXCL : 0),
      )
      try {
        const info = await handle.stat()
        if (
          !info.isFile() ||
          (identity !== null && (info.dev !== identity.dev || info.ino !== identity.ino))
        )
          fail('save target changed since confirmation')
        await handle.truncate(0)
        await handle.writeFile(content, 'utf8')
      } finally {
        await handle.close()
      }
      return
    }
    const target = await this.readable(args[0])
    const info = await fs.stat(target)
    switch (method) {
      case 'stat':
        return { size: info.size, isFile: info.isFile(), isDirectory: info.isDirectory() }
      case 'readDir':
        return (await fs.readdir(target, { withFileTypes: true })).map((e) => ({
          name: e.name,
          isDirectory: e.isDirectory(),
        }))
      case 'readFile':
      case 'readTextFile': {
        if (!info.isFile() || info.size > MAX_FILE_BYTES) fail('not a bounded regular file')
        const handle = await fs.open(target, constants.O_RDONLY | constants.O_NOFOLLOW)
        try {
          const data = await handle.readFile()
          return method === 'readFile' ? new Uint8Array(data) : data.toString('utf8')
        } finally {
          await handle.close()
        }
      }
      default:
        return fail('unknown external method')
    }
  }
}
function textContent(value: unknown): string {
  if (typeof value !== 'string' || Buffer.byteLength(value) > MAX_FILE_BYTES)
    return fail('invalid text content')
  return value
}
export function externalUrl(value: unknown): string {
  const url = new URL(text(value))
  if (!['http:', 'https:', 'mailto:'].includes(url.protocol)) fail('external URL protocol denied')
  return url.href
}
