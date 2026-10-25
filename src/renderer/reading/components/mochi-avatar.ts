import type { RetellingState } from '../audio/reading-session'

export function renderMochiAvatarSvg(state: RetellingState, size = 44): string {
  const isError = typeof state === 'object' && 'error' in state
  const isRecording = state === 'recording'
  const isEvaluating = state === 'evaluating'
  const isResponding = state === 'responding'
  const isOpening = state === 'opening' || state === 'configuring'
  const isReady = state === 'ready'

  let faceSvg = ''
  let haloGlow = ''

  if (isError) {
    // Dizzy / oops expression (>﹏<)
    faceSvg = `
      <path d="M14 19L18 23M18 19L14 23" stroke="#b91c1c" stroke-width="2" stroke-linecap="round" />
      <path d="M26 19L30 23M30 19L26 23" stroke="#b91c1c" stroke-width="2" stroke-linecap="round" />
      <path d="M20 28Q22 26 24 28" stroke="#b91c1c" stroke-width="2" stroke-linecap="round" fill="none" />
    `
  } else if (isRecording) {
    // Listening / attentive eyes with glowing blush
    haloGlow = `<circle cx="22" cy="22" r="21" fill="rgba(225, 29, 72, 0.12)" class="mochi-avatar-pulse" />`
    faceSvg = `
      <circle cx="15" cy="20" r="2.5" fill="#1e1e24" />
      <circle cx="29" cy="20" r="2.5" fill="#1e1e24" />
      <circle cx="11" cy="23" r="2.5" fill="#fb7185" opacity="0.6" />
      <circle cx="33" cy="23" r="2.5" fill="#fb7185" opacity="0.6" />
      <path d="M20 25Q22 27 24 25" stroke="#1e1e24" stroke-width="1.8" stroke-linecap="round" fill="none" />
    `
  } else if (isEvaluating) {
    // Thinking / analyzing
    faceSvg = `
      <circle cx="15" cy="19" r="2.2" fill="#1e1e24" />
      <circle cx="29" cy="19" r="2.2" fill="#1e1e24" />
      <ellipse cx="22" cy="26" rx="2.5" ry="3" fill="#1e1e24" />
      <circle cx="11" cy="22" r="2" fill="#fdba74" opacity="0.5" />
      <circle cx="33" cy="22" r="2" fill="#fdba74" opacity="0.5" />
    `
  } else if (isResponding) {
    // Talking / speaking happily
    haloGlow = `<circle cx="22" cy="22" r="21" fill="rgba(14, 165, 233, 0.15)" class="mochi-avatar-speak-glow" />`
    faceSvg = `
      <path d="M13 19Q15 16 17 19" stroke="#1e1e24" stroke-width="2" stroke-linecap="round" fill="none" />
      <path d="M27 19Q29 16 31 19" stroke="#1e1e24" stroke-width="2" stroke-linecap="round" fill="none" />
      <circle cx="10" cy="22" r="2.5" fill="#f472b6" opacity="0.7" />
      <circle cx="34" cy="22" r="2.5" fill="#f472b6" opacity="0.7" />
      <path d="M19 24Q22 30 25 24Z" fill="#e11d48" />
    `
  } else if (isOpening) {
    // Waking up
    faceSvg = `
      <circle cx="15" cy="20" r="1.8" fill="#52525b" />
      <circle cx="29" cy="20" r="1.8" fill="#52525b" />
      <path d="M20 26Q22 28 24 26" stroke="#52525b" stroke-width="1.5" stroke-linecap="round" fill="none" />
    `
  } else if (isReady) {
    // Cheerful ready smile
    faceSvg = `
      <path d="M13 19Q15 16 17 19" stroke="#1e1e24" stroke-width="2" stroke-linecap="round" fill="none" />
      <path d="M27 19Q29 16 31 19" stroke="#1e1e24" stroke-width="2" stroke-linecap="round" fill="none" />
      <circle cx="11" cy="22" r="2.5" fill="#fda4af" opacity="0.6" />
      <circle cx="33" cy="22" r="2.5" fill="#fda4af" opacity="0.6" />
      <path d="M19 24Q22 27 25 24" stroke="#1e1e24" stroke-width="1.8" stroke-linecap="round" fill="none" />
    `
  } else {
    // Idle / sleeping (soft resting eyes)
    faceSvg = `
      <path d="M13 21Q15 24 17 21" stroke="#71717a" stroke-width="1.8" stroke-linecap="round" fill="none" />
      <path d="M27 21Q29 24 31 21" stroke="#71717a" stroke-width="1.8" stroke-linecap="round" fill="none" />
      <circle cx="11" cy="23" r="2" fill="#fda4af" opacity="0.4" />
      <circle cx="33" cy="23" r="2" fill="#fda4af" opacity="0.4" />
      <path d="M20 27Q22 28 24 27" stroke="#71717a" stroke-width="1.5" stroke-linecap="round" fill="none" />
    `
  }

  return `
    <svg width="${size}" height="${size}" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" class="mochi-avatar-svg">
      ${haloGlow}
      <!-- Mochi soft dumpling body -->
      <path d="M6 24C6 13 14 6 22 6C30 6 38 13 38 24C38 33 32 38 22 38C12 38 6 33 6 24Z" fill="#faf5ef" stroke="#e5e0d8" stroke-width="1.5" />
      ${faceSvg}
    </svg>
  `
}
