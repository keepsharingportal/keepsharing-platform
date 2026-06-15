// ── /admin/seo-health ─────────────────────────────────────────────────────
//
// Inventory of every static page route in the app, with a quick
// audit of which SEO surfaces each one taps:
//
//   - Uses buildPageMetadata vs static metadata (per-page OG + Twitter)
//   - Emits JSON-LD (article, breadcrumb, item-list, place, event, etc.)
//   - In sitemap (auto-discovered or curated)
//   - In news-sitemap, image-sitemap, RSS feed
//
// Lets the editor see at a glance which pages are "naked" and need
// SEO work. Read-only — fixes are code changes.

import type { Metadata } from 'next'
import fs from 'node:fs'
import path from 'node:path'

export const metadata: Metadata = { title: 'SEO Health — Admin' }
export const dynamic = 'force-dynamic'

interface RouteAudit {
  route:                string
  filePath:             string
  hasGenerateMetadata:  boolean
  usesBuildPageMetadata:boolean
  hasJsonLd:            boolean
  jsonLdTypes:          string[]
  inCuratedSitemap:     boolean
  emitsRSS:             boolean
  emitsImageSitemap:    boolean
  emitsNewsSitemap:     boolean
}

/** schema.org types we look for in each page source — drives the
 *  granular badge column + the "missing recommended schema" hints. */
const JSONLD_PROBES: Array<{ key: string; needles: string[] }> = [
  { key: 'Article',        needles: ['articleJsonLd', '"NewsArticle"', '"Article"', '"BlogPosting"'] },
  { key: 'BreadcrumbList', needles: ['breadcrumbJsonLd', '"BreadcrumbList"'] },
  { key: 'ItemList',       needles: ['itemListJsonLd', '"ItemList"'] },
  { key: 'Place',          needles: ['placeJsonLd', '"Place"', '"LocalBusiness"'] },
  { key: 'Event',          needles: ['eventJsonLd', '"Event"'] },
  { key: 'Person',         needles: ['personJsonLd', '"Person"'] },
  { key: 'FAQPage',        needles: ['faqPageJsonLd', '"FAQPage"'] },
  { key: 'HowTo',          needles: ['howToJsonLd', '"HowTo"'] },
  { key: 'Organization',   needles: ['"NewsMediaOrganization"', '"Organization"'] },
  { key: 'Speakable',      needles: ['"SpeakableSpecification"', 'speakableSpecification'] },
]

function detectJsonLdTypes(src: string): string[] {
  const found: string[] = []
  for (const probe of JSONLD_PROBES) {
    if (probe.needles.some(n => src.includes(n))) found.push(probe.key)
  }
  return found
}

/** Heuristic mapping route shape → JSON-LD types the editor really should add.
 *  Used to flag "this page is naked AND should have Schema X" — drives the
 *  Needs-Work focus panel. */
