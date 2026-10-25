import { isReadingMode, WORKSPACE_CHANNELS as channels, type ReadingWorkspaceApi, type PaperToRetellPayload, type RetellToPaperCardPayload } from '@shared/reading-workspace'

interface WorkspaceTransport {
  invoke(channel: string, ...args: unknown[]): Promise<unknown>
  on(channel: string, listener: (...args: any[]) => void): unknown
  removeListener(channel: string, listener: (...args: any[]) => void): unknown
}

export function createReadingWorkspaceBridge(ipc: WorkspaceTransport): ReadingWorkspaceApi {
  return {
    open: async (mode) => { await ipc.invoke(channels.open, mode) },
    setMode: async (mode) => { await ipc.invoke(channels.setMode, mode) },
    getMode: async () => {
      const mode = await ipc.invoke(channels.getMode)
      if (!isReadingMode(mode)) throw new Error('Invalid reading workspace mode')
      return mode
    },
    onModeChanged: (handler) => {
      const listener = (_event: unknown, mode: unknown) => {
        if (isReadingMode(mode)) handler(mode)
      }
      ipc.on(channels.modeChanged, listener)
      return () => { ipc.removeListener(channels.modeChanged, listener) }
    },
    sendToRetell: async (payload: PaperToRetellPayload) => {
      return (await ipc.invoke(channels.sendToRetell, payload)) as { ok: boolean; articleId: string }
    },
    saveToPaperCard: async (payload: RetellToPaperCardPayload) => {
      return (await ipc.invoke(channels.saveToPaperCard, payload)) as { ok: boolean; cardId?: string; error?: string }
    },
    onOpenArticle: (handler: (articleId: string) => void) => {
      const listener = (_event: unknown, articleId: unknown) => {
        if (typeof articleId === 'string') handler(articleId)
      }
      ipc.on(channels.openArticle, listener)
      return () => { ipc.removeListener(channels.openArticle, listener) }
    },
  }
}
