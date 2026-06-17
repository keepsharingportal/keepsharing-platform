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
import { ManualTestPostPanel } from './ManualTestPostPanel'

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
        scope:    { ok: false, scopeOk: false, accountCount: 0, platforms: [] as string[], error: `Crash: ${msg}` },
        accounts: [],
        error:    msg,
      }
    }
  }))

  // Categorize: ready (scope ok + accounts), no-accounts (scope ok + zero
  // accounts), pit-issue (scope broken). The no-accounts bucket is the
  // one editors should fix in GHL by connecting a Facebook Page etc.
  const greens  = results.filter(r => r.scope.scopeOk && r.accounts.length > 0)
  const yellows = results.filter(r => r.scope.scopeOk && r.accounts.length === 0)
  const reds    = results.filter(r => !r.scope.scopeOk)

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
                {r.scope.scopeOk && r.accounts.length > 0 ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-portal-green bg-portal-green-lt px-2 py-0.5 rounded">
                    <CheckCircle2 size={11} /> READY
                  </span>
                ) : r.scope.scopeOk ? (
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
                {r.scope.error && !r.scope.scopeOk && (
                  <div className="bg-portal-red-lt text-portal-text rounded p-2 text-[12px]" style={{ borderLeft: '3px solid var(--color-portal-red)' }}>
                    <strong className="text-portal-red">{r.scope.error}</strong>
                  </div>
                )}
                {r.scope.scopeOk && r.accounts.length === 0 && (
                  <>
                    <AccountConnectionWalkthrough brand={r.brand} label={r.label} />
                    <ManualTestPostPanel brand={r.brand} />
                  </>
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

function AccountConnectionWalkthrough({ brand, label }: { brand: string; label: string }) {
  return (
    <div className="bg-portal-amber-lt text-portal-text rounded p-3 text-[12px] space-y-3" style={{ borderLeft: '3px solid var(--color-portal-amber)' }}>
      <div>
        <strong className="text-portal-amber-dk text-portal-text">PIT works — now connect the social accounts in GHL.</strong>
        <p className="mt-1 text-portal-sub text-[11px]">
          The token authenticates fine. We need at least one Facebook Page (and ideally an Instagram Business account)
          connected inside the <strong>{label}</strong> sub-account before posts can fire.
        </p>
      </div>

      <details className="group bg-white rounded p-2 border border-portal-border">
        <summary className="text-[11px] font-bold text-portal-text cursor-pointer flex items-center justify-between">
          <span>Walkthrough — connect Facebook + Instagram for {brand.toUpperCase()}</span>
          <span className="text-portal-sub group-open:rotate-180 transition-transform">▾</span>
        </summary>
        <ol className="list-decimal pl-5 mt-2 space-y-2 text-[11px] text-portal-sub leading-relaxed">
          <li>
            Log into <a href="https://app.gohighlevel.com/" target="_blank" rel="noopener noreferrer" className="text-portal-blue hover:underline">GHL</a>.
            Switch to the <strong>{label}</strong> sub-account using the location switcher (top of the left sidebar).
          </li>
          <li>
            From the left sidebar, click <strong>Marketing</strong> → <strong>Social Planner</strong>.
            (Some plans label it &quot;Social Planner&quot;; some label it &quot;Social Media Posting.&quot;)
          </li>
          <li>
            On the Social Planner page, top-right area, click the <strong>gear / Settings</strong> icon (or the
            &quot;Connect Channels&quot; button if visible). You land on the social accounts settings panel.
          </li>
          <li>
            Click <strong>+ Connect Facebook</strong> (or the Facebook icon). A Facebook OAuth popup appears.
            Sign in with the account that <em>owns the Facebook Page for {label}</em>.
          </li>
          <li>
            Facebook will ask which Pages you want to authorize. Check the <strong>{label}</strong> Page (and any others
            you want GHL to post to). Approve.
          </li>
          <li>
            Back in GHL, the Page should now show in the list with a green &quot;Connected&quot; badge.
          </li>
          <li>
            <strong>Instagram</strong>: same flow with the Instagram icon. NOTE: Instagram must be a
            <strong> Business or Creator account</strong> (not Personal) AND linked to the Facebook Page from step 5.
            Convert it in the Instagram app under Settings → Account → Switch to Professional Account if needed.
          </li>
          <li>
            Optional but recommended for local SEO: connect <strong>Google Business Profile</strong> the same way
            (GHL pushes location-style posts to GBP, great for &quot;new article&quot; visibility in local search).
          </li>
          <li>
            Come back to this page and refresh. You should see the connected accounts listed with green chips.
            Then run the <strong>&quot;Send a test post via GHL&quot;</strong> button below the list to confirm
            the pipe really fires.
          </li>
        </ol>

        <div className="mt-3 pt-2 border-t border-portal-border text-[10px] text-portal-muted">
          <strong>Common gotchas:</strong>
          <ul className="list-disc pl-4 mt-1 space-y-0.5">
            <li>Instagram Personal accounts won&apos;t connect — must be Business/Creator.</li>
            <li>Two-Page Manager accounts: Facebook only shows Pages you have <em>admin</em> access to.</li>
            <li>If the popup gets blocked, allow popups for app.gohighlevel.com and retry.</li>
            <li>Sometimes the connection succeeds in Facebook but GHL doesn&apos;t update the list — refresh the GHL Social Planner page.</li>
          </ul>
        </div>
      </details>
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
