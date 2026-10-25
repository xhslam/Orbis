import { PAPER_CLOSE_TIMEOUT_MS } from '../../shared/paper'

export interface QuitParticipant {
  prepareForQuit(): Promise<boolean>
  allowQuit(): void
  cancelPreparation(): void
}
interface QuitHost {
  participants(): QuitParticipant[]
  quit(): void
  warn(message: string): void
}

/** Coordinates app.quit independently from native per-window close events. */
export class PaperQuitController {
  private pending = false
  private resuming = false
  constructor(
    private readonly host: QuitHost,
    private readonly timeout = PAPER_CLOSE_TIMEOUT_MS,
  ) {}

  /** True means leave Electron's original before-quit event untouched. */
  beforeQuit(): boolean {
    if (this.resuming) {
      this.resuming = false
      return true
    }
    if (this.pending) return false
    const participants = this.host.participants()
    if (participants.length === 0) return true
    this.pending = true
    void this.prepare(participants)
    return false
  }

  private async prepare(participants: QuitParticipant[]): Promise<void> {
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      const bounded = new Promise<boolean>((resolve) => {
        timer = setTimeout(() => {
          this.host.warn('paper: application quit preparation timed out; continuing shutdown')
          resolve(true)
        }, this.timeout)
      })
      const prepared = Promise.all(
        participants.map(async (participant) => {
          if (!(await participant.prepareForQuit())) throw new Error('preparation refused')
        }),
      ).then(() => true)
      await Promise.race([prepared, bounded])
      if (timer) clearTimeout(timer)
      // A participant prepared earlier may have unsubscribed in the meantime.
      // The successful snapshot still permits this one resumed native quit.
      for (const participant of participants) participant.allowQuit()
      this.pending = false
      this.resuming = true
      this.host.quit()
    } catch {
      if (timer) clearTimeout(timer)
      this.pending = false
      this.resuming = false
      for (const participant of participants) participant.cancelPreparation()
      this.host.warn(
        'paper: application quit preparation failed; quit cancelled, retry is available',
      )
    }
  }
}
