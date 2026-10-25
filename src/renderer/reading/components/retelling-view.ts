import { getKeywordsForScope, type Article, type PracticeScope } from '@shared/reading/article'
import type { ReadingVoiceSession, RetellingState } from '../audio/reading-session'
import { renderMochiAvatarSvg } from './mochi-avatar'
import { t } from '../../i18n'

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function renderKeywordsSummary(article: Article, scope: PracticeScope): string {
  const i18n = t()
  const paragraphKeywords = getKeywordsForScope(article, scope)
  const items = paragraphKeywords.map((item) => {
    const pNum = item.paragraphIndex + 1
    const pLabel = i18n.paragraphItem(pNum)
    if (item.keywords.length === 0) {
      return `<div class="keyword-paragraph-row"><span class="paragraph-badge">${pLabel}</span><span class="no-keywords">${i18n.noKeywordsMarked}</span></div>`
    }
    const tags = item.keywords
      .map((k) => `<span class="keyword-tag">${escapeHtml(k)}</span>`)
      .join(' ')
    return `<div class="keyword-paragraph-row"><span class="paragraph-badge">${pLabel}</span><div class="keyword-tags">${tags}</div></div>`
  })
  return items.join('\n')
}

export interface RetellingViewProps {
  readonly article: Article
  readonly scope: PracticeScope
  readonly session: ReadingVoiceSession | null
  readonly state: RetellingState
  readonly roundIndex?: number
  readonly liveUserTranscript?: string
  readonly onStartRecording: () => void
  readonly onFinishSpeaking: () => void
  readonly onRefreshSession?: () => void
  readonly onCancel: () => void
}

export function renderRetellingView(props: RetellingViewProps, container: HTMLElement): void {
  const i18n = t()
  const isRecording = props.state === 'recording'
  const isEvaluating = props.state === 'evaluating'
  const isOpening = props.state === 'opening' || props.state === 'configuring'
  const isReady = props.state === 'ready'
  const hasError = typeof props.state === 'object' && 'error' in props.state
  const roundNum = props.roundIndex ?? 1

  const startP = props.scope.startParagraph + 1
  const endP = props.scope.endParagraph + 1
  const scopeLabel = i18n.paragraphScope(startP, endP)
  const roundLabel = i18n.roundBadge(roundNum)

  const keywordsHtml = renderKeywordsSummary(props.article, props.scope)

  let statusText = i18n.statusReady
  if (isOpening) statusText = i18n.statusConnecting
  else if (isReady) statusText = i18n.statusClickToBegin
  else if (isRecording) statusText = i18n.statusListening
  else if (isEvaluating) statusText = i18n.statusEvaluating
  else if (hasError) statusText = (props.state as { error: string }).error

  const avatarSvg = renderMochiAvatarSvg(props.state, 52)

  container.innerHTML = `
    <div class="retelling-container">
      <header class="view-header">
        <div class="header-left">
          <button type="button" class="btn btn-ghost" id="retell-back-btn">${i18n.backToArticle}</button>
          <div class="header-title-group">
            <h1 class="view-title">${escapeHtml(props.article.title)}</h1>
            <span class="scope-pill">${scopeLabel}</span>
            <span class="scope-pill round-pill">${roundLabel}</span>
          </div>
        </div>
        <div class="header-right">
          <button type="button" class="btn btn-secondary btn-sm" id="refresh-mochi-header-btn" title="${i18n.refreshMochi}">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            <span>${i18n.refreshMochi}</span>
          </button>
        </div>
      </header>

      <div class="retelling-layout">
        <aside class="keywords-panel">
          <div class="keywords-panel-header">
            <h2 class="panel-heading">${i18n.keywordsHeading}</h2>
            <p class="panel-subtitle">${i18n.keywordsSubtitle}</p>
          </div>
          <div class="keywords-list">
            ${keywordsHtml}
          </div>
        </aside>

        <section class="retelling-stage">
          <div class="stage-card">
            <!-- Mochi Coach Presence Card Header -->
            <div class="mochi-coach-card-badge">
              <div class="mochi-coach-avatar-wrap">
                ${avatarSvg}
              </div>
              <div class="mochi-coach-info">
                <div class="mochi-coach-name-row">
                  <span class="mochi-coach-name">${i18n.mochiCoachName}</span>
                  <span class="mochi-status-pill ${isRecording ? 'recording' : isEvaluating ? 'evaluating' : hasError ? 'error' : isReady ? 'ready' : ''}">
                    ${isRecording ? '🎙️ 倾听复述中' : isEvaluating ? '🧠 对比分析中' : hasError ? '⚠️ 连接异常' : isOpening ? '🔄 连接中' : '🟢 就绪'}
                  </span>
                </div>
                <span class="mochi-coach-tagline">${i18n.mochiCoachTagline}</span>
              </div>
            </div>

            <div class="status-indicator ${isRecording ? 'pulse' : ''} ${hasError ? 'error' : ''}">
              <div class="mic-icon-circle ${isRecording ? 'recording' : ''}">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                  <line x1="12" y1="19" x2="12" y2="23"></line>
                  <line x1="8" y1="23" x2="16" y2="23"></line>
                </svg>
              </div>
              <p class="status-message">${escapeHtml(statusText)}</p>
            </div>

            ${
              isRecording && props.liveUserTranscript
                ? `<div class="live-user-speech-box">
                    <span class="speech-box-label">🎙️ ${i18n.myOutputTitle}</span>
                    <p class="live-speech-text">${escapeHtml(props.liveUserTranscript)}</p>
                  </div>`
                : ''
            }

            <div class="stage-actions">
              ${
                !isRecording
                  ? `<button type="button" class="btn btn-primary btn-large" id="start-speaking-btn" ${isOpening || isEvaluating ? 'disabled' : ''}>
                      ${i18n.startRetellingAction}
                    </button>`
                  : `<button type="button" class="btn btn-success btn-large" id="finish-speaking-btn">
                      ${i18n.finishSpeakingAction}
                    </button>`
              }
              ${
                hasError
                  ? `<button type="button" class="btn btn-secondary" id="retry-mochi-btn">
                      ${i18n.refreshMochi}
                    </button>`
                  : ''
              }
            </div>

            <div class="stage-instructions">
              <p class="instruction-note">
                ${i18n.turnTakingInstruction}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  `

  container.querySelector('#retell-back-btn')?.addEventListener('click', () => {
    props.onCancel()
  })

  container.querySelector('#refresh-mochi-header-btn')?.addEventListener('click', () => {
    props.onRefreshSession?.()
  })

  container.querySelector('#retry-mochi-btn')?.addEventListener('click', () => {
    props.onRefreshSession?.()
  })

  container.querySelector('#start-speaking-btn')?.addEventListener('click', () => {
    props.onStartRecording()
  })

  container.querySelector('#finish-speaking-btn')?.addEventListener('click', () => {
    props.onFinishSpeaking()
  })
}
