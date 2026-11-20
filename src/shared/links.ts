/** The only external addresses a renderer may ask the main process to open. */
export const LINKS = {
  author: 'https://lixiaolai.com',
  repo: 'https://github.com/xhslam/Orbis',
} as const

export type Link = keyof typeof LINKS

export const LINK_KINDS = Object.keys(LINKS) as readonly Link[]

export function isLink(value: unknown): value is Link {
  return typeof value === 'string' && (LINK_KINDS as readonly string[]).includes(value)
}
