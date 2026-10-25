import { spawn, type ChildProcess } from 'node:child_process'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { codexHome } from '../../capabilities/ask-workspace/profile'
import { checkCodex, needsShell, pathOf, type CodexStatus } from './status'

export type RefreshFailure = 'unavailable' | 'timed-out' | 'failed' | 'signed-out'
export type RefreshResult =
  { readonly ok: true } | { readonly ok: false; readonly reason: RefreshFailure }

interface RefreshOptions {
  readonly command?: string
  readonly home?: string
  readonly env?: NodeJS.ProcessEnv
  readonly platform?: NodeJS.Platform
  readonly timeoutMs?: number
  readonly probe?: () => Promise<CodexStatus>
}

const MAX_OUTPUT_BYTES = 64 * 1024

/** Keep the single-flight lock until bounded process-tree cleanup is finished. */
async function stopTree(child: ChildProcess, platform: NodeJS.Platform): Promise<void> {
  const pid = child.pid
  if (pid === undefined) return
  const closed = new Promise<void>((resolve) => {
    if (child.exitCode !== null || child.signalCode !== null) resolve()
    else child.once('close', () => resolve())
  })
  if (platform === 'win32') {
    // Killing cmd.exe alone leaves the actual CLI alive. Only this owned PID's
    // tree is selected, never a process name or another Codex user's session.
    const killer = spawn(
      join(process.env['SystemRoot'] ?? 'C:\\Windows', 'System32', 'taskkill.exe'),
      ['/PID', String(pid), '/T', '/F'],
      { windowsHide: true, stdio: 'ignore' },
    )
    await new Promise<void>((resolve) => {
      const deadline = setTimeout(() => {
        killer.kill()
        resolve()
      }, 500)
      const done = () => {
        clearTimeout(deadline)
        resolve()
      }
      killer.once('close', done)
      killer.once('error', done)
    })
    child.kill('SIGKILL')
  } else {
    const signalTree = (signal: NodeJS.Signals): void => {
      try {
        process.kill(-pid, signal)
      } catch {
        child.kill(signal)
      }
    }
    signalTree('SIGTERM')
    // The group survives even if a shim exits before an uncooperative child.
    await delay(100)
    signalTree('SIGKILL')
  }
  child.stdin?.destroy()
  child.stdout?.destroy()
  await Promise.race([closed, delay(400)])
}

/**
 * Let Codex renew its own managed login. No OAuth client impersonation, model
 * turn, thread, network listener or token ever enters this protocol client.
 * Only a sanitized outcome escapes; account data and CLI errors stay private.
 *
 * Verified against codex-cli 0.159.3's generated GetAccountParams protocol:
 * account/read with refreshToken=true proactively refreshes managed auth.
 */
