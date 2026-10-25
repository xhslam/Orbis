import { dialog, ipcMain, BrowserWindow } from 'electron'
import { readFileSync } from 'node:fs'
import type { ReadingStore } from './store'
import { extractHtmlArticle, extractMarkdownOrTxt, parsePdfTextLayer } from './importer'
import {
  createArticleFromText,
  type Article,
  type PracticeRecord,
} from '../../shared/reading/article'
import { describeProblem, exchangeSdp } from '../voice/credential'
import { voiceAccess } from '../voice/access'
import { createMintSlot } from '../voice/mint-slot'

export function registerReadingIpc(deps: {
  readonly store: ReadingStore
  readonly openReadingWindow: () => BrowserWindow | null
  readonly pauseCompanion?: () => void
  readonly resumeCompanion?: () => void
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

  ipcMain.handle('reading:import:file', async (event) => {
    const parentWindow = BrowserWindow.fromWebContents(event.sender) ?? undefined
    const options = {
      title: 'Open English Article',
      properties: ['openFile' as const],
      filters: [{ name: 'Documents', extensions: ['md', 'markdown', 'txt', 'pdf'] }],
    }
    const res = parentWindow
      ? await dialog.showOpenDialog(parentWindow, options)
      : await dialog.showOpenDialog(options)
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
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko)',
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

  ipcMain.handle('reading:voice:open', async () => {
    const minted = await voiceAccess.mint()
    if (!minted.ok) {
      return {
        ok: false,
        problem: { kind: minted.problem.kind, message: describeProblem(minted.problem) },
      }
    }
    const token = mintSlot.hold(minted.value)
    deps.pauseCompanion?.()
    return { ok: true, session: token, model: minted.value.model }
  })

  ipcMain.handle('reading:voice:close', () => {
    deps.resumeCompanion?.()
    return { ok: true }
  })

  ipcMain.handle('reading:voice:sdp', async (_e, offer: string, sessionToken: string) => {
    const claim = mintSlot.claim(sessionToken)
    if (!claim.ok) {
      return {
        ok: false,
        problem: { kind: 'unreachable', why: 'Session token invalid or expired' },
      }
    }
    const exchanged = await exchangeSdp({
      offer,
      minted: claim.value,
    })
    if (!exchanged.ok) {
      return {
        ok: false,
        problem: { kind: exchanged.problem.kind, message: describeProblem(exchanged.problem) },
      }
    }
    return { ok: true, answer: exchanged.value }
  })

  ipcMain.on('reading:open', () => {
    deps.openReadingWindow()
  })
}
