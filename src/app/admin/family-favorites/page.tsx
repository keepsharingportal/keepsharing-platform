// ── /admin/family-favorites ───────────────────────────────────────────────────
// Family Favorites ecosystem command center.
// Manages the annual recognition program: seasons, categories, nominations,
// voting oversight, sponsor placements, and winner management.

import type { Metadata }  from 'next'
import Link               from 'next/link'
import { createClient }   from '@/lib/supabase/server'
import {
  FF_GROUPS, FF_ANNUAL_CALENDAR, FF_SPONSOR_TIERS, PHASE_CONFIG,
  type FFPhase,
} from '@/lib/family-favorites'

export const metadata: Metadata = { title: 'Family Favorites — Admin' }

// ── Types ─────────────────────────────────────────────────────────────────────

interface Season {
  id:     string; year: number; name: string; status: FFPhase
  nomination_opens_at?:   string; nomination_closes_at?: string
  finalist_announced_at?: string; voting_opens_at?:     string
  voting_closes_at?:      string; winners_announced_at?: string
  print_issue_date?:      string; is_active: boolean
}

interface NominationCount {
  category_id: string; status: string; count: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(s: string | null | undefined): string {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function daysUntil(s: string | null | undefined, now: Date): number | null {
  if (!s) return null
  return Math.ceil((new Date(s).getTime() - now.getTime()) / (24 * 60 * 60 * 1000))
}

// ── Phase timeline component ──────────────────────────────────────────────────

const PHASE_SEQUENCE: FFPhase[] = ['planning', 'nominations', 'finalist-review', 'voting', 'announcing', 'complete']

function PhaseTimeline({ currentPhase }: { currentPhase: FFPhase }) {
  const currentIdx = PHASE_SEQUENCE.indexOf(currentPhase)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', paddingBottom: 4 }}>
      {PHASE_SEQUENCE.map((phase, i) => {
        const done    = i < currentIdx
        const active  = i === currentIdx
        const cfg     = PHASE_CONFIG[phase]
        return (
          <div key={phase} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                backgroundColor: done ? '#22c55e' : active ? cfg.color : '#e5e7eb',
                border: `2px solid ${done ? '#22c55e' : active ? cfg.color : '#e5e7eb'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: active ? `0 0 0 3px ${cfg.color}30` : 'none',
              }}>
                {done
                  ? <span style={{ color: '#fff', fontSize: 14 }}>✓</span>
                  : <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: active ? '#fff' : '#d1d5db', display: 'inline-block' }} />
                }
              </div>
              <span style={{ fontSize: 9, fontWeight: 700, color: active ? cfg.color : done ? '#22c55e' : '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap', textAlign: 'center', maxWidth: 70 }}>
                {cfg.label}
              </span>
            </div>
            {i < PHASE_SEQUENCE.length - 1 && (
              <div style={{ height: 2, width: 40, backgroundColor: i < currentIdx ? '#22c55e' : '#e5e7eb', margin: '0 4px', marginBottom: 20, flexShrink: 0 }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function FamilyFavoritesAdminPage() {
  const supabase = await createClient()
  const now      = new Date()
  const month    = now.getMonth() + 1

  // ── Fetch active season ──────────────────────────────────────────────────
  const { data: activeSeason } = await supabase
    .from('ff_seasons')
    .select('id, year, name, status, nomination_opens_at, nomination_closes_at, finalist_announced_at, voting_opens_at, voting_closes_at, winners_announced_at, print_issue_date, is_active')
    .eq('is_active', true)
    .single()

  const season = activeSeason as Season | null

  // ── Fetch nomination counts (if active season) ────────────────────────────
  const { data: nominationCounts } = season
    ? await supabase
        .from('ff_nominations')
        .select('category_id, status')
        .eq('season_id', season.id)
    : { data: [] }

  interface NomRow { category_id: string; status: string }
  const nomRows = (nominationCounts ?? []) as NomRow[]

  // Aggregate: { categoryId: { total, pending, finalist, rejected } }
  const nomByCat: Record<string, { total: number; pending: number; finalist: number; rejected: number }> = {}
  nomRows.forEach(n => {
    if (!nomByCat[n.category_id]) nomByCat[n.category_id] = { total: 0, pending: 0, finalist: 0, rejected: 0 }
    nomByCat[n.category_id].total++
    if (n.status === 'pending')   nomByCat[n.category_id].pending++
    if (n.status === 'finalist')  nomByCat[n.category_id].finalist++
    if (n.status === 'rejected')  nomByCat[n.category_id].rejected++
  })

  // Totals
  const totalNominations = nomRows.length
  const pendingReview    = nomRows.filter(n => n.status === 'pending').length
  const finalistCount    = nomRows.filter(n => n.status === 'finalist').length

  // ── Fetch sponsor placements ─────────────────────────────────────────────
  const { data: sponsorPlacements } = season
    ? await supabase.from('ff_category_sponsors').select('id, tier, display_name, category_id, is_active').eq('season_id', season.id).eq('is_active', true)
    : { data: [] }
  const sponsors = (sponsorPlacements ?? []) as { id: string; tier: string; display_name: string; category_id: string | null; is_active: boolean }[]

  // ── Fetch past seasons for context ───────────────────────────────────────
  const { data: pastSeasons } = await supabase
    .from('ff_seasons')
    .select('id, year, name, status, is_active')
    .order('year', { ascending: false })
    .limit(5)

  const seasons = (pastSeasons ?? []) as Season[]

  const currentPhase   = (season?.status ?? 'planning') as FFPhase
  const phaseInfo      = PHASE_CONFIG[currentPhase]
  const totalCategories = FF_GROUPS.reduce((s, g) => s + g.categories.length, 0)
  const openSponsorPositions = totalCategories - sponsors.filter(s => s.category_id && s.tier === 'category').length

  // Upcoming phase deadline
  const nominationsClose = season?.nomination_closes_at ? daysUntil(season.nomination_closes_at, now) : null
  const votingCloses     = season?.voting_closes_at     ? daysUntil(season.voting_closes_at, now)     : null

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f4f5', fontFamily: 'system-ui, sans-serif', overflowY: 'auto' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>

        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 20 }}>⭐</span>
              <h1 style={{ fontSize: 22, fontWeight: 900, color: '#111827', margin: 0 }}>Family Favorites</h1>
              {season && (
                <span style={{ fontSize: 12, fontWeight: 700, color: phaseInfo.color, backgroundColor: `${phaseInfo.color}15`, padding: '2px 10px', borderRadius: 4, border: `1px solid ${phaseInfo.color}25` }}>
                  {phaseInfo.label}
                </span>
              )}
            </div>
            <p style={{ fontSize: 13, color: '#6b7280', margin: 0 }}>
              {season ? `${season.name} · ${totalCategories} categories · ${totalNominations} nominations` : 'Annual community recognition program · No active season'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link href="/admin/go/family-favorites" target="_blank" style={{ fontSize: 12, fontWeight: 600, color: '#374151', textDecoration: 'none', padding: '7px 14px', backgroundColor: '#fff', border: '1px solid #d1d5db', borderRadius: 6 }}>
              Public page →
            </Link>
            {!season && (
              <button style={{ fontSize: 12, fontWeight: 700, color: '#fff', padding: '7px 16px', backgroundColor: '#b8860b', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                + Create {new Date().getFullYear() + 1} Season
              </button>
            )}
          </div>
        </div>

        {/* ── NO SEASON STATE ─────────────────────────────────────────────── */}
        {!season && (
          <div style={{ backgroundColor: '#fff', border: '1.5px dashed #e5e7eb', borderRadius: 16, padding: '48px 32px', textAlign: 'center', marginBottom: 28 }}>
            <span style={{ fontSize: 40, display: 'block', marginBottom: 16 }}>⭐</span>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginBottom: 10 }}>Set Up Your First Family Favorites Season</h2>
            <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.7, maxWidth: 500, margin: '0 auto 24px' }}>
              Create a season to begin accepting nominations. The schema, categories, and framework are ready — you just need to activate the program.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button style={{ fontSize: 13, fontWeight: 700, color: '#fff', padding: '11px 24px', backgroundColor: '#b8860b', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
                Create {new Date().getFullYear() + 1} Season
              </button>
              <Link href="/admin/go/family-favorites" target="_blank" style={{ fontSize: 13, fontWeight: 600, color: '#374151', textDecoration: 'none', padding: '11px 24px', backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 8 }}>
                Preview public page →
              </Link>
            </div>
          </div>
        )}

        {/* ── ACTIVE SEASON OVERVIEW ───────────────────────────────────────── */}
        {season && (
          <>
            {/* Phase metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
              {[
                { label: 'Total Nominations', value: totalNominations,    dot: '#22c55e' },
                { label: 'Pending Review',    value: pendingReview,       dot: pendingReview > 0 ? '#f59e0b' : '#9ca3af' },
                { label: 'Finalists Named',   value: finalistCount,       dot: '#3b82f6' },
                { label: 'Categories',         value: totalCategories,     dot: '#374151' },
                { label: 'Sponsors',          value: sponsors.length,     dot: '#b8860b' },
                { label: 'Open Sponsor Spots',value: openSponsorPositions,dot: '#22c55e' },
              ].map(m => (
                <div key={m.label} style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 5 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: m.dot, display: 'inline-block' }} />
                    <span style={{ fontSize: 9, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.label}</span>
                  </div>
                  <p style={{ fontSize: 24, fontWeight: 900, color: '#111827', margin: 0 }}>{m.value}</p>
                </div>
              ))}
            </div>

            {/* Phase timeline + upcoming deadline */}
            <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '20px 24px', marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 800, color: '#111827', marginBottom: 4 }}>{season.name}</p>
                  <p style={{ fontSize: 12, color: '#9ca3af' }}>Phase: <strong style={{ color: phaseInfo.color }}>{phaseInfo.label}</strong></p>
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {nominationsClose !== null && nominationsClose > 0 && (
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>Nominations close</p>
                      <p style={{ fontSize: 14, fontWeight: 800, color: nominationsClose <= 7 ? '#ef4444' : '#374151', margin: 0 }}>{nominationsClose}d · {fmtDate(season.nomination_closes_at)}</p>
                    </div>
                  )}
                  {votingCloses !== null && votingCloses > 0 && (
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>Voting closes</p>
                      <p style={{ fontSize: 14, fontWeight: 800, color: votingCloses <= 7 ? '#ef4444' : '#374151', margin: 0 }}>{votingCloses}d · {fmtDate(season.voting_closes_at)}</p>
                    </div>
                  )}
                </div>
              </div>
              <PhaseTimeline currentPhase={currentPhase} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8, marginTop: 16, paddingTop: 14, borderTop: '1px solid #f3f4f6' }}>
                {[
                  { label: 'Nominations open',   val: season.nomination_opens_at },
                  { label: 'Nominations close',   val: season.nomination_closes_at },
                  { label: 'Finalists announced', val: season.finalist_announced_at },
                  { label: 'Voting opens',        val: season.voting_opens_at },
                  { label: 'Voting closes',       val: season.voting_closes_at },
                  { label: 'Winners announced',   val: season.winners_announced_at },
                  { label: 'Print issue',         val: season.print_issue_date },
                ].map(d => (
                  <div key={d.label}>
                    <p style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{d.label}</p>
                    <p style={{ fontSize: 12, fontWeight: 600, color: d.val ? '#374151' : '#d1d5db', margin: 0 }}>{fmtDate(d.val)}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── MAIN GRID ────────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 20, alignItems: 'start' }}>

          {/* LEFT: Category overview */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Category grid */}
            <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fafafa' }}>
                <p style={{ fontSize: 14, fontWeight: 800, color: '#111827', margin: 0 }}>Category Overview</p>
                <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>{totalCategories} categories · {FF_GROUPS.length} groups</p>
              </div>
              <div style={{ padding: '16px 20px' }}>
                {FF_GROUPS.map(group => (
                  <div key={group.slug} style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <span style={{ fontSize: 16 }}>{group.emoji}</span>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', margin: 0 }}>{group.name}</p>
                      <span style={{ fontSize: 11, color: '#9ca3af' }}>{group.categories.length} categories</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
                      {group.categories.map(cat => {
                        // For now, we don't have UUID category IDs synced — show placeholder counts
                        const nomData = { total: 0, pending: 0, finalist: 0 }
                        return (
                          <div key={cat.slug} style={{ padding: '10px 12px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                            <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', margin: '0 0 6px', lineHeight: 1.3 }}>{cat.name}</p>
                            {season ? (
                              <div style={{ display: 'flex', gap: 8 }}>
                                <span style={{ fontSize: 10, color: '#9ca3af' }}>{nomData.total} noms</span>
                                {nomData.finalist > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: '#3b82f6' }}>{nomData.finalist} finalists</span>}
                              </div>
                            ) : (
                              <span style={{ fontSize: 10, color: '#d1d5db' }}>No season active</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Annual calendar */}
            <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6', backgroundColor: '#fafafa' }}>
                <p style={{ fontSize: 14, fontWeight: 800, color: '#111827', margin: 0 }}>Annual Program Calendar</p>
              </div>
              <div style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {FF_ANNUAL_CALENDAR.map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '10px 14px', backgroundColor: '#f9fafb', border: '1px solid #f3f4f6', borderLeft: `3px solid ${item.color}`, borderRadius: 8 }}>
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', marginBottom: 4 }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', margin: 0 }}>{item.phase}</p>
                          <span style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af' }}>{item.months}</span>
                        </div>
                        <p style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.55, margin: 0 }}>{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Sidebar panels */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Quick actions */}
            <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px 18px' }}>
              <p style={{ fontSize: 12, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Quick Actions</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { label: season ? 'Review Nominations' : 'Create Season', desc: season ? `${pendingReview} pending review` : 'No active season', href: '#', color: pendingReview > 0 ? '#f59e0b' : '#374151' },
                  { label: 'Manage Categories',    desc: `${totalCategories} categories across ${FF_GROUPS.length} groups`, href: '#',               color: '#374151' },
                  { label: 'Sponsor Placements',   desc: `${sponsors.length} active · ${openSponsorPositions} open`,       href: '#',               color: '#b8860b' },
                  { label: 'View Public Page',     desc: 'See what families see',                                           href: '/family-favorites',target: '_blank' as const, color: '#374151' },
                  { label: 'Print Issue Prep',     desc: season?.print_issue_date ? fmtDate(season.print_issue_date) : 'Date not set', href: '#', color: '#374151' },
                ].map(a => (
                  <Link key={a.label} href={a.href} target={a.target} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8, textDecoration: 'none', gap: 10 }}>
                    <div>
                      <p style={{ fontSize: 12, fontWeight: 700, color: a.color, margin: 0 }}>{a.label}</p>
                      <p style={{ fontSize: 11, color: '#9ca3af', margin: '2px 0 0' }}>{a.desc}</p>
                    </div>
                    <span style={{ color: '#d1d5db', flexShrink: 0 }}>→</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Sponsor tier inventory */}
            <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px 18px' }}>
              <p style={{ fontSize: 12, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Sponsor Tier Inventory</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {FF_SPONSOR_TIERS.map(tier => {
                  const claimed = tier.tier === 'category'
                    ? sponsors.filter(s => s.tier === 'category' && s.category_id).length
                    : sponsors.filter(s => s.tier === tier.tier).length
                  const open = tier.inventory - claimed
                  return (
                    <div key={tier.tier} style={{ padding: '10px 12px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderLeft: `3px solid ${tier.color}`, borderRadius: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 5 }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: tier.color, margin: 0 }}>{tier.label}</p>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#15803d', backgroundColor: '#f0fdf4', padding: '1px 7px', borderRadius: 4 }}>{open} open</span>
                          {claimed > 0 && <span style={{ fontSize: 10, fontWeight: 600, color: '#374151', backgroundColor: '#f3f4f6', padding: '1px 7px', borderRadius: 4 }}>{claimed} claimed</span>}
                        </div>
                      </div>
                      <p style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.55, margin: 0 }}>{tier.what}</p>
                    </div>
                  )
                })}
              </div>
              <div style={{ marginTop: 12, padding: '10px 12px', backgroundColor: '#fefce8', border: '1px solid #fde047', borderRadius: 8 }}>
                <p style={{ fontSize: 12, color: '#854d0e', lineHeight: 1.55, margin: 0 }}>
                  <strong>Rule:</strong> Sponsors amplify the program — they never influence which businesses win. Winners are determined by community votes and editorial review only.
                </p>
              </div>
            </div>

            {/* Past seasons */}
            {seasons.length > 0 && (
              <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px 18px' }}>
                <p style={{ fontSize: 12, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Seasons</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {seasons.map(s => (
                    <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: s.is_active ? '#f0fdf4' : '#f9fafb', border: `1px solid ${s.is_active ? '#bbf7d0' : '#e5e7eb'}`, borderRadius: 6 }}>
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 600, color: '#374151', margin: 0 }}>{s.year} Season</p>
                        <p style={{ fontSize: 10, color: '#9ca3af', margin: '1px 0 0' }}>{PHASE_CONFIG[s.status as FFPhase]?.label ?? s.status}</p>
                      </div>
                      {s.is_active && <span style={{ fontSize: 9, fontWeight: 800, color: '#15803d', backgroundColor: '#dcfce7', padding: '2px 8px', borderRadius: 4 }}>ACTIVE</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Operator guidance */}
            <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '16px 18px' }}>
              <p style={{ fontSize: 12, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Program Guidance</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {!season && (
                  <div style={{ padding: '10px 12px', backgroundColor: '#fefce8', border: '1px solid #fde047', borderRadius: 8 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#854d0e', marginBottom: 4 }}>Suggested: Create {new Date().getFullYear() + 1} Season</p>
                    <p style={{ fontSize: 12, color: '#78350f', lineHeight: 1.55 }}>Sponsor recruitment begins September–October. Set up the season now to start offering category sponsor positions.</p>
                  </div>
                )}
                {season && pendingReview > 0 && (
                  <div style={{ padding: '10px 12px', backgroundColor: '#fefce8', border: '1px solid #fde047', borderRadius: 8 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#854d0e', marginBottom: 4 }}>{pendingReview} nominations need editorial review</p>
                    <p style={{ fontSize: 12, color: '#78350f', lineHeight: 1.55 }}>Review and deduplicate before the finalist announcement date.</p>
                  </div>
                )}
                {(month >= 9 && month <= 10) && (
                  <div style={{ padding: '10px 12px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#1e40af', marginBottom: 4 }}>Sponsor recruitment season</p>
                    <p style={{ fontSize: 12, color: '#1e3a8a', lineHeight: 1.55 }}>September–October is the window to offer category and ecosystem sponsor positions before nominations open.</p>
                  </div>
                )}
                <div style={{ padding: '10px 12px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                  <p style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.65 }}>
                    Family Favorites is a trust engine. Protect the integrity: sponsors amplify — they don&apos;t select. Winners are community-voted and editorially reviewed only.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
