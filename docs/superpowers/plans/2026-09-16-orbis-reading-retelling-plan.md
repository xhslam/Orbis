# Orbis: Minimal English Reading and Retelling Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand the desktop application from Mochi to Orbis while keeping all existing companion capabilities completely intact, and implement the dedicated, minimalist English Reading & Retelling desktop experience where users can import materials (Markdown/TXT/PDF/URL), highlight keywords, practice spoken retelling using only keywords, and receive voice + text feedback via OpenAI Realtime WebRTC through Codex credentials with manual turn-taking control and zero credential leakage to renderer.

**Architecture:** 
- **Rebranding layer**: Rebrand application metadata, package names, identifiers, window titles, and tray menus from "Mochi" to "Orbis", while preserving all existing voice companion features and character pipelines.
- **Reading domain & storage**: Clean file/URL text extraction pipelines (Markdown, TXT, `pdf-parse` text layer, clean HTML scraping), paragraph-aware keyword offset tracking, and atomic JSON persistence under `app.getPath('userData')/orbis-reading/`.
- **Turn-controlled voice session (main-retained credentials)**: Main process mints ephemeral keys and holds them in an opaque session slot (`mintSlot`), returning only an opaque session token to renderer. The renderer opens WebRTC, sends `session.update` with `server_vad`, `create_response: false`, and `interrupt_response: false`, and confirms `session.updated` before allowing recording. User clicking "说完了" triggers manual `response.create` for evidence-based retelling evaluation. Frame parsing reuses `src/shared/realtime/frames.ts`.
- **Dedicated Reading window**: An elegant, distraction-free Electron window built with design system tokens (`tokens.css`), featuring Home (Recent Articles + Import), Reading & Highlighting (exact position markers + paragraph scoping), and Keyword Retelling (keyword prompts only, active recording indicator, streaming feedback, audio playback).

**Tech Stack:** Electron 43, TypeScript 7, Vite 7, electron-vite 5, WebRTC, Node.js fetch, `pdf-parse`, vitest 4.

---

## File Structure

```text
src/
├── shared/
│   ├── reading/
│   │   ├── article.ts           # Article, Paragraph, Highlight, PracticeScope models & validation
│   │   ├── article.test.ts      # Unit tests for paragraph parsing, offset marking, validation
│   │   ├── prompt.ts            # Retelling assessment instructions generator
│   │   └── prompt.test.ts       # Tests for prompt generation under different scopes
│   ├── ipc.ts                   # Channel allowlist: READING_CHANNELS, isReadingChannel
│   └── history-window.ts        # Add openReading to history API interface
├── main/
│   ├── reading/
│   │   ├── importer.ts          # File (md, txt, pdf) & Web URL text extractors (using pdf-parse)
│   │   ├── importer.test.ts     # Tests for file & URL extraction with edge cases
│   │   ├── store.ts             # Local persistence (articles, highlights, practice records)
│   │   ├── store.test.ts        # Tests for CRUD & atomic persistence
│   │   ├── ipc.ts               # Reading IPC handlers (import, CRUD, voice session slot)
│   │   └── ipc.test.ts          # IPC registration and dispatch tests
│   ├── window.ts                # Add 'reading' to bridgeFor/loadRenderer, showReadingWindow()
│   ├── tray.ts                  # Add Reading & Retelling to tray
│   └── index.ts                 # Startup wiring for registerReadingIpc
├── preload/
│   └── index.ts                 # Expose window.orbisReading & window.orbis alias
└── renderer/
    └── reading/
        ├── index.html           # Reading window document
        ├── style.css            # Clean, token-based stylesheet
        ├── main.ts              # Reading window orchestration & state machine
        ├── reading-views.test.ts# UI state transitions & rendering tests
        ├── audio/
        │   ├── reading-session.ts      # WebRTC session with manual turn control & frames.ts reuse
        │   └── reading-session.test.ts # Frame parsing & state machine tests
        └── components/
            ├── home-view.ts     # Recents list & import triggers
            ├── article-view.ts  # Reading, highlighting & scope selection
            ├── retelling-view.ts# Keywords-only display & recording controls
            └── feedback-view.ts # Audio player & feedback display
```

---

## Task 1: Rebrand from Mochi to Orbis, Install pdf-parse, & Test Hygiene

**Files:**
- Modify: `package.json`
- Modify: `electron-builder.yml`
- Modify: `src/main/index.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/renderer/companion/index.html`
- Modify: `src/renderer/history/index.html`
- Modify: `src/main/shipped-assets.test.ts`
- Modify: `src/renderer/history/format.ts`
- Create: `src/main/brand.test.ts`

- [ ] **Step 1: Write failing brand test**

Create `src/main/brand.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import pkg from '../../package.json'

describe('Orbis branding', () => {
  it('has package name and productName set to Orbis', () => {
    expect(pkg.name).toBe('orbis')
    expect(pkg.productName).toBe('Orbis')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/main/brand.test.ts`
Expected: FAIL (`expected 'mochi' to be 'orbis'`)

- [ ] **Step 3: Install pdf-parse and update package metadata**

1. Install `pdf-parse` and `@types/pdf-parse`:
   Run: `pnpm add pdf-parse` and `pnpm add -D @types/pdf-parse`
