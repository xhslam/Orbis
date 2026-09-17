import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  renderKeywordsSummary,
  renderRetellingView,
  type RetellingViewProps,
} from './components/retelling-view'
import { renderHomeView, type HomeViewProps } from './components/home-view'
import {
  renderArticleView,
  resetTipStateForTesting,
  type ArticleViewProps,
} from './components/article-view'
import { renderFeedbackView, type FeedbackViewProps } from './components/feedback-view'
import {
  createArticleFromText,
  addHighlight,
  type Article,
  type ArticleSummary,
  type PracticeScope,
} from '../../shared/reading/article'
import { setLanguage } from '../i18n'

function createMockContainer() {
  let html = ''
  const listeners = new Map<string, Array<{ event: string; fn: (...args: unknown[]) => void }>>()

  const element = {
    get innerHTML() {
      return html
    },
    set innerHTML(val: string) {
      html = val
    },
    querySelector: (selector: string) => {
      return {
        addEventListener: (event: string, fn: (...args: unknown[]) => void) => {
          const list = listeners.get(selector) ?? []
          list.push({ event, fn })
          listeners.set(selector, list)
        },
        classList: { contains: () => false },
        dataset: {},
        value: '',
        checked: false,
        disabled: false,
        showModal: vi.fn(),
        close: vi.fn(),
        remove: vi.fn(),
      }
    },
    querySelectorAll: () => [],
    appendChild: (child: unknown) => {
      const node = child as { outerHTML?: string; innerHTML?: string }
      if (node?.outerHTML) {
        html += node.outerHTML
      } else if (node?.innerHTML) {
        html += node.innerHTML
      }
    },
  }

  return {
    element: element as unknown as HTMLElement,
    getHtml: () => html,
    trigger: (selector: string, event = 'click', arg?: unknown) => {
      const list = listeners.get(selector) ?? []
      for (const item of list) {
        if (item.event === event) item.fn(arg ?? { stopPropagation: () => {} })
      }
    },
  }
}

