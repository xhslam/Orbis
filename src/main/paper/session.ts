/** One writer per vault, tied to the lifetime of its top-level document. */
export class PaperSession {
  private holder: object | null = null
  private pending = new Set<Promise<unknown>>()
  private retiring = false

  async acquire(document: object): Promise<void> {
    if (this.holder === document && !this.retiring) return
    if (this.holder !== null && !this.retiring) throw new Error('paper: session already acquired')
    while (this.retiring) {
      await Promise.allSettled(this.pending)
      if (this.retiring && this.pending.size === 0) {
        this.holder = null
        this.retiring = false
      }
    }
    // Another waiter can have acquired while this one was draining.
    if (this.holder !== null && this.holder !== document)
      throw new Error('paper: session already acquired')
    this.holder = document
  }

  assert(document: object): void {
    if (this.holder !== document || this.retiring) throw new Error('paper: session required')
  }

  run<T>(document: object, operation: () => T | Promise<T>): Promise<T> {
    this.assert(document)
    // Register before executing user IO, including operations that throw synchronously.
    const task = Promise.resolve().then(operation)
    this.pending.add(task)
    void task.then(
      () => this.pending.delete(task),
      () => this.pending.delete(task),
    )
    return task
  }

  revoke(document: object): void {
    if (this.holder !== document) return
    this.retiring = true
    if (this.pending.size === 0) {
      this.holder = null
      this.retiring = false
    }
  }

  get hasPending(): boolean {
    return this.pending.size > 0
  }

  async drain(): Promise<void> {
    while (this.pending.size) await Promise.allSettled(this.pending)
  }
}
