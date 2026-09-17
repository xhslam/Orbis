import type { ArticleSummary } from '@shared/reading/article'
import { getLanguage, t } from '../../i18n'

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export interface HomeViewProps {
  readonly articles: readonly ArticleSummary[]
  readonly onSelectArticle: (id: string) => void
  readonly onDeleteArticle: (id: string) => void
  readonly onImportFile: () => void
  readonly onImportUrl: (url: string) => void
  readonly onPasteText: (title: string, text: string) => void
}

export function renderHomeView(props: HomeViewProps, container: HTMLElement): void {
  const hasArticles = props.articles.length > 0
  const i18n = t()
  const isZh = getLanguage() === 'zh'
  const locale = isZh ? 'zh-CN' : 'en-US'

  const rows = props.articles
    .map((art) => {
      const date = new Date(art.updatedAt).toLocaleDateString(locale, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
      const practiceBadge = art.lastPractice?.isCompleted
        ? `<span class="badge badge-success">${i18n.badgeRetold}</span>`
        : `<span class="badge badge-neutral">${i18n.badgeNew}</span>`

      return `
        <tr class="article-row" data-id="${art.id}">
          <td class="article-title-cell">
            <button type="button" class="article-title-btn" data-id="${art.id}">
              ${escapeHtml(art.title)}
            </button>
            <div class="article-source-meta">${escapeHtml(art.source)}</div>
          </td>
          <td class="article-type-cell">
            <span class="type-pill type-${art.sourceType}">${art.sourceType.toUpperCase()}</span>
          </td>
          <td class="article-stats-cell">
            ${i18n.articleStats(art.paragraphCount, art.highlightCount)}
          </td>
          <td class="article-status-cell">
            ${practiceBadge}
            <span class="date-text">${date}</span>
          </td>
          <td class="article-actions-cell">
            <button type="button" class="btn btn-sm btn-ghost delete-btn" data-id="${art.id}" title="${escapeHtml(i18n.deleteArticleTooltip)}">
              ${i18n.delete}
            </button>
          </td>
        </tr>
      `
    })
    .join('\n')

  container.innerHTML = `
    <div class="home-container">
      <header class="home-header">
        <div class="home-brand">
          <h1 class="brand-title">${i18n.readingAppTitle}</h1>
          <p class="brand-subtitle">${i18n.readingAppSubtitle}</p>
        </div>

        <div class="action-bar">
          <button type="button" class="btn btn-primary" id="btn-import-file">
            ${i18n.importDoc}
          </button>
          <button type="button" class="btn btn-secondary" id="btn-import-url">
            ${i18n.importWeb}
          </button>
          <button type="button" class="btn btn-secondary" id="btn-paste-text">
            ${i18n.pasteText}
          </button>
        </div>
      </header>

      <main class="home-main">
        ${
          !hasArticles
            ? `
          <div class="empty-state">
            <div class="empty-icon">📖</div>
            <h2 class="empty-title">${i18n.emptyTitle}</h2>
            <p class="empty-desc">${i18n.emptyDesc}</p>
            <button type="button" class="btn btn-primary" id="btn-empty-import">${i18n.importFirst}</button>
          </div>
        `
            : `
          <div class="table-card">
            <table class="article-table">
              <thead>
                <tr>
                  <th>${i18n.colTitleSource}</th>
                  <th>${i18n.colFormat}</th>
                  <th>${i18n.colLength}</th>
                  <th>${i18n.colStatus}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                ${rows}
              </tbody>
            </table>
          </div>
        `
        }
      </main>

      <!-- URL Import Modal -->
      <dialog id="url-modal" class="modal-dialog">
        <form method="dialog" class="modal-card">
          <h2 class="modal-title">${i18n.urlModalTitle}</h2>
          <p class="modal-desc">${i18n.urlModalDesc}</p>
          <input type="url" id="url-input" class="text-input" placeholder="${i18n.urlPlaceholder}" required />
          <div class="modal-buttons">
            <button type="button" class="btn btn-ghost" id="url-cancel">${i18n.cancel}</button>
            <button type="submit" class="btn btn-primary" id="url-submit">${i18n.importAction}</button>
          </div>
        </form>
      </dialog>

      <!-- Paste Text Modal -->
      <dialog id="paste-modal" class="modal-dialog">
        <form method="dialog" class="modal-card modal-card-wide">
          <h2 class="modal-title">${i18n.pasteModalTitle}</h2>
          <div class="form-group">
            <label for="paste-title" class="form-label">${i18n.pasteTitleLabel}</label>
            <input type="text" id="paste-title" class="text-input" placeholder="${i18n.pasteTitlePlaceholder}" />
          </div>
          <div class="form-group">
            <label for="paste-content" class="form-label">${i18n.pasteContentLabel}</label>
            <textarea id="paste-content" class="textarea-input" rows="10" placeholder="${i18n.pastePlaceholder}" required></textarea>
          </div>
          <div class="modal-buttons">
            <button type="button" class="btn btn-ghost" id="paste-cancel">${i18n.cancel}</button>
            <button type="submit" class="btn btn-primary" id="paste-submit">${i18n.pasteSubmit}</button>
          </div>
        </form>
      </dialog>
    </div>
  `

  // Wire import file
  const handleImportFile = () => props.onImportFile()
  container.querySelector('#btn-import-file')?.addEventListener('click', handleImportFile)
  container.querySelector('#btn-empty-import')?.addEventListener('click', handleImportFile)

  // Wire URL modal
  const urlModal = container.querySelector('#url-modal') as HTMLDialogElement | null
  const urlInput = container.querySelector('#url-input') as HTMLInputElement | null
  container.querySelector('#btn-import-url')?.addEventListener('click', () => {
    if (urlInput) urlInput.value = ''
    urlModal?.showModal()
  })
  container.querySelector('#url-cancel')?.addEventListener('click', () => urlModal?.close())
  urlModal?.addEventListener('submit', (e) => {
    e.preventDefault()
    const url = urlInput?.value.trim()
    if (url) {
      urlModal.close()
      props.onImportUrl(url)
    }
  })

  // Wire Paste text modal
  const pasteModal = container.querySelector('#paste-modal') as HTMLDialogElement | null
  const pasteTitle = container.querySelector('#paste-title') as HTMLInputElement | null
  const pasteContent = container.querySelector('#paste-content') as HTMLTextAreaElement | null
  container.querySelector('#btn-paste-text')?.addEventListener('click', () => {
    if (pasteTitle) pasteTitle.value = ''
    if (pasteContent) pasteContent.value = ''
    pasteModal?.showModal()
  })
  container.querySelector('#paste-cancel')?.addEventListener('click', () => pasteModal?.close())
  pasteModal?.addEventListener('submit', (e) => {
    e.preventDefault()
    const title = pasteTitle?.value.trim() || i18n.pastedDefaultTitle
    const content = pasteContent?.value.trim() ?? ''
    if (content.length > 0) {
      pasteModal.close()
      props.onPasteText(title, content)
    }
  })

  // Wire article clicks
  container.querySelectorAll('.article-title-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = (btn as HTMLElement).dataset.id
      if (id) props.onSelectArticle(id)
    })
  })

  // Wire article deletion
  container.querySelectorAll('.delete-btn').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const id = (btn as HTMLElement).dataset.id
      if (id && confirm(i18n.confirmDeleteArticle)) {
        props.onDeleteArticle(id)
      }
    })
  })
}
