// ── /admin/advertisers/proposals ─────────────────────────────────────────────
// Strategic proposal preparation context — NOT the proposal document system.
// That lives at /admin/proposals/ (manages the proposals table).
//
// This page is Jason's pre-proposal intelligence layer:
// - who needs a proposal written?
// - what guide/category fits their business?
// - who's already in their category (competitive context)?
// - what's the right tier to recommend?
// - what notes should go into the proposal?
//
// Filtered view: consultation → proposal → follow-up timing

import type { Metadata }  from 'next'
import Link               from 'next/link'
import { revalidatePath } from 'next/cache'
import { createClient }   from '@/lib/supabase/server'
import { GUIDE_CONFIGS }  from '@/app/partners/guide/configs'

export const metadata: Metadata = { title: 'Proposal Prep — Admin' }

// ── Segment → relevant guides mapping ────────────────────────────────────────
// Used to surface which guides are relevant given a business's ops_notes or
// package_tier context. Jason can refine per account.

const SEGMENT_GUIDES: Record<string, string[]> = {
  healthcare:       ['healthy-kids-guide',  'family-resource-guide'],
  childcare:        ['childcare-guide',     'family-resource-guide'],
  education:        ['private-school-guide','family-resource-guide', 'afterschool-guide'],
  'sports-rec':     ['family-resource-guide','summer-camp-guide',    'afterschool-guide'],
  wellness:         ['family-resource-guide','healthy-kids-guide'],
  retail:           ['family-resource-guide','birthday-party-guide', 'summer-fun-guide'],
  'home-services':  ['family-resource-guide'],
  food:             ['summer-fun-guide',    'family-resource-guide', 'birthday-party-guide'],
  photography:      ['family-resource-guide','birthday-party-guide'],
  'family-services':['family-resource-guide'],
  camps:            ['summer-camp-guide',   'family-resource-guide'],
  'after-school':   ['afterschool-guide',   'family-resource-guide'],
  'special-needs':  ['special-needs-guide', 'family-resource-guide'],
}

// Tier recommendation by intent signal (read from ops_notes or package_tier context)
const TIER_DESCRIPTIONS = {
  'Guide Partner':      { label: 'Guide Partner',      color: '#1e3a5f', what: 'Discovery listing — families can find and evaluate you.' },
  'Ecosystem Partner':  { label: 'Ecosystem Partner',  color: '#c4622d', what: 'Multi-surface presence — families know your name before they search.' },
  'Category Sponsor':   { label: 'Category Sponsor',   color: '#b8860b', what: '"Presented By" header — you own the category, no competitor above you.' },
}

// ── Server action: save proposal notes ───────────────────────────────────────

