// ── /admin/distribution/social-export ─────────────────────────────────────────
// Social Planner Export — prepares approved social posts for manual scheduling.
// Operators copy/paste output into GHL Social Planner or any other scheduler.
// NO automatic posting. NO GHL API calls. Human action required for every post.

import type { Metadata } from 'next'
import Link              from 'next/link'
import { redirect }      from 'next/navigation'
import { createClient }  from '@/lib/supabase/server'
import { SUBMISSION_TYPES, TYPE_COLORS } from '@/lib/submissions'

export const metadata: Metadata = { title: 'Social Planner Export — Admin' }

// ── Types ─────────────────────────────────────────────────────────────────────

interface SocialItem {
  id:                         string
  submission_type:            string
  target_publication:         string
  working_title:              string | null
  related_person_name:        string | null
  related_business_name:      string | null
  related_school_name:        string | null
  approved_social:            boolean
  social_planner_ready:       boolean
  social_queue:               boolean
  caption_facebook:           string | null
  caption_instagram:          string | null
  caption_sms:                string | null
  social_hashtags:            string | null
  social_image_note:          string | null
  social_publish_date:        string | null
  social_link:                string | null
  feature_image_url:          string | null
  photo_urls:                 Array<{ url: string }>
  image_status:               string | null
  exported_to_social_planner: boolean
  social_promoted_at:         string | null
  created_at:                 string
  updated_at:                 string
}

// ── Static config ─────────────────────────────────────────────────────────────

const SELECT_COLS = [
  'id','submission_type','target_publication',
  'working_title','related_person_name','related_business_name','related_school_name',
  'approved_social','social_planner_ready','social_queue',
  'caption_facebook','caption_instagram','caption_sms',
  'social_hashtags','social_image_note','social_publish_date','social_link',
  'feature_image_url','photo_urls',
  'image_status','exported_to_social_planner','social_promoted_at',
  'created_at','updated_at',
].join(', ')

const IMAGE_STATUS_OPTIONS = [
  { value: '',                    label: '— Not set —'           },
  { value: 'image_ready',         label: '✅ Image ready'         },
  { value: 'use_existing_image',  label: '📁 Use existing image'  },
  { value: 'no_image_needed',     label: '🚫 No image needed'     },
  { value: 'needs_photo',         label: '📷 Needs photo'         },
  { value: 'needs_canva_graphic', label: '🎨 Needs Canva graphic' },
]

const IMAGE_STATUS_STYLE: Record<string, string> = {
  image_ready:         'bg-portal-green-lt text-portal-green',
  use_existing_image:  'bg-portal-blue-lt text-portal-blue',
  no_image_needed:     'bg-portal-row-hover text-portal-sub',
  needs_photo:         'bg-portal-amber-lt text-portal-amber',
  needs_canva_graphic: 'bg-portal-amber-lt text-portal-amber',
}

const FILTER_TABS = [
  { key: 'all',      label: 'All'            },
  { key: 'ready',    label: 'Ready to Schedule' },
  { key: 'missing',  label: 'Missing Assets' },
  { key: 'exported', label: 'Exported'       },
  { key: 'promoted', label: 'Promoted'       },
] as const
type FilterKey = (typeof FILTER_TABS)[number]['key']

// ── Helpers ───────────────────────────────────────────────────────────────────

function getTitle(item: SocialItem): string {
  if (item.working_title) return item.working_title
  const entity = item.related_person_name ?? item.related_business_name ?? item.related_school_name
  const tc = SUBMISSION_TYPES.find(t => t.type === item.submission_type)
  if (entity) return `${tc?.shortLabel ?? item.submission_type}: ${entity}`
  return tc?.label ?? item.submission_type
}

function hasPhysicalImage(item: SocialItem): boolean {
  return !!(item.feature_image_url || (item.photo_urls?.length ?? 0) > 0)
}

function imageOk(item: SocialItem): boolean {
  if (hasPhysicalImage(item)) return true
  return ['image_ready', 'use_existing_image', 'no_image_needed'].includes(item.image_status ?? '')
}

function captionOk(item: SocialItem): boolean {
  return !!(item.caption_facebook || item.caption_instagram)
}