describe('Reading & Retelling UI Components', () => {
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
    resetTipStateForTesting()
    setLanguage('en')
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    resetTipStateForTesting()
    setLanguage('en')
  })

  const sampleArticle = createArticleFromText({
    title: 'The Great Barrier Reef',
    source: 'ocean.txt',
    sourceType: 'txt',
    text: 'The Great Barrier Reef is the largest coral reef system.\n\nIt is home to thousands of marine species.\n\nClimate change poses severe threats.',
  })

  const articleWithHighlights: Article = addHighlight(
    addHighlight(sampleArticle, {
      paragraphIndex: 0,
      startOffset: 4,
      endOffset: 22,
      text: 'Great Barrier Reef',
    }),
    {
      paragraphIndex: 1,
      startOffset: 24,
      endOffset: 38,
      text: 'marine species',
    },
  )

  describe('renderKeywordsSummary', () => {
    it('renders only the keywords for highlighted paragraphs and neutral labels for unhighlighted paragraphs', () => {
      const scope: PracticeScope = { startParagraph: 0, endParagraph: 2 }
      const html = renderKeywordsSummary(articleWithHighlights, scope)

      expect(html).toContain('Great Barrier Reef')
      expect(html).toContain('marine species')
      expect(html).toContain('Paragraph 1')
      expect(html).toContain('Paragraph 2')
      expect(html).toContain('Paragraph 3')
      expect(html).toContain('No keywords marked')
      // Full sentence text from paragraph 0 or 1 must not be in keywords
      expect(html).not.toContain('largest coral reef system')
    })

    it('respects scope by omitting out-of-scope paragraphs', () => {
      const scope: PracticeScope = { startParagraph: 1, endParagraph: 1 }
      const html = renderKeywordsSummary(articleWithHighlights, scope)

      expect(html).not.toContain('Great Barrier Reef')
      expect(html).toContain('marine species')
      expect(html).not.toContain('Paragraph 1')
      expect(html).toContain('Paragraph 2')
      expect(html).not.toContain('Paragraph 3')
    })
  })

  describe('renderRetellingView', () => {
    it('hides the full article text and shows only keywords cues', () => {
      const { element, getHtml } = createMockContainer()
      const scope: PracticeScope = { startParagraph: 0, endParagraph: 1 }
      const props: RetellingViewProps = {
        article: articleWithHighlights,
        scope,
        session: null,
        state: 'ready',
        onStartRecording: vi.fn(),
        onFinishSpeaking: vi.fn(),
        onCancel: vi.fn(),
      }

      renderRetellingView(props, element)
      const html = getHtml()

      // Must show article title and cues
      expect(html).toContain('The Great Barrier Reef')
      expect(html).toContain('Keywords & Memory Cues')
      expect(html).toContain('marine species')

      // Crucial requirement: Full text MUST NOT be displayed in retelling mode
      expect(html).not.toContain('The Great Barrier Reef is the largest coral reef system.')
      expect(html).not.toContain('It is home to thousands of marine species.')

      // Ready state shows Start Retelling button and not finish speaking button
      expect(html).toContain('Start Retelling')
      expect(html).toContain('id="start-speaking-btn"')
      expect(html).not.toContain('id="finish-speaking-btn"')
    })

    it('shows "说完了" button when user is actively recording', () => {
      const { element, getHtml } = createMockContainer()
      const scope: PracticeScope = { startParagraph: 0, endParagraph: 1 }
      const props: RetellingViewProps = {
        article: articleWithHighlights,
        scope,
        session: null,
        state: 'recording',
        onStartRecording: vi.fn(),
        onFinishSpeaking: vi.fn(),
        onCancel: vi.fn(),
      }

      renderRetellingView(props, element)
      const html = getHtml()

      expect(html).toContain('说完了 (Finished Speaking)')
      expect(html).toContain('Listening… Retell the story using your keywords')
      expect(html).toContain('Manual Turn Taking')
    })
  })

  describe('renderArticleView', () => {
    it('renders article paragraphs and controls in English', () => {
      const { element, getHtml } = createMockContainer()
      const props: ArticleViewProps = {
        article: articleWithHighlights,
        onUpdateArticle: vi.fn(),
        onStartRetelling: vi.fn(),
        onBack: vi.fn(),
      }

      renderArticleView(props, element)
      const html = getHtml()

      expect(html).toContain('The Great Barrier Reef')
      expect(html).toContain('← Library')
      expect(html).toContain('Start Retelling →')
      expect(html).toContain('Practice Scope:')
      expect(html).toContain('All paragraphs (1–3)')
      expect(html).toContain('id="reading-display-settings-btn"')
      expect(html).toContain('Display Settings')
    })
  })

  describe('renderHomeView', () => {
    it('renders empty state when library has no articles', () => {
      const { element, getHtml } = createMockContainer()
      const props: HomeViewProps = {
        articles: [],
        onSelectArticle: vi.fn(),
        onDeleteArticle: vi.fn(),
        onImportFile: vi.fn(),
        onImportUrl: vi.fn(),
        onPasteText: vi.fn(),
      }

      renderHomeView(props, element)
      const html = getHtml()

      expect(html).toContain('Your Reading Library is Empty')
      expect(html).toContain('Import First Article')
    })

    it('renders article table rows when articles exist', () => {
      const { element, getHtml } = createMockContainer()
      const summaries: readonly ArticleSummary[] = [
        {
          id: 'art-1',
          title: 'Article One',
          source: 'https://example.com/art1',
          sourceType: 'url',
          paragraphCount: 5,
          highlightCount: 8,
          updatedAt: Date.now(),
          lastPractice: {
            id: 'pr-1',
            articleId: 'art-1',
            scope: { startParagraph: 0, endParagraph: 4 },
            startedAt: 100,
            finishedAt: 200,
            feedbackTranscript: 'Good job',
            isCompleted: true,
          },
        },
      ]

      const props: HomeViewProps = {
        articles: summaries,
        onSelectArticle: vi.fn(),
        onDeleteArticle: vi.fn(),
        onImportFile: vi.fn(),
        onImportUrl: vi.fn(),
        onPasteText: vi.fn(),
      }

      renderHomeView(props, element)
      const html = getHtml()

      expect(html).toContain('Article One')
      expect(html).toContain('URL')
      expect(html).toContain('5 paragraphs · 8 highlights')
      expect(html).toContain('Retold')
    })
  })

  describe('renderFeedbackView', () => {
    it('renders live transcript and speaking status when AI is responding', () => {
      const { element, getHtml } = createMockContainer()
      const scope: PracticeScope = { startParagraph: 0, endParagraph: 1 }
      const props: FeedbackViewProps = {
        article: sampleArticle,
        scope,
        transcript: 'You covered the main facts well. Your pronunciation was clear.',
        state: 'responding',
        session: null,
        onTryAgain: vi.fn(),
        onReviewArticle: vi.fn(),
        onFinishPractice: vi.fn(),
      }

      renderFeedbackView(props, element)
      const html = getHtml()

      expect(html).toContain('AI Coach is Speaking…')
      expect(html).toContain('You covered the main facts well.')
      expect(html).toContain('Stop Voice')
      expect(html).toContain('Finish Practice & Save')
    })

    it('renders completed feedback state', () => {
      const { element, getHtml } = createMockContainer()
      const scope: PracticeScope = { startParagraph: 0, endParagraph: 1 }
      const props: FeedbackViewProps = {
        article: sampleArticle,
        scope,
        transcript: 'Excellent summary.',
        state: 'ready',
        session: null,
        onTryAgain: vi.fn(),
        onReviewArticle: vi.fn(),
        onFinishPractice: vi.fn(),
      }

      renderFeedbackView(props, element)
      const html = getHtml()

      expect(html).toContain('Feedback Complete')
      expect(html).toContain('Excellent summary.')
      expect(html).not.toContain('Stop Voice')
    })

    it('renders error state when evaluation fails', () => {
      const { element, getHtml } = createMockContainer()
      const scope: PracticeScope = { startParagraph: 0, endParagraph: 1 }
      const props: FeedbackViewProps = {
        article: sampleArticle,
        scope,
        transcript: '',
        state: { error: 'Voice service unavailable' },
        session: null,
        onTryAgain: vi.fn(),
        onReviewArticle: vi.fn(),
        onFinishPractice: vi.fn(),
      }

      renderFeedbackView(props, element)
      const html = getHtml()

      expect(html).toContain('Evaluation Failed')
      expect(html).toContain('Voice service unavailable')
      expect(html).not.toContain('AI Coach is Speaking…')
    })
  })

  describe('Chinese localization (zh)', () => {
    beforeEach(() => {
      setLanguage('zh')
    })

    it('renders keywords summary in Chinese', () => {
      const scope: PracticeScope = { startParagraph: 0, endParagraph: 2 }
      const html = renderKeywordsSummary(articleWithHighlights, scope)

      expect(html).toContain('第 1 段')
      expect(html).toContain('第 2 段')
      expect(html).toContain('第 3 段')
      expect(html).toContain('未标记关键词')
    })

    it('renders retelling view in Chinese', () => {
      const { element, getHtml } = createMockContainer()
      const scope: PracticeScope = { startParagraph: 0, endParagraph: 1 }
      const props: RetellingViewProps = {
        article: articleWithHighlights,
        scope,
        session: null,
        state: 'ready',
        onStartRecording: vi.fn(),
        onFinishSpeaking: vi.fn(),
        onCancel: vi.fn(),
      }

      renderRetellingView(props, element)
      const html = getHtml()

      expect(html).toContain('← 返回文章')
      expect(html).toContain('第 1–2 段')
      expect(html).toContain('关键词与记忆线索')
      expect(html).toContain('全文已隐藏。请根据提取的关键词线索指引进行复述。')
      expect(html).toContain('开始复述')
      expect(html).toContain('手动交替发言')
    })

    it('renders retelling recording state with "说完了" in Chinese', () => {
      const { element, getHtml } = createMockContainer()
      const scope: PracticeScope = { startParagraph: 0, endParagraph: 1 }
      const props: RetellingViewProps = {
        article: articleWithHighlights,
        scope,
        session: null,
        state: 'recording',
        onStartRecording: vi.fn(),
        onFinishSpeaking: vi.fn(),
        onCancel: vi.fn(),
      }

      renderRetellingView(props, element)
      const html = getHtml()

      expect(html).toContain('正在倾听… 请根据关键词复述文章内容')
      expect(html).toContain('说完了')
    })

    it('renders article view in Chinese', () => {
      const { element, getHtml } = createMockContainer()
      const props: ArticleViewProps = {
        article: articleWithHighlights,
        onUpdateArticle: vi.fn(),
        onStartRetelling: vi.fn(),
        onBack: vi.fn(),
      }

      renderArticleView(props, element)
      const html = getHtml()

      expect(html).toContain('← 阅读库')
      expect(html).toContain('开始复述 →')
      expect(html).toContain('练习范围：')
      expect(html).toContain('全部段落 (1–3)')
      expect(html).toContain('自定义范围：')
      expect(html).toContain('💡 提示：使用鼠标选中文中词汇或短语即可添加为复述关键词')
      expect(html).toContain('排版设置')
    })

    it('renders feedback view in Chinese', () => {
      const { element, getHtml } = createMockContainer()
      const scope: PracticeScope = { startParagraph: 0, endParagraph: 1 }
      const props: FeedbackViewProps = {
        article: sampleArticle,
        scope,
        transcript: '这是反馈文本。',
        state: 'responding',
        session: null,
        onTryAgain: vi.fn(),
        onReviewArticle: vi.fn(),
        onFinishPractice: vi.fn(),
      }

      renderFeedbackView(props, element)
      const html = getHtml()

      expect(html).toContain('← 返回文章')
      expect(html).toContain('复述讲评')
      expect(html).toContain('AI 导师正在点评…')
      expect(html).toContain('停止发音')
      expect(html).toContain('完成练习并保存')
      expect(html).toContain('再练一次（重新录音）')
      expect(html).toContain('查看文章全文')
    })

    it('renders home view in Chinese', () => {
      const { element, getHtml } = createMockContainer()
      const summaries: readonly ArticleSummary[] = [
        {
          id: 'art-1',
          title: 'Article One',
          source: 'https://example.com/art1',
          sourceType: 'url',
          paragraphCount: 5,
          highlightCount: 8,
          updatedAt: Date.now(),
          lastPractice: {
            id: 'pr-1',
            articleId: 'art-1',
            scope: { startParagraph: 0, endParagraph: 4 },
            startedAt: 100,
            finishedAt: 200,
            feedbackTranscript: 'Good job',
            isCompleted: true,
          },
        },
      ]

      const props: HomeViewProps = {
        articles: summaries,
        onSelectArticle: vi.fn(),
        onDeleteArticle: vi.fn(),
        onImportFile: vi.fn(),
        onImportUrl: vi.fn(),
        onPasteText: vi.fn(),
      }

      renderHomeView(props, element)
      const html = getHtml()

      expect(html).toContain('Orbis 英语精读与复述')
      expect(html).toContain('文章与来源')
      expect(html).toContain('5 个段落 · 8 个关键词')
      expect(html).toContain('已复述')
      expect(html).toContain('删除')
    })

    it('renders article view in Chinese with tip banner on first visit', () => {
      setLanguage('zh')
      const { element, getHtml } = createMockContainer()
      const props: ArticleViewProps = {
        article: articleWithHighlights,
        onUpdateArticle: vi.fn(),
        onStartRetelling: vi.fn(),
        onBack: vi.fn(),
      }

      renderArticleView(props, element)
      const html = getHtml()

      expect(html).toContain('← 阅读库')
      expect(html).toContain('开始复述 →')
      expect(html).toContain('练习范围：')
      expect(html).toContain('全部段落 (1–3)')
      expect(html).toContain('自定义范围：')
      expect(html).toContain('💡 提示：使用鼠标选中文中词汇或短语即可添加为复述关键词')
      expect(html).toContain('排版设置')
      expect(html).toContain('id="close-hint-banner"')
    })
  })

  describe('ArticleView display settings and tip banner', () => {
    it('calls onOpenSettings when display settings button is clicked', () => {
      const { element, trigger } = createMockContainer()
      const onOpenSettings = vi.fn()
      const props: ArticleViewProps = {
        article: sampleArticle,
        onOpenSettings,
        onUpdateArticle: vi.fn(),
        onStartRetelling: vi.fn(),
        onBack: vi.fn(),
      }

      renderArticleView(props, element)
      trigger('#reading-display-settings-btn', 'click')
      expect(onOpenSettings).toHaveBeenCalledTimes(1)
    })

    it('shows hint banner on first visit and allows closing it', () => {
      const { element, getHtml, trigger } = createMockContainer()
      const props: ArticleViewProps = {
        article: sampleArticle,
        onUpdateArticle: vi.fn(),
        onStartRetelling: vi.fn(),
        onBack: vi.fn(),
      }

      renderArticleView(props, element)
      expect(getHtml()).toContain('id="reading-hint-banner"')
      expect(getHtml()).toContain('id="close-hint-banner"')

      trigger('#close-hint-banner', 'click')
      expect(localStorage.getItem('orbis:reading:keyword-tip-dismissed')).toBe('true')
    })

    it('does not show hint banner when already dismissed in localStorage', () => {
      localStorage.setItem('orbis:reading:keyword-tip-dismissed', 'true')
      const { element, getHtml } = createMockContainer()
      const props: ArticleViewProps = {
        article: sampleArticle,
        onUpdateArticle: vi.fn(),
        onStartRetelling: vi.fn(),
        onBack: vi.fn(),
      }

      renderArticleView(props, element)
      expect(getHtml()).not.toContain('id="reading-hint-banner"')
    })

    it('does not show hint banner on subsequent visits when already shown', () => {
      localStorage.setItem('orbis:reading:keyword-tip-seen', 'true')
      const { element, getHtml } = createMockContainer()
      const props: ArticleViewProps = {
        article: sampleArticle,
        onUpdateArticle: vi.fn(),
        onStartRetelling: vi.fn(),
        onBack: vi.fn(),
      }

      renderArticleView(props, element)
      expect(getHtml()).not.toContain('id="reading-hint-banner"')
    })
  })
})
