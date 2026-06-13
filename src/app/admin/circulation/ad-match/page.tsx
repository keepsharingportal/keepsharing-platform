// /admin/circulation/ad-match — cross-reference print advertisers ↔ distribution stops.
//
// Diagnostic + linking tool. Answers: "Of the N advertisers who paid for a
// print ad in [issue_month], how many are also pickup-location stops, and
// which ones?"
//
// Three result buckets:
//   1. Linked         — advertiser already has circulation_stops.advertiser_account_id set
//   2. Likely match   — name similarity ≥ 0.6 with one or more stops (suggest link)
//   3. No match       — advertiser in print but no matching stop (need to add a stop, OR they
//                       don't have a physical pickup location, OR ad-only relationship)
//
// Plus an "Orphan stops" section: stops with is_advertiser=true but no
// advertiser_account_id, showing the candidate matches to clean up.

import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { regionForMarket } from '@/lib/circulation/regions'
import { LinkAdvertiserButton } from './LinkAdvertiserButton'

export const metadata = { title: 'Print Ad Match — Distribution Portal' }
export const dynamic  = 'force-dynamic'

interface PageProps { searchParams: Promise<{ month?: string }> }

interface AdvertiserRow {
  id:            string
  business_name: string
  slug:          string
  contact_name:  string | null
  contact_email: string | null
}
interface PrintPlacementRow {
  advertiser_account_id: string
  size:                  number
  design:                string
}
interface StopRow {
  id:                    string
  name:                  string
  address:               string | null
  city:                  string | null
  is_advertiser:         boolean
  ad_level:              string | null
  advertiser_account_id: string | null
}

