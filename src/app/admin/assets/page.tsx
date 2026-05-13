// ── /admin/assets ──────────────────────────────────────────────────────────────
// Media Asset & Creative Operations hub.
// Tracks photos, graphics, logos, and all creative assets across the ecosystem.
// Surfaces readiness gaps, Canva work queue, sponsor asset health, and
// submission photos that still need design attention.

import type { Metadata } from 'next'
import Link              from 'next/link'
import { redirect }      from 'next/navigation'
import { createClient }  from '@/lib/supabase/server'
import { SUBMISSION_TYPES } from '@/lib/submissions'

export const metadata: Metadata = { title: 'Media Assets — Admin' }

// ── Types ─────────────────────────────────────────────────────────────────────

interface MediaAsset {
  id:                      string
  filename:                string
  title:                   string | null
  alt_text:                string | null
  source_attribution:      string | null
  storage_url:             string
  thumbnail_url:           string | null
  asset_type:              string
  content_category:        string | null
  publication:             string | null
  upload_source:           string
  tags:                    string[] | null
  width_px:                number | null
  height_px:               number | null
  file_size_bytes:         number | null
  status:                  string
  used_on_homepage:        boolean
  used_in_article:         boolean
  used_in_guide:           boolean
  used_in_newsletter:      boolean
  used_on_social:          boolean
  used_in_print:           boolean
  used_in_family_favorites:boolean
  used_in_sponsor_section: boolean
  linked_submission_id:    string | null
  linked_advertiser_id:    string | null
  linked_guide_slug:       string | null
  needs_canva_graphic:     boolean
  canva_link:              string | null
  assigned_designer:       string | null
  graphic_requested_at:    string | null
  graphic_completed_at:    string | null
  needs_quote_graphic:     boolean
  needs_social_square:     boolean
  needs_print_crop:        boolean
  needs_homepage_hero:     boolean
  has_web_crop:            boolean
  has_social_crop:         boolean
  has_print_crop:          boolean
  permission_confirmed:    boolean
  created_at:              string
  updated_at:              string
}

interface SubmissionWithPhotos {
  id:                   string
  submission_type:      string
  working_title:        string | null
  related_person_name:  string | null
  related_business_name:string | null
  photo_urls:           Array<{ url: string }>
  target_publication:   string
  status:               string
  image_status:         string | null
  approved_social:      boolean
  created_at:           string
}

// ── Static config ─────────────────────────────────────────────────────────────

const VIEWS = [
  { key: 'library',     label: 'Library',      icon: '🖼️' },
  { key: 'design',      label: 'Design Queue', icon: '🎨' },
  { key: 'sponsor',     label: 'Sponsor',      icon: '🤝' },
  { key: 'submissions', label: 'Submissions',  icon: '📤' },
  { key: 'readiness',   label: 'Readiness',    icon: '✅' },
] as const
type ViewKey = (typeof VIEWS)[number]['key']

const CATEGORIES = [
  { value: 'all',              label: 'All Categories' },
  { value: 'editorial',        label: 'Editorial'      },
  { value: 'sponsor',          label: 'Sponsor'        },
  { value: 'social',           label: 'Social'         },
  { value: 'guide',            label: 'Guide'          },
  { value: 'print',            label: 'Print'          },
  { value: 'event',            label: 'Event'          },
  { value: 'school',           label: 'School'         },
  { value: 'family-favorites', label: 'Fam Favs'       },
]

const STATUS_LABELS: Record<string, string> = {
  uploaded:     'Uploaded',
  needs_review: 'Needs Review',
  approved:     'Approved',
  needs_graphic:'Needs Graphic',
  social_ready: 'Social Ready',
  print_ready:  'Print Ready',
  archived:     'Archived',
}

const STATUS_STYLE: Record<string, string> = {
  uploaded:     'bg-gray-100 text-gray-600',
  needs_review: 'bg-amber-100 text-amber-700',
  approved:     'bg-green-100 text-green-700',
  needs_graphic:'bg-orange-100 text-orange-700',
  social_ready: 'bg-blue-100 text-blue-700',
  print_ready:  'bg-purple-100 text-purple-700',
  archived:     'bg-gray-50 text-gray-400',
}

