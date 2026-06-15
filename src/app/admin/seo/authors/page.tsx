// ── /admin/seo/authors — editor-controlled author profiles ────────────────

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireSettingsAccess } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { authorNameToSlug } from '@/lib/seo/author-slug'
import { listAuthorProfiles } from '@/lib/seo/authors'
import { ArrowLeft, ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react'

export const metadata: Metadata = { title: 'Authors — SEO — Admin' }
export const dynamic = 'force-dynamic'

interface DistinctAuthor { slug: string; name: string; articleCount: number }

export default async function AuthorsPage() {
  await requireSettingsAccess()
  const sb = createAdminClient()

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
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-white border-b border-portal-border px-6 py-4 shrink-0">
        <Link href="/admin/seo" className="text-[11px] font-semibold text-portal-sub hover:text-portal-text inline-flex items-center gap-1 mb-1">
          <ArrowLeft size={11} /> SEO
        </Link>
        <h1 className="text-[18px] font-bold text-portal-text">Author profiles</h1>
        <p className="text-[12px] text-portal-sub mt-1">
          E-E-A-T bios, headshots, credentials, and social links. Filled in here, surfaced on
          <code className="ml-1">/authors/[slug]</code> with Person JSON-LD.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto bg-portal-bg">
        <div className="px-6 py-6">
          <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
            <table className="w-full text-[13px]">
              <thead className="bg-portal-bg">
                <tr className="text-left">
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
                    <tr key={a.slug} className="border-t border-portal-border">
                      <Td>
                        <div className="text-[13px] font-bold text-portal-text">{a.name}</div>
                        <div className="text-[11px] text-portal-sub"><code>{a.slug}</code></div>
                      </Td>
                      <Td center>{a.articleCount}</Td>
                      <Td center>{p?.bio          ? <Done /> : <Gap />}</Td>
                      <Td center>{p?.headshotUrl  ? <Done /> : <Gap />}</Td>
                      <Td center>{(p?.credentials?.length ?? 0) > 0 ? <Done /> : <Gap />}</Td>
                      <Td center>{(p?.socialUrls?.length  ?? 0) > 0 ? <Done /> : <Gap />}</Td>
                      <Td>
                        <Link href={`/admin/seo/authors/${a.slug}`} className="text-portal-blue text-[12px] font-bold inline-flex items-center gap-1">
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

function Done() { return <CheckCircle2 size={14} className="text-portal-green" /> }
function Gap()  { return <AlertTriangle size={14} className="text-portal-amber" /> }
