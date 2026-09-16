export type SourceType = 'markdown' | 'txt' | 'pdf' | 'url' | 'manual'

export interface Paragraph {
  readonly id: string
  readonly index: number
  readonly text: string
}

export interface Highlight {
  readonly id: string
  readonly paragraphIndex: number
  readonly startOffset: number
  readonly endOffset: number
  readonly text: string
}

export interface PracticeScope {
  readonly startParagraph: number
  readonly endParagraph: number
}

export interface PracticeRecord {
  readonly id: string
  readonly articleId: string
  readonly scope: PracticeScope
  readonly startedAt: number
  readonly finishedAt: number | null
  readonly feedbackTranscript: string | null
  readonly isCompleted: boolean
}

export interface Article {
  readonly id: string
  readonly title: string
  readonly source: string
  readonly sourceType: SourceType
  readonly fullText: string
  readonly paragraphs: readonly Paragraph[]
  readonly highlights: readonly Highlight[]
  readonly createdAt: number
  readonly updatedAt: number
  readonly lastPractice?: PracticeRecord | null | undefined
}

export interface ArticleSummary {
  readonly id: string
  readonly title: string
  readonly source: string
  readonly sourceType: SourceType
  readonly paragraphCount: number
  readonly highlightCount: number
  readonly updatedAt: number
  readonly lastPractice?: PracticeRecord | null | undefined
}

export interface OrbisReadingApi {
  listArticles(): Promise<readonly ArticleSummary[]>
  getArticle(id: string): Promise<Article | null>
  saveArticle(article: Article): Promise<{ ok: boolean }>
  deleteArticle(id: string): Promise<boolean>
  importFile(): Promise<Article | null>
  importUrl(url: string): Promise<Article>
  savePractice(record: PracticeRecord): Promise<{ ok: boolean }>
  openVoice(): Promise<
    { ok: true; session: string; model: string } | { ok: false; problem: unknown }
  >
  sdp(
    offer: string,
    sessionToken: string,
  ): Promise<{ ok: true; answer: string } | { ok: false; problem: unknown }>
}

export function splitIntoParagraphs(text: string): readonly Paragraph[] {
  const raw = text.replace(/\r\n/g, '\n').split(/\n\s*\n+/)
  const result: Paragraph[] = []
  let index = 0
  for (const block of raw) {
    const trimmed = block.trim()
    if (trimmed.length > 0) {
      result.push({
        id: `p-${index}`,
        index,
        text: trimmed,
      })
      index++
    }
  }
  return result
}

export function createArticleFromText(input: {
  readonly title: string
  readonly source: string
  readonly sourceType: SourceType
  readonly text: string
  readonly id?: string
}): Article {
  const trimmed = input.text.trim()
  if (trimmed.length === 0) {
    throw new Error('Content is empty')
  }

  const paragraphs = splitIntoParagraphs(trimmed)
  if (paragraphs.length === 0) {
    throw new Error('No valid paragraphs found in text')
  }

  const now = Date.now()
  return {
    id: input.id ?? `art-${now}-${Math.random().toString(36).slice(2, 8)}`,
    title: input.title.trim() || 'Untitled Document',
    source: input.source,
    sourceType: input.sourceType,
    fullText: trimmed,
    paragraphs,
    highlights: [],
    createdAt: now,
    updatedAt: now,
  }
}

export function addHighlight(
  article: Article,
  highlight: Omit<Highlight, 'id'> & { id?: string },
): Article {
  const id = highlight.id ?? `hl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  const newHl: Highlight = {
    id,
    paragraphIndex: highlight.paragraphIndex,
    startOffset: highlight.startOffset,
    endOffset: highlight.endOffset,
    text: highlight.text,
  }

  return {
    ...article,
    highlights: [...article.highlights, newHl],
    updatedAt: Date.now(),
  }
}

export function removeHighlight(article: Article, highlightId: string): Article {
  return {
    ...article,
    highlights: article.highlights.filter((h) => h.id !== highlightId),
    updatedAt: Date.now(),
  }
}

export interface ParagraphKeywords {
  readonly paragraphIndex: number
  readonly paragraphId: string
  readonly keywords: readonly string[]
}

export function getKeywordsForScope(
  article: Article,
  scope: PracticeScope,
): readonly ParagraphKeywords[] {
  const result: ParagraphKeywords[] = []
  const { startParagraph, endParagraph } = scope

  for (let i = startParagraph; i <= endParagraph; i++) {
    const p = article.paragraphs[i]
    if (!p) continue
    const pHighlights = article.highlights
      .filter((h) => h.paragraphIndex === i)
      .sort((a, b) => a.startOffset - b.startOffset)
      .map((h) => h.text)

    result.push({
      paragraphIndex: i,
      paragraphId: p.id,
      keywords: pHighlights,
    })
  }
  return result
}
