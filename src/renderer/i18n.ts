/**
 * Interface localization (English / 简体中文).
 *
 * Persisted in localStorage so the user's chosen UI language survives across
 * sessions without coupling to the backend preferences file.
 */

export type Language = 'en' | 'zh'

const LANGUAGE_KEY = 'orbis:ui-language'

let currentLanguage: Language | null = null

export function getLanguage(): Language {
  if (currentLanguage !== null) return currentLanguage
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(LANGUAGE_KEY)
      if (stored === 'zh' || stored === 'en') {
        currentLanguage = stored
        return stored
      }
    }
  } catch {
    // ignore access issues in tests/sandboxes
  }
  return 'en'
}

type LanguageListener = (lang: Language) => void
const listeners: LanguageListener[] = []

export function onLanguageChange(fn: LanguageListener): () => void {
  listeners.push(fn)
  return () => {
    const idx = listeners.indexOf(fn)
    if (idx >= 0) listeners.splice(idx, 1)
  }
}

export function setLanguage(lang: Language): void {
  currentLanguage = lang
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LANGUAGE_KEY, lang)
    }
  } catch {
    // ignore
  }
  try {
    if (typeof window !== 'undefined') {
      const anyWin = window as unknown as {
        mochiSettings?: { screen: (c: { language?: string }) => void }
        orbisSettings?: { screen: (c: { language?: string }) => void }
      }
      const s = anyWin.mochiSettings ?? anyWin.orbisSettings
      s?.screen({ language: lang })
    }
  } catch {
    // ignore
  }
  for (const fn of listeners) {
    try {
      fn(lang)
    } catch (err) {
      console.error('[i18n] listener failed:', err)
    }
  }
}