2. In `package.json`:
   - Change `"name": "mochi"` to `"name": "orbis"`
   - Change `"productName": "Mochi"` to `"productName": "Orbis"`
   - Update description to `"A realtime-voice AI companion and reading tool that lives on your desktop"`
3. In `electron-builder.yml`:
   - Change `appId: com.mochi.companion` to `appId: com.orbis.companion`
   - Change `productName: Mochi` to `productName: Orbis`
4. In `src/main/index.ts`:
   - Change `APP_USER_MODEL_ID = 'com.mochi.companion'` to `'com.orbis.companion'`
5. In `src/preload/index.ts`:
   - Support `--orbis-role=` in addition to `--mochi-role=`.
   - Also expose `window.orbis = api`, `window.orbisHistory = history`, `window.orbisSettings = settings` alongside existing names for backward compatibility.
6. In `src/renderer/companion/index.html` and `src/renderer/history/index.html`:
   - Change `<title>Mochi</title>` to `<title>Orbis</title>`.
7. Fix test hygiene:
   - In `src/main/shipped-assets.test.ts`: skip `.DS_Store` or non-directory items when reading folders.
   - In `src/renderer/history/format.ts`: ensure `dayLabel` uses explicit `'en-US'` locale for day formatting so tests pass on all system locales.

- [ ] **Step 4: Run brand test to verify it passes**

Run: `pnpm vitest run src/main/brand.test.ts`
Expected: PASS

- [ ] **Step 5: Run full test suite to verify no regression**

Run: `pnpm test`
Expected: 182+ suites PASS

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml electron-builder.yml src/main/index.ts src/preload/index.ts src/renderer/companion/index.html src/renderer/history/index.html src/main/shipped-assets.test.ts src/renderer/history/format.ts src/main/brand.test.ts
git commit -m "chore: rebrand app to Orbis, add pdf-parse dependency, and clean up test environment"
```

---

## Task 2: Reading Domain Models, Keyword Extraction & Prompt Construction

**Files:**
- Create: `src/shared/reading/article.ts`
- Create: `src/shared/reading/prompt.ts`
- Create: `src/shared/reading/article.test.ts`
- Create: `src/shared/reading/prompt.test.ts`

- [ ] **Step 1: Write failing test for article model and paragraph segmentation**

Create `src/shared/reading/article.test.ts`:
```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/shared/reading/article.test.ts`
Expected: FAIL with missing module `./article`

- [ ] **Step 3: Implement article.ts and prompt.ts**

Create `src/shared/reading/article.ts`:
```ts
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
  readonly lastPractice?: PracticeRecord | null
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
```

Create `src/shared/reading/prompt.ts`:
```ts
import type { Article, PracticeScope } from './article'
import { getKeywordsForScope } from './article'

export function buildRetellingSystemPrompt(
  article: Article,
  scope: PracticeScope,
): string {
  const scopedParagraphs = article.paragraphs.slice(
    scope.startParagraph,
    scope.endParagraph + 1,
  )
  const fullTextScoped = scopedParagraphs.map((p) => `[Paragraph ${p.index + 1}]: ${p.text}`).join('\n\n')
  const keywordsByParagraph = getKeywordsForScope(article, scope)
  const keywordSummary = keywordsByParagraph
    .map(
      (k) =>
        `Paragraph ${k.paragraphIndex + 1}: ${
          k.keywords.length > 0 ? k.keywords.join(', ') : '(No keywords chosen)'
        }`,
    )
    .join('\n')

  return `You are an expert, encouraging English learning tutor listening to the user retell a specific text in their own words.

TASK GOAL:
The user has read an English article and is practicing verbal retelling based on keywords. You must listen to their retelling and provide objective, constructive feedback on whether they accurately and completely conveyed the core meaning of the selected text.

ORIGINAL TEXT CONTEXT:
Article Title: "${article.title}"
Scope: Paragraphs ${scope.startParagraph + 1} through ${scope.endParagraph + 1} of ${article.paragraphs.length}

=== ORIGINAL MATERIAL (SOURCE OF TRUTH) ===
${fullTextScoped}
=== END OF ORIGINAL MATERIAL ===

USER'S CHOSEN KEYWORDS AS CUES:
${keywordSummary}

EVALUATION & FEEDBACK RULES:
1. Ground truth boundary: Only critique or confirm statements supported by the original text above. If the user's speech was unclear, state what was unclear rather than guessing.
2. Natural paraphrasing: Encourage natural expressions, synonyms, and reordered ideas as long as the original meaning is preserved. Do not demand verbatim recitation.
3. No rigid grading templates: Do not use arbitrary scores, percentage checklists, or mechanical correction rubrics. Speak naturally.
4. Structure your response:
   - Brief verdict: State whether the core message was successfully and completely expressed.
   - Specific observations: Highlight what they explained well and note any key points that were missed or distorted.
   - Actionable tip: Give 1 concise tip for more natural phrasing or vocabulary if relevant.
5. Tone: Conversational, warm, concise, and spoken directly to the user in fluent English. Keep your spoken response within 3-4 concise paragraphs so it is easy to listen to.`
}
```

Create `src/shared/reading/prompt.test.ts`:
```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/shared/reading/article.test.ts src/shared/reading/prompt.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/reading/
git commit -m "feat(reading): add article models, paragraph splitting, keyword tracking, and evaluation prompts"
```

---

## Task 3: Text Importers (Markdown, Plain Text, PDF Text Layer with pdf-parse, Web Scraper)

**Files:**
- Create: `src/main/reading/importer.ts`
- Create: `src/main/reading/importer.test.ts`

- [ ] **Step 1: Write failing importer test**

Create `src/main/reading/importer.test.ts`:
```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/main/reading/importer.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement importer.ts with robust pdf-parse integration**

