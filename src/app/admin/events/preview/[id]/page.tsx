// /admin/events/preview/[id] — admin-only preview of any event regardless
// of status. The public detail page at /calendar/events/[slug] filters out
// pending / rejected / cancelled events; this route bypasses that so an
// approver can read the would-be public page BEFORE clicking Approve.
//
// Renders inside the admin shell (no Sidebar — we hand-render a slim header
// instead, since this is a reading view, not a managing view).
//
// Auth: requireAdmin() — the proxy already blocks anonymous access. The
// market check ensures a Publisher in market A can't preview a draft in
// market B.

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft, Calendar, Clock, MapPin, Mail, Phone, ExternalLink,
  Tag, Eye, Star, AlertTriangle,
} from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/auth'

export const metadata: Metadata = { title: 'Event Preview — Admin' }
export const dynamic  = 'force-dynamic'

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pending:   { label: 'Pending Review', cls: 'bg-amber-100 text-amber-800 ring-amber-200' },
  published: { label: 'Published',      cls: 'bg-emerald-100 text-emerald-800 ring-emerald-200' },
  approved:  { label: 'Published',      cls: 'bg-emerald-100 text-emerald-800 ring-emerald-200' },
  rejected:  { label: 'Rejected',       cls: 'bg-rose-100 text-rose-700 ring-rose-200' },
  cancelled: { label: 'Cancelled',      cls: 'bg-gray-100 text-gray-700 ring-gray-200' },
  archived:  { label: 'Trashed',        cls: 'bg-gray-100 text-gray-700 ring-gray-200' },
}

interface Props {
  params: Promise<{ id: string }>
}

function fmtDate(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })
}