const TYPE_ICONS: Record<string, string> = {
  photo:       '📷',
  graphic:     '🎨',
  logo:        '🏷️',
  illustration:'🖌️',
  document:    '📄',
}

const CATEGORY_COLORS: Record<string, string> = {
  editorial:        '#374151',
  sponsor:          '#7c3aed',
  social:           '#2563eb',
  guide:            '#16a34a',
  print:            '#92400e',
  event:            '#0891b2',
  school:           '#c4622d',
  'family-favorites':'#d97706',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function previewSrc(asset: MediaAsset): string | null {
  return asset.thumbnail_url || asset.storage_url || null
}

function needsDesign(asset: MediaAsset): boolean {
  return asset.needs_canva_graphic || asset.needs_social_square ||
         asset.needs_print_crop    || asset.needs_homepage_hero  ||
         asset.needs_quote_graphic
}

function designNeeds(asset: MediaAsset): string[] {
  const n: string[] = []
  if (asset.needs_canva_graphic) n.push('Canva graphic')
  if (asset.needs_social_square) n.push('Social square')
  if (asset.needs_print_crop)    n.push('Print crop')
  if (asset.needs_homepage_hero) n.push('Hero crop')
  if (asset.needs_quote_graphic) n.push('Quote graphic')
  return n
}

function usageList(asset: MediaAsset): string[] {
  const u: string[] = []
  if (asset.used_on_homepage)         u.push('Homepage')
  if (asset.used_in_article)          u.push('Article')
  if (asset.used_in_guide)            u.push('Guide')
  if (asset.used_in_newsletter)       u.push('Newsletter')
  if (asset.used_on_social)           u.push('Social')
  if (asset.used_in_print)            u.push('Print')
  if (asset.used_in_family_favorites) u.push('Fam Favs')
  if (asset.used_in_sponsor_section)  u.push('Sponsor')
  return u
}

function readinessScore(asset: MediaAsset): number {
  let score = 0
  if (asset.status === 'approved' || asset.status === 'social_ready' || asset.status === 'print_ready') score += 40
  if (asset.alt_text)               score += 20
  if (asset.permission_confirmed)   score += 20
  if (asset.has_web_crop)           score += 10
  if (asset.has_social_crop)        score += 10
  return Math.min(score, 100)
}

function fileSizeLabel(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024)       return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function submissionTitle(sub: SubmissionWithPhotos): string {
  if (sub.working_title) return sub.working_title
  const entity = sub.related_person_name ?? sub.related_business_name
  const tc = SUBMISSION_TYPES.find(t => t.type === sub.submission_type)
  if (entity) return `${tc?.shortLabel ?? sub.submission_type}: ${entity}`
  return tc?.label ?? sub.submission_type
}

// ── Server actions ────────────────────────────────────────────────────────────

async function quickStatusUpdate(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const id     = formData.get('id')     as string
  const status = formData.get('status') as string
  await supabase.from('media_assets').update({ status }).eq('id', id)
  redirect('/admin/assets?view=library')
}

async function addToLibrary(formData: FormData) {
  'use server'
  const supabase      = await createClient()
  const photoUrl      = formData.get('photo_url')      as string
  const submissionId  = formData.get('submission_id')  as string
  const titleHint     = (formData.get('title_hint')    as string) || null
  const filename      = photoUrl.split('/').pop()?.split('?')[0] || 'submission-photo.jpg'

  await supabase.from('media_assets').insert({
    filename,
    title:                titleHint,
    storage_url:          photoUrl,
    thumbnail_url:        photoUrl,
    asset_type:           'photo',
    content_category:     'editorial',
    upload_source:        'submission',
    linked_submission_id: submissionId,
    status:               'needs_review',
  })
  redirect('/admin/assets?view=submissions')
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function AssetCard({ asset }: { asset: MediaAsset }) {
  const preview  = previewSrc(asset)
  const usage    = usageList(asset)
  const catColor = CATEGORY_COLORS[asset.content_category ?? ''] ?? '#374151'
  const score    = readinessScore(asset)

  return (
    <Link
      href={`/admin/assets/${asset.id}`}
      className="bg-white border border-gray-100 rounded-xl overflow-hidden hover:border-gray-300 hover:shadow-sm transition-all group block"
    >
      {/* Thumbnail */}
      <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt={asset.alt_text || asset.title || asset.filename}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full gap-1">
            <span className="text-3xl">{TYPE_ICONS[asset.asset_type] ?? '🖼️'}</span>
            <span className="text-[10px] text-gray-400">{asset.asset_type}</span>
          </div>
        )}
        {/* Overlays */}
        <div className="absolute top-2 left-2">
          <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${STATUS_STYLE[asset.status] ?? 'bg-gray-100 text-gray-500'}`}>
            {STATUS_LABELS[asset.status] ?? asset.status}
          </span>
        </div>
        {needsDesign(asset) && (
          <div className="absolute top-2 right-2">
            <span className="text-[10px] bg-orange-500 text-white px-1.5 py-0.5 rounded font-bold">🎨 Design</span>
          </div>
        )}
        {!asset.permission_confirmed && asset.asset_type === 'photo' && (
          <div className="absolute bottom-2 right-2">
            <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded font-bold">No permission</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-xs font-semibold text-gray-800 truncate" title={asset.title || asset.filename}>
          {asset.title || asset.filename}
        </p>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          {asset.content_category && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
              style={{ backgroundColor: catColor + '18', color: catColor }}
            >
              {asset.content_category}
            </span>
          )}
          {asset.publication && (
            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-semibold">
              {asset.publication.toUpperCase()}
            </span>
          )}
          {asset.width_px && asset.height_px && (
            <span className="text-[10px] text-gray-400">{asset.width_px}×{asset.height_px}</span>
          )}
        </div>
        {usage.length > 0 && (
          <p className="text-[10px] text-gray-400 mt-1 truncate">Used: {usage.join(', ')}</p>
        )}
        <div className="flex items-center justify-between mt-2">
          <div className="flex-1 bg-gray-100 rounded-full h-1 mr-2">
            <div
              className="h-1 rounded-full transition-all"
              style={{ width: `${score}%`, backgroundColor: score >= 80 ? '#16a34a' : score >= 50 ? '#d97706' : '#ef4444' }}
            />
          </div>
          <span className="text-[10px] text-gray-400 shrink-0">{score}%</span>
        </div>
      </div>
    </Link>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; cat?: string; status?: string }>
}) {
  const { view: rawView = 'library', cat: filterCat = 'all', status: filterStatus = 'all' } = await searchParams
  const activeView = (VIEWS.some(v => v.key === rawView) ? rawView : 'library') as ViewKey

  const supabase = await createClient()

  // ── Parallel queries ──────────────────────────────────────────────────────

  const [
    { data: rawAssets },
    { data: rawSubs },
    { data: rawLinked },
  ] = await Promise.all([
    supabase
      .from('media_assets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500),
    supabase
      .from('community_submissions')
      .select('id, submission_type, working_title, related_person_name, related_business_name, photo_urls, target_publication, status, image_status, approved_social, created_at')
      .not('photo_urls', 'is', null)
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('media_assets')
      .select('linked_submission_id')
      .not('linked_submission_id', 'is', null),
  ])

  const allAssets = (rawAssets ?? []) as unknown as MediaAsset[]
  const allSubs   = ((rawSubs ?? []) as unknown as SubmissionWithPhotos[])
    .filter(s => Array.isArray(s.photo_urls) && s.photo_urls.length > 0)
  const linkedSubIds = new Set(
    (rawLinked ?? []).map((r: { linked_submission_id: string }) => r.linked_submission_id)
  )

  // ── Filter assets ─────────────────────────────────────────────────────────

  let viewAssets = allAssets
  if (filterCat !== 'all')    viewAssets = viewAssets.filter(a => a.content_category === filterCat)
  if (filterStatus !== 'all') viewAssets = viewAssets.filter(a => a.status === filterStatus)

  // ── Computed groups ───────────────────────────────────────────────────────

  const designQueue    = allAssets.filter(needsDesign).filter(a => !a.graphic_completed_at)
  const sponsorAssets  = allAssets.filter(a => a.content_category === 'sponsor' || !!a.linked_advertiser_id)
  const untrackedSubs  = allSubs.filter(s => !linkedSubIds.has(s.id))
  const trackedSubs    = allSubs.filter(s => linkedSubIds.has(s.id))

  // Readiness stats
  const noAlt        = allAssets.filter(a => !a.alt_text && a.status !== 'archived')
  const noPermission = allAssets.filter(a => !a.permission_confirmed && a.asset_type === 'photo' && a.status !== 'archived')
  const noWebCrop    = allAssets.filter(a => !a.has_web_crop && a.status === 'approved')
  const noSocialCrop = allAssets.filter(a => !a.has_social_crop && (a.status === 'approved' || a.status === 'social_ready'))
  const needsReview  = allAssets.filter(a => a.status === 'needs_review' || a.status === 'uploaded')

  // Stats strip counts
  const counts = {
    total:    allAssets.length,
    approved: allAssets.filter(a => ['approved','social_ready','print_ready'].includes(a.status)).length,
    design:   designQueue.length,
    review:   needsReview.length,
    subs:     allSubs.length,
  }

  // ── URL helpers ───────────────────────────────────────────────────────────

  function viewHref(v: string) {
    return `/admin/assets?view=${v}`
  }
  function filterHref(newCat?: string, newStatus?: string) {
    const c = newCat    ?? filterCat
    const s = newStatus ?? filterStatus
    return `/admin/assets?view=library&cat=${c}&status=${s}`
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="p-6 max-w-[1200px] mx-auto space-y-6 pb-16">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Media Assets</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Creative operations hub — photos, graphics, logos, and all ecosystem assets.
          </p>
        </div>
        <div className="text-xs text-gray-400 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 shrink-0">
          📤 Upload via Supabase Storage, then register here
        </div>
      </div>

      {/* ── Stats strip ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {([
          { label: 'Total Assets',   val: counts.total,    color: '#374151', v: 'library'     },
          { label: 'Approved',       val: counts.approved, color: '#16a34a', v: 'library'     },
          { label: 'Design Queue',   val: counts.design,   color: '#ea580c', v: 'design'      },
          { label: 'Needs Review',   val: counts.review,   color: '#d97706', v: 'library'     },
          { label: 'Sub Photos',     val: counts.subs,     color: '#7c3aed', v: 'submissions' },
        ] as const).map(({ label, val, color, v }) => (
          <Link
            key={label}
            href={viewHref(v)}
            className="bg-white border border-gray-100 rounded-xl px-4 py-3 text-center hover:border-gray-200 hover:shadow-sm transition-all"
          >
            <p className="text-2xl font-bold" style={{ color }}>{val}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{label}</p>
          </Link>
        ))}
      </div>

      {/* ── View tabs ──────────────────────────────────────────────────── */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {VIEWS.map(v => (
          <Link
            key={v.key}
            href={viewHref(v.key)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeView === v.key
                ? 'bg-gray-900 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span>{v.icon}</span>
            <span>{v.label}</span>
          </Link>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          VIEW: LIBRARY
      ════════════════════════════════════════════════════════════════════ */}
      {activeView === 'library' && (
        <div className="space-y-5">
          {/* Filter bar */}
          <div className="flex flex-wrap gap-3 items-start">
            {/* Category */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Category</p>
              <div className="flex gap-1 flex-wrap">
                {CATEGORIES.map(c => (
                  <Link
                    key={c.value}
                    href={filterHref(c.value)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                      filterCat === c.value
                        ? 'bg-gray-900 text-white'
                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {c.label}
                  </Link>
                ))}
              </div>
            </div>
            {/* Status */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">Status</p>
              <div className="flex gap-1 flex-wrap">
                {[{ value: 'all', label: 'All' }, ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }))].map(s => (
                  <Link
                    key={s.value}
                    href={filterHref(undefined, s.value)}
                    className={`text-[11px] px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                      filterStatus === s.value
                        ? 'bg-gray-900 text-white'
                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {s.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Results count */}
          <p className="text-xs text-gray-400">
            {viewAssets.length} asset{viewAssets.length !== 1 ? 's' : ''}
            {filterCat !== 'all' || filterStatus !== 'all' ? ' (filtered)' : ''}
          </p>

          {/* Grid */}
          {viewAssets.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {viewAssets.map(asset => (
                <AssetCard key={asset.id} asset={asset} />
              ))}
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-2xl px-6 py-16 text-center">
              {allAssets.length === 0 ? (
                <>
                  <p className="text-3xl mb-3">🖼️</p>
                  <p className="text-gray-600 font-semibold text-sm mb-2">No assets registered yet</p>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto mb-4">
                    Register assets by importing submission photos (Submissions tab) or manually entering asset URLs after uploading to Supabase Storage.
                  </p>
                  <Link href={viewHref('submissions')} className="text-xs px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700">
                    Import Submission Photos →
                  </Link>
                </>
              ) : (
                <p className="text-gray-400 text-sm">No assets match this filter.</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          VIEW: DESIGN QUEUE
      ════════════════════════════════════════════════════════════════════ */}
      {activeView === 'design' && (
        <div className="space-y-4">
          <div className="bg-orange-50 border border-orange-100 rounded-2xl px-5 py-3">
            <p className="text-xs text-orange-800 font-medium">
              🎨 These assets need creative work before they are ready to publish. Assign a designer, add the Canva link, and mark complete when done.
            </p>
          </div>

          {designQueue.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-2xl px-6 py-12 text-center">
              <p className="text-2xl mb-2">✅</p>
              <p className="text-sm text-gray-500 font-semibold">Design queue is clear</p>
            </div>
          ) : (
            <div className="space-y-3">
              {designQueue.map(asset => {
                const preview  = previewSrc(asset)
                const needs    = designNeeds(asset)
                return (
                  <div key={asset.id} className="bg-white border border-gray-100 rounded-xl overflow-hidden hover:border-gray-200 transition-colors">
                    <div className="flex items-start gap-4 p-4">
                      {/* Thumbnail */}
                      <div className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                        {preview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={preview} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex items-center justify-center h-full text-2xl">
                            {TYPE_ICONS[asset.asset_type] ?? '🖼️'}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-800 truncate">{asset.title || asset.filename}</p>
                          <Link href={`/admin/assets/${asset.id}`} className="text-xs text-indigo-600 hover:underline font-semibold shrink-0">
                            Manage →
                          </Link>
                        </div>
                        <div className="flex gap-1.5 mt-1 flex-wrap">
                          {needs.map(n => (
                            <span key={n} className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-semibold">{n}</span>
                          ))}
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400 flex-wrap">
                          {asset.assigned_designer && <span>👤 {asset.assigned_designer}</span>}
                          {asset.canva_link && (
                            <a href={asset.canva_link} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Canva →</a>
                          )}
                          {asset.graphic_requested_at && (
                            <span>Requested {new Date(asset.graphic_requested_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* AI Future */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">AI Assist — Coming Soon</p>
            <div className="flex gap-2 flex-wrap">
              {['Suggest Crop Type', 'Generate Alt Text', 'Detect Low Quality', 'Suggest Social Image'].map(label => (
                <button key={label} disabled
                  className="text-xs px-3 py-1.5 border border-gray-100 rounded-lg text-gray-400 cursor-not-allowed flex items-center gap-1.5">
                  {label}
                  <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded font-medium">Soon</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          VIEW: SPONSOR ASSETS
      ════════════════════════════════════════════════════════════════════ */}
      {activeView === 'sponsor' && (
        <div className="space-y-4">
          <div className="bg-purple-50 border border-purple-100 rounded-2xl px-5 py-3">
            <p className="text-xs text-purple-800 font-medium">
              🤝 Sponsor logos and brand assets. Check that logos are current, approved, and usable at correct resolution before placing in guides or print.
            </p>
          </div>

          {/* Sponsor asset gaps */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-sm font-bold text-gray-700 shrink-0">Sponsor Assets ({sponsorAssets.length})</h2>
              <div className="flex-1 h-px bg-gray-100" />
            </div>

            {sponsorAssets.length === 0 ? (
              <div className="bg-white border border-gray-100 rounded-2xl px-6 py-12 text-center">
                <p className="text-2xl mb-2">🤝</p>
                <p className="text-sm text-gray-500 font-semibold mb-1">No sponsor assets registered</p>
                <p className="text-xs text-gray-400">
                  Add sponsor logos and brand assets via the Library view, tagging them as category &ldquo;sponsor&rdquo;.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {sponsorAssets.map(asset => <AssetCard key={asset.id} asset={asset} />)}
              </div>
            )}
          </div>

          {/* Sponsor asset guidance */}
          <div className="bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 space-y-2">
            <p className="text-xs font-bold text-gray-500">Sponsor Asset Checklist</p>
            <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
              <li>Logo received in high-resolution (PNG or SVG preferred)</li>
              <li>Correct colors verified against sponsor brand guide</li>
              <li>Approved by operator — no unapproved versions in use</li>
              <li>Expiry or renewal date noted if logo is season-specific</li>
              <li>Alt text set for web accessibility</li>
            </ul>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          VIEW: SUBMISSION PHOTOS
      ════════════════════════════════════════════════════════════════════ */}
      {activeView === 'submissions' && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-indigo-50 border border-indigo-100 rounded-2xl px-5 py-3">
              <p className="text-xs text-indigo-800 font-medium">
                📤 Photos submitted with community submissions. Import to the Asset Library to track readiness, add alt text, confirm permissions, and coordinate design.
              </p>
            </div>
            <div className="shrink-0 text-center">
              <p className="text-xl font-bold text-orange-600">{untrackedSubs.length}</p>
              <p className="text-[10px] text-gray-400">Untracked</p>
            </div>
          </div>

          {/* Untracked submissions */}
          {untrackedSubs.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-sm font-bold text-gray-700 shrink-0">Not Yet in Library ({untrackedSubs.length})</h2>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
              <div className="space-y-3">
                {untrackedSubs.map(sub => {
                  const tc    = SUBMISSION_TYPES.find(t => t.type === sub.submission_type)
                  const title = submissionTitle(sub)
                  return (
                    <div key={sub.id} className="bg-white border border-gray-100 rounded-xl p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <span className="text-lg">{tc?.emoji ?? '📝'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{title}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[10px] text-gray-400">{tc?.shortLabel ?? sub.submission_type}</span>
                            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-semibold">{sub.target_publication.toUpperCase()}</span>
                            {sub.image_status && (
                              <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-semibold">{sub.image_status.replace(/_/g, ' ')}</span>
                            )}
                          </div>
                        </div>
                        <Link href={`/admin/community/${sub.id}`} className="text-xs text-gray-400 hover:text-indigo-600 hover:underline font-semibold shrink-0">
                          Submission →
                        </Link>
                      </div>
                      {/* Photo thumbnails + import forms */}
                      <div className="flex gap-2 flex-wrap">
                        {sub.photo_urls.map((photo, pi) => (
                          <div key={pi} className="relative group">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={photo.url}
                              alt={`Photo ${pi + 1} from ${title}`}
                              className="w-24 h-24 object-cover rounded-lg border border-gray-200"
                            />
                            <form action={addToLibrary} className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                              <input type="hidden" name="photo_url"      value={photo.url} />
                              <input type="hidden" name="submission_id"  value={sub.id} />
                              <input type="hidden" name="title_hint"     value={`${title} — Photo ${pi + 1}`} />
                              <button type="submit" className="text-[10px] bg-white text-gray-800 px-2 py-1 rounded font-bold hover:bg-indigo-50">
                                + Library
                              </button>
                            </form>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Already tracked */}
          {trackedSubs.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-sm font-bold text-gray-400 shrink-0">In Library ({trackedSubs.length})</h2>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
              <div className="space-y-2">
                {trackedSubs.map(sub => {
                  const tc    = SUBMISSION_TYPES.find(t => t.type === sub.submission_type)
                  const title = submissionTitle(sub)
                  return (
                    <div key={sub.id} className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 flex items-center gap-3">
                      <span>{tc?.emoji ?? '📝'}</span>
                      <p className="flex-1 text-xs font-medium text-gray-600 truncate">{title}</p>
                      <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-semibold">✓ In Library</span>
                      <Link href={`/admin/community/${sub.id}`} className="text-[11px] text-gray-400 hover:underline">Submission →</Link>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {allSubs.length === 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl px-6 py-12 text-center">
              <p className="text-2xl mb-2">📤</p>
              <p className="text-sm text-gray-500 font-semibold">No submission photos found</p>
              <p className="text-xs text-gray-400 mt-1">Photos appear here when community submissions include photo uploads.</p>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════════
          VIEW: READINESS
      ════════════════════════════════════════════════════════════════════ */}
      {activeView === 'readiness' && (
        <div className="space-y-5">
          {/* Readiness score cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {([
              { label: 'Missing Alt Text',    count: noAlt.length,        color: '#ef4444', icon: '♿' },
              { label: 'No Permission',       count: noPermission.length, color: '#f97316', icon: '🔒' },
              { label: 'No Web Crop',         count: noWebCrop.length,    color: '#d97706', icon: '🌐' },
              { label: 'No Social Crop',      count: noSocialCrop.length, color: '#7c3aed', icon: '📱' },
            ] as const).map(({ label, count, color, icon }) => (
              <div key={label} className="bg-white border border-gray-100 rounded-xl px-4 py-4 text-center">
                <p className="text-2xl mb-1">{icon}</p>
                <p className="text-2xl font-bold" style={{ color }}>{count}</p>
                <p className="text-[11px] text-gray-400 mt-0.5 leading-tight">{label}</p>
              </div>
            ))}
          </div>

          {/* Overall readiness bar */}
          {allAssets.length > 0 && (() => {
            const total   = allAssets.filter(a => a.status !== 'archived').length || 1
            const fullyOk = allAssets.filter(a =>
              a.status !== 'archived' && a.alt_text && a.permission_confirmed && a.has_web_crop
            ).length
            const pct = Math.round((fullyOk / total) * 100)
            return (
              <div className="bg-white border border-gray-100 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-700">Overall Readiness</p>
                  <p className="text-sm font-bold" style={{ color: pct >= 80 ? '#16a34a' : pct >= 50 ? '#d97706' : '#ef4444' }}>{pct}%</p>
                </div>
                <div className="bg-gray-100 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: pct >= 80 ? '#16a34a' : pct >= 50 ? '#d97706' : '#ef4444' }}
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5">{fullyOk} of {total} assets have alt text + permission + web crop</p>
              </div>
            )
          })()}

          {/* Action lists */}
          {[
            { title: 'Missing Alt Text', items: noAlt,        cta: 'Add alt text for accessibility and SEO.' },
            { title: 'No Permission Confirmed', items: noPermission, cta: 'Confirm photo permission before publishing personal images.' },
            { title: 'Needs Web Crop', items: noWebCrop,      cta: 'Assets approved but not confirmed web-ready.' },
          ].map(({ title, items, cta }) => items.length > 0 && (
            <div key={title}>
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-sm font-bold text-gray-700 shrink-0">{title} ({items.length})</h2>
                <div className="flex-1 h-px bg-gray-100" />
                <p className="text-[11px] text-gray-400 hidden sm:block">{cta}</p>
              </div>
              <div className="space-y-2">
                {items.slice(0, 10).map(asset => (
                  <div key={asset.id} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-2.5">
                    <div className="w-8 h-8 rounded bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center">
                      {previewSrc(asset)
                        ? <img src={previewSrc(asset)!} alt="" className="w-full h-full object-cover" />  // eslint-disable-line @next/next/no-img-element
                        : <span className="text-sm">{TYPE_ICONS[asset.asset_type] ?? '🖼️'}</span>
                      }
                    </div>
                    <p className="flex-1 text-xs font-medium text-gray-700 truncate">{asset.title || asset.filename}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${STATUS_STYLE[asset.status] ?? ''}`}>
                      {STATUS_LABELS[asset.status] ?? asset.status}
                    </span>
                    <Link href={`/admin/assets/${asset.id}`} className="text-xs text-indigo-600 hover:underline font-semibold shrink-0">
                      Fix →
                    </Link>
                  </div>
                ))}
                {items.length > 10 && (
                  <p className="text-[11px] text-gray-400 text-center py-1">+ {items.length - 10} more — use Library filter to see all</p>
                )}
              </div>
            </div>
          ))}

          {allAssets.length === 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl px-6 py-12 text-center">
              <p className="text-sm text-gray-400">No assets to check yet. Import photos from the Submissions tab to get started.</p>
            </div>
          )}

          {/* AI Future hooks */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">AI Readiness Tools — Coming Soon</p>
            <div className="flex gap-2 flex-wrap">
              {['Auto-Generate Alt Text', 'Detect Low Resolution', 'Suggest Best Image', 'Identify Missing Coverage'].map(label => (
                <button key={label} disabled
                  className="text-xs px-3 py-1.5 border border-gray-100 rounded-lg text-gray-400 cursor-not-allowed flex items-center gap-1.5">
                  {label}
                  <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded font-medium">Soon</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </main>
  )
}
