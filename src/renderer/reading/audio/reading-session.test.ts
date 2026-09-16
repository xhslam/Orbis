import { describe, expect, it } from 'vitest'
import { buildRetellingSessionConfig } from './reading-session'

interface SessionConfigPayload {
  readonly session: {
    readonly instructions: string
    readonly audio: {
      readonly output: { readonly voice: string }
      readonly input: {
        readonly turn_detection: {
          readonly create_response: boolean
          readonly interrupt_response: boolean
        }
      }
    }
  }
}

describe('Reading voice session configuration', () => {
  it('configures turn detection with server_vad and response creation disabled', () => {
    const config = buildRetellingSessionConfig({
      instructions: 'Review user retelling.',
    })

    const session = (config as SessionConfigPayload).session
    expect(session.audio.input.turn_detection.create_response).toBe(false)
    expect(session.audio.input.turn_detection.interrupt_response).toBe(false)
    expect(session.instructions).toBe('Review user retelling.')
    expect(session.audio.output.voice).toBe('ballad')
  })

  it('allows custom voice parameter in session configuration', () => {
    const config = buildRetellingSessionConfig({
      instructions: 'Review retelling.',
      voice: 'alloy',
    })

    const session = (config as SessionConfigPayload).session
    expect(session.audio.output.voice).toBe('alloy')
  })
})