Create `src/main/reading/importer.ts`:
```ts
import pdfParse from 'pdf-parse'

export interface ExtractedDocument {
  readonly title: string
  readonly text: string
  readonly source: string
}

export function extractMarkdownOrTxt(content: string, filename: string): ExtractedDocument {
  const trimmed = content.trim()
  if (trimmed.length === 0) {
    throw new Error(`File "${filename}" is empty`)
  }

  let title = filename.replace(/\.[^/.]+$/, '')
  let body = trimmed

  const titleMatch = trimmed.match(/^#\s+([^\n]+)/)
  if (titleMatch && titleMatch[1]) {
    title = titleMatch[1].trim()
    body = trimmed.replace(/^#\s+[^\n]+\n+/, '').trim()
  }

  body = body
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')

  if (body.trim().length === 0) {
    throw new Error(`File "${filename}" has no readable content after removing header`)
  }

  return {
    title,
    text: body.trim(),
    source: filename,
  }
}

export function extractHtmlArticle(html: string, url: string): ExtractedDocument {
  const trimmed = html.trim()
  if (trimmed.length === 0) {
    throw new Error(`Empty web response from ${url}`)
  }

  const titleMatch = trimmed.match(/<title[^>]*>([^<]+)<\/title>/i)
  let title = titleMatch && titleMatch[1] ? titleMatch[1].trim() : 'Web Article'
  title = title.split(/[|–—]/)[0]?.trim() || title

  let clean = trimmed
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|nav|header|footer|aside|form|svg|noscript)[^>]*>[\s\S]*?<\/\1>/gi, '')

  const mainMatch = clean.match(/<(article|main)[^>]*>([\s\S]*?)<\/\1>/i)
  const contentArea = mainMatch ? mainMatch[2] : clean

  const blocks: string[] = []
  const blockRegex = /<(p|h[1-6]|li)[^>]*>([\s\S]*?)<\/\1>/gi
  let match: RegExpExecArray | null
  while ((match = blockRegex.exec(contentArea || '')) !== null) {
    const rawInner = match[2] || ''
    const text = rawInner.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    if (text.length > 20) {
      blocks.push(text)
    }
  }

  if (blocks.length === 0) {
    const plain = (contentArea || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    if (plain.length < 50) {
      throw new Error(`Could not extract readable article text from ${url}`)
    }
    blocks.push(plain)
  }

  return {
    title,
    text: blocks.join('\n\n'),
    source: url,
  }
}

export async function parsePdfTextLayer(buffer: Buffer, filename: string): Promise<ExtractedDocument> {
  if (buffer.length === 0) {
    throw new Error('PDF file is empty')
  }

  try {
    const parsed = await pdfParse(buffer)
    const text = (parsed.text ?? '').replace(/\r\n/g, '\n').trim()

    if (text.length < 20) {
      throw new Error(
        `Could not extract text layer from PDF "${filename}". It may be a scanned image without an embedded text layer.`,
      )
    }

    const title = (parsed.info?.Title ? String(parsed.info.Title).trim() : '') || filename.replace(/\.[^/.]+$/, '')

    return {
      title,
      text,
      source: filename,
    }
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes('text layer')) {
      throw err
    }
    throw new Error(`Failed to parse PDF "${filename}": ${String(err)}`)
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/main/reading/importer.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/main/reading/importer.ts src/main/reading/importer.test.ts
git commit -m "feat(reading): implement Markdown, TXT, HTML article, and pdf-parse text layer extractors"
```

---

## Task 4: Local Storage & Persistence for Articles & Practice Records

**Files:**
- Create: `src/main/reading/store.ts`
- Create: `src/main/reading/store.test.ts`

- [ ] **Step 1: Write failing store test**

Create `src/main/reading/store.test.ts`:
```ts
import { describe, expect, it, beforeEach } from 'vitest'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { mkdtempSync, rmSync } from 'node:fs'
import { createReadingStore } from './store'
import { createArticleFromText } from '../../shared/reading/article'

describe('ReadingStore', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'orbis-reading-test-'))
    return () => {
      try {
        rmSync(tempDir, { recursive: true, force: true })
      } catch {}
    }
  })

  it('persists articles and lists them newest first', () => {
    const store = createReadingStore(tempDir)
    const art1 = createArticleFromText({
      title: 'Article One',
      source: 'one.txt',
      sourceType: 'txt',
      text: 'First text.',
    })
    const art2 = createArticleFromText({
      title: 'Article Two',
      source: 'two.txt',
      sourceType: 'txt',
      text: 'Second text.',
    })

    store.saveArticle(art1)
    store.saveArticle(art2)

    const list = store.listArticles()
    expect(list.length).toBe(2)
    expect(list[0]?.id).toBe(art2.id)

    const retrieved = store.getArticle(art1.id)
    expect(retrieved?.title).toBe('Article One')
  })

  it('deletes an article cleanly', () => {
    const store = createReadingStore(tempDir)
    const art = createArticleFromText({
      title: 'To Delete',
      source: 'del.txt',
      sourceType: 'txt',
      text: 'Delete me.',
    })
    store.saveArticle(art)
    expect(store.listArticles().length).toBe(1)

    store.deleteArticle(art.id)
    expect(store.listArticles().length).toBe(0)
    expect(store.getArticle(art.id)).toBeNull()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/main/reading/store.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement store.ts**

Create `src/main/reading/store.ts`:
```ts
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Article, PracticeRecord } from '../../shared/reading/article'

