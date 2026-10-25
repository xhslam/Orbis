/**
 * The "reading" group of settings.
 *
 * Dedicated settings pane for Reading & Retelling display and typography:
 * content width, page margins, font size, Latin font, CJK font, and line height.
 */

import { element } from '../../element'
import { type Pane, type Field, field, options } from '../pane'
import { SAYS } from '../panes-says'
import { getLanguage } from '../../i18n'
import {
  CONTENT_WIDTH_OPTIONS,
  PAGE_MARGIN_OPTIONS,
  FONT_SIZE_OPTIONS,
  LATIN_FONT_OPTIONS,
  CJK_FONT_OPTIONS,
  LINE_HEIGHT_OPTIONS,
  DEFAULT_READING_DISPLAY_SETTINGS,
  getReadingDisplaySettings,
  setReadingDisplaySettings,
} from '../../reading/display-settings'

const FIELDS: Readonly<
  Record<
    | 'readingWidth'
    | 'readingMargin'
    | 'readingFontSize'
    | 'readingLatinFont'
    | 'readingCjkFont'
    | 'readingLineHeight',
    Field
  >
> = {
  readingWidth: {
    id: 'reading-width',
    label: SAYS.readingWidthHead,
    keywords: [
      'reading',
      'retelling',
      'content width',
      'width',
      '宽度',
      '正文宽度',
      '阅读宽度',
      '版面',
    ],
  },
  readingMargin: {
    id: 'reading-margin',
    label: SAYS.readingMarginHead,
    keywords: ['reading', 'retelling', 'margin', 'padding', '页边距', '留白', '边距'],
  },
  readingFontSize: {
    id: 'reading-font-size',
    label: SAYS.readingFontSizeHead,
    keywords: ['reading', 'retelling', 'font size', 'text size', '字体大小', '字号'],
  },
  readingLatinFont: {
    id: 'reading-latin-font',
    label: SAYS.readingLatinFontHead,
    keywords: ['reading', 'retelling', 'font', 'latin', 'english font', '西文字体', '英文字体'],
  },
  readingCjkFont: {
    id: 'reading-cjk-font',
    label: SAYS.readingCjkFontHead,
    keywords: ['reading', 'retelling', 'font', 'cjk', 'chinese font', '中文字体'],
  },
  readingLineHeight: {
    id: 'reading-line-height',
    label: SAYS.readingLineHeightHead,
    keywords: ['reading', 'retelling', 'line height', 'spacing', '行高', '行间距'],
  },
}

