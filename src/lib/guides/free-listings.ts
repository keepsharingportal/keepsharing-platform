// Free guide listings have no advertiser_accounts row. The public cards
// still have to render: identity lives on guide_listings itself (migration
// 134). Linked listings keep using the joined account exactly as before —
// this module only supplies a card when that join is missing.

import type { ListingData } from '@/components/theme/ListingCard'
import { schemaForGuide } from '@/lib/guides/schemas'

export interface CardFact {
  key:   string
  label: string
  value: string
}

export interface InlineListingIdentity {
  id:              string
  business_name?:  string | null
  card_hook?:      string | null
  office_phone?:   string | null
  mobile_phone?:   string | null
  website_url?:    string | null
  contact_email?:  string | null
  address?:        string | null
  city_state_zip?: string | null
  neighborhood?:   string | null
  hero_photo_url?: string | null
}

/** Advertiser columns the guide cards already read. Extra fields are ignored. */
export type JoinedAdvertiser = {
  id?:                     string
  slug?:                   string
  business_name?:          string | null
  card_hook?:              string | null
  hero_photo_url?:         string | null
  neighborhood?:           string | null
  city_state_zip?:         string | null
  website_url?:            string | null
  office_phone?:           string | null
  has_military_discount?:  boolean | null
  is_veteran_owned?:       boolean | null
  is_woman_owned?:         boolean | null
  is_minority_owned?:      boolean | null
  is_locally_owned?:       boolean | null
}

export interface CompactCardModel {
  listing: ListingData
  facts:   CardFact[]
}

// A hours string longer than this crowds the compact card (date and cost
// are the scan facts). Shorter values fit beside them as a third chip.
const HOURS_CHIP_MAX = 48

export function isDatedEventGuide(guideSlug: string): boolean {
  const facts = schemaForGuide(guideSlug)?.headlineFacts
  if (!facts) return false
  const keys = new Set(facts.map(f => f.key))
  // Summer Camp also stores session dates, but it is a program directory.
  // An event guide is the one whose headline facts are when, how much, and
  // what time — fall-festivities is that guide today.
  return keys.has('dates') && keys.has('cost') && keys.has('hours')
}

export function coerceJoin<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

export function categoryListingRenderable(row: {
  business_name?: string | null
  advertiser_accounts?: JoinedAdvertiser | JoinedAdvertiser[] | null
}): boolean {
  if (coerceJoin(row.advertiser_accounts)) return true
  return Boolean(row.business_name?.trim())
}

function guideText(data: Record<string, unknown> | null | undefined, key: string): string | null {
  const value = data?.[key]
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function datedEventCardFacts(
  guideData: Record<string, unknown> | null | undefined,
): CardFact[] {
  const facts: CardFact[] = []
  const dates = guideText(guideData, 'dates')
  const cost  = guideText(guideData, 'cost')
  const hours = guideText(guideData, 'hours')
  if (dates) facts.push({ key: 'dates', label: 'Dates', value: dates })
  if (cost)  facts.push({ key: 'cost',  label: 'Cost',  value: cost })
  if (hours && hours.length <= HOURS_CHIP_MAX) {
    facts.push({ key: 'hours', label: 'Hours', value: hours })
  }
  return facts
}

export function freeListingFromRow(row: InlineListingIdentity): ListingData | null {
  const name = row.business_name?.trim()
  if (!name) return null
  const email = row.contact_email?.trim()
  return {
    id:              row.id,
    slug:            row.id,
    business_name:   name,
    card_hook:       row.card_hook?.trim() || null,
    hero_photo_url:  row.hero_photo_url ?? null,
    neighborhood:    row.neighborhood?.trim() || null,
    city_state_zip:  row.city_state_zip?.trim() || row.address?.trim() || null,
    website_url:     row.website_url ?? null,
    office_phone:    row.office_phone?.trim() || row.mobile_phone?.trim() || null,
    contact_email:   email && email.includes('@') ? email : null,
  }
}

/**
 * Compact-card model for one guide_listings row.
 *
 * A joined advertiser wins, and the hook fallback matches the directory
 * cards that already shipped: account card_hook, then guide_data.description.
 * With no join, the inline identity columns stand in for that account.
 */
export function resolveCompactCard(
  row: InlineListingIdentity & {
    guide_data?: Record<string, unknown> | null
    advertiser_accounts?: JoinedAdvertiser | JoinedAdvertiser[] | null
  },
  datedEvent: boolean,
): CompactCardModel | null {
  const guideData = row.guide_data ?? null
  const facts = datedEvent ? datedEventCardFacts(guideData) : []
  const advertiser = coerceJoin(row.advertiser_accounts)

  if (advertiser) {
    const gd = (guideData ?? {}) as Record<string, string>
    const hook = advertiser.card_hook ?? gd.description ?? null
    return {
      listing: { ...advertiser, card_hook: hook } as ListingData,
      facts,
    }
  }

  const free = freeListingFromRow(row)
  if (!free) return null
  const description = guideText(guideData, 'description')
  return {
    listing: free.card_hook ? free : { ...free, card_hook: description },
    facts,
  }
}
