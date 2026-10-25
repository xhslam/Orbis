import { describe, expect, it, vi } from 'vitest'
import { createVoiceAccess } from './access'
import type { Bearer, Minted, Read } from './credential'
import type { RefreshResult } from '../codex/refresh'

const old: Bearer = { token: 'old', lastRefresh: 'before' }
const fresh: Bearer = { token: 'fresh', lastRefresh: 'after' }
const expired: Read<Bearer> = {
  ok: false,
  problem: { kind: 'stale-token', lastRefresh: 'before' },
}
const minted: Read<Minted> = { ok: true, value: { key: 'ek', model: 'gpt-realtime-2.1' } }
const refused: Read<Minted> = { ok: false, problem: { kind: 'stale-token', lastRefresh: 'before' } }

function setup(initial: Read<Bearer> = { ok: true, value: old }) {
  let disk = initial
  const read = vi.fn(() => disk)
  const refresh = vi.fn(async (): Promise<RefreshResult> => {
    disk = { ok: true, value: fresh }
    return { ok: true }
  })
  const mint = vi.fn(async (_bearer: Bearer): Promise<Read<Minted>> => minted)
  return {
    read,
    refresh,
    mint,
    setDisk: (value: Read<Bearer>) => {
      disk = value
    },
    access: createVoiceAccess({ read, refresh, mint }),
  }
}

describe('shared Codex voice access', () => {
  it('uses a live credential without spawning Codex', async () => {
    const h = setup()
    expect(await h.access.mint()).toEqual(minted)
    expect(h.refresh).not.toHaveBeenCalled()
    expect(h.mint).toHaveBeenCalledWith(old)
  })

  it('refreshes an expired credential before the first mint', async () => {
    const h = setup(expired)
    expect(await h.access.mint()).toEqual(minted)
    expect(h.refresh).toHaveBeenCalledTimes(1)
    expect(h.mint).toHaveBeenCalledExactlyOnceWith(fresh)
  })

  it('also recovers during a startup credential check without minting a session', async () => {
    const h = setup(expired)
    expect(await h.access.read()).toEqual({ ok: true, value: fresh })
    expect(h.mint).not.toHaveBeenCalled()
  })

  it('refreshes and retries exactly once after a 401 for an unexpired token', async () => {
    const h = setup()
    h.mint.mockResolvedValueOnce(refused)
    expect(await h.access.mint()).toEqual(minted)
    expect(h.mint.mock.calls.map(([bearer]) => bearer.token)).toEqual(['old', 'fresh'])
    expect(h.refresh).toHaveBeenCalledTimes(1)
  })

  it('rereads a credential already renewed by another client instead of rotating it again', async () => {
    const h = setup()
    h.mint.mockImplementationOnce(async () => {
      h.setDisk({ ok: true, value: fresh })
      return refused
    })
    expect(await h.access.mint()).toEqual(minted)
    expect(h.refresh).not.toHaveBeenCalled()
    expect(h.mint.mock.calls.map(([bearer]) => bearer.token)).toEqual(['old', 'fresh'])
  })

  it('shares one refresh between startup, companion and reading requests', async () => {
    const h = setup(expired)
    let release!: (value: RefreshResult) => void
    h.refresh.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = resolve
        }),
    )
    const pending = [h.access.read(), h.access.mint(), h.access.mint()]
    expect(h.refresh).toHaveBeenCalledTimes(1)
    h.setDisk({ ok: true, value: fresh })
    release({ ok: true })
    const results = await Promise.all(pending)
    expect(results.every((result) => result.ok)).toBe(true)
    expect(h.refresh).toHaveBeenCalledTimes(1)
    expect(h.mint).toHaveBeenCalledTimes(2)
  })

  it('coalesces concurrent 401s, including one arriving after the refresh', async () => {
    const h = setup()
    h.mint.mockImplementation(async (bearer) => (bearer.token === 'old' ? refused : minted))
    expect(await Promise.all([h.access.mint(), h.access.mint()])).toEqual([minted, minted])
    expect(h.refresh).toHaveBeenCalledTimes(1)
  })

  it('does not loop when the renewed credential is refused too', async () => {
    const h = setup()
    h.mint.mockResolvedValue(refused)
    expect(await h.access.mint()).toMatchObject({ ok: false, problem: { kind: 'login-required' } })
    expect(h.refresh).toHaveBeenCalledTimes(1)
    expect(h.mint).toHaveBeenCalledTimes(2)
  })

  it('does not give an already-refreshed expired credential a second refresh budget', async () => {
    const h = setup(expired)
    h.mint.mockResolvedValue(refused)
    expect(await h.access.mint()).toMatchObject({ ok: false, problem: { kind: 'login-required' } })
    expect(h.refresh).toHaveBeenCalledTimes(1)
    expect(h.mint).toHaveBeenCalledTimes(1)
  })

  it.each(['no-token', 'unreadable', 'no-auth-file'] as const)(
    'does not launch login for %s',
    async (kind) => {
      const problem =
        kind === 'unreadable'
          ? { kind, why: 'bad JSON' }
          : kind === 'no-auth-file'
            ? { kind, path: '/missing' }
            : { kind }
      const h = setup({ ok: false, problem })
      expect(await h.access.mint()).toEqual({ ok: false, problem })
      expect(h.refresh).not.toHaveBeenCalled()
      expect(h.mint).not.toHaveBeenCalled()
    },
  )

  it('does not refresh for other HTTP failures', async () => {
    const h = setup()
    const failure: Read<Minted> = {
      ok: false,
      problem: { kind: 'refused', status: 403, body: 'no access' },
    }
    h.mint.mockResolvedValue(failure)
    expect(await h.access.mint()).toEqual(failure)
    expect(h.refresh).not.toHaveBeenCalled()
  })

  it('keeps a transient refresh failure distinct from a login requirement and allows retry', async () => {
    const h = setup(expired)
    h.refresh.mockResolvedValueOnce({ ok: false, reason: 'timed-out' })
    expect(await h.access.mint()).toEqual({
      ok: false,
      problem: { kind: 'refresh-failed', reason: 'timed-out' },
    })
    expect(h.mint).not.toHaveBeenCalled()
    expect(await h.access.mint()).toEqual(minted)
    expect(h.refresh).toHaveBeenCalledTimes(2)
  })

  it('does not leak a thrown refresh error into a renderer', async () => {
    const h = setup(expired)
    h.refresh.mockRejectedValueOnce(new Error('secret-token and private account'))
    expect(await h.access.read()).toEqual({
      ok: false,
      problem: { kind: 'refresh-failed', reason: 'failed' },
    })
  })

  it('does not mistake RPC success without a usable token for a revoked login', async () => {
    const h = setup(expired)
    h.refresh.mockResolvedValue({ ok: true })
    expect(await h.access.read()).toEqual({
      ok: false,
      problem: { kind: 'refresh-failed', reason: 'failed' },
    })
  })
})
