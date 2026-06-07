'use client'

// EditClient — sectioned full-page form for one print_ad_placement.
// Layout mirrors /admin/ads/[id]/edit: stacked rounded-2xl sections,
// each one a coherent group (Identity / Ad Details / Pricing / Schedule
// / Notes). Save PATCHes via the existing per-id endpoint; Delete
// hits the existing DELETE endpoint. Back returns to the issue's
// layout sheet so the editor lands where she came from.

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Save, Trash2, Loader2, AlertCircle, ExternalLink,
  Building2, Megaphone, DollarSign, CalendarClock, StickyNote,
} from 'lucide-react'

export interface EditablePlacement {
  id:                    string
  advertiser_account_id: string
  issue_month:           string
  design:                string
  directory:             boolean
  size:                  number
  layout:                string | null
  price:                 number | null
  social_budget:         number | null
  layout_notes:          string | null
  expires_month:         string | null
  notes:                 string | null
  is_ongoing:            boolean
  ad_label:              string | null
  specific_months:       string[] | null
  business_name:         string
  advertiser_slug:       string | null
}

const SIZE_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 1,    label: 'Full Page (1)'  },
  { value: 0.66, label: '2/3 Page (0.66)' },
  { value: 0.5,  label: '1/2 Page (0.5)'  },
  { value: 0.33, label: '1/3 Page (0.33)' },
  { value: 0.25, label: '1/4 Page (0.25)' },
  { value: 0.16, label: '1/6 Page (0.16)' },
  { value: 0.12, label: '1/8 Page (0.12)' },
]
const LAYOUT_OPTIONS: Array<{ value: string | null; label: string }> = [
  { value: null,         label: '—' },
  { value: 'horizontal', label: 'Horizontal' },
  { value: 'vertical',   label: 'Vertical'   },
  { value: 'square',     label: 'Square'     },
]
const SOCIAL_PRESETS = [25, 30, 50, 75, 100, 150]

