import {
  createArticleFromText,
  type Article,
  type ArticleSummary,
  type PracticeRecord,
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
  let liveTranscript = ''
  let practiceRecord: PracticeRecord | null = null

  const unsubLang = onLanguageChange(() => {
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

  async function startRetellingSession(): Promise<void> {
    cleanupSession()
    if (!currentArticle) return

    practiceRecord = {
      id: `pr-${Date.now()}`,
      articleId: currentArticle.id,
      scope: currentScope,
      startedAt: Date.now(),
      finishedAt: null,
      feedbackTranscript: null,
      isCompleted: false,
    }

    const prompt = buildRetellingSystemPrompt(currentArticle, currentScope)

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
            render()
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
              currentView = 'retelling'
              sessionState = 'opening'
              liveTranscript = ''
              render()
              await startRetellingSession()
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
          onStartRecording: () => {
            if (!session || (typeof sessionState === 'object' && 'error' in sessionState)) {
              void (async () => {
                sessionState = 'opening'
                render()
                await startRetellingSession()
              })()
              return
            }
            session.startRecording()
          },
          onFinishSpeaking: () => {
            if (!session || !currentArticle) return
            const prompt = buildRetellingSystemPrompt(currentArticle, currentScope)
            const submitted = session.finishSpeaking(prompt)
            if (submitted) {
              currentView = 'feedback'
              render()
            }
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
          state: sessionState,
          session,
          onTryAgain: () => {
            cleanupSession()
            currentView = 'retelling'
            sessionState = 'opening'
            liveTranscript = ''
            render()
            void startRetellingSession()
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
                const record: PracticeRecord = {
                  id: `pr-${finishedAt}-${Math.random().toString(36).slice(2, 6)}`,
                  articleId: currentArticle.id,
                  scope: currentScope,
                  startedAt: practiceRecord?.startedAt ?? finishedAt,
                  finishedAt,
                  feedbackTranscript: liveTranscript.length > 0 ? liveTranscript : null,
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
    cleanupSession()
  }

  return {
    mount,
    refresh,
    cleanup,
  }
}
