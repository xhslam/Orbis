// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_READING_DISPLAY_SETTINGS as defaults,
  getReadingDisplaySettings,
  normalizeReadingDisplaySettings,
  onReadingDisplaySettingsChange,
  setReadingDisplaySettings,
} from './display-settings'

const key = 'orbis:reading-display-settings'
afterEach(() => localStorage.clear())

describe('shared reading typography across documents', () => {
  it('invalidates the cache and notifies already-mounted readers on storage changes', () => {
    setReadingDisplaySettings(defaults)
    const listener = vi.fn()
    const stop = onReadingDisplaySettingsChange(listener)
    const updated = { ...defaults, contentWidth: '36', fontSize: 22 }
    localStorage.setItem(key, JSON.stringify(updated))
    window.dispatchEvent(new StorageEvent('storage', { key, storageArea: localStorage }))
    expect(getReadingDisplaySettings()).toEqual(updated)
    expect(listener).toHaveBeenLastCalledWith(updated)
    expect(document.documentElement.style.getPropertyValue('--reading-content-width')).toBe('36em')
    stop()
    listener.mockClear()
    window.dispatchEvent(new StorageEvent('storage', { key }))
    expect(listener).not.toHaveBeenCalled()
  })

  it('resets on storage clearing and ignores unrelated keys', () => {
    setReadingDisplaySettings({ ...defaults, contentWidth: '80' })
    const listener = vi.fn()
    const stop = onReadingDisplaySettingsChange(listener)
    window.dispatchEvent(new StorageEvent('storage', { key: 'unrelated' }))
    expect(listener).not.toHaveBeenCalled()
    localStorage.clear()
    window.dispatchEvent(new StorageEvent('storage', { key: null }))
    expect(getReadingDisplaySettings()).toEqual(defaults)
    expect(listener).toHaveBeenCalledWith(defaults)
    stop()
  })

  it('rejects malformed stored CSS values instead of injecting them', () => {
    expect(
      normalizeReadingDisplaySettings({
        contentWidth: '-10',
        fontSize: Infinity,
        pageMargin: 'bogus',
        lineHeight: 'url(evil)',
        latinFont: 'bad',
        cjkFont: 'bad',
      }),
    ).toEqual(defaults)
    expect(normalizeReadingDisplaySettings(null)).toEqual(defaults)
  })
})
