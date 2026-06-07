// Shared registry for the /admin/content/short-links page. Defines the
// curated lists of purposes and channels surfaced in the editor's form
// + filter dropdowns + row badges.
//
// Why a shared file: the same data drives the Add form's selector, the
// list-page filter dropdowns, the row badges, the channel→UTM auto-fill,
// and the placeholder copy in the new-row form. Defining everything in
// one place keeps those views in sync.

// Note: lucide-react doesn't ship icons for individual social networks.
// Share2 stands in for Meta (Facebook + Instagram, treated as one
// channel since unified Meta Ads runs both placements from a single
// campaign); Music2 stands in for TikTok.
import { QrCode, Megaphone, Sparkles, Printer, Layout, Mail, Share2, Music2, Globe, Tag } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// ── PURPOSE ───────────────────────────────────────────────────────────────
// The WHAT — corresponds to the `purpose` column on short_links.

export type Purpose = 'qr' | 'ad' | 'campaign'

export interface PurposeDef {
  value:   Purpose
  label:   string
  /** Short blurb shown next to the radio in the form. */
  hint:    string
  icon:    LucideIcon
  /** Tailwind classes for the row badge. Each purpose gets its own
   *  color family so the editor can scan a list at a glance. */
  badgeClass: string
  /** Default UTM medium when this purpose is selected — overridden
   *  by the channel pick below. */
  defaultUtmMedium: string
}

export const PURPOSES: Record<Purpose, PurposeDef> = {
  qr: {
    value:            'qr',
    label:            'QR Code',
    hint:             'Printable QR for the magazine, signage, or anything physical.',
    icon:             QrCode,
    badgeClass:       'bg-violet-600 text-white',
    defaultUtmMedium: 'qr',
  },
  ad: {
    value:            'ad',
    label:            'Ad Link',
    hint:             'Tracked CTA on an on-site ad placement. Usually minted automatically by the ad editor.',
    icon:             Megaphone,
    badgeClass:       'bg-amber-600 text-white',
    defaultUtmMedium: 'ad',
  },
  campaign: {
    value:            'campaign',
    label:            'Campaign Link',
    hint:             'External distribution: Facebook ad, Instagram bio, email blast, landing page traffic, etc.',
    icon:             Sparkles,
    badgeClass:       'bg-sky-600 text-white',
    defaultUtmMedium: 'social',
  },
}

export const PURPOSE_LIST: PurposeDef[] = ['qr', 'ad', 'campaign'].map(k => PURPOSES[k as Purpose])

export function purposeOf(value: string | null | undefined): PurposeDef {
  if (value && (value === 'qr' || value === 'ad' || value === 'campaign')) {
    return PURPOSES[value]
  }
  return PURPOSES.qr
}

// ── CHANNEL ───────────────────────────────────────────────────────────────
// The WHERE — corresponds to the `channel` column. Each channel
// pre-fills UTM source + medium so analytics groups cleanly.

export type Channel =
  | 'print' | 'on_site' | 'meta' | 'tiktok'
  | 'email' | 'landing_page' | 'other'

export interface ChannelDef {
  value:        Channel
  label:        string
  icon:         LucideIcon
  /** Soft-tinted Tailwind classes for the row badge. */
  badgeClass:   string
  /** UTM defaults applied when the editor picks this channel. The
   *  editor can still override either field manually in the form. */
  utmSource:    string
  utmMedium:    string
  /** Which purposes this channel makes sense for — drives which
   *  options show up in the Add form's channel dropdown. 'any' means
   *  always visible. */
  worksWith:    Purpose[] | 'any'
}

export const CHANNELS: Record<Channel, ChannelDef> = {
  print: {
    value:      'print',
    label:      'Print (magazine / signage)',
    icon:       Printer,
    badgeClass: 'bg-gray-100 text-gray-700 ring-1 ring-gray-200',
    utmSource:  'magazine',
    utmMedium:  'qr',
    worksWith:  ['qr'],
  },
  on_site: {
    value:      'on_site',
    label:      'On-Site Ad',
    icon:       Layout,
    badgeClass: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200',
    utmSource:  'site',
    utmMedium:  'ad',
    worksWith:  ['ad'],
  },
  meta: {
    value:      'meta',
    label:      'Meta (Facebook / Instagram)',
    icon:       Share2,
    badgeClass: 'bg-blue-100 text-blue-800 ring-1 ring-blue-200',
    utmSource:  'meta',
    utmMedium:  'social',
    worksWith:  ['campaign'],
  },
  tiktok: {
    value:      'tiktok',
    label:      'TikTok',
    icon:       Music2,
    badgeClass: 'bg-slate-100 text-slate-800 ring-1 ring-slate-200',
    utmSource:  'tiktok',
    utmMedium:  'social',
    worksWith:  ['campaign'],
  },
  email: {
    value:      'email',
    label:      'Email / Newsletter',
    icon:       Mail,
    badgeClass: 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200',
    utmSource:  'newsletter',
    utmMedium:  'email',
    worksWith:  ['campaign'],
  },
  landing_page: {
    value:      'landing_page',
    label:      'Landing Page',
    icon:       Globe,
    badgeClass: 'bg-indigo-100 text-indigo-800 ring-1 ring-indigo-200',
    utmSource:  'landing',
    utmMedium:  'referral',
    worksWith:  ['campaign'],
  },
  other: {
    value:      'other',
    label:      'Other',
    icon:       Tag,
    badgeClass: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200',
    utmSource:  'other',
    utmMedium:  'referral',
    worksWith:  'any',
  },
}

export const CHANNEL_LIST: ChannelDef[] = [
  'print', 'on_site', 'meta', 'tiktok', 'email', 'landing_page', 'other',
].map(k => CHANNELS[k as Channel])

// Legacy aliases — rows created before the Meta consolidation may have
// channel='facebook' or channel='instagram' stamped in the DB. Display
// those as Meta so the UI doesn't show 'unknown channel' on old rows.
const LEGACY_CHANNEL_ALIASES: Record<string, Channel> = {
  facebook:  'meta',
  instagram: 'meta',
}

export function channelOf(value: string | null | undefined): ChannelDef | null {
  if (!value) return null
  if (value in CHANNELS) return CHANNELS[value as Channel]
  const aliased = LEGACY_CHANNEL_ALIASES[value]
  if (aliased) return CHANNELS[aliased]
  return null
}

/** Filter the channel list down to what's compatible with a given purpose. */
export function channelsForPurpose(p: Purpose): ChannelDef[] {
  return CHANNEL_LIST.filter(c => c.worksWith === 'any' || c.worksWith.includes(p))
}
