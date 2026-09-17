import type { Article, PracticeScope } from '@shared/reading/article'
import type { ReadingVoiceSession, RetellingState } from '../audio/reading-session'
import { t } from '../../i18n'

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
  const i18n = t()
  const isError = typeof props.state === 'object' && 'error' in props.state
  const errorMessage = isError ? props.state.error : null
  const isResponding = !isError && (props.state === 'responding' || props.state === 'evaluating')
  const startP = props.scope.startParagraph + 1
  const endP = props.scope.endParagraph + 1
  const scopeLabel = i18n.paragraphScope(startP, endP)

  container.innerHTML = `
    <div class="feedback-container">
      <header class="view-header">
        <div class="header-left">
          <button type="button" class="btn btn-ghost" id="feedback-back-btn">${i18n.backToArticle}</button>
          <div class="header-title-group">
            <h1 class="view-title">${i18n.feedbackTitle}</h1>
            <span class="scope-pill">${scopeLabel}</span>
          </div>
        </div>

        <div class="header-right">
          ${
            isResponding
              ? `<button type="button" class="btn btn-secondary btn-sm" id="stop-voice-btn">
                  ${i18n.stopVoice}
                </button>`
              : ''
          }
          <button type="button" class="btn btn-primary" id="finish-practice-btn">
            ${i18n.finishPractice}
          </button>
        </div>
      </header>

      <main class="feedback-main">
        <div class="feedback-card">
          <div class="feedback-card-header">
            <div class="feedback-status-badge ${isError ? 'error' : isResponding ? 'speaking' : 'complete'}">
              ${isError ? i18n.feedbackError : isResponding ? i18n.coachSpeaking : i18n.feedbackComplete}
            </div>
            <h2 class="card-title">${escapeHtml(props.article.title)}</h2>
          </div>

          <div class="feedback-body">
            ${
              isError
                ? `<div class="evaluating-placeholder error-box">
                    <p style="color: #b91c1c; font-weight: 500; margin-bottom: 8px;">${escapeHtml(errorMessage ?? '服务异常')}</p>
                    <p style="color: #6b7280; font-size: 0.9em;">${i18n.feedbackErrorTip}</p>
                  </div>`
                : props.transcript.length === 0 && isResponding
                ? `<div class="evaluating-placeholder">
                    <div class="spinner"></div>
                    <p>${i18n.evaluatingPlaceholder}</p>
                  </div>`
                : `<div class="transcript-prose" id="transcript-content">
                    ${escapeHtml(props.transcript).replace(/\n/g, '<br />')}
                  </div>`
            }
          </div>

          <div class="feedback-actions">
            <button type="button" class="btn btn-secondary" id="try-again-btn">
              ${i18n.tryAgain}
            </button>
            <button type="button" class="btn btn-ghost" id="review-article-btn">
              ${i18n.reviewArticle}
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