function isReadyToSchedule(item: SocialItem): boolean {
  return item.approved_social && imageOk(item) && captionOk(item) && !!item.social_link
}

interface AssetFlag { label: string; level: 'error' | 'warning' | 'ok' }

function assetFlags(item: SocialItem): AssetFlag[] {
  const flags: AssetFlag[] = []
  if (!item.approved_social)             flags.push({ label: 'Not approved',     level: 'error'   })
  if (!captionOk(item))                  flags.push({ label: 'No caption',        level: 'error'   })
  if (!item.social_link)                 flags.push({ label: 'No link',           level: 'warning' })
  if (!imageOk(item))                    flags.push({ label: 'No image/asset',    level: 'error'   })
  if (item.image_status === 'needs_photo')         flags.push({ label: 'Needs photo',      level: 'warning' })
  if (item.image_status === 'needs_canva_graphic') flags.push({ label: 'Needs Canva',      level: 'warning' })
  if (!item.social_publish_date)         flags.push({ label: 'No publish date',  level: 'warning' })
  return flags
}

function hashtagStr(raw: string | null): string {
  if (!raw) return ''
  return raw.split(/[\s,]+/)
    .filter(t => t.trim())
    .map(t => t.startsWith('#') ? t : `#${t}`)
    .join(' ')
}

