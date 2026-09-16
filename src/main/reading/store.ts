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
    const tmp = `${articlesFile}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}.tmp`
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
      all[article.id] = { ...article, updatedAt: article.updatedAt || Date.now() }
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
