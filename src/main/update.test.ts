import { describe, expect, it } from 'vitest'
import { createAutomaticUpdateSchedule, pickUpdater } from './update'
import type { SettingsUpdate } from '@shared/ipc'

/**
 * The one thing in `update.ts` that can be tested without an Electron app, and
 * it is the thing that was wrong.
 *
 * `electron-updater` is CommonJS; the source says `await import(...)`; Node's
 * interop decides what the namespace holds. It finds named exports by static
 * analysis, and `autoUpdater` is installed with `Object.defineProperty` — so it
 * is not on the namespace, only on `.default`. Destructuring it gave
 * `undefined`, and the next line assigned a property to it:
 *
 *     TypeError: Cannot set properties of undefined (setting 'autoDownload')
 *
 * Which shipped, because nothing here presses that button: the pane offers it
 * only in a packaged build, and the rendered gate refuses to press anything that
 * opens a network connection.
 */
describe('finding autoUpdater on whatever the import returns', () => {
  const real = { autoDownload: true }

  it('takes the named export when there is one', () => {
    expect(pickUpdater({ autoUpdater: real })).toBe(real)
  })

  it('falls back to `default`, which is the shape that actually ships', () => {
    expect(pickUpdater({ default: { autoUpdater: real } })).toBe(real)
  })

  it('prefers the named export, so a later release that adds one is not a break', () => {
    const other = { autoDownload: false }
    expect(pickUpdater({ autoUpdater: real, default: { autoUpdater: other } })).toBe(real)
  })

  it('throws rather than returning undefined for a shape with neither', () => {
    // The failure this replaces was a TypeError three lines later, naming a
    // property rather than the module that did not export what was expected.
    expect(() => pickUpdater({ AppUpdater: class {} })).toThrow(/no autoUpdater/)
    expect(() => pickUpdater({})).toThrow(/no autoUpdater/)
    expect(() => pickUpdater(null)).toThrow()
  })
})

describe('the automatic update schedule', () => {
  it('checks and downloads when enabled, and never installs', async () => {
    let enabled = true
    let launch: (() => void) | undefined
    let periodic: (() => void) | undefined
    const checks: string[] = []
    const schedule = createAutomaticUpdateSchedule({
      enabled: () => enabled,
      check: () => {
        checks.push('check')
        return Promise.resolve<SettingsUpdate>({ kind: 'available', version: '1.0.0' })
      },
      download: () => {
        checks.push('download')
        return Promise.resolve<SettingsUpdate>({ kind: 'ready', version: '1.0.0' })
      },
      setTimeout: ((callback: () => void) => {
        launch = callback
        return { unref() {} }
      }) as never,
      setInterval: ((callback: () => void) => {
        periodic = callback
        return { unref() {} }
      }) as never,
    })
    schedule.setEnabled(true)
    launch?.()
    await new Promise<void>((resolve) => setImmediate(resolve))
    expect(checks).toEqual(['check', 'download'])
    enabled = false
    periodic?.()
    expect(checks).toEqual(['check', 'download'])
    schedule.stop()
  })

  it('does not schedule network work when disabled', () => {
    const clear: string[] = []
    let scheduled = 0
    const schedule = createAutomaticUpdateSchedule({
      enabled: () => false,
      check: () => Promise.resolve<SettingsUpdate>({ kind: 'idle' }),
      download: () => Promise.resolve<SettingsUpdate>({ kind: 'idle' }),
      setTimeout: (() => {
        scheduled += 1
        return { unref() {} }
      }) as never,
      setInterval: (() => {
        scheduled += 1
        return { unref() {} }
      }) as never,
      clearTimeout: () => {
        clear.push('timeout')
      },
      clearInterval: () => {
        clear.push('interval')
      },
    })
    schedule.setEnabled(false)
    expect(scheduled).toBe(0)
    schedule.setEnabled(true)
    schedule.setEnabled(false)
    expect(scheduled).toBe(0)
    expect(clear).toEqual([])
    schedule.stop()
  })
})

describe('the module this actually imports', () => {
  it('really does hide autoUpdater behind `default`', async () => {
    /*
      Against the installed package, not a fixture — the whole bug was an
      assumption about a real module's shape, and a test that only exercised
      hand-written objects would have passed just as happily before the fix.

      The descriptor is read rather than the property, because reading it
      CONSTRUCTS the updater and that needs an Electron `app`.
    */
    const module = (await import('electron-updater')) as unknown as Record<string, unknown>
    const named = Object.getOwnPropertyDescriptor(module, 'autoUpdater')
    const fallback = Object.getOwnPropertyDescriptor(module['default'], 'autoUpdater')
    expect(named === undefined || fallback !== undefined).toBe(true)
    expect(fallback).toBeDefined()
  })
})
