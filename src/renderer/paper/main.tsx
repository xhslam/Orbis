import { StrictMode } from 'react'
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
  composeCapabilities,
  kernelApi,
  buildServices,
  serviceClients,
} from '../../kernel'
import {
  App,
  openAppStorage,
  libraryFs,
  loadShelf,
  settleBeforeDrain,
  tauriSizePort,
} from '../../kernel/ui'

/** Build/boot integration entry only. Existing companion/history/reading routes are unchanged. */
async function main(root: HTMLElement): Promise<void> {
  if (!window.orbisPaper) {
    root.textContent =
      'Paper requires an Orbis reading/history host. This entry validates the renderer build.'
    return
  }
  const { storage, notice } = await openAppStorage()
  const fs = libraryFs
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
    dispose: () => {
      lifetime.abort()
      composition.dispose()
    },
  })
  // This also covers the gap before React has installed its own close hook.
  window.orbisPaper.window.onBeforeClose(prepare)
  window.addEventListener('pagehide', () => lifetime.abort(), { once: true })
  createRoot(root).render(
    <StrictMode>
      <App
        services={services}
        fs={fs}
        shelfUnread={shelfUnread}
        bootNotice={notice}
        composition={composition}
        beforeWindowClose={prepare}
      />
    </StrictMode>,
  )
}

const root = document.getElementById('root')
if (root)
  void main(root).catch((error: unknown) => {
    root.textContent = `Paper could not start: ${String(error)}`
    console.error('[paper] boot failed', error)
  })
