// Module resolver for `node --test` so library code can be unit-tested
// without a bundler.
//
// Two gaps between how Next resolves modules and how bare Node does:
//
//   1. the `@/…` alias from tsconfig paths, which Node knows nothing about
//   2. extensionless relative imports — Next adds .ts/.tsx, Node does not,
//      and writing `./foo.ts` in the source would break `tsc` unless
//      allowImportingTsExtensions is on
//
// Registering this keeps the source identical to what ships while letting
// `node --test` import it directly. Node 24 strips the types itself, so no
// transpiler is involved.
//
//   node --test --import ./scripts/test-resolver.mjs tests/*.test.ts

import { register } from 'node:module'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const SRC = path.join(ROOT, 'src')
const EXTS = ['.ts', '.tsx', '.js', '.mjs', '/index.ts', '/index.tsx']

function firstExisting(base) {
  if (existsSync(base) && !existsSync(base + '.ts')) {
    // A real file (or a directory, handled by the /index candidates below).
    const isFile = !base.endsWith(path.sep)
    if (isFile && path.extname(base)) return base
  }
  for (const ext of EXTS) {
    const candidate = base + ext
    if (existsSync(candidate)) return candidate
  }
  return null
}

export async function resolve(specifier, context, next) {
  // `server-only` exists to throw if a module reaches a client bundle. Under
  // `node --test` there is no bundler and no client, so it throws on every
  // server module and nothing server-side is testable. Stubbed here only;
  // the real guard still runs in the build, which is where it matters.
  if (specifier === 'server-only' || specifier === 'client-only') {
    return { url: 'data:text/javascript,export{}', shortCircuit: true }
  }

  // @/x → src/x
  if (specifier.startsWith('@/')) {
    const hit = firstExisting(path.join(SRC, specifier.slice(2)))
    if (hit) return { url: pathToFileURL(hit).href, shortCircuit: true }
  }

  // Extensionless relative imports.
  if (specifier.startsWith('.') && !path.extname(specifier)) {
    const fromDir = path.dirname(fileURLToPath(context.parentURL ?? pathToFileURL(ROOT).href))
    const hit = firstExisting(path.resolve(fromDir, specifier))
    if (hit) return { url: pathToFileURL(hit).href, shortCircuit: true }
  }

  return next(specifier, context)
}

register(import.meta.url, pathToFileURL('./'))
