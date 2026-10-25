import type { OrbisPaperApi } from '../../shared/paper'

/** Resolve lazily: pure kernel modules also run without the trusted host. */
export function paperBridge(): OrbisPaperApi {
  if (typeof window === 'undefined' || !window.orbisPaper) {
    throw new Error('The Orbis Paper bridge is unavailable in this document.')
  }
  return window.orbisPaper
}