async function saveProposalNotes(formData: FormData) {
  'use server'
  const supabase  = await createClient()
  const accountId = formData.get('account_id') as string
  const notes     = formData.get('notes') as string
  await supabase
    .from('advertiser_accounts')
    .update({ proposal_notes: notes })
    .eq('id', accountId)
  revalidatePath('/admin/advertisers/proposals')
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface AccountRow {
  id:               string
  business_name:    string
  package_tier:     string | null
  loyalty_tier:     string
  lifecycle_stage:  string
  consultation_date:string | null
  last_contact_at:  string | null
  proposal_notes:   string | null
  ops_notes:        string | null
  contact_name:     string | null
  contact_phone:    string | null
  contact_email:    string | null
  upgrade_flagged_at: string | null
}

interface SponsorRow {
  id:                   string
  business_name:        string
  loyalty_tier:         string
  package_tier:         string | null
  sponsor_guide_slug:   string
  sponsor_category_slug:string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysSince(date: string | null, now: Date): number {
  if (!date) return 0
  return Math.floor((now.getTime() - new Date(date).getTime()) / (24 * 60 * 60 * 1000))
}

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function followUpUrgency(lastContact: string | null, now: Date): { label: string; color: string } {
  const days = daysSince(lastContact, now)
  if (!lastContact || days > 14) return { label: 'Overdue',        color: '#ef4444' }
  if (days > 7)                  return { label: `${days}d ago`,   color: '#f97316' }
  if (days > 3)                  return { label: `${days}d ago`,   color: '#eab308' }
  return                                { label: `${days}d ago`,   color: '#22c55e' }
}

// Infer which guides might be relevant for an account based on notes / tier
function inferGuides(acc: AccountRow): string[] {
  const text = ((acc.proposal_notes ?? '') + ' ' + (acc.ops_notes ?? '')).toLowerCase()
  for (const [segment, guides] of Object.entries(SEGMENT_GUIDES)) {
    if (text.includes(segment.replace(/-/g, ' ')) || text.includes(segment)) {
      return guides
    }
  }
  return ['family-resource-guide']
}

// ── Sub-component: account row ─────────────────────────────────────────────

function TierBadge({ tier, small = false }: { tier: string | null; small?: boolean }) {
  const n = (tier ?? '').toLowerCase()
  const color = n.includes('sponsor') ? '#b8860b' : n.includes('ecosystem') ? '#c4622d' : '#1e3a5f'
  const label = n.includes('sponsor') ? 'Cat. Sponsor' : n.includes('ecosystem') ? 'Ecosystem' : 'Guide Partner'
  return (
    <span style={{ fontSize: small ? 9 : 10, fontWeight: 700, padding: small ? '1px 6px' : '2px 9px', borderRadius: 10, backgroundColor: `${color}12`, color, border: `1px solid ${color}25` }}>
      {label}
    </span>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function ProposalsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; account?: string }>
}) {
  const params      = await searchParams
  const activeTab   = params.tab ?? 'consultation'
  const focusedId   = params.account ?? null

  const supabase = await createClient()
  const now      = new Date()

  // ── Fetch consultation + proposal stage accounts
  const { data: rawAccounts } = await supabase
    .from('advertiser_accounts')
    .select([
      'id', 'business_name', 'package_tier', 'loyalty_tier', 'lifecycle_stage',
      'consultation_date', 'last_contact_at', 'proposal_notes', 'ops_notes',
      'contact_name', 'contact_phone', 'contact_email', 'upgrade_flagged_at',
    ].join(', '))
    .in('lifecycle_stage', ['consultation', 'proposal'])
    .order('last_contact_at', { ascending: true, nullsFirst: true })

  const accounts = (rawAccounts ?? []) as unknown as AccountRow[]

  // ── Fetch existing sponsors for competitive context
  const { data: rawSponsors } = await supabase
    .from('advertiser_accounts')
    .select('id, business_name, loyalty_tier, package_tier, sponsor_guide_slug, sponsor_category_slug')
    .not('sponsor_category_slug', 'is', null)

  const sponsors = (rawSponsors ?? []) as SponsorRow[]

  // ── Fetch sent proposals for status context
  const { data: sentProposals } = await supabase
    .from('proposals')
    .select('id, business_name, status, sent_at, recommended_tier')
    .in('status', ['sent', 'viewed', 'accepted', 'declined'])
    .order('sent_at', { ascending: false })
    .limit(20)

  // Segment by lifecycle stage
  const consultations = accounts.filter(a => a.lifecycle_stage === 'consultation')
  const proposalOut   = accounts.filter(a => a.lifecycle_stage === 'proposal')

  // Focused account (for detail panel)
  const focused = focusedId ? accounts.find(a => a.id === focusedId) : (accounts[0] ?? null)
  const focusedGuides = focused ? inferGuides(focused) : []
  const focusedGuideConfigs = focusedGuides
    .map(slug => GUIDE_CONFIGS.find(g => g.slug === slug))
    .filter(Boolean)

  // Competitive context for focused account
  const competitorsByGuide = focusedGuides.reduce((map, guideSlug) => {
    const inGuide = sponsors.filter(s => s.sponsor_guide_slug === guideSlug)
    if (inGuide.length > 0) map[guideSlug] = inGuide
    return map
  }, {} as Record<string, SponsorRow[]>)

  // Open categories in relevant guides
  const openCategories = focusedGuideConfigs.flatMap(guide => {
    if (!guide) return []
    return guide.categories
      .filter(cat => !sponsors.some(s => s.sponsor_guide_slug === guide.slug && s.sponsor_category_slug === cat.slug))
      .map(cat => ({ guideName: guide.shortName, guideSlug: guide.slug, guideEmoji: guide.emoji, catName: cat.name, catSlug: cat.slug }))
  })

  // Tab accounts
  const tabAccounts = activeTab === 'consultation' ? consultations : proposalOut

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f4f5', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 1300, margin: '0 auto', padding: '24px' }}>

        {/* ── HEADER ──────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
              <Link href="/admin/advertisers" style={{ fontSize: 12, color: '#6b7280', textDecoration: 'none' }}>← Advertisers</Link>
              <span style={{ color: '#d1d5db' }}>›</span>
              <span style={{ fontSize: 12, color: '#374151' }}>Proposal Prep</span>
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: '#111827', margin: 0 }}>Proposal Preparation</h1>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>
              Strategic context for consultations and proposals — not the proposal document system
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href="/admin/proposals" style={{ fontSize: 12, fontWeight: 600, color: '#374151', textDecoration: 'none', padding: '7px 14px', backgroundColor: '#fff', border: '1px solid #d1d5db', borderRadius: 6 }}>
              Proposal Documents →
            </Link>
            <Link href="/admin/proposals/new" style={{ fontSize: 12, fontWeight: 700, color: '#fff', textDecoration: 'none', padding: '7px 14px', backgroundColor: '#1e3a5f', borderRadius: 6 }}>
              + New Proposal
            </Link>
          </div>
        </div>

        {/* ── STATS ───────────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'In Consultation', value: consultations.length, dot: '#3b82f6' },
            { label: 'Proposals Out',   value: proposalOut.length,   dot: '#eab308' },
            { label: 'Overdue Follow-up',
              value: accounts.filter(a => daysSince(a.last_contact_at, now) > 14).length, dot: '#ef4444' },
            { label: 'Sent (All Time)', value: sentProposals?.length ?? 0, dot: '#22c55e' },
          ].map(m => (
            <div key={m.label} style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: m.dot, display: 'inline-block' }} />
                <span style={{ fontSize: 10, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.label}</span>
              </div>
              <p style={{ fontSize: 24, fontWeight: 900, color: '#111827', margin: 0 }}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* ── TWO-COLUMN LAYOUT ───────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 20, alignItems: 'start' }}>

          {/* LEFT: Pipeline list */}
          <div>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: 0, marginBottom: 12, backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 4 }}>
              {[
                { key: 'consultation', label: `Consultation (${consultations.length})` },
                { key: 'proposal',     label: `Proposals Out (${proposalOut.length})` },
              ].map(t => (
                <Link
                  key={t.key}
                  href={`/admin/advertisers/proposals?tab=${t.key}${focusedId ? `&account=${focusedId}` : ''}`}
                  style={{
                    flex: 1, textAlign: 'center', padding: '7px 12px', borderRadius: 6, textDecoration: 'none',
                    fontSize: 12, fontWeight: 700,
                    backgroundColor: activeTab === t.key ? '#1e3a5f' : 'transparent',
                    color:           activeTab === t.key ? '#fff' : '#6b7280',
                  }}
                >
                  {t.label}
                </Link>
              ))}
            </div>

            {/* Account list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {tabAccounts.length === 0 ? (
                <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '24px', textAlign: 'center' }}>
                  <p style={{ fontSize: 13, color: '#9ca3af' }}>
                    {activeTab === 'consultation' ? 'No accounts in consultation.' : 'No proposals currently out.'}
                  </p>
                </div>
              ) : (
                tabAccounts.map(acc => {
                  const fu = followUpUrgency(acc.last_contact_at, now)
                  const isFocused = focused?.id === acc.id
                  return (
                    <Link
                      key={acc.id}
                      href={`/admin/advertisers/proposals?tab=${activeTab}&account=${acc.id}`}
                      style={{
                        display: 'block', textDecoration: 'none',
                        backgroundColor: '#fff',
                        border: `1.5px solid ${isFocused ? '#1e3a5f' : '#e5e7eb'}`,
                        borderRadius: 10, padding: '12px 14px',
                        boxShadow: isFocused ? '0 0 0 2px rgba(30,58,95,0.12)' : 'none',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0, lineHeight: 1.3 }}>{acc.business_name}</p>
                        <TierBadge tier={acc.package_tier} small />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {acc.contact_name && <span style={{ fontSize: 11, color: '#9ca3af' }}>{acc.contact_name}</span>}
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: fu.color }}>
                          {activeTab === 'proposal' ? 'Sent ' : 'Last: '}
                          {fu.label}
                        </span>
                      </div>
                      {acc.proposal_notes && (
                        <p style={{ fontSize: 11, color: '#6b7280', marginTop: 6, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                          {acc.proposal_notes}
                        </p>
                      )}
                    </Link>
                  )
                })
              )}
            </div>

            {/* Recent proposals from proposals table */}
            {sentProposals && sentProposals.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Recent Sent Proposals</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {sentProposals.slice(0, 6).map(p => (
                    <Link key={p.id} href={`/admin/proposals/${p.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, textDecoration: 'none', gap: 8 }}>
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 600, color: '#111827', margin: '0 0 2px' }}>{p.business_name}</p>
                        {p.sent_at && <p style={{ fontSize: 10, color: '#9ca3af', margin: 0 }}>Sent {fmtDate(p.sent_at)}</p>}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                        <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 4, textTransform: 'uppercase',
                          backgroundColor: p.status === 'accepted' ? '#f0fdf4' : p.status === 'viewed' ? '#fefce8' : p.status === 'declined' ? '#fef2f2' : '#eff6ff',
                          color:           p.status === 'accepted' ? '#15803d' : p.status === 'viewed' ? '#854d0e' : p.status === 'declined' ? '#991b1b' : '#1e40af',
                        }}>
                          {p.status}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Strategic context panel */}
          {focused ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Account header */}
              <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '20px 22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 900, color: '#111827', margin: '0 0 6px' }}>{focused.business_name}</h2>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <TierBadge tier={focused.package_tier} />
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 10, backgroundColor: focused.lifecycle_stage === 'proposal' ? '#fefce8' : '#eff6ff', color: focused.lifecycle_stage === 'proposal' ? '#854d0e' : '#1e40af' }}>
                        {focused.lifecycle_stage}
                      </span>
                      {focused.upgrade_flagged_at && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 9px', borderRadius: 10, backgroundColor: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' }}>
                          ↑ Upgrade Ready
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 2px' }}>{focused.contact_name ?? '—'}</p>
                    {focused.contact_phone && <p style={{ fontSize: 12, color: '#374151', fontWeight: 600, margin: '0 0 2px' }}>{focused.contact_phone}</p>}
                    {focused.contact_email && <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>{focused.contact_email}</p>}
                  </div>
                </div>

                {/* Follow-up timing */}
                {(() => {
                  const fu = followUpUrgency(focused.last_contact_at, now)
                  return (
                    <div style={{ display: 'flex', gap: 16, padding: '10px 14px', backgroundColor: '#f9fafb', borderRadius: 8, flexWrap: 'wrap' }}>
                      <div>
                        <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Last Contact</p>
                        <p style={{ fontSize: 13, fontWeight: 700, color: fu.color, margin: 0 }}>{fu.label}</p>
                      </div>
                      {focused.consultation_date && (
                        <div>
                          <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Strategy Call</p>
                          <p style={{ fontSize: 13, fontWeight: 700, color: '#374151', margin: 0 }}>{fmtDate(focused.consultation_date)}</p>
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>

              {/* Tier recommendation */}
              <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '20px 22px' }}>
                <p style={{ fontSize: 12, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Tier Recommendation</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {Object.values(TIER_DESCRIPTIONS).map(t => (
                    <div key={t.label} style={{ padding: '12px 14px', backgroundColor: '#f9fafb', border: `1.5px solid ${t.color}20`, borderRadius: 8, borderTop: `3px solid ${t.color}` }}>
                      <p style={{ fontSize: 11, fontWeight: 800, color: t.color, marginBottom: 6 }}>{t.label}</p>
                      <p style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.55 }}>{t.what}</p>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 12, padding: '10px 14px', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8 }}>
                  <p style={{ fontSize: 12, color: '#1e40af', margin: 0 }}>
                    <strong>Rule:</strong> New advertisers start at Guide Partner. Sponsor positions only offered after 6+ months active or 12+ months print history. Never a first-proposal offer.
                  </p>
                </div>
              </div>

              {/* Guide context */}
              {focusedGuideConfigs.length > 0 && (
                <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '20px 22px' }}>
                  <p style={{ fontSize: 12, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Relevant Guides</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {focusedGuideConfigs.map(guide => {
                      if (!guide) return null
                      const inGuideSponsors = competitorsByGuide[guide.slug] ?? []
                      return (
                        <div key={guide.slug} style={{ padding: '12px 14px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 16 }}>{guide.emoji}</span>
                              <p style={{ fontSize: 13, fontWeight: 700, color: '#111827', margin: 0 }}>{guide.name}</p>
                            </div>
                            <Link href={`/partners/guide/${guide.slug}`} target="_blank" style={{ fontSize: 11, color: '#6b7280', textDecoration: 'none' }}>
                              View page →
                            </Link>
                          </div>
                          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 11, color: '#374151', backgroundColor: '#f0fdf4', padding: '2px 9px', borderRadius: 4, border: '1px solid #bbf7d0' }}>
                              {guide.categories.filter(c => !sponsors.some(s => s.sponsor_guide_slug === guide.slug && s.sponsor_category_slug === c.slug)).length} open positions
                            </span>
                            {inGuideSponsors.length > 0 && (
                              <span style={{ fontSize: 11, color: '#854d0e', backgroundColor: '#fefce8', padding: '2px 9px', borderRadius: 4, border: '1px solid #fde047' }}>
                                {inGuideSponsors.length} category sponsor{inGuideSponsors.length !== 1 ? 's' : ''} already claimed
                              </span>
                            )}
                          </div>
                          {inGuideSponsors.length > 0 && (
                            <div style={{ marginTop: 8 }}>
                              <p style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Competitors in guide</p>
                              {inGuideSponsors.map(sp => (
                                <div key={sp.id} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
                                  <span style={{ fontSize: 12, color: '#374151' }}>{sp.business_name}</span>
                                  <span style={{ fontSize: 10, color: '#6b7280' }}>— {sp.sponsor_category_slug?.replace(/-/g, ' ')}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Open category positions */}
              {openCategories.length > 0 && (
                <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '20px 22px' }}>
                  <p style={{ fontSize: 12, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>Open Sponsor Positions — Relevant Guides</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {openCategories.slice(0, 12).map(op => (
                      <div key={`${op.guideSlug}-${op.catSlug}`} style={{ padding: '5px 12px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6 }}>
                        <span style={{ fontSize: 10, fontWeight: 600, color: '#15803d' }}>{op.guideEmoji} {op.catName}</span>
                      </div>
                    ))}
                    {openCategories.length > 12 && (
                      <span style={{ fontSize: 11, color: '#9ca3af', alignSelf: 'center' }}>+{openCategories.length - 12} more</span>
                    )}
                  </div>
                </div>
              )}

              {/* Proposal notes */}
              <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '20px 22px' }}>
                <p style={{ fontSize: 12, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
                  Proposal Strategy Notes <span style={{ fontWeight: 400, color: '#d1d5db' }}>· private</span>
                </p>
                <form action={saveProposalNotes} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <input type="hidden" name="account_id" value={focused.id} />
                  <textarea
                    name="notes"
                    defaultValue={focused.proposal_notes ?? ''}
                    rows={5}
                    placeholder="What did you learn on the call? What tier makes sense? Any competitive context? Objections to address?"
                    style={{ width: '100%', fontSize: 13, lineHeight: 1.6, padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, resize: 'vertical', fontFamily: 'inherit', color: '#374151', boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center' }}>
                    <Link
                      href={`/admin/proposals/new?name=${encodeURIComponent(focused.business_name)}&email=${encodeURIComponent(focused.contact_email ?? '')}`}
                      style={{ fontSize: 13, fontWeight: 700, color: '#fff', textDecoration: 'none', padding: '9px 20px', backgroundColor: '#c4622d', borderRadius: 8 }}
                    >
                      Create Proposal Document →
                    </Link>
                    <button type="submit" style={{ fontSize: 12, fontWeight: 600, color: '#374151', padding: '9px 16px', backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 8, cursor: 'pointer' }}>
                      Save Notes
                    </button>
                  </div>
                </form>
              </div>

            </div>
          ) : (
            <div style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '48px 24px', textAlign: 'center' }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#6b7280', marginBottom: 8 }}>Select an account</p>
              <p style={{ fontSize: 13, color: '#9ca3af' }}>Click any account from the list to see strategic context and proposal tools.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