export async function refreshCodexAuth(options: RefreshOptions = {}): Promise<RefreshResult> {
  const started = performance.now()
  const timeoutMs = options.timeoutMs ?? 30_000
  const home = options.home ?? homedir()
  const sourceEnv = options.env ?? process.env
  // Preserve the reader's meaning of a relative CODEX_HOME before changing cwd.
  const env = { ...sourceEnv, CODEX_HOME: codexHome(sourceEnv, home) }
  const platform = options.platform ?? process.platform
  let command = options.command
  if (command === undefined) {
    let deadline: ReturnType<typeof setTimeout> | undefined
    try {
      const status = await Promise.race([
        (options.probe ?? (() => checkCodex({ platform, env, home })))(),
        new Promise<null>((resolve) => {
          deadline = setTimeout(() => resolve(null), timeoutMs)
        }),
      ])
      if (status === null) return { ok: false, reason: 'timed-out' }
      // These failures cannot be fixed by starting another Codex process.
      if (status.kind === 'timed-out') return { ok: false, reason: 'timed-out' }
      if (status.kind === 'not-installed' || status.kind === 'unusable') {
        return { ok: false, reason: 'unavailable' }
      }
      if (status.kind === 'logged-out') return { ok: false, reason: 'signed-out' }
      command = pathOf(status) ?? undefined
    } catch {
      return { ok: false, reason: 'unavailable' }
    } finally {
      clearTimeout(deadline)
    }
  }
  if (command === undefined) return { ok: false, reason: 'unavailable' }
  const remaining = timeoutMs - (performance.now() - started)
  if (remaining <= 0) return { ok: false, reason: 'timed-out' }

  return new Promise((resolve) => {
    const shell = needsShell(command, platform)
    let child: ReturnType<typeof spawn>
    try {
      child = spawn(shell ? `"${command}"` : command, ['app-server'], {
        shell,
        windowsHide: true,
        detached: platform !== 'win32',
        // Not the reading workspace: its config must not control authentication.
        cwd: home,
        env,
        stdio: ['pipe', 'pipe', 'ignore'],
      })
    } catch {
      resolve({ ok: false, reason: 'unavailable' })
      return
    }

    let settled = false
    let phase: 'initialize' | 'account' = 'initialize'
    let buffered = ''
    let bytes = 0
    const deadline = setTimeout(() => finish({ ok: false, reason: 'timed-out' }), remaining)

    function finish(result: RefreshResult): void {
      if (settled) return
      settled = true
      clearTimeout(deadline)
      // Resolving before cleanup would let a retry rotate the same credential
      // while the previous app-server was still running.
      void stopTree(child, platform).then(
        () => resolve(result),
        () => resolve(result),
      )
    }

    function send(message: unknown): void {
      if (settled) return
      try {
        child.stdin?.write(`${JSON.stringify(message)}\n`)
      } catch {
        finish({ ok: false, reason: 'failed' })
      }
    }

    function receive(line: string): void {
      if (line.trim() === '' || settled) return
      let value: unknown
      try {
        value = JSON.parse(line)
      } catch {
        finish({ ok: false, reason: 'failed' })
        return
      }
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        finish({ ok: false, reason: 'failed' })
        return
      }
      const message = value as Record<string, unknown>
      // Notifications are not replies. No server-initiated request is executed.
      const expected = phase === 'initialize' ? 1 : 2
      if (message['id'] !== expected) return
      if ('error' in message || !('result' in message)) {
        finish({ ok: false, reason: 'failed' })
        return
      }
      const result = message['result']
      if (typeof result !== 'object' || result === null || Array.isArray(result)) {
        finish({ ok: false, reason: 'failed' })
        return
      }
      if (phase === 'initialize') {
        phase = 'account'
        send({ method: 'initialized', params: {} })
        send({ method: 'account/read', id: 2, params: { refreshToken: true } })
        return
      }
      const account = (result as Record<string, unknown>)['account']
      if (account === null) {
        finish({ ok: false, reason: 'signed-out' })
      } else if (
        typeof account === 'object' &&
        (account as Record<string, unknown>)['type'] === 'chatgpt'
      ) {
        finish({ ok: true })
      } else {
        finish({ ok: false, reason: 'failed' })
      }
    }

    child.on('error', () => finish({ ok: false, reason: 'unavailable' }))
    child.on('close', () => finish({ ok: false, reason: 'failed' }))
    child.stdin?.on('error', () => finish({ ok: false, reason: 'failed' }))
    child.stdout?.on('error', () => finish({ ok: false, reason: 'failed' }))
    child.stdout?.setEncoding('utf8')
    child.stdout?.on('data', (chunk: string) => {
      if (settled) return
      bytes += Buffer.byteLength(chunk)
      if (bytes > MAX_OUTPUT_BYTES) {
        finish({ ok: false, reason: 'failed' })
        return
      }
      buffered += chunk
      let newline = buffered.indexOf('\n')
      while (newline !== -1 && !settled) {
        const line = buffered.slice(0, newline)
        buffered = buffered.slice(newline + 1)
        receive(line)
        newline = buffered.indexOf('\n')
      }
    })
    send({
      method: 'initialize',
      id: 1,
      params: { clientInfo: { name: 'orbis', title: 'Orbis', version: '0.1.20' } },
    })
  })
}
