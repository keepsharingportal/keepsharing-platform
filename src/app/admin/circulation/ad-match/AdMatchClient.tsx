'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export interface AdvertiserView {
  id:            string
  business_name: string
  size:          number
  size_label:    string
  tier:          'top' | 'middle' | 'bottom'
  contact_name:  string | null
  contact_email: string | null
}
export interface StopView {
  id:           string
  name:         string
  address:      string | null
  city:         string | null
  is_advertiser: boolean
  ad_level:     string | null
}
export interface DuplicatePair {
  a_id:   string
  a_name: string
  b_id:   string
  b_name: string
  score:  number
}

interface Props {
  month:             string
  monthLabel:        string
  regionName:        string
  migrationsMissing: string[]
  supportsArchive:   boolean
  counts: {
    advertisersThisMonth: number
    candidate:            number
    linked:               number
    unmatched:            number
    dupes:                number
  }
  linked:    Array<AdvertiserView & { stops: StopView[] }>
  candidate: Array<AdvertiserView & { suggestions: Array<{ stop: StopView; score: number }> }>
  unmatched: AdvertiserView[]
  dupes:     DuplicatePair[]
}

const TIER_BADGE: Record<AdvertiserView['tier'], string> = {
  top:    'badge-green',
  middle: 'badge-amber',
  bottom: 'badge-gray',
}

