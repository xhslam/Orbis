import { closeSync, constants, fstatSync, openSync, readSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import wire from '@shared/realtime-wire.json'
import { readTokenState } from '../codex/auth'
import { codexHome } from '../../capabilities/ask-workspace/profile'
import type { RefreshFailure } from '../codex/refresh'
import { DEFAULT_REALTIME_MODEL, type RealtimeModel } from '@shared/realtime-model'

/**
 * Main-process-only credential reading and Realtime mint/SDP calls.
 *
 * Codex owns the ChatGPT login. This module reads its bounded credential file
 * and classifies expiry/HTTP failures; `access.ts` coordinates renewal through
 * Codex's official app-server and a single retry. No bearer or minted key is
 * returned to a renderer, and no API-key fallback is enabled here.
 */

const AUTH_FILE = 'auth.json'

/**
 * The most a credential file can plausibly be.
 *
 * A JWT and a little JSON around it. Generous by three orders of magnitude, and
 * the point is only that SOME bound exists on a synchronous read that now runs
 * during startup.
 */
const MAX_AUTH_BYTES = 1_000_000

export type CredentialProblem =
  | { readonly kind: 'no-auth-file'; readonly path: string }
  | { readonly kind: 'unreadable'; readonly why: string }
  | { readonly kind: 'no-token' }
  /** The token is there and the service refused it. Almost always staleness. */
  | { readonly kind: 'stale-token'; readonly lastRefresh: string | null }
  | { readonly kind: 'login-required' }
  | { readonly kind: 'refresh-failed'; readonly reason: RefreshFailure }
  | { readonly kind: 'refused'; readonly status: number; readonly body: string }
  | { readonly kind: 'unreachable'; readonly why: string }

export function describeProblem(problem: CredentialProblem): string {
  switch (problem.kind) {
    case 'no-auth-file':
      return `no Codex credential at ${problem.path} — run \`codex\` once to sign in`
    case 'unreadable':
      return `the Codex credential could not be read: ${problem.why}`
    case 'no-token':
      return 'the Codex credential has no access token — run `codex` once to sign in'
    case 'stale-token':
      return (
        'the Codex token was refused' +
        (problem.lastRefresh === null ? '' : ` (last refreshed ${problem.lastRefresh})`) +
        ' — run `codex` once on this machine to refresh it'
      )
    case 'login-required':
      return 'Codex login could not be renewed — run `codex login`, then recheck in Settings'
    case 'refresh-failed':
      if (problem.reason === 'unavailable') {
        return 'Codex could not be started to renew its login — check its installation and retry'
      }
      if (problem.reason === 'timed-out') {
        return 'Codex login renewal timed out — check your network and recheck in Settings'
      }
      return 'Codex could not renew its login — check your network and retry; if it persists, run `codex login`'
    case 'refused':
      return `the voice service refused the request (HTTP ${problem.status}) — check account access and retry`
    case 'unreachable':
      return 'the voice service could not be reached — check your network and retry'
  }
}

export interface Bearer {
  readonly token: string
  /** For the staleness message. `null` when the file does not carry one. */
  readonly lastRefresh: string | null
}

export type Read<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly problem: CredentialProblem }

