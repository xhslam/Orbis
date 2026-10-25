import { Component, StrictMode, type ErrorInfo, type ReactNode } from 'react'
import { createPaperClosePreparation } from './close'
import { flushBeforeClose } from '../../kernel/core/beforeClose'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/instrument-sans'
import '@fontsource-variable/crimson-pro'
import '@fontsource-variable/literata'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import {
  createKernelServices,
  finishPendingRemovals,
  composeCapabilities,
  kernelApi,
  buildServices,
  serviceClients,
} from '../../kernel'
import { createCard } from '../../kernel/core/cardStore'
import {
  App,
  openAppStorage,
  libraryFs,
  loadShelf,
  settleBeforeDrain,
  tauriSizePort,
} from '../../kernel/ui'

class PaperErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[paper] renderer failed; close will still flush storage', error, info)
  }
  override render() {
    return this.state.failed
      ? <div role="alert">Paper encountered an error. Close and reopen the reading window to recover. Saved books and notes are retained.</div>
      : this.props.children
  }
}

/** The sole Paper composition root, hosted in the reading window's native view. */
async function main(root: HTMLElement): Promise<void> {
  if (!window.orbisPaper) {
    root.textContent =
      'Paper requires the Orbis reading workspace host.'
    return
  }
  // No store (including its migrations) may be constructed before main grants
  // the document-bound lease. History/Retell/competing views cannot get it.
  await window.orbisPaper.session.acquire()
  const { storage, notice } = await openAppStorage()
  const fs = libraryFs
  await finishPendingRemovals(fs)
  let shelfUnread = false
  const initialBooks = await loadShelf(fs).then(
    (shelf) => shelf.books,
    () => {
      shelfUnread = true
      return []
    },
  )
  const services = createKernelServices({ fs, storage, initialBooks, shelfRead: !shelfUnread })
  services.bindSizePort(tauriSizePort)
  const lifetime = new AbortController()
  const composition = await composeCapabilities([], kernelApi(services), lifetime.signal, {
    services: buildServices({ services }),
    clients: serviceClients(),
  })
  const prepare = createPaperClosePreparation({
    flush: flushBeforeClose,
    settle: settleBeforeDrain,
    drain: () => services.drain(),
    flushStore: async () => {
      if (storage && 'flush' in storage) await storage.flush()
    },
    // A successful preparation can still be followed by another window
    // cancelling app.quit. Tear down only when this document actually leaves.
    dispose: () => {},
  })
  closePreparation = prepare
  const unbindCardCreation = window.orbisPaper.onCardCreation?.(async (payload) => {
    const card = createCard({
      bookId: payload.bookId || '',
      kind: payload.kind,
      body: payload.body,
      answer: payload.answer || '',
      source: payload.source || '',
      cfi: payload.cfi || null,
    })
    await services.cards.add(card)
    return { id: card.id }
  })
  window.addEventListener('pagehide', () => {
    unbindCardCreation?.()
    lifetime.abort()
    composition.dispose()
  }, { once: true })
  createRoot(root).render(
    <StrictMode>
      <PaperErrorBoundary>
      <App
        services={services}
        fs={fs}
        shelfUnread={shelfUnread}
        bootNotice={notice}
        composition={composition}
        beforeWindowClose={prepare}
      />
      </PaperErrorBoundary>
    </StrictMode>,
  )
}

let closePreparation: (() => Promise<unknown>) | undefined
const root = document.getElementById('root')
if (root) {
  document.documentElement.dataset.orbisPaperEmbedded = 'true'
  const startup = main(root)
  // Subscribe during startup as well: closing while the shelf is opening must
  // not destroy its writer before the pending boot has handed over to drain.
  window.orbisPaper?.window.onBeforeClose(async () => {
    await startup.catch(() => {})
    await closePreparation?.()
  })
  void startup.catch((error: unknown) => {
    root.textContent = `Paper could not start: ${String(error)}`
    console.error('[paper] boot failed', error)
  })
}
