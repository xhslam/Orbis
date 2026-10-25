/** Historical export name retained for callers; all IO belongs to Orbis. */
import { paperBridge } from './paperBridge'
import type { VaultFs } from './bookVault'

export const tauriVaultFs: VaultFs = {
  readFile: (...args) => paperBridge().fs.readFile(...args),
  writeFile: (...args) => paperBridge().fs.writeFile(...args),
  exists: (...args) => paperBridge().fs.exists(...args),
  mkdir: (...args) => paperBridge().fs.mkdir(...args),
  remove: (...args) => paperBridge().fs.remove(...args),
  rename: (...args) => paperBridge().fs.rename(...args),
  removeDir: (...args) => paperBridge().fs.removeDir(...args),
  appendFile: (...args) => paperBridge().fs.appendFile(...args),
  writeAtomic: (...args) => paperBridge().fs.writeAtomic(...args),
  fsync: (...args) => paperBridge().fs.fsync(...args),
  readRange: (...args) => paperBridge().fs.readRange(...args),
}
