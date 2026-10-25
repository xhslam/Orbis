/** Every renderer document lives one directory below out/renderer (and the dev root). */
export function paperPdfAssetsUrl(documentUrl: string): string {
  return new URL('../pdfjs/', documentUrl).href
}
