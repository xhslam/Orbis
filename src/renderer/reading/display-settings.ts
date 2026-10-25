/**
 * Reading & Retelling display settings.
 *
 * Provides configurable content width, page margins, font size, font family (Latin + CJK),
 * and line height, faithfully referencing vmark's typography and editor layout design.
 */

export interface ReadingDisplaySettings {
  readonly contentWidth: string // '36' | '42' | '50' | '60' | '80' | '0' (em units, 0 = unlimited)
  readonly pageMargin: string // 'compact' | 'normal' | 'relaxed' | 'wide' | 'extraWide'
  readonly fontSize: number // 14, 16, 18, 20, 22, 24 (px)
  readonly latinFont: string // 'system' | 'athelas' | 'palatino' | 'georgia' | 'charter' | 'literata'
  readonly cjkFont: string // 'system' | 'pingfang' | 'songti' | 'kaiti' | 'notoserif' | 'sourcehans'
  readonly lineHeight: string // '1.4' | '1.6' | '1.8' | '2.0'
}

export const LATIN_FONT_OPTIONS = [
  { value: 'system', labelEn: 'System Default', labelZh: '系统默认' },
  { value: 'athelas', labelEn: 'Athelas (Apple Books)', labelZh: 'Athelas (Apple Books 默认)' },
  { value: 'palatino', labelEn: 'Palatino', labelZh: 'Palatino' },
  { value: 'georgia', labelEn: 'Georgia', labelZh: 'Georgia' },
  { value: 'charter', labelEn: 'Charter', labelZh: 'Charter' },
  { value: 'literata', labelEn: 'Literata (Google Books)', labelZh: 'Literata (Google 阅读字体)' },
] as const

export const CJK_FONT_OPTIONS = [
  { value: 'system', labelEn: 'System Default', labelZh: '系统默认' },
  { value: 'pingfang', labelEn: 'PingFang SC', labelZh: '苹方 (PingFang SC)' },
  { value: 'songti', labelEn: 'Songti SC', labelZh: '宋体 (Songti SC)' },
  { value: 'kaiti', labelEn: 'Kaiti SC', labelZh: '楷体 (Kaiti SC)' },
  { value: 'notoserif', labelEn: 'Noto Serif CJK', labelZh: '思源宋体 (Noto Serif CJK)' },
  { value: 'sourcehans', labelEn: 'Source Han Sans', labelZh: '思源黑体 (Source Han Sans)' },
] as const

/**
 * Font stacks matching vmark's fontStacks.ts
 */
export const FONT_STACKS = {
  latin: {
    system: 'system-ui, -apple-system, BlinkMacSystemFont, "Outfit", sans-serif',
    athelas: 'Athelas, Georgia, serif',
    palatino: 'Palatino, "Palatino Linotype", serif',
    georgia: 'Georgia, "Times New Roman", serif',
    charter: 'Charter, Georgia, serif',
    literata: 'Literata, Georgia, serif',
  },
  cjk: {
    system: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
    pingfang: '"PingFang SC", "PingFang TC", sans-serif',
    songti: '"Songti SC", "STSong", "SimSun", serif',
    kaiti: '"Kaiti SC", "STKaiti", "KaiTi", serif',
    notoserif: '"Noto Serif CJK SC", "Source Han Serif SC", serif',
    sourcehans: '"Source Han Sans SC", "Noto Sans CJK SC", sans-serif',
  },
} as const

export const CONTENT_WIDTH_OPTIONS = [
  { value: '36', labelEn: '36em (Compact)', labelZh: '36em（紧凑）' },
  { value: '42', labelEn: '42em (Narrow)', labelZh: '42em（窄）' },
  { value: '50', labelEn: '50em (Medium)', labelZh: '50em（中等）' },
  { value: '60', labelEn: '60em (Wide)', labelZh: '60em（宽）' },
  { value: '80', labelEn: '80em (Extra Wide)', labelZh: '80em（特宽）' },
  { value: '0', labelEn: 'Unlimited', labelZh: '无限制' },
] as const

export const PAGE_MARGIN_OPTIONS = [
  { value: 'compact', px: 16, labelEn: '16px (Compact)', labelZh: '16px（紧凑）' },
  { value: 'normal', px: 32, labelEn: '32px (Normal)', labelZh: '32px（标准）' },
  { value: 'relaxed', px: 48, labelEn: '48px (Relaxed)', labelZh: '48px（宽松）' },
  { value: 'wide', px: 64, labelEn: '64px (Wide)', labelZh: '64px（宽阔）' },
  { value: 'extraWide', px: 96, labelEn: '96px (Extra Wide)', labelZh: '96px（特宽）' },
] as const

