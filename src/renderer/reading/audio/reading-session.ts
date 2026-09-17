import { parseServerFrame } from '@shared/realtime/frames'
import type { OrbisReadingApi } from '@shared/reading/article'

declare global {
  interface Window {
    readonly orbisReading?: OrbisReadingApi
  }
}

export interface RetellingSessionOptions {
  readonly instructions: string
  readonly voice?: string
}

export function buildRetellingSessionConfig(options: RetellingSessionOptions): unknown {
  return {
    type: 'session.update',
    session: {
      type: 'realtime',
      instructions: options.instructions,
      output_modalities: ['audio'],
      audio: {
        output: { voice: options.voice ?? 'ballad' },
        input: {
          noise_reduction: { type: 'far_field' },
          turn_detection: {
            type: 'server_vad',
            create_response: false,
            interrupt_response: false,
          },
        },
      },
    },
  }
}

export type RetellingState =
  | 'idle'
  | 'opening'
  | 'configuring'
  | 'ready'
  | 'recording'
  | 'evaluating'
  | 'responding'
  | 'closed'
  | { readonly error: string }

export interface RetellingSessionHandlers {
  readonly onStateChange: (state: RetellingState) => void
  readonly onTranscriptDelta: (delta: string) => void
  readonly onTranscriptDone: (fullText: string) => void
  readonly onAudioStream: (stream: MediaStream) => void
}

export interface ReadingVoiceSession {
  readonly startRecording: () => void
  readonly finishSpeaking: (instructionsOverride?: string) => boolean
  readonly stopPlayback: () => void
  readonly close: () => void
}

export async function openReadingVoiceSession(
  handlers: RetellingSessionHandlers,
  initialInstructions: string,
): Promise<ReadingVoiceSession> {
  handlers.onStateChange('opening')

  const api = window.orbisReading
  if (!api) {
    const err = 'Orbis Reading bridge is not available'
    handlers.onStateChange({ error: err })
    throw new Error(err)
  }

  const openRes = await api.openVoice()
  if (!openRes.ok) {
    const err = openRes.problem ? JSON.stringify(openRes.problem) : 'Failed to obtain voice session'
    handlers.onStateChange({ error: err })
    throw new Error(err)
  }

  const sessionToken = openRes.session

  const localStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  })

  // Start with mic tracks disabled until user explicitly starts recording
  localStream.getAudioTracks().forEach((t) => {
    t.enabled = false
  })

  const pc = new RTCPeerConnection()
  let remoteStream: MediaStream | null = null

  pc.ontrack = (event) => {
    const stream = event.streams[0] ?? new MediaStream([event.track])
    remoteStream = stream
    handlers.onAudioStream(stream)
  }

  localStream.getAudioTracks().forEach((track) => pc.addTrack(track, localStream))

  const channel = pc.createDataChannel('oai-events')
  let currentTranscript = ''
  let configured = false
  let isRecording = false
  let isEvaluating = false
  let hasUserSpokenAudio = false

  channel.onmessage = (event) => {
    if (typeof event.data !== 'string') return
    let raw: { type?: string } | null = null
    try {
      raw = JSON.parse(event.data)
    } catch {
      // Ignored malformed json
    }

    // Acknowledge session.updated before opening for recording
    if (raw?.type === 'session.updated') {
      configured = true
      handlers.onStateChange('ready')
      return
    }

    // Reuse battle-tested frames.ts parser for typed server frames
    const frame = parseServerFrame(event.data)

    if (frame.kind === 'saying') {
      currentTranscript += frame.delta
      handlers.onTranscriptDelta(frame.delta)
    } else if (frame.kind === 'said') {
      handlers.onTranscriptDone(frame.transcript || currentTranscript)
      isEvaluating = false
      handlers.onStateChange('ready')
    } else if (frame.kind === 'audio-buffer' && frame.phase === 'started') {
      handlers.onStateChange('responding')
    } else if (frame.kind === 'error') {
      isEvaluating = false
      handlers.onStateChange({ error: frame.message ?? 'Voice service error' })
    }
  }

  channel.onopen = () => {
    handlers.onStateChange('configuring')
    channel.send(
      JSON.stringify(
        buildRetellingSessionConfig({
          instructions: initialInstructions,
        }),
      ),
    )
  }

  const offer = await pc.createOffer()
  await pc.setLocalDescription(offer)

  const sdpRes = await api.sdp(offer.sdp ?? '', sessionToken)
  const answerSdp = sdpRes.ok ? (sdpRes.answer ?? (sdpRes as { value?: string }).value) : null
  if (!sdpRes.ok || !answerSdp) {
    localStream.getTracks().forEach((t) => t.stop())
    pc.close()
    const err = !sdpRes.ok
      ? 'Failed to establish SDP with voice service'
      : 'Voice service returned empty SDP answer'
    handlers.onStateChange({ error: err })
    throw new Error(err)
  }

  await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp })

  return {
    startRecording() {
      if (!configured) {
        console.warn('[reading] Waiting for session.updated before recording')
        return
      }
      currentTranscript = ''
      isEvaluating = false
      hasUserSpokenAudio = true
      localStream.getAudioTracks().forEach((t) => {
        t.enabled = true
      })
      isRecording = true
      handlers.onStateChange('recording')
    },

    finishSpeaking(instructionsOverride?: string): boolean {
      if (!isRecording || isEvaluating) return false
      if (!hasUserSpokenAudio) {
        handlers.onStateChange({ error: 'No speech was recorded. Please speak before submitting.' })
        return false
      }

      isRecording = false
      isEvaluating = true

      // Mute microphone immediately to prevent feedback/speaker echo
      localStream.getAudioTracks().forEach((t) => {
        t.enabled = false
      })
      handlers.onStateChange('evaluating')

      // Commit trailing audio buffer
      channel.send(JSON.stringify({ type: 'input_audio_buffer.commit' }))

      // Send manual response.create
      const responseEvent: Record<string, unknown> = {
        type: 'response.create',
        response: {
          modalities: ['audio', 'text'],
          ...(instructionsOverride ? { instructions: instructionsOverride } : {}),
        },
      }
      channel.send(JSON.stringify(responseEvent))
      return true
    },

    stopPlayback() {
      remoteStream?.getAudioTracks().forEach((t) => {
        t.enabled = false
      })
    },

    close() {
      localStream.getTracks().forEach((t) => t.stop())
      pc.close()
      handlers.onStateChange('closed')
      void window.orbisReading?.closeVoice().catch(() => {})
    },
  }
}
