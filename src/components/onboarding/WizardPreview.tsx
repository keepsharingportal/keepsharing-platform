'use client'

// Wizard live preview pane. Renders the current wizard state through
// the actual public listing components so the editor sees pixel-true
// previews of what they're building — no separate mock UI to maintain.
//
// Layout: sticky right-column card. Headline tells the editor which
// section they're previewing. Body renders the matching component:
//   - Identity steps (basics, tagline, hero, gallery, key-facts) →
//     a compact "header preview" that combines the data from those
//     steps as they would appear at the top of the listing
//   - Section steps (packages, hours, themes, etc.) → the matching
//     <Section /> component from src/components/listings/sections/
//
// Mobile: collapses below the form via the parent grid.

import { MapPin, Star, Eye } from 'lucide-react'
import { OurStorySection }        from '@/components/listings/sections/OurStorySection'
import { WhatsDifferentSection }  from '@/components/listings/sections/WhatsDifferentSection'
import { FeaturesBulletsSection } from '@/components/listings/sections/FeaturesBulletsSection'
import { FAQSection }             from '@/components/listings/sections/FAQSection'
import { SpecialOfferSection }    from '@/components/listings/sections/SpecialOfferSection'
import { MeetTeamSection }        from '@/components/listings/sections/MeetTeamSection'
import { ParentsSaySection }      from '@/components/listings/sections/ParentsSaySection'
import { PartyPackagesSection }   from '@/components/listings/sections/PartyPackagesSection'
import { PartyHoursSection }      from '@/components/listings/sections/PartyHoursSection'
import { ThemesAvailableSection } from '@/components/listings/sections/ThemesAvailableSection'
import { PartyAddOnsSection }     from '@/components/listings/sections/PartyAddOnsSection'
import { BestForSection }         from '@/components/listings/sections/BestForSection'
import { HealthSafetySection }    from '@/components/listings/sections/HealthSafetySection'
import { BookingNotesSection }    from '@/components/listings/sections/BookingNotesSection'
import type { ListingSection }    from '@/components/listings/sections/types'
import type { GuideSchema }       from '@/lib/guides/schemas'

interface AdvertiserPreview {
  business_name?:     string | null
  card_hook?:         string | null
  detail_lead?:       string | null
  hero_photo_url?:    string | null
  gallery_image_urls?: string[] | null
  address?:           string | null
  city_state_zip?:    string | null
  neighborhood?:      string | null
  [k: string]:        unknown
}

interface Props {
  stepKey:    string
  advertiser: AdvertiserPreview
  listingData: Record<string, unknown> | null
  sections:   ListingSection[]
  schema:     GuideSchema
}

export function WizardPreview({ stepKey, advertiser, listingData, sections, schema }: Props) {
  return (
    <div className="lg:sticky lg:top-6 bg-white border border-portal-border rounded-lg overflow-hidden">
      <div className="px-4 py-2.5 bg-portal-bg border-b border-portal-border flex items-center justify-between">
        <div className="text-[10px] font-bold uppercase tracking-widest text-portal-muted inline-flex items-center gap-1">
          <Eye size={11} /> Live preview
        </div>
        <span className="text-[10px] text-portal-muted">As it appears on your listing</span>
      </div>
      <div className="p-4 max-h-[78vh] overflow-y-auto">
        {renderPreview(stepKey, advertiser, listingData, sections, schema)}
      </div>
    </div>
  )
}

