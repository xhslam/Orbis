import type { OrbisPaperApi } from '@shared/paper'
import { PAPER_CLOSE } from '@shared/paper'

type PaperTransport = {
  invoke(channel: string, ...args: unknown[]): Promise<unknown>
  send(channel: string, ...args: unknown[]): void
  on(channel: string, listener: (event: unknown, token: string) => void): unknown
}

/** Explicit methods only: no renderer-controlled channel ever crosses this bridge. */
export function createPaperBridge(ipc: PaperTransport): OrbisPaperApi {
  const call = <T>(channel: string, ...args: unknown[]) =>
    ipc.invoke(channel, ...args) as Promise<T>
  const prepares = new Set<() => Promise<unknown>>()
  let closing: Promise<void> | null = null
  ipc.on(PAPER_CLOSE.request, (_event, token) => {
    if (typeof token !== 'string') return
    // Each token is answered only after every registered store has settled.
    closing ??= Promise.all([...prepares].map((prepare) => Promise.resolve().then(prepare))).then(
      () => {},
    )
    void closing.then(
      () => {
        closing = null
        ipc.send(PAPER_CLOSE.ready, token, true)
      },
      (error: unknown) => {
        console.error('[paper] close preparation failed', error)
        ipc.send(PAPER_CLOSE.ready, token, false)
        closing = null
      },
    )
  })
  return {
    fs: {
      readFile: (path) => call('paper:fs:readFile', path),
      writeFile: (path, bytes) => call('paper:fs:writeFile', path, bytes),
      exists: (path) => call('paper:fs:exists', path),
      mkdir: (path) => call('paper:fs:mkdir', path),
      remove: (path) => call('paper:fs:remove', path),
      rename: (from, to) => call('paper:fs:rename', from, to),
      removeDir: (path) => call('paper:fs:removeDir', path),
      readDir: (path) => call('paper:fs:readDir', path),
      appendFile: (path, bytes) => call('paper:fs:appendFile', path, bytes),
      readRange: (path, offset, length) => call('paper:fs:readRange', path, offset, length),
      writeAtomic: (path, bytes, level) => call('paper:fs:writeAtomic', path, bytes, level),
      fsync: (path, level) => call('paper:fs:fsync', path, level),
    },
    size: {
      contentBytes: (book) => call('paper:size:contentBytes', book),
      libraryBytes: () => call('paper:size:libraryBytes'),
      bytesAt: (path) => call('paper:size:bytesAt', path),
    },
    dialog: {
      open: (options) => call('paper:dialog:open', options),
      save: (options) => call('paper:dialog:save', options),
    },
    externalFs: {
      readFile: (path) => call('paper:externalFs:readFile', path),
      readTextFile: (path) => call('paper:externalFs:readTextFile', path),
      writeTextFile: (path, text) => call('paper:externalFs:writeTextFile', path, text),
      readDir: (path) => call('paper:externalFs:readDir', path),
      stat: (path) => call('paper:externalFs:stat', path),
    },
    openExternal: (url) => call('paper:openExternal', url),
    window: {
      minimize: () => call('paper:window:minimize'),
      toggleMaximize: () => call('paper:window:toggleMaximize'),
      close: () => call('paper:window:close'),
      onBeforeClose: (prepare) => {
        const wrapped = () => prepare()
        if (prepares.size === 0) ipc.send(PAPER_CLOSE.subscribe)
        prepares.add(wrapped)
        return () => {
          if (!prepares.delete(wrapped)) return
          if (prepares.size === 0) ipc.send(PAPER_CLOSE.unsubscribe)
        }
      },
    },
  }
}
