import type { IndexFs } from '../kernel/core/bookIndex'
import type { SizePort } from '../kernel/core/ports'

export interface PaperDialogOptions {
  title?: string
  defaultPath?: string
  filters?: { name: string; extensions: string[] }[]
  multiple?: boolean
  directory?: boolean
}

/** Only available to the trusted history/reading top-level document. */
export interface OrbisPaperApi {
  fs: Required<IndexFs>
  size: SizePort
  dialog: {
    open(options: PaperDialogOptions): Promise<string[] | null>
    save(options: PaperDialogOptions): Promise<string | null>
  }
  externalFs: {
    readFile(path: string): Promise<Uint8Array>
    readTextFile(path: string): Promise<string>
    writeTextFile(path: string, text: string): Promise<void>
    readDir(path: string): Promise<{ name: string; isDirectory: boolean }[]>
    stat(path: string): Promise<{ size: number; isFile: boolean; isDirectory: boolean }>
  }
  openExternal(url: string): Promise<void>
  window: {
    minimize(): Promise<void>
    toggleMaximize(): Promise<void>
    close(): Promise<void>
    /** Subscribe before writes begin. Main waits for every subscriber before closing. */
    onBeforeClose(prepare: () => Promise<unknown>): () => void
  }
}

export const PAPER_METHODS = {
  fs: [
    'readFile',
    'writeFile',
    'exists',
    'mkdir',
    'remove',
    'rename',
    'removeDir',
    'readDir',
    'appendFile',
    'readRange',
    'writeAtomic',
    'fsync',
  ],
  size: ['contentBytes', 'libraryBytes', 'bytesAt'],
  dialog: ['open', 'save'],
  externalFs: ['readFile', 'readTextFile', 'writeTextFile', 'readDir', 'stat'],
  window: ['minimize', 'toggleMaximize', 'close'],
} as const

export const PAPER_CLOSE = {
  subscribe: 'paper:close:subscribe',
  unsubscribe: 'paper:close:unsubscribe',
  request: 'paper:close:request',
  ready: 'paper:close:ready',
} as const

export const PAPER_CLOSE_TIMEOUT_MS = 8_000

declare global {
  interface Window {
    readonly orbisPaper?: OrbisPaperApi
  }
}
