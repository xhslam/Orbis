import { describe, expect, it } from 'vitest'
import { createOpenGeneration } from './open-generation'

describe('main-process voice open generations', () => {
  it('does not let an older failure overwrite a newer success', async () => {
    const generation = createOpenGeneration()
    let oldDone!: (result: string) => void
    let state = ''
    const open = async (result: Promise<string>) => {
      const current = generation.begin()
      const value = await result
      if (current()) state = value
    }
    const old = open(
      new Promise((resolve) => {
        oldDone = resolve
      }),
    )
    await open(Promise.resolve('new success'))
    oldDone('old failure')
    await old
    expect(state).toBe('new success')
  })

  it('invalidates in-flight work when the companion rests', () => {
    const generation = createOpenGeneration()
    const current = generation.begin()
    generation.cancel()
    expect(current()).toBe(false)
    expect(generation.begin()()).toBe(true)
  })
})