export interface ArticleSummary {
  readonly id: string
  readonly title: string
  readonly source: string
  readonly sourceType: Article['sourceType']
  readonly paragraphCount: number
  readonly highlightCount: number
  readonly updatedAt: number
  readonly lastPractice?: PracticeRecord | null
}

export interface ReadingStore {
  readonly listArticles: () => readonly ArticleSummary[]
  readonly getArticle: (id: string) => Article | null
  readonly saveArticle: (article: Article) => void
  readonly deleteArticle: (id: string) => boolean
  readonly savePracticeRecord: (record: PracticeRecord) => void
}

export function createReadingStore(baseDir: string): ReadingStore {
  const storeDir = join(baseDir, 'orbis-reading')
  if (!existsSync(storeDir)) {
    mkdirSync(storeDir, { recursive: true })
  }

  const articlesFile = join(storeDir, 'articles.json')

  function readArticles(): Record<string, Article> {
    if (!existsSync(articlesFile)) return {}
    try {
      return JSON.parse(readFileSync(articlesFile, 'utf8')) as Record<string, Article>
    } catch {
      return {}
    }
  }

  function writeArticles(data: Record<string, Article>): void {
    const tmp = `${articlesFile}.${Date.now()}.tmp`
    writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8')
    renameSync(tmp, articlesFile)
  }

  return {
    listArticles(): readonly ArticleSummary[] {
      const all = readArticles()
      return Object.values(all)
        .map((art) => ({
          id: art.id,
          title: art.title,
          source: art.source,
          sourceType: art.sourceType,
          paragraphCount: art.paragraphs.length,
          highlightCount: art.highlights.length,
          updatedAt: art.updatedAt,
          lastPractice: art.lastPractice,
        }))
        .sort((a, b) => b.updatedAt - a.updatedAt)
    },

    getArticle(id: string): Article | null {
      const all = readArticles()
      return all[id] ?? null
    },

    saveArticle(article: Article): void {
      const all = readArticles()
      all[article.id] = { ...article, updatedAt: Date.now() }
      writeArticles(all)
    },

    deleteArticle(id: string): boolean {
      const all = readArticles()
      if (all[id] === undefined) return false
      delete all[id]
      writeArticles(all)
      return true
    },

    savePracticeRecord(record: PracticeRecord): void {
      const all = readArticles()
      const art = all[record.articleId]
      if (art) {
        all[record.articleId] = {
          ...art,
          lastPractice: record,
          updatedAt: Date.now(),
        }
        writeArticles(all)
      }
    },
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/main/reading/store.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/main/reading/store.ts src/main/reading/store.test.ts
git commit -m "feat(reading): implement local storage for articles, highlights, and practice history"
```

---

## Task 5: IPC Channels, Preload Bridge & Main Process Wiring (Without Secret Leaks)

**Files:**
- Create: `src/main/reading/ipc.ts`
- Create: `src/main/reading/ipc.test.ts`
- Modify: `src/shared/ipc.ts`
- Modify: `src/shared/history-window.ts`
- Modify: `src/preload/index.ts`
- Modify: `src/main/index.ts`

- [ ] **Step 1: Write failing IPC test**

Create `src/main/reading/ipc.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { isReadingChannel } from '../../shared/ipc'

describe('Reading IPC Channels allowlist', () => {
  it('identifies valid reading channels and rejects others', () => {
    expect(isReadingChannel('reading:articles:list')).toBe(true)
    expect(isReadingChannel('reading:article:get')).toBe(true)
    expect(isReadingChannel('reading:article:save')).toBe(true)
    expect(isReadingChannel('reading:import:file')).toBe(true)
    expect(isReadingChannel('reading:import:url')).toBe(true)
    expect(isReadingChannel('reading:voice:open')).toBe(true)
    expect(isReadingChannel('reading:voice:sdp')).toBe(true)
    expect(isReadingChannel('reading:open')).toBe(true)
    expect(isReadingChannel('voice:sdp')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/main/reading/ipc.test.ts`
Expected: FAIL (`isReadingChannel is not exported`)

- [ ] **Step 3: Implement secure IPC handlers and preload bridge**

1. In `src/shared/ipc.ts`:
   Add `READING_CHANNELS` and `isReadingChannel`:
```ts
export const READING_CHANNELS = new Set([
  'reading:articles:list',
  'reading:article:get',
  'reading:article:save',
  'reading:article:delete',
  'reading:import:file',
  'reading:import:url',
  'reading:practice:save',
  'reading:voice:open',
  'reading:voice:sdp',
  'reading:open',
])

export function isReadingChannel(channel: string): boolean {
  return READING_CHANNELS.has(channel)
}
```

2. In `src/shared/history-window.ts`:
   Add `openReading(): void` to `MochiHistoryApi` interface.

3. Create `src/main/reading/ipc.ts`:
   Follows Mochi's `mintSlot` pattern so that **ephemeral keys NEVER cross to the renderer**:
```ts
import { dialog, ipcMain } from 'electron'
import { readFileSync } from 'node:fs'
import type { ReadingStore } from './store'
import { extractHtmlArticle, extractMarkdownOrTxt, parsePdfTextLayer } from './importer'
import { createArticleFromText, type Article, type PracticeRecord } from '../../shared/reading/article'
import { mintEphemeralKey, readBearer, exchangeSdp, type Minted } from '../voice/credential'
import { createMintSlot } from '../voice/mint-slot'

export function registerReadingIpc(deps: {
  readonly store: ReadingStore
  readonly openReadingWindow: () => void
}): void {
  const mintSlot = createMintSlot()

  ipcMain.handle('reading:articles:list', () => deps.store.listArticles())

  ipcMain.handle('reading:article:get', (_e, id: string) => deps.store.getArticle(id))

  ipcMain.handle('reading:article:save', (_e, article: Article) => {
    deps.store.saveArticle(article)
    return { ok: true }
  })

  ipcMain.handle('reading:article:delete', (_e, id: string) => {
    return deps.store.deleteArticle(id)
  })

  ipcMain.handle('reading:practice:save', (_e, record: PracticeRecord) => {
    deps.store.savePracticeRecord(record)
    return { ok: true }
  })

  ipcMain.handle('reading:import:file', async () => {
    const res = await dialog.showOpenDialog({
      title: 'Open English Article',
      properties: ['openFile'],
      filters: [
        { name: 'Documents', extensions: ['md', 'markdown', 'txt', 'pdf'] },
      ],
    })
    if (res.canceled || !res.filePaths[0]) return null
    const filePath = res.filePaths[0]
    const ext = filePath.split('.').pop()?.toLowerCase() ?? ''

    if (ext === 'pdf') {
      const buffer = readFileSync(filePath)
      const extracted = await parsePdfTextLayer(buffer, filePath)
      const article = createArticleFromText({
        title: extracted.title,
        source: filePath,
        sourceType: 'pdf',
        text: extracted.text,
      })
      deps.store.saveArticle(article)
      return article
    } else {
      const content = readFileSync(filePath, 'utf8')
      const extracted = extractMarkdownOrTxt(content, filePath)
      const article = createArticleFromText({
        title: extracted.title,
        source: filePath,
        sourceType: ext === 'txt' ? 'txt' : 'markdown',
        text: extracted.text,
      })
      deps.store.saveArticle(article)
      return article
    }
  })

  ipcMain.handle('reading:import:url', async (_e, url: string) => {
    const res = await globalThis.fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      },
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) {
      throw new Error(`Failed to fetch web page: HTTP ${res.status}`)
    }
    const html = await res.text()
    const extracted = extractHtmlArticle(html, url)
    const article = createArticleFromText({
      title: extracted.title,
      source: url,
      sourceType: 'url',
      text: extracted.text,
    })
    deps.store.saveArticle(article)
    return article
  })

  // Secure voice credentials: Main retains key in mintSlot; renderer only holds opaque session token!
  ipcMain.handle('reading:voice:open', async () => {
    const bearer = readBearer()
    if (!bearer.ok) return { ok: false, problem: bearer.problem }
    const minted = await mintEphemeralKey({ bearer: bearer.value })
    if (!minted.ok) return { ok: false, problem: minted.problem }
    const token = mintSlot.hold(minted.value)
    return { ok: true, session: token, model: minted.value.model }
  })

  ipcMain.handle('reading:voice:sdp', async (_e, offer: string, sessionToken: string) => {
    const claim = mintSlot.claim(sessionToken)
    if (!claim.ok) return { ok: false, problem: { kind: 'unreachable', why: 'Session token invalid or expired' } }
    return await exchangeSdp({
      offer,
      minted: claim.value,
    })
  })

  ipcMain.on('reading:open', () => {
    deps.openReadingWindow()
  })
}
```

4. Update `src/preload/index.ts`:
   - Add `'reading'` to `ROLES`.
   - Expose `window.orbisReading`:
```ts
const guardReading = guarding('reading', isReadingChannel)

const readingApi = {
  async listArticles() {
    return await ipcRenderer.invoke(guardReading('reading:articles:list'))
  },
  async getArticle(id: string) {
    return await ipcRenderer.invoke(guardReading('reading:article:get'), id)
  },
  async saveArticle(article: any) {
    return await ipcRenderer.invoke(guardReading('reading:article:save'), article)
  },
  async deleteArticle(id: string) {
    return await ipcRenderer.invoke(guardReading('reading:article:delete'), id)
  },
  async importFile() {
    return await ipcRenderer.invoke(guardReading('reading:import:file'))
  },
  async importUrl(url: string) {
    return await ipcRenderer.invoke(guardReading('reading:import:url'), url)
  },
  async savePractice(record: any) {
    return await ipcRenderer.invoke(guardReading('reading:practice:save'), record)
  },
  async openVoice() {
    return await ipcRenderer.invoke(guardReading('reading:voice:open'))
  },
  async sdp(offer: string, sessionToken: string) {
    return await ipcRenderer.invoke(guardReading('reading:voice:sdp'), offer, sessionToken)
  },
}

if (role === 'reading') {
  contextBridge.exposeInMainWorld('orbisReading', readingApi)
}

// In history API:
history.openReading = () => {
  ipcRenderer.send('reading:open')
}
```

5. In `src/main/index.ts`:
   - Import `createReadingStore` and `registerReadingIpc`.
   - Wire in main process startup:
```ts
const readingStore = createReadingStore(app.getPath('userData'))
registerReadingIpc({
  store: readingStore,
  openReadingWindow: () => showReadingWindow(),
})
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/main/reading/ipc.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/shared/ipc.ts src/shared/history-window.ts src/main/reading/ipc.ts src/main/reading/ipc.test.ts src/preload/index.ts src/main/index.ts
git commit -m "feat(reading): implement secure main-held voice credentials and register reading IPC handlers"
```

---

## Task 6: Realtime Voice Session with Manual Turn Control, Frame Reuse & Debouncing

**Files:**
- Create: `src/renderer/reading/audio/reading-session.ts`
- Create: `src/renderer/reading/audio/reading-session.test.ts`

- [ ] **Step 1: Write failing test for session state transitions**

Create `src/renderer/reading/audio/reading-session.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { buildRetellingSessionConfig } from './reading-session'

describe('Reading voice session configuration', () => {
  it('configures turn detection with server_vad and response creation disabled', () => {
    const config = buildRetellingSessionConfig({
      instructions: 'Review user retelling.',
    })

    const session = (config as any).session
    expect(session.audio.input.turn_detection.create_response).toBe(false)
    expect(session.audio.input.turn_detection.interrupt_response).toBe(false)
    expect(session.instructions).toBe('Review user retelling.')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/renderer/reading/audio/reading-session.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement reading-session.ts with frames.ts parser and session.updated gate**

Create `src/renderer/reading/audio/reading-session.ts`:
```ts
import { parseServerFrame } from '../../../shared/realtime/frames'

export interface RetellingSessionOptions {
  readonly instructions: string
  readonly voice?: string
}

export function buildRetellingSessionConfig(options: RetellingSessionOptions): unknown {
  return {
    type: 'session.update',
    session: {
      type: 'realtime',
      instructions: options.instructions,
      output_modalities: ['audio'],
      audio: {
        output: { voice: options.voice ?? 'ballad' },
        input: {
          noise_reduction: { type: 'far_field' },
          turn_detection: {
            type: 'server_vad',
            create_response: false,
            interrupt_response: false,
          },
        },
      },
    },
  }
}

export type RetellingState =
  | 'idle'
  | 'opening'
  | 'configuring'
  | 'ready'
  | 'recording'
  | 'evaluating'
  | 'responding'
  | 'closed'
  | { readonly error: string }

export interface RetellingSessionHandlers {
  readonly onStateChange: (state: RetellingState) => void
  readonly onTranscriptDelta: (delta: string) => void
  readonly onTranscriptDone: (fullText: string) => void
  readonly onAudioStream: (stream: MediaStream) => void
}

export interface ReadingVoiceSession {
  readonly startRecording: () => void
  readonly finishSpeaking: (instructionsOverride?: string) => boolean
  readonly stopPlayback: () => void
  readonly close: () => void
}

export async function openReadingVoiceSession(
  handlers: RetellingSessionHandlers,
  initialInstructions: string,
): Promise<ReadingVoiceSession> {
  handlers.onStateChange('opening')

  const openRes = await (window as any).orbisReading.openVoice()
  if (!openRes.ok) {
    const err = openRes.problem ? JSON.stringify(openRes.problem) : 'Failed to obtain voice session'
    handlers.onStateChange({ error: err })
    throw new Error(err)
  }

  const sessionToken = openRes.session

  const localStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  })

  // Start with mic tracks disabled until user explicitly clicks "Start Retelling"
  localStream.getAudioTracks().forEach((t) => {
    t.enabled = false
  })

  const pc = new RTCPeerConnection()
  const remoteStream = new MediaStream()
  handlers.onAudioStream(remoteStream)

  pc.ontrack = (event) => {
    remoteStream.addTrack(event.track)
  }

  localStream.getAudioTracks().forEach((track) => pc.addTrack(track, localStream))

  const channel = pc.createDataChannel('oai-events')
  let currentTranscript = ''
  let configured = false
  let isRecording = false
  let isEvaluating = false
  let hasUserSpokenAudio = false

  channel.onmessage = (event) => {
    if (typeof event.data !== 'string') return
    const raw = JSON.parse(event.data)

    // Acknowledge session.updated before opening for recording
    if (raw.type === 'session.updated') {
      configured = true
      handlers.onStateChange('ready')
      return
    }

    // Reuse battle-tested frames.ts parser for typed server frames
    const frame = parseServerFrame(event.data)

    if (frame.kind === 'saying') {
      currentTranscript += frame.delta
      handlers.onTranscriptDelta(frame.delta)
    } else if (frame.kind === 'said') {
      handlers.onTranscriptDone(frame.transcript || currentTranscript)
      isEvaluating = false
      handlers.onStateChange('ready')
    } else if (frame.kind === 'audio-buffer' && frame.phase === 'started') {
      handlers.onStateChange('responding')
    } else if (frame.kind === 'error') {
      isEvaluating = false
      handlers.onStateChange({ error: frame.message ?? 'Voice service error' })
    }
  }

  channel.onopen = () => {
    handlers.onStateChange('configuring')
    channel.send(
      JSON.stringify(
        buildRetellingSessionConfig({
          instructions: initialInstructions,
        }),
      ),
    )
  }

  const offer = await pc.createOffer()
  await pc.setLocalDescription(offer)

  const sdpRes = await (window as any).orbisReading.sdp(offer.sdp, sessionToken)
  if (!sdpRes.ok) {
    localStream.getTracks().forEach((t) => t.stop())
    pc.close()
    const err = 'Failed to establish SDP with voice service'
    handlers.onStateChange({ error: err })
    throw new Error(err)
  }

  await pc.setRemoteDescription({ type: 'answer', sdp: sdpRes.value })

  return {
    startRecording() {
      if (!configured) {
        console.warn('[reading] Waiting for session.updated before recording')
        return
      }
      currentTranscript = ''
      isEvaluating = false
      hasUserSpokenAudio = true
      localStream.getAudioTracks().forEach((t) => {
        t.enabled = true
      })
      isRecording = true
      handlers.onStateChange('recording')
    },

    finishSpeaking(instructionsOverride?: string): boolean {
      if (!isRecording || isEvaluating) return false
      if (!hasUserSpokenAudio) {
        handlers.onStateChange({ error: 'No speech was recorded. Please speak before submitting.' })
        return false
      }

      isRecording = false
      isEvaluating = true

      // Mute microphone immediately to prevent feedback/speaker echo
      localStream.getAudioTracks().forEach((t) => {
        t.enabled = false
      })
      handlers.onStateChange('evaluating')

      // Commit trailing audio buffer
      channel.send(JSON.stringify({ type: 'input_audio_buffer.commit' }))

      // Send manual response.create
      const responseEvent: any = {
        type: 'response.create',
        response: {
          output_modalities: ['audio', 'text'],
        },
      }
      if (instructionsOverride) {
        responseEvent.response.instructions = instructionsOverride
      }
      channel.send(JSON.stringify(responseEvent))
      return true
    },

    stopPlayback() {
      remoteStream.getAudioTracks().forEach((t) => {
        t.enabled = false
      })
    },

    close() {
      localStream.getTracks().forEach((t) => t.stop())
      pc.close()
      handlers.onStateChange('closed')
    },
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/renderer/reading/audio/reading-session.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/renderer/reading/audio/
git commit -m "feat(reading): implement manual-turn WebRTC Realtime voice session with frames.ts reuse and session.updated gate"
```

---

## Task 7: Window Setup, Electron Vite Entry & Navigation Integration

**Files:**
- Create: `src/renderer/reading/index.html`
- Modify: `electron.vite.config.ts`
- Modify: `src/main/window.ts`
- Modify: `src/main/tray.ts`
- Modify: `src/main/index.ts`
- Modify: `src/renderer/history/parts/rail.ts`
- Modify: `src/renderer/history/index.html`
- Test: `src/main/tray.test.ts`

- [ ] **Step 1: Write test for Tray menu containing Reading item**

Update `src/main/tray.test.ts` to assert that the tray menu model and template include "Reading & Retelling…".

- [ ] **Step 2: Update electron.vite.config.ts to add reading entry**

In `electron.vite.config.ts`:
```ts
        input: {
          companion: fileURLToPath(new URL('./src/renderer/companion/index.html', import.meta.url)),
          history: fileURLToPath(new URL('./src/renderer/history/index.html', import.meta.url)),
          reading: fileURLToPath(new URL('./src/renderer/reading/index.html', import.meta.url)),
        },
```

- [ ] **Step 3: Update window.ts types and implement showReadingWindow()**

In `src/main/window.ts`:
1. Update `bridgeFor`:
   ```ts
   function bridgeFor(role: 'companion' | 'history' | 'reading'): Electron.WebPreferences
   ```
2. Update `loadRenderer`:
   ```ts
   function loadRenderer(window: BrowserWindow, page: 'companion' | 'history' | 'reading'): void
   ```
3. Add `let reading: BrowserWindow | null = null`.
4. Add `showReadingWindow(): BrowserWindow`:
   - Size: 1200x800, minWidth 980, minHeight 640.
   - Background color matching theme (`nativeTheme.shouldUseDarkColors ? '#08080a' : '#ffffff'`).
   - Web preferences: `bridgeFor('reading')`.
   - Title: `Orbis — Reading & Retelling`.
   - Cleanup on `closed`: `reading = null`.
   - Calls `loadRenderer(window, 'reading')`.

- [ ] **Step 4: Add Reading & Retelling triggers in Tray and Shell Rail**

- In `src/main/tray.ts`: add `{ label: 'Reading & Retelling…', click: handlers.onOpenReading }`.
- In `src/main/index.ts`: wire `menuHandlers.onOpenReading = () => showReadingWindow()`.
- In `src/renderer/history/parts/rail.ts` and `src/renderer/history/index.html`: add a dedicated button in the rail footer to call `window.orbisHistory.openReading()` (or `window.mochiHistory.openReading()`).

- [ ] **Step 5: Run tray test and typecheck to verify they pass**

Run: `pnpm vitest run src/main/tray.test.ts` and `pnpm typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add electron.vite.config.ts src/main/window.ts src/main/tray.ts src/main/tray.test.ts src/main/index.ts src/renderer/history/parts/rail.ts src/renderer/history/index.html
git commit -m "feat(reading): add reading window setup, Vite entry, and tray/rail triggers"
```

---

## Task 8: Reading & Retelling User Interface Implementation

**Files:**
- Create: `src/renderer/reading/index.html`
- Create: `src/renderer/reading/style.css`
- Create: `src/renderer/reading/main.ts`
- Create: `src/renderer/reading/components/home-view.ts`
- Create: `src/renderer/reading/components/article-view.ts`
- Create: `src/renderer/reading/components/retelling-view.ts`
- Create: `src/renderer/reading/components/feedback-view.ts`
- Create: `src/renderer/reading/reading-views.test.ts`

- [ ] **Step 1: Write failing view rendering tests**

Create `src/renderer/reading/reading-views.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { renderKeywordsSummary } from './components/retelling-view'
import { createArticleFromText, addHighlight } from '../../shared/reading/article'

describe('Retelling keyword rendering', () => {
  it('renders only the keywords for highlighted paragraphs and neutral labels for unhighlighted paragraphs', () => {
    let art = createArticleFromText({
      title: 'Planets',
      source: 'planets.txt',
      sourceType: 'txt',
      text: 'Mars is known as the red planet.\n\nVenus has a thick greenhouse atmosphere.',
    })
    art = addHighlight(art, {
      paragraphIndex: 0,
      startOffset: 0,
      endOffset: 4,
      text: 'Mars',
    })

    const html = renderKeywordsSummary(art, { startParagraph: 0, endParagraph: 1 })
    expect(html).toContain('Mars')
    expect(html).not.toContain('red planet')
    expect(html).toContain('Paragraph 2')
    expect(html).toContain('No keywords marked')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run src/renderer/reading/reading-views.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement index.html, style.css, and view components**

1. Create `src/renderer/reading/index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Orbis — Reading & Retelling</title>
    <link rel="stylesheet" href="../design/tokens.css" />
    <link rel="stylesheet" href="./style.css" />
  </head>
  <body>
    <div id="app" class="app-root"></div>
    <audio id="remote-audio" autoplay></audio>
    <script type="module" src="./main.ts"></script>
  </body>
</html>
```

2. Create `src/renderer/reading/style.css` with clean layout, distraction-free typography, highlight styles, audio recording waveforms, and feedback card.
3. Create `src/renderer/reading/components/home-view.ts`:
   - "Open File", "Paste Link", "Paste Text" buttons.
   - Recent Articles list with title, excerpt, date, practice status.
4. Create `src/renderer/reading/components/article-view.ts`:
   - Full text reading canvas.
   - Word/phrase selection handler: highlights selected text on mouseup, creates highlight with exact character offset within paragraph without DOM text node corruption.
   - Clicking marked highlight removes it.
   - Paragraph range selector (Practice all or select start/end paragraphs).
   - "Start Retelling" action button.
5. Create `src/renderer/reading/components/retelling-view.ts`:
   - Full text completely hidden.
   - Shows keyword list ordered by paragraph.
   - Big microphone button ("Start Speaking" -> recording state with audio pulse).
   - "Finished Speaking" (说完了) action button with empty-audio warning.
6. Create `src/renderer/reading/components/feedback-view.ts`:
   - Voice feedback playback control ("Stop Voice").
   - Live streaming text transcript box.
   - "Try Again" (clears feedback, resets to keywords view for another round).
   - "Return to Article" (returns to text view).
   - "Finish Practice" (saves practice completion to local storage and returns to home).
7. Create `src/renderer/reading/main.ts`:
   - Orchestrates the state machine: `home` ↔ `reading` ↔ `retelling` ↔ `feedback`.
   - Registers `window.addEventListener('beforeunload', () => session?.close())` to prevent microphone leaks.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm vitest run src/renderer/reading/reading-views.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/renderer/reading/
git commit -m "feat(reading): implement Reading & Retelling UI views and components"
```

---

## Task 9: Verification, Typecheck, Lint & Build

- [ ] **Step 1: Run all unit tests**

Run: `pnpm test`
Expected: All tests pass.

- [ ] **Step 2: Run TypeScript typecheck**

Run: `pnpm typecheck`
Expected: No type errors.

- [ ] **Step 3: Run linter and formatting check**

Run: `pnpm lint` and `pnpm format:check`
Expected: Clean lint and formatting.

- [ ] **Step 4: Build project with electron-vite**

Run: `pnpm build`
Expected: Successful build creating `out/main`, `out/preload`, and `out/renderer` (including `out/renderer/reading/index.html`).

- [ ] **Step 5: Final review and commit**

```bash
git add -A
git commit -m "chore(release): complete Orbis rebranding and Reading & Retelling implementation"
```
