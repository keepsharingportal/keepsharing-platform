// Module resolver hook for `node --test`.
//
// The repo has no test framework, and adding vitest would drag ~100 packages
// and a lockfile change into the build for two pure functions. Node 24 strips
// TypeScript types natively, so the only thing actually missing is resolution:
//
//   1. the `@/*` → `src/*` alias from tsconfig.json, which Node knows nothing
//      about, and
//   2. extensionless imports (`./classify`), which Node ESM does not resolve
//      the way bundlers do.
//
// Both are handled here. Usage:
//
//   node --import ./scripts/test-resolver.mjs --test "src/**/*.test.ts"
//
// This file is dev tooling only — nothing in src/ imports it, and it is never
// part of a Next.js build.

import { registerHooks } from 'node:module'
import { existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

const SRC = pathToFileURL(path.resolve(process.cwd(), 'src') + path.sep).href

/** Try `<p>.ts`, `<p>.tsx`, `<p>/index.ts` and return the first that exists. */
function withExtension(specifierUrl) {
  const filePath = fileURLToPath(specifierUrl)
  if (path.extname(filePath) && existsSync(filePath)) return specifierUrl
  for (const candidate of ['.ts', '.tsx', '.js', '.mjs', '/index.ts', '/index.tsx']) {
    if (existsSync(filePath + candidate)) return specifierUrl + candidate
  }
  return specifierUrl
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    // tsconfig paths: "@/*" -> "./src/*"
    if (specifier.startsWith('@/')) {
      return nextResolve(withExtension(SRC + specifier.slice(2)), context)
    }
    // Relative imports without an extension, as TypeScript source writes them.
    if ((specifier.startsWith('./') || specifier.startsWith('../')) && !path.extname(specifier)) {
      const base = context.parentURL ?? pathToFileURL(process.cwd() + path.sep).href
      return nextResolve(withExtension(new URL(specifier, base).href), context)
    }
    return nextResolve(specifier, context)
  },
})
