// ── /admin/seo — index + brand health dashboard ──────────────────────────
//
// Central entry point for all SEO tools. Two halves:
//   - LEFT: per-brand health cards (one big number per brand)
//   - RIGHT: tool nav (redirects, 404 monitor, audit reports, etc.)

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { MARKETS } from '@/lib/markets'
import { computeBrandHealth } from '@/lib/seo/brand-health'
import { isGscConfigured } from '@/lib/seo/gsc'
import { GscSyncWidget } from './GscSyncWidget'
import { FeedsHealthWidget } from './FeedsHealthWidget'
import {
  Repeat, AlertTriangle, Link as LinkIcon, ListChecks,
  Settings2, FileText, Activity, ArrowRight, Sparkles, Users,
  Image as ImageIcon,
} from 'lucide-react'

export const metadata: Metadata = { title: 'SEO — Admin' }
export const dynamic = 'force-dynamic'

const TOOLS = [
  { slug: 'brand-profile',  title: 'Brand SEO Profile', desc: 'Pillars, sub-areas, personas, calendar — the strategy Claude reads.', href: '/admin/seo/brand-profile', icon: Settings2 },
  { slug: 'authors',        title: 'Author Profiles', desc: 'E-E-A-T bios + headshots + credentials. Renders Person JSON-LD.', href: '/admin/seo/authors', icon: Users },
  { slug: 'alt-text',       title: 'Alt-text Audit', desc: 'Find published articles with images missing alt text.', href: '/admin/seo/alt-text', icon: ImageIcon },
  { slug: 'audit-reports',  title: 'Weekly Audit Reports', desc: 'Claude-generated action lists per brand. Runs Sunday 02:00 UTC.', href: '/admin/seo/audit-reports', icon: FileText },
  { slug: 'redirects',      title: 'Redirect Manager', desc: '301/302/307/308 — when URLs change, keep external links working.', href: '/admin/seo/redirects', icon: Repeat },
  { slug: '404-log',        title: '404 Monitor', desc: 'Top 404 paths. One-click convert any to a 301 redirect.', href: '/admin/seo/404-log', icon: AlertTriangle },
  { slug: 'internal-links', title: 'Internal Link Queue', desc: 'Auto-found linking opportunities. Editor approves or rejects.', href: '/admin/seo/internal-links', icon: LinkIcon },
  { slug: 'bulk',           title: 'Bulk SEO Edit', desc: 'Filter, multi-select, apply across many articles at once.', href: '/admin/seo/bulk', icon: ListChecks },
  { slug: 'seo-health',     title: 'Route Coverage Audit', desc: 'Every static page route + which SEO surfaces each one taps.', href: '/admin/seo-health', icon: Activity },
] as const

export default async function SeoHomePage() {
  await requireAdmin()
  const sb = createAdminClient()

  // Compute health for every brand in parallel.
  const healthData = await Promise.all(
    MARKETS.map(m => computeBrandHealth(sb, m.slug))
  )

  return (
    <div className="portal-app flex flex-col flex-1 min-h-0 bg-portal-bg">
      <div className="page-header">
        <div>
          <h1 className="ph-title">SEO Command Center</h1>
          <div className="text-muted text-sm">
            Per-brand health at a glance + every editorial SEO tool in one place. Click any score to drill into the brand&apos;s
            audit report; click any tool to open it.
          </div>
        </div>
      </div>

      <div className="content-body overflow-y-auto">

        {/* ── Brand health cards ──────────────────────────────── */}
        <div style={{ marginBottom: 18 }}>
          <div className="text-portal-sub fw-700" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 8 }}>
            Brand health
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
            {MARKETS.map((m, i) => {
              const h = healthData[i]
              return (
                <Link
                  key={m.slug}
                  href={`/admin/seo/audit-reports`}
                  className="bg-white border border-portal-border rounded-lg"
                  style={{ padding: 14, textDecoration: 'none', display: 'block' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <ScoreBadge score={h.score} grade={h.grade} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="fw-700 text-portal-text" style={{ fontSize: 14 }}>{m.displayName}</div>
                      <div className="text-portal-sub" style={{ fontSize: 11 }}>
                        {h.publishedArticles} published · avg article {h.avgArticleScore}
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                    <Mini label="Focus kw" value={`${h.withFocusKeywordPct}%`} />
                    <Mini label="Desc"     value={`${h.withDescriptionPct}%`} />
                    <Mini label="Hero img" value={`${h.withHeroImagePct}%`} />
                    <Mini label="Recency"  value={`${h.recencyPct}%`} />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* ── Tool nav ────────────────────────────────────────── */}
        <div>
          <div className="text-portal-sub fw-700" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 8 }}>
            Tools
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 10 }}>
            {TOOLS.map(t => {
              const Icon = t.icon
              return (
                <Link
                  key={t.slug}
                  href={t.href}
                  className="bg-white border border-portal-border rounded-lg"
                  style={{ padding: 16, textDecoration: 'none', display: 'block' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--color-portal-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-portal-navy)' }}>
                      <Icon size={16} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="fw-700 text-portal-text" style={{ fontSize: 14 }}>{t.title}</div>
                    </div>
                    <ArrowRight size={14} color="var(--color-portal-sub)" />
                  </div>
                  <p className="text-portal-sub" style={{ fontSize: 12, lineHeight: 1.45 }}>{t.desc}</p>
                </Link>
              )
            })}
          </div>
        </div>

        {/* ── GSC sync ────────────────────────────────────────── */}
        <GscSyncWidget configured={isGscConfigured()} />

        {/* ── Feeds healthcheck ──────────────────────────────── */}
        <FeedsHealthWidget />

        {/* ── First-time tip ─────────────────────────────────── */}
        <div className="card" style={{ marginTop: 18, borderLeft: '3px solid var(--color-portal-blue)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={14} color="var(--color-portal-blue)" />
            <strong className="text-portal-text" style={{ fontSize: 13 }}>First-time setup tip</strong>
          </div>
          <p className="text-portal-sub" style={{ fontSize: 12, marginTop: 6, lineHeight: 1.5 }}>
            Open each brand&apos;s profile → click <strong>Generate first draft (Claude)</strong> → save. The weekly audit
            quality improves dramatically once each brand has its pillars + sub-areas + editorial calendar filled in.
          </p>
        </div>
      </div>
    </div>
  )
}

function ScoreBadge({ score, grade }: { score: number; grade: string }) {
  const color = score >= 85 ? 'var(--color-portal-green)'
              : score >= 70 ? 'var(--color-portal-blue)'
              : score >= 50 ? 'var(--color-portal-amber)'
              :               'var(--color-portal-red)'
  return (
    <div style={{
      width: 56, height: 56, borderRadius: '50%',
      background: color, color: 'white',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 20, fontWeight: 900, flexShrink: 0,
    }} title={grade}>
      {score}
    </div>
  )
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: 'var(--color-portal-bg)', borderRadius: 4, padding: '4px 6px', textAlign: 'center' }}>
      <div className="text-portal-sub" style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '.3px' }}>{label}</div>
      <div className="text-portal-text fw-700" style={{ fontSize: 12 }}>{value}</div>
    </div>
  )
}