function fmtIssue(yyyymm: string): string {
  const [y, m] = yyyymm.split('-').map(s => parseInt(s, 10))
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

function shortMonth(yyyymm: string): string {
  const [y, m] = yyyymm.split('-').map(s => parseInt(s, 10))
  return new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

function buildMonthOptions(anchor: string): string[] {
  // 24 month window centered on anchor — covers any reasonable
  // expires_month the editor might want to set.
  const [y, m] = anchor.split('-').map(s => parseInt(s, 10))
  const out: string[] = []
  for (let i = -6; i <= 24; i++) {
    const d = new Date(y, m - 1 + i, 1)
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return out
}

export function EditClient({ placement }: { placement: EditablePlacement }) {
  const router = useRouter()
  const [busy, startTransition] = useTransition()
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [saved, setSaved]       = useState(false)

  // Form state — mirrors the editable columns; non-editable derived
  // fields (business_name, issue_month) live in the placement prop.
  const [adLabel,     setAdLabel]     = useState(placement.ad_label ?? '')
  const [design,      setDesign]      = useState<'new' | 'pickup'>(placement.design === 'new' ? 'new' : 'pickup')
  const [size,        setSize]        = useState<number>(placement.size)
  const [layout,      setLayout]      = useState<string | null>(placement.layout)
  const [directory,   setDirectory]   = useState<boolean>(placement.directory)
  const [price,       setPrice]       = useState<string>(placement.price != null ? String(placement.price) : '')
  const [social,      setSocial]      = useState<string>(placement.social_budget != null ? String(placement.social_budget) : '')
  // 'No Social Ad Running' shortcut. social_budget = 0 explicitly
  // signals 'sold but no social' (vs null = 'unspecified'). The
  // toggle just zeroes the spend in one click.
  const [noSocial,    setNoSocial]    = useState<boolean>(placement.social_budget === 0)
  const [ongoing,     setOngoing]     = useState<boolean>(placement.is_ongoing)
  const [expires,     setExpires]     = useState<string>(placement.expires_month ?? '')
  // Specific months this ad is running in. Independent of the
  // ongoing/check-status flag — editors use it to scope-mark which
  // issues are confirmed (e.g. 'Mar/Apr/May for the spring campaign').
  const [months,      setMonths]      = useState<string[]>(placement.specific_months ?? [])
  const [layoutNotes, setLayoutNotes] = useState<string>(placement.layout_notes ?? '')
  const [notes,       setNotes]       = useState<string>(placement.notes ?? '')

  function toggleMonth(m: string) {
    setMonths(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])
  }

  const monthOptions = buildMonthOptions(placement.issue_month)
  const backHref     = `/admin/print-layout?issue=${placement.issue_month}`

  async function onSave() {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const patch = {
        design,
        directory,
        size,
        layout,
        price:           price.trim()  === '' ? null : Number(price),
        // 'No Social' wins over any value in the input — editor toggled
        // it on intentionally to zero the budget.
        social_budget:   noSocial ? 0 : (social.trim() === '' ? null : Number(social)),
        layout_notes:    layoutNotes.trim() || null,
        notes:           notes.trim()       || null,
        expires_month:   expires             || null,
        is_ongoing:      ongoing,
        ad_label:        adLabel.trim()      || null,
        specific_months: months,
      }
      const res = await fetch(`/api/admin/print-placements/${placement.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(patch),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json?.error ?? `HTTP ${res.status}`)
        return
      }
      setSaved(true)
      startTransition(() => router.refresh())
    } finally {
      setSaving(false)
    }
  }

  async function onDelete() {
    if (!confirm(`Delete this placement for "${placement.business_name}" on ${fmtIssue(placement.issue_month)}? This can't be undone.`)) return
    setDeleting(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/print-placements/${placement.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json?.error ?? `HTTP ${res.status}`)
        return
      }
      router.push(backHref)
    } finally {
      setDeleting(false)
    }
  }

  const inp = 'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-gray-400 bg-white'

  return (
    <div className="max-w-3xl mx-auto px-6 py-6 space-y-5">

      {/* ── Header ────────────────────────────────────────── */}
      <div>
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-900 mb-2"
        >
          <ArrowLeft size={12} /> Back to {fmtIssue(placement.issue_month)} layout
        </Link>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">{placement.business_name}</h1>
            {adLabel.trim() && adLabel.trim().toLowerCase() !== placement.business_name.toLowerCase() && (
              <p className="text-sm text-gray-500 mt-0.5">↳ {adLabel.trim()}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {fmtIssue(placement.issue_month)} issue · Print Placement
            </p>
          </div>
          <div className="flex items-center gap-2">
            {placement.advertiser_slug && (
              <Link
                href={`/admin/advertisers/${placement.advertiser_account_id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-gray-200 bg-white rounded-lg hover:bg-gray-50"
              >
                <Building2 size={12} /> Advertiser profile <ExternalLink size={10} className="text-gray-400" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-sm text-rose-800 inline-flex items-center gap-2">
          <AlertCircle size={14} /> {error}
        </div>
      )}
      {saved && !error && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-800">
          Saved.
        </div>
      )}

      {/* ── Identity ──────────────────────────────────────── */}
      <Section icon={<Building2 size={14} />} title="Identity">
        <FieldRow label="Business" hint="The canonical business this ad runs for. Edit via the advertiser profile.">
          <div className="flex items-center gap-2">
            <span className={`${inp} bg-gray-50 text-gray-700`}>{placement.business_name}</span>
          </div>
        </FieldRow>
        <FieldRow label="Ad label" hint="Optional. Only set when this business has multiple ads in the same issue (e.g. 'Senior Ad' variant).">
          <input
            type="text"
            value={adLabel}
            onChange={e => setAdLabel(e.target.value)}
            placeholder="e.g. Senior Ad"
            className={inp}
          />
        </FieldRow>
      </Section>

      {/* ── Ad details ────────────────────────────────────── */}
      <Section icon={<Megaphone size={14} />} title="Ad Details">
        <FieldRow label="Design">
          <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
            {(['new', 'pickup'] as const).map(d => (
              <button
                key={d}
                type="button"
                onClick={() => setDesign(d)}
                className={`px-4 py-2 text-sm font-semibold capitalize ${design === d ? 'bg-gray-900 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
              >
                {d}
              </button>
            ))}
          </div>
        </FieldRow>
        <FieldRow label="Size">
          <select value={size} onChange={e => setSize(parseFloat(e.target.value))} className={`${inp} cursor-pointer`}>
            {SIZE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </FieldRow>
        <FieldRow label="Layout">
          <select value={layout ?? ''} onChange={e => setLayout(e.target.value || null)} className={`${inp} cursor-pointer`}>
            {LAYOUT_OPTIONS.map(o => <option key={o.label} value={o.value ?? ''}>{o.label}</option>)}
          </select>
        </FieldRow>
        <FieldRow label="Include in Directory" hint="Check when this advertiser has agreed to a directory listing in this issue.">
          <label className="inline-flex items-center gap-2 cursor-pointer text-sm pt-1">
            <input type="checkbox" checked={directory} onChange={e => setDirectory(e.target.checked)} />
            <span>{directory ? 'Yes — include in print directory' : 'Not included'}</span>
          </label>
        </FieldRow>
      </Section>

      {/* ── Pricing ───────────────────────────────────────── */}
      <Section icon={<DollarSign size={14} />} title="Pricing">
        <FieldRow label="Price ($)" hint="Leave blank to mark this as a free placement or unpriced.">
          <input
            type="number"
            value={price}
            onChange={e => setPrice(e.target.value)}
            placeholder="0"
            className={inp}
          />
        </FieldRow>
        <FieldRow label="Social budget ($)" hint="Bundled social promotion spend. Pick a preset or type a custom amount.">
          <div className="space-y-2">
            <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={noSocial}
                onChange={e => {
                  setNoSocial(e.target.checked)
                  if (e.target.checked) setSocial('')                  // visual cue: clear the input too
                }}
              />
              <span className={noSocial ? 'font-semibold text-gray-900' : 'text-gray-700'}>
                No social ad running
              </span>
            </label>
            <div className={`grid grid-cols-2 gap-2 ${noSocial ? 'opacity-40 pointer-events-none' : ''}`}>
              <select
                value={SOCIAL_PRESETS.includes(Number(social)) ? social : 'custom'}
                onChange={e => { if (e.target.value !== 'custom') setSocial(e.target.value) }}
                className={`${inp} cursor-pointer`}
                disabled={noSocial}
              >
                <option value="">— None —</option>
                {SOCIAL_PRESETS.map(v => <option key={v} value={v}>${v}</option>)}
                <option value="custom">Custom…</option>
              </select>
              <input
                type="number"
                value={social}
                onChange={e => setSocial(e.target.value)}
                placeholder="$ custom"
                className={inp}
                disabled={noSocial}
              />
            </div>
          </div>
        </FieldRow>
      </Section>

      {/* ── Schedule ──────────────────────────────────────── */}
      <Section icon={<CalendarClock size={14} />} title="Schedule">
        <FieldRow label="Run schedule" hint="Ongoing runs every month until cancelled. Check Status means sporadic — verify before each issue.">
          <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setOngoing(true)}
              className={`px-4 py-2 text-sm font-semibold ${ongoing ? 'bg-emerald-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              Ongoing
            </button>
            <button
              type="button"
              onClick={() => setOngoing(false)}
              className={`px-4 py-2 text-sm font-semibold ${!ongoing ? 'bg-amber-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              Check Status
            </button>
          </div>
        </FieldRow>
        <FieldRow
          label="Months running"
          hint="Tick the issues this placement covers. Useful for tracking partial-year buys and confirming Check Status sponsors month-by-month."
        >
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-y-1 gap-x-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
            {monthOptions.map(m => {
              const checked = months.includes(m)
              return (
                <label
                  key={m}
                  className={`inline-flex items-center gap-1.5 text-xs cursor-pointer rounded px-1.5 py-1 ${checked ? 'bg-white border border-gray-200 font-semibold text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
                >
                  <input type="checkbox" checked={checked} onChange={() => toggleMonth(m)} />
                  {shortMonth(m)}
                </label>
              )
            })}
          </div>
        </FieldRow>
        <FieldRow label="Expires (last committed issue)" hint="Bump this forward to re-up. Past dates flag the row red on the layout sheet.">
          <select value={expires} onChange={e => setExpires(e.target.value)} className={`${inp} cursor-pointer`}>
            <option value="">— No expiry set —</option>
            {monthOptions.map(m => <option key={m} value={m}>{shortMonth(m)}</option>)}
          </select>
        </FieldRow>
      </Section>

      {/* ── Notes ─────────────────────────────────────────── */}
      <Section icon={<StickyNote size={14} />} title="Notes">
        <FieldRow label="Layout notes" hint="Direction for the design team. Shows on the layout sheet.">
          <textarea
            value={layoutNotes}
            onChange={e => setLayoutNotes(e.target.value)}
            placeholder="e.g. 'Inside back cover', 'Use art from Feb19 in Dropbox'"
            rows={3}
            className={inp}
          />
        </FieldRow>
        <FieldRow label="Internal notes" hint="Not shown to the design team. Use for sales / account context.">
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Internal context, sales notes, follow-ups…"
            rows={3}
            className={inp}
          />
        </FieldRow>
      </Section>

      {/* ── Action bar ────────────────────────────────────── */}
      <div className="sticky bottom-0 -mx-6 px-6 py-3 bg-white border-t border-gray-200 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting || saving}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-rose-700 bg-white border border-rose-200 rounded-full hover:bg-rose-50 disabled:opacity-40"
        >
          {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
          Delete placement
        </button>
        <div className="flex items-center gap-2">
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || busy}
            className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-bold bg-primary text-white rounded-full hover:bg-primary/90 disabled:opacity-40 shadow-sm"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Section — labeled card group. One per logical chunk of the form so
// the editor can scan the page top-to-bottom without searching for
// related fields.
function Section({ icon, title, children }: {
  icon:     React.ReactNode
  title:    string
  children: React.ReactNode
}) {
  return (
    <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <header className="px-5 py-3 border-b border-gray-100 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-500">
        <span className="text-gray-400">{icon}</span>
        {title}
      </header>
      <div className="p-5 space-y-4">
        {children}
      </div>
    </section>
  )
}

// FieldRow — label + control + optional hint, stacked vertically.
// Matches the Zoho-ish look the editor referenced: dense but readable.
function FieldRow({ label, hint, children }: {
  label:    string
  hint?:    string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-gray-400 mt-1 leading-snug">{hint}</p>}
    </div>
  )
}
