import type { Article, PracticeScope } from '@shared/reading/article'
import type { ReadingVoiceSession, RetellingState } from '../audio/reading-session'

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export interface FeedbackViewProps {
  readonly article: Article
  readonly scope: PracticeScope
  readonly transcript: string
  readonly state: RetellingState
  readonly session: ReadingVoiceSession | null
  readonly onTryAgain: () => void
  readonly onReviewArticle: () => void
  readonly onFinishPractice: () => void
}

export function renderFeedbackView(props: FeedbackViewProps, container: HTMLElement): void {
  const isResponding = props.state === 'responding' || props.state === 'evaluating'
  const startP = props.scope.startParagraph + 1
  const endP = props.scope.endParagraph + 1
  const scopeLabel = startP === endP ? `Paragraph ${startP}` : `Paragraphs ${startP}–${endP}`

  container.innerHTML = `
    <div class="feedback-container">
      <header class="view-header">
        <div class="header-left">
          <button type="button" class="btn btn-ghost" id="feedback-back-btn">← Back to Article</button>
          <div class="header-title-group">
            <h1 class="view-title">Retelling Feedback</h1>
            <span class="scope-pill">${scopeLabel}</span>
          </div>
        </div>

        <div class="header-right">
          ${
            isResponding
              ? `<button type="button" class="btn btn-secondary btn-sm" id="stop-voice-btn">
                  Stop Voice
                </button>`
              : ''
          }
          <button type="button" class="btn btn-primary" id="finish-practice-btn">
            Finish Practice & Save
          </button>
        </div>
      </header>

      <main class="feedback-main">
        <div class="feedback-card">
          <div class="feedback-card-header">
            <div class="feedback-status-badge ${isResponding ? 'speaking' : 'complete'}">
              ${isResponding ? 'AI Coach is Speaking…' : 'Feedback Complete'}
            </div>
            <h2 class="card-title">${escapeHtml(props.article.title)}</h2>
          </div>

          <div class="feedback-body">
            ${
              props.transcript.length === 0 && isResponding
                ? `<div class="evaluating-placeholder">
                    <div class="spinner"></div>
                    <p>Evaluating your retelling against article facts…</p>
                  </div>`
                : `<div class="transcript-prose" id="transcript-content">
                    ${escapeHtml(props.transcript).replace(/\n/g, '<br />')}
                  </div>`
            }
          </div>

          <div class="feedback-actions">
            <button type="button" class="btn btn-secondary" id="try-again-btn">
              Try Again (Re-record)
            </button>
            <button type="button" class="btn btn-ghost" id="review-article-btn">
              Review Article Full Text
            </button>
          </div>
        </div>
      </main>
    </div>
  `

  container.querySelector('#feedback-back-btn')?.addEventListener('click', () => {
    props.onReviewArticle()
  })

  container.querySelector('#stop-voice-btn')?.addEventListener('click', () => {
    props.session?.stopPlayback()
  })

  container.querySelector('#try-again-btn')?.addEventListener('click', () => {
    props.onTryAgain()
  })

  container.querySelector('#review-article-btn')?.addEventListener('click', () => {
    props.onReviewArticle()
  })

  container.querySelector('#finish-practice-btn')?.addEventListener('click', () => {
    props.onFinishPractice()
  })
}
