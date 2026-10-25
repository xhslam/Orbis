import { fileURLToPath } from 'node:url'
import { configDefaults, defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { foliatePdfStub } from './scripts/vite/paper'

export default defineConfig({
  plugins: [react(), foliatePdfStub()],
  resolve: {
    alias: {
      '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)),
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: { exclude: ['foliate-js'] },
  test: {
    environment: 'node',
    include: ['src/kernel/**/*.test.{ts,tsx}', 'src/hosts/node/**/*.test.ts'],
    exclude: [
      ...configDefaults.exclude,
      '**/audiobook*.test.{ts,tsx}',
      '**/useAudiobook*.test.{ts,tsx}',
    ],
    setupFiles: ['./src/test/paper-setup.ts'],
    testTimeout: 30_000,
    maxWorkers: 6,
    silent: 'passed-only',
  },
})
