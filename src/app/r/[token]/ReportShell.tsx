// ReportShell — the visible advertiser report layout (v2).
//
// Print-friendly: white background, sober typography, no admin chrome.
// Sticky date controls at the top; headline strip with period-over-
// period deltas; trend chart; coaching insights; goal progress; reach
// detail; per-source tables at the bottom.

import { DateRangeBar } from './DateRangeBar'
import type { AdvertiserReportData } from '@/lib/advertiser-report/data'
import { formatPctChange, type PeriodChange } from '@/lib/admin/period-compare'
import {
  Phone, Globe, Mail, MessageSquare, MousePointerClick, Target,
  TrendingUp, TrendingDown, Sparkles, Lightbulb, AlertTriangle, CheckCircle2, Info,
} from 'lucide-react'

function fmtInt(n: number): string  { return n.toLocaleString('en-US') }
function fmtUsd(n: number): string  { return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` }
function fmtPct(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—'
  return `${n.toFixed(2)}%`
}

export function ReportShell({ data }: { data: AdvertiserReportData }) {
  const dateLabel = (s: string) => new Date(`${s}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="border-b border-slate-200 print:border-0">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">River Region Parents · Performance Report</p>
          <h1 className="text-3xl font-bold mt-1 text-slate-900">{data.advertiser.business_name}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {dateLabel(data.range.since)} – {dateLabel(data.range.until)} <span className="text-slate-400">· {data.range.days} day{data.range.days === 1 ? '' : 's'}</span>
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Compared with prior {data.priorRange.days} days ({dateLabel(data.priorRange.since)} – {dateLabel(data.priorRange.until)})
          </p>
        </div>
      </header>

      {/* ── Date range bar (control, not content) ───────────────────────── */}
      <DateRangeBar since={data.range.since} until={data.range.until} />

      {/* ── Headline strip with period-over-period ──────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-8">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3">What you got this period</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <HeadlineStat icon={Phone}              label="Phone taps"         change={data.headline.phoneTaps}        accent="terra" />
          <HeadlineStat icon={MessageSquare}      label="Inquiries"          change={data.headline.formInquiries}    accent="navy"  />
          <HeadlineStat icon={Globe}              label="Website clicks"     change={data.headline.websiteClicks}    accent="sky"   />
          <HeadlineStat icon={Mail}               label="Email opens"        change={data.headline.emailOpens}       accent="gold"  />
          <HeadlineStatStatic icon={MousePointerClick} label="Short-link clicks" value={data.headline.shortLinkClicks} sublabel="Lifetime" accent="emerald" />
          <HeadlineStat icon={Target}             label="Facebook results"   change={data.headline.facebookResults}  accent="violet" />
        </div>
      </section>

      {/* ── Trend chart ─────────────────────────────────────────────────── */}
      {data.trend.length > 0 && (
        <section className="max-w-5xl mx-auto px-6 py-6 border-t border-slate-200">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3">Daily engagement</h2>
          <TrendChart trend={data.trend} />
        </section>
      )}

      {/* ── Goals (only if any are set) ─────────────────────────────────── */}
      {data.goals.length > 0 && (
        <section className="max-w-5xl mx-auto px-6 py-6 border-t border-slate-200">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3">Goals</h2>
          <div className="space-y-3">
            {data.goals.map(g => (
              <GoalProgress key={g.id} g={g} />
            ))}
          </div>
        </section>
      )}

      {/* ── Coaching insights ──────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-6 border-t border-slate-200">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3 inline-flex items-center gap-1.5">
          <Lightbulb size={11} /> Insights
        </h2>
        <div className="space-y-2">
          {data.coaching.map((c, i) => <CoachingNote key={i} c={c} />)}
        </div>
      </section>

      {/* ── Reach detail ───────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-6 border-t border-slate-200">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-3">Reach + spend (supporting detail)</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ReachStat label="On-site impressions"   value={fmtInt(data.reach.onSiteAdImpressions)} />
          <ReachStat label="On-site CTR"           value={fmtPct(data.reach.onSiteAdCtr)} />
          <ReachStatChange label="Facebook spend"   change={data.reach.facebookSpend} fmtFn={n => fmtUsd(n / 100)} />
          <ReachStatChange label="Facebook impressions" change={data.reach.facebookImpressions} fmtFn={fmtInt} />
          <ReachStat label="Facebook reach"        value={fmtInt(data.reach.facebookReach)} />
          <ReachStatChange label="Facebook clicks" change={data.reach.facebookClicks} fmtFn={fmtInt} />
          <ReachStat label="Facebook CTR"          value={fmtPct(data.reach.facebookCtr)} />
          <ReachStat label="Facebook CPC"          value={data.reach.facebookCpc !== null ? fmtUsd(data.reach.facebookCpc) : '—'} />
        </div>
      </section>

      {/* ── Detail tables ──────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-8 space-y-8 border-t border-slate-200">

        {data.details.listingTaps.length > 0 && (
          <DetailBlock title="Where your engagement came from" subtitle="Which page or listing readers tapped you from">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <th className="text-left py-2 pr-4">Source</th>
                  <th className="text-right py-2 px-2">Phone</th>
                  <th className="text-right py-2 px-2">Email</th>
                  <th className="text-right py-2 px-2">Website</th>
                  <th className="text-right py-2 pl-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.details.listingTaps.map((r, i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-4 text-slate-700">{r.source_path ?? <span className="text-slate-400">(unknown)</span>}</td>
                    <td className="py-2 px-2 text-right tabular-nums">{r.tel}</td>
                    <td className="py-2 px-2 text-right tabular-nums">{r.mailto}</td>
                    <td className="py-2 px-2 text-right tabular-nums">{r.website}</td>
                    <td className="py-2 pl-2 text-right tabular-nums font-bold">{r.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DetailBlock>
        )}

        {data.details.inquiries.length > 0 && (
          <DetailBlock title="Inquiries received" subtitle="Direct messages from interested readers (forwarded to your inbox by River Region Parents)">
            <ul className="divide-y divide-slate-200">
              {data.details.inquiries.map(inq => (
                <li key={inq.id} className="py-3">
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <p className="text-sm font-semibold text-slate-800">{inq.parent_name} <span className="text-slate-400 font-normal">· {inq.parent_email}</span></p>
                    <span className="text-xs text-slate-500 shrink-0">{new Date(inq.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                  <p className="text-sm text-slate-700 leading-snug whitespace-pre-line line-clamp-3">{inq.message}</p>
                </li>
              ))}
            </ul>
          </DetailBlock>
        )}

        {data.details.shortLinks.length > 0 && (
          <DetailBlock title="Short links + QR codes" subtitle="Lifetime click totals — cumulative since each link was minted">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <th className="text-left py-2 pr-4">Shortcode</th>
                  <th className="text-left py-2 px-2">Label</th>
                  <th className="text-left py-2 px-2">Channel</th>
                  <th className="text-right py-2 pl-2">Clicks</th>
                </tr>
              </thead>
              <tbody>
                {data.details.shortLinks.map(l => (
                  <tr key={l.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-4 font-mono text-slate-700">/{l.shortcode}</td>
                    <td className="py-2 px-2 text-slate-700">{l.label ?? '—'}</td>
                    <td className="py-2 px-2 text-slate-500">{l.channel ?? '—'}</td>
                    <td className="py-2 pl-2 text-right tabular-nums font-bold">{fmtInt(l.click_count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DetailBlock>
        )}

        {data.details.facebookCampaigns.length > 0 && (
          <DetailBlock title="Facebook campaigns" subtitle="Spend and engagement for ads run on your behalf">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <th className="text-left py-2 pr-4">Campaign</th>
                  <th className="text-right py-2 px-2">Spend</th>
                  <th className="text-right py-2 px-2">Impressions</th>
                  <th className="text-right py-2 px-2">Link clicks</th>
                  <th className="text-right py-2 px-2">Results</th>
                  <th className="text-right py-2 pl-2">Cost / result</th>
                </tr>
              </thead>
              <tbody>
                {data.details.facebookCampaigns.map(c => (
                  <tr key={c.campaign_id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2 pr-4">
                      <p className="font-semibold text-slate-800 truncate max-w-[260px]">{c.name}</p>
                      <p className="text-[10px] uppercase tracking-wider text-slate-400">{c.objective ?? '—'}</p>
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums">{fmtUsd(c.spend)}</td>
                    <td className="py-2 px-2 text-right tabular-nums">{fmtInt(c.impressions)}</td>
                    <td className="py-2 px-2 text-right tabular-nums">{fmtInt(c.link_clicks)}</td>
                    <td className="py-2 px-2 text-right tabular-nums">{fmtInt(c.results)}</td>
                    <td className="py-2 pl-2 text-right tabular-nums">{c.cost_per_result !== null ? fmtUsd(c.cost_per_result) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </DetailBlock>
        )}

        {data.details.listingTaps.length === 0
          && data.details.inquiries.length === 0
          && data.details.shortLinks.length === 0
          && data.details.facebookCampaigns.length === 0 && (
          <div className="text-center py-16 text-sm text-slate-500">
            No engagement detail to show for this date range.
          </div>
        )}
      </section>

      <footer className="max-w-5xl mx-auto px-6 py-8 border-t border-slate-200 text-xs text-slate-500 print:border-0">
        <p>Numbers update nightly. Questions? Reply to the email this link came from.</p>
        <p className="mt-1 text-slate-400">River Region Parents · KeepSharing Publishing Platform</p>
      </footer>
    </div>
  )
}

// ── Sub-components ──────────────────────────────────────────────────────

const HEADLINE_ACCENT: Record<string, string> = {
  terra:   'text-orange-700',
  navy:    'text-slate-900',
  sky:     'text-sky-700',
  gold:    'text-amber-700',
  emerald: 'text-emerald-700',
  violet:  'text-violet-700',
}

function HeadlineStat({ icon: Icon, label, change, accent }: { icon: React.ElementType; label: string; change: PeriodChange; accent: keyof typeof HEADLINE_ACCENT }) {
  const f = formatPctChange(change)
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
        <Icon size={11} /> {label}
      </div>
      <div className={`text-3xl font-bold tabular-nums ${HEADLINE_ACCENT[accent]}`}>
        {change.current.toLocaleString('en-US')}
      </div>
      <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold">
        {f.tone === 'up'   && <TrendingUp   size={11} className="text-emerald-600" />}
        {f.tone === 'down' && <TrendingDown size={11} className="text-rose-600" />}
        {f.tone === 'flat' && <span className="text-slate-400">—</span>}
        {f.tone === 'new'  && <Sparkles size={11} className="text-blue-600" />}
        <span className={
          f.tone === 'up'   ? 'text-emerald-700' :
          f.tone === 'down' ? 'text-rose-700' :
          f.tone === 'new'  ? 'text-blue-700' :
          'text-slate-500'
        }>
          {f.text}
        </span>
        <span className="text-slate-400 font-normal">vs {change.prior.toLocaleString()}</span>
      </div>
    </div>
  )
}

function HeadlineStatStatic({ icon: Icon, label, value, sublabel, accent }: { icon: React.ElementType; label: string; value: number; sublabel?: string; accent: keyof typeof HEADLINE_ACCENT }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
        <Icon size={11} /> {label}
      </div>
      <div className={`text-3xl font-bold tabular-nums ${HEADLINE_ACCENT[accent]}`}>
        {value.toLocaleString('en-US')}
      </div>
      {sublabel && <p className="text-[11px] text-slate-400 mt-2">{sublabel}</p>}
    </div>
  )
}

function ReachStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">{label}</p>
      <p className="text-base font-semibold text-slate-900 tabular-nums">{value}</p>
    </div>
  )
}

function ReachStatChange({ label, change, fmtFn }: { label: string; change: PeriodChange; fmtFn: (n: number) => string }) {
  const f = formatPctChange(change)
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">{label}</p>
      <p className="text-base font-semibold text-slate-900 tabular-nums">{fmtFn(change.current)}</p>
      <p className={`text-[10px] font-semibold mt-0.5 ${
        f.tone === 'up'   ? 'text-emerald-700' :
        f.tone === 'down' ? 'text-rose-700' :
        f.tone === 'new'  ? 'text-blue-700' :
        'text-slate-400'
      }`}>{f.text}</p>
    </div>
  )
}

function TrendChart({ trend }: { trend: AdvertiserReportData['trend'] }) {
  const max = Math.max(1, ...trend.map(t => t.actions))
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-5">
      <div className="flex items-end justify-between gap-[2px] h-32">
        {trend.map(t => (
          <div
            key={t.date}
            title={`${t.date} · ${t.actions} action${t.actions === 1 ? '' : 's'}`}
            className="flex-1 bg-slate-800 rounded-t-sm transition-colors hover:bg-slate-900 cursor-default"
            style={{ height: `${(t.actions / max) * 100}%`, minHeight: t.actions > 0 ? '3px' : '1px', opacity: t.actions > 0 ? 1 : 0.15 }}
          />
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500">
        <span>{trend[0]?.date}</span>
        <span className="text-slate-700 font-semibold">Peak: {max} actions</span>
        <span>{trend[trend.length - 1]?.date}</span>
      </div>
    </div>
  )
}

function GoalProgress({ g }: { g: AdvertiserReportData['goals'][number] }) {
  const hit = g.pct >= 100
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm font-bold text-slate-800">{prettyMetric(g.metric)}</p>
          <p className="text-[11px] text-slate-500">{g.period_start} to {g.period_end}</p>
        </div>
        <div className="text-right">
          <p className={`text-2xl font-bold tabular-nums ${hit ? 'text-emerald-700' : 'text-slate-800'}`}>
            {g.current.toLocaleString()} <span className="text-slate-400 font-normal">/ {g.target.toLocaleString()}</span>
          </p>
          <p className={`text-[11px] font-semibold ${hit ? 'text-emerald-700' : 'text-slate-500'}`}>
            {Math.round(g.pct)}% {hit ? '· goal met' : 'of goal'}
          </p>
        </div>
      </div>
      <div className="h-2 bg-white border border-slate-200 rounded-full overflow-hidden">
        <div
          className={hit ? 'h-full bg-emerald-600' : 'h-full bg-slate-800'}
          style={{ width: `${Math.min(100, Math.max(2, g.pct))}%` }}
        />
      </div>
      {g.notes && <p className="text-[11px] text-slate-500 mt-2 italic">{g.notes}</p>}
    </div>
  )
}

function prettyMetric(m: string): string {
  return m.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function CoachingNote({ c }: { c: AdvertiserReportData['coaching'][number] }) {
  const Icon = c.tone === 'positive' ? CheckCircle2 : c.tone === 'warning' ? AlertTriangle : Info
  const bg   = c.tone === 'positive' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : c.tone === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-slate-50 border-slate-200 text-slate-800'
  return (
    <div className={`rounded-lg border px-4 py-3 flex items-start gap-2 ${bg}`}>
      <Icon size={14} className="shrink-0 mt-0.5" />
      <p className="text-sm leading-snug">{c.text}</p>
    </div>
  )
}

function DetailBlock({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      <p className="text-xs text-slate-500 mb-3 leading-relaxed">{subtitle}</p>
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto px-4 py-2">
          {children}
        </div>
      </div>
    </div>
  )
}
