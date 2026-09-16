import { PDFParse } from 'pdf-parse'

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
    const text = rawInner
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (text.length > 20) {
      blocks.push(text)
    }
  }

  if (blocks.length === 0) {
    const plain = (contentArea || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
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

export async function parsePdfTextLayer(
  buffer: Buffer,
  filename: string,
): Promise<ExtractedDocument> {
  if (buffer.length === 0) {
    throw new Error('PDF file is empty')
  }

  const parser = new PDFParse({ data: buffer })
  try {
    const textRes = await parser.getText()
    const infoRes = await parser.getInfo().catch(() => null)
    const text = (textRes.text ?? '').replace(/\r\n/g, '\n').trim()

    if (text.length < 20) {
      throw new Error(
        `Could not extract text layer from PDF "${filename}". It may be a scanned image without an embedded text layer.`,
      )
    }

    const title =
      (infoRes?.info?.Title ? String(infoRes.info.Title).trim() : '') ||
      filename.replace(/\.[^/.]+$/, '')

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
  } finally {
    await parser.destroy().catch(() => {})
  }
}
