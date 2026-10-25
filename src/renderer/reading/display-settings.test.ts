import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  applyReadingDisplaySettings,
  buildFontFamily,
  CONTENT_WIDTH_OPTIONS,
  DEFAULT_READING_DISPLAY_SETTINGS,
  FONT_STACKS,
  getMarginPixels,
  getReadingDisplaySettings,
  LATIN_FONT_OPTIONS,
  CJK_FONT_OPTIONS,
  onReadingDisplaySettingsChange,
  PAGE_MARGIN_OPTIONS,
  setReadingDisplaySettings,
  type ReadingDisplaySettings,
} from './display-settings'

function createMockElement() {
  const styles: Record<string, string> = {}
  return {
    style: {
      setProperty: (k: string, v: string) => {
        styles[k] = v
      },
      getPropertyValue: (k: string) => styles[k] ?? '',
    },
  } as unknown as HTMLElement
}

describe('ReadingDisplaySettings (vmark-referenced)', () => {
  const storageMap = new Map<string, string>()

  beforeEach(() => {
    storageMap.clear()
    const mockStorage = {
      getItem: (key: string) => storageMap.get(key) ?? null,
      setItem: (key: string, val: string) => {
        storageMap.set(key, val)
      },
      removeItem: (key: string) => storageMap.delete(key),
      clear: () => storageMap.clear(),
    }
    vi.stubGlobal('localStorage', mockStorage)

    // Reset cached settings by setting default
    setReadingDisplaySettings({ ...DEFAULT_READING_DISPLAY_SETTINGS })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('has vmark-matching default settings', () => {
    expect(DEFAULT_READING_DISPLAY_SETTINGS).toEqual({
      contentWidth: '50',
      pageMargin: 'normal',
      fontSize: 18,
      latinFont: 'system',
      cjkFont: 'system',
      lineHeight: '1.6',
    })
  })

  it('provides all vmark width options including compact, medium, wide, and unlimited', () => {
    const widthValues = CONTENT_WIDTH_OPTIONS.map((o) => o.value)
    expect(widthValues).toContain('36')
    expect(widthValues).toContain('42')
    expect(widthValues).toContain('50')
    expect(widthValues).toContain('60')
    expect(widthValues).toContain('80')
    expect(widthValues).toContain('0')
  })

  it('provides all page margin options from compact (16px) to extra wide (96px)', () => {
    const marginValues = PAGE_MARGIN_OPTIONS.map((o) => o.value)
    expect(marginValues).toEqual(['compact', 'normal', 'relaxed', 'wide', 'extraWide'])
    expect(getMarginPixels('compact')).toBe(16)
    expect(getMarginPixels('normal')).toBe(32)
    expect(getMarginPixels('relaxed')).toBe(48)
    expect(getMarginPixels('wide')).toBe(64)
    expect(getMarginPixels('extraWide')).toBe(96)
  })

  it('provides Latin and CJK fonts matching vmark font stacks', () => {
    const latinValues = LATIN_FONT_OPTIONS.map((o) => o.value)
    expect(latinValues).toContain('system')
    expect(latinValues).toContain('athelas')
    expect(latinValues).toContain('palatino')
    expect(latinValues).toContain('georgia')
    expect(latinValues).toContain('charter')
    expect(latinValues).toContain('literata')

    const cjkValues = CJK_FONT_OPTIONS.map((o) => o.value)
    expect(cjkValues).toContain('system')
    expect(cjkValues).toContain('pingfang')
    expect(cjkValues).toContain('songti')
    expect(cjkValues).toContain('kaiti')
    expect(cjkValues).toContain('notoserif')
    expect(cjkValues).toContain('sourcehans')
  })

  it('builds combined font-family with Latin primary and CJK fallback', () => {
    const athelasPingfang = buildFontFamily('athelas', 'pingfang')
    expect(athelasPingfang).toBe(`${FONT_STACKS.latin.athelas}, ${FONT_STACKS.cjk.pingfang}`)

    const charterKaiti = buildFontFamily('charter', 'kaiti')
    expect(charterKaiti).toBe(`${FONT_STACKS.latin.charter}, ${FONT_STACKS.cjk.kaiti}`)
  })

  it('applies CSS custom properties to target element', () => {
    const target = createMockElement()
    const custom: ReadingDisplaySettings = {
      contentWidth: '60',
      pageMargin: 'wide',
      fontSize: 20,
      latinFont: 'georgia',
      cjkFont: 'songti',
      lineHeight: '1.8',
    }

    applyReadingDisplaySettings(custom, target)

    expect(target.style.getPropertyValue('--reading-content-width')).toBe('60em')
    expect(target.style.getPropertyValue('--reading-page-margin')).toBe('64px')
    expect(target.style.getPropertyValue('--reading-font-size')).toBe('20px')
    expect(target.style.getPropertyValue('--reading-line-height')).toBe('1.8')
    expect(target.style.getPropertyValue('--reading-font-family')).toContain('Georgia')
    expect(target.style.getPropertyValue('--reading-font-family')).toContain('Songti SC')
  })

  it('sets unlimited content width to 100%', () => {
    const target = createMockElement()
    const unlimited: ReadingDisplaySettings = {
      ...DEFAULT_READING_DISPLAY_SETTINGS,
      contentWidth: '0',
    }

    applyReadingDisplaySettings(unlimited, target)
    expect(target.style.getPropertyValue('--reading-content-width')).toBe('100%')
  })

  it('saves and notifies subscribers when settings change', () => {
    const listener = vi.fn()
    const unsub = onReadingDisplaySettingsChange(listener)

    const updated: ReadingDisplaySettings = {
      contentWidth: '42',
      pageMargin: 'relaxed',
      fontSize: 16,
      latinFont: 'literata',
      cjkFont: 'kaiti',
      lineHeight: '1.4',
    }

    setReadingDisplaySettings(updated)

    expect(getReadingDisplaySettings()).toEqual(updated)
    expect(listener).toHaveBeenCalledWith(updated)

    unsub()
  })
})
