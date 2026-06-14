// ── /partners/[slug]/performance ──────────────────────────────────────────────
// Partner Performance Report — trustworthy, honest, partner-facing.
//
// TRANSPARENCY POLICY:
//   Every metric on this page is labeled as one of:
//     Measured  — tracked in our database, accurate
//     Estimated — reasonable approximation, labeled as such
//     Not tracked — honestly acknowledged gap
//
//   We do NOT fake impressions, invent conversions, or overstate visibility.
//   If a metric is not available, we say so clearly.

import type { Metadata }    from 'next'
import Link                  from 'next/link'
import { redirect }          from 'next/navigation'
import { createClient }      from '@supabase/supabase-js'
import { cookies }           from 'next/headers'
import { GUIDE_CONFIGS }     from '@/app/partners/guide/configs'

export const metadata: Metadata = { title: 'Performance Report — Partner Portal' }

// ── Supabase admin (service role for cross-table reads) ───────────────────────

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  )
}

// ── Static reference data ────────────────────────────────────────────────────

// Print circulation estimates — clearly labeled as estimated, not measured.
// Updated by editorial ops when print run numbers change.
const PRINT_CIRCULATION: Record<string, { est: number; label: string }> = {
  rrp:  { est: 15000, label: 'River Region Parents' },
  mbp:  { est: 8000,  label: 'Mobile Bay Parents'   },
  aop:  { est: 5000,  label: 'Auburn Opelika Parents'},
  esp:  { est: 6000,  label: 'Eastern Shore Parents' },
  gpp:  { est: 7500,  label: 'Greater Pensacola Parents' },
  boom: { est: 5000,  label: 'River Region Boom'    },
}

const TIER_LABELS: Record<string, { label: string; color: string }> = {
  free:     { label: 'Free Listing',      color: '#6b7280' },
  enhanced: { label: 'Enhanced Listing',  color: '#2563eb' },
  featured: { label: 'Featured Listing',  color: '#7c3aed' },
}

const PACKAGE_LABELS: Record<string, string> = {
  'guide-partner':      'Guide Partner',
  'ecosystem-partner':  'Ecosystem Partner',
  'category-sponsor':   'Category Sponsor',
}

// ── Trust badge component ──────────────────────────────────────────────────────

function TrustBadge({ type }: { type: 'measured' | 'estimated' | 'unavailable' }) {
  if (type === 'measured')    return <span style={{ fontSize: 10, backgroundColor: '#dcfce7', color: '#15803d', padding: '2px 7px', borderRadius: 4, fontWeight: 700, whiteSpace: 'nowrap' }}>Measured</span>
  if (type === 'estimated')   return <span style={{ fontSize: 10, backgroundColor: '#fef9c3', color: '#92400e', padding: '2px 7px', borderRadius: 4, fontWeight: 700, whiteSpace: 'nowrap' }}>Estimated</span>
  return <span style={{ fontSize: 10, backgroundColor: '#f3f4f6', color: '#6b7280', padding: '2px 7px', borderRadius: 4, fontWeight: 700, whiteSpace: 'nowrap' }}>Not tracked yet</span>
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function guideName(slug: string): string {
  return GUIDE_CONFIGS.find(g => g.slug === slug)?.name
    ?? slug.split('-').map(w => w[0]?.toUpperCase() + w.slice(1)).join(' ')
}

function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000)
}

// ── Page ──────────────────────────────────────────────────────────────────────

interface Props {
  params:      Promise<{ slug: string }>
  searchParams:Promise<{ token?: string }>
}

