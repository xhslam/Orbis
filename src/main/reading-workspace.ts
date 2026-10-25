import { app, BrowserWindow, ipcMain } from 'electron'
import type { IpcMainInvokeEvent } from 'electron'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import {
  isReadingMode,
  WORKSPACE_CHANNELS,
  type PaperToRetellPayload,
  type RetellToPaperCardPayload,
} from '../shared/reading-workspace'
import {
  addHighlight,
  createArticleFromText,
} from '../shared/reading/article'
import type { ReadingStore } from './reading/store'
import { registeredPaperRole, trustedPaperUrl } from './paper/trust'
import { getReadingMode, getReadingWorkspace, setReadingMode, showReadingWindow } from './window'

let registered = false
let activeStore: ReadingStore | null = null

export function setReadingWorkspaceStore(store: ReadingStore): void {
  activeStore = store
}

export function registerReadingWorkspaceIpc(deps?: { store?: ReadingStore }): void {
  if (deps?.store) activeStore = deps.store
  if (registered) return
  registered = true

  function trusted(
    event: IpcMainInvokeEvent,
    allowedRoles: readonly ('reading' | 'history' | 'paper')[] = ['reading', 'history'],
  ): { wc: Electron.WebContents; owner: BrowserWindow; role: 'reading' | 'history' | 'paper' } {
    const wc = event.sender
    const ws = getReadingWorkspace()
    const owner = BrowserWindow.fromWebContents(wc) ?? (ws?.getOwner() ?? null)
    const role = registeredPaperRole(wc)
    if (
      !owner ||
      owner.isDestroyed() ||
      wc.isDestroyed() ||
      event.senderFrame !== wc.mainFrame ||
      !role ||
      !allowedRoles.includes(role) ||
      !trustedPaperUrl(
        wc.mainFrame.url,
        role,
        join(__dirname, '../renderer'),
        app.isPackaged ? undefined : process.env['ELECTRON_RENDERER_URL'],
      )
    ) {
      throw new Error('workspace: untrusted sender')
    }
    return { wc, owner, role }
  }

  ipcMain.handle(WORKSPACE_CHANNELS.open, (event, mode: unknown) => {
    trusted(event, ['reading', 'history'])
    if (!isReadingMode(mode)) throw new Error('workspace: invalid mode')
    showReadingWindow(mode)
  })

  ipcMain.handle(WORKSPACE_CHANNELS.setMode, (event, mode: unknown) => {
    trusted(event, ['reading'])
    if (!isReadingMode(mode)) throw new Error('workspace: invalid mode')
    setReadingMode(mode)
  })

  ipcMain.handle(WORKSPACE_CHANNELS.getMode, (event) => {
    trusted(event, ['reading', 'history'])
    return getReadingMode()
  })

  // Forward Link: Paper passage/mark -> Orbis Retell Article
  ipcMain.handle(WORKSPACE_CHANNELS.sendToRetell, async (event, payload: unknown) => {
    trusted(event, ['paper'])
    const p = payload as PaperToRetellPayload | null
    if (!p || typeof p.text !== 'string' || !p.text.trim() || !p.origin) {
      throw new Error('workspace: invalid sendToRetell payload')
    }

    let article = createArticleFromText({
      title: p.title || p.origin.bookTitle || 'Untitled Excerpt',
      source: p.origin.bookTitle || p.origin.chapter || 'Paper Reader',
      sourceType: 'paper',
      text: p.text,
      origin: p.origin,
    })

    // Auto-map existing highlights into article paragraph keywords
    if (Array.isArray(p.highlights) && p.highlights.length > 0) {
      for (const hl of p.highlights) {
        if (typeof hl !== 'string' || !hl.trim()) continue
        const target = hl.trim()
        for (const para of article.paragraphs) {
          let pos = 0
          while (pos < para.text.length) {
            const idx = para.text.indexOf(target, pos)
            if (idx === -1) break
            article = addHighlight(article, {
              paragraphIndex: para.index,
              startOffset: idx,
              endOffset: idx + target.length,
              text: target,
            })
            pos = idx + target.length
          }
        }
      }
    }

    activeStore?.saveArticle(article)

    // Switch workspace mode to retell and open the article
    const ws = getReadingWorkspace()
    if (ws) {
      ws.setMode('retell')
      const owner = ws.getOwner()
      if (!owner.isDestroyed()) {
        owner.webContents.send(WORKSPACE_CHANNELS.openArticle, article.id)
      }
    }

    return { ok: true, articleId: article.id }
  })

  // Reverse Link: Retell feedback -> Paper in-memory Card (Strict Single-Writer)
  async function handleSaveToPaperCard(
    event: IpcMainInvokeEvent,
    payload: unknown,
  ): Promise<{ ok: boolean; cardId?: string; error?: string }> {
    trusted(event, ['reading'])
    const p = payload as RetellToPaperCardPayload | null
    if (!p || typeof p.body !== 'string') {
      return { ok: false, error: 'Invalid RetellToPaperCardPayload' }
    }

    const ws = getReadingWorkspace()
    if (!ws) {
      return { ok: false, error: 'Reading workspace not active' }
    }

    const paperWc = ws.getPaperWebContents()
    if (!paperWc || paperWc.isDestroyed()) {
      return { ok: false, error: 'Paper view unavailable' }
    }

    if (paperWc.isLoading()) {
      await new Promise<void>((resolve) => {
        const timeout = setTimeout(resolve, 5000)
        paperWc.once('did-finish-load', () => {
          clearTimeout(timeout)
          resolve()
        })
      })
    }

    const requestId = randomUUID()
    return new Promise<{ ok: boolean; cardId?: string; error?: string }>((resolve) => {
      const timer = setTimeout(() => {
        ipcMain.removeListener('workspace:paperCreateCard:reply', onReply)
        resolve({ ok: false, error: 'Timed out waiting for Paper card creation' })
      }, 8000)

      const onReply = (
        _e: Electron.IpcMainEvent,
        id: string,
        res: { ok: boolean; cardId?: string; error?: string },
      ) => {
        if (id === requestId) {
          clearTimeout(timer)
          ipcMain.removeListener('workspace:paperCreateCard:reply', onReply)
          resolve(res)
        }
      }

      ipcMain.on('workspace:paperCreateCard:reply', onReply)
      try {
        paperWc.send(WORKSPACE_CHANNELS.paperCreateCard, requestId, p)
      } catch (err) {
        clearTimeout(timer)
        ipcMain.removeListener('workspace:paperCreateCard:reply', onReply)
        resolve({ ok: false, error: String(err) })
      }
    })
  }

  ipcMain.handle(WORKSPACE_CHANNELS.saveToPaperCard, handleSaveToPaperCard)
  ipcMain.handle('reading:saveToPaperCard', handleSaveToPaperCard)
}