function recommendJsonLd(route: string): string[] {
  if (/\/columns\/.*\/.*$/.test(route))             return ['Article', 'BreadcrumbList']
  if (route.endsWith('/[slug]') || /\/listings\//.test(route))      return ['Place', 'BreadcrumbList']
  if (route === '/calendar' || /\/calendar\//.test(route)) return ['ItemList']
  if (route === '/authors/[slug]')                  return ['Person']
  if (route === '/search')                          return ['BreadcrumbList']
  if (route === '/' || route === '/about' || route === '/contact') return ['Organization']
  return []
}

const SKIP_DIRS = new Set(['admin', 'api', 'auth', 'login'])
const SKIP_DIR_PREFIX = ['_', '(', '@', '[']

function walk(): RouteAudit[] {
  const root = path.join(process.cwd(), 'src', 'app')
  const out: RouteAudit[] = []
  function visit(dir: string, route: string) {
    let entries: fs.Dirent[]
    try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
    let pageFile: string | null = null
    for (const e of entries) {
      if (e.isFile() && (e.name === 'page.tsx' || e.name === 'page.ts' || e.name === 'page.mdx')) {
        pageFile = path.join(dir, e.name)
        break
      }
    }
    if (pageFile) {
      const src = (() => { try { return fs.readFileSync(pageFile!, 'utf8') } catch { return '' } })()
      const jsonLdTypes = detectJsonLdTypes(src)
      out.push({
        route:                 route || '/',
        filePath:              path.relative(process.cwd(), pageFile),
        hasGenerateMetadata:   /export\s+async\s+function\s+generateMetadata/.test(src) || /export\s+function\s+generateMetadata/.test(src),
        usesBuildPageMetadata: /buildPageMetadata\s*\(/.test(src),
        hasJsonLd:             jsonLdTypes.length > 0,
        jsonLdTypes,
        inCuratedSitemap:      false,
        emitsRSS:              false,
        emitsImageSitemap:     false,
        emitsNewsSitemap:      false,
      })
    }
    for (const e of entries) {
      if (!e.isDirectory()) continue
      if (SKIP_DIRS.has(e.name)) continue
      if (SKIP_DIR_PREFIX.some(p => e.name.startsWith(p))) continue
      visit(path.join(dir, e.name), `${route}/${e.name}`)
    }
  }
  visit(root, '')
  return out.sort((a, b) => a.route.localeCompare(b.route))
}

function tagCuratedSitemap(rows: RouteAudit[]) {
  const sitemapPath = path.join(process.cwd(), 'src', 'app', 'sitemap.ts')
  const src = (() => { try { return fs.readFileSync(sitemapPath, 'utf8') } catch { return '' } })()
  for (const r of rows) {
    // Curated sitemap entries appear as `${origin}<path>` template literals.
    const needle1 = `\${origin}${r.route}\``
    const needle2 = `\${origin}${r.route} `
    if (src.includes(needle1) || src.includes(needle2)) r.inCuratedSitemap = true
  }
}

function tagFeedCoverage(rows: RouteAudit[]) {
  for (const r of rows) {
    // News sitemap + image sitemap + RSS feed are article-driven, not
    // hub-driven — every published article auto-flows. Flag the article
    // detail route family explicitly.
    if (r.route === '/columns/[column]/[slug]' || r.route.includes('/articles/')) {
      r.emitsRSS = true
      r.emitsImageSitemap = true
      r.emitsNewsSitemap = true
    }
  }
}

export default async function SeoHealthPage() {
  const rows = walk()
  tagCuratedSitemap(rows)
  tagFeedCoverage(rows)

  // Compute a simple gap-score per row so the worst-off pages float up
  // in a "needs work" filter.
  const scored = rows.map(r => {
    let score = 0
    if (r.usesBuildPageMetadata) score += 2
    else if (r.hasGenerateMetadata) score += 1
    if (r.hasJsonLd) score += 2
    if (r.inCuratedSitemap) score += 1
    return { ...r, score }
  })

  const summary = {
    total:           scored.length,
    fullCoverage:    scored.filter(r => r.score >= 5).length,
    naked:           scored.filter(r => r.score === 0).length,
    partial:         scored.filter(r => r.score > 0 && r.score < 5).length,
  }

  // Routes that recommend specific JSON-LD but emit none / wrong types.
  const schemaGaps = scored
    .map(r => {
      const want = recommendJsonLd(r.route)
      if (want.length === 0) return null
      const missing = want.filter(t => !r.jsonLdTypes.includes(t))
      if (missing.length === 0) return null
      return { route: r.route, missing, has: r.jsonLdTypes, filePath: r.filePath }
    })
    .filter(Boolean) as Array<{ route: string; missing: string[]; has: string[]; filePath: string }>

  return (
    <div className="portal-app flex flex-col flex-1 min-h-0 bg-portal-bg">
      <div className="page-header">
        <div>
          <h1 className="ph-title">SEO Health</h1>
          <div className="text-muted text-sm">
            Inventory of every static page route — what SEO each one has, what&apos;s missing.
            Auto-refreshes on every deploy.
          </div>
        </div>
      </div>

      <div className="content-body overflow-y-auto">

        <div className="stats-row" style={{ marginBottom: 16 }}>
          <div className="stat-card">
            <div className="stat-num">{summary.total}</div>
            <div className="stat-label">Total routes</div>
          </div>
          <div className="stat-card">
            <div className="stat-num has-green">{summary.fullCoverage}</div>
            <div className="stat-label">Full coverage</div>
          </div>
          <div className="stat-card">
            <div className="stat-num has-amber">{summary.partial}</div>
            <div className="stat-label">Partial</div>
          </div>
          <div className="stat-card">
            <div className="stat-num has-red">{summary.naked}</div>
            <div className="stat-label">Naked (no SEO)</div>
          </div>
        </div>

        {/* Schema-gap focus list. Surfaces the editor's actual work: routes
            that should ship specific JSON-LD types and don't yet. */}
        {schemaGaps.length > 0 && (
          <div className="card" style={{ marginBottom: 14, borderLeft: '3px solid var(--color-portal-amber)' }}>
            <div className="fw-700" style={{ marginBottom: 6, fontSize: 13 }}>
              Missing recommended schema ({schemaGaps.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
              {schemaGaps.map(g => (
                <div key={g.route} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                  <code style={{ fontSize: 11, color: 'var(--color-portal-text)', minWidth: 200 }}>{g.route}</code>
                  <span className="text-portal-sub" style={{ fontSize: 11 }}>needs:</span>
                  {g.missing.map(t => <Tag key={t} tone="amber">{t}</Tag>)}
                  {g.has.length > 0 && (
                    <>
                      <span className="text-portal-sub" style={{ fontSize: 11, marginLeft: 8 }}>has:</span>
                      {g.has.map(t => <Tag key={t} tone="green">{t}</Tag>)}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="card" style={{ marginBottom: 14, fontSize: 13, lineHeight: 1.5 }}>
          <div className="fw-700" style={{ marginBottom: 6 }}>How to read this</div>
          <ul style={{ paddingLeft: 18, color: 'var(--color-portal-sub)' }}>
            <li><strong>Meta</strong>: ✓ = generateMetadata exists. ✓✓ = uses buildPageMetadata (canonical + OG + Twitter + brand).</li>
            <li><strong>JSON-LD</strong>: ✓ = page injects structured data (Article / Place / ItemList / etc).</li>
            <li><strong>Sitemap</strong>: ✓ = curated entry in sitemap.ts (priority/changefreq tuned). All static pages also get auto-discovered into sitemap.xml.</li>
            <li><strong>RSS / News / Image sitemaps</strong>: ✓ = article detail pages auto-feed all three.</li>
          </ul>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead style={{ background: 'var(--color-portal-bg)' }}>
              <tr style={{ textAlign: 'left' }}>
                <Th>Route</Th>
                <Th center>Meta</Th>
                <Th center>JSON-LD</Th>
                <Th center>Sitemap</Th>
                <Th center>RSS</Th>
                <Th center>News</Th>
                <Th center>Image</Th>
                <Th>Source</Th>
              </tr>
            </thead>
            <tbody>
              {scored.map(r => (
                <tr key={r.route} style={{ borderTop: '1px solid var(--color-portal-border)' }}>
                  <Td>
                    <code style={{ fontSize: 12, color: 'var(--color-portal-text)' }}>{r.route}</code>
                  </Td>
                  <Td center>
                    {r.usesBuildPageMetadata ? <Tag tone="green">✓✓</Tag>
                      : r.hasGenerateMetadata ? <Tag tone="amber">✓</Tag>
                      : <Tag tone="red">—</Tag>}
                  </Td>
                  <Td center>
                    {r.jsonLdTypes.length === 0
                      ? <Tag tone="gray">—</Tag>
                      : (
                        <span style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center' }}>
                          {r.jsonLdTypes.map(t => <Tag key={t} tone="green">{t}</Tag>)}
                        </span>
                      )
                    }
                  </Td>
                  <Td center>{r.inCuratedSitemap ? <Tag tone="green">✓</Tag> : <Tag tone="gray">auto</Tag>}</Td>
                  <Td center>{r.emitsRSS ? <Tag tone="green">✓</Tag> : <Tag tone="gray">—</Tag>}</Td>
                  <Td center>{r.emitsNewsSitemap ? <Tag tone="green">✓</Tag> : <Tag tone="gray">—</Tag>}</Td>
                  <Td center>{r.emitsImageSitemap ? <Tag tone="green">✓</Tag> : <Tag tone="gray">—</Tag>}</Td>
                  <Td><code style={{ fontSize: 11, color: 'var(--color-portal-sub)' }}>{r.filePath}</code></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-portal-sub text-xs" style={{ marginTop: 14, lineHeight: 1.5 }}>
          Tip: any route showing <Tag tone="red">—</Tag> under Meta is &quot;naked&quot; — it inherits only the root layout&apos;s
          brand-default metadata. That means a Facebook share will use the generic brand title + description, not the
          page&apos;s own. Add <code>generateMetadata()</code> calling <code>buildPageMetadata()</code> from{' '}
          <code>@/lib/seo/metadata</code> to fix.
        </p>

      </div>
    </div>
  )
}

function Th({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <th style={{
      padding: '10px 14px', fontSize: 11, fontWeight: 700,
      color: 'var(--color-portal-sub)',
      textTransform: 'uppercase', letterSpacing: '.4px',
      textAlign: center ? 'center' : 'left',
    }}>{children}</th>
  )
}

function Td({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <td style={{ padding: '8px 14px', verticalAlign: 'middle', textAlign: center ? 'center' : 'left' }}>
      {children}
    </td>
  )
}

function Tag({ children, tone }: { children: React.ReactNode; tone: 'green' | 'amber' | 'red' | 'gray' }) {
  const bg = tone === 'green' ? 'var(--color-portal-green-lt, #ecfdf5)'
           : tone === 'amber' ? 'var(--color-portal-amber-lt, #fef3c7)'
           : tone === 'red'   ? 'var(--color-portal-red-lt,   #fee2e2)'
           :                    'var(--color-portal-bg)'
  const fg = tone === 'green' ? 'var(--color-portal-green)'
           : tone === 'amber' ? 'var(--color-portal-amber)'
           : tone === 'red'   ? 'var(--color-portal-red)'
           :                    'var(--color-portal-sub)'
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px',
      background: bg, color: fg,
      borderRadius: 10, fontSize: 11, fontWeight: 700,
      minWidth: 28, textAlign: 'center',
    }}>{children}</span>
  )
}
