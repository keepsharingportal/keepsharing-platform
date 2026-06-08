// src/components/today/OpsCommandGrid.tsx
// Six-panel operational command grid for /admin/today.
// Each panel shows: role owner, live count, urgency state, and a direct link.
// Server component — no interactivity needed here.

import Link from 'next/link'
import {
  Inbox, FileText, Image, Users, Share2, Mail, ArrowRight,
  AlertTriangle, CheckCircle, Clock, Zap,
} from 'lucide-react'
import type { OpsSnapshot } from '@/lib/queries/operations'
import { ROLE_LABELS, ROLE_STYLES, type OperatorRole } from '@/lib/operations/routing'

// ── Panel building blocks ─────────────────────────────────────────────────────

type PanelState = 'clear' | 'attention' | 'urgent'

function panelBorder(state: PanelState): string {
  if (state === 'urgent')    return 'border-l-4 border-l-red-400'
  if (state === 'attention') return 'border-l-4 border-l-amber-400'
  return 'border-l-4 border-l-green-400'
}

function StateIcon({ state }: { state: PanelState }) {
  if (state === 'urgent')    return <AlertTriangle size={13} className="text-portal-red" />
  if (state === 'attention') return <Clock size={13} className="text-portal-amber" />
  return <CheckCircle size={13} className="text-green-500" />
}

