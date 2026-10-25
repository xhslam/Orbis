/** Compatibility name: only the trusted Orbis Paper document has this bridge. */
export function inTauri(): boolean {
  return typeof window !== 'undefined' && Boolean(window.orbisPaper)
}
