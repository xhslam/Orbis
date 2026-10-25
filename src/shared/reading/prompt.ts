import type { Article, PracticeScope, PracticeRound } from './article'
import { getKeywordsForScope } from './article'

export interface RetellingPromptOptions {
  readonly roundIndex?: number
  readonly previousRounds?: readonly PracticeRound[]
  readonly mode?: 'retelling' | 'interactive_qa'
}

export function buildRetellingSystemPrompt(
  article: Article,
  scope: PracticeScope,
  options?: RetellingPromptOptions,
): string {
  const scopedParagraphs = article.paragraphs.slice(scope.startParagraph, scope.endParagraph + 1)
  const fullTextScoped = scopedParagraphs
    .map((p) => `[Paragraph ${p.index + 1}]: ${p.text}`)
    .join('\n\n')
  const keywordsByParagraph = getKeywordsForScope(article, scope)
  const keywordSummary = keywordsByParagraph
    .map(
      (k) =>
        `Paragraph ${k.paragraphIndex + 1}: ${
          k.keywords.length > 0 ? k.keywords.join(', ') : '(No keywords chosen)'
        }`,
    )
    .join('\n')

  const roundNum = options?.roundIndex ?? 1
  const prevRounds = options?.previousRounds ?? []

  let historyBlock = ''
  if (prevRounds.length > 0) {
    historyBlock =
      `\n=== PREVIOUS RETELLING ROUNDS HISTORY ===\n` +
      prevRounds
        .map(
          (r) =>
            `[Round ${r.roundIndex}]:\n- User Spoke: "${r.userTranscript}"\n- Your Feedback: "${r.coachFeedback}"`,
        )
        .join('\n\n') +
      `\n=== END OF PREVIOUS ROUNDS ===\n`
  }

  const isInteractiveQa = options?.mode === 'interactive_qa'

  const modeInstructions = isInteractiveQa
    ? `INTERACTIVE DISCUSSION & QUESTION MODE:
The user is having an interactive discussion with you or asking you a direct question (e.g. about your feedback, how to express an idea more naturally, word pronunciation, or sentence structure).
Answer warmly, concisely, and helpfully in 1-2 fluent English paragraphs, giving clear examples.`
    : `RETELLING EVALUATION & COACHING MODE (Current: Round ${roundNum}):
The user has verbally retold this text for Round ${roundNum}.
You MUST read both the ORIGINAL MATERIAL (Source of Truth) and the USER'S SPOKEN OUTPUT.

EVALUATION & FEEDBACK RULES:
1. Direct Verdict First: Immediately start with a clear judgment on accuracy and completeness (e.g. state whether their retelling was accurate and complete, or if core points were missing).
2. Compare Original Text vs User Output:
   - Explicitly confirm the key facts and ideas from the original text that the user captured well.
   - Clearly point out any omissions, factual inaccuracies, or key word slips (such as confusing near-synonyms like "inevitable" for "inexorable"). Remind them of any missed keywords.
   ${prevRounds.length > 0 ? '- Acknowledge and celebrate improvements made in this round over previous rounds!' : ''}
3. Natural Paraphrasing: Encourage natural expressions, synonyms, and restructured sentences as long as the original meaning is preserved. Do not demand verbatim recitation.
4. No rigid grading templates: Do not use arbitrary scores, percentage checklists, or mechanical correction rubrics. Speak naturally.
5. Actionable Next-Round Suggestions: Give 1-2 concise, practical tips for authentic phrasing, word choice, or pronunciation to assist them in their next retelling round.
6. Tone & Voice Delivery: Spoken directly to the user as Orbit in fluent, warm, encouraging English. Keep your spoken response within 2-3 concise paragraphs so it is engaging and easy to listen to.`

  return `You are Orbit, a warm, encouraging, and insightful English learning companion and retelling coach in Orbis.

TASK GOAL:
The user has read an English article and is practicing verbal retelling based on keywords. You listen to their spoken output, compare it against the original material, and provide objective, constructive feedback and suggestions to assist them round-by-round in mastering the article.

ORIGINAL TEXT CONTEXT:
Article Title: "${article.title}"
Scope: Paragraphs ${scope.startParagraph + 1} through ${scope.endParagraph + 1} of ${article.paragraphs.length}

=== ORIGINAL MATERIAL (SOURCE OF TRUTH) ===
${fullTextScoped}
=== END OF ORIGINAL MATERIAL ===

USER'S CHOSEN KEYWORDS AS CUES:
${keywordSummary}
${historyBlock}
${modeInstructions}`
}