export const I18N = {
  en: {
    // Rail
    characters: 'CHARACTERS',
    new: 'New',
    duplicate: 'Duplicate',
    readingAndRetelling: 'Reading & Retelling',
    thisMachine: 'This machine',
    worn: 'Worn',
    collapseSidebar: 'Collapse sidebar',
    expandSidebar: 'Expand sidebar',

    // Machine page header
    machineTitle: 'This machine',
    machineSays: 'These settings apply whoever she is.',

    // Machine navigation
    navLooking: 'Looking things up',
    navHearing: 'Hearing you',
    navPrompts: 'What she is told',
    navOnScreen: 'On screen',
    navKeys: 'Keys',
    navStorage: 'Storage',
    navAbout: 'About',

    // On-screen pane
    fieldLanguage: 'Language',
    languageNote: 'Interface display language (English / 简体中文).',
    langEn: 'English',
    langZh: '简体中文',

    fieldHalo: 'Halo',
    haloNote: 'When the halo over her head is drawn.',
    haloAlways: 'always',
    haloWhileSpeaking: 'while she speaks',
    haloNever: 'never',

    fieldChip: 'Shoulder button',
    chipNote: 'Whether the control appears at her shoulder on hover.',
    chipLabel: 'Show the button over her shoulder on hover',

    fieldRest: 'Rest',
    restNote: 'Minutes of silence before she rests on her own.',
    restNever: 'never on her own',
    afterMinutes: (m: number) => `after ${m} minutes`,

    // Her views
    viewSheet: 'Character',
    viewConversations: 'Conversations',
    viewPermits: 'What she may do',
    searchPlaceholder: 'Search everything ever said',

    // Reading & Retelling - Library / Home
    readingAppTitle: 'Orbis Reading & Retelling',
    readingAppSubtitle: 'Master English articles through keyword distillation and spoken retelling',
    importDoc: 'Import Document...',
    importWeb: 'Import Web Link...',
    pasteText: 'Paste Text...',
    emptyTitle: 'Your Reading Library is Empty',
    emptyDesc:
      'Import a Markdown file, TXT document, PDF text layer, or paste an article URL to start practicing.',
    importFirst: 'Import First Article',
    colTitleSource: 'Title & Source',
    colFormat: 'Format',
    colLength: 'Length',
    colStatus: 'Status',
    badgeRetold: 'Retold',
    badgeNew: 'New',
    articleStats: (paragraphs: number, highlights: number) =>
      `${paragraphs} paragraphs · ${highlights} highlights`,
    delete: 'Delete',
    deleteArticleTooltip: 'Delete article',
    confirmDeleteArticle: 'Are you sure you want to delete this article?',
    urlModalTitle: 'Import Web Article',
    urlModalDesc: 'Enter the public URL of an English article or blog post:',
    urlPlaceholder: 'https://example.com/article',
    cancel: 'Cancel',
    importAction: 'Import',
    pasteModalTitle: 'Paste English Text',
    pasteTitleLabel: 'Article Title',
    pasteTitlePlaceholder: 'Untitled Article',
    pasteContentLabel: 'Article Content',
    pastePlaceholder: 'Paste English article text here...',
    pasteSubmit: 'Save Article',
    pastedDefaultTitle: 'Pasted Article',
    manualSource: 'Manual input',
    failedToImportFile: (err: string) => `Failed to import file: ${err}`,
    failedToImportUrl: (err: string) => `Failed to import URL: ${err}`,
    failedToSaveText: (err: string) => `Failed to save pasted text: ${err}`,

    // Reading & Retelling - Article View
    backToLibrary: '← Library',
    clearHighlights: (count: number) => `Clear Highlights (${count})`,
    startRetellingBtn: 'Start Retelling →',
    practiceScope: 'Practice Scope:',
    allParagraphs: (total: number) => `All paragraphs (1–${total})`,
    customRange: 'Custom range:',
    fromParagraph: 'From P.',
    toParagraph: 'to P.',
    paragraphUnit: '',
    keywordTip:
      '💡 Tip: Select any word or phrase with your mouse to highlight it as a retelling keyword. Click a highlight to remove it.',
    removeHighlightTooltip: 'Click to remove keyword',
    confirmClearHighlights: 'Remove all highlights from this article?',

    // Reading & Retelling - Retelling View
    backToArticle: '← Back to Article',
    paragraphScope: (start: number, end: number) =>
      start === end ? `Paragraph ${start}` : `Paragraphs ${start}–${end}`,
    paragraphItem: (num: number) => `Paragraph ${num}`,
    noKeywordsMarked: 'No keywords marked',
    keywordsHeading: 'Keywords & Memory Cues',
    keywordsSubtitle: 'Full article text is hidden. Use these cues to guide your retelling.',
    statusReady: 'Ready to start',
    statusConnecting: 'Connecting voice session…',
    statusClickToBegin: 'Click "Start Retelling" to begin speaking',
    statusListening: 'Listening… Retell the story using your keywords',
    statusEvaluating: 'Submitting your retelling for evaluation…',
    startRetellingAction: 'Start Retelling',
    finishSpeakingAction: '说完了 (Finished Speaking)',
    turnTakingInstruction:
      '<strong>Manual Turn Taking:</strong> Pauses for thought will not interrupt you. Click "说完了" when you have finished your complete retelling.',

    // Reading & Retelling - Feedback View
    feedbackTitle: 'Retelling Feedback',
    stopVoice: 'Stop Voice',
    finishPractice: 'Finish Practice & Save',
    coachSpeaking: 'AI Coach is Speaking…',
    feedbackComplete: 'Feedback Complete',
    feedbackError: 'Evaluation Failed',
    feedbackErrorTip: 'Voice evaluation service encountered an issue. Please try again.',
    evaluatingPlaceholder: 'Evaluating your retelling against article facts…',
    tryAgain: 'Try Again (Re-record)',
    reviewArticle: 'Review Article Full Text',

    // Reading Display Settings (Typography & Layout)
    displaySettingsBtn: 'Display Settings',
    displaySettingsTooltip: 'Display & typography settings (width, margin, font, size)',
    displaySettingsTitle: 'Reading Display & Typography',
    displaySettingsDesc: 'Adjust maximum content width, page margins, font size and typography.',
    readingTypographyGroup: 'Reading & Retelling Layout',
    readingTypographyNote:
      'Adjust content width, page margins, font size and typography for reading and retelling.',
    fieldContentWidth: 'Content Width',
    contentWidthDesc: 'Maximum width for reading content.',
    fieldPageMargin: 'Page Margin',
    pageMarginDesc: 'Horizontal padding around the reading canvas.',
    fieldFontSize: 'Font Size',
    fontSizeDesc: 'Base text size for article content.',
    fieldLatinFont: 'Latin Font',
    latinFontDesc: 'Font family for English text.',
    fieldCjkFont: 'CJK Font',
    cjkFontDesc: 'Font family for Chinese / CJK text.',
    fieldLineHeight: 'Line Height',
    lineHeightDesc: 'Line spacing for article paragraphs.',
    resetDefaults: 'Reset to Defaults',
    close: 'Close',
  },
  zh: {
    // Rail
    characters: '角色列表',
    new: '新建',
    duplicate: '复制',
    readingAndRetelling: '阅读与复述',
    thisMachine: '本机设置',
    worn: '已佩戴',
    collapseSidebar: '收起侧边栏',
    expandSidebar: '展开侧边栏',

    // Machine page header
    machineTitle: '本机设置',
    machineSays: '这些设置对所有角色通用生效。',

    // Machine navigation
    navLooking: '信息检索',
    navHearing: '语音倾听',
    navPrompts: '提示词指令',
    navOnScreen: '界面与显示',
    navKeys: '快捷键',
    navStorage: '存储与文件',
    navAbout: '关于本机',

    // On-screen pane
    fieldLanguage: '界面语言',
    languageNote: '软件界面显示语言（English / 简体中文）。',
    langEn: 'English',
    langZh: '简体中文',

    fieldHalo: '状态光环',
    haloNote: '角色头像周围光环状态的显示时机。',
    haloAlways: '始终显示',
    haloWhileSpeaking: '说话时显示',
    haloNever: '从不显示',

    fieldChip: '肩部快捷按钮',
    chipNote: '鼠标悬停在角色身旁时是否显示快捷控制按钮。',
    chipLabel: '鼠标悬停时在角色肩部显示快捷按钮',

    fieldRest: '自动休眠',
    restNote: '未说话时自动进入休眠等待的分钟数。',
    restNever: '从不自动休眠',
    afterMinutes: (m: number) => `${m} 分钟后`,

    // Her views
    viewSheet: '角色设定',
    viewConversations: '历史对话',
    viewPermits: '权限许可',
    searchPlaceholder: '搜索所有对话历史',

    // Reading & Retelling - Library / Home
    readingAppTitle: 'Orbis 英语精读与复述',
    readingAppSubtitle: '通过关键词提炼与口语复述，真正掌握英文长文',
    importDoc: '导入文档...',
    importWeb: '导入网页链接...',
    pasteText: '粘贴文本...',
    emptyTitle: '阅读库暂无文章',
    emptyDesc: '导入 Markdown、TXT 文档、PDF 文本或粘贴文章链接开始练习。',
    importFirst: '导入第一篇文章',
    colTitleSource: '文章与来源',
    colFormat: '格式',
    colLength: '篇幅',
    colStatus: '状态',
    badgeRetold: '已复述',
    badgeNew: '新',
    articleStats: (paragraphs: number, highlights: number) =>
      `${paragraphs} 个段落 · ${highlights} 个关键词`,
    delete: '删除',
    deleteArticleTooltip: '删除文章',
    confirmDeleteArticle: '确定要删除这篇文章吗？',
    urlModalTitle: '导入网页文章',
    urlModalDesc: '输入英文文章或博客的公开网页链接：',
    urlPlaceholder: 'https://example.com/article',
    cancel: '取消',
    importAction: '导入',
    pasteModalTitle: '粘贴英文文本',
    pasteTitleLabel: '文章标题',
    pasteTitlePlaceholder: '未命名文章',
    pasteContentLabel: '文章正文',
    pastePlaceholder: '在此粘贴英文文章文本...',
    pasteSubmit: '保存文章',
    pastedDefaultTitle: '粘贴的文章',
    manualSource: '手动录入',
    failedToImportFile: (err: string) => `导入文件失败：${err}`,
    failedToImportUrl: (err: string) => `导入网页链接失败：${err}`,
    failedToSaveText: (err: string) => `保存文本失败：${err}`,

    // Reading & Retelling - Article View
    backToLibrary: '← 阅读库',
    clearHighlights: (count: number) => `清除高亮 (${count})`,
    startRetellingBtn: '开始复述 →',
    practiceScope: '练习范围：',
    allParagraphs: (total: number) => `全部段落 (1–${total})`,
    customRange: '自定义范围：',
    fromParagraph: '从第',
    toParagraph: '段到第',
    paragraphUnit: '段',
    keywordTip: '💡 提示：使用鼠标选中文中词汇或短语即可添加为复述关键词，点击高亮词可取消高亮。',
    removeHighlightTooltip: '点击移除关键词',
    confirmClearHighlights: '确定要清除本文的所有高亮关键词吗？',

    // Reading & Retelling - Retelling View
    backToArticle: '← 返回文章',
    paragraphScope: (start: number, end: number) =>
      start === end ? `第 ${start} 段` : `第 ${start}–${end} 段`,
    paragraphItem: (num: number) => `第 ${num} 段`,
    noKeywordsMarked: '未标记关键词',
    keywordsHeading: '关键词与记忆线索',
    keywordsSubtitle: '全文已隐藏。请根据提取的关键词线索指引进行复述。',
    statusReady: '准备就绪',
    statusConnecting: '正在连接语音会话…',
    statusClickToBegin: '点击“开始复述”开始口述',
    statusListening: '正在倾听… 请根据关键词复述文章内容',
    statusEvaluating: '正在提交复述内容进行讲评分析…',
    startRetellingAction: '开始复述',
    finishSpeakingAction: '说完了',
    turnTakingInstruction:
      '<strong>手动交替发言：</strong>思考停顿不会打断会话。全部复述完成后，请点击“说完了”。',

    // Reading & Retelling - Feedback View
    feedbackTitle: '复述讲评',
    stopVoice: '停止发音',
    finishPractice: '完成练习并保存',
    coachSpeaking: 'AI 导师正在点评…',
    feedbackComplete: '讲评完成',
    feedbackError: '讲评遇到问题',
    feedbackErrorTip: '语音评估服务出现异常，请检查网络或点击下方“再练一次”。',
    evaluatingPlaceholder: '正在对比原文要点评估复述内容…',
    tryAgain: '再练一次（重新录音）',
    reviewArticle: '查看文章全文',

    // Reading Display Settings (Typography & Layout)
    displaySettingsBtn: '排版设置',
    displaySettingsTooltip: '排版与显示设置（宽度、页边距、字体、字号）',
    displaySettingsTitle: '阅读与复述排版设置',
    displaySettingsDesc: '调节文章阅读最大宽度、左右页边距、字体大小与排版类型。',
    readingTypographyGroup: '阅读与复述排版',
    readingTypographyNote: '自定义阅读与复述界面的文字字体、大小、最大宽度与页边距。',
    fieldContentWidth: '内容宽度',
    contentWidthDesc: '文章正文的最大显示宽度。',
    fieldPageMargin: '页边距',
    pageMarginDesc: '阅读区域左右两侧的留白边距。',
    fieldFontSize: '字体大小',
    fontSizeDesc: '文章正文的基础字号大小。',
    fieldLatinFont: '西文字体',
    latinFontDesc: '英文字母与标点的排版字体。',
    fieldCjkFont: '中文字体',
    cjkFontDesc: '中文字符的排版字体。',
    fieldLineHeight: '行高',
    lineHeightDesc: '段落正文的行间距倍率。',
    resetDefaults: '恢复默认设置',
    close: '关闭',
  },
} as const

export type Translation = {
  readonly [K in keyof typeof I18N.en]: (typeof I18N.en)[K] extends (...args: infer A) => infer R
    ? (...args: A) => R
    : string
}

export function t(): Translation {
  return I18N[getLanguage()]
}
