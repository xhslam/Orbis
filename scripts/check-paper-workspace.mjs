#!/usr/bin/env node
/** Build first, then run the actual sandboxed reading/Paper UI against isolated data.
 * No real credentials, microphone, profile or external network is used.
 * Artifacts are retained under the printed temporary directory for diagnosis.
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, symlinkSync, copyFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const scratch = mkdtempSync(join(tmpdir(), 'orbis-paper-workspace-'))
mkdirSync(join(scratch, 'out/main'), { recursive: true })
symlinkSync(join(project, 'out/renderer'), join(scratch, 'out/renderer'), 'dir')
symlinkSync(join(project, 'out/preload'), join(scratch, 'out/preload'), 'dir')
symlinkSync(join(project, 'node_modules'), join(scratch, 'node_modules'), 'dir')
execFileSync('pnpm', ['exec', 'esbuild', 'scripts/paper-workspace-entry.ts', '--bundle', '--platform=node', '--format=cjs', '--external:electron', '--external:pdf-parse', `--alias:@shared=${join(project, 'src/shared')}`, `--outfile=${join(scratch, 'out/main/entry.cjs')}`], { cwd: project, stdio: 'pipe' })
copyFileSync(join(project, 'scripts/paper-workspace-smoke.cjs'), join(scratch, 'run.cjs'))
console.log(`Paper workspace smoke artifacts: ${scratch}`)
const result = spawnSync('pnpm', ['exec', 'electron', join(scratch, 'run.cjs'), `--project=${project}`], {
  cwd: project, encoding: 'utf8', timeout: 180_000,
  env: { ...process.env, ELECTRON_RENDERER_URL: '', ELECTRON_RUN_AS_NODE: '' },
})
process.stdout.write(result.stdout ?? '')
process.stderr.write(result.stderr ?? '')
if (result.error) console.error(result.error)
process.exitCode = result.status ?? 1
