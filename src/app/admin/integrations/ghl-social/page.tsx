// ── /admin/integrations/ghl-social ───────────────────────────────
//
// Setup walkthrough + per-brand status panel for the GHL Social
// Planner integration. Every brand needs:
//   1. A sub-account in GHL (one per publication)
//   2. A Private Integration Token (PIT) with social-media-posting scope
//   3. The brand's location ID (visible in GHL admin)
//   4. Env vars set on the deploy environment: GHL_PIT_<SLUG> + GHL_LOCATION_ID_<SLUG>
//   5. At least one social account connected in GHL (FB Page, IG, GBP, etc.)
//
// This page walks through 1-5. The live scope test + connected-account
// listing lives at /admin/social/ghl-check.

import type { Metadata } from 'next'
import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/auth'
import { ArrowLeft, CheckCircle2, XCircle, ExternalLink, Share2, AlertTriangle, Sparkles } from 'lucide-react'
import { MARKETS } from '@/lib/markets'

export const metadata: Metadata = { title: 'GHL Social Planner — Integrations' }
export const dynamic = 'force-dynamic'

const BRAND_ENVS: Record<string, { pit: string; loc: string }> = {
  rrp:      { pit: 'GHL_PIT_RRP',      loc: 'GHL_LOCATION_ID_RRP'      },
  rr50plus: { pit: 'GHL_PIT_RR50PLUS', loc: 'GHL_LOCATION_ID_RR50PLUS' },
  aop:      { pit: 'GHL_PIT_AOP',      loc: 'GHL_LOCATION_ID_AOP'      },
  mbp:      { pit: 'GHL_PIT_MBP',      loc: 'GHL_LOCATION_ID_MBP'      },
  esp:      { pit: 'GHL_PIT_ESP',      loc: 'GHL_LOCATION_ID_ESP'      },
  gpp:      { pit: 'GHL_PIT_GPP',      loc: 'GHL_LOCATION_ID_GPP'      },
}

