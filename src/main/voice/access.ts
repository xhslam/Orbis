import { refreshCodexAuth, type RefreshResult } from '../codex/refresh'
import { mintEphemeralKey, readBearer, type Bearer, type Minted, type Read } from './credential'

interface VoiceAccessDeps {
  readonly read: () => Read<Bearer>
  readonly refresh: () => Promise<RefreshResult>
  readonly mint: (bearer: Bearer) => Promise<Read<Minted>>
}

const loginRequired = { ok: false, problem: { kind: 'login-required' } } as const

/** One recovery policy shared by startup, the companion and reading voice. */
export function createVoiceAccess(deps: VoiceAccessDeps) {
  let refreshing: Promise<Read<Bearer>> | null = null

  async function renew(rejected?: Bearer): Promise<Read<Bearer>> {
    if (refreshing !== null) return refreshing
    const current = deps.read()
    // Another Codex client may have already rotated the token after our mint.
    if (current.ok && (rejected === undefined || current.value.token !== rejected.token)) {
      return current
    }
    if (!current.ok && current.problem.kind !== 'stale-token') return current

    refreshing = (async (): Promise<Read<Bearer>> => {
      let result: RefreshResult
      try {
        result = await deps.refresh()
      } catch {
        result = { ok: false, reason: 'failed' }
      }
      const after = deps.read()
      // A concurrent CLI may have succeeded even if this refresh failed.
      if (after.ok && (result.ok || !current.ok || after.value.token !== current.value.token)) {
        return after
      }
      if (!result.ok) {
        return result.reason === 'signed-out'
          ? loginRequired
          : { ok: false, problem: { kind: 'refresh-failed', reason: result.reason } }
      }
      // account/read may return an account even when its network refresh
      // failed. An unchanged expired file is not evidence of a revoked login.
      return !after.ok && after.problem.kind === 'stale-token'
        ? { ok: false, problem: { kind: 'refresh-failed', reason: 'failed' } }
        : after
    })()
    try {
      return await refreshing
    } finally {
      refreshing = null
    }
  }

  async function acquire(): Promise<{ bearer: Read<Bearer>; refreshed: boolean }> {
    if (refreshing !== null) return { bearer: await refreshing, refreshed: true }
    const bearer = deps.read()
    if (!bearer.ok && bearer.problem.kind === 'stale-token') {
      return { bearer: await renew(), refreshed: true }
    }
    return { bearer, refreshed: false }
  }

  return {
    async read(): Promise<Read<Bearer>> {
      return (await acquire()).bearer
    },
    async mint(): Promise<Read<Minted>> {
      const { bearer, refreshed } = await acquire()
      if (!bearer.ok) return bearer
      const result = await deps.mint(bearer.value)
      if (result.ok || result.problem.kind !== 'stale-token') return result
      // One refresh budget per open, including proactive expiry recovery.
      if (refreshed) return loginRequired
      const retryBearer = await renew(bearer.value)
      if (!retryBearer.ok) return retryBearer
      const retry = await deps.mint(retryBearer.value)
      return !retry.ok && retry.problem.kind === 'stale-token' ? loginRequired : retry
    },
  }
}

// Main-process singleton: concurrent reading and companion opens cannot rotate
// the same refresh token independently. No credential crosses this boundary.
export const voiceAccess = createVoiceAccess({
  read: () => readBearer(),
  refresh: () => refreshCodexAuth(),
  mint: (bearer) => mintEphemeralKey({ bearer }),
})