function renderPreview(
  stepKey:     string,
  advertiser:  AdvertiserPreview,
  listingData: Record<string, unknown> | null,
  sections:    ListingSection[],
  schema:      GuideSchema,
): React.ReactNode {
  // Identity steps — share one composite preview that builds up as
  // the editor moves through Basics → Tagline → Hero → Gallery → Key Facts.
  if (['basics', 'tagline', 'hero', 'gallery', 'key-facts'].includes(stepKey)) {
    return <IdentityPreview advertiser={advertiser} listingData={listingData} schema={schema} stepKey={stepKey} />
  }

  // Section-typed steps — look up the matching listing_sections row
  // and render through the public section component.
  const stepToSection: Record<string, string> = {
    'our-story':       'our_story',
    'whats-different': 'whats_different',
    'packages':        'party_packages',
    'whats-included':  'features_bullets',
    'themes':          'themes_available',
    'addons':          'party_addons',
    'hours':           'party_hours',
    'best-for':        'best_for',
    'parents-say':     'parents_say',
    'faq':             'faq',
    'booking':         'booking_notes',
    'health-safety':   'health_safety',
    'special-offer':   'special_offer',
  }
  const sectionType = stepToSection[stepKey]
  if (!sectionType) {
    return <EmptyState message="No preview for this step yet." />
  }

  const row = sections.find(s => s.section_type === sectionType)
  if (!row) {
    return <EmptyState message="Fill out the form to see the preview render here." />
  }

  // Activate so SectionRenderer's is_active check passes.
  const previewSection: ListingSection = { ...row, is_active: true } as ListingSection

  switch (sectionType) {
    case 'our_story':        return <OurStorySection         section={previewSection} />
    case 'whats_different':  return <WhatsDifferentSection   section={previewSection} />
    case 'features_bullets': return <FeaturesBulletsSection  section={previewSection} />
    case 'meet_team':        return <MeetTeamSection         section={previewSection} />
    case 'parents_say':      return <ParentsSaySection       section={previewSection} />
    case 'faq':              return <FAQSection              section={previewSection} />
    case 'special_offer':    return <SpecialOfferSection     section={previewSection} />
    case 'party_packages':   return <PartyPackagesSection    section={previewSection} />
    case 'party_hours':      return <PartyHoursSection       section={previewSection} />
    case 'themes_available': return <ThemesAvailableSection  section={previewSection} />
    case 'party_addons':     return <PartyAddOnsSection      section={previewSection} />
    case 'best_for':         return <BestForSection          section={previewSection} />
    case 'health_safety':    return <HealthSafetySection     section={previewSection} />
    case 'booking_notes':    return <BookingNotesSection     section={previewSection} />
    default:                 return <EmptyState message="Fill out the form to see the preview render here." />
  }
}

function IdentityPreview({ advertiser, listingData, schema, stepKey }: {
  advertiser:  AdvertiserPreview
  listingData: Record<string, unknown> | null
  schema:      GuideSchema
  stepKey:     string
}) {
  const name        = (advertiser.business_name ?? '').trim() || 'Your Business Name'
  const hook        = (advertiser.card_hook ?? '').trim()
  const about       = (advertiser.detail_lead ?? '').trim()
  const heroUrl     = (advertiser.hero_photo_url ?? '').trim() || null
  const galleryUrls = (advertiser.gallery_image_urls ?? []).filter(Boolean) as string[]
  const location    = (advertiser.neighborhood ?? advertiser.address ?? advertiser.city_state_zip ?? '').trim()

  const data = (listingData ?? {}) as Record<string, string>
  const facts = schema.headlineFacts
    .map(f => ({ key: f.key, label: f.label, val: (data[f.key] ?? '').trim() }))
    .filter(f => f.val)

  return (
    <div className="space-y-4">
      {/* Hero — gray placeholder when no photo set */}
      <div className="relative aspect-[16/9] rounded-lg overflow-hidden bg-gradient-to-br from-slate-200 to-slate-300">
        {heroUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={heroUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-xs font-bold uppercase tracking-widest">
            Hero photo
          </div>
        )}
      </div>

      {/* Header card */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-amber-700">Featured Partner</span>
        </div>
        <h3 className="text-[18px] font-black text-slate-900 leading-tight">{name}</h3>
        {location && (
          <div className="flex items-center gap-1 text-[11px] text-slate-500">
            <MapPin size={11} /> {location}
          </div>
        )}
        {hook && (
          <p className="text-[12px] text-slate-600 leading-relaxed pt-1">{hook}</p>
        )}
      </div>

      {/* Key facts chips */}
      {facts.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
          {facts.slice(0, 4).map(f => (
            <div key={f.key} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 text-[10px] font-semibold text-slate-700">
              <span className="text-slate-500">{f.label}:</span> {f.val}
            </div>
          ))}
        </div>
      )}

      {/* About paragraph */}
      {about && (
        <div className="pt-2 border-t border-slate-100">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">About</div>
          <p className="text-[12px] text-slate-600 leading-relaxed line-clamp-6">{about}</p>
        </div>
      )}

      {/* Gallery */}
      {galleryUrls.length > 0 && (stepKey === 'gallery' || galleryUrls.length > 0) && (
        <div className="pt-2 border-t border-slate-100">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2">Photo gallery</div>
          <div className="grid grid-cols-3 gap-1.5">
            {galleryUrls.slice(0, 6).map((url, i) => (
              <div key={i} className="aspect-square rounded overflow-hidden bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Photo ${i+1}`} className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}

      {!hook && !heroUrl && facts.length === 0 && (
        <EmptyState message="Fill in the form to start seeing your listing render here." />
      )}
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-10 text-[11px] text-portal-muted italic">
      {message}
    </div>
  )
}
