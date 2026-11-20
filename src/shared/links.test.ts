import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { LINKS, LINK_KINDS, isLink } from './links'

const manifest = JSON.parse(
  readFileSync(fileURLToPath(new URL('../../package.json', import.meta.url)), 'utf8'),
)

describe('the project addresses', () => {
  it('opens this repository, not an external website', () => {
    expect(LINKS.repo).toBe(manifest.repository.url.replace(/^git\+/, '').replace(/\.git$/, ''))
    expect(manifest.homepage).toBe(LINKS.repo)
    expect(LINK_KINDS).toEqual(['author', 'repo'])
  })

  it('accepts only known https destinations', () => {
    for (const kind of LINK_KINDS) {
      expect(isLink(kind)).toBe(true)
      expect(LINKS[kind].startsWith('https://')).toBe(true)
    }
    for (const value of ['site', 'file:///etc/passwd', 'https://example.com', null, 7]) {
      expect(isLink(value)).toBe(false)
    }
  })
})
