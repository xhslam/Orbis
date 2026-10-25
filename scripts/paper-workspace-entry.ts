// Isolated integration harness only. Never imported by the shipping main process.
export { registerPaperIpc, registerPaperView, registerPaperWindow } from '../src/main/paper/ipc'
export { registerReadingWorkspaceIpc } from '../src/main/reading-workspace'
export { showReadingWindow, showHistoryWindow } from '../src/main/window'
export { registerReadingIpc } from '../src/main/reading/ipc'
export { createReadingStore } from '../src/main/reading/store'
export { openNodeServices } from '../src/hosts/node/services'
export { SERVICE_TABLE } from '../src/kernel/core/serviceTable'
