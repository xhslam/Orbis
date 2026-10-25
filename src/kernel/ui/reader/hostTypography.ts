import { proseGrid, type ProseGrid } from '../../core/metrics'

/** Optional host-wide typography. Standalone Paper keeps its own settings. */
export interface HostTypography {
  readonly fontSize: number
  readonly fontFamily: string
  readonly lineHeight: number
}
export interface HostReadingDisplay extends HostTypography {
  /** Maximum prose width in pixels; null fills the available content column. */
  readonly contentWidth: number | null
  readonly pageMargin: number
}

export function hostReadingGrid(
  available: number,
  hasNotes: boolean,
  display: HostReadingDisplay,
): ProseGrid {
  const base = proseGrid(available, hasNotes, display.contentWidth ?? available)
  const edge = Math.min(display.pageMargin, Math.max(0, available / 2))
  // Notes have their own lane; without notes, margins are symmetric.
  const noteLane = hasNotes
    ? Math.min(base.marginCol + base.gap, Math.max(0, available - edge * 2))
    : 0
  const room = Math.max(0, available - edge * 2 - noteLane)
  return {
    gutter: edge,
    measure: Math.min(display.contentWidth ?? room, room),
    marginCol: edge + noteLane,
    gap: 0,
  }
}
