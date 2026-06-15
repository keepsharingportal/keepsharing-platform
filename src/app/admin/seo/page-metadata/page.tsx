// ── /admin/seo/page-metadata ─────────────────────────────────────────────
//
// Yoast / MashShare equivalent for static pages. Discovers every
// public route in the app via the same walk used by /admin/seo-health
// + cross-references the page_metadata_overrides table so the editor
// can see at a glance which routes have custom social copy and which
// inherit defaults.

import type { Metadata } from 'next'
import Link from 'next/link'
import fs from 'node:fs'
import path from 'node:path'
import { requireSettingsAccess } from '@/lib/admin/auth'
import { listAllPageMetadataOverrides } from '@/lib/seo/page-metadata-overrides'
import { ArrowLeft, ArrowRight, CheckCircle2, Circle, Share2 } from 'lucide-react'

export const metadata: Metadata = { title: 'Page metadata — SEO — Admin' }
export const dynamic = 'force-dynamic'

interface Route { path: string }

const SKIP_DIRS       = new Set(['admin', 'api', 'auth', 'login'])
const SKIP_DIR_PREFIX = ['_', '(', '@', '[']

function walkRoutes(): Route[] {
  const root = path.join(process.cwd(), 'src', 'app')
  const out: Route[] = []
  function visit(dir: string, route: string) {
    let entries: fs.Dirent[]
    try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
    const hasPage = entries.some(e => e.isFile() && (e.name === 'page.tsx' || e.name === 'page.ts' || e.name === 'page.mdx'))
    if (hasPage) out.push({ path: route || '/' })
    for (const e of entries) {
      if (!e.isDirectory()) continue
      if (SKIP_DIRS.has(e.name)) continue
      if (SKIP_DIR_PREFIX.some(p => e.name.startsWith(p))) continue
      visit(path.join(dir, e.name), `${route}/${e.name}`)
    }
  }
  visit(root, '')
  return out.sort((a, b) => a.path.localeCompare(b.path))
}

export default async function PageMetadataIndex() {
  await requireSettingsAccess()
  const routes = walkRoutes()
  const overrides = await listAllPageMetadataOverrides()
  const overrideByPath = new Map<string, typeof overrides[number]>()
  for (const o of overrides) overrideByPath.set(o.route_path.toLowerCase().replace(/\/$/, ''), o)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-white border-b border-portal-border px-6 py-4 shrink-0">
        <Link href="/admin/seo" className="text-[11px] font-semibold text-portal-sub hover:text-portal-text inline-flex items-center gap-1 mb-1">
          <ArrowLeft size={11} /> SEO
        </Link>
        <h1 className="text-[18px] font-bold text-portal-text">
          <Share2 size={16} className="inline -translate-y-0.5 mr-1" /> Page metadata + social sharing
        </h1>
        <p className="text-[12px] text-portal-sub mt-1">
          Per-route override editor for OG title / description / image + Twitter + Pinterest. Same idea as
          Yoast or MashShare in WordPress — every static page can have its social sharing copy tuned without
          touching code. Article pages have their own per-article editor at <code>/admin/articles/[id]/seo</code>.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto bg-portal-bg">
        <div className="px-6 py-6">
          <div className="grid grid-cols-3 gap-3 mb-4">
            <Stat label="Discovered routes" value={String(routes.length)} />
            <Stat label="With overrides"    value={String(overrides.length)} tone="blue" />
            <Stat label="Using defaults"    value={String(routes.length - overrides.length)} tone={routes.length - overrides.length > 0 ? 'amber' : 'green'} />
          </div>

          <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
            <table className="w-full text-[13px]">
              <thead className="bg-portal-bg">
                <tr className="text-left">
                  <Th>Route</Th>
                  <Th center>Has override</Th>
                  <Th>OG title</Th>
                  <Th>OG description</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {routes.map(r => {
                  const o = overrideByPath.get(r.path.toLowerCase().replace(/\/$/, ''))
                  return (
                    <tr key={r.path} className="border-t border-portal-border">
                      <Td><code className="text-[12px]">{r.path}</code></Td>
                      <Td center>
                        {o
                          ? <CheckCircle2 size={14} className="text-portal-green inline" />
                          : <Circle size={14} className="text-portal-muted inline" />
                        }
                      </Td>
                      <Td>
                        {o?.og_title
                          ? <span className="text-portal-text">{o.og_title.length > 50 ? o.og_title.slice(0, 50) + '…' : o.og_title}</span>
                          : <span className="text-portal-muted italic">inherited</span>
                        }
                      </Td>
                      <Td>
                        {o?.og_description
                          ? <span className="text-portal-text">{o.og_description.length > 60 ? o.og_description.slice(0, 60) + '…' : o.og_description}</span>
                          : <span className="text-portal-muted italic">inherited</span>
                        }
                      </Td>
                      <Td>
                        <Link
                          href={`/admin/seo/page-metadata/edit?route=${encodeURIComponent(r.path)}`}
                          className="text-portal-blue text-[12px] font-bold inline-flex items-center gap-1"
                        >
                          Edit <ArrowRight size={10} />
                        </Link>
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'blue' | 'amber' | 'green' }) {
  const valueClass = tone === 'blue'  ? 'text-portal-blue'
                   : tone === 'amber' ? 'text-portal-amber'
                   : tone === 'green' ? 'text-portal-green'
                   :                    'text-portal-text'
  return (
    <div className="bg-white border border-portal-border rounded-lg p-4">
      <div className={`text-[22px] font-black ${valueClass}`}>{value}</div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-portal-sub mt-1">{label}</div>
    </div>
  )
}

function Th({ children, center }: { children?: React.ReactNode; center?: boolean }) {
  return (
    <th className={`px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-portal-sub ${center ? 'text-center' : 'text-left'}`}>
      {children}
    </th>
  )
}

function Td({ children, center }: { children?: React.ReactNode; center?: boolean }) {
  return <td className={`px-3.5 py-2 align-middle ${center ? 'text-center' : 'text-left'}`}>{children}</td>
}
