import { isReadingMode, WORKSPACE_CHANNELS as channels, type ReadingWorkspaceApi } from '@shared/reading-workspace'

interface WorkspaceTransport {
  invoke(channel: string, ...args: unknown[]): Promise<unknown>
  on(channel: string, listener: (event: unknown, mode: unknown) => void): unknown
  removeListener(channel: string, listener: (event: unknown, mode: unknown) => void): unknown
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
  }
}
