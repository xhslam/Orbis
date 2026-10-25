import { describe, expect, it } from 'vitest'
import { paperPdfAssetsUrl } from './paper-assets'

describe('Paper PDF resource base', () => {
  for (const page of ['companion', 'history', 'reading', 'paper']) {
    it(`resolves ${page} to the shared dev resource root`, () => {
      expect(paperPdfAssetsUrl(`http://localhost:5173/${page}/index.html`)).toBe(
        'http://localhost:5173/pdfjs/',
      )
    })
    it(`resolves ${page} inside a packaged file tree, including spaces`, () => {
      expect(
        paperPdfAssetsUrl(
          `file:///Applications/Orbis%20Test.app/Contents/Resources/app.asar/out/renderer/${page}/index.html`,
        ),
      ).toBe(
        'file:///Applications/Orbis%20Test.app/Contents/Resources/app.asar/out/renderer/pdfjs/',
      )
    })
  }
})
