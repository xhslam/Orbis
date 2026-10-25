import {
  addHighlight,
  removeHighlight,
  type Article,
  type Highlight,
  type Paragraph,
  type PracticeScope,
} from '@shared/reading/article'
import { t, getLanguage } from '../../i18n'

const TIP_DISMISSED_KEY = 'orbis:reading:keyword-tip-dismissed'
const TIP_SEEN_KEY = 'orbis:reading:keyword-tip-seen'

let tipActiveInSession = false

export function resetTipStateForTesting(): void {
  tipActiveInSession = false
}

function getStorageItem(key: string): string | null {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key)
    }
  } catch {
    // Ignore storage errors
  }
  return null
}

function setStorageItem(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value)
    }
  } catch {
    // Ignore storage errors
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function renderParagraphWithHighlights(
  paragraph: Paragraph,
  highlights: readonly Highlight[],
  removeTitle: string,
): string {
  const pHighlights = highlights
    .filter((h) => h.paragraphIndex === paragraph.index)
    .sort((a, b) => a.startOffset - b.startOffset)

  if (pHighlights.length === 0) {
    return escapeHtml(paragraph.text)
  }

  let result = ''
  let cursor = 0

  for (const h of pHighlights) {
    if (h.startOffset > cursor) {
      result += escapeHtml(paragraph.text.slice(cursor, h.startOffset))
    }
    const chunk = paragraph.text.slice(h.startOffset, h.endOffset)
    result += `<mark class="keyword-highlight" data-highlight-id="${h.id}" title="${escapeHtml(removeTitle)}">${escapeHtml(chunk)}</mark>`
    cursor = h.endOffset
  }

  if (cursor < paragraph.text.length) {
    result += escapeHtml(paragraph.text.slice(cursor))
  }

  return result
}

export interface ArticleViewProps {
  readonly article: Article
  readonly scope?: PracticeScope | undefined
  readonly onScopeChange?: ((scope: PracticeScope) => void) | undefined
  readonly onUpdateArticle: (updated: Article) => void
  readonly onStartRetelling: (scope: PracticeScope) => void
  readonly onBack: () => void
}

export function renderArticleView(props: ArticleViewProps, container: HTMLElement): void {
  const i18n = t()
  const isZh = getLanguage() === 'zh'
  const totalP = props.article.paragraphs.length
  let currentScope: PracticeScope = props.scope ?? {
    startParagraph: 0,
    endParagraph: totalP - 1,
  }

  const isDismissed = getStorageItem(TIP_DISMISSED_KEY) === 'true'
  const isSeen = getStorageItem(TIP_SEEN_KEY) === 'true'
  const showTip = !isDismissed && (!isSeen || tipActiveInSession)
  if (showTip) {
    tipActiveInSession = true
    setStorageItem(TIP_SEEN_KEY, 'true')
  }

  const hintBannerHtml = showTip
    ? `
      <div class="hint-banner" id="reading-hint-banner">
        <span class="hint-banner-text">${i18n.keywordTip}</span>
        <button type="button" class="hint-banner-close" id="close-hint-banner" aria-label="${escapeHtml(i18n.close)}" title="${escapeHtml(i18n.close)}">✕</button>
      </div>
    `
    : ''

  const paragraphCards = props.article.paragraphs
    .map((p) => {
      const pNum = p.index + 1
      const innerHtml = renderParagraphWithHighlights(
        p,
        props.article.highlights,
        i18n.removeHighlightTooltip,
      )
      return `
        <div class="paragraph-block" data-index="${p.index}">
          <div class="paragraph-gutter">
            <span class="p-number">${pNum}</span>
          </div>
          <div class="paragraph-body" data-index="${p.index}">${innerHtml}</div>
        </div>
      `
    })
    .join('\n')

  const highlightCount = props.article.highlights.length

  const isCustom = currentScope.startParagraph !== 0 || currentScope.endParagraph !== totalP - 1

  container.innerHTML = `
    <div class="article-container">
      <header class="view-header">
        <div class="header-left">
          <button type="button" class="btn btn-ghost" id="article-back-btn">${i18n.backToLibrary}</button>
          <div class="header-title-group">
            <h1 class="view-title">${escapeHtml(props.article.title)}</h1>
            <span class="source-tag">${escapeHtml(props.article.source)}</span>
          </div>
        </div>

        <div class="header-right">
          <button type="button" class="btn btn-ghost btn-sm" id="clear-highlights-btn" ${highlightCount === 0 ? 'disabled' : ''}>
            ${i18n.clearHighlights(highlightCount)}
          </button>
          <button type="button" class="btn btn-primary" id="start-retell-btn">
            ${i18n.startRetellingBtn}
          </button>
        </div>
      </header>

      <div class="practice-scope-bar">
        <span class="scope-label">${i18n.practiceScope}</span>
        <label class="scope-option">
          <input type="radio" name="scope-mode" value="all" ${!isCustom ? 'checked' : ''} id="scope-all-radio" />
          ${i18n.allParagraphs(totalP)}
        </label>
        <label class="scope-option">
          <input type="radio" name="scope-mode" value="custom" ${isCustom ? 'checked' : ''} id="scope-custom-radio" />
          ${i18n.customRange}
        </label>
        <div class="scope-range-inputs">
          <span>${i18n.fromParagraph}</span>
          <input type="number" id="scope-start" min="1" max="${totalP}" value="${currentScope.startParagraph + 1}" class="number-input" ${!isCustom ? 'disabled' : ''} />
          <span>${i18n.toParagraph}</span>
          <input type="number" id="scope-end" min="1" max="${totalP}" value="${currentScope.endParagraph + 1}" class="number-input" ${!isCustom ? 'disabled' : ''} />
          ${isZh ? '<span>段</span>' : ''}
        </div>
      </div>

      ${hintBannerHtml}

      <main class="reading-canvas">
        <article class="article-content">
          ${paragraphCards}
        </article>
      </main>
    </div>
  `

  // Wire back button
  container.querySelector('#article-back-btn')?.addEventListener('click', () => {
    tipActiveInSession = false
    props.onBack()
  })

  // Wire close hint banner
  container.querySelector('#close-hint-banner')?.addEventListener('click', () => {
    setStorageItem(TIP_DISMISSED_KEY, 'true')
    setStorageItem(TIP_SEEN_KEY, 'true')
    tipActiveInSession = false
    container.querySelector('#reading-hint-banner')?.remove()
  })

  // Wire scope radio & inputs
  const scopeAll = container.querySelector('#scope-all-radio') as HTMLInputElement | null
  const scopeCustom = container.querySelector('#scope-custom-radio') as HTMLInputElement | null
  const startInput = container.querySelector('#scope-start') as HTMLInputElement | null
  const endInput = container.querySelector('#scope-end') as HTMLInputElement | null

  const updateScope = () => {
    if (scopeAll?.checked) {
      if (startInput) startInput.disabled = true
      if (endInput) endInput.disabled = true
      currentScope = { startParagraph: 0, endParagraph: totalP - 1 }
    } else {
      if (startInput) startInput.disabled = false
      if (endInput) endInput.disabled = false
      const s = Math.max(1, Math.min(totalP, parseInt(startInput?.value || '1', 10))) - 1
      const e =
        Math.max(s + 1, Math.min(totalP, parseInt(endInput?.value || String(totalP), 10))) - 1
      currentScope = { startParagraph: s, endParagraph: e }
    }
    props.onScopeChange?.(currentScope)
  }

  scopeAll?.addEventListener('change', updateScope)
  scopeCustom?.addEventListener('change', updateScope)
  startInput?.addEventListener('input', updateScope)
  endInput?.addEventListener('input', updateScope)

  // Wire start retelling
  container.querySelector('#start-retell-btn')?.addEventListener('click', () => {
    tipActiveInSession = false
    props.onStartRetelling(currentScope)
  })

  // Wire clear highlights
  container.querySelector('#clear-highlights-btn')?.addEventListener('click', () => {
    if (props.article.highlights.length > 0 && confirm(i18n.confirmClearHighlights)) {
      const cleared: Article = {
        ...props.article,
        highlights: [],
        updatedAt: Date.now(),
      }
      props.onUpdateArticle(cleared)
    }
  })

  // Click on existing highlight to remove
  container.querySelectorAll('.keyword-highlight').forEach((mark) => {
    mark.addEventListener('click', (e) => {
      e.stopPropagation()
      const highlightId = (mark as HTMLElement).dataset.highlightId
      if (highlightId) {
        const updated = removeHighlight(props.article, highlightId)
        props.onUpdateArticle(updated)
      }
    })
  })

  // Text selection to add highlight
  const articleContent = container.querySelector('.article-content')
  articleContent?.addEventListener('mouseup', () => {
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed) return

    const range = sel.getRangeAt(0)
    const selectedText = sel.toString().trim()
    if (selectedText.length === 0 || selectedText.length > 80) return

    // Find enclosing paragraph-body element
    let pNode: Node | null = range.commonAncestorContainer
    while (pNode && !(pNode instanceof HTMLElement && pNode.classList.contains('paragraph-body'))) {
      pNode = pNode.parentNode
    }

    if (!pNode || !(pNode instanceof HTMLElement)) return
    const pIndex = parseInt(pNode.dataset.index ?? '-1', 10)
    if (pIndex < 0 || pIndex >= props.article.paragraphs.length) return

    const paragraph = props.article.paragraphs[pIndex]
    if (!paragraph) return

    // Calculate exact offset in paragraph text
    const pText = paragraph.text
    // Use selected text position inside paragraph
    const preSelectionRange = range.cloneRange()
    preSelectionRange.selectNodeContents(pNode)
    preSelectionRange.setEnd(range.startContainer, range.startOffset)
    const startOffset = preSelectionRange.toString().length
    const endOffset = startOffset + selectedText.length

    // Validate that the slice matches selectedText
    const slice = pText.slice(startOffset, endOffset)
    if (slice.trim() === selectedText) {
      sel.removeAllRanges()
      const updated = addHighlight(props.article, {
        paragraphIndex: pIndex,
        startOffset,
        endOffset,
        text: slice,
      })
      props.onUpdateArticle(updated)
    }
  })
}