function RoleBadge({ role }: { role: OperatorRole }) {
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${ROLE_STYLES[role]}`}>
      {ROLE_LABELS[role]}
    </span>
  )
}

interface MetricLineProps {
  value: number
  label: string
  urgent?: boolean
}

function MetricLine({ value, label, urgent }: MetricLineProps) {
  const color = urgent && value > 0 ? 'text-red-600 font-bold' : value > 0 ? 'text-gray-900 font-semibold' : 'text-gray-400'
  return (
    <div className="flex items-baseline gap-1.5">
      <span className={`text-2xl leading-none ${color}`}>{value}</span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  )
}

interface OpsCardProps {
  icon:   React.ElementType
  label:  string
  role:   OperatorRole
  href:   string
  state:  PanelState
  children: React.ReactNode
}

function OpsCard({ icon: Icon, label, role, href, state, children }: OpsCardProps) {
  return (
    <Link href={href} className="block group">
      <div className={`bg-white rounded-lg border border-gray-200 ${panelBorder(state)} p-4 hover:shadow-md transition-all h-full`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon size={15} className="text-gray-400" />
            <span className="text-xs font-semibold text-gray-600">{label}</span>
          </div>
          <ArrowRight size={13} className="text-gray-300 group-hover:text-gray-500 transition-colors mt-0.5" />
        </div>

        {/* Metrics */}
        <div className="space-y-2 mb-3">
          {children}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <RoleBadge role={role} />
          <StateIcon state={state} />
        </div>
      </div>
    </Link>
  )
}

// ── All-clear fallback ────────────────────────────────────────────────────────

function AllClear() {
  return (
    <div className="flex items-center gap-1.5 text-xs text-portal-green">
      <CheckCircle size={12} />
      <span>All clear</span>
    </div>
  )
}

// ── Panel: Submissions Inbox ──────────────────────────────────────────────────

function InboxPanel({ s }: { s: OpsSnapshot }) {
  const total = s.inboxNew + s.inboxNeedsReview
  const stateVal: PanelState =
    s.inboxOldestAgeHours > 48 ? 'urgent' :
    total > 0               ? 'attention' :
    'clear'

  return (
    <OpsCard icon={Inbox} label="Submissions Inbox" role="va" href="/admin/community" state={stateVal}>
      {total === 0 ? <AllClear /> : (
        <>
          {s.inboxNew > 0         && <MetricLine value={s.inboxNew}         label="new"          urgent={s.inboxOldestAgeHours > 48} />}
          {s.inboxNeedsReview > 0 && <MetricLine value={s.inboxNeedsReview} label="needs review" />}
          {s.inboxOldestAgeHours > 24 && (
            <p className="text-[10px] text-amber-600">
              Oldest: {Math.round(s.inboxOldestAgeHours)}h ago
            </p>
          )}
        </>
      )}
    </OpsCard>
  )
}

// ── Panel: Editorial Pipeline ─────────────────────────────────────────────────

function EditorialPanel({ s }: { s: OpsSnapshot }) {
  const total = s.draftReady + s.inEditing
  const stateVal: PanelState =
    s.stalledEditorial > 0 ? 'urgent' :
    total > 0              ? 'attention' :
    'clear'

  return (
    <OpsCard icon={FileText} label="Editorial Pipeline" role="editor" href="/admin/editorial" state={stateVal}>
      {total === 0 ? <AllClear /> : (
        <>
          {s.draftReady > 0  && <MetricLine value={s.draftReady} label="drafts ready to edit" />}
          {s.inEditing > 0   && <MetricLine value={s.inEditing}  label="in editing" />}
          {s.stalledEditorial > 0 && (
            <p className="text-[10px] text-red-600 font-semibold">
              {s.stalledEditorial} stalled — needs attention
            </p>
          )}
        </>
      )}
    </OpsCard>
  )
}

// ── Panel: Asset Queue ────────────────────────────────────────────────────────

function AssetsPanel({ s }: { s: OpsSnapshot }) {
  const total = s.assetsNeedingReview + s.assetsNeedingDesign
  const stateVal: PanelState =
    s.assetsNeedingDesign > 5 ? 'urgent' :
    total > 0                 ? 'attention' :
    'clear'

  return (
    <OpsCard icon={Image} label="Asset Queue" role="designer" href="/admin/assets" state={stateVal}>
      {total === 0 ? <AllClear /> : (
        <>
          {s.assetsNeedingReview > 0 && <MetricLine value={s.assetsNeedingReview} label="need review" />}
          {s.assetsNeedingDesign > 0 && <MetricLine value={s.assetsNeedingDesign} label="need design work" urgent={s.assetsNeedingDesign > 5} />}
        </>
      )}
    </OpsCard>
  )
}

// ── Panel: Advertiser Alerts ──────────────────────────────────────────────────

function AdvertiserPanel({ s }: { s: OpsSnapshot }) {
  const stateVal: PanelState =
    s.renewingIn30 > 0 || s.atRisk > 0 || s.onboardingStuck > 0 ? 'urgent' :
    s.renewingIn60 > 0                                            ? 'attention' :
    'clear'

  const hasAny = s.renewingIn30 + s.renewingIn60 + s.onboardingStuck + s.atRisk > 0

  return (
    <OpsCard icon={Users} label="Advertiser Alerts" role="jason" href="/admin/advertisers" state={stateVal}>
      {!hasAny ? <AllClear /> : (
        <>
          {s.renewingIn30    > 0 && <MetricLine value={s.renewingIn30}    label="renewing in 30d" urgent />}
          {s.renewingIn60    > 0 && <MetricLine value={s.renewingIn60}    label="renewing in 60d" />}
          {s.onboardingStuck > 0 && <MetricLine value={s.onboardingStuck} label="onboarding stuck" urgent />}
          {s.atRisk          > 0 && <MetricLine value={s.atRisk}          label="at risk" urgent />}
        </>
      )}
    </OpsCard>
  )
}

// ── Panel: Social Queue ───────────────────────────────────────────────────────

function SocialPanel({ s }: { s: OpsSnapshot }) {
  const stateVal: PanelState =
    s.socialApprovedNotExported > 10 ? 'urgent' :
    s.socialApprovedNotExported > 0  ? 'attention' :
    'clear'

  return (
    <OpsCard icon={Share2} label="Social Queue" role="publisher" href="/admin/distribution/social-export" state={stateVal}>
      {s.socialApprovedNotExported === 0 ? <AllClear /> : (
        <>
          <MetricLine value={s.socialApprovedNotExported} label="ready to export" urgent={s.socialApprovedNotExported > 10} />
          {s.socialMissingAsset > 0 && (
            <p className="text-[10px] text-amber-600">
              {s.socialMissingAsset} missing image asset
            </p>
          )}
        </>
      )}
    </OpsCard>
  )
}

// ── Panel: Newsletter ─────────────────────────────────────────────────────────

function NewsletterPanel({ s }: { s: OpsSnapshot }) {
  const stateVal: PanelState =
    s.newsletterQualityIssues > 0 ? 'attention' :
    s.newsletterItems > 0         ? 'attention' :
    'clear'

  return (
    <OpsCard icon={Mail} label="Newsletter" role="publisher" href="/admin/distribution" state={stateVal}>
      {s.newsletterItems === 0 ? <AllClear /> : (
        <>
          <MetricLine value={s.newsletterItems} label="items queued" />
          {s.newsletterQualityIssues > 0 && (
            <p className="text-[10px] text-amber-600">
              {s.newsletterQualityIssues} quality issue{s.newsletterQualityIssues > 1 ? 's' : ''} — incomplete sections
            </p>
          )}
          {s.newsletterQualityIssues === 0 && s.newsletterItems >= 6 && (
            <p className="text-[10px] text-portal-green">Ready to export</p>
          )}
        </>
      )}
    </OpsCard>
  )
}

// ── Family Favorites banner ───────────────────────────────────────────────────

const FF_PHASE_LABELS: Record<string, string> = {
  planning:        'Planning',
  nominations:     'Nominations Open',
  'finalist-review': 'Finalist Review',
  voting:          'Voting Open',
  announcing:      'Announcing Winners',
  complete:        'Season Complete',
}

const FF_PHASE_STYLES: Record<string, string> = {
  planning:        'bg-gray-50 border-gray-200 text-gray-700',
  nominations:     'bg-portal-green-lt border-green-200 text-green-800',
  'finalist-review': 'bg-amber-50 border-amber-200 text-amber-800',
  voting:          'bg-blue-50 border-blue-200 text-blue-800',
  announcing:      'bg-purple-50 border-purple-200 text-purple-800',
  complete:        'bg-gray-50 border-gray-200 text-gray-600',
}

export function FfPhaseBanner({ phase, label, deadline }: { phase: string; label: string; deadline: string | null }) {
  const displayPhase = FF_PHASE_LABELS[phase] ?? phase
  const style        = FF_PHASE_STYLES[phase]  ?? FF_PHASE_STYLES.planning
  const daysUntil    = deadline
    ? Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000)
    : null

  return (
    <Link href="/admin/family-favorites">
      <div className={`flex items-center justify-between rounded-lg border px-4 py-3 hover:shadow-sm transition-shadow ${style}`}>
        <div className="flex items-center gap-2.5">
          <Zap size={14} />
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide opacity-70">Family Favorites</span>
            <span className="mx-2 opacity-40">·</span>
            <span className="text-sm font-semibold">{label}</span>
            <span className="mx-2 opacity-40">·</span>
            <span className="text-sm">{displayPhase}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {daysUntil !== null && daysUntil >= 0 && (
            <span className="text-xs opacity-70">
              {daysUntil === 0 ? 'Deadline today' : `${daysUntil}d until deadline`}
            </span>
          )}
          <ArrowRight size={13} className="opacity-40" />
        </div>
      </div>
    </Link>
  )
}

// ── AI tasks bar ──────────────────────────────────────────────────────────────

export function AiTasksBar({ count }: { count: number }) {
  if (count === 0) return null
  return (
    <Link href="/admin/ai-tasks">
      <div className="flex items-center justify-between rounded-lg border border-cyan-200 bg-cyan-50 px-4 py-2.5 hover:shadow-sm transition-shadow">
        <div className="flex items-center gap-2.5">
          <Zap size={13} className="text-cyan-600" />
          <span className="text-sm text-cyan-800 font-medium">
            {count} AI task{count > 1 ? 's' : ''} completed — awaiting human review
          </span>
        </div>
        <ArrowRight size={13} className="text-cyan-400" />
      </div>
    </Link>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export function OpsCommandGrid({ snapshot }: { snapshot: OpsSnapshot }) {
  return (
    <div className="space-y-3">
      {/* 6-panel grid */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
        <InboxPanel     s={snapshot} />
        <EditorialPanel s={snapshot} />
        <AssetsPanel    s={snapshot} />
        <AdvertiserPanel s={snapshot} />
        <SocialPanel    s={snapshot} />
        <NewsletterPanel s={snapshot} />
      </div>

      {/* AI tasks bar — only shows when there's something to review */}
      <AiTasksBar count={snapshot.aiTasksNeedingReview} />

      {/* Family Favorites banner — only shows when a season is active */}
      {snapshot.ffPhase && snapshot.ffSeasonLabel && (
        <FfPhaseBanner
          phase={snapshot.ffPhase}
          label={snapshot.ffSeasonLabel}
          deadline={snapshot.ffDeadline}
        />
      )}
    </div>
  )
}
