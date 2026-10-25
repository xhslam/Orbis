import { STATUS_UNDER } from '@shared/avatar-layout'

/** The visible DOM label is interactive even where it overlaps the avatar. */
export function statusCovers(
  rect: {
    readonly left: number
    readonly top: number
    readonly width: number
    readonly height: number
  },
  x: number,
  y: number,
): boolean {
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    x >= rect.left &&
    x <= rect.left + rect.width &&
    y >= rect.top &&
    y <= rect.top + rect.height
  )
}

/** Keep the remedy inside the real compact window, not a presumed roomy one. */
export function statusTop(
  body: { readonly top: number; readonly height: number },
  viewportHeight: number,
  labelHeight: number,
): number {
  const inset = 8
  const below = Math.round(body.top + body.height * (1 + STATUS_UNDER))
  const lastTop = viewportHeight - labelHeight - inset
  if (below <= lastTop) return below
  const above = Math.round(body.top - labelHeight - inset)
  if (above >= inset) return above
  return Math.max(inset, lastTop)
}
