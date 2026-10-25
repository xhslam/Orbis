import { createReadingApp } from './app'
import { bindReadingWorkspace } from './workspace'
import { isReadingMode, WORKSPACE_BAR_HEIGHT } from '../../shared/reading-workspace'

const root = document.querySelector<HTMLElement>('#reading-app')
const bar = document.querySelector<HTMLElement>('#workspace-bar')
const api = window.orbisWorkspace
// Keep the native WebContentsView's inset and the DOM bar in logical pixels together.
document.documentElement.style.setProperty('--workspace-bar-height', `${WORKSPACE_BAR_HEIGHT}px`)
if (root) {
  // Mount once for the lifetime of the owner window. In particular, switching to
  // Paper must not stop Retell's microphone/WebRTC session or lose feedback.
  const app = createReadingApp(root)
  void app.mount()
  if (api && bar) {
    if (api.onOpenArticle) {
      const unsubOpen = api.onOpenArticle((articleId) => {
        void app.openArticle(articleId)
      })
      window.addEventListener('pagehide', unsubOpen, { once: true })
    }
    const stop = bindReadingWorkspace(api, (mode) => {
      document.documentElement.dataset.readingMode = mode
      root.hidden = mode !== 'retell'
      bar.querySelectorAll<HTMLButtonElement>('[data-reading-mode]').forEach((button) => {
        button.setAttribute('aria-pressed', String(button.dataset.readingMode === mode))
      })
    }, new URLSearchParams(location.search).get('mode'))
    bar.addEventListener('click', (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-reading-mode]')
      const mode = button?.dataset.readingMode
      if (isReadingMode(mode)) void api.setMode(mode).catch((error: unknown) => {
        console.error('[reading] mode switch failed', error)
      })
    })
    window.addEventListener('pagehide', stop, { once: true })
  }
}