function fmtTime(t: string | null): string | null {
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return t
  const period = h >= 12 ? 'PM' : 'AM'
  const hour12 = ((h + 11) % 12) + 1
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`
}

export default async function EventPreviewPage({ params }: Props) {
  const admin = await requireAdmin()
  const { id } = await params

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return notFound()

  // Market guard — same rule as the [id] route. Super and cross-brand admins
  // pass automatically because allowedMarkets is the full set for them.
  const ev = data as Record<string, unknown>
  const market = typeof ev.market === 'string' ? ev.market : null
  if (admin.role !== 'super' && admin.role !== 'admin' && market && !admin.allowedMarkets.includes(market)) {
    return notFound()
  }

  const status   = String(ev.status ?? 'pending')
  const badge    = STATUS_BADGE[status] ?? STATUS_BADGE.pending
  const startTime = fmtTime(typeof ev.start_time === 'string' ? ev.start_time : null)
  const endTime   = fmtTime(typeof ev.end_time   === 'string' ? ev.end_time   : null)
  const timeLabel = startTime ? (endTime ? `${startTime} – ${endTime}` : startTime) : 'All day'

  const heroUrl     = typeof ev.hero_image_url   === 'string' ? ev.hero_image_url   : null
  const description = typeof ev.description      === 'string' ? ev.description      : null
  const venue       = typeof ev.location_name    === 'string' ? ev.location_name    : null
  const address     = typeof ev.address          === 'string' ? ev.address          : null
  const city        = typeof ev.city             === 'string' ? ev.city             : null
  const organizer   = typeof ev.organizer_name   === 'string' ? ev.organizer_name   : null
  const orgEmail    = typeof ev.organizer_email  === 'string' ? ev.organizer_email  : null
  const phone       = typeof ev.phone            === 'string' ? ev.phone            : null
  const ageRange    = typeof ev.age_range        === 'string' ? ev.age_range        : null
  const cost        = typeof ev.cost_text        === 'string' ? ev.cost_text        : null
  const isFree      = !!ev.is_free
  const isFeatured  = !!ev.is_featured
  const regUrl      = typeof ev.registration_url === 'string' ? ev.registration_url : null
  const sourceUrl   = typeof ev.source_url       === 'string' ? ev.source_url       : null
  const sourceName  = typeof ev.source_name      === 'string' ? ev.source_name      : null
  const tags        = Array.isArray(ev.tags) ? (ev.tags as unknown[]).filter((x): x is string => typeof x === 'string') : []

  return (
    <div className="flex-1 overflow-y-auto bg-portal-bg">
      {/* Admin preview banner */}
      <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 flex items-center gap-2 text-xs">
        <Eye size={13} className="text-amber-700 shrink-0" />
        <span className="font-bold text-amber-900">Preview mode</span>
        <span className="text-amber-800">— this is how the event will look on the public site.</span>
        <span className={`ml-auto inline-flex items-center px-2 py-0.5 rounded-full font-bold ring-1 ${badge.cls}`}>
          {badge.label}
        </span>
        <Link
          href="/admin/events"
          className="ml-3 inline-flex items-center gap-1 text-xs font-semibold text-amber-900 hover:text-amber-950"
        >
          <ArrowLeft size={12} /> Back to Events
        </Link>
      </div>

      <article className="max-w-4xl mx-auto px-4 py-8 md:px-6 md:py-12">
        {/* Hero */}
        {heroUrl ? (
          <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden bg-gray-100 ring-1 ring-gray-200 mb-6">
            <Image src={heroUrl} alt={String(ev.title)} fill style={{ objectFit: 'cover' }} sizes="(max-width: 768px) 100vw, 1200px" unoptimized />
            {isFeatured && (
              <span className="absolute top-4 left-4 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/95 shadow text-xs font-bold text-amber-900 ring-1 ring-amber-200">
                <Star size={12} className="fill-amber-400 text-amber-500" /> Featured
              </span>
            )}
          </div>
        ) : (
          <div className="mb-6 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500 inline-flex items-center gap-2 w-full justify-center">
            <AlertTriangle size={14} /> No hero image — public detail page will use a fallback.
          </div>
        )}

        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight mb-3">
          {String(ev.title)}
        </h1>

        {/* Meta strip */}
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-600 mb-6">
          <span className="inline-flex items-center gap-1.5">
            <Calendar size={14} /> {fmtDate(String(ev.start_date))}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock size={14} /> {timeLabel}
          </span>
          {(venue || city) && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={14} /> {venue || city}
            </span>
          )}
          {isFree && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 font-bold text-xs">
              Free
            </span>
          )}
          {cost && !isFree && (
            <span className="text-gray-700 font-semibold">{cost}</span>
          )}
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-6">
            {tags.map(t => (
              <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 ring-1 ring-gray-200 text-xs">
                <Tag size={10} /> {t.replace(/-/g, ' ')}
              </span>
            ))}
          </div>
        )}

        {description && (
          <div className="prose prose-sm md:prose-base max-w-none text-gray-800 whitespace-pre-wrap leading-relaxed mb-8">
            {description}
          </div>
        )}

        {/* Details panel */}
        <div className="rounded-2xl bg-white ring-1 ring-gray-200 p-5 md:p-6 space-y-3 text-sm">
          {(address || city) && (
            <div className="flex items-start gap-2">
              <MapPin size={14} className="text-gray-400 mt-0.5 shrink-0" />
              <div>
                {venue && <div className="font-bold text-gray-900">{venue}</div>}
                {address && <div className="text-gray-700">{address}</div>}
                {city && !address && <div className="text-gray-700">{city}</div>}
              </div>
            </div>
          )}
          {organizer && (
            <div className="flex items-start gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 mt-1 shrink-0">By</span>
              <div className="font-semibold text-gray-900">{organizer}</div>
            </div>
          )}
          {ageRange && (
            <div className="text-gray-700"><span className="text-gray-400">Ages:</span> <span className="font-semibold">{ageRange}</span></div>
          )}
          {orgEmail && (
            <a href={`mailto:${orgEmail}`} className="inline-flex items-center gap-1.5 text-sky-700 hover:underline">
              <Mail size={13} /> {orgEmail}
            </a>
          )}
          {phone && (
            <span className="inline-flex items-center gap-1.5 text-gray-700">
              <Phone size={13} /> {phone}
            </span>
          )}
          {regUrl && (
            <a href={regUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 mt-2 px-4 py-2 text-sm font-bold rounded-full bg-portal-navy text-white hover:bg-portal-navy/90 transition-colors">
              Register <ExternalLink size={13} />
            </a>
          )}
        </div>

        {/* Source attribution — admin-only, doesn't render on public page */}
        {(sourceUrl || sourceName) && (
          <div className="mt-6 rounded-xl bg-gray-50 ring-1 ring-gray-200 px-4 py-3 text-xs text-gray-500">
            <span className="font-bold uppercase tracking-wider mr-2">Source</span>
            {sourceName ?? 'Unknown'}
            {sourceUrl && (
              <a href={sourceUrl} target="_blank" rel="noreferrer" className="ml-2 text-sky-600 hover:underline">
                {sourceUrl}
              </a>
            )}
          </div>
        )}
      </article>
    </div>
  )
}
