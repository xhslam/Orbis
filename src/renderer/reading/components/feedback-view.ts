import type { Article, PracticeRound, PracticeScope } from '@shared/reading/article'
import { getKeywordsForScope } from '@shared/reading/article'
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
  readonly transcript?: string
  readonly coachTranscript?: string
  readonly userTranscript?: string
  readonly state: RetellingState
  readonly session: ReadingVoiceSession | null
  readonly currentRoundIndex?: number
  readonly rounds?: readonly PracticeRound[]
  readonly selectedRoundIndex?: number
  readonly isAskingQuestion?: boolean
  readonly cardSaveStatus?: {
    readonly status: 'idle' | 'saving' | 'saved' | 'error'
    readonly cardId?: string | undefined
    readonly error?: string | undefined
  } | undefined
  readonly onSaveToPaperCard?: () => void | Promise<void>
  readonly onSwitchToPaper?: () => void
  readonly onTryAgain: () => void
  readonly onReviewArticle: () => void
  readonly onFinishPractice: () => void
  readonly onStartNextRound?: () => void
  readonly onAskQuestionStart?: () => void
  readonly onAskQuestionFinish?: () => void
  readonly onRefreshSession?: () => void
  readonly onSelectRound?: (roundIndex: number) => void
}

export function renderFeedbackView(props: FeedbackViewProps, container: HTMLElement): void {
  const i18n = t()
  const isError = typeof props.state === 'object' && 'error' in props.state
  const errorMessage = isError ? props.state.error : null
  const isResponding = !isError && (props.state === 'responding' || props.state === 'evaluating')
  const isAsking = props.isAskingQuestion === true

  const startP = props.scope.startParagraph + 1
  const endP = props.scope.endParagraph + 1
  const scopeLabel = i18n.paragraphScope(startP, endP)

  const currentRound = props.currentRoundIndex ?? 1
  const selectedRound = props.selectedRoundIndex ?? currentRound
  const roundsList = props.rounds ?? []

  // If viewing a previous recorded round, retrieve its transcripts
  let displayCoachTranscript = props.coachTranscript ?? props.transcript ?? ''
  let displayUserTranscript = props.userTranscript ?? ''

  if (selectedRound !== currentRound) {
    const historicalRound = roundsList.find((r) => r.roundIndex === selectedRound)
    if (historicalRound) {
      displayCoachTranscript = historicalRound.coachFeedback
      displayUserTranscript = historicalRound.userTranscript
    }
  }

  // Original text content for scoped paragraphs
  const scopedParagraphs = props.article.paragraphs.slice(
    props.scope.startParagraph,
    props.scope.endParagraph + 1,
  )
  const paragraphKeywords = getKeywordsForScope(props.article, props.scope)

  const originalParagraphsHtml = scopedParagraphs
    .map((p) => {
      const pKeywords = paragraphKeywords.find((k) => k.paragraphIndex === p.index)?.keywords ?? []
      const tagsHtml = pKeywords
        .map((k) => `<span class="keyword-tag-mini">${escapeHtml(k)}</span>`)
        .join(' ')
      return `
        <div class="feedback-paragraph-item">
          <div class="paragraph-item-header">
            <span class="paragraph-badge">${i18n.paragraphItem(p.index + 1)}</span>
            <div class="item-keywords">${tagsHtml}</div>
          </div>
          <p class="paragraph-text">${escapeHtml(p.text)}</p>
        </div>
      `
    })
    .join('\n')

  // Round tabs bar if there are multiple rounds
  const totalRoundsCount = Math.max(currentRound, roundsList.length)
  let roundTabsHtml = ''
  if (totalRoundsCount > 1) {
    const tabs = []
    for (let i = 1; i <= totalRoundsCount; i++) {
      const isActive = i === selectedRound
      tabs.push(`
        <button type="button" class="round-tab-btn ${isActive ? 'active' : ''}" data-round="${i}">
          ${i18n.roundTabLabel(i)}
        </button>
      `)
    }
    roundTabsHtml = `<div class="round-tabs-bar">${tabs.join('')}</div>`
  }

  container.innerHTML = `
    <div class="feedback-container">
      <header class="view-header">
        <div class="header-left">
          <button type="button" class="btn btn-ghost" id="feedback-back-btn">${i18n.backToArticle}</button>
          <div class="header-title-group">
            <div class="header-title-row">
              <h1 class="view-title">${i18n.feedbackTitle}</h1>
              <span class="scope-pill">${scopeLabel}</span>
              <span class="scope-pill round-pill">${i18n.roundBadge(selectedRound)}</span>
              <span class="feedback-status-badge ${isError ? 'error' : isResponding ? 'speaking' : isAsking ? 'asking' : 'complete'}">
                ${isError ? i18n.feedbackError : isResponding ? i18n.coachSpeaking : isAsking ? i18n.speakingToMochiStatus : i18n.feedbackComplete}
              </span>
            </div>
          </div>
        </div>

        <div class="header-right">
          <button type="button" class="btn btn-secondary btn-sm" id="refresh-orbit-feedback-btn" title="${i18n.refreshMochi}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            <span>${i18n.refreshMochi}</span>
          </button>
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
        <div class="feedback-wrapper">
          ${roundTabsHtml}

          <!-- Three-Panel Side-by-Side / Comparison Section -->
          <div class="retelling-comparison-grid">
            <!-- Panel 1: Original Material & Cues -->
            <section class="comparison-card original-material-card">
              <div class="comparison-card-header">
                <div class="header-icon-label">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                  </svg>
                  <h3 class="comparison-card-title">${i18n.originalMaterialTitle}</h3>
                </div>
                <button type="button" class="btn btn-ghost btn-sm" id="toggle-original-text-btn">
                  ${i18n.hideOriginalText}
                </button>
              </div>
              <div class="comparison-card-body original-text-body" id="original-text-content">
                ${originalParagraphsHtml}
              </div>
            </section>

            <!-- Panel 2: User's Spoken Output -->
            <section class="comparison-card user-output-card">
              <div class="comparison-card-header">
                <div class="header-icon-label">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                    <line x1="12" y1="19" x2="12" y2="23"></line>
                    <line x1="8" y1="23" x2="16" y2="23"></line>
                  </svg>
                  <h3 class="comparison-card-title">${i18n.myOutputTitle}</h3>
                </div>
                <span class="output-round-tag">${i18n.roundBadge(selectedRound)}</span>
              </div>
              <div class="comparison-card-body user-output-body">
                <div class="user-transcript-prose" id="user-transcript-content">
                  ${
                    displayUserTranscript.length > 0
                      ? escapeHtml(displayUserTranscript).replace(/\n/g, '<br />')
                      : `<span class="empty-transcript-placeholder">${i18n.myOutputEmpty}</span>`
                  }
                </div>
              </div>
            </section>

            <!-- Panel 3: Mochi's Coaching & Feedback -->
            <section class="comparison-card coach-feedback-card">
              <div class="comparison-card-header">
                <div class="header-icon-label">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                  <h3 class="comparison-card-title">${i18n.coachSuggestionsTitle}</h3>
                </div>
                <span class="card-title-article">${escapeHtml(props.article.title)}</span>
              </div>
              <div class="comparison-card-body coach-feedback-body">
                ${
                  isError
                    ? `<div class="evaluating-placeholder error-box">
                        <p style="color: #b91c1c; font-weight: 500; margin-bottom: 8px;">${escapeHtml(errorMessage ?? '服务异常')}</p>
                        <p style="color: #6b7280; font-size: 0.9em;">${i18n.feedbackErrorTip}</p>
                      </div>`
                    : displayCoachTranscript.length === 0 && isResponding
                      ? `<div class="evaluating-placeholder">
                          <div class="spinner"></div>
                          <p>${i18n.evaluatingPlaceholder}</p>
                        </div>`
                      : `<div class="transcript-prose" id="transcript-content">
                          ${escapeHtml(displayCoachTranscript).replace(/\n/g, '<br />')}
                        </div>`
                }
              </div>
            </section>
          </div>

          ${
            props.cardSaveStatus?.status === 'saved'
              ? `<div class="paper-card-saved-banner" id="paper-card-saved-banner">
                  <span class="paper-card-saved-text">✓ ${i18n.savedToPaperCard}</span>
                  ${props.onSwitchToPaper ? `<button type="button" class="btn btn-link btn-sm" id="view-in-paper-btn">${i18n.viewInPaper}</button>` : ''}
                </div>`
              : props.cardSaveStatus?.status === 'error'
                ? `<div class="paper-card-error-banner">
                    <span>${escapeHtml(props.cardSaveStatus.error ?? 'Save failed')}</span>
                  </div>`
                : ''
          }

          <!-- Interactive Action Controls -->
          <div class="feedback-actions-panel">
            <div class="actions-left">
              <button type="button" class="btn btn-ghost" id="review-article-btn">
                ${i18n.reviewArticle}
              </button>
              <button type="button" class="btn btn-secondary" id="try-again-btn">
                ${i18n.tryAgain}
              </button>
              ${
                props.onSaveToPaperCard
                  ? `<button type="button" class="btn btn-secondary" id="save-to-paper-card-btn" ${props.cardSaveStatus?.status === 'saving' ? 'disabled' : ''}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                      </svg>
                      <span>${props.cardSaveStatus?.status === 'saving' ? i18n.savingToPaperCard : i18n.saveToPaperCard}</span>
                    </button>`
                  : ''
              }
            </div>

            <div class="actions-right">
              ${
                !isAsking
                  ? `<button type="button" class="btn btn-secondary" id="ask-orbit-btn" title="${i18n.askingMochiTip}">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                      </svg>
                      <span>${i18n.askMochiBtn}</span>
                    </button>`
                  : `<button type="button" class="btn btn-success" id="finish-asking-btn">
                      <span>${i18n.finishAskingBtn}</span>
                    </button>`
              }
              <button type="button" class="btn btn-primary btn-next-round" id="start-next-round-btn">
                <span>${i18n.startNextRoundAction(currentRound + 1)}</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  `

  container.querySelector('#feedback-back-btn')?.addEventListener('click', () => {
    props.onReviewArticle()
  })

  container.querySelector('#refresh-orbit-feedback-btn')?.addEventListener('click', () => {
    props.onRefreshSession?.()
  })
  container.querySelector('#refresh-mochi-feedback-btn')?.addEventListener('click', () => {
    props.onRefreshSession?.()
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

  container.querySelector('#save-to-paper-card-btn')?.addEventListener('click', () => {
    props.onSaveToPaperCard?.()
  })

  container.querySelector('#view-in-paper-btn')?.addEventListener('click', () => {
    props.onSwitchToPaper?.()
  })

  container.querySelector('#finish-practice-btn')?.addEventListener('click', () => {
    props.onFinishPractice()
  })

  container.querySelector('#start-next-round-btn')?.addEventListener('click', () => {
    if (props.onStartNextRound) {
      props.onStartNextRound()
    } else {
      props.onTryAgain()
    }
  })

  container.querySelector('#ask-orbit-btn')?.addEventListener('click', () => {
    props.onAskQuestionStart?.()
  })
  container.querySelector('#ask-mochi-btn')?.addEventListener('click', () => {
    props.onAskQuestionStart?.()
  })

  container.querySelector('#finish-asking-btn')?.addEventListener('click', () => {
    props.onAskQuestionFinish?.()
  })

  // Round tab clicks
  container.querySelectorAll('.round-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const r = parseInt(btn.getAttribute('data-round') ?? '1', 10)
      props.onSelectRound?.(r)
    })
  })

  // Toggle original text visibility
  const toggleBtn = container.querySelector('#toggle-original-text-btn')
  const originalContent = container.querySelector('#original-text-content')
  if (toggleBtn && originalContent) {
    toggleBtn.addEventListener('click', () => {
      const isHidden = originalContent.classList.toggle('collapsed')
      toggleBtn.textContent = isHidden ? i18n.showOriginalText : i18n.hideOriginalText
    })
  }
}
