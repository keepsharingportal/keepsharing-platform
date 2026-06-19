// ── /birthday-party-guide — "The Big Birthday Bash" ──────────────
//
// The Ultimate Planning Portal for River Region moms (and 5 sibling
// brands when they activate). Replaces the generic GuideDetailPage
// template with a hand-crafted portal layout that maps to the
// mom-planning-a-birthday journey:
//   Inspire → Plan → Source → Save → Show off
//
// Most blocks are editor-managed via tables introduced in migration 202;
// articles + listings + ad placements come from existing infrastructure.

import type { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import { loadBrandContext } from '@/lib/brand-context'

import { BigBirthdayBashHero }    from '@/components/birthday/BigBirthdayBashHero'
import { BirthdayJumpNav }        from '@/components/birthday/BirthdayJumpNav'
import { BirthdayThisMonth }      from '@/components/birthday/BirthdayThisMonth'
import { PlanningTimeline }       from '@/components/birthday/PlanningTimeline'
import { BudgetTiers }            from '@/components/birthday/BudgetTiers'
import { TrendingThemes }         from '@/components/birthday/TrendingThemes'
import { BirthdayCategoryBrowser } from '@/components/birthday/BirthdayCategoryBrowser'
import { BirthdayGuideByCategory } from '@/components/birthday/BirthdayGuideByCategory'
import { RealRiverRegionParties } from '@/components/birthday/RealRiverRegionParties'
import { BirthdayArticles }       from '@/components/birthday/BirthdayArticles'
import { GiftGuidesByAge }        from '@/components/birthday/GiftGuidesByAge'
import { BirthdayFreebies }       from '@/components/birthday/BirthdayFreebies'
import { BirthdayPrintables }     from '@/components/birthday/BirthdayPrintables'
import { BirthdayPoll }           from '@/components/birthday/BirthdayPoll'
import { MomToMomTips }           from '@/components/birthday/MomToMomTips'
import { BirthdayMap }            from '@/components/birthday/BirthdayMap'
import { SubmitVendorTip }        from '@/components/birthday/SubmitVendorTip'
import { BirthdayInsiderSignup }  from '@/components/birthday/BirthdayInsiderSignup'
import { BirthdaySidebarSponsor } from '@/components/birthday/BirthdaySidebarSponsor'
import { BirthdaySectionSponsor } from '@/components/birthday/BirthdaySectionSponsor'
import { BirthdayBuzz }           from '@/components/birthday/BirthdayBuzz'
import { FeaturedBirthdayPros }   from '@/components/birthday/FeaturedBirthdayPros'
import { BirthdayQuickLinks }     from '@/components/birthday/BirthdayQuickLinks'
import { SidebarDealsCard }       from '@/components/birthday/SidebarDealsCard'

export const revalidate = 600

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

// Flattens advertiser_accounts.{slug,website_url} onto the buzz row as
// vendor_slug + vendor_website so the carousel can decide where the CTA
// should send the user without a second query.
function normalizeBuzz(rows: Array<Record<string, unknown>>): Array<Record<string, unknown>> {
  return rows.map(r => {
    const adv = r.advertiser_accounts as { slug?: string; website_url?: string | null } | { slug?: string; website_url?: string | null }[] | null
    const first         = Array.isArray(adv) ? adv[0] : adv
    const vendor_slug   = first?.slug ?? null
    const vendor_website = first?.website_url ?? null
    return { ...r, vendor_slug, vendor_website }
  })
}

export async function generateMetadata(): Promise<Metadata> {
  const { buildPageMetadata } = await import('@/lib/seo/metadata')
  return buildPageMetadata({
    title:       'The Big Birthday Bash — River Region Birthday Planning Portal',
    description: 'Every venue, vendor, theme, freebie and tip for planning a kid\'s birthday in the River Region. Local moms have tested every one. Budget tiers, printables, real parties, and 89 vetted vendors in one place.',
    path:        '/birthday-party-guide',
    type:        'website',
    keywords:    [
      'River Region birthday', 'Montgomery kids birthday', 'birthday party Montgomery AL',
      'birthday venues Montgomery', 'kids birthday cakes Montgomery', 'birthday freebies Montgomery',
    ],
  })
}

export default async function BirthdayPartyGuidePage() {
  const ctx       = await loadBrandContext()
  const brandSlug = ctx.market.slug
  const supabase  = sb()

  // Editor-managed hero from the verticals table — pattern matches the
  // FRG / Mom Knows Best heroes. Falls back to defaults when the row
  // hasn't been customized yet (or doesn't exist if migration 205
  // hasn't been applied).
  const { data: heroVertical } = await supabase
    .from('verticals')
    .select('hero_image_url, display_name, subtitle')
    .eq('slug', 'birthday-bash')
    .maybeSingle()
  const hv = heroVertical as { hero_image_url?: string | null; display_name?: string | null; subtitle?: string | null } | null

  // Single batched load — all blocks paint together rather than waterfall.
  const [
    themesRes, tiersRes, freebiesRes, printablesRes, partiesRes, tipsRes,
    pollRes, articlesRes, listingCountsRes, sectionSponsorRes, buzzRes, dealsRes,
  ] = await Promise.all([
    supabase.from('birthday_themes')
      .select('*').eq('is_active', true)
      .or(`brand_slug.eq.${brandSlug},brand_slug.is.null`)
      .order('display_order').limit(12),
    supabase.from('birthday_budget_tiers')
      .select('*').eq('is_active', true)
      .or(`brand_slug.eq.${brandSlug},brand_slug.is.null`)
      .order('display_order').limit(5),
    supabase.from('birthday_freebies')
      .select('*').eq('is_active', true)
      .or(`brand_slug.eq.${brandSlug},brand_slug.is.null`)
      .order('category').limit(40),
    supabase.from('birthday_printables')
      .select('*').eq('is_active', true)
      .or(`brand_slug.eq.${brandSlug},brand_slug.is.null`)
      .order('display_order').limit(12),
    supabase.from('birthday_real_parties')
      .select('*').eq('status', 'approved').eq('brand_slug', brandSlug)
      .order('display_order', { ascending: true })
      .order('created_at',    { ascending: false })
      .limit(9),
    supabase.from('birthday_mom_tips')
      .select('*').eq('is_active', true)
      .or(`brand_slug.eq.${brandSlug},brand_slug.is.null`)
      .order('display_order').limit(6),
    supabase.from('weekly_polls')
      .select('id, question, options, vote_counts, total_votes, opens_at, closes_at, is_active')
      .eq('is_active', true)
      .or(`brand_slug.eq.${brandSlug},brand_slug.is.null`)
      .lte('opens_at', new Date().toISOString())
      .order('opens_at', { ascending: false })
      .limit(1).maybeSingle(),
    // Birthday-relevant articles: anything tagged with the 'birthday' topic
    // OR assigned to the birthday-party-guide via guide_slug. Either path
    // surfaces the article in the portal's Inspiration Articles block, so
    // the editor can pick whichever feels right at write-time.
    // Pull social_hook + body so the article-card preview can fall back
    // when excerpt is empty (excerpt → social_hook → body-derived lead).
    supabase.from('guide_articles')
      .select('id, title, slug, column_slug, excerpt, social_hook, body, hero_image_url, author_byline, published_at')
      .eq('published', true).eq('brand_slug', brandSlug)
      .or('topics.cs.{birthday},guide_slug.eq.birthday-party-guide')
      .order('published_at', { ascending: false })
      .limit(6),
    // Full birthday-party-guide vendor listings, joined to
    // advertiser_accounts so the canonical ListingCard design renders.
    // Importer now creates an advertiser_accounts row for every CSV
    // row, so every listing here is linked.
    supabase.from('guide_listings')
      .select(`
        id, listing_tier, category, guide_data, display_order,
        advertiser_accounts (
          id, slug, business_name, card_hook, hero_photo_url,
          neighborhood, city_state_zip, website_url, office_phone,
          has_military_discount, is_veteran_owned, is_woman_owned,
          is_minority_owned, is_locally_owned
        )
      `)
      .in('guide_type_slug', ['birthday-party', 'birthday-party-guide'])
      .eq('is_published', true)
      .order('display_order', { ascending: true })
      .limit(500),
    // Active section sponsor for the page (sponsorship slot)
    supabase.from('ad_placements')
      .select('id, ad_headline, ad_description, ad_link, ad_image_url, advertiser:advertiser_accounts(business_name, slug)')
      .eq('placement_type', 'section_sponsor')
      .eq('is_active', true)
      .ilike('placement_context', '%birthday%')
      .limit(1).maybeSingle(),
    // birthday_buzz table holds two distinct surfaces:
    //   - vendor_spotlight rows → Featured Birthday Pros (paid editorial)
    //   - everything else      → Birthday Buzz (community chatter)
    // Both fetched in one round-trip with a higher limit; we split + slice
    // in JS below so the editor can manage both from /admin/birthday/buzz.
    supabase.from('birthday_buzz')
      .select('id, kind, body, from_name, image_url, vendor_id, vendor_name, link_url, posted_at, advertiser_accounts:advertiser_accounts(slug, website_url)')
      .eq('is_active', true).eq('brand_slug', brandSlug)
      .or(`expires_at.is.null,expires_at.gte.${new Date().toISOString()}`)
      .order('posted_at', { ascending: false })
      .limit(30),
    // Top 2-3 active deals for the sidebar promo
    supabase.from('birthday_deals')
      .select('id, business_name, headline, offer, image_url, link_url, valid_until, is_featured')
      .eq('is_active', true).eq('brand_slug', brandSlug)
      .order('is_featured', { ascending: false })
      .order('display_order', { ascending: true })
      .limit(2),
  ])

  // Birthday vendor listings — joined to advertiser_accounts so the
  // canonical ListingCard renders. Rows where the join is null are
  // dropped (every linked import should have one). Description in
  // guide_data is preserved as a fallback for the card hook.
  type RawListing = {
    id:            string
    listing_tier:  string | null
    category:      string | null
    guide_data:    Record<string, unknown> | null
    display_order: number | null
    advertiser_accounts: {
      id:                     string
      slug:                   string
      business_name:          string
      card_hook:              string | null
      hero_photo_url:         string | null
      neighborhood:           string | null
      city_state_zip:         string | null
      website_url:            string | null
      office_phone:           string | null
      has_military_discount:  boolean | null
      is_veteran_owned:       boolean | null
      is_woman_owned:         boolean | null
      is_minority_owned:      boolean | null
      is_locally_owned:       boolean | null
    } | null
  }
  const rawListings = (listingCountsRes.data ?? []) as unknown as RawListing[]
  const guideListings = rawListings
    .filter(r => r.advertiser_accounts !== null)
    .map(r => {
      const a = r.advertiser_accounts!
      const hookFallback = (r.guide_data?.description as string | undefined) ?? null
      return {
        id:            r.id,
        category:      r.category,
        listing_tier:  r.listing_tier,
        display_order: r.display_order,
        listing: {
          id:                    a.id,
          slug:                  a.slug,
          business_name:         a.business_name,
          card_hook:             a.card_hook ?? hookFallback,
          hero_photo_url:        a.hero_photo_url,
          neighborhood:          a.neighborhood,
          city_state_zip:        a.city_state_zip,
          website_url:           a.website_url,
          office_phone:          a.office_phone,
          has_military_discount: a.has_military_discount,
          is_veteran_owned:      a.is_veteran_owned,
          is_woman_owned:        a.is_woman_owned,
          is_minority_owned:     a.is_minority_owned,
          is_locally_owned:      a.is_locally_owned,
        },
      }
    })
  const categoryCounts = new Map<string, number>()
  for (const l of guideListings) {
    if (l.category) categoryCounts.set(l.category, (categoryCounts.get(l.category) ?? 0) + 1)
  }
  const topCategories = Array.from(categoryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([cat, count]) => ({ cat, count }))
  const totalListings = guideListings.length

  return (
    <main className="bg-[#fffaf5]">
      <BigBirthdayBashHero
        totalListings={totalListings}
        totalCategories={categoryCounts.size}
        heroImageUrl={hv?.hero_image_url ?? null}
        title={hv?.display_name ?? null}
        subtitle={hv?.subtitle ?? null}
      />
      <BirthdayJumpNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {/* Top section sponsor banner */}
        <BirthdaySectionSponsor sponsor={(sectionSponsorRes.data as Record<string, unknown> | null) ?? null} />

        {/* Quick-action tiles — jump straight to Finder / Deals / Timeline / Share */}
        <div className="mt-6">
          <BirthdayQuickLinks />
        </div>

        <div className="grid lg:grid-cols-3 gap-8 mt-6">
          {/* Main column — the journey */}
          <div className="lg:col-span-2 space-y-12">

            <section id="this-month">
              <BirthdayThisMonth />
            </section>

            {/* Featured Birthday Pros = paid editorial spotlights.
                Hero + 4 supporting magazine layout. Filter to vendor_spotlight
                kind from the buzz table, take top 5 by posted_at. */}
            <section id="featured-pros">
              <FeaturedBirthdayPros
                items={normalizeBuzz(buzzRes.data ?? []).filter(b => b.kind === 'vendor_spotlight').slice(0, 5)}
              />
            </section>

            {/* Birthday Buzz = community chatter (milestones, mom stories,
                tips, editor picks). Excludes vendor_spotlight rows because
                those live in Featured Pros above. */}
            <section id="buzz">
              <BirthdayBuzz
                buzz={normalizeBuzz(buzzRes.data ?? []).filter(b => b.kind !== 'vendor_spotlight')}
              />
            </section>

            <section id="timeline">
              <PlanningTimeline brandSlug={brandSlug} />
            </section>

            <section id="budget">
              <BudgetTiers tiers={(tiersRes.data ?? []) as Array<Record<string, unknown>>} />
            </section>

            <section id="themes">
              <TrendingThemes themes={(themesRes.data ?? []) as Array<Record<string, unknown>>} />
            </section>

            <section id="vendors" className="space-y-8">
              <BirthdayCategoryBrowser
                topCategories={topCategories}
                totalListings={totalListings}
              />
              <BirthdayGuideByCategory
                rows={guideListings}
                totalCount={totalListings}
              />
            </section>

            <section id="real-parties">
              <RealRiverRegionParties parties={(partiesRes.data ?? []) as Array<Record<string, unknown>>} />
            </section>

            <section id="articles">
              <BirthdayArticles articles={(articlesRes.data ?? []) as Array<Record<string, unknown>>} />
            </section>

            <section id="gift-guides">
              <GiftGuidesByAge />
            </section>

            <section id="freebies">
              <BirthdayFreebies freebies={(freebiesRes.data ?? []) as Array<Record<string, unknown>>} brandSlug={brandSlug} />
            </section>

            <section id="printables">
              <BirthdayPrintables printables={(printablesRes.data ?? []) as Array<Record<string, unknown>>} brandSlug={brandSlug} />
            </section>

            <section id="tips">
              <MomToMomTips tips={(tipsRes.data ?? []) as Array<Record<string, unknown>>} brandSlug={brandSlug} />
            </section>

            <section id="submit">
              <SubmitVendorTip />
            </section>

          </div>

          {/* Right rail — sticky on desktop */}
          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <BirthdaySidebarSponsor brand={ctx.market.displayName} />

            <SidebarDealsCard deals={(dealsRes.data ?? []) as Array<Record<string, unknown>>} />

            <BirthdayPoll poll={(pollRes.data as Record<string, unknown> | null) ?? null} />

            <BirthdayMap />

            <BirthdayInsiderSignup brandSlug={brandSlug} />
          </aside>
        </div>
      </div>
    </main>
  )
}