export default async function PerformancePage({ params, searchParams }: Props) {
  const { slug }  = await params
  const { token } = await searchParams
  const supabase  = supabaseAdmin()
  const cookieStore = await cookies()

  // ── Auth (mirrors /partners/[slug]/admin auth) ────────────────────────────

  let advertiserId: string | null = null

  if (token) {
    const { data: authToken } = await supabase
      .from('partner_auth_tokens')
      .select('advertiser_id, expires_at')
      .eq('token', token)
      .maybeSingle()

    if (authToken && new Date(authToken.expires_at) > new Date()) {
      advertiserId = authToken.advertiser_id
    }
  } else {
    advertiserId = cookieStore.get(`partner_session_${slug}`)?.value ?? null
  }

  if (!advertiserId) {
    redirect(`/partners/${slug}/login`)
  }

  // ── Fetch account first, then parallel data queries ───────────────────────

  const { data: account } = await supabase
    .from('advertiser_accounts')
    .select('id, business_name, slug, package_tier, lifecycle_stage, loyalty_tier, contact_name, contact_phone, contact_email, sponsor_category_slug, sponsor_guide_slug, contract_start_date, contract_end_date, upgrade_flagged_at, at_risk_flagged_at, listing_id')
    .eq('id', advertiserId)
    .maybeSingle()

  if (!account || account.slug !== slug) {
    redirect(`/partners/${slug}/login`)
  }

  // Parallel data fetches
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString()
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString()

  const [
    { data: rawListings },
    { data: rawPlacements },
    { data: rawLeads },
    { data: rawLeads30d },
    { data: rawAssets },
    { count: subCount },
    { data: rawMentions },
  ] = await Promise.all([
    // Guide listings
    supabase
      .from('guide_listings')
      .select('id, slug, guide_type_slug, category, listing_tier, click_count_phone, click_count_website, is_active, business_name')
      .eq('advertiser_account_id', advertiserId),
    // Active ad placements
    supabase
      .from('ad_placements')
      .select('id, placement_type, context_type, context_slug, impression_count, click_count, starts_at, ends_at, is_active, ad_headline')
      .eq('advertiser_id', advertiserId)
      .order('impression_count', { ascending: false }),
    // All leads (for conversion rate)
    supabase
      .from('partner_leads')
      .select('id, created_at, partner_marked_converted, partner_last_action_at')
      .eq('advertiser_id', advertiserId)
      .order('created_at', { ascending: false })
      .limit(200),
    // Last 30 days leads
    supabase
      .from('partner_leads')
      .select('id, created_at, partner_marked_converted')
      .eq('advertiser_id', advertiserId)
      .gte('created_at', thirtyDaysAgo),
    // Media assets
    supabase
      .from('media_assets')
      .select('id, asset_type, status, alt_text, permission_confirmed, content_category, created_at')
      .eq('linked_advertiser_id', advertiserId),
    // Newsletter audience (total active subs — full list for context)
    supabase
      .from('newsletter_subscribers')
      .select('id', { count: 'exact', head: true })
      .eq('is_subscribed', true),
    // Editorial mentions (approximate — by business name match)
    supabase
      .from('community_submissions')
      .select('id, submission_type, working_title, status, social_promoted_at, newsletter_include, homepage_feature, created_at')
      .eq('related_business_name', account.business_name)
      .in('status', ['published', 'approved', 'scheduled'])
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  // ── Type casts & safe defaults ────────────────────────────────────────────

  type Listing     = { id: string; slug: string; guide_type_slug: string | null; category: string | null; listing_tier: string | null; click_count_phone: number; click_count_website: number; is_active: boolean; business_name: string }
  type Placement   = { id: string; placement_type: string; context_type: string | null; context_slug: string | null; impression_count: number; click_count: number; starts_at: string; ends_at: string | null; is_active: boolean; ad_headline: string | null }
  type Lead        = { id: string; created_at: string; partner_marked_converted: boolean | null; partner_last_action_at: string | null }
  type Asset       = { id: string; asset_type: string; status: string; alt_text: string | null; permission_confirmed: boolean; content_category: string | null; created_at: string }
  type Mention     = { id: string; submission_type: string; working_title: string | null; status: string; social_promoted_at: string | null; newsletter_include: boolean; homepage_feature: boolean; created_at: string }

  const listings   = (rawListings   ?? []) as Listing[]
  const placements = (rawPlacements ?? []) as Placement[]
  const allLeads   = (rawLeads      ?? []) as Lead[]
  const leads30d   = (rawLeads30d   ?? []) as Lead[]
  const assets     = (rawAssets     ?? []) as Asset[]
  const mentions   = (rawMentions   ?? []) as Mention[]
  const totalSubs  = subCount ?? 0

  // ── Computed metrics ──────────────────────────────────────────────────────

  const totalPhoneClicks   = listings.reduce((s, l) => s + (l.click_count_phone   ?? 0), 0)
  const totalWebClicks     = listings.reduce((s, l) => s + (l.click_count_website ?? 0), 0)
  const totalEngagements   = totalPhoneClicks + totalWebClicks

  const activePlacements   = placements.filter(p => p.is_active)
  const totalImpressions   = activePlacements.reduce((s, p) => s + (p.impression_count ?? 0), 0)
  const totalAdClicks      = activePlacements.reduce((s, p) => s + (p.click_count ?? 0), 0)
  const ctr                = totalImpressions > 0 ? ((totalAdClicks / totalImpressions) * 100).toFixed(1) : '—'

  const allTimeLeads       = allLeads.length
  const leads30dCount      = leads30d.length
  const convertedLeads     = allLeads.filter(l => l.partner_marked_converted).length
  const conversionRate     = allTimeLeads > 0 ? Math.round((convertedLeads / allTimeLeads) * 100) : 0

  const activeListings     = listings.filter(l => l.is_active)
  const newsletterMentions = mentions.filter(m => m.newsletter_include).length
  const socialPromotions   = mentions.filter(m => !!m.social_promoted_at).length
  const homepageFeatures   = mentions.filter(m => m.homepage_feature).length

  // Asset health checks
  const hasLogo         = assets.some(a => a.asset_type === 'logo')
  const hasPhotos       = assets.some(a => a.asset_type === 'photo')
  const hasActivePlacement = activePlacements.length > 0
  const hasWebsite      = !!account.contact_phone  // use contact_phone as proxy
  const recentPromotion = mentions.some(m => m.social_promoted_at && daysSince(m.social_promoted_at) < 90)
  const hasSponsorCat   = !!account.sponsor_category_slug

  // ── Recommended actions (honest, data-driven, non-manipulative) ────────────

  interface Recommendation { icon: string; text: string; priority: 'high' | 'medium' | 'low' }
  const recommendations: Recommendation[] = []

  if (!hasPhotos) {
    recommendations.push({ icon: '📷', priority: 'high', text: 'Add photos to your guide listing. Listings with images consistently receive more clicks from families browsing the guide.' })
  }
  if (!hasLogo) {
    recommendations.push({ icon: '🏷️', priority: 'high', text: 'Upload your business logo. Logos appear in search results and editorial mentions, building recognition across the platform.' })
  }
  if (totalEngagements > 10 && !hasActivePlacement) {
    recommendations.push({ icon: '⬆️', priority: 'medium', text: `Your listing has generated ${totalEngagements} clicks — families are finding you. A featured placement could amplify this visibility significantly.` })
  }
  if (totalWebClicks > 5 && newsletterMentions === 0) {
    recommendations.push({ icon: '📧', priority: 'medium', text: 'Your listing is getting website clicks, but you haven\'t been included in recent newsletter issues. Ask your representative about newsletter inclusion.' })
  }
  if (!recentPromotion && mentions.length === 0) {
    recommendations.push({ icon: '📱', priority: 'low', text: 'No recent social promotions on file. Ask your representative if there are upcoming editorial features your business might qualify for.' })
  }
  if (leads30dCount === 0 && allTimeLeads > 0) {
    recommendations.push({ icon: '📊', priority: 'low', text: 'Lead activity has been quiet this month. Consider updating your offer to re-engage families browsing your profile.' })
  }

  // ── Report date context ───────────────────────────────────────────────────

  const reportDate   = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  const packageLabel = PACKAGE_LABELS[account.package_tier ?? ''] ?? account.package_tier ?? 'Partner'
  const loyaltyLabel = account.loyalty_tier ? account.loyalty_tier.charAt(0).toUpperCase() + account.loyalty_tier.slice(1) : null

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#faf8f5', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div style={{ backgroundColor: '#1a2744', padding: '28px 24px 32px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          {/* Back nav */}
          <Link href={`/partners/${slug}/admin`}
            style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', textDecoration: 'none', display: 'inline-block', marginBottom: 20 }}>
            ← Dashboard
          </Link>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>
                Performance Report · {reportDate}
              </p>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: 'white', margin: 0, letterSpacing: '-0.02em' }}>
                {account.business_name}
              </h1>
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                {account.package_tier && (
                  <span style={{ fontSize: 11, backgroundColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)', padding: '4px 10px', borderRadius: 20, fontWeight: 600 }}>
                    {packageLabel}
                  </span>
                )}
                {loyaltyLabel && loyaltyLabel !== 'Bronze' && (
                  <span style={{ fontSize: 11, backgroundColor: 'rgba(196,98,45,0.3)', color: '#f4a87a', padding: '4px 10px', borderRadius: 20, fontWeight: 700 }}>
                    {loyaltyLabel} Partner
                  </span>
                )}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>Partner since</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.8)' }}>
                {account.contract_start_date
                  ? new Date(account.contract_start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                  : '—'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px' }}>

        {/* ── By the Numbers ──────────────────────────────────────────── */}
        <section style={{ marginBottom: 36 }}>
          <SectionHeading title="By the Numbers" subtitle="What we've measured so far" />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginTop: 16 }}>
            {[
              {
                value:    totalPhoneClicks,
                label:    'Phone Clicks',
                sub:      'Taps on your phone number',
                trust:    'measured' as const,
                color:    '#16a34a',
                noZero:   false,
              },
              {
                value:    totalWebClicks,
                label:    'Website Clicks',
                sub:      'Clicks through to your site',
                trust:    'measured' as const,
                color:    '#2563eb',
                noZero:   false,
              },
              {
                value:    allTimeLeads,
                label:    'Profile Leads',
                sub:      leads30dCount > 0 ? `${leads30dCount} in last 30 days` : 'All time',
                trust:    'measured' as const,
                color:    '#7c3aed',
                noZero:   false,
              },
              {
                value:    activePlacements.length > 0 ? totalImpressions.toLocaleString() : '—',
                label:    'Ad Impressions',
                sub:      activePlacements.length > 0 ? `${ctr}% click rate` : 'No active placements',
                trust:    activePlacements.length > 0 ? 'measured' as const : 'unavailable' as const,
                color:    '#ef6442',
                noZero:   false,
              },
            ].map(({ value, label, sub, trust, color }) => (
              <div key={label} style={{ backgroundColor: 'white', borderRadius: 14, padding: '18px 20px', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <TrustBadge type={trust} />
                </div>
                <p style={{ fontSize: 30, fontWeight: 800, color, margin: 0, lineHeight: 1 }}>{value}</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#1a2744', marginTop: 6, marginBottom: 2 }}>{label}</p>
                <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{sub}</p>
              </div>
            ))}
          </div>

          {/* Conversion note */}
          {allTimeLeads > 0 && (
            <div style={{ backgroundColor: 'white', borderRadius: 14, padding: '16px 20px', border: '1px solid rgba(0,0,0,0.07)', marginTop: 12, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#1a2744', margin: 0 }}>Lead Conversion</p>
                  <TrustBadge type="measured" />
                </div>
                <p style={{ fontSize: 12, color: '#6b7280', margin: 0 }}>
                  {convertedLeads} of {allTimeLeads} leads marked as converted ({conversionRate}%) — as reported by your team.
                </p>
              </div>
              <p style={{ fontSize: 28, fontWeight: 800, color: '#16a34a', margin: 0 }}>{conversionRate}%</p>
            </div>
          )}
        </section>

        {/* ── Visibility Footprint ─────────────────────────────────────── */}
        <section style={{ marginBottom: 36 }}>
          <SectionHeading title="Where You Appear" subtitle="Your current visibility across the ecosystem" />

          <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>

            {/* Guide presence */}
            {activeListings.length > 0 && (
              <div style={{ backgroundColor: 'white', borderRadius: 14, padding: '18px 20px', border: '1px solid rgba(0,0,0,0.07)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#1a2744', margin: 0 }}>
                    📖 Guide Listings ({activeListings.length})
                  </p>
                  <TrustBadge type="measured" />
                </div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {activeListings.map(listing => {
                    const tier     = TIER_LABELS[listing.listing_tier ?? 'free']
                    const guide    = listing.guide_type_slug ? guideName(listing.guide_type_slug) : 'Guide'
                    const totalClicks = (listing.click_count_phone ?? 0) + (listing.click_count_website ?? 0)
                    return (
                      <div key={listing.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', backgroundColor: '#f9fafb', borderRadius: 10 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: '#1a2744', margin: '0 0 2px' }}>{guide}</p>
                          {listing.category && <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>{listing.category}</p>}
                        </div>
                        <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 6, fontWeight: 700, backgroundColor: tier.color + '18', color: tier.color, whiteSpace: 'nowrap' }}>
                          {tier.label}
                        </span>
                        {totalClicks > 0 && (
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', whiteSpace: 'nowrap' }}>
                            {totalClicks} click{totalClicks !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Active placements */}
            {activePlacements.length > 0 && (
              <div style={{ backgroundColor: 'white', borderRadius: 14, padding: '18px 20px', border: '1px solid rgba(0,0,0,0.07)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#1a2744', margin: 0 }}>
                    📣 Active Placements ({activePlacements.length})
                  </p>
                  <TrustBadge type="measured" />
                </div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {activePlacements.map(p => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', backgroundColor: '#f9fafb', borderRadius: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: '#374151', margin: '0 0 1px' }}>
                          {p.ad_headline ?? p.placement_type}
                        </p>
                        <p style={{ fontSize: 11, color: '#9ca3af', margin: 0, textTransform: 'capitalize' }}>
                          {p.placement_type.replace(/-/g, ' ')}{p.context_slug ? ` · ${p.context_slug}` : ''}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap' }}>
                        <p style={{ margin: 0, fontWeight: 700, color: '#374151' }}>{p.impression_count.toLocaleString()} views</p>
                        <p style={{ margin: 0 }}>{p.click_count} clicks</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Newsletter audience + editorial */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              {/* Newsletter audience */}
              <div style={{ backgroundColor: 'white', borderRadius: 14, padding: '18px 20px', border: '1px solid rgba(0,0,0,0.07)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Newsletter</p>
                  <TrustBadge type="measured" />
                </div>
                <p style={{ fontSize: 26, fontWeight: 800, color: '#7c3aed', margin: '0 0 4px' }}>{totalSubs.toLocaleString()}</p>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#1a2744', margin: '0 0 4px' }}>Subscribers</p>
                <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>Active newsletter readers. Includes your publication and all markets.</p>
                {newsletterMentions > 0 && (
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#16a34a', marginTop: 8 }}>
                    ✓ Included in {newsletterMentions} recent issue{newsletterMentions !== 1 ? 's' : ''}
                  </p>
                )}
              </div>

              {/* Social & Homepage */}
              <div style={{ backgroundColor: 'white', borderRadius: 14, padding: '18px 20px', border: '1px solid rgba(0,0,0,0.07)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Editorial</p>
                  <TrustBadge type="measured" />
                </div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {[
                    { label: 'Social promotions',  val: socialPromotions,  icon: '📱' },
                    { label: 'Homepage features',  val: homepageFeatures,  icon: '🏠' },
                    { label: 'Newsletter inclusions', val: newsletterMentions, icon: '📧' },
                  ].map(({ label, val, icon }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 16 }}>{icon}</span>
                      <span style={{ fontSize: 12, color: '#374151', flex: 1 }}>{label}</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: val > 0 ? '#16a34a' : '#9ca3af' }}>{val}</span>
                    </div>
                  ))}
                </div>
                {mentions.length === 0 && (
                  <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 8, margin: '8px 0 0' }}>
                    No editorial mentions found. Content is matched by business name.
                  </p>
                )}
              </div>
            </div>

            {/* Sponsor presence if applicable */}
            {hasSponsorCat && (
              <div style={{ backgroundColor: '#f5f3ff', borderRadius: 14, padding: '16px 20px', border: '1px solid #ede9fe' }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#5b21b6', margin: '0 0 4px' }}>
                  🏆 Sponsor Presence
                </p>
                <p style={{ fontSize: 12, color: '#6d28d9', margin: 0 }}>
                  You are listed as a sponsor in the{' '}
                  <strong>{account.sponsor_category_slug?.replace(/-/g, ' ')}</strong> category.
                  {account.sponsor_guide_slug && ` Your sponsorship is also associated with the ${guideName(account.sponsor_guide_slug)}.`}
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ── Partner Health ───────────────────────────────────────────── */}
        <section style={{ marginBottom: 36 }}>
          <SectionHeading title="Profile Completeness" subtitle="What strengthens your presence" />

          <div style={{ marginTop: 16, backgroundColor: 'white', borderRadius: 14, padding: '20px', border: '1px solid rgba(0,0,0,0.07)' }}>
            <div style={{ display: 'grid', gap: 12 }}>
              {[
                { label: 'Logo uploaded',            ok: hasLogo,            fix: 'Upload your business logo via your account rep.',       icon: '🏷️' },
                { label: 'Photos in guide listing',  ok: hasPhotos,          fix: 'Add photos — listings with images get more attention.', icon: '📷' },
                { label: 'Phone number on file',     ok: !!account.contact_phone, fix: 'Add a contact phone number to your account.',       icon: '📞' },
                { label: 'Email address on file',    ok: !!account.contact_email, fix: 'Add a contact email address to your account.',      icon: '📧' },
                { label: 'Active guide listing',     ok: activeListings.length > 0, fix: 'Contact your rep to set up your guide listing.', icon: '📖' },
                { label: 'Recent promotion (90d)',   ok: recentPromotion,    fix: 'Ask your rep about upcoming promotional opportunities.', icon: '📣' },
              ].map(({ label, ok, fix, icon }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: ok ? 600 : 500, color: ok ? '#15803d' : '#374151' }}>
                        {ok ? '✓' : '○'} {label}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 4, backgroundColor: ok ? '#dcfce7' : '#fef3c7', color: ok ? '#15803d' : '#92400e' }}>
                        {ok ? 'Complete' : 'Opportunity'}
                      </span>
                    </div>
                    {!ok && (
                      <p style={{ fontSize: 12, color: '#9ca3af', margin: '3px 0 0', fontStyle: 'italic' }}>{fix}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Recommended Actions ──────────────────────────────────────── */}
        {recommendations.length > 0 && (
          <section style={{ marginBottom: 36 }}>
            <SectionHeading title="Recommended Actions" subtitle="Based on your current performance" />

            <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
              {recommendations.slice(0, 4).map((r, i) => (
                <div key={i} style={{ backgroundColor: 'white', borderRadius: 12, padding: '14px 18px', border: '1px solid rgba(0,0,0,0.07)', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{r.icon}</span>
                  <p style={{ fontSize: 13, color: '#374151', margin: 0, lineHeight: 1.55 }}>{r.text}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── AI Opportunities (future) ─────────────────────────────── */}
        <section style={{ marginBottom: 36 }}>
          <div style={{ backgroundColor: '#f9fafb', borderRadius: 14, padding: '18px 20px', border: '1px dashed #d1d5db' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#6b7280', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Coming Soon — AI Recommendations</p>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: 0, lineHeight: 1.6 }}>
              Suggested seasonal campaigns, upgrade opportunities, and guide participation ideas will appear here — personalized to your performance data.
            </p>
          </div>
        </section>

        {/* ── Transparency Note ─────────────────────────────────────── */}
        <section>
          <div style={{ backgroundColor: 'white', borderRadius: 14, padding: '20px', border: '1px solid rgba(0,0,0,0.07)' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#1a2744', margin: '0 0 12px' }}>
              📋 How We Report Performance
            </p>
            <div style={{ display: 'grid', gap: 10 }}>
              {[
                { badge: 'measured' as const, explain: 'Tracked directly in our platform database. Clicks, leads, and ad impressions are logged each time they occur.' },
                { badge: 'estimated' as const, explain: 'Reasonable approximations. Print circulation is based on our print run figures, not individual reader measurements.' },
                { badge: 'unavailable' as const, explain: 'Not yet tracked. We don\'t currently measure website traffic, social reach, or newsletter open rates. We\'ll add these transparently when available.' },
              ].map(({ badge, explain }) => (
                <div key={badge} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <TrustBadge type={badge} />
                  <p style={{ fontSize: 12, color: '#6b7280', margin: 0, lineHeight: 1.5, flex: 1 }}>{explain}</p>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 14, marginBottom: 0 }}>
              Click data reflects activity since migration 063 (May 2026). Earlier clicks were not tracked.
              Have questions? Contact your account representative.
            </p>
          </div>
        </section>

        {/* Footer */}
        <div style={{ marginTop: 40, paddingTop: 20, borderTop: '1px solid rgba(0,0,0,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>
            Report generated {reportDate}
          </p>
          <Link href={`/partners/${slug}/admin`}
            style={{ fontSize: 12, fontWeight: 700, color: '#1a2744', textDecoration: 'none' }}>
            ← Back to Lead Inbox
          </Link>
        </div>
      </div>
    </div>
  )
}

// ── Local section heading ─────────────────────────────────────────────────────

function SectionHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 style={{ fontSize: 17, fontWeight: 800, color: '#1a2744', margin: '0 0 3px', letterSpacing: '-0.01em' }}>{title}</h2>
      <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>{subtitle}</p>
    </div>
  )
}
