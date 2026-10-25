import { describe, expect, it } from 'vitest'
import { pathToFileURL } from 'node:url'
import { paperRole, trustedPaperUrl, registeredPaperRole, rememberPaperRole } from './trust'

describe('trusted paper documents', () => {
  it('does not infer native authority from renderer preferences or a copied object', () => {
    const sender = { additionalArguments: ['--orbis-role=history'] }
    expect(registeredPaperRole(sender)).toBeNull()
    rememberPaperRole(sender, 'history')
    expect(registeredPaperRole(sender)).toBe('history')
    expect(registeredPaperRole({ ...sender })).toBeNull()
  })
  it('allows only explicit history or reading roles, including the legacy role spelling', () => {
    expect(paperRole(['--orbis-role=history'])).toBe('history')
    expect(paperRole(['--mochi-role=reading'])).toBe('reading')
    expect(paperRole(['--orbis-role=reading', '--mochi-role=reading'])).toBe('reading')
    for (const args of [
      undefined,
      [],
      ['--orbis-role=avatar'],
      ['--orbis-role=reading', '--mochi-role=history'],
    ])
      expect(paperRole(args)).toBeNull()
  })
  it('requires exact production file location and role', () => {
    const root = '/app/out/renderer'
    const history = pathToFileURL(`${root}/history/index.html`).href
    expect(trustedPaperUrl(history, 'history', root)).toBe(true)
    expect(trustedPaperUrl(history, 'reading', root)).toBe(false)
    expect(trustedPaperUrl('file:///tmp/history/index.html', 'history', root)).toBe(false)
    expect(trustedPaperUrl('https://evil.test/history/index.html', 'history', root)).toBe(false)
    expect(trustedPaperUrl('not a URL', 'history', root)).toBe(false)
  })
  it('requires exact development origin and path, not prefix matches', () => {
    const dev = 'http://localhost:5173'
    expect(trustedPaperUrl(`${dev}/reading/index.html`, 'reading', '/unused', dev)).toBe(true)
    for (const url of [
      `${dev}/reading/other.html`,
      `${dev}/reading/index.html/extra`,
      'http://localhost:5174/reading/index.html',
      'https://evil.test/reading/index.html',
    ])
      expect(trustedPaperUrl(url, 'reading', '/unused', dev)).toBe(false)
  })
})
