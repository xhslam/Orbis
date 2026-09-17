import { createReadingApp } from './app'

const root = document.querySelector('#reading-app')
if (root instanceof HTMLElement) {
  const app = createReadingApp(root)
  void app.mount()
}