export function AdMatchClient({
  month, monthLabel, regionName,
  migrationsMissing, supportsArchive,
  counts, linked, candidate, unmatched, dupes,
}: Props) {
  return (
    <div className="portal-app flex flex-col flex-1 min-h-0 bg-portal-bg">

      <div className="page-header">
        <div>
          <h1 className="ph-title">Print ad ↔ distribution match</h1>
          <div className="text-muted text-sm">{monthLabel} · {regionName}</div>
        </div>
        <div className="ph-actions">
          <form method="get" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label className="text-xs text-muted">Issue:</label>
            <input
              name="month"
              defaultValue={month}
              placeholder="YYYY-MM"
              pattern="\d{4}-\d{2}"
              style={{
                padding: '5px 10px',
                border: '1.5px solid var(--color-portal-border-2)',
                borderRadius: 6,
                fontSize: 12,
                width: 88,
                fontFamily: 'ui-monospace, monospace',
              }}
            />
            <button type="submit" className="btn btn-ghost btn-sm">Go</button>
          </form>
        </div>
      </div>

      <div className="content-body overflow-y-auto">

        {migrationsMissing.length > 0 && (
          <div className="alert alert-warning mb-4">
            <strong>Schema gaps detected.</strong> Run these migrations before this page is fully functional: {migrationsMissing.join(', ')}
          </div>
        )}

        <div className="stats-row" style={{ marginBottom: 18 }}>
          <div className="stat-card">
            <div className="stat-num">{counts.advertisersThisMonth}</div>
            <div className="stat-label">Print advertisers</div>
          </div>
          <div className="stat-card">
            <div className="stat-num has-amber">{counts.candidate}</div>
            <div className="stat-label">Likely match — review</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">{counts.linked}</div>
            <div className="stat-label">Already linked</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">{counts.unmatched}</div>
            <div className="stat-label">No stop found</div>
          </div>
          <div className="stat-card">
            <div className="stat-num has-red">{counts.dupes}</div>
            <div className="stat-label">Possible duplicates</div>
          </div>
        </div>

        {dupes.length > 0 && <DuplicatesSection dupes={dupes} supportsArchive={supportsArchive} />}
        {candidate.length > 0 && <CandidateSection items={candidate} />}
        {linked.length > 0 && <LinkedSection items={linked} />}
        {unmatched.length > 0 && <UnmatchedSection items={unmatched} monthLabel={monthLabel} />}

        {counts.advertisersThisMonth === 0 && migrationsMissing.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: 32 }}>
            <p className="text-sub">No advertisers ran a print ad in {monthLabel}.</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Duplicate advertisers ──────────────────────────────────────────────
function DuplicatesSection({ dupes, supportsArchive }: { dupes: DuplicatePair[]; supportsArchive: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)

  async function archive(id: string, name: string) {
    if (!supportsArchive) {
      alert('Run migration 173 first to enable archive.')
      return
    }
    if (!confirm(`Archive "${name}"? Its data stays in place but the row is hidden from active-advertiser queries (this list, the map tier-assignment job, etc.).`)) return
    setBusy(id)
    try {
      const res = await fetch('/api/admin/advertisers/archive', {
        method:  'POST',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({ id, archived: true }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { alert(j.error ?? 'Archive failed.'); return }
      router.refresh()
    } finally { setBusy(null) }
  }

  return (
    <div className="card mb-4">
      <div className="card-header">
        <span className="card-title">Possible duplicate advertisers</span>
        <span className="badge badge-red">{dupes.length}</span>
      </div>
      <p className="text-sub text-sm" style={{ marginBottom: 14 }}>
        Pairs of <code>advertiser_accounts</code> rows with very similar names — often the same real business entered twice. Archive the wrong one before linking distribution stops, or your ad-tier job will count them as separate accounts.
      </p>
      <table className="data-table">
        <thead>
          <tr>
            <th>Match</th>
            <th>Advertiser A</th>
            <th>Advertiser B</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {dupes.map(d => (
            <tr key={`${d.a_id}:${d.b_id}`}>
              <td>
                <span style={{
                  display: 'inline-block',
                  padding: '2px 8px',
                  background: d.score >= 0.9 ? '#DCFCE7' : '#FEF3C7',
                  color:      d.score >= 0.9 ? '#166534' : '#92400E',
                  borderRadius: 11,
                  fontFamily: 'ui-monospace, monospace',
                  fontSize: 11,
                  fontWeight: 700,
                }}>
                  {Math.round(d.score * 100)}%
                </span>
              </td>
              <td>
                <strong>{d.a_name}</strong>
                <div className="text-muted text-xs">
                  <Link href={`/admin/advertisers/${d.a_id}`} target="_blank">View profile →</Link>
                </div>
              </td>
              <td>
                <strong>{d.b_name}</strong>
                <div className="text-muted text-xs">
                  <Link href={`/admin/advertisers/${d.b_id}`} target="_blank">View profile →</Link>
                </div>
              </td>
              <td>
                <div className="flex gap-1">
                  <button type="button" onClick={() => archive(d.a_id, d.a_name)} disabled={busy === d.a_id} className="btn btn-ghost btn-xs">
                    Archive A
                  </button>
                  <button type="button" onClick={() => archive(d.b_id, d.b_name)} disabled={busy === d.b_id} className="btn btn-ghost btn-xs">
                    Archive B
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Likely matches — multi-select link ────────────────────────────────
function CandidateSection({ items }: { items: Array<AdvertiserView & { suggestions: Array<{ stop: StopView; score: number }> }> }) {
  return (
    <div className="card mb-4">
      <div className="card-header">
        <span className="card-title">Likely matches — confirm to link</span>
        <span className="badge badge-amber">{items.length}</span>
      </div>
      <p className="text-sub text-sm" style={{ marginBottom: 14 }}>
        Each advertiser&apos;s row below shows up to 8 distribution-stop candidates by name similarity. <strong>Multi-location chains</strong> (Adams Drugs, Aim Academy, etc.) typically have several stops matching — check each one you want to link, then <strong>Link selected</strong> applies the same advertiser FK to all of them in one click.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {items.map(c => <CandidateRow key={c.id} advertiser={c} />)}
      </div>
    </div>
  )
}

function CandidateRow({ advertiser }: { advertiser: AdvertiserView & { suggestions: Array<{ stop: StopView; score: number }> } }) {
  const router = useRouter()
  // Default-check rows scoring >= 90% (almost certainly the same business)
  const [picked, setPicked] = useState<Set<string>>(
    () => new Set(advertiser.suggestions.filter(s => s.score >= 0.9).map(s => s.stop.id)),
  )
  const [busy, setBusy] = useState(false)

  function toggle(stopId: string) {
    setPicked(prev => {
      const next = new Set(prev)
      if (next.has(stopId)) next.delete(stopId); else next.add(stopId)
      return next
    })
  }

  async function linkSelected() {
    if (picked.size === 0) return
    setBusy(true)
    try {
      // Bulk-link all selected stops to this advertiser. PATCH in parallel
      // — the existing endpoint is per-stop, and N parallel requests for
      // ~4 locations is plenty fast.
      const results = await Promise.allSettled(
        Array.from(picked).map(stopId =>
          fetch('/api/admin/circulation/stops', {
            method:  'PATCH',
            headers: { 'content-type': 'application/json' },
            body:    JSON.stringify({ id: stopId, advertiser_account_id: advertiser.id }),
          }).then(r => r.ok ? null : r.text())
        )
      )
      const failures = results.filter(r => r.status === 'fulfilled' && r.value !== null).length
      if (failures > 0) {
        alert(`${failures} of ${picked.size} links failed. Try again or check the API logs.`)
      }
      router.refresh()
    } finally { setBusy(false) }
  }

  return (
    <div style={{
      border: '1px solid var(--color-portal-border)',
      borderRadius: 8,
      padding: '12px 14px',
      background: 'white',
    }}>
      <div className="flex items-center justify-between" style={{ gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
        <div>
          <strong style={{ fontSize: 14 }}>{advertiser.business_name}</strong>
          <span className="text-sub text-sm" style={{ marginLeft: 8 }}>
            {advertiser.size_label} page · <span className={`badge ${TIER_BADGE[advertiser.tier]}`}>{advertiser.tier}</span>
          </span>
        </div>
        <button
          type="button"
          onClick={linkSelected}
          disabled={busy || picked.size === 0}
          className="btn btn-primary btn-sm"
        >
          {busy ? 'Linking…' : `Link ${picked.size} selected`}
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {advertiser.suggestions.map(s => {
          const checked = picked.has(s.stop.id)
          return (
            <label
              key={s.stop.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '6px 8px', borderRadius: 6,
                background: checked ? '#EFF6FF' : 'transparent',
                cursor: 'pointer',
                fontSize: 13,
                textTransform: 'none', letterSpacing: 0, fontWeight: 400,
              }}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(s.stop.id)}
                style={{ width: 'auto', accentColor: 'var(--color-portal-blue)' }}
              />
              <span style={{
                display: 'inline-block',
                width: 40, lineHeight: '20px',
                textAlign: 'center', borderRadius: 10,
                background: s.score >= 0.85 ? '#DCFCE7' : s.score >= 0.65 ? '#FEF3C7' : '#F1F5F9',
                color:      s.score >= 0.85 ? '#166534' : s.score >= 0.65 ? '#92400E' : '#64748B',
                fontFamily: 'ui-monospace, monospace',
                fontSize: 11, fontWeight: 700,
                flexShrink: 0,
              }}>
                {Math.round(s.score * 100)}%
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="fw-600">{s.stop.name}</div>
                <div className="text-muted text-xs">{s.stop.address ?? ''}{s.stop.city ? `, ${s.stop.city}` : ''}</div>
              </div>
            </label>
          )
        })}
      </div>
    </div>
  )
}

// ── Already linked ────────────────────────────────────────────────────
function LinkedSection({ items }: { items: Array<AdvertiserView & { stops: StopView[] }> }) {
  return (
    <div className="card mb-4">
      <div className="card-header">
        <span className="card-title">Linked to distribution stops</span>
        <span className="badge badge-green">{items.length}</span>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Print advertiser</th>
            <th>Size · tier</th>
            <th>Distribution stop(s)</th>
          </tr>
        </thead>
        <tbody>
          {items.map(l => (
            <tr key={l.id}>
              <td><strong>{l.business_name}</strong></td>
              <td className="text-sub">
                {l.size_label} page · <span className={`badge ${TIER_BADGE[l.tier]}`}>{l.tier}</span>
              </td>
              <td className="text-sub text-sm">
                {l.stops.map(s => (
                  <div key={s.id}>
                    <strong>{s.name}</strong>{s.address && <> — {s.address}</>}
                  </div>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── No match ───────────────────────────────────────────────────────────
function UnmatchedSection({ items, monthLabel }: { items: AdvertiserView[]; monthLabel: string }) {
  return (
    <div className="card mb-4">
      <div className="card-header">
        <span className="card-title">No matching distribution stop</span>
        <span className="badge badge-gray">{items.length}</span>
      </div>
      <p className="text-sub text-sm" style={{ marginBottom: 14 }}>
        These advertisers ran a print ad in {monthLabel} but don&apos;t appear in the distribution stops list. Either:
        {' '}<strong>(a)</strong> they don&apos;t have a physical pickup location (advertising-only relationship),
        {' '}<strong>(b)</strong> their stop hasn&apos;t been added yet,
        {' '}<strong>(c)</strong> their stop name is too dissimilar to fuzzy-match.
      </p>
      <table className="data-table">
        <thead>
          <tr>
            <th>Print advertiser</th>
            <th>Size · tier</th>
            <th>Contact</th>
          </tr>
        </thead>
        <tbody>
          {items.map(a => (
            <tr key={a.id}>
              <td>
                <strong>{a.business_name}</strong>
                <div className="text-muted text-xs">
                  <Link href={`/admin/advertisers/${a.id}`} target="_blank">View profile →</Link>
                </div>
              </td>
              <td className="text-sub">
                {a.size_label} page · <span className={`badge ${TIER_BADGE[a.tier]}`}>{a.tier}</span>
              </td>
              <td className="text-sub text-sm">
                {a.contact_name && <div>{a.contact_name}</div>}
                {a.contact_email && <div className="text-muted text-xs">{a.contact_email}</div>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
