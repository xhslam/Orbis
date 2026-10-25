import { randomUUID } from 'node:crypto'
import { PAPER_CLOSE_TIMEOUT_MS } from '../../shared/paper'

interface CloseHost {
  send(token: string): void
  close(): void
  warn(message: string): void
}
/** Preload aggregates all callbacks: one subscription per document, one ready reply. */
export class PaperCloseController {
  private subscribed = false
  private allowed = false
  private pending: {
    token: string
    timer: ReturnType<typeof setTimeout>
    closeRequested: boolean
    waiters: ((ok: boolean) => void)[]
  } | null = null
  constructor(
    private readonly host: CloseHost,
    private readonly timeout = PAPER_CLOSE_TIMEOUT_MS,
  ) {}
  subscribe(): void {
    this.subscribed = true
  }
  unsubscribe(): void {
    this.subscribed = false
    // The preload already captured its callbacks. React effect cleanup must not
    // bypass that in-flight snapshot; only its ACK (or timeout) can finish it.
  }
  get needsPreparation(): boolean {
    return this.subscribed || this.pending !== null
  }
  closing(): boolean {
    if (this.allowed) return true
    if (this.pending) {
      this.pending.closeRequested = true
      return false
    }
    if (!this.subscribed) return true
    this.start(true)
    return false
  }
  /** App quit prepares without closing a window before its peers are ready. */
  prepareForQuit(): Promise<boolean> {
    if (this.allowed || !this.needsPreparation) return Promise.resolve(true)
    return new Promise((resolve) => {
      if (this.pending) this.pending.waiters.push(resolve)
      else this.start(false, resolve)
    })
  }
  allowQuit(): void {
    this.allowed = true
    this.settle(true, false)
  }
  cancelPreparation(): void {
    this.allowed = false
    this.settle(false, false)
  }
  ready(token: unknown, ok: unknown): void {
    if (!this.pending || token !== this.pending.token) return
    if (ok === true) this.settle(true)
    else if (ok === false) {
      this.host.warn('paper: before-close preparation failed; close cancelled')
      this.settle(false)
    }
  }
  clear(): void {
    // A destroyed/replaced document no longer has callbacks to await.
    this.settle(true, false)
    this.subscribed = false
    this.allowed = false
  }
  private start(closeRequested: boolean, waiter?: (ok: boolean) => void): void {
    const token = randomUUID()
    const timer = setTimeout(() => {
      this.host.warn('paper: before-close acknowledgement timed out; continuing shutdown')
      this.settle(true)
    }, this.timeout)
    this.pending = { token, timer, closeRequested, waiters: waiter ? [waiter] : [] }
    try {
      this.host.send(token)
    } catch {
      this.host.warn('paper: before-close delivery failed; waiting for bounded timeout')
    }
  }
  private settle(ok: boolean, closeWindow = true): void {
    const pending = this.pending
    if (!pending) return
    clearTimeout(pending.timer)
    this.pending = null
    for (const resolve of pending.waiters) resolve(ok)
    if (ok && closeWindow && pending.closeRequested) {
      this.allowed = true
      this.host.close()
    }
  }
}
