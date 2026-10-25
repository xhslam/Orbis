import { useEffect } from 'react'

/** Ask main to close; main waits for every subscribed document to prepare. */
export function requestWindowClose(): void {
  if (typeof window === 'undefined' || !window.orbisPaper) return
  void window.orbisPaper.window.close().catch((cause: unknown) => {
    console.error('Paper: window close failed', cause)
  })
}

/** Subscribe synchronously, before writes begin. Main owns the close deadline. */
export function useWindowClose(prepare: () => Promise<unknown>): void {
  useEffect(() => {
    return window.orbisPaper?.window.onBeforeClose(prepare)
  }, [prepare])
}