export function readBearer(home = codexHome(process.env, homedir())): Read<Bearer> {
  const path = join(home, AUTH_FILE)
  let text: string
  try {
    /*
      BOUNDED AND CHECKED ON THE DESCRIPTOR, not on the path.

      This became load-bearing when the check moved to startup (`plan-0.1.md`
      W10): a bare `readFileSync` on a user-controlled path now runs before the
      first window, so an oversized or non-regular `auth.json` stalls the app
      before anything is on screen to say why.

      The first version of the guard was `lstatSync` and then `readFileSync`,
      which is a check-then-act pair: two lookups of the same NAME, and the
      thing at that name can be replaced or grown in between. `fstat` on the
      open descriptor answers about the object actually being read, which is
      the only version of this question worth asking.

      `readBounded` is the usual instrument and is deliberately not used here:
      its `unreadable` reason carries `String(error)`, which is a sentence
      holding somebody's home directory — the exact leak the errno mapping
      below exists to avoid.
    */
    /*
      NON-BLOCKING, because `open` itself can hang.

      A FIFO at this path — or a symlink to one — blocks `openSync` until a
      writer appears, which on the startup path is the main process stopped
      before a window exists. `O_NONBLOCK` returns immediately; the `fstat`
      below then rejects it for not being a regular file, which is the answer
      that check was always meant to give.
    */
    const fd = openSync(path, constants.O_RDONLY | constants.O_NONBLOCK)
    try {
      const stats = fstatSync(fd)
      if (!stats.isFile()) {
        return { ok: false, problem: { kind: 'unreadable', why: 'not a file' } }
      }
      if (stats.size > MAX_AUTH_BYTES) {
        return {
          ok: false,
          problem: { kind: 'unreadable', why: 'larger than a credential can be' },
        }
      }
      /*
        READ IN A LOOP. A single `readSync` may legally return short.

        Rare on a local regular file and not impossible, and the failure is
        silent in the worst way: a truncated JWT parses as malformed and
        reports "your Codex login is not readable", sending somebody to
        re-authenticate a credential that was fine.
      */
      const held = Buffer.allocUnsafe(stats.size)
      let filled = 0
      while (filled < stats.size) {
        const got = readSync(fd, held, filled, stats.size - filled, filled)
        if (got === 0) break
        filled += got
      }
      text = held.subarray(0, filled).toString('utf8')
    } finally {
      closeSync(fd)
    }
  } catch (error: unknown) {
    /*
      BY ERRNO, which is what `codex/auth.ts` already says this does.

      That comment cites this function as describing the failure by errno; it
      interpolated `String(error)` instead, which produces a sentence carrying
      the absolute path of somebody's home directory and no machine-readable
      cause. So the caller could not distinguish "your Codex login is not
      readable by this app" (EACCES — actionable, and the common one on a
      restored-from-backup machine) from any other fault.
    */
    const code = (error as NodeJS.ErrnoException).code
    if (code === 'ENOENT') return { ok: false, problem: { kind: 'no-auth-file', path } }
    return {
      ok: false,
      problem: { kind: 'unreadable', why: code ?? 'the file could not be read' },
    }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, problem: { kind: 'unreadable', why: 'auth.json is not JSON' } }
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return {
      ok: false,
      problem: { kind: 'unreadable', why: 'auth.json did not contain an object' },
    }
  }
  const record = parsed as { tokens?: { access_token?: unknown }; last_refresh?: unknown }
  const token = record.tokens?.access_token
  if (typeof token !== 'string' || token.length === 0) {
    return { ok: false, problem: { kind: 'no-token' } }
  }
  const lastRefresh = typeof record.last_refresh === 'string' ? record.last_refresh : null

  // The same expiry decision as the settings probe. `access.ts` renews this
  // condition before minting; a revoked but unexpired token is caught by 401.
  const state = readTokenState(parsed, Date.now())
  if (state.kind === 'expired') {
    return { ok: false, problem: { kind: 'stale-token', lastRefresh } }
  }

  return { ok: true, value: { token, lastRefresh } }
}

/** What the renderer is allowed to hold: a short-lived key, never the bearer. */
export interface Minted {
  readonly key: string
  readonly model: RealtimeModel
}

