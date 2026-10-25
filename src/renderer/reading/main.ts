import { createReadingApp } from './app'

const root = document.querySelector<HTMLElement>('#reading-app')
if (root) {
  // Mounted once in the main window. Navigation only hides this document.
  const app = createReadingApp(root)
  void app.mount()
  const stop = window.orbisWorkspace?.onOpenArticle?.((articleId) => {
    void app.openArticle(articleId)
  })
  if (stop) window.addEventListener('pagehide', stop, { once: true })
}
