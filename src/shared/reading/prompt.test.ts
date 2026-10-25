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
    expect(prompt).toContain('You are Orbit')
  })

  it('includes previous rounds history when practicing iteratively', () => {
    const article = createArticleFromText({
      title: 'Solar Energy',
      source: 'solar.md',
      sourceType: 'markdown',
      text: 'Solar panels convert sunlight into electricity.\n\nThey help reduce carbon emissions.',
    })

    const prompt = buildRetellingSystemPrompt(
      article,
      { startParagraph: 0, endParagraph: 1 },
      {
        roundIndex: 2,
        previousRounds: [
          {
            roundIndex: 1,
            userTranscript: 'Solar panels make power.',
            coachFeedback: 'Good start, but mention sunlight and carbon emissions.',
            timestamp: 1000,
          },
        ],
      },
    )

    expect(prompt).toContain('Round 2')
    expect(prompt).toContain('PREVIOUS RETELLING ROUNDS HISTORY')
    expect(prompt).toContain('Solar panels make power.')
    expect(prompt).toContain('mention sunlight and carbon emissions.')
    expect(prompt).toContain('Acknowledge and celebrate improvements')
  })

  it('switches to interactive discussion mode when requested', () => {
    const article = createArticleFromText({
      title: 'Solar Energy',
      source: 'solar.md',
      sourceType: 'markdown',
      text: 'Solar panels convert sunlight into electricity.',
    })

    const prompt = buildRetellingSystemPrompt(
      article,
      { startParagraph: 0, endParagraph: 0 },
      { mode: 'interactive_qa' },
    )

    expect(prompt).toContain('INTERACTIVE DISCUSSION & QUESTION MODE')
    expect(prompt).toContain('asking you a direct question')
  })
})
