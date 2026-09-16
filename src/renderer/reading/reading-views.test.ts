import { describe, expect, it, vi } from 'vitest'
import {
  renderKeywordsSummary,
  renderRetellingView,
  type RetellingViewProps,
} from './components/retelling-view'
import { renderHomeView, type HomeViewProps } from './components/home-view'
import { renderFeedbackView, type FeedbackViewProps } from './components/feedback-view'
import {
  createArticleFromText,
  addHighlight,
  type Article,
  type ArticleSummary,
  type PracticeScope,
} from '../../shared/reading/article'

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
      }
    },
    querySelectorAll: () => [],
  }

  return {
    element: element as unknown as HTMLElement,
    getHtml: () => html,
  }
}

describe('Reading & Retelling UI Components', () => {
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
  })
})
