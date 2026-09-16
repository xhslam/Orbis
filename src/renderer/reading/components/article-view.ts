import {
  addHighlight,
  removeHighlight,
  type Article,
  type Highlight,
  type Paragraph,
  type PracticeScope,
} from '@shared/reading/article'

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
    result += `<mark class="keyword-highlight" data-highlight-id="${h.id}" title="Click to remove keyword">${escapeHtml(chunk)}</mark>`
    cursor = h.endOffset
  }

  if (cursor < paragraph.text.length) {
    result += escapeHtml(paragraph.text.slice(cursor))
  }

  return result
}

export interface ArticleViewProps {
  readonly article: Article
  readonly onUpdateArticle: (updated: Article) => void
  readonly onStartRetelling: (scope: PracticeScope) => void
  readonly onBack: () => void
}

export function renderArticleView(props: ArticleViewProps, container: HTMLElement): void {
  const totalP = props.article.paragraphs.length
  let currentScope: PracticeScope = {
    startParagraph: 0,
    endParagraph: totalP - 1,
  }

  const paragraphCards = props.article.paragraphs
    .map((p) => {
      const pNum = p.index + 1
      const innerHtml = renderParagraphWithHighlights(p, props.article.highlights)
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

  container.innerHTML = `
    <div class="article-container">
      <header class="view-header">
        <div class="header-left">
          <button type="button" class="btn btn-ghost" id="article-back-btn">← Library</button>
          <div class="header-title-group">
            <h1 class="view-title">${escapeHtml(props.article.title)}</h1>
            <span class="source-tag">${escapeHtml(props.article.source)}</span>
          </div>
        </div>

        <div class="header-right">
          <button type="button" class="btn btn-ghost btn-sm" id="clear-highlights-btn" ${highlightCount === 0 ? 'disabled' : ''}>
            Clear Highlights (${highlightCount})
          </button>
          <button type="button" class="btn btn-primary" id="start-retell-btn">
            Start Retelling →
          </button>
        </div>
      </header>

      <div class="practice-scope-bar">
        <span class="scope-label">Practice Scope:</span>
        <label class="scope-option">
          <input type="radio" name="scope-mode" value="all" checked id="scope-all-radio" />
          All paragraphs (1–${totalP})
        </label>
        <label class="scope-option">
          <input type="radio" name="scope-mode" value="custom" id="scope-custom-radio" />
          Custom range:
        </label>
        <div class="scope-range-inputs">
          <span>From P.</span>
          <input type="number" id="scope-start" min="1" max="${totalP}" value="1" class="number-input" disabled />
          <span>to P.</span>
          <input type="number" id="scope-end" min="1" max="${totalP}" value="${totalP}" class="number-input" disabled />
        </div>
      </div>

      <div class="hint-banner">
        💡 <strong>Tip:</strong> Select any word or phrase with your mouse to highlight it as a retelling keyword. Click a highlight to remove it.
      </div>

      <main class="reading-canvas">
        <article class="article-content">
          ${paragraphCards}
        </article>
      </main>
    </div>
  `

  // Wire back button
  container.querySelector('#article-back-btn')?.addEventListener('click', () => {
    props.onBack()
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
  }

  scopeAll?.addEventListener('change', updateScope)
  scopeCustom?.addEventListener('change', updateScope)
  startInput?.addEventListener('input', updateScope)
  endInput?.addEventListener('input', updateScope)

  // Wire start retelling
  container.querySelector('#start-retell-btn')?.addEventListener('click', () => {
    props.onStartRetelling(currentScope)
  })

  // Wire clear highlights
  container.querySelector('#clear-highlights-btn')?.addEventListener('click', () => {
    if (
      props.article.highlights.length > 0 &&
      confirm('Remove all highlights from this article?')
    ) {
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
