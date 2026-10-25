import { existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CodexStatus } from './status'
import { refreshCodexAuth } from './refresh'

let home = ''
let command = ''
beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'orbis-refresh-'))
  const script = join(home, 'fake.cjs')
  command = join(home, process.platform === 'win32' ? 'codex.cmd' : 'codex')
  writeFileSync(
    command,
    process.platform === 'win32'
      ? `@echo off\r\n"${process.execPath}" "${script}" %*\r\n`
      : `#!/bin/sh\nexec "${process.execPath}" "${script}" "$@"\n`,
    { mode: 0o755 },
  )
  writeFileSync(
    script,
    `
const fs = require('node:fs');
const path = require('node:path');
const mode = process.env.FAKE_MODE;
const trace = { args: process.argv.slice(2), cwd: process.cwd(), codexHome: process.env.CODEX_HOME, messages: [] };
const save = () => fs.writeFileSync(path.join(process.env.CODEX_HOME, 'trace.json'), JSON.stringify(trace));
const send = (x) => process.stdout.write(JSON.stringify(x) + '\\n');
if (mode === 'stubborn') {
 process.on('SIGTERM', () => {});
 const descendant = require('node:child_process').spawn(process.execPath, ['-e', 'process.on("SIGTERM",()=>{});setInterval(()=>{},1000)'], {stdio:'ignore'});
 trace.pids = [process.pid, descendant.pid]; save();
}
require('node:readline').createInterface({ input: process.stdin }).on('line', (line) => {
 const message = JSON.parse(line); trace.messages.push(message); save();
 if (mode === 'hang' || mode === 'stubborn') return;
 if (mode === 'exit') process.exit(7);
 if (mode === 'oversized') return process.stdout.write('x'.repeat(100000));
 if (mode === 'malformed') return process.stdout.write('not JSON\\n');
 if (message.method === 'initialize') {
   if (mode === 'init-error') return send({id: message.id, error: {message: 'private account secret-token'}});
   const reply = JSON.stringify({id: message.id, result: {userAgent: 'fake'}}) + '\\n';
   process.stdout.write(reply.slice(0, 7));
   setTimeout(() => process.stdout.write(reply.slice(7)), 5);
 }
 if (message.method === 'account/read') {
   send({method: 'account/updated', params: {private: 'not returned to Orbis'}});
   if (mode === 'error') return send({id: message.id, error: {message: 'secret-token user@example.com'}});
   send({id: message.id, result: {account: mode === 'signed-out' ? null : {type: 'chatgpt', email: 'private@example.com'}, requiresOpenaiAuth: true}});
 }
});
`,
  )
})
afterEach(() => rmSync(home, { recursive: true, force: true }))

const ask = (mode = '', timeoutMs = 5_000) =>
  refreshCodexAuth({
    command,
    home,
    env: { ...process.env, CODEX_HOME: home, FAKE_MODE: mode },
    timeoutMs,
  })

describe('Codex-managed credential refresh over stdio', () => {
  it('initializes in order, refreshes only the account and returns no account data', async () => {
    expect(await ask()).toEqual({ ok: true })
    const trace = JSON.parse(readFileSync(join(home, 'trace.json'), 'utf8')) as {
      args: string[]
      cwd: string
      codexHome: string
      messages: { method: string; params?: unknown }[]
    }
    expect(trace.args).toEqual(['app-server'])
    expect(trace.cwd).toBe(realpathSync(home))
    expect(trace.codexHome).toBe(home)
    expect(trace.messages.map((message) => message.method)).toEqual([
      'initialize',
      'initialized',
      'account/read',
    ])
    expect(trace.messages[2]?.params).toEqual({ refreshToken: true })
  })

  it('distinguishes a missing login from a failed refresh', async () => {
    expect(await ask('signed-out')).toEqual({ ok: false, reason: 'signed-out' })
  })

  it.each(['init-error', 'error', 'exit', 'malformed', 'oversized'])(
    'bounds and sanitizes %s',
    async (mode) => {
      expect(await ask(mode)).toEqual({ ok: false, reason: 'failed' })
    },
  )

  it('does not wait forever for a stalled app-server', async () => {
    expect(await ask('hang', 300)).toEqual({ ok: false, reason: 'timed-out' })
  })

  it('normalizes relative CODEX_HOME before entering the user home', async () => {
    expect(
      await refreshCodexAuth({
        command,
        home,
        env: { ...process.env, CODEX_HOME: relative(process.cwd(), home) },
      }),
    ).toEqual({ ok: true })
    const trace = JSON.parse(readFileSync(join(home, 'trace.json'), 'utf8')) as {
      codexHome: string
    }
    expect(trace.codexHome).toBe(home)
  })

  it('bounds a stalled discovery and never starts a late process', async () => {
    let finishProbe!: (value: CodexStatus) => void
    expect(
      await refreshCodexAuth({
        home,
        timeoutMs: 20,
        probe: () =>
          new Promise((resolve) => {
            finishProbe = resolve
          }),
      }),
    ).toEqual({ ok: false, reason: 'timed-out' })
    finishProbe({ kind: 'ready', version: 'fake', path: command, mode: 'chatgpt' })
    await new Promise((resolve) => setTimeout(resolve, 30))
    expect(existsSync(join(home, 'trace.json'))).toBe(false)
  })

  it('waits for cleanup and terminates a stubborn descendant as well as its shim', async () => {
    expect(await ask('stubborn', 1_500)).toEqual({ ok: false, reason: 'timed-out' })
    const trace = JSON.parse(readFileSync(join(home, 'trace.json'), 'utf8')) as { pids: number[] }
    await vi.waitFor(
      () => {
        for (const pid of trace.pids) {
          let alive = false
          try {
            process.kill(pid, 0)
            alive = true
          } catch {
            /* gone */
          }
          expect(alive).toBe(false)
        }
      },
      { timeout: 1_000 },
    )
  })

  it('handles an executable that cannot be spawned', async () => {
    expect(await refreshCodexAuth({ command: join(home, 'missing'), home })).toEqual({
      ok: false,
      reason: 'unavailable',
    })
  })
})
