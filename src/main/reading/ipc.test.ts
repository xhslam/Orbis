import { describe, expect, it } from 'vitest'
import { isReadingChannel } from '../../shared/ipc'

describe('Reading IPC Channels allowlist', () => {
  it('identifies valid reading channels and rejects others', () => {
    expect(isReadingChannel('reading:articles:list')).toBe(true)
    expect(isReadingChannel('reading:article:get')).toBe(true)
    expect(isReadingChannel('reading:article:save')).toBe(true)
    expect(isReadingChannel('reading:import:file')).toBe(true)
    expect(isReadingChannel('reading:import:url')).toBe(true)
    expect(isReadingChannel('reading:voice:open')).toBe(true)
    expect(isReadingChannel('reading:voice:sdp')).toBe(true)
    expect(isReadingChannel('reading:open')).toBe(true)
    expect(isReadingChannel('voice:sdp')).toBe(false)
  })
})
