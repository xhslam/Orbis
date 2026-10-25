import { isReadingMode, type ReadingMode, type ReadingWorkspaceApi } from '../../shared/reading-workspace'

/** View visibility only. Neither engine is mounted, cleaned up or refreshed by a mode change. */
export function bindReadingWorkspace(
  api: ReadingWorkspaceApi,
  render: (mode: ReadingMode) => void,
  requested?: string | null,
): () => void {
  let gone = false
  let eventReceived = false
  const stop = api.onModeChanged((mode) => {
    eventReceived = true
    if (!gone) render(mode)
  })
  void (async () => {
    if (isReadingMode(requested)) await api.setMode(requested)
    const mode = await api.getMode()
    if (!gone && !eventReceived) render(mode)
  })().catch((error: unknown) => { console.error('[reading] workspace initialization failed', error) })
  return () => { gone = true; stop() }
}
