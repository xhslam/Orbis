import { describe, expect, it } from 'vitest'
import { hostReadingGrid, type HostReadingDisplay } from './hostTypography'
const display: HostReadingDisplay = {
  contentWidth: 648,
  pageMargin: 32,
  fontSize: 18,
  lineHeight: 1.6,
  fontFamily: 'Georgia, serif',
}

describe('host reading layout', () => {
  it('uses the chosen width and symmetric margins without notes', () => {
    expect(hostReadingGrid(1200, false, display)).toEqual({
      gutter: 32,
      measure: 648,
      marginCol: 32,
      gap: 0,
    })
    expect(hostReadingGrid(1200, false, { ...display, contentWidth: 1080 }).measure).toBe(1080)
  })
  it('makes unlimited text fill the available column, respecting margins', () => {
    expect(hostReadingGrid(1200, false, { ...display, contentWidth: null }).measure).toBe(1136)
    expect(
      hostReadingGrid(1200, false, { ...display, contentWidth: null, pageMargin: 96 }).measure,
    ).toBe(1008)
  })
  it('keeps notes and text within the available width, including narrow windows', () => {
    for (const width of [80, 320, 700, 1200]) {
      const grid = hostReadingGrid(width, true, display)
      expect(grid.measure).toBeGreaterThanOrEqual(0)
      expect(grid.gutter + grid.measure + grid.marginCol + grid.gap * 2).toBeLessThanOrEqual(width)
    }
  })
})