function csvEscape(v: string | null): string {
  const s = (v ?? '').replace(/"/g, '""')
  return `"${s}"`
}

function buildCSV(items: SocialItem[]): string {
  const header = [
    'publish_date','channel','caption','link','hashtags',
    'image_note','asset_status','source_title','content_type',
  ].join(',')
  const rows: string[] = [header]
  for (const item of items) {
    const title      = getTitle(item)
    const date       = item.social_publish_date ?? ''
    const link       = item.social_link ?? ''
    const hashtags   = hashtagStr(item.social_hashtags)
    const imageNote  = item.social_image_note ?? ''
    const assetSt    = item.image_status ?? ''
    const type       = item.submission_type
    const channels: Array<{ ch: string; caption: string | null }> = [
      { ch: 'Facebook',  caption: item.caption_facebook  },
      { ch: 'Instagram', caption: item.caption_instagram },
    ]
    for (const { ch, caption } of channels) {
      if (!caption && !item.caption_facebook && !item.caption_instagram) continue
      rows.push([
        csvEscape(date), csvEscape(ch), csvEscape(caption ?? item.caption_facebook ?? ''),
        csvEscape(link), csvEscape(hashtags),
        csvEscape(imageNote), csvEscape(assetSt),
        csvEscape(title), csvEscape(type),
      ].join(','))
    }
  }
  return rows.join('\n')
}

function buildGHL(items: SocialItem[]): string {
  if (items.length === 0) return 'No items ready for export yet.'
  const lines: string[] = [
    'GHL Social Planner — Batch Export',
    `Generated: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
    'Paste each post block into GHL Social Planner manually.',
    '',
  ]
  for (let i = 0; i < items.length; i++) {
    const item  = items[i]
    const title = getTitle(item)
    const ht    = hashtagStr(item.social_hashtags)
    lines.push(`${'─'.repeat(48)}`)
    lines.push(`POST ${i + 1}: ${title}`)
    lines.push(`${'─'.repeat(48)}`)
    if (item.social_publish_date) lines.push(`Date:     ${item.social_publish_date}`)
    lines.push('')
    if (item.caption_facebook) {
      lines.push('[ FACEBOOK ]')
      lines.push(item.caption_facebook)
      if (ht) lines.push(ht)
      lines.push('')
    }
    if (item.caption_instagram) {
      lines.push('[ INSTAGRAM ]')
      lines.push(item.caption_instagram)
      if (ht) lines.push(ht)
      lines.push('')
    }
    if (item.caption_sms) {
      lines.push('[ SMS / SHORT ]')
      lines.push(item.caption_sms)
      lines.push('')
    }
    if (item.social_link)         lines.push(`Link:     ${item.social_link}`)
    const imgLine = item.image_status
      ? IMAGE_STATUS_OPTIONS.find(o => o.value === item.image_status)?.label ?? item.image_status
      : hasPhysicalImage(item) ? 'Image on file' : 'No image'
    lines.push(`Image:    ${imgLine}`)
    if (item.social_image_note)   lines.push(`Notes:    ${item.social_image_note}`)
    lines.push('')
  }
  return lines.join('\n').trim()
}

// ── Server actions ────────────────────────────────────────────────────────────

async function updateImageStatus(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const id       = formData.get('id')           as string
  const status   = (formData.get('image_status') as string) || null
  await supabase.from('community_submissions')
    .update({ image_status: status || null })
    .eq('id', id)
  redirect('/admin/distribution/social-export')
}

async function markExported(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const id       = formData.get('id') as string
  await supabase.from('community_submissions')
    .update({ exported_to_social_planner: true })
    .eq('id', id)
  redirect('/admin/distribution/social-export')
}

async function resetExported(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const id       = formData.get('id') as string
  await supabase.from('community_submissions')
    .update({ exported_to_social_planner: false })
    .eq('id', id)
  redirect('/admin/distribution/social-export')
}

async function markPromoted(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const id       = formData.get('id') as string
  await supabase.from('community_submissions')
    .update({ social_promoted_at: new Date().toISOString() })
    .eq('id', id)
  redirect('/admin/distribution/social-export')
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function SocialExportPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const { filter: rawFilter = 'all' } = await searchParams
  const activeFilter = (FILTER_TABS.some(f => f.key === rawFilter) ? rawFilter : 'all') as FilterKey

  const supabase = await createClient()

  const { data: rawItems } = await supabase
    .from('community_submissions')
    .select(SELECT_COLS)
    .or('approved_social.eq.true,social_planner_ready.eq.true,social_queue.eq.true')
    .order('social_publish_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(200)

  const allItems = (rawItems ?? []) as unknown as SocialItem[]

  // ── Filter ────────────────────────────────────────────────────────────────

  const filtered: SocialItem[] = (() => {
    switch (activeFilter) {
      case 'ready':    return allItems.filter(isReadyToSchedule)
      case 'missing':  return allItems.filter(i => !isReadyToSchedule(i) && !i.exported_to_social_planner && !i.social_promoted_at)
      case 'exported': return allItems.filter(i => i.exported_to_social_planner && !i.social_promoted_at)
      case 'promoted': return allItems.filter(i => !!i.social_promoted_at)
      default:         return allItems
    }
  })()

  // ── Counts ────────────────────────────────────────────────────────────────
  const counts = {
    all:      allItems.length,
    ready:    allItems.filter(isReadyToSchedule).length,
    missing:  allItems.filter(i => !isReadyToSchedule(i) && !i.exported_to_social_planner && !i.social_promoted_at).length,
    exported: allItems.filter(i => i.exported_to_social_planner && !i.social_promoted_at).length,
    promoted: allItems.filter(i => !!i.social_promoted_at).length,
  }

  // ── Export text (computed server-side) ────────────────────────────────────
  const exportItems = filtered.filter(i => !i.social_promoted_at)
  const csvText     = buildCSV(exportItems)
  const ghlText     = buildGHL(exportItems)

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="p-6 max-w-[1100px] mx-auto space-y-6 pb-16">

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-portal-text tracking-tight">Social Planner Export</h1>
          <p className="text-sm text-portal-sub mt-0.5">
            Prepare approved social posts for manual upload into GHL or any scheduler.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap shrink-0">
          <Link href="/admin/editorial/approval" className="text-xs px-3 py-2 rounded-lg border border-portal-border text-portal-sub hover:bg-portal-bg font-medium">
            Approval Desk →
          </Link>
          <Link href="/admin/distribution?view=social" className="text-xs px-3 py-2 rounded-lg border border-portal-border text-portal-sub hover:bg-portal-bg font-medium">
            ← Distribution
          </Link>
        </div>
      </div>

      {/* ── Safety notice ────────────────────────────────────────────────── */}
      <div className="bg-portal-blue-lt border border-portal-blue/30 rounded-lg px-5 py-4 flex items-start gap-3">
        <span className="text-lg mt-0.5">🔒</span>
        <div>
          <p className="text-sm font-semibold text-portal-navy mb-0.5">No automatic posting — operator action required</p>
          <p className="text-xs text-portal-blue leading-relaxed">
            This page prepares export-ready copy. Nothing is sent to GHL or any social platform automatically.
            Copy the text below into GHL Social Planner (or your scheduler), then mark each post as Exported or Promoted here to track status.
          </p>
        </div>
      </div>

      {/* ── Stats strip ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {([
          { label: 'In Export Queue', val: counts.all,      color: '#374151' },
          { label: 'Ready to Schedule', val: counts.ready,  color: '#16a34a' },
          { label: 'Missing Assets',   val: counts.missing, color: '#d97706' },
          { label: 'Exported',         val: counts.exported,color: '#2563eb' },
          { label: 'Promoted',         val: counts.promoted, color: '#7c3aed' },
        ] as const).map(({ label, val, color }) => (
          <div key={label} className="bg-white border border-portal-border rounded-lg px-4 py-3 text-center">
            <p className="text-2xl font-bold" style={{ color }}>{val}</p>
            <p className="text-[11px] text-portal-muted mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Filter tabs ──────────────────────────────────────────────────── */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {FILTER_TABS.map(tab => (
          <Link
            key={tab.key}
            href={`/admin/distribution/social-export?filter=${tab.key}`}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeFilter === tab.key
                ? 'bg-portal-navy text-white'
                : 'bg-white border border-portal-border text-portal-sub hover:bg-portal-bg'
            }`}
          >
            {tab.label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
              activeFilter === tab.key ? 'bg-white/20 text-white' : 'bg-portal-row-hover text-portal-sub'
            }`}>
              {counts[tab.key]}
            </span>
          </Link>
        ))}
      </div>

      {/* ── Item cards ───────────────────────────────────────────────────── */}
      <div className="space-y-4">
        {filtered.length === 0 && (
          <div className="bg-white border border-portal-border rounded-lg px-6 py-12 text-center">
            <p className="text-portal-muted text-sm">No items in this filter.</p>
            <p className="text-[11px] text-portal-muted mt-1">
              Approve posts for social in the <Link href="/admin/editorial/approval" className="text-portal-blue hover:underline">Approval Desk</Link>.
            </p>
          </div>
        )}

        {filtered.map(item => {
          const tc     = SUBMISSION_TYPES.find(t => t.type === item.submission_type)
          const title  = getTitle(item)
          const accent = TYPE_COLORS[item.submission_type] ?? '#374151'
          const flags  = assetFlags(item)
          const ready  = isReadyToSchedule(item)
          const imgStyleCls = IMAGE_STATUS_STYLE[item.image_status ?? ''] ?? 'bg-portal-row-hover text-portal-muted'
          const imgLabel = IMAGE_STATUS_OPTIONS.find(o => o.value === item.image_status)?.label ?? '— Not set —'

          return (
            <div
              key={item.id}
              className="bg-white border border-portal-border rounded-lg overflow-hidden"
              style={{ borderLeft: `3px solid ${accent}` }}
            >
              {/* Card header */}
              <div className="px-5 py-4 border-b border-gray-50 flex items-start gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-sm">{tc?.emoji ?? '📝'}</span>
                    <span className="text-[10px] font-bold text-portal-muted uppercase tracking-wide">{tc?.shortLabel ?? item.submission_type}</span>
                    <span className="text-[10px] bg-portal-row-hover text-portal-sub px-1.5 py-0.5 rounded font-semibold">{item.target_publication.toUpperCase()}</span>
                    {item.approved_social     && <span className="text-[10px] bg-portal-green-lt text-portal-green px-1.5 py-0.5 rounded font-bold">✓ Approved</span>}
                    {item.social_planner_ready && <span className="text-[10px] bg-portal-blue-lt text-portal-blue px-1.5 py-0.5 rounded font-bold">Planner Ready</span>}
                    {item.exported_to_social_planner && !item.social_promoted_at && (
                      <span className="text-[10px] bg-portal-blue-lt text-portal-blue px-1.5 py-0.5 rounded font-bold">Exported</span>
                    )}
                    {item.social_promoted_at && (
                      <span className="text-[10px] bg-portal-blue-lt text-portal-blue px-1.5 py-0.5 rounded font-bold">Promoted</span>
                    )}
                    {ready
                      ? <span className="text-[10px] bg-portal-green-lt text-portal-green px-1.5 py-0.5 rounded font-bold border border-portal-green/30">✓ Ready</span>
                      : <span className="text-[10px] bg-portal-amber-lt text-portal-amber px-1.5 py-0.5 rounded font-bold border border-portal-amber/30">Needs work</span>
                    }
                  </div>
                  <p className="text-sm font-bold text-portal-text truncate">{title}</p>
                  {item.social_publish_date && (
                    <p className="text-[11px] text-portal-muted mt-0.5">Publish: {item.social_publish_date}</p>
                  )}
                </div>

                {/* Asset flags */}
                {flags.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {flags.map(f => (
                      <span
                        key={f.label}
                        className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                          f.level === 'error' ? 'bg-portal-red-lt text-portal-red' : 'bg-portal-amber-lt text-portal-amber'
                        }`}
                      >
                        {f.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Captions */}
              <div className="px-5 py-4 space-y-4 border-b border-gray-50">
                {item.caption_facebook && (
                  <div>
                    <p className="text-[10px] font-bold text-portal-blue uppercase tracking-wide mb-1">Facebook</p>
                    <p className="text-xs text-portal-text leading-relaxed whitespace-pre-line">{item.caption_facebook}</p>
                  </div>
                )}
                {item.caption_instagram && (
                  <div>
                    <p className="text-[10px] font-bold text-portal-red uppercase tracking-wide mb-1">Instagram</p>
                    <p className="text-xs text-portal-text leading-relaxed whitespace-pre-line">{item.caption_instagram}</p>
                  </div>
                )}
                {item.caption_sms && (
                  <div>
                    <p className="text-[10px] font-bold text-portal-green uppercase tracking-wide mb-1">SMS / Short</p>
                    <p className="text-xs text-portal-text leading-relaxed">{item.caption_sms}</p>
                  </div>
                )}
                {!item.caption_facebook && !item.caption_instagram && !item.caption_sms && (
                  <p className="text-xs text-portal-muted italic">
                    No captions yet. Generate them in the{' '}
                    <Link href="/admin/editorial/approval" className="text-portal-blue hover:underline">Approval Desk</Link>.
                  </p>
                )}
                {item.social_hashtags && (
                  <p className="text-[11px] text-portal-sub font-mono">{hashtagStr(item.social_hashtags)}</p>
                )}
                {item.social_link && (
                  <p className="text-[11px] text-portal-sub">🔗 {item.social_link}</p>
                )}
                {item.social_image_note && (
                  <p className="text-[11px] text-portal-sub italic">🖼 {item.social_image_note}</p>
                )}
              </div>

              {/* Actions row */}
              <div className="px-5 py-3.5 flex items-center gap-3 flex-wrap bg-portal-bg/50">

                {/* Image status */}
                <form action={updateImageStatus} className="flex items-center gap-1.5">
                  <input type="hidden" name="id" value={item.id} />
                  <label className="text-[10px] font-bold text-portal-muted uppercase tracking-wide shrink-0">Image</label>
                  <select
                    name="image_status"
                    defaultValue={item.image_status ?? ''}
                    className={`text-xs border border-portal-border rounded-lg px-2 py-1 outline-none ${imgStyleCls}`}
                  >
                    {IMAGE_STATUS_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                  <button type="submit" className="text-xs px-2.5 py-1 bg-white border border-portal-border rounded-lg text-portal-sub hover:bg-portal-bg font-semibold">
                    Save
                  </button>
                </form>

                <div className="flex-1" />

                {/* Mark Exported */}
                {!item.exported_to_social_planner ? (
                  <form action={markExported}>
                    <input type="hidden" name="id" value={item.id} />
                    <button type="submit" className="text-xs px-3 py-1.5 bg-portal-blue text-white rounded-lg font-semibold hover:bg-portal-navy">
                      Mark Exported
                    </button>
                  </form>
                ) : (
                  <form action={resetExported}>
                    <input type="hidden" name="id" value={item.id} />
                    <button type="submit" className="text-xs px-3 py-1.5 bg-white border border-indigo-200 text-portal-blue rounded-lg font-semibold hover:bg-portal-blue-lt">
                      Undo Export
                    </button>
                  </form>
                )}

                {/* Mark Promoted */}
                {!item.social_promoted_at ? (
                  <form action={markPromoted}>
                    <input type="hidden" name="id" value={item.id} />
                    <button type="submit" className="text-xs px-3 py-1.5 bg-portal-blue text-white rounded-lg font-semibold hover:bg-portal-navy">
                      Mark Promoted
                    </button>
                  </form>
                ) : (
                  <span className="text-[11px] text-portal-blue font-semibold">
                    Promoted {new Date(item.social_promoted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                )}

                <Link href={`/admin/editorial/approval?id=${item.id}`} className="text-xs text-portal-muted hover:text-portal-blue hover:underline font-semibold">
                  Edit →
                </Link>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Export panel ─────────────────────────────────────────────────── */}
      {exportItems.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-portal-text shrink-0">Export ({exportItems.length} posts)</h2>
            <div className="flex-1 h-px bg-portal-row-hover" />
            <p className="text-[11px] text-portal-muted shrink-0">Promoted items excluded from export</p>
          </div>

          {/* CSV */}
          <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-portal-sub">CSV — Spreadsheet / Import Format</h3>
                <p className="text-[11px] text-portal-muted">publish_date, channel, caption, link, hashtags, image_note, asset_status, source_title, content_type</p>
              </div>
              <span className="text-[10px] bg-portal-green-lt text-portal-green px-2 py-0.5 rounded font-semibold shrink-0">One row per channel</span>
            </div>
            <div className="p-4">
              <textarea
                defaultValue={csvText}
                readOnly
                rows={Math.min(exportItems.length * 2 + 2, 18)}
                className="w-full text-xs font-mono border border-portal-border rounded-lg px-3 py-2.5 bg-portal-bg resize-vertical outline-none focus:border-indigo-300 transition-colors leading-relaxed"
              />
            </div>
          </div>

          {/* GHL */}
          <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-50 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-portal-sub">GHL Social Planner Format</h3>
                <p className="text-[11px] text-portal-muted">Copy each block into GHL Social Planner, one post at a time</p>
              </div>
              <span className="text-[10px] bg-portal-blue-lt text-portal-blue px-2 py-0.5 rounded font-semibold shrink-0">Manual paste</span>
            </div>
            <div className="p-4">
              <textarea
                defaultValue={ghlText}
                readOnly
                rows={Math.min(exportItems.length * 12 + 4, 30)}
                className="w-full text-xs font-mono border border-portal-border rounded-lg px-3 py-2.5 bg-portal-bg resize-vertical outline-none focus:border-indigo-300 transition-colors leading-relaxed"
              />
            </div>
          </div>

          {/* Reminder */}
          <div className="bg-portal-amber-lt border border-portal-amber/30 rounded-lg px-5 py-4">
            <p className="text-xs font-bold text-portal-amber mb-1">After pasting into GHL:</p>
            <ol className="text-xs text-portal-amber space-y-0.5 list-decimal list-inside">
              <li>Verify caption, date, and channel in GHL before scheduling.</li>
              <li>Return here and click <strong>Mark Exported</strong> on each post you have queued.</li>
              <li>After posts actually go live, click <strong>Mark Promoted</strong> to close the loop.</li>
            </ol>
          </div>
        </div>
      )}

      {/* ── Empty state (no items at all) ────────────────────────────────── */}
      {allItems.length === 0 && (
        <div className="bg-white border border-portal-border rounded-lg px-6 py-16 text-center">
          <p className="text-2xl mb-3">📱</p>
          <p className="text-portal-sub font-semibold text-sm mb-1">No approved social posts yet</p>
          <p className="text-xs text-portal-muted">
            Approve posts for social in the{' '}
            <Link href="/admin/editorial/approval" className="text-portal-blue hover:underline">Approval Desk</Link>{' '}
            or flag content as social_queue in the{' '}
            <Link href="/admin/distribution?view=social" className="text-portal-blue hover:underline">Distribution Social view</Link>.
          </p>
        </div>
      )}

    </main>
  )
}
