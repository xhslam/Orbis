import { createReadStream } from 'node:fs'
import { cp } from 'node:fs/promises'
import { extname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import type { Plugin } from 'vite'

/** Keep runtime decoders out of Vite's module pipeline, but ship them verbatim. */
export function pdfjsAssets(vendorRoot: string): Plugin {
  let outDir = ''
  let building = false
  const types: Record<string, string> = {
    '.wasm': 'application/wasm',
    '.js': 'text/javascript',
    '.mjs': 'text/javascript',
    '.bcmap': 'application/octet-stream',
  }
  return {
    name: 'paper:pdfjs-assets',
    configResolved(config) {
      building = config.command === 'build'
      outDir = resolve(config.root, config.build.outDir)
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/pdfjs/')) return next()
        let decoded: string
        try {
          decoded = decodeURIComponent(req.url.slice('/pdfjs/'.length).split(/[?#]/)[0] ?? '')
        } catch {
          res.statusCode = 400
          res.end('bad path')
          return
        }
        const file = resolve(vendorRoot, decoded)
        const rel = relative(vendorRoot, file)
        if (
          decoded.includes('\0') ||
          isAbsolute(rel) ||
          rel === '..' ||
          rel.startsWith(`..${sep}`)
        ) {
          res.statusCode = 403
          res.end('forbidden')
          return
        }
        const stream = createReadStream(file)
        stream.once('error', (error: NodeJS.ErrnoException) => {
          res.statusCode = error.code === 'ENOENT' ? 404 : 500
          res.setHeader('Content-Type', 'text/plain')
          res.end(`pdf.js asset unavailable: ${rel}`)
        })
        stream.once('open', () => {
          res.setHeader('Content-Type', types[extname(file)] ?? 'application/octet-stream')
          stream.pipe(res)
        })
        res.once('close', () => stream.destroy())
      })
    },
    async closeBundle() {
      if (building) await cp(vendorRoot, join(outDir, 'pdfjs'), { recursive: true })
    },
  }
}

/** Paper's makePdf adapter is the only supported PDF backend. */
export function foliatePdfStub(): Plugin {
  const stub = '\0paper:foliate-pdf-stub'
  return {
    name: 'paper:foliate-pdf-stub',
    enforce: 'pre',
    resolveId(source, importer) {
      return source === './pdf.js' && importer?.includes('foliate-js') ? stub : null
    },
    load(id) {
      if (id !== stub) return null
      return `export const makePDF = () => { throw new Error('Use Paper makePdf() before View.open()') }`
    },
  }
}
