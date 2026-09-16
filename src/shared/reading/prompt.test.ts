import { describe, expect, it } from 'vitest'
import { createArticleFromText } from './article'
import { buildRetellingSystemPrompt } from './prompt'

describe('Retelling prompt builder', () => {
  it('incorporates article title, scope, source text and keywords', () => {
    const article = createArticleFromText({
      title: 'Solar Energy',
      source: 'solar.md',
      sourceType: 'markdown',
      text: 'Solar panels convert sunlight into electricity.\n\nThey help reduce carbon emissions.',
    })

    const prompt = buildRetellingSystemPrompt(article, { startParagraph: 0, endParagraph: 1 })
    expect(prompt).toContain('Solar Energy')
    expect(prompt).toContain('Paragraph 1')
    expect(prompt).toContain('convert sunlight into electricity')
    expect(prompt).toContain('No rigid grading templates')
  })
})
