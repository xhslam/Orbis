export type ReadingMode = 'retell' | 'paper'
export const WORKSPACE_BAR_HEIGHT = 52
export const WORKSPACE_CHANNELS = {
  open: 'workspace:open',
  setMode: 'workspace:setMode',
  getMode: 'workspace:getMode',
  modeChanged: 'workspace:modeChanged',
} as const

export interface ReadingWorkspaceApi {
  open(mode: ReadingMode): Promise<void>
  setMode(mode: ReadingMode): Promise<void>
  getMode(): Promise<ReadingMode>
  onModeChanged(handler: (mode: ReadingMode) => void): () => void
}

export function isReadingMode(value: unknown): value is ReadingMode {
  return value === 'retell' || value === 'paper'
}

declare global {
  interface Window {
    readonly orbisWorkspace?: ReadingWorkspaceApi
  }
}
