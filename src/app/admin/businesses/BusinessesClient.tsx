'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, RefreshCw } from 'lucide-react'

export interface BusinessSummary {
  id:               string
  name:             string
  address:          string | null
  city:             string | null
  logo_path:        string | null
  stop_count:       number
  listing_count:    number
  advertiser_count: number
}

interface Props {
  q:                 string
  businesses:        BusinessSummary[]
  migrationMissing:  boolean
  counts: {
    unlinkedStops:      number
    unlinkedListings:   number
    unlinkedAdvertisers: number
    total:              number
  }
}

export function BusinessesClient({ q, businesses, migrationMissing, counts }: Props) {
  const router = useRouter()
  const [running, setRunning] = useState(false)
  const [lastSummary, setLastSummary] = useState<null | { new_businesses: number; linked_stops: number; linked_listings: number; linked_advertisers: number; profile_fields_filled: number; conflicts: number }> (null)
  const [err, setErr] = useState<string | null>(null)
  const [search, setSearch] = useState(q)

  async function runBackfill() {
    if (!confirm(
      'Run backfill?\n\n' +
      'This walks every advertiser_account, circulation_stop, and guide_listing, fuzzy-matches each to a canonical business profile (or creates a new one), and writes the business_id FK. Safe to re-run — already-linked rows are skipped.\n\n' +
      'For ' + (counts.unlinkedStops + counts.unlinkedListings + counts.unlinkedAdvertisers).toLocaleString() + ' unlinked rows, this typically takes 10–30 seconds.'
    )) return
    setRunning(true)
    setErr(null)
    try {
      const res = await fetch('/api/admin/businesses/backfill', { method: 'POST' })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(j.error ?? 'Backfill failed.'); return }
      setLastSummary(j.summary)
      router.refresh()
    } finally { setRunning(false) }
  }

  return (
    <div className="portal-app flex flex-col flex-1 min-h-0 bg-portal-bg">

      <div className="page-header">
        <div>
          <h1 className="ph-title">Businesses</h1>
          <div className="text-muted text-sm">
            Master profile per real-world business — feeds the public map, the guides, and advertiser pages.
          </div>
        </div>
        <div className="ph-actions">
          <button
            type="button"
            onClick={runBackfill}
            disabled={running || migrationMissing}
            className="btn btn-primary btn-sm"
          >
            <RefreshCw size={14} /> {running ? 'Backfilling…' : 'Run backfill'}
          </button>
        </div>
      </div>

      <div className="content-body overflow-y-auto">

        {migrationMissing && (
          <div className="alert alert-warning mb-4">
            <strong>Schema gap.</strong> Run <code>supabase/migrations/175_businesses_master.sql</code> in Supabase Studio first — the <code>businesses</code> table doesn&apos;t exist yet, so backfill + this page have nothing to read from.
          </div>
        )}

        {lastSummary && (
          <div className="alert alert-success mb-4">
            <strong>Backfill complete.</strong>{' '}
            {lastSummary.new_businesses} new profiles created ·{' '}
            {lastSummary.linked_stops} stops linked ·{' '}
            {lastSummary.linked_listings} guide listings linked ·{' '}
            {lastSummary.linked_advertisers} advertisers linked ·{' '}
            {lastSummary.profile_fields_filled} missing fields filled in
            {lastSummary.conflicts > 0 && <> · <strong style={{ color: 'var(--color-portal-red)' }}>{lastSummary.conflicts} conflicts</strong> needing manual review</>}
          </div>
        )}
        {err && <div className="alert alert-error mb-4">{err}</div>}

        <div className="stats-row" style={{ marginBottom: 18 }}>
          <div className="stat-card">
            <div className="stat-num">{counts.total}</div>
            <div className="stat-label">Businesses</div>
          </div>
          <div className="stat-card">
            <div className={`stat-num ${counts.unlinkedStops > 0 ? 'has-amber' : ''}`}>{counts.unlinkedStops}</div>
            <div className="stat-label">Stops not linked</div>
          </div>
          <div className="stat-card">
            <div className={`stat-num ${counts.unlinkedListings > 0 ? 'has-amber' : ''}`}>{counts.unlinkedListings}</div>
            <div className="stat-label">Listings not linked</div>
          </div>
          <div className="stat-card">
            <div className={`stat-num ${counts.unlinkedAdvertisers > 0 ? 'has-amber' : ''}`}>{counts.unlinkedAdvertisers}</div>
            <div className="stat-label">Advertisers not linked</div>
          </div>
        </div>

        <form method="get" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 480 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-portal-muted)' }} />
            <input
              name="q"
              defaultValue={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search businesses by name or address…"
              style={{
                width: '100%',
                padding: '6px 10px 6px 30px',
                border: '1.5px solid var(--color-portal-border-2)',
                borderRadius: 6,
                fontSize: 13,
              }}
            />
          </div>
          <button type="submit" className="btn btn-ghost btn-sm">Search</button>
        </form>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Business</th>
                <th>Address</th>
                <th style={{ textAlign: 'center' }}>Stops</th>
                <th style={{ textAlign: 'center' }}>Listings</th>
                <th style={{ textAlign: 'center' }}>Advertiser</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {businesses.length === 0 && !migrationMissing && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: 'var(--color-portal-sub)' }}>
                  {q ? 'No businesses match your search.' : 'No businesses yet — click Run backfill to seed from existing data.'}
                </td></tr>
              )}
              {businesses.map(b => (
                <tr key={b.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {b.logo_path && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={b.logo_path} alt="" style={{ width: 22, height: 22, objectFit: 'contain', flexShrink: 0 }} />
                      )}
                      <strong>{b.name}</strong>
                    </div>
                  </td>
                  <td className="text-sub text-sm">{b.address ?? ''}{b.city ? `, ${b.city}` : ''}</td>
                  <td className="mono" style={{ textAlign: 'center' }}>{b.stop_count > 0 ? b.stop_count : '-'}</td>
                  <td className="mono" style={{ textAlign: 'center' }}>{b.listing_count > 0 ? b.listing_count : '-'}</td>
                  <td style={{ textAlign: 'center' }}>
                    {b.advertiser_count > 0 ? <span className="badge badge-green">Yes</span> : <span className="text-muted text-xs">—</span>}
                  </td>
                  <td>
                    <Link href={`/admin/businesses/${b.id}`} className="btn btn-ghost btn-xs">Edit profile</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {businesses.length === 500 && (
          <p className="text-muted text-xs" style={{ marginTop: 10 }}>
            Showing first 500. Use the search field to narrow down.
          </p>
        )}
      </div>
    </div>
  )
}
