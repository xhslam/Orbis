import { describe, expect, it } from 'vitest'
import { safeFileName, skippedOf } from './audiobookTauri'

describe('reading the skips out of a chapter render', () => {
  /* The reply crosses the IPC boundary as unknown JSON, and the export reads it
     AFTER the chapter has been written — the most expensive moment there is to
     throw on a shape. So: absent is none, present-and-wrong is refused by name.
     The same rule this repository states for every store it reads back. */
  it('takes an absent list as none, which is every older build', () => {
    expect(skippedOf({ sampleRate: 24_000 })).toEqual([])
    expect(skippedOf({ sampleRate: 24_000, skipped: null })).toEqual([])
    expect(skippedOf(undefined), 'and a reply that is no object at all').toEqual([])
    expect(skippedOf(42)).toEqual([])
  })

  it('reads what is there', () => {
    expect(
      skippedOf({ sampleRate: 24_000, skipped: [{ text: 'Coenties', why: 'no pronunciation' }] }),
    ).toEqual([{ text: 'Coenties', why: 'no pronunciation' }])
    expect(skippedOf({ skipped: [] })).toEqual([])
  })

  it('refuses a list that is not one, rather than counting it', () => {
    expect(() => skippedOf({ skipped: 'Coenties' })).toThrow(/skip list that is not one/u)
    expect(() => skippedOf({ skipped: { text: 'a', why: 'b' } })).toThrow(/skip list that is not one/u)
  })

  it('refuses a skip that names neither the text nor the reason', () => {
    const named = /names neither text nor reason/u
    expect(() => skippedOf({ skipped: [null] })).toThrow(named)
    expect(() => skippedOf({ skipped: ['Coenties'] })).toThrow(named)
    expect(() => skippedOf({ skipped: [{ text: 'Coenties' }] })).toThrow(named)
    expect(() => skippedOf({ skipped: [{ why: 'no pronunciation' }] })).toThrow(named)
    /* One good beside one bad refuses the chapter: a partial count is worse than
       a refusal, because it is a number the reader would believe. */
    expect(() => skippedOf({ skipped: [{ text: 'a', why: 'b' }, null] })).toThrow(named)
  })
})

describe('safeFileName', () => {
  it('replaces every character Windows forbids, not only the POSIX ones', () => {
    expect(safeFileName('Why?')).toBe('Why')
    expect(safeFileName('a*b')).toBe('a b')
    expect(safeFileName('a|b')).toBe('a b')
    expect(safeFileName('a"b')).toBe('a b')
    expect(safeFileName('a<b>')).toBe('a b')
  })

  it('still replaces the separators, which is what it was written for', () => {
    expect(safeFileName('Vol/2')).toBe('Vol 2')
    expect(safeFileName('Vol\\2')).toBe('Vol 2')
    expect(safeFileName('Dune: Part Two')).toBe('Dune  Part Two')
  })

  it('suffixes a reserved device name rather than replacing the title', () => {
    /* A book called `Con` is not far-fetched, and the dialog's refusal explains
       nothing. The reader should still recognise their own title in it. */
    expect(safeFileName('CON')).toBe('CON (book)')
    expect(safeFileName('nul')).toBe('nul (book)')
    expect(safeFileName('Com4')).toBe('Com4 (book)')
    expect(safeFileName('LPT9')).toBe('LPT9 (book)')
  })

  it('leaves a title that merely starts with a device name alone', () => {
    expect(safeFileName('Conrad')).toBe('Conrad')
    expect(safeFileName('Auxiliary Verbs')).toBe('Auxiliary Verbs')
  })

  it('drops a trailing dot, which Windows strips without saying so', () => {
    /* The file would then be named differently from the suggestion the reader
       accepted, which is the kind of difference nobody can diagnose. */
    expect(safeFileName('Vol. 2.')).toBe('Vol. 2')
    expect(safeFileName('Hmm...')).toBe('Hmm')
  })

  it('drops a trailing dot the truncation itself created', () => {
    /* ⚠️ **THE ORDER IS LOAD-BEARING.** Cutting to the byte budget can CREATE a
       trailing dot, so a trim done before it would not see one. */
    const budget = 255 - '.m4b'.length - ' (book)'.length
    const title = `${'a'.repeat(budget - 1)}.tail`
    expect(safeFileName(title)).toBe('a'.repeat(budget - 1))
  })

  it('strips a leading dot that leading whitespace was hiding', () => {
    /* ⚠️ **THE DOTS USED TO GO FIRST**, so the space hid them from the dot rule
       and the later trim exposed `.hidden` — a hidden file, which is the one thing
       that rule exists to prevent. */
    expect(safeFileName(' .hidden')).toBe('hidden')
    expect(safeFileName('\t\n ..Vol 2')).toBe('Vol 2')
  })

  it('budgets in BYTES, not UTF-16 code units', () => {
    /* ⚠️ **120 CJK CHARACTERS ARE 360 UTF-8 BYTES** — past what a path component
       may hold, and most of the books this reader is for. The old `slice(0, 120)`
       measured neither the filesystem's unit nor the reader's. */
    const budget = 255 - '.m4b'.length - ' (book)'.length
    const name = safeFileName('第'.repeat(200))
    expect(new TextEncoder().encode(name).length).toBeLessThanOrEqual(budget)
    expect(name.length).toBeGreaterThan(20)
  })

  it('never cuts a character in half', () => {
    /* A lone surrogate is an invalid name and an unreadable one. Cut by grapheme,
       so a family emoji and a combining accent survive whole too. */
    const name = safeFileName('👨\u200d👩\u200d👧\u200d👦'.repeat(60))
    expect(name).not.toMatch(/[\uD800-\uDFFF]/u)
    for (const ch of name) expect(ch.codePointAt(0)).toBeDefined()
    expect(new TextEncoder().encode(name).length).toBeLessThanOrEqual(244)
  })

  it('keeps a non-Latin title exactly as it is', () => {
    expect(safeFileName('第三章')).toBe('第三章')
  })

  it('strips control characters and a leading dot', () => {
    expect(safeFileName('a\u0007b')).toBe('ab')
    expect(safeFileName('...hidden')).toBe('hidden')
  })

  it('answers empty for a title made only of forbidden characters', () => {
    /* `chooseAudiobookPath` falls back to `audiobook` on an empty answer, so
       this must be empty rather than a string of spaces. */
    expect(safeFileName('???')).toBe('')
    expect(safeFileName('   ')).toBe('')
  })
})

describe('safeFileName, at the edges of its rules', () => {
  it('leaves a title that merely ENDS with a device name alone', () => {
    /* Only the whole name is reserved: `Falcon` is not `con`. */
    expect(safeFileName('Falcon')).toBe('Falcon')
    expect(safeFileName('Reconquista')).toBe('Reconquista')
  })

  it('suffixes a device name at any extension, however long', () => {
    /* Windows refuses `nul.tar.gz` as it refuses `nul`. */
    expect(safeFileName('nul.tar.gz')).toBe('nul.tar.gz (book)')
  })

  it('fills the byte budget exactly, keeping a character that lands on its last byte', () => {
    /* 255 bytes for a component, less `.m4b` and ` (book)`: 244. A title one
       byte longer loses its last character, and only that. */
    const budget = 255 - '.m4b'.length - ' (book)'.length
    expect(safeFileName(`${'a'.repeat(budget)}b`)).toBe('a'.repeat(budget))
    expect(new TextEncoder().encode(safeFileName('a'.repeat(budget))).length).toBe(budget)
  })
})
