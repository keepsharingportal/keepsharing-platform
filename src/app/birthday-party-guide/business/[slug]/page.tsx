// ── /birthday-party-guide/business/[slug] ────────────────────────
//
// Vendor business profile page. Every advertiser gets one of these
// as the destination URL for print + portal + email touchpoints. The
// page reads from:
//   advertiser_accounts                — name, slug, hero, phone, website
//   advertiser_accounts.birthday_profile — JSONB with packages, hours, FAQ, gallery
//   guide_listings (guide_type='birthday-party-guide') — category + listing tier
//
// Empty birthday_profile? We render a clean basic profile using just
// the core advertiser fields so every vendor has a page on day one.

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { ArrowLeft, Phone, Globe, Mail, MapPin, Clock, Star, Check, MessageCircle, Share2 } from 'lucide-react'

export const revalidate = 600

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

interface Props { params: Promise<{ slug: string }> }

interface Hour      { day: string; open?: string; close?: string; closed?: boolean }
interface Pkg       { name: string; price?: string; duration?: string; includes?: string[]; note?: string }
interface Faq       { q: string; a: string }
interface Profile {
  tagline?:               string
  hours?:                 Hour[]
  phone?:                 string
  email?:                 string
  gallery?:               string[]
  packages?:              Pkg[]
  faq?:                   Faq[]
  good_for_ages?:         [number, number]
  indoor_outdoor?:        Array<'indoor' | 'outdoor' | 'both'>
  neighborhoods_served?:  string[]
  what_to_know?:          string
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const { data } = await sb().from('advertiser_accounts').select('business_name, card_hook').eq('slug', slug).maybeSingle()
  const name = (data as { business_name?: string } | null)?.business_name ?? 'Birthday vendor'
  const hook = (data as { card_hook?: string | null } | null)?.card_hook
  const { buildPageMetadata } = await import('@/lib/seo/metadata')
  return buildPageMetadata({
    title:       `${name} — Birthday Parties in the River Region`,
    description: hook ?? `Plan a birthday with ${name} — featured in the River Region Parents Big Birthday Bash.`,
    path:        `/birthday-party-guide/business/${slug}`,
    type:        'website',
  })
}

