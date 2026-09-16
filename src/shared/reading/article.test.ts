import { describe, expect, it } from 'vitest'
import {
  createArticleFromText,
  addHighlight,
  removeHighlight,
  getKeywordsForScope,
  type Article,
} from './article'

describe('Article and Highlight model', () => {
  it('splits text into numbered paragraphs and cleans up whitespace', () => {
    const text = "First paragraph with details.\n\nSecond paragraph has more information."
    const article = createArticleFromText({
      title: 'Sample Note',
      source: 'test.md',
      sourceType: 'markdown',
      text,
    })

    expect(article.paragraphs.length).toBe(2)
    expect(article.paragraphs[0]?.text).toBe('First paragraph with details.')
    expect(article.paragraphs[1]?.text).toBe('Second paragraph has more information.')
  })

  it('adds highlights with exact offsets without affecting duplicate words elsewhere', () => {
    const text = "Water is essential. Drink water daily."
    let article = createArticleFromText({
      title: 'Water',
      source: 'test.txt',
      sourceType: 'txt',
      text,
    })

    // Highlight the second "water" (index 26 to 31)
    article = addHighlight(article, {
      paragraphIndex: 0,
      startOffset: 26,
      endOffset: 31,
      text: 'water',
    })

    expect(article.highlights.length).toBe(1)
    expect(article.highlights[0]?.startOffset).toBe(26)

    // Keywords for scope returns only the highlighted keywords
    const keywords = getKeywordsForScope(article, { startParagraph: 0, endParagraph: 0 })
    expect(keywords[0]?.keywords).toEqual(['water'])
  })

  it('removes highlights cleanly', () => {
    const text = "Practice makes perfect."
    let article = createArticleFromText({
      title: 'Practice',
      source: 'practice.txt',
      sourceType: 'txt',
      text,
    })

    article = addHighlight(article, {
      id: 'hl-1',
      paragraphIndex: 0,
      startOffset: 0,
      endOffset: 8,
      text: 'Practice',
    })
    expect(article.highlights.length).toBe(1)

    article = removeHighlight(article, 'hl-1')
    expect(article.highlights.length).toBe(0)
  })

  it('rejects empty or whitespace-only articles', () => {
    expect(() =>
      createArticleFromText({
        title: 'Empty',
        source: 'empty.txt',
        sourceType: 'txt',
        text: '   \n\n   ',
      }),
    ).toThrow('Content is empty')
  })
})
