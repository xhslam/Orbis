import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Native preferences do not preserve additionalArguments in every Electron version.
// Only the main-process window factory can grant this role; renderers cannot.
const roles = new WeakMap<object, 'history' | 'reading'>()
export function rememberPaperRole(sender: object, role: 'history' | 'reading'): void {
  roles.set(sender, role)
}
export function registeredPaperRole(sender: object): 'history' | 'reading' | null {
  return roles.get(sender) ?? null
}

export function paperRole(arguments_: readonly string[] | undefined): 'history' | 'reading' | null {
  const roles = (arguments_ ?? []).filter((arg) => /^--(?:orbis|mochi)-role=/.test(arg))
  if (roles.length === 0) return null
  const role = roles[0]!.split('=')[1]
  if (!roles.every((arg) => arg.split('=')[1] === role)) return null
  return role === 'history' || role === 'reading' ? role : null
}

export function trustedPaperUrl(
  url: string,
  role: 'history' | 'reading',
  rendererRoot: string,
  devUrl?: string,
): boolean {
  try {
    const actual = new URL(url)
    if (devUrl) {
      const expected = new URL(`${role}/index.html`, devUrl.endsWith('/') ? devUrl : `${devUrl}/`)
      return (
        actual.origin === expected.origin &&
        actual.pathname === expected.pathname &&
        !actual.username &&
        !actual.password
      )
    }
    return (
      actual.protocol === 'file:' &&
      !actual.host &&
      path.resolve(fileURLToPath(actual)) === path.resolve(rendererRoot, role, 'index.html')
    )
  } catch {
    return false
  }
}
