import { describe, expect, it } from 'vitest'
import { statusCovers, statusTop } from './status-position'
import { STATUS_UNDER } from '@shared/avatar-layout'

const body = { top: 78, height: 142 }

describe('companion status within its actual viewport', () => {
  it('takes pointer input only inside the visible status rectangle', () => {
    const rect = { left: 8, top: 120, width: 324, height: 160 }
    expect(statusCovers(rect, 160, 200)).toBe(true)
    expect(statusCovers(rect, 160, 290)).toBe(false)
    expect(statusCovers({ ...rect, height: 0 }, 160, 120)).toBe(false)
  })

  it('keeps a short label under her when it fits', () => {
    expect(statusTop(body, 560, 28)).toBe(Math.round(body.top + body.height * (1 + STATUS_UNDER)))
  })

  it('moves a long error up instead of cutting its remedy off the bottom', () => {
    const top = statusTop(body, 300, 160)
    expect(top).toBeGreaterThanOrEqual(8)
    expect(top + 160).toBeLessThanOrEqual(292)
  })

  it('uses the space above her if the whole label fits there', () => {
    expect(statusTop({ top: 190, height: 90 }, 300, 100)).toBe(82)
  })

  it('still starts visibly when a label is taller than the viewport', () => {
    expect(statusTop(body, 80, 200)).toBe(8)
  })
})
