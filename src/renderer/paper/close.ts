interface PaperCloseDeps {
  flush(): void
  settle(): Promise<unknown>
  drain(): Promise<unknown>
  flushStore(): Promise<unknown>
  dispose(): void
}

/** Hand over React's buffered edits before waiting for disk; coalesce only in-flight work. */
export function createPaperClosePreparation(deps: PaperCloseDeps): () => Promise<void> {
  let inFlight: Promise<void> | null = null
  return () => {
    inFlight ??= (async () => {
      deps.flush()
      await deps.settle()
      await deps.drain()
      await deps.flushStore()
      // Do not tear down a live reader if a recoverable save failed above.
      deps.dispose()
    })().finally(() => {
      inFlight = null
    })
    return inFlight
  }
}