export default async function VendorProfilePage({ params }: Props) {
  const { slug } = await params
  const supabase = sb()

  const { data: account } = await supabase
    .from('advertiser_accounts')
    .select(`
      id, slug, business_name, card_hook, hero_photo_url, neighborhood, city_state_zip,
      website_url, office_phone, business_email,
      has_military_discount, is_veteran_owned, is_woman_owned, is_minority_owned, is_locally_owned,
      birthday_profile, birthday_tier
    `)
    .eq('slug', slug)
    .maybeSingle()
  if (!account) notFound()

  const acc = account as Record<string, unknown> & {
    id: string; slug: string; business_name: string
    card_hook: string | null; hero_photo_url: string | null
    neighborhood: string | null; city_state_zip: string | null
    website_url: string | null; office_phone: string | null; business_email: string | null
    has_military_discount?: boolean; is_veteran_owned?: boolean; is_woman_owned?: boolean
    is_minority_owned?: boolean; is_locally_owned?: boolean
    birthday_profile: Profile | null; birthday_tier: string | null
  }
  const profile: Profile = acc.birthday_profile ?? {}

  // Find the listing's category for the breadcrumb + suggestions
  const { data: listings } = await supabase
    .from('guide_listings')
    .select('category, guide_type_slug, guide_data')
    .eq('guide_type_slug', 'birthday-party-guide')
    .or(`advertiser_account_id.eq.${acc.id},listing_business_name.ilike.${acc.business_name}`)
    .limit(1)
  const listing  = (listings ?? [])[0] as { category: string | null; guide_data: Record<string, unknown> | null } | undefined
  const category = listing?.category ?? null

  // Suggested alternatives in same category
  const { data: siblings } = category ? await supabase
    .from('guide_listings')
    .select('id, advertiser_accounts(slug, business_name, hero_photo_url, card_hook, neighborhood)')
    .eq('guide_type_slug', 'birthday-party-guide')
    .eq('category', category)
    .eq('is_published', true)
    .limit(5) : { data: [] }
  const others = (siblings ?? [])
    .map(s => (s as { advertiser_accounts?: { slug?: string; business_name?: string; hero_photo_url?: string | null; card_hook?: string | null; neighborhood?: string | null } | null }).advertiser_accounts)
    .filter(Boolean)
    .filter(s => s?.slug !== slug)
    .slice(0, 4) as Array<{ slug?: string; business_name?: string; hero_photo_url?: string | null; card_hook?: string | null; neighborhood?: string | null }>

  const isSponsored = acc.birthday_tier && acc.birthday_tier !== 'standard'

  return (
    <main className="bg-[#fffaf5] min-h-screen">

      {/* Breadcrumb */}
      <div className="bg-white border-b border-black/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-[12px] text-slate-600">
            <Link href="/birthday-party-guide" className="hover:text-[#ff7a59] inline-flex items-center gap-1">
              <ArrowLeft size={11} /> Birthday Bash
            </Link>
            {category && (
              <>
                <span className="text-slate-300">/</span>
                <Link href={`/birthday-party-guide?category=${encodeURIComponent(category)}`} className="hover:text-[#ff7a59]">
                  {category.replace(/^Places to Party - /, '')}
                </Link>
              </>
            )}
          </div>
          {isSponsored && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 rounded-full">
              <Star size={9} /> {acc.birthday_tier === 'presenting' ? 'Presenting sponsor' : acc.birthday_tier === 'sponsored_category' ? 'Category sponsor' : 'Featured partner'}
            </span>
          )}
        </div>
      </div>

      {/* Hero */}
      <div className="relative">
        {acc.hero_photo_url && (
          <div className="absolute inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={acc.hero_photo_url} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-slate-900/40 to-slate-900/80" />
          </div>
        )}
        <div className={`relative max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16 ${acc.hero_photo_url ? 'text-white' : 'text-slate-900'}`}>
          <h1 className="text-3xl sm:text-5xl font-black leading-tight">{acc.business_name}</h1>
          {profile.tagline && (
            <p className={`text-[15px] sm:text-lg mt-3 max-w-2xl leading-relaxed ${acc.hero_photo_url ? 'text-white/90' : 'text-slate-600'}`}>{profile.tagline}</p>
          )}
          {!profile.tagline && acc.card_hook && (
            <p className={`text-[15px] sm:text-lg mt-3 max-w-2xl leading-relaxed ${acc.hero_photo_url ? 'text-white/90' : 'text-slate-600'}`}>{acc.card_hook}</p>
          )}

          <div className={`mt-5 flex items-center gap-4 flex-wrap text-[13px] ${acc.hero_photo_url ? 'text-white/80' : 'text-slate-600'}`}>
            {acc.neighborhood && <span className="inline-flex items-center gap-1.5"><MapPin size={13} />{acc.neighborhood}</span>}
            {profile.good_for_ages && <span>Ages {profile.good_for_ages[0]}–{profile.good_for_ages[1]}</span>}
            {profile.indoor_outdoor && profile.indoor_outdoor.length > 0 && (
              <span className="capitalize">{profile.indoor_outdoor.join(' · ')}</span>
            )}
          </div>

          <div className="mt-6 flex items-center gap-2 flex-wrap">
            {acc.office_phone && (
              <a href={`tel:${acc.office_phone.replace(/[^\d+]/g, '')}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-bold text-white bg-[#ff7a59] rounded-lg hover:opacity-90">
                <Phone size={13} /> {acc.office_phone}
              </a>
            )}
            {acc.website_url && (
              <a href={acc.website_url.startsWith('http') ? acc.website_url : `https://${acc.website_url}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-bold text-slate-900 bg-white border-2 border-white rounded-lg hover:opacity-90">
                <Globe size={13} /> Website
              </a>
            )}
            {profile.email && (
              <a href={`mailto:${profile.email}`}
                className={`inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-bold rounded-lg border-2 ${acc.hero_photo_url ? 'text-white border-white/40 hover:bg-white/10' : 'text-slate-700 border-slate-300 hover:bg-slate-50'}`}>
                <Mail size={13} /> Email
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">

          {/* Packages */}
          {profile.packages && profile.packages.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Party packages</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {profile.packages.map((pkg, i) => (
                  <div key={i} className="bg-white rounded-2xl border border-black/5 shadow-sm p-5">
                    <h3 className="text-[15px] font-bold text-slate-900">{pkg.name}</h3>
                    <div className="flex items-baseline gap-2 mt-1">
                      {pkg.price && <div className="text-xl font-black text-[#ff7a59]">{pkg.price}</div>}
                      {pkg.duration && <div className="text-[11px] text-slate-500">{pkg.duration}</div>}
                    </div>
                    {pkg.includes && (
                      <ul className="mt-3 space-y-1.5">
                        {pkg.includes.map((item, j) => (
                          <li key={j} className="flex items-start gap-1.5 text-[12px] text-slate-700">
                            <Check size={11} className="text-emerald-600 shrink-0 mt-1" />
                            <span className="leading-snug">{item}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {pkg.note && <p className="text-[11px] italic text-slate-500 mt-3">{pkg.note}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* What to know */}
          {profile.what_to_know && (
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">What to know</h2>
              <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-5 text-[14px] text-slate-700 leading-relaxed whitespace-pre-line">
                {profile.what_to_know}
              </div>
            </section>
          )}

          {/* Gallery */}
          {profile.gallery && profile.gallery.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">From their parties</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {profile.gallery.slice(0, 9).map((img, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={img} alt="" className="aspect-square rounded-lg object-cover bg-slate-100" />
                ))}
              </div>
            </section>
          )}

          {/* FAQ */}
          {profile.faq && profile.faq.length > 0 && (
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">FAQ</h2>
              <div className="bg-white rounded-2xl border border-black/5 shadow-sm divide-y divide-slate-100">
                {profile.faq.map((f, i) => (
                  <details key={i} className="group p-4">
                    <summary className="font-bold text-[14px] text-slate-900 cursor-pointer flex items-start gap-2 list-none">
                      <MessageCircle size={14} className="text-[#ff7a59] shrink-0 mt-0.5" />
                      <span className="flex-1">{f.q}</span>
                      <span className="text-slate-400 group-open:rotate-180 transition-transform">▾</span>
                    </summary>
                    <p className="text-[13px] text-slate-700 leading-relaxed mt-2 pl-6">{f.a}</p>
                  </details>
                ))}
              </div>
            </section>
          )}

          {/* Empty-state fallback for vendors with no birthday_profile filled in yet */}
          {!profile.packages && !profile.what_to_know && !profile.gallery && (
            <section>
              <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-6 text-center">
                <p className="text-[13px] text-slate-600">
                  More details coming soon. {acc.business_name} is part of our verified Birthday Bash vendor list — call or visit the website for current packages and availability.
                </p>
                {acc.office_phone && (
                  <a href={`tel:${acc.office_phone.replace(/[^\d+]/g, '')}`} className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-bold text-[#ff7a59]">
                    <Phone size={13} /> {acc.office_phone}
                  </a>
                )}
              </div>
            </section>
          )}

        </div>

        {/* Sidebar */}
        <aside className="space-y-4">

          {/* Contact card */}
          <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-5">
            <h3 className="text-[14px] font-bold text-slate-900 mb-3">Get in touch</h3>
            <div className="space-y-2 text-[12px]">
              {acc.office_phone && (
                <a href={`tel:${acc.office_phone.replace(/[^\d+]/g, '')}`} className="flex items-center gap-2 text-slate-700 hover:text-[#ff7a59]">
                  <Phone size={13} /> {acc.office_phone}
                </a>
              )}
              {profile.email && (
                <a href={`mailto:${profile.email}`} className="flex items-center gap-2 text-slate-700 hover:text-[#ff7a59]">
                  <Mail size={13} /> {profile.email}
                </a>
              )}
              {acc.website_url && (
                <a href={acc.website_url.startsWith('http') ? acc.website_url : `https://${acc.website_url}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-slate-700 hover:text-[#ff7a59]">
                  <Globe size={13} /> Visit website
                </a>
              )}
              {(acc.neighborhood || acc.city_state_zip) && (
                <div className="flex items-start gap-2 text-slate-700 pt-2 border-t border-slate-100">
                  <MapPin size={13} className="mt-0.5 shrink-0" />
                  <div>
                    {acc.neighborhood && <div>{acc.neighborhood}</div>}
                    {acc.city_state_zip && <div className="text-slate-500">{acc.city_state_zip}</div>}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Hours */}
          {profile.hours && profile.hours.length > 0 && (
            <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-5">
              <h3 className="text-[14px] font-bold text-slate-900 mb-3 flex items-center gap-1.5"><Clock size={14} />Hours</h3>
              <ul className="space-y-1 text-[12px]">
                {profile.hours.map((h, i) => (
                  <li key={i} className="flex items-center justify-between text-slate-700">
                    <span className="font-semibold">{h.day}</span>
                    <span>{h.closed ? 'Closed' : `${h.open ?? ''}${h.close ? `–${h.close}` : ''}`}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Badges */}
          {(acc.is_locally_owned || acc.is_woman_owned || acc.is_veteran_owned || acc.is_minority_owned || acc.has_military_discount) && (
            <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-5">
              <h3 className="text-[14px] font-bold text-slate-900 mb-3">Good to know</h3>
              <div className="flex items-center gap-1.5 flex-wrap">
                {acc.is_locally_owned && <Badge>Locally owned</Badge>}
                {acc.is_woman_owned && <Badge>Woman-owned</Badge>}
                {acc.is_veteran_owned && <Badge>Veteran-owned</Badge>}
                {acc.is_minority_owned && <Badge>Minority-owned</Badge>}
                {acc.has_military_discount && <Badge>Military discount</Badge>}
              </div>
            </div>
          )}

          {/* Share */}
          <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-4 text-center">
            <Share2 size={14} className="text-[#ff7a59] mx-auto mb-1" />
            <p className="text-[11px] text-slate-600">Sharing helps moms find vendors that actually deliver.</p>
          </div>

        </aside>
      </div>

      {/* Similar vendors */}
      {others.length > 0 && (
        <div className="bg-white border-t border-black/5">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
            <h3 className="text-[18px] font-bold text-slate-900 mb-4">More {category?.replace(/^Places to Party - /, '').toLowerCase() ?? 'birthday'} options</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {others.map(o => (
                <Link key={o.slug} href={`/birthday-party-guide/business/${o.slug}`} className="block group">
                  <div className="aspect-[4/3] rounded-lg bg-slate-100 overflow-hidden mb-2">
                    {o.hero_photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={o.hero_photo_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#fff0eb] to-[#ffd9cc]" />
                    )}
                  </div>
                  <div className="text-[13px] font-bold text-slate-900 group-hover:text-[#ff7a59] leading-snug">{o.business_name}</div>
                  {o.neighborhood && <div className="text-[11px] text-slate-500">{o.neighborhood}</div>}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full">
      {children}
    </span>
  )
}
