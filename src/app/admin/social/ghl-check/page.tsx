// ── /admin/social/ghl-check ──────────────────────────────────────
//
// Pre-flight diagnostic for the GHL Social Planner pipe. Editor opens
// this before/after wiring a brand's PIT to confirm:
//   1. PIT env var exists for the brand
//   2. Location ID env var exists
//   3. PIT has social-media-posting scope (lists accounts succeeds)
//   4. At least one social account is connected in GHL
//
// Shows a per-brand status row. When all are green, the strategist is
// ready to push posts to GHL on this brand.

import type { Metadata } from 'next'
import { requireSettingsAccess } from '@/lib/admin/auth'
import { checkSocialPlannerScope, listSocialAccounts } from '@/lib/ghl-social'
import { MARKETS } from '@/lib/markets'
import { ArrowLeft, CheckCircle2, AlertTriangle, Share2 } from 'lucide-react'
import Link from 'next/link'
import { GhlTestPostPanel } from './GhlTestPostPanel'

export const metadata: Metadata = { title: 'GHL Social Planner check — Admin' }
export const dynamic = 'force-dynamic'

export default async function GhlCheckPage() {
  await requireSettingsAccess()

  // Each brand check wrapped in try/catch — a single brand's API failure
  // (timeout, malformed response, unexpected scope shape) must NOT take
  // down the whole page. Without this, one bad brand throws and the
  // editor sees a Vercel error reference instead of the diagnostic.
  const results = await Promise.all(MARKETS.map(async m => {
    try {
      const scope    = await checkSocialPlannerScope(m.slug)
      const accounts = scope.ok ? await listSocialAccounts(m.slug) : { ok: false, accounts: [], error: scope.error }
      return {
        brand:    m.slug,
        label:    m.displayName,
        scope,
        accounts: accounts.ok ? accounts.accounts : [],
        error:    accounts.ok ? undefined : accounts.error,
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      return {
        brand:    m.slug,
        label:    m.displayName,
        scope:    { ok: false, accountCount: 0, platforms: [] as string[], error: `Crash: ${msg}` },
        accounts: [],
        error:    msg,
      }
    }
  }))

  const greens = results.filter(r => r.scope.ok && r.accounts.length > 0)
  const reds   = results.filter(r => !r.scope.ok)
  const yellows = results.filter(r => r.scope.ok && r.accounts.length === 0)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-white border-b border-portal-border px-6 py-4 shrink-0">
        <Link href="/admin" className="text-[11px] font-semibold text-portal-sub hover:text-portal-text inline-flex items-center gap-1 mb-1">
          <ArrowLeft size={11} /> Admin
        </Link>
        <h1 className="text-[18px] font-bold text-portal-text">
          <Share2 size={16} className="inline -translate-y-0.5 mr-1" /> GHL Social Planner check
        </h1>
        <p className="text-[12px] text-portal-sub mt-1">
          Pre-flight diagnostic. Confirms each brand&apos;s PIT has the social-media-posting scope and at least
          one connected social account.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto bg-portal-bg">
        <div className="px-6 py-6 space-y-4 max-w-5xl">

          <div className="grid grid-cols-3 gap-3">
            <Stat label="Ready"          value={String(greens.length)} tone="green" />
            <Stat label="No accounts"    value={String(yellows.length)} tone="amber" />
            <Stat label="PIT/scope issue" value={String(reds.length)} tone="red" />
          </div>

          {results.map(r => (
            <div key={r.brand} className="bg-white border border-portal-border rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-portal-border flex items-center justify-between gap-3">
                <div>
                  <div className="text-[14px] font-bold text-portal-text">{r.label}</div>
                  <div className="text-[11px] text-portal-sub font-mono">{r.brand}</div>
                </div>
                {r.scope.ok && r.accounts.length > 0 ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-portal-green bg-portal-green-lt px-2 py-0.5 rounded">
                    <CheckCircle2 size={11} /> READY
                  </span>
                ) : r.scope.ok ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-portal-amber bg-portal-amber-lt px-2 py-0.5 rounded">
                    <AlertTriangle size={11} /> NO ACCOUNTS
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-portal-red bg-portal-red-lt px-2 py-0.5 rounded">
                    <AlertTriangle size={11} /> NOT READY
                  </span>
                )}
              </div>
              <div className="p-4 space-y-2">
                {r.scope.error && (
                  <div className="bg-portal-red-lt text-portal-text rounded p-2 text-[12px]" style={{ borderLeft: '3px solid var(--color-portal-red)' }}>
                    <strong className="text-portal-red">{r.scope.error}</strong>
                  </div>
                )}
                {r.scope.ok && r.accounts.length === 0 && (
                  <div className="bg-portal-amber-lt text-portal-text rounded p-2 text-[12px]" style={{ borderLeft: '3px solid var(--color-portal-amber)' }}>
                    PIT works, but no social accounts connected in GHL for this brand. Open GHL → Marketing →
                    Social Planner → Settings → Social accounts and connect at least one.
                  </div>
                )}
                {r.accounts.length > 0 && (
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-portal-sub mb-1.5">
                      Connected accounts ({r.accounts.length})
                    </div>
                    <ul className="space-y-1">
                      {r.accounts.map(a => (
                        <li key={a.id} className="flex items-center justify-between text-[12px] py-1 border-b border-portal-border last:border-b-0">
                          <span className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-portal-bg text-portal-sub border border-portal-border">{a.platform}</span>
                            {a.name}
                          </span>
                          <code className="text-[10px] text-portal-muted">{a.id.slice(0, 8)}…</code>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {r.scope.ok && r.accounts.length > 0 && (
                  <GhlTestPostPanel brand={r.brand} accounts={r.accounts} />
                )}
              </div>
            </div>
          ))}

        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'green' | 'amber' | 'red' }) {
  const cls = tone === 'green' ? 'text-portal-green'
            : tone === 'amber' ? 'text-portal-amber'
            : tone === 'red'   ? 'text-portal-red'
            :                    'text-portal-text'
  return (
    <div className="bg-white border border-portal-border rounded-lg p-4">
      <div className={`text-[22px] font-black ${cls}`}>{value}</div>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-portal-sub mt-1">{label}</div>
    </div>
  )
}