/** Reading & Retelling typography and canvas layout. */
export const READING: Pane = {
  id: 'reading',
  label: SAYS.readingLabel,
  attention: () => null,
  fields: () => [
    FIELDS.readingWidth,
    FIELDS.readingMargin,
    FIELDS.readingFontSize,
    FIELDS.readingLatinFont,
    FIELDS.readingCjkFont,
    FIELDS.readingLineHeight,
  ],
  render(view, handlers) {
    const isZh = getLanguage() === 'zh'
    const readingSettings = getReadingDisplaySettings()

    // 1. Content width
    const readingWidth = document.createElement('select')
    options(
      readingWidth,
      CONTENT_WIDTH_OPTIONS.map((one) => ({
        value: one.value,
        label: isZh ? one.labelZh : one.labelEn,
      })),
      readingSettings.contentWidth,
    )
    readingWidth.addEventListener('change', () => {
      setReadingDisplaySettings({
        ...getReadingDisplaySettings(),
        contentWidth: readingWidth.value,
      })
    })

    // 2. Page margin
    const readingMargin = document.createElement('select')
    options(
      readingMargin,
      PAGE_MARGIN_OPTIONS.map((one) => ({
        value: one.value,
        label: isZh ? one.labelZh : one.labelEn,
      })),
      readingSettings.pageMargin,
    )
    readingMargin.addEventListener('change', () => {
      setReadingDisplaySettings({
        ...getReadingDisplaySettings(),
        pageMargin: readingMargin.value,
      })
    })

    // 3. Font size
    const readingFontSize = document.createElement('select')
    options(
      readingFontSize,
      FONT_SIZE_OPTIONS.map((one) => ({
        value: String(one.value),
        label: one.label,
      })),
      String(readingSettings.fontSize),
    )
    readingFontSize.addEventListener('change', () => {
      setReadingDisplaySettings({
        ...getReadingDisplaySettings(),
        fontSize: Number(readingFontSize.value),
      })
    })

    // 4. Latin font
    const readingLatinFont = document.createElement('select')
    options(
      readingLatinFont,
      LATIN_FONT_OPTIONS.map((one) => ({
        value: one.value,
        label: isZh ? one.labelZh : one.labelEn,
      })),
      readingSettings.latinFont,
    )
    readingLatinFont.addEventListener('change', () => {
      setReadingDisplaySettings({
        ...getReadingDisplaySettings(),
        latinFont: readingLatinFont.value,
      })
    })

    // 5. CJK font
    const readingCjkFont = document.createElement('select')
    options(
      readingCjkFont,
      CJK_FONT_OPTIONS.map((one) => ({
        value: one.value,
        label: isZh ? one.labelZh : one.labelEn,
      })),
      readingSettings.cjkFont,
    )
    readingCjkFont.addEventListener('change', () => {
      setReadingDisplaySettings({
        ...getReadingDisplaySettings(),
        cjkFont: readingCjkFont.value,
      })
    })

    // 6. Line height
    const readingLineHeight = document.createElement('select')
    options(
      readingLineHeight,
      LINE_HEIGHT_OPTIONS.map((one) => ({
        value: one.value,
        label: isZh ? one.labelZh : one.labelEn,
      })),
      readingSettings.lineHeight,
    )
    readingLineHeight.addEventListener('change', () => {
      setReadingDisplaySettings({
        ...getReadingDisplaySettings(),
        lineHeight: readingLineHeight.value,
      })
    })

    // Reset button
    const resetWrap = element('div', 'row')
    const resetBtn = element('button', 'btn', isZh ? '恢复默认排版' : 'Reset to defaults')
    resetBtn.type = 'button'
    resetBtn.id = 'reset-reading-display-settings'
    resetBtn.addEventListener('click', () => {
      setReadingDisplaySettings(DEFAULT_READING_DISPLAY_SETTINGS)
      readingWidth.value = DEFAULT_READING_DISPLAY_SETTINGS.contentWidth
      readingMargin.value = DEFAULT_READING_DISPLAY_SETTINGS.pageMargin
      readingFontSize.value = String(DEFAULT_READING_DISPLAY_SETTINGS.fontSize)
      readingLatinFont.value = DEFAULT_READING_DISPLAY_SETTINGS.latinFont
      readingCjkFont.value = DEFAULT_READING_DISPLAY_SETTINGS.cjkFont
      readingLineHeight.value = DEFAULT_READING_DISPLAY_SETTINGS.lineHeight
      handlers.say(isZh ? '已恢复阅读排版默认设置' : 'Reading layout reset to defaults.')
    })
    resetWrap.append(resetBtn)

    return [
      field(FIELDS.readingWidth, view, readingWidth, {
        note: isZh
          ? '精读与复述正文的最大显示宽度（参考 vmark 编辑器规范）。'
          : 'Maximum width for reading & retelling content (referencing vmark editor width).',
      }),
      field(FIELDS.readingMargin, view, readingMargin, {
        note: isZh
          ? '阅读区域左右两侧的留白边距。'
          : 'Horizontal padding around the reading canvas.',
      }),
      field(FIELDS.readingFontSize, view, readingFontSize, {
        note: isZh
          ? '文章正文的基础字号大小。'
          : 'Base font size for reading & retelling paragraphs.',
      }),
      field(FIELDS.readingLatinFont, view, readingLatinFont, {
        note: isZh
          ? '英文字母与标点的排版字体（包含 Athelas、Palatino、Georgia、Charter、Literata 等）。'
          : 'Font family for English text (including Athelas, Palatino, Georgia, Charter, Literata).',
      }),
      field(FIELDS.readingCjkFont, view, readingCjkFont, {
        note: isZh
          ? '中文字符的排版字体（包含苹方、宋体、楷体、思源宋体、思源黑体等）。'
          : 'Font family for Chinese / CJK text (including PingFang, Songti, Kaiti, Noto Serif CJK, Source Han Sans).',
      }),
      field(FIELDS.readingLineHeight, view, readingLineHeight, {
        note: isZh ? '段落正文的行间距倍率。' : 'Line height ratio for reading & retelling text.',
      }),
      resetWrap,
    ]
  },
}