export const FONT_SIZE_OPTIONS = [
  { value: 14, label: '14px' },
  { value: 16, label: '16px' },
  { value: 18, label: '18px' },
  { value: 20, label: '20px' },
  { value: 22, label: '22px' },
  { value: 24, label: '24px' },
] as const

export const LINE_HEIGHT_OPTIONS = [
  { value: '1.4', labelEn: '1.4 (Compact)', labelZh: '1.4（紧凑）' },
  { value: '1.6', labelEn: '1.6 (Normal)', labelZh: '1.6（正常）' },
  { value: '1.8', labelEn: '1.8 (Relaxed)', labelZh: '1.8（宽松）' },
  { value: '2.0', labelEn: '2.0 (Spacious)', labelZh: '2.0（宽敞）' },
] as const

export const DEFAULT_READING_DISPLAY_SETTINGS: ReadingDisplaySettings = {
  contentWidth: '50',
  pageMargin: 'normal',
  fontSize: 18,
  latinFont: 'system',
  cjkFont: 'system',
  lineHeight: '1.6',
}

const SETTINGS_KEY = 'orbis:reading-display-settings'

let cachedSettings: ReadingDisplaySettings | null = null
type SettingsListener = (settings: ReadingDisplaySettings) => void
const listeners: SettingsListener[] = []

export function buildFontFamily(latinFont: string, cjkFont: string): string {
  const latin =
    FONT_STACKS.latin[latinFont as keyof typeof FONT_STACKS.latin] ?? FONT_STACKS.latin.system
  const cjk = FONT_STACKS.cjk[cjkFont as keyof typeof FONT_STACKS.cjk] ?? FONT_STACKS.cjk.system
  return `${latin}, ${cjk}`
}

export function getMarginPixels(pageMargin: string): number {
  const match = PAGE_MARGIN_OPTIONS.find((o) => o.value === pageMargin)
  return match ? match.px : 32
}

export function getReadingDisplaySettings(): ReadingDisplaySettings {
  if (cachedSettings !== null) return cachedSettings
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(SETTINGS_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<ReadingDisplaySettings>
        cachedSettings = {
          contentWidth: parsed.contentWidth ?? DEFAULT_READING_DISPLAY_SETTINGS.contentWidth,
          pageMargin: parsed.pageMargin ?? DEFAULT_READING_DISPLAY_SETTINGS.pageMargin,
          fontSize:
            typeof parsed.fontSize === 'number'
              ? parsed.fontSize
              : DEFAULT_READING_DISPLAY_SETTINGS.fontSize,
          latinFont: parsed.latinFont ?? DEFAULT_READING_DISPLAY_SETTINGS.latinFont,
          cjkFont: parsed.cjkFont ?? DEFAULT_READING_DISPLAY_SETTINGS.cjkFont,
          lineHeight: parsed.lineHeight ?? DEFAULT_READING_DISPLAY_SETTINGS.lineHeight,
        }
        return cachedSettings
      }
    }
  } catch {
    // Ignore storage issues
  }
  cachedSettings = { ...DEFAULT_READING_DISPLAY_SETTINGS }
  return cachedSettings
}

export function applyReadingDisplaySettings(
  settings: ReadingDisplaySettings,
  target?: HTMLElement | null,
): void {
  const root = target ?? (typeof document !== 'undefined' ? document.documentElement : null)
  if (!root) return

  const fontFamily = buildFontFamily(settings.latinFont, settings.cjkFont)
  const marginPx = getMarginPixels(settings.pageMargin)
  const widthVal = settings.contentWidth === '0' ? '100%' : `${settings.contentWidth}em`

  root.style.setProperty('--reading-font-family', fontFamily)
  root.style.setProperty('--reading-font-size', `${settings.fontSize}px`)
  root.style.setProperty('--reading-line-height', settings.lineHeight)
  root.style.setProperty('--reading-content-width', widthVal)
  root.style.setProperty('--reading-page-margin', `${marginPx}px`)
}

export function setReadingDisplaySettings(settings: ReadingDisplaySettings): void {
  cachedSettings = { ...settings }
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    }
  } catch {
    // Ignore storage issues
  }

  applyReadingDisplaySettings(settings)

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('orbis:reading-display-settings-change', { detail: settings }),
    )
  }

  for (const listener of listeners) {
    try {
      listener(settings)
    } catch (err) {
      console.error('[reading-display-settings] listener failed:', err)
    }
  }
}

export function onReadingDisplaySettingsChange(fn: SettingsListener): () => void {
  listeners.push(fn)
  return () => {
    const idx = listeners.indexOf(fn)
    if (idx >= 0) listeners.splice(idx, 1)
  }
}
