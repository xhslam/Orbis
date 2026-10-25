import { describe, expect, it, vi } from 'vitest'
import { createPaperClosePreparation } from './close'
import { flushBeforeClose, onBeforeClose } from '../../kernel/core/beforeClose'

describe('Paper root close preparation', () => {
  it('flushes actual buffered editor state before settle, drain and teardown', async () => {
    const calls: string[] = []
    const stop = onBeforeClose(() => {
      calls.push('editor')
    })
    try {
      const prepare = createPaperClosePreparation({
        flush: flushBeforeClose,
        settle: async () => {
          calls.push('settle')
        },
        drain: async () => {
          calls.push('drain')
        },
        flushStore: async () => {
          calls.push('store')
        },
        dispose: () => {
          calls.push('dispose')
        },
      })
      await prepare()
      expect(calls).toEqual(['editor', 'settle', 'drain', 'store', 'dispose'])
    } finally {
      stop()
    }
  })
  it('coalesces simultaneous hooks, but retries after a recoverable disk error', async () => {
    const deps = {
      flush: vi.fn(),
      settle: vi.fn(async () => {}),
      drain: vi.fn().mockRejectedValueOnce(new Error('disk full')).mockResolvedValue(undefined),
      flushStore: vi.fn(async () => {}),
      dispose: vi.fn(),
    }
    const prepare = createPaperClosePreparation(deps)
    const first = prepare()
    expect(prepare()).toBe(first)
    await expect(first).rejects.toThrow('disk full')
    expect(deps.dispose).not.toHaveBeenCalled()
    await prepare()
    expect(deps.drain).toHaveBeenCalledTimes(2)
    expect(deps.flush).toHaveBeenCalledTimes(2)
    expect(deps.dispose).toHaveBeenCalledOnce()
  })
  it('does not keep a resolved cache if a later close needs to flush new state', async () => {
    const flush = vi.fn()
    const prepare = createPaperClosePreparation({
      flush,
      settle: async () => {},
      drain: async () => {},
      flushStore: async () => {},
      dispose: () => {},
    })
    await prepare()
    await prepare()
    expect(flush).toHaveBeenCalledTimes(2)
  })
})
