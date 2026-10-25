import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { paperRole, trustedPaperUrl } from '../../main/paper/trust'

/** The native implementation changed, not the boundary: book frames must not
 * run JavaScript or gain the trusted document's native authority. Read the
 * real integration entry and bridge guards instead of the removed Rust host. */
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')
const html = read('../../renderer/paper/index.html')
const policy = /http-equiv="Content-Security-Policy"\s+content="([^"]+)"/i.exec(html)?.[1]
function directives(value: string): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const part of value.split(';')) {
    const [name, ...values] = part.trim().split(/\s+/)
    if (!name) continue
    if (name in out) throw new Error(`duplicate CSP directive ${name}`)
    out[name] = values
  }
  return out
}

describe('the Orbis Paper renderer isolation boundary', () => {
  it('ships an explicit policy and refuses duplicate directives', () => {
    expect(policy).toBeTruthy()
    expect(() => directives("script-src 'self'; script-src *")).toThrow('duplicate')
  })
  it('does not permit inline, evaluated, blob, or remote JavaScript', () => {
    // WASM evaluation is not JavaScript evaluation; pdf.js may need it.
    const script = directives(policy ?? '')['script-src'] ?? []
    expect(script).toContain("'self'")
    expect(script.filter((source) => source !== "'wasm-unsafe-eval'")).toEqual(["'self'"])
  })
  it('closes unnamed sources and plugin objects', () => {
    const d = directives(policy ?? '')
    expect(d['default-src']).toEqual(["'self'"])
    expect(d['object-src']).toEqual(["'none'"])
  })
  it('allows book resources without permitting a book to frame the trusted client', () => {
    const d = directives(policy ?? '')
    expect(d['frame-src']).toEqual(['blob:'])
    expect(d['img-src']).toEqual(expect.arrayContaining(['blob:', 'data:']))
    expect(d['worker-src']).toContain('blob:')
    expect(d['style-src']).toContain('blob:')
    expect(d['font-src']).toContain('blob:')
  })
  it('keeps Node out of the page and requires the main frame on both sides of IPC', () => {
    const nativeWindow = read('../../main/window.ts')
    expect(nativeWindow).toMatch(/contextIsolation:\s*true/)
    expect(nativeWindow).toMatch(/nodeIntegration:\s*false/)
    expect(nativeWindow).toMatch(/sandbox:\s*true/)
    const preload = read('../../preload/index.ts')
    expect(preload).toMatch(/if\s*\(\(role === 'reading' \|\| role === 'history'\) && process\.isMainFrame\)/)
    const ipc = read('../../main/paper/index.ts')
    expect(ipc).toContain('event.senderFrame !== sender.mainFrame')
    expect(ipc).toContain('trustedPaperUrl(sender.mainFrame.url')
    expect(ipc).toContain('registeredPaperRole(sender)')
    expect(nativeWindow).toContain("registerPaperWindow(window, 'history')")
    expect(nativeWindow).toContain("registerPaperWindow(window, 'reading')")
  })
  it('does not expose arbitrary native commands or channels from the Paper bridge', () => {
    const preload = read('../../preload/paper.ts')
    expect(preload).not.toMatch(/invoke:\s*ipc/)
    expect(preload).not.toMatch(/send:\s*ipc/)
    expect(preload).not.toMatch(/return\s+ipc/)
    expect(paperRole(undefined)).toBeNull()
    expect(paperRole(['--orbis-role=companion'])).toBeNull()
    expect(paperRole(['--orbis-role=reading', '--mochi-role=history'])).toBeNull()
    expect(paperRole(['--orbis-role=reading', '--mochi-role=reading'])).toBe('reading')
    expect(trustedPaperUrl('http://localhost:5173/reading/index.html', 'reading', '/renderer', 'http://localhost:5173/')).toBe(true)
    expect(trustedPaperUrl('http://evil.test/reading/index.html', 'reading', '/renderer', 'http://localhost:5173/')).toBe(false)
    expect(trustedPaperUrl('http://localhost:5173/companion/index.html', 'reading', '/renderer', 'http://localhost:5173/')).toBe(false)
  })
})
