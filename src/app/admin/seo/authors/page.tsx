// ── /admin/seo/authors — editor-controlled author profiles ────────────────
//
// One row per distinct author_name across published articles. Editor
// can open any author to set bio / headshot / job title / credentials
// / social URLs / contact email. The public /authors/[slug] page reads
// from seo_authors first, falling back to auto-generated values.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { authorNameToSlug } from '@/lib/seo/author-slug'
import { listAuthorProfiles } from '@/lib/seo/authors'
import { ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react'

export const metadata: Metadata = { title: 'Authors — SEO — Admin' }
export const dynamic = 'force-dynamic'

interface DistinctAuthor {
  slug:          string
  name:          string
  articleCount:  number
}

export default async function AuthorsPage() {
  await requireAdmin()
  const sb = createAdminClient()

  // Collect every distinct author across published articles. With <2000
  // active articles this client-side group-by is fine; once the corpus
  // outgrows that we move it to a SQL view.
  const { data: arts } = await sb
    .from('guide_articles')
    .select('author_name')
    .eq('published', true)
    .not('author_name', 'is', null)
    .limit(5000)

  const tally = new Map<string, { name: string; count: number }>()
  for (const a of (arts ?? []) as Array<{ author_name: string | null }>) {
    const n = (a.author_name ?? '').trim()
    if (!n) continue
    const slug = authorNameToSlug(n)
    if (!slug) continue
    const cur = tally.get(slug) ?? { name: n, count: 0 }
    cur.count++
    tally.set(slug, cur)
  }

  const distinct: DistinctAuthor[] = Array.from(tally.entries())
    .map(([slug, v]) => ({ slug, name: v.name, articleCount: v.count }))
    .sort((a, b) => b.articleCount - a.articleCount)

  const profiles = await listAuthorProfiles(sb)
  const profileBySlug = new Map(profiles.map(p => [p.authorSlug, p]))

  return (
    <div className="portal-app flex flex-col flex-1 min-h-0 bg-portal-bg">
      <div className="page-header">
        <div>
          <Link href="/admin/seo" className="text-xs text-portal-sub hover:text-portal-text">← SEO</Link>
          <h1 className="ph-title" style={{ marginTop: 6 }}>Author profiles</h1>
          <div className="text-muted text-sm">
            E-E-A-T bios, headshots, credentials, and social links. Filled in here, surfaced on
            <code> /authors/[slug] </code> with Person JSON-LD.
          </div>
        </div>
      </div>

      <div className="content-body overflow-y-auto">
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead style={{ background: 'var(--color-portal-bg)' }}>
              <tr style={{ textAlign: 'left' }}>
                <Th>Author</Th>
                <Th center>Articles</Th>
                <Th center>Bio</Th>
                <Th center>Headshot</Th>
                <Th center>Credentials</Th>
                <Th center>Socials</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {distinct.map(a => {
                const p = profileBySlug.get(a.slug)
                return (
                  <tr key={a.slug} style={{ borderTop: '1px solid var(--color-portal-border)' }}>
                    <Td>
                      <div className="fw-700" style={{ fontSize: 13 }}>{a.name}</div>
                      <div className="text-portal-sub" style={{ fontSize: 11 }}><code>{a.slug}</code></div>
                    </Td>
                    <Td center>{a.articleCount}</Td>
                    <Td center>{p?.bio          ? <Done /> : <Gap />}</Td>
                    <Td center>{p?.headshotUrl  ? <Done /> : <Gap />}</Td>
                    <Td center>{(p?.credentials?.length ?? 0) > 0 ? <Done /> : <Gap />}</Td>
                    <Td center>{(p?.socialUrls?.length  ?? 0) > 0 ? <Done /> : <Gap />}</Td>
                    <Td>
                      <Link href={`/admin/seo/authors/${a.slug}`} className="text-portal-blue fw-700" style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        Edit <ArrowRight size={11} />
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
  )
}

function Th({ children, center }: { children?: React.ReactNode; center?: boolean }) {
  return (
    <th style={{
      padding: '10px 14px', fontSize: 11, fontWeight: 700,
      color: 'var(--color-portal-sub)',
      textTransform: 'uppercase', letterSpacing: '.4px',
      textAlign: center ? 'center' : 'left',
    }}>{children}</th>
  )
}

function Td({ children, center }: { children?: React.ReactNode; center?: boolean }) {
  return (
    <td style={{ padding: '8px 14px', verticalAlign: 'middle', textAlign: center ? 'center' : 'left' }}>{children}</td>
  )
}

function Done() { return <CheckCircle2 size={14} color="var(--color-portal-green)" /> }
function Gap()  { return <AlertTriangle size={14} color="var(--color-portal-amber)" /> }