export async function mintEphemeralKey(input: {
  readonly bearer: Bearer
  readonly model?: RealtimeModel
  readonly fetch?: typeof globalThis.fetch
}): Promise<Read<Minted>> {
  const model = input.model ?? DEFAULT_REALTIME_MODEL
  const send = input.fetch ?? globalThis.fetch

  let response: Response
  try {
    response = await send(wire.clientSecretsUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.bearer.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ session: { type: 'realtime', model } }),
      signal: AbortSignal.timeout(30_000),
    })
  } catch (error: unknown) {
    return { ok: false, problem: { kind: 'unreachable', why: String(error) } }
  }

  if (response.status === 401) {
    // §51. The token parses, the account is right, and the service says no.
    return { ok: false, problem: { kind: 'stale-token', lastRefresh: input.bearer.lastRefresh } }
  }
  if (!response.ok) {
    // The status is the substance here; an unreadable body should not turn a
    // clean refusal into a rejected invoke with nothing in it.
    return {
      ok: false,
      problem: {
        kind: 'refused',
        status: response.status,
        body: (await bodyOf(response)) ?? '(the response body could not be read)',
      },
    }
  }

  /*
    PARSED from text rather than `response.json()`, so a body that never
    finished arriving and a body that is not JSON take the same path — and it is
    this function's own `unreadable`, not a rejection out of the IPC handler.
  */
  const raw = await bodyOf(response)
  if (raw === null) {
    return {
      ok: false,
      problem: { kind: 'unreadable', why: 'the response body could not be read' },
    }
  }
  let body: unknown
  try {
    body = JSON.parse(raw)
  } catch {
    return { ok: false, problem: { kind: 'unreadable', why: 'the mint did not answer with JSON' } }
  }
  const value =
    typeof body === 'object' && body !== null
      ? (body as Record<string, unknown>)['value']
      : undefined
  if (typeof value !== 'string' || value.length === 0) {
    return { ok: false, problem: { kind: 'unreadable', why: 'the mint returned no key' } }
  }
  return { ok: true, value: { key: value, model } }
}

/**
 * A response body, or null when reading it failed.
 *
 * `fetch` resolving means the HEADERS arrived, not the body. `text()` and
 * `json()` each start a fresh read of a stream that can still abort — a dropped
 * connection mid-body, a truncated chunk, malformed JSON — and those rejections
 * were outside the `try` that wraps the request.
 *
 * The consequence was not a wrong answer, it was NO answer: this whole module
 * is built to return a structured problem (`unreachable`, `stale-token`,
 * `refused`, `unreadable`) so a person can be told which of them happened. A
 * rejection escaping bypasses all four and reaches the IPC handler as a
 * rejected invoke, where the renderer has nothing to say but the raw string.
 */
async function bodyOf(response: Response): Promise<string | null> {
  try {
    return await response.text()
  } catch {
    return null
  }
}

/**
 * The SDP exchange. Done here so the renderer never holds even the minted key.
 *
 * §48 measured this at 1.8–4.6s across two networks — the slowest single step in
 * opening a session, and the reason `reconnect.ts` budgets six seconds.
 */
export async function exchangeSdp(input: {
  readonly offer: string
  readonly minted: Minted
  readonly fetch?: typeof globalThis.fetch
}): Promise<Read<string>> {
  const send = input.fetch ?? globalThis.fetch
  let response: Response
  try {
    response = await send(`${wire.callsUrl}?model=${input.minted.model}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.minted.key}`,
        'Content-Type': 'application/sdp',
      },
      body: input.offer,
      signal: AbortSignal.timeout(30_000),
    })
  } catch (error: unknown) {
    return { ok: false, problem: { kind: 'unreachable', why: String(error) } }
  }

  const answer = await bodyOf(response)
  if (answer === null) {
    // An SDP answer that did not finish arriving is not an answer. Reported as
    // unreachable rather than refused: the service said nothing wrong, the
    // connection went — which is the same class as the `fetch` failure above.
    return {
      ok: false,
      problem: { kind: 'unreachable', why: 'the SDP answer could not be read' },
    }
  }
  // 201 is what the service actually returns; 200 accepted because a status
  // change of that shape should not take the app down.
  if (response.status !== 201 && response.status !== 200) {
    return { ok: false, problem: { kind: 'refused', status: response.status, body: answer } }
  }
  return { ok: true, value: answer }
}
