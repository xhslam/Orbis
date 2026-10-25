import {
  createArticleFromText,
  type Article,
  type ArticleSummary,
  type PracticeRecord,
  type PracticeRound,
  type PracticeScope,
} from '@shared/reading/article'
import { buildRetellingSystemPrompt } from '@shared/reading/prompt'
import {
  openReadingVoiceSession,
  type ReadingVoiceSession,
  type RetellingState,
} from './audio/reading-session'
import { renderArticleView } from './components/article-view'
import { renderFeedbackView } from './components/feedback-view'
import { renderHomeView } from './components/home-view'
import { renderRetellingView } from './components/retelling-view'
import { onLanguageChange, t } from '../i18n'
import {
  applyReadingDisplaySettings,
  getReadingDisplaySettings,
  onReadingDisplaySettingsChange,
} from './display-settings'

export type ViewState = 'home' | 'article' | 'retelling' | 'feedback'

export interface ReadingApp {
  mount(): Promise<void>
  refresh(): Promise<void>
  cleanup(): void
}

export function createReadingApp(root: HTMLElement): ReadingApp {
  const api = window.orbisReading
  const speaker = new Audio()
  speaker.autoplay = true

  let currentView: ViewState = 'home'
  let articles: readonly ArticleSummary[] = []
  let currentArticle: Article | null = null
  let currentScope: PracticeScope = { startParagraph: 0, endParagraph: 0 }
  let session: ReadingVoiceSession | null = null
  let sessionState: RetellingState = 'idle'
  let liveTranscript = '' // Mochi's feedback transcript
  let currentUserTranscript = '' // User's spoken retelling transcript
  let practiceRecord: PracticeRecord | null = null
  let rounds: PracticeRound[] = []
  let currentRoundIndex = 1
  let selectedRoundIndex = 1
  let isAskingQuestion = false

  const unsubLang = onLanguageChange(() => {
    render()
  })

  // Apply display settings to both root and document element
  applyReadingDisplaySettings(getReadingDisplaySettings(), root)
  const unsubDisplay = onReadingDisplaySettingsChange((settings) => {
    applyReadingDisplaySettings(settings, root)
    applyReadingDisplaySettings(settings)
    render()
  })

  function cleanupSession(): void {
    if (session) {
      session.stopPlayback()
      session.close()
      session = null
    }
    speaker.srcObject = null
    sessionState = 'idle'
  }

  async function startRetellingSession(preserveRounds = true): Promise<void> {
    cleanupSession()
    if (!currentArticle) return

    if (!practiceRecord || !preserveRounds) {
      practiceRecord = {
        id: `pr-${Date.now()}`,
        articleId: currentArticle.id,
        scope: currentScope,
        startedAt: Date.now(),
        finishedAt: null,
        feedbackTranscript: null,
        userTranscript: null,
        rounds: [],
        isCompleted: false,
      }
    }

    const prompt = buildRetellingSystemPrompt(currentArticle, currentScope, {
      roundIndex: currentRoundIndex,
      previousRounds: rounds,
      mode: isAskingQuestion ? 'interactive_qa' : 'retelling',
    })

    try {
      session = await openReadingVoiceSession(
        {
          onStateChange: (state) => {
            sessionState = state
            render()
          },
          onTranscriptDelta: (delta) => {
            liveTranscript += delta
            const transcriptEl = document.querySelector('#transcript-content')
            if (transcriptEl) {
              transcriptEl.innerHTML = liveTranscript
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/\n/g, '<br />')
            }
          },
          onTranscriptDone: (full) => {
            liveTranscript = full
            // If in retelling feedback mode and speech settled, record into current round
            if (!isAskingQuestion && currentArticle) {
              const roundData: PracticeRound = {
                roundIndex: currentRoundIndex,
                userTranscript: currentUserTranscript.trim() || t().myOutputEmpty,
                coachFeedback: full.trim() || t().feedbackComplete,
                timestamp: Date.now(),
              }
              const existingIdx = rounds.findIndex((r) => r.roundIndex === currentRoundIndex)
              if (existingIdx >= 0) {
                rounds[existingIdx] = roundData
              } else {
                rounds.push(roundData)
              }
            }
            render()
          },
          onUserTranscript: (userText) => {
            currentUserTranscript = userText
            const userEl = document.querySelector('#user-transcript-content')
            if (userEl) {
              userEl.innerHTML = userText
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/\n/g, '<br />')
            }
            const liveSpeechEl = document.querySelector('.live-speech-text')
            if (liveSpeechEl) {
              liveSpeechEl.textContent = userText
            }
          },
          onAudioStream: (stream) => {
            speaker.srcObject = stream
            speaker.play().catch(() => {})
          },
        },
        prompt,
      )
    } catch (err) {
      sessionState = { error: err instanceof Error ? err.message : String(err) }
      render()
    }
  }

  async function refreshMochiSession(): Promise<void> {
    sessionState = 'opening'
    render()
    await startRetellingSession(true)
  }

  function render(): void {
    if (currentView === 'home') {
      renderHomeView(
        {
          articles,
          onSelectArticle: (id) => {
            void (async () => {
              if (!api) return
              const art = await api.getArticle(id)
              if (art) {
                currentArticle = art
                currentScope = {
                  startParagraph: 0,
                  endParagraph: Math.max(0, art.paragraphs.length - 1),
                }
                currentView = 'article'
                render()
              }
            })()
          },
          onDeleteArticle: (id) => {
            void (async () => {
              if (!api) return
              await api.deleteArticle(id)
              articles = await api.listArticles()
              render()
            })()
          },
          onImportFile: () => {
            void (async () => {
              if (!api) return
              try {
                const art = await api.importFile()
                if (art) {
                  currentArticle = art
                  currentScope = {
                    startParagraph: 0,
                    endParagraph: Math.max(0, art.paragraphs.length - 1),
                  }
                  articles = await api.listArticles()
                  currentView = 'article'
                  render()
                }
              } catch (err) {
                alert(t().failedToImportFile(err instanceof Error ? err.message : String(err)))
              }
            })()
          },
          onImportUrl: (url) => {
            void (async () => {
              if (!api) return
              try {
                const art = await api.importUrl(url)
                if (art) {
                  currentArticle = art
                  currentScope = {
                    startParagraph: 0,
                    endParagraph: Math.max(0, art.paragraphs.length - 1),
                  }
                  articles = await api.listArticles()
                  currentView = 'article'
                  render()
                }
              } catch (err) {
                alert(t().failedToImportUrl(err instanceof Error ? err.message : String(err)))
              }
            })()
          },
          onPasteText: (title, text) => {
            void (async () => {
              if (!api) return
              try {
                const art = createArticleFromText({
                  title,
                  source: t().manualSource,
                  sourceType: 'manual',
                  text,
                })
                await api.saveArticle(art)
                currentArticle = art
                currentScope = {
                  startParagraph: 0,
                  endParagraph: Math.max(0, art.paragraphs.length - 1),
                }
                articles = await api.listArticles()
                currentView = 'article'
                render()
              } catch (err) {
                alert(t().failedToSaveText(err instanceof Error ? err.message : String(err)))
              }
            })()
          },
        },
        root,
      )
    } else if (currentView === 'article') {
      if (!currentArticle) {
        currentView = 'home'
        render()
        return
      }
      renderArticleView(
        {
          article: currentArticle,
          scope: currentScope,
          onScopeChange: (scope) => {
            currentScope = scope
          },
          onUpdateArticle: (updated) => {
            void (async () => {
              if (!api) return
              currentArticle = updated
              await api.saveArticle(updated)
              articles = await api.listArticles()
              render()
            })()
          },
          onStartRetelling: (scope) => {
            void (async () => {
              currentScope = scope
              rounds = []
              currentRoundIndex = 1
              selectedRoundIndex = 1
              currentUserTranscript = ''
              liveTranscript = ''
              isAskingQuestion = false
              currentView = 'retelling'
              sessionState = 'opening'
              render()
              await startRetellingSession(false)
            })()
          },
          onBack: () => {
            void (async () => {
              if (api) {
                articles = await api.listArticles()
              }
              currentView = 'home'
              render()
            })()
          },
        },
        root,
      )
    } else if (currentView === 'retelling') {
      if (!currentArticle) {
        currentView = 'home'
        render()
        return
      }
      renderRetellingView(
        {
          article: currentArticle,
          scope: currentScope,
          session,
          state: sessionState,
          roundIndex: currentRoundIndex,
          liveUserTranscript: currentUserTranscript,
          onStartRecording: () => {
            if (!session || (typeof sessionState === 'object' && 'error' in sessionState)) {
              void (async () => {
                sessionState = 'opening'
                render()
                await startRetellingSession(true)
              })()
              return
            }
            session.startRecording()
          },
          onFinishSpeaking: () => {
            if (!session || !currentArticle) return
            speaker.play().catch(() => {})
            const prompt = buildRetellingSystemPrompt(currentArticle, currentScope, {
              roundIndex: currentRoundIndex,
              previousRounds: rounds,
              mode: 'retelling',
            })
            const submitted = session.finishSpeaking(prompt)
            if (submitted) {
              currentView = 'feedback'
              render()
            }
          },
          onRefreshSession: () => {
            void refreshMochiSession()
          },
          onCancel: () => {
            cleanupSession()
            currentView = 'article'
            render()
          },
        },
        root,
      )
    } else if (currentView === 'feedback') {
      if (!currentArticle) {
        currentView = 'home'
        render()
        return
      }
      renderFeedbackView(
        {
          article: currentArticle,
          scope: currentScope,
          transcript: liveTranscript,
          coachTranscript: liveTranscript,
          userTranscript: currentUserTranscript,
          state: sessionState,
          session,
          currentRoundIndex,
          rounds,
          selectedRoundIndex,
          isAskingQuestion,
          onSelectRound: (roundNum) => {
            selectedRoundIndex = roundNum
            render()
          },
          onStartNextRound: () => {
            // Save current round record if not already saved
            if (liveTranscript || currentUserTranscript) {
              const roundData: PracticeRound = {
                roundIndex: currentRoundIndex,
                userTranscript: currentUserTranscript.trim() || t().myOutputEmpty,
                coachFeedback: liveTranscript.trim() || t().feedbackComplete,
                timestamp: Date.now(),
              }
              const existingIdx = rounds.findIndex((r) => r.roundIndex === currentRoundIndex)
              if (existingIdx >= 0) {
                rounds[existingIdx] = roundData
              } else {
                rounds.push(roundData)
              }
            }
            currentRoundIndex += 1
            selectedRoundIndex = currentRoundIndex
            currentUserTranscript = ''
            liveTranscript = ''
            isAskingQuestion = false
            currentView = 'retelling'
            sessionState = 'ready'
            render()

            const nextPrompt = buildRetellingSystemPrompt(currentArticle!, currentScope, {
              roundIndex: currentRoundIndex,
              previousRounds: rounds,
              mode: 'retelling',
            })
            session?.updateInstructions?.(nextPrompt)
          },
          onAskQuestionStart: () => {
            if (!session) {
              void refreshMochiSession()
              return
            }
            isAskingQuestion = true
            liveTranscript = ''
            session.startRecording()
            render()
          },
          onAskQuestionFinish: () => {
            if (!session || !currentArticle) return
            isAskingQuestion = false
            speaker.play().catch(() => {})
            const qaPrompt = buildRetellingSystemPrompt(currentArticle, currentScope, {
              roundIndex: currentRoundIndex,
              previousRounds: rounds,
              mode: 'interactive_qa',
            })
            session.finishSpeaking(qaPrompt)
            render()
          },
          onRefreshSession: () => {
            void refreshMochiSession()
          },
          onTryAgain: () => {
            currentUserTranscript = ''
            liveTranscript = ''
            isAskingQuestion = false
            currentView = 'retelling'
            render()
            if (!session || (typeof sessionState === 'object' && 'error' in sessionState)) {
              void refreshMochiSession()
            }
          },
          onReviewArticle: () => {
            cleanupSession()
            currentView = 'article'
            render()
          },
          onFinishPractice: () => {
            void (async () => {
              if (currentArticle && api) {
                const finishedAt = Date.now()
                if (liveTranscript || currentUserTranscript) {
                  const roundData: PracticeRound = {
                    roundIndex: currentRoundIndex,
                    userTranscript: currentUserTranscript.trim() || t().myOutputEmpty,
                    coachFeedback: liveTranscript.trim() || t().feedbackComplete,
                    timestamp: Date.now(),
                  }
                  const existingIdx = rounds.findIndex((r) => r.roundIndex === currentRoundIndex)
                  if (existingIdx >= 0) {
                    rounds[existingIdx] = roundData
                  } else {
                    rounds.push(roundData)
                  }
                }

                const record: PracticeRecord = {
                  id: `pr-${finishedAt}-${Math.random().toString(36).slice(2, 6)}`,
                  articleId: currentArticle.id,
                  scope: currentScope,
                  startedAt: practiceRecord?.startedAt ?? finishedAt,
                  finishedAt,
                  feedbackTranscript:
                    liveTranscript.length > 0
                      ? liveTranscript
                      : (rounds[rounds.length - 1]?.coachFeedback ?? null),
                  userTranscript:
                    currentUserTranscript.length > 0
                      ? currentUserTranscript
                      : (rounds[rounds.length - 1]?.userTranscript ?? null),
                  rounds: [...rounds],
                  isCompleted: true,
                }
                await api.savePractice(record)
                currentArticle = {
                  ...currentArticle,
                  lastPractice: record,
                  updatedAt: Date.now(),
                }
                articles = await api.listArticles()
              }
              cleanupSession()
              currentView = 'article'
              render()
            })()
          },
        },
        root,
      )
    }
  }

  window.addEventListener('beforeunload', () => {
    cleanupSession()
  })

  async function mount(): Promise<void> {
    if (!api) {
      root.innerHTML = `<div class="p-8 text-center text-red-500">Orbis Reading bridge is not available in this window.</div>`
      return
    }
    articles = await api.listArticles()
    render()
  }

  async function refresh(): Promise<void> {
    if (!api) return
    try {
      articles = await api.listArticles()
      render()
    } catch {
      // Ignore background refresh failure
    }
  }

  function cleanup(): void {
    unsubLang()
    unsubDisplay()
    cleanupSession()
  }

  return {
    mount,
    refresh,
    cleanup,
  }
}
