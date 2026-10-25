/** Disabled compatibility shell: Phase 1 deliberately has no audio export host. */
import type { AudiobookPlatform } from './audiobook'
import type { SpeechRequest, SpokenClip, SpokenSkip, VoicePack } from '../../core/ports'

export async function chooseAudiobookPath(_bookTitle: string): Promise<string | null> {
  return null
}

/** Refuse before touching voices, scratch files, dialogs, or the bridge. */
export async function tauriAudiobook(
  _packs: readonly VoicePack[],
  _findClip: (request: SpeechRequest) => Promise<SpokenClip | null>,
  _holdClips: (stems: readonly string[], hold: boolean) => Promise<number>,
): Promise<AudiobookPlatform> {
  throw new Error('Audiobook export is unsupported in this build.')
}

export function safeFileName(title: string): string {
  const cleaned = title
    /* `< > : " / \ | ? *` is the set Windows forbids, and it CONTAINS the POSIX
       one — so a single rule serves both rather than two that can disagree. */
    .replace(/[<>:"/\\|?*]/gu, ' ')
    /* Control characters cannot appear in a name on any platform this ships to,
       and a leading dot would hide the file. Written as an explicit range rather
       than with a suppression comment: this repository runs no linter, so a
       disable line here would be a waiver for a rule nobody checks —
       `directives:check` refuses exactly that, and it is right to. */
    .replace(/[\u0000-\u001f]/gu, '')
    /* ⚠️ **LEADING WHITESPACE AND DOTS GO TOGETHER, AND THE DOTS USED TO GO
       FIRST.** `" .hidden"` had its dot stripped while the space still hid it, so
       the trim then exposed `.hidden` — a hidden file, which is exactly what the
       dot rule exists to prevent. One class, one pass, so neither can re-create
       what the other removed. */
    .replace(/^[\s.]+/u, '')
  const budgeted = withinBytes(cleaned)
    /* TRAILING DOTS AND SPACES GO LAST, after the truncation: cutting a title can
       CREATE one, so a trim done earlier would not see it. Windows drops them
       silently, which makes the file's real name differ from the one the reader
       was shown in the dialog.

       THE ONLY TRAILING TRIM. A `trimEnd()` before the truncation used to sit
       beside it, and `\s` is the same set of characters: whatever that removed,
       this removes after the cut, so the two could not be told apart. */
    .replace(/[\s.]+$/u, '')
  return RESERVED_ON_WINDOWS.test(budgeted) ? `${budgeted} (book)` : budgeted
}

/**
 * What a filesystem will hold, derived from the limit rather than guessed at.
 *
 * A path COMPONENT is capped at 255 bytes on APFS, ext4 and NTFS alike, and this
 * value has to leave room for everything appended after it.
 */
const MAX_COMPONENT_BYTES = 255 - '.m4b'.length - ' (book)'.length

/**
 * `text`, cut to fit `MAX_COMPONENT_BYTES` without splitting a character.
 *
 * ⚠️ **`slice(0, 120)` WAS WRONG IN BOTH UNITS.** It counts UTF-16 code units, so
 * it can cut an emoji in half and leave an unpaired surrogate; and 120 is not the
 * filesystem's limit — 120 CJK characters are 360 UTF-8 bytes, well past what a
 * component may hold, which is most of the books this reader is for. A budget
 * measured in code units is neither the filesystem's unit nor the reader's.
 *
 * Cut by GRAPHEME rather than code point, so a flag, a family emoji or a
 * combining accent is not split either — `Intl.Segmenter` is the same tool the
 * reader's own sentence walk uses.
 */
function withinBytes(text: string): string {
  const encoder = new TextEncoder()
  /* EVERY TITLE WALKS THE GRAPHEMES, with no early return for one that fits.
     That return answered exactly what the walk answers — a title within the
     budget is kept whole by it — so it was a second route to one result, and a
     change to either could not be seen. Titles are short; the walk is cheap.

     `new Intl.Segmenter()` with no options, because `grapheme` IS the default
     granularity: spelled out, it was an option whose removal changed nothing. */
  const graphemes = new Intl.Segmenter().segment(text)
  let out = ''
  let used = 0
  for (const { segment } of graphemes) {
    const size = encoder.encode(segment).length
    if (used + size > MAX_COMPONENT_BYTES) break
    out += segment
    used += size
  }
  return out
}

/**
 * The MS-DOS device names, which Windows still refuses at any extension.
 *
 * A book called `Con` or `Aux` is not far-fetched, and the failure is opaque:
 * the dialog rejects the name with nothing that explains why. Suffixed rather
 * than replaced, so the reader still sees their own title.
 */
const RESERVED_ON_WINDOWS = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/iu

export function skippedOf(reply: unknown): readonly SpokenSkip[] {
  const row = (typeof reply === 'object' && reply !== null ? reply : {}) as Record<string, unknown>
  if (row.skipped === undefined || row.skipped === null) return []
  if (!Array.isArray(row.skipped)) {
    throw new Error('the chapter was rendered with a skip list that is not one')
  }
  return row.skipped.map((one) => {
    const skip = (typeof one === 'object' && one !== null ? one : {}) as Record<string, unknown>
    if (typeof skip.text !== 'string' || typeof skip.why !== 'string') {
      throw new Error('the chapter was rendered with a skip that names neither text nor reason')
    }
    return { text: skip.text, why: skip.why }
  })
}
