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
    const art2 = {
      ...createArticleFromText({
        title: 'Article Two',
        source: 'two.txt',
        sourceType: 'txt',
        text: 'Second text.',
      }),
      updatedAt: art1.updatedAt + 1000,
    }

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
