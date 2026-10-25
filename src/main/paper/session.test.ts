import { describe, expect, it, vi } from 'vitest'
import { PaperSession } from './session'

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

describe('single writer document lease', () => {
  it('is idempotent for one document and rejects another active writer', async () => {
    const session = new PaperSession()
    const first = {},
      second = {}
    await session.acquire(first)
    await session.acquire(first)
    await expect(session.acquire(second)).rejects.toThrow('already acquired')
    expect(() => session.run(second, () => undefined)).toThrow('session required')
  })
  it('revokes old requests immediately but waits accepted IO before a new grant', async () => {
    const session = new PaperSession()
    const first = {},
      second = {}
    await session.acquire(first)
    const io = deferred()
    const task = session.run(first, () => io.promise)
    session.revoke(first)
    expect(() => session.run(first, () => undefined)).toThrow('session required')
    const granted = vi.fn()
    const acquiring = session.acquire(second).then(granted)
    await Promise.resolve()
    expect(granted).not.toHaveBeenCalled()
    io.resolve()
    await task
    await acquiring
    expect(granted).toHaveBeenCalledOnce()
    expect(() => session.assert(first)).toThrow('session required')
    session.assert(second)
  })
  it('permits only one competing waiter after a revocation barrier', async () => {
    const session = new PaperSession()
    const first = {}
    await session.acquire(first)
    const io = deferred()
    const task = session.run(first, () => io.promise)
    session.revoke(first)
    const grants = Promise.allSettled([session.acquire({}), session.acquire({})])
    io.resolve()
    await task
    const results = await grants
    expect(results.map((r) => r.status).sort()).toEqual(['fulfilled', 'rejected'])
  })
  it('drains rejected and synchronously throwing operations without wedging a lease', async () => {
    const session = new PaperSession(),
      first = {},
      second = {}
    await session.acquire(first)
    const task = session.run(first, () => {
      throw new Error('disk failed')
    })
    session.revoke(first)
    await expect(task).rejects.toThrow('disk failed')
    await session.drain()
    await session.acquire(second)
    session.assert(second)
  })
})
