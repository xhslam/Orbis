import { describe, expect, it } from 'vitest'
import { buildRetellingSessionConfig, describeVoiceProblem } from './reading-session'

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
        readonly transcription?: {
          readonly model: string
        }
      }
    }
  }
}

describe('reading voice failure messages', () => {
  it('shows the actionable message supplied by main', () => {
    expect(
      describeVoiceProblem({ kind: 'refresh-failed', message: 'Check your network and retry' }),
    ).toBe('Check your network and retry')
  })

  it.each([null, { kind: 'unknown', private: 'not for display' }, { message: 3 }])(
    'does not dump unknown problem payloads: %j',
    (problem) => {
      const said = describeVoiceProblem(problem)
      expect(said).toContain('Settings')
      expect(said).not.toContain('private')
    },
  )
})

describe('Reading voice session configuration', () => {
  it('configures turn detection with server_vad and response creation disabled', () => {
    const config = buildRetellingSessionConfig({
      instructions: 'Review user retelling.',
    })

    const session = (config as SessionConfigPayload).session
    expect(session.audio.input.turn_detection.create_response).toBe(false)
    expect(session.audio.input.turn_detection.interrupt_response).toBe(false)
    expect(session.audio.input.transcription?.model).toBe('gpt-transcribe')
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
    expect(session.audio.input.transcription?.model).toBe('gpt-transcribe')
  })
})
