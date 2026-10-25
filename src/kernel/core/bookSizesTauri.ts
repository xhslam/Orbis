/** Historical name retained; measurements run in the trusted Orbis host. */
import { paperBridge } from './paperBridge'
import type { SizePort } from './ports'

export const tauriSizePort: SizePort = {
  contentBytes: (...args) => paperBridge().size.contentBytes(...args),
  libraryBytes: (...args) => paperBridge().size.libraryBytes(...args),
  bytesAt: (...args) => paperBridge().size.bytesAt(...args),
}
