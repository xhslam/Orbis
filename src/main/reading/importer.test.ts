import { describe, expect, it } from 'vitest'
import { extractMarkdownOrTxt, extractHtmlArticle, parsePdfTextLayer } from './importer'

describe('Text Importers', () => {
  it('extracts clean text and title from markdown', () => {
    const md = `# The Future of Computing\n\nQuantum computing is progressing rapidly.\n\nIt solves complex calculations.`
    const parsed = extractMarkdownOrTxt(md, 'future.md')
    expect(parsed.title).toBe('The Future of Computing')
    expect(parsed.text).toContain('Quantum computing is progressing rapidly.')
    expect(parsed.text).not.toContain('# The Future')
  })

  it('extracts article title and clean paragraphs from HTML', () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head><title>Deep Learning News</title></head>
        <body>
          <nav><a href="/">Home</a></nav>
          <main>
            <h1>Deep Learning News</h1>
            <p>Recent advances have accelerated transformer efficiency.</p>
            <p>New architectures require fewer floating point operations.</p>
          </main>
          <footer>Copyright 2026</footer>
        </body>
      </html>
    `
    const extracted = extractHtmlArticle(html, 'https://example.com/article')
    expect(extracted.title).toBe('Deep Learning News')
    expect(extracted.text).toContain('Recent advances have accelerated transformer efficiency.')
    expect(extracted.text).not.toContain('Home')
    expect(extracted.text).not.toContain('Copyright 2026')
  })

  it('rejects empty or corrupt PDF buffers with a descriptive error', async () => {
    const emptyBuf = Buffer.from('')
    await expect(parsePdfTextLayer(emptyBuf, 'empty.pdf')).rejects.toThrow('PDF file is empty')
  })
})