export default async function GhlSocialIntegrationPage() {
  await requireAdmin()

  return (
    <div className="flex-1 overflow-y-auto bg-portal-bg">
      <div className="bg-white border-b border-portal-border px-6 py-4">
        <Link href="/admin/integrations" className="text-[11px] font-semibold text-portal-sub hover:text-portal-text inline-flex items-center gap-1 mb-1">
          <ArrowLeft size={11} /> Integrations
        </Link>
        <h1 className="text-[20px] font-bold text-portal-text inline-flex items-center gap-2">
          <Share2 size={20} className="text-portal-blue" /> GHL Social Planner
        </h1>
        <p className="text-[12px] text-portal-sub mt-1 max-w-3xl">
          GHL Social Planner is the distribution pipe for the AI Social Strategist. Our system generates
          and approves a weekly plan; GHL fires the actual posts to all 10 channels (FB, IG, GBP, TikTok,
          LinkedIn, Pinterest, YouTube, Threads, Bluesky, Community).
        </p>
      </div>

      <div className="p-6 max-w-4xl space-y-6">

        {/* Per-brand status */}
        <section className="bg-white border border-portal-border rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-portal-border">
            <h2 className="text-sm font-bold text-portal-text">Per-brand status</h2>
            <p className="text-[11px] text-portal-sub mt-0.5">
              Each brand has its own GHL sub-account, PIT, and location ID. Env vars below.
            </p>
          </div>
          <div className="divide-y divide-portal-border">
            {MARKETS.map(m => {
              const env = BRAND_ENVS[m.slug]
              const pitSet = !!process.env[env.pit]
              const locSet = !!process.env[env.loc]
              const ok = pitSet && locSet
              return (
                <div key={m.slug} className="px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="text-[13px] font-bold text-portal-text">{m.displayName}</div>
                    <div className="text-[11px] text-portal-sub font-mono">{m.slug}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <EnvChip name={env.pit} present={pitSet} />
                    <EnvChip name={env.loc} present={locSet} />
                    {ok ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-portal-green bg-portal-green-lt border border-portal-green/30 px-1.5 py-0.5 rounded-full inline-flex items-center gap-1">
                        <CheckCircle2 size={9} /> Env ready
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-portal-red bg-portal-red-lt border border-portal-red/30 px-1.5 py-0.5 rounded-full inline-flex items-center gap-1">
                        <XCircle size={9} /> Missing env
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="px-5 py-3 border-t border-portal-border bg-portal-bg flex items-center justify-between flex-wrap gap-2">
            <p className="text-[11px] text-portal-sub">
              Env presence ≠ live API access. Run the live scope test to confirm the PIT actually authenticates.
            </p>
            <Link href="/admin/social/ghl-check"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-white bg-portal-navy rounded hover:opacity-90">
              <Sparkles size={11} /> Run live diagnostic
            </Link>
          </div>
        </section>

        {/* Setup walkthrough */}
        <section className="bg-white border border-portal-border rounded-lg overflow-hidden">
          <div className="px-5 py-3 border-b border-portal-border">
            <h2 className="text-sm font-bold text-portal-text">Setup walkthrough (per brand)</h2>
            <p className="text-[11px] text-portal-sub mt-0.5">Repeat for each brand you want the strategist to push to.</p>
          </div>
          <ol className="divide-y divide-portal-border">
            <Step n={1} title="Open the GHL sub-account for this brand">
              In GHL, switch to the publication&apos;s sub-account (the one with that brand&apos;s
              connected FB Page / IG / GBP / etc.). Each brand has its own sub-account.
            </Step>
            <Step n={2} title="Get the Location ID">
              Settings → Business Profile → copy the <strong>Location ID</strong>. It&apos;s a 24-character
              hex string. Set the env var <code>GHL_LOCATION_ID_&lt;SLUG&gt;</code> on Vercel (e.g.&nbsp;
              <code>GHL_LOCATION_ID_RRP</code>).
            </Step>
            <Step n={3} title="Create a Private Integration Token (PIT)">
              Settings → Private Integrations → Create new. Select scopes:
              <ul className="list-disc pl-5 mt-1 text-[11px] space-y-0.5">
                <li><code>contacts.write</code> (used by other integrations)</li>
                <li><code>locations/customFields.readonly</code></li>
                <li><strong className="text-portal-text"><code>social-media-posting.write</code> ← required for the strategist</strong></li>
                <li><strong className="text-portal-text"><code>social-media-posting.readonly</code> ← required for the strategist</strong></li>
              </ul>
              Copy the token. Set the env var <code>GHL_PIT_&lt;SLUG&gt;</code> on Vercel (e.g.&nbsp;
              <code>GHL_PIT_RRP</code>).
            </Step>
            <Step n={4} title="Connect at least one social account in GHL">
              Marketing → Social Planner → Settings → Social accounts → Connect Facebook (and/or Instagram, GBP, etc).
              The strategist pushes posts to accountIDs from this list. If no accounts are connected,
              posts will fail to dispatch.
            </Step>
            <Step n={5} title="Redeploy + run the diagnostic">
              After env vars are set, redeploy on Vercel so the server picks them up. Then open the diagnostic
              page below and click &quot;Send a test post via GHL&quot; on one brand to prove the pipe.
            </Step>
          </ol>
        </section>

        {/* Quick links */}
        <section className="bg-portal-blue-lt border border-portal-blue/30 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle size={16} className="text-portal-blue shrink-0 mt-0.5" />
          <div className="text-[12px] text-portal-text leading-relaxed">
            <strong>About the dispatch model.</strong> Our system never holds Facebook/Instagram tokens for
            posting — GHL does. We push captions + images + scheduledFor to GHL via the social-media-posting
            API, and GHL fires the posts. This is by design: it lets you use GHL&apos;s 10-channel reach,
            polished calendar, and account management without duplicating that here.
          </div>
        </section>

        {/* Links footer */}
        <section className="grid sm:grid-cols-3 gap-3">
          <QuickLink href="/admin/social/ghl-check" label="Live diagnostic" sub="Confirm scope + accounts" />
          <QuickLink href="/admin/social/plan" label="Open social plan" sub="Editor weekly hub" />
          <QuickLink href="https://highlevel.stoplight.io/docs/integrations/" external label="GHL API docs" sub="v2.1 reference" />
        </section>

      </div>
    </div>
  )
}

function EnvChip({ name, present }: { name: string; present: boolean }) {
  return (
    <code className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
      present ? 'bg-portal-green-lt text-portal-green border-portal-green/30' : 'bg-portal-red-lt text-portal-red border-portal-red/30'
    }`}>
      {name}
    </code>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="px-5 py-3">
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-7 h-7 rounded-full bg-portal-bg text-portal-text font-bold text-[12px] flex items-center justify-center border border-portal-border">{n}</div>
        <div className="flex-1">
          <div className="text-[13px] font-bold text-portal-text">{title}</div>
          <div className="text-[12px] text-portal-sub mt-0.5 leading-relaxed">{children}</div>
        </div>
      </div>
    </li>
  )
}

function QuickLink({ href, label, sub, external }: { href: string; label: string; sub: string; external?: boolean }) {
  const linkProps = external ? { href, target: '_blank', rel: 'noopener noreferrer' as const } : { href }
  return (
    <Link {...linkProps}
      className="bg-white border border-portal-border rounded-lg p-3 hover:border-portal-blue/40 transition-colors block">
      <div className="text-[12px] font-bold text-portal-text inline-flex items-center gap-1">
        {label}{external && <ExternalLink size={10} />}
      </div>
      <div className="text-[11px] text-portal-sub mt-0.5">{sub}</div>
    </Link>
  )
}
