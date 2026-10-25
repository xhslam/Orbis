import type { PaperArticleOrigin } from './reading/article'

export type ReadingMode = 'retell' | 'paper'
export const WORKSPACE_BAR_HEIGHT = 52
export const WORKSPACE_CHANNELS = {
  open: 'workspace:open',
  layout: 'workspace:layout',
  setMode: 'workspace:setMode',
  getMode: 'workspace:getMode',
  modeChanged: 'workspace:modeChanged',
  sendToRetell: 'workspace:sendToRetell',
  saveToPaperCard: 'workspace:saveToPaperCard',
  paperCreateCard: 'workspace:paperCreateCard',
  openArticle: 'workspace:openArticle',
} as const

export interface PaperToRetellPayload {
  readonly title: string
  readonly text: string
  readonly origin: PaperArticleOrigin
  readonly highlights?: readonly string[] | undefined
}

export interface RetellToPaperCardPayload {
  readonly kind: 'Recall' | 'Synthesis' | 'Idea' | 'Excerpt'
  readonly body: string
  readonly answer: string
  readonly source: string
  readonly bookId: string | null
  readonly cfi: string | null
  readonly title?: string | undefined
}

export interface WorkspaceLayout {
  x: number
  y: number
  width: number
  height: number
  visible: boolean
}

export interface ReadingWorkspaceApi {
  setLayout?(layout: WorkspaceLayout): Promise<void>
  open(mode: ReadingMode): Promise<void>
  setMode(mode: ReadingMode): Promise<void>
  getMode(): Promise<ReadingMode>
  onModeChanged(handler: (mode: ReadingMode) => void): () => void
  sendToRetell?(payload: PaperToRetellPayload): Promise<{ ok: boolean; articleId: string }>
  saveToPaperCard?(
    payload: RetellToPaperCardPayload,
  ): Promise<{ ok: boolean; cardId?: string; error?: string }>
  onOpenArticle?(handler: (articleId: string) => void): () => void
}

export function isReadingMode(value: unknown): value is ReadingMode {
  return value === 'retell' || value === 'paper'
}

declare global {
  interface Window {
    readonly orbisWorkspace?: ReadingWorkspaceApi
  }
}