function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function fmtMonth(m: string): string {
  return new Date(m + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}
function sizeLabel(s: number): string {
  if (s === 1)    return 'Full'
  if (s === 0.66) return '2/3'
  if (s === 0.5)  return '1/2'
  if (s === 0.33) return '1/3'
  if (s === 0.25) return '1/4'
  if (s === 0.16) return '1/6'
  if (s === 0.12) return '1/8'
  return String(s)
}
function tierForSize(s: number): 'top' | 'middle' | 'bottom' {
  if (s >= 0.66) return 'top'
  if (s >= 0.33) return 'middle'
  return 'bottom'
}

// Normalize a business / stop name for comparison: lowercase, strip punctuation,
// drop common suffixes that show up on one side but not the other.
function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+(llc|inc|incorporated|co|company|the|of|and)\s+/g, ' ')
    .replace(/^(the\s+)/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// Simple token-set Jaccard similarity — works well for short business names
// without needing a real string-distance library.
function similarity(a: string, b: string): number {
  const an = normalize(a)
  const bn = normalize(b)
  if (!an || !bn) return 0
  if (an === bn) return 1
  const at = new Set(an.split(' ').filter(Boolean))
  const bt = new Set(bn.split(' ').filter(Boolean))
  if (at.size === 0 || bt.size === 0) return 0
  let inter = 0
  for (const t of at) if (bt.has(t)) inter++
  const union = at.size + bt.size - inter
  // Boost matches where one name is fully contained in the other
  const contains = an.includes(bn) || bn.includes(an) ? 0.15 : 0
  return Math.min(1, inter / union + contains)
}

export default async function AdMatchPage({ searchParams }: PageProps) {
  const sp     = await searchParams
  const ctx    = await requireAdmin()
  const market = ctx.viewingAll ? 'rrp' : ctx.activeMarket
  const region = regionForMarket(market)
  const dbKey  = region.slug
  const month  = sp.month?.trim() || currentMonth()
  const sb     = createAdminClient()

  let advertisers: AdvertiserRow[] = []
  let placements:  PrintPlacementRow[] = []
  let stops:       StopRow[] = []
  let migrationsMissing: string[] = []

  const [advRes, placeRes, stopsRes] = await Promise.all([
    sb.from('advertiser_accounts').select('id, business_name, slug, contact_name, contact_email'),
    sb.from('print_ad_placements').select('advertiser_account_id, size, design').eq('issue_month', month),
    sb.from('circulation_stops')
      .select('id, name, address, city, is_advertiser, ad_level, advertiser_account_id')
      .eq('market', dbKey)
      .eq('active', true)
      .eq('is_pickup', false),
  ])
  if (advRes.error)   { if (/relation .* does not exist/.test(advRes.error.message))   migrationsMissing.push('016 (advertiser_accounts)') }
  if (placeRes.error) { if (/relation .* does not exist/.test(placeRes.error.message)) migrationsMissing.push('129 (print_ad_placements)') }
  if (stopsRes.error) { if (/column .* does not exist/.test(stopsRes.error.message))    migrationsMissing.push('172 (circulation_stops.advertiser_account_id)') }
  advertisers = (advRes.data   ?? []) as AdvertiserRow[]
  placements  = (placeRes.data ?? []) as PrintPlacementRow[]
  stops       = (stopsRes.data ?? []) as StopRow[]

  // For each advertiser running a print ad this month, compute their largest
  // size + tier. (Multiple rows can exist if they're running multi-month
  // commitments — we already filtered to this month above.)
  const sizesByAdvertiser = new Map<string, number>()
  for (const p of placements) {
    const current = sizesByAdvertiser.get(p.advertiser_account_id) ?? 0
    if (p.size > current) sizesByAdvertiser.set(p.advertiser_account_id, p.size)
  }

  const advertisersThisMonth = advertisers
    .filter(a => sizesByAdvertiser.has(a.id))
    .map(a => {
      const size = sizesByAdvertiser.get(a.id)!
      return { ...a, size, tier: tierForSize(size) }
    })
    .sort((a, b) => b.size - a.size || a.business_name.localeCompare(b.business_name))

  // Index stops by advertiser_account_id for the "already linked" lookup.
  const stopByAdv = new Map<string, StopRow[]>()
  for (const s of stops) {
    if (s.advertiser_account_id) {
      const list = stopByAdv.get(s.advertiser_account_id) ?? []
      list.push(s)
      stopByAdv.set(s.advertiser_account_id, list)
    }
  }

  // Bucket the advertisers
  const linked:    Array<typeof advertisersThisMonth[number] & { stops: StopRow[] }> = []
  const candidate: Array<typeof advertisersThisMonth[number] & { suggestions: Array<{ stop: StopRow; score: number }> }> = []
  const unmatched: typeof advertisersThisMonth = []

  // Stops that are already linked OR likely to match — don't suggest them
  // twice across multiple advertisers.
  const consumedStopIds = new Set<string>(
    stops.filter(s => s.advertiser_account_id).map(s => s.id),
  )

  for (const a of advertisersThisMonth) {
    if (stopByAdv.has(a.id)) {
      linked.push({ ...a, stops: stopByAdv.get(a.id)! })
      continue
    }
    // No FK yet — fuzzy match by name against unlinked stops
    const scored = stops
      .filter(s => !s.advertiser_account_id && !consumedStopIds.has(s.id))
      .map(s => ({ stop: s, score: similarity(a.business_name, s.name) }))
      .filter(x => x.score >= 0.5)
      .sort((x, y) => y.score - x.score)
      .slice(0, 3)
    if (scored.length > 0) {
      candidate.push({ ...a, suggestions: scored })
    } else {
      unmatched.push(a)
    }
  }

  // Orphan stops: is_advertiser=true but no FK and not consumed as a match candidate above.
  const orphanStops = stops.filter(s =>
    s.is_advertiser
    && !s.advertiser_account_id
    && !candidate.some(c => c.suggestions.some(sg => sg.stop.id === s.id))
  )

  return (
    <div className="portal-app flex flex-col flex-1 min-h-0 bg-portal-bg">

      <div className="page-header">
        <div>
          <h1 className="ph-title">Print ad ↔ distribution match</h1>
          <div className="text-muted text-sm">{fmtMonth(month)} · {region.name}</div>
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
            <strong>Schema gaps detected.</strong> Run these migrations before this page is meaningful: {migrationsMissing.join(', ')}
          </div>
        )}

        {/* Headline counts */}
        <div className="stats-row" style={{ marginBottom: 18 }}>
          <div className="stat-card">
            <div className="stat-num">{advertisersThisMonth.length}</div>
            <div className="stat-label">Print advertisers</div>
          </div>
          <div className="stat-card">
            <div className="stat-num has-amber">{candidate.length}</div>
            <div className="stat-label">Likely match — review</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">{linked.length}</div>
            <div className="stat-label">Already linked</div>
          </div>
          <div className="stat-card">
            <div className="stat-num">{unmatched.length}</div>
            <div className="stat-label">No stop found</div>
          </div>
          <div className="stat-card">
            <div className="stat-num has-red">{orphanStops.length}</div>
            <div className="stat-label">Orphan advertiser stops</div>
          </div>
        </div>

        {/* ── Likely match — actionable section, top of page ── */}
        {candidate.length > 0 && (
          <div className="card mb-4">
            <div className="card-header">
              <span className="card-title">Likely matches — confirm to link</span>
              <span className="badge badge-amber">{candidate.length}</span>
            </div>
            <p className="text-sub text-sm" style={{ marginBottom: 14 }}>
              These print advertisers fuzzy-match an unlinked distribution stop by name. Click the suggested stop to confirm the link — once linked, the advertiser&apos;s ad-tier will drive the stop&apos;s map listing automatically.
            </p>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Print advertiser</th>
                  <th>Size · tier</th>
                  <th>Suggested distribution stop(s)</th>
                </tr>
              </thead>
              <tbody>
                {candidate.map(c => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.business_name}</strong>
                      {c.contact_name && <div className="text-muted text-xs">{c.contact_name}</div>}
                    </td>
                    <td className="text-sub">
                      {sizeLabel(c.size)} page · <span className={`badge ${c.tier === 'top' ? 'badge-green' : c.tier === 'middle' ? 'badge-amber' : 'badge-gray'}`}>{c.tier}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {c.suggestions.map((s, i) => (
                          <div key={s.stop.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{
                              width: 36, height: 22, lineHeight: '22px',
                              textAlign: 'center', borderRadius: 11,
                              background: s.score >= 0.85 ? '#DCFCE7' : s.score >= 0.7 ? '#FEF3C7' : '#F1F5F9',
                              color: s.score >= 0.85 ? '#166534' : s.score >= 0.7 ? '#92400E' : '#64748B',
                              fontFamily: 'ui-monospace, monospace',
                              fontSize: 11, fontWeight: 700,
                              flexShrink: 0,
                            }}>{Math.round(s.score * 100)}%</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="fw-600 text-sm">{s.stop.name}</div>
                              <div className="text-muted text-xs">{s.stop.address}{s.stop.city ? `, ${s.stop.city}` : ''}</div>
                            </div>
                            <LinkAdvertiserButton stopId={s.stop.id} advertiserId={c.id} suggested={i === 0} />
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Already linked ── */}
        {linked.length > 0 && (
          <div className="card mb-4">
            <div className="card-header">
              <span className="card-title">Linked to distribution stops</span>
              <span className="badge badge-green">{linked.length}</span>
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
                {linked.map(l => (
                  <tr key={l.id}>
                    <td><strong>{l.business_name}</strong></td>
                    <td className="text-sub">
                      {sizeLabel(l.size)} page · <span className={`badge ${l.tier === 'top' ? 'badge-green' : l.tier === 'middle' ? 'badge-amber' : 'badge-gray'}`}>{l.tier}</span>
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
        )}

        {/* ── No stop found ── */}
        {unmatched.length > 0 && (
          <div className="card mb-4">
            <div className="card-header">
              <span className="card-title">No matching distribution stop</span>
              <span className="badge badge-gray">{unmatched.length}</span>
            </div>
            <p className="text-sub text-sm" style={{ marginBottom: 14 }}>
              These advertisers ran a print ad in {fmtMonth(month)} but don&apos;t appear in the distribution stops list. Either:
              {' '}<strong>(a)</strong> they don&apos;t have a physical pickup location (advertising-only relationship),
              {' '}<strong>(b)</strong> their stop hasn&apos;t been added yet,
              {' '}<strong>(c)</strong> their stop name is too dissimilar from their business name to fuzzy-match.
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
                {unmatched.map(a => (
                  <tr key={a.id}>
                    <td>
                      <strong>{a.business_name}</strong>
                      <div className="text-muted text-xs">
                        <Link href={`/admin/advertisers/${a.id}`}>View profile →</Link>
                      </div>
                    </td>
                    <td className="text-sub">
                      {sizeLabel(a.size)} page · <span className={`badge ${a.tier === 'top' ? 'badge-green' : a.tier === 'middle' ? 'badge-amber' : 'badge-gray'}`}>{a.tier}</span>
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
        )}

        {/* ── Orphan stops ── */}
        {orphanStops.length > 0 && (
          <div className="card mb-4">
            <div className="card-header">
              <span className="card-title">Orphan advertiser stops</span>
              <span className="badge badge-red">{orphanStops.length}</span>
            </div>
            <p className="text-sub text-sm" style={{ marginBottom: 14 }}>
              These distribution stops are flagged as <code>is_advertiser=true</code> but aren&apos;t linked to an <code>advertiser_accounts</code> row. Either link them in the stop editor (Routes &amp; Stops → click a stop) or clear the advertiser flag if it&apos;s no longer accurate.
            </p>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Distribution stop</th>
                  <th>Address</th>
                  <th>Currently shown as</th>
                </tr>
              </thead>
              <tbody>
                {orphanStops.map(s => (
                  <tr key={s.id}>
                    <td><strong>{s.name}</strong></td>
                    <td className="text-sub text-sm">{s.address ?? ''}{s.city ? `, ${s.city}` : ''}</td>
                    <td>
                      {s.ad_level ? (
                        <span className={`badge ${s.ad_level === 'platinum' || s.ad_level === 'top' ? 'badge-green' : 'badge-amber'}`}>
                          {s.ad_level}
                        </span>
                      ) : (
                        <span className="badge badge-gray">untiered</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {advertisersThisMonth.length === 0 && migrationsMissing.length === 0 && (
          <div className="card" style={{ textAlign: 'center', padding: 32 }}>
            <p className="text-sub">No advertisers ran a print ad in {fmtMonth(month)}.</p>
          </div>
        )}
      </div>
    </div>
  )
}
