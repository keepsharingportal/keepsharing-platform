// ── /admin/assets/[id] ────────────────────────────────────────────────────────
// Individual asset detail, edit, and coordination page.
// Operators review the asset, set status, fill readiness checklist,
// coordinate Canva/design work, and track usage locations.

import type { Metadata } from 'next'
import Link              from 'next/link'
import { notFound }      from 'next/navigation'
import { redirect }      from 'next/navigation'
import { createClient }  from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Asset Detail — Admin' }

// ── Types ─────────────────────────────────────────────────────────────────────

interface MediaAsset {
  id:                      string
  filename:                string
  title:                   string | null
  description:             string | null
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

// ── Static config ─────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: 'uploaded',     label: 'Uploaded — Awaiting Review' },
  { value: 'needs_review', label: 'Needs Review'               },
  { value: 'approved',     label: 'Approved'                   },
  { value: 'needs_graphic',label: 'Needs Graphic'              },
  { value: 'social_ready', label: 'Social Ready'               },
  { value: 'print_ready',  label: 'Print Ready'                },
  { value: 'archived',     label: 'Archived'                   },
]

const STATUS_STYLE: Record<string, string> = {
  uploaded:     'bg-gray-100 text-gray-600',
  needs_review: 'bg-portal-amber-lt text-portal-amber',
  approved:     'bg-green-100 text-green-700',
  needs_graphic:'bg-orange-100 text-orange-700',
  social_ready: 'bg-portal-blue-lt text-portal-blue',
  print_ready:  'bg-purple-100 text-purple-700',
  archived:     'bg-gray-50 text-gray-400',
}

const CATEGORY_OPTIONS = [
  { value: '',               label: '— Not set —'      },
  { value: 'editorial',      label: 'Editorial'        },
  { value: 'sponsor',        label: 'Sponsor'          },
  { value: 'social',         label: 'Social'           },
  { value: 'guide',          label: 'Guide'            },
  { value: 'print',          label: 'Print'            },
  { value: 'event',          label: 'Event'            },
  { value: 'school',         label: 'School'           },
  { value: 'family-favorites','label': 'Family Favorites' },
]

const ASSET_TYPE_OPTIONS = [
  { value: 'photo',        label: '📷 Photo'         },
  { value: 'graphic',      label: '🎨 Graphic'       },
  { value: 'logo',         label: '🏷️ Logo'          },
  { value: 'illustration', label: '🖌️ Illustration'  },
  { value: 'document',     label: '📄 Document'      },
]

const PUBLICATION_OPTIONS = [
  { value: '',    label: '— All / Not set —'       },
  { value: 'rrp', label: 'River Region Parents'    },
  { value: 'mbp', label: 'Mobile Bay Parents'      },
  { value: 'aop', label: 'Auburn Opelika Parents'  },
  { value: 'esp', label: 'Eastern Shore Parents'   },
  { value: 'gpp', label: 'Greater Pensacola Parents'},
  { value: 'boom',label: 'River Region Boom'       },
  { value: 'all', label: 'All Publications'        },
]

// ── Server actions ────────────────────────────────────────────────────────────

async function saveMetadata(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const id = formData.get('id') as string
  await supabase.from('media_assets').update({
    title:             (formData.get('title')             as string) || null,
    description:       (formData.get('description')       as string) || null,
    alt_text:          (formData.get('alt_text')          as string) || null,
    source_attribution:(formData.get('source_attribution')as string) || null,
    asset_type:         formData.get('asset_type')        as string,
    content_category:  (formData.get('content_category') as string) || null,
    publication:       (formData.get('publication')       as string) || null,
    tags:              ((formData.get('tags') as string) || '').split(',').map(t => t.trim()).filter(Boolean),
    width_px:           parseInt((formData.get('width_px')  as string) || '0') || null,
    height_px:          parseInt((formData.get('height_px') as string) || '0') || null,
  }).eq('id', id)
  redirect(`/admin/assets/${id}`)
}

async function updateStatus(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const id     = formData.get('id')     as string
  const status = formData.get('status') as string
  await supabase.from('media_assets').update({ status }).eq('id', id)
  redirect(`/admin/assets/${id}`)
}

async function saveReadiness(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const id = formData.get('id') as string
  const bool = (key: string) => formData.get(key) === 'true'
  await supabase.from('media_assets').update({
    has_web_crop:         bool('has_web_crop'),
    has_social_crop:      bool('has_social_crop'),
    has_print_crop:       bool('has_print_crop'),
    permission_confirmed: bool('permission_confirmed'),
  }).eq('id', id)
  redirect(`/admin/assets/${id}`)
}

async function saveCanvaInfo(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const id = formData.get('id') as string
  const bool = (key: string) => formData.get(key) === 'true'
  const markDone = formData.get('mark_graphic_done') === 'true'
  await supabase.from('media_assets').update({
    needs_canva_graphic:  bool('needs_canva_graphic'),
    canva_link:          (formData.get('canva_link')         as string) || null,
    assigned_designer:   (formData.get('assigned_designer')  as string) || null,
    graphic_requested_at:(formData.get('graphic_requested_at') as string) || null,
    graphic_completed_at: markDone ? new Date().toISOString() : null,
    needs_quote_graphic:  bool('needs_quote_graphic'),
    needs_social_square:  bool('needs_social_square'),
    needs_print_crop:     bool('needs_print_crop'),
    needs_homepage_hero:  bool('needs_homepage_hero'),
  }).eq('id', id)
  redirect(`/admin/assets/${id}`)
}

async function saveUsage(formData: FormData) {
  'use server'
  const supabase = await createClient()
  const id = formData.get('id') as string
  const bool = (key: string) => formData.get(key) === 'true'
  await supabase.from('media_assets').update({
    used_on_homepage:         bool('used_on_homepage'),
    used_in_article:          bool('used_in_article'),
    used_in_guide:            bool('used_in_guide'),
    used_in_newsletter:       bool('used_in_newsletter'),
    used_on_social:           bool('used_on_social'),
    used_in_print:            bool('used_in_print'),
    used_in_family_favorites: bool('used_in_family_favorites'),
    used_in_sponsor_section:  bool('used_in_sponsor_section'),
  }).eq('id', id)
  redirect(`/admin/assets/${id}`)
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function CheckField({
  name, label, checked, formId,
}: {
  name: string; label: string; checked: boolean; formId: string
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer group">
      <input
        type="checkbox"
        name={name}
        value="true"
        form={formId}
        defaultChecked={checked}
        className="w-4 h-4 rounded border-gray-300 text-indigo-600 outline-none cursor-pointer"
      />
      {/* Hidden field for unchecked state — overridden by checkbox when checked */}
      <input type="hidden" name={name} value="false" form={formId} />
      <span className={`text-xs ${checked ? 'text-gray-800 font-semibold' : 'text-gray-500'} group-hover:text-gray-800 transition-colors`}>
        {label}
      </span>
    </label>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [
    { data: rawAsset },
    { data: rawSub },
  ] = await Promise.all([
    supabase.from('media_assets').select('*').eq('id', id).single(),
    // Will only have data if linked_submission_id is set — handled below
    supabase.from('media_assets').select('linked_submission_id, linked_advertiser_id, linked_guide_slug').eq('id', id).single(),
  ])

  if (!rawAsset) notFound()
  const asset = rawAsset as unknown as MediaAsset

  // Fetch linked content names if present
  let linkedSubTitle:  string | null = null
  let linkedAdvName:   string | null = null

  if (asset.linked_submission_id) {
    const { data: sub } = await supabase
      .from('community_submissions')
      .select('working_title, related_person_name, submission_type')
      .eq('id', asset.linked_submission_id)
      .single()
    if (sub) {
      linkedSubTitle = (sub as { working_title: string | null; related_person_name: string | null }).working_title
        ?? (sub as { related_person_name: string | null }).related_person_name
        ?? 'Community Submission'
    }
  }

  if (asset.linked_advertiser_id) {
    const { data: adv } = await supabase
      .from('advertiser_accounts')
      .select('business_name')
      .eq('id', asset.linked_advertiser_id)
      .single()
    if (adv) linkedAdvName = (adv as { business_name: string }).business_name
  }

  const preview      = asset.thumbnail_url || asset.storage_url
  const isImageUrl   = /\.(jpg|jpeg|png|gif|webp|svg|avif)(\?|$)/i.test(preview ?? '')
  const statusCls    = STATUS_STYLE[asset.status] ?? 'bg-gray-100 text-gray-500'
  const tagString    = (asset.tags ?? []).join(', ')

  return (
    <main className="p-6 max-w-[1100px] mx-auto pb-16">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/admin/assets" className="text-gray-400 hover:text-gray-700 text-sm font-medium shrink-0">
            ← Assets
          </Link>
          <span className="text-gray-300">/</span>
          <p className="text-sm font-semibold text-gray-800 truncate">{asset.title || asset.filename}</p>
          <span className={`text-[11px] px-2 py-0.5 rounded font-bold shrink-0 ${statusCls}`}>
            {STATUS_OPTIONS.find(s => s.value === asset.status)?.label.split(' — ')[0] ?? asset.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">

        {/* ── Left: Preview + quick actions ──────────────────────────── */}
        <div className="space-y-5">

          {/* Preview */}
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-100 aspect-video flex items-center justify-center relative">
              {isImageUrl && preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview}
                  alt={asset.alt_text || asset.title || asset.filename}
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="text-center">
                  <p className="text-5xl mb-2">
                    {asset.asset_type === 'photo' ? '📷' : asset.asset_type === 'graphic' ? '🎨' : asset.asset_type === 'logo' ? '🏷️' : '🖼️'}
                  </p>
                  <p className="text-sm text-gray-400">{asset.filename}</p>
                </div>
              )}
            </div>
            <div className="px-5 py-3.5 flex items-center gap-3 flex-wrap">
              {asset.width_px && asset.height_px && (
                <span className="text-xs text-gray-500">{asset.width_px}×{asset.height_px}px</span>
              )}
              {asset.file_size_bytes && (
                <span className="text-xs text-gray-500">
                  {asset.file_size_bytes < 1024 * 1024
                    ? `${(asset.file_size_bytes / 1024).toFixed(0)} KB`
                    : `${(asset.file_size_bytes / (1024 * 1024)).toFixed(1)} MB`}
                </span>
              )}
              <span className="text-[10px] text-gray-400 font-mono">{asset.upload_source}</span>
              <div className="flex-1" />
              <a
                href={asset.storage_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-indigo-600 hover:underline font-semibold"
              >
                Open original →
              </a>
            </div>
          </div>

          {/* Quick status */}
          <div className="bg-white border border-gray-100 rounded-2xl p-5">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Status</h2>
            <form action={updateStatus} className="flex gap-2 items-center flex-wrap">
              <input type="hidden" name="id" value={asset.id} />
              <select
                name="status"
                defaultValue={asset.status}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-indigo-300"
              >
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <button type="submit" className="text-xs px-4 py-2 bg-gray-900 text-white rounded-lg font-semibold hover:bg-gray-700">
                Update Status
              </button>
            </form>
          </div>

          {/* Metadata form */}
          <form id="metadata-form" action={saveMetadata} className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Asset Metadata</h2>
            <input type="hidden" name="id" value={asset.id} />

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Title</label>
              <input
                type="text"
                name="title"
                defaultValue={asset.title ?? ''}
                placeholder={asset.filename}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-300"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Alt Text
                <span className="ml-1 text-gray-400 font-normal">(required for accessibility)</span>
              </label>
              <input
                type="text"
                name="alt_text"
                defaultValue={asset.alt_text ?? ''}
                placeholder="Describe the image for screen readers"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-300"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
              <textarea
                name="description"
                defaultValue={asset.description ?? ''}
                rows={3}
                placeholder="Internal notes about this asset"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-300 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Source Attribution</label>
              <input
                type="text"
                name="source_attribution"
                defaultValue={asset.source_attribution ?? ''}
                placeholder="Photo by Jane Smith / Provided by Sponsor"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Asset Type</label>
                <select name="asset_type" defaultValue={asset.asset_type}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-300">
                  {ASSET_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
                <select name="content_category" defaultValue={asset.content_category ?? ''}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-300">
                  {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Publication</label>
                <select name="publication" defaultValue={asset.publication ?? ''}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-300">
                  {PUBLICATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  name="tags"
                  defaultValue={tagString}
                  placeholder="school, spotlight, summer"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-300"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Width (px)</label>
                <input type="number" name="width_px" defaultValue={asset.width_px ?? ''}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-300" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Height (px)</label>
                <input type="number" name="height_px" defaultValue={asset.height_px ?? ''}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-300" />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button type="submit" className="text-sm px-5 py-2 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700">
                Save Metadata
              </button>
            </div>
          </form>
        </div>

        {/* ── Right column: readiness, canva, usage, linked ──────────── */}
        <div className="space-y-5">

          {/* Readiness checklist */}
          <form id="readiness-form" action={saveReadiness} className="bg-white border border-gray-100 rounded-2xl p-5">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-4">Readiness</h2>
            <input type="hidden" name="id" value={asset.id} form="readiness-form" />
            <div className="space-y-3">
              <CheckField name="permission_confirmed" label="✓ Photo permission confirmed" checked={asset.permission_confirmed} formId="readiness-form" />
              <CheckField name="has_web_crop"         label="✓ Web crop ready"             checked={asset.has_web_crop}         formId="readiness-form" />
              <CheckField name="has_social_crop"      label="✓ Social crop ready"          checked={asset.has_social_crop}      formId="readiness-form" />
              <CheckField name="has_print_crop"       label="✓ Print crop ready"           checked={asset.has_print_crop}       formId="readiness-form" />
            </div>
            <div className="mt-4 pt-3 border-t border-gray-50">
              {/* Readiness score */}
              {(() => {
                let score = 0
                if (['approved','social_ready','print_ready'].includes(asset.status)) score += 40
                if (asset.alt_text)              score += 20
                if (asset.permission_confirmed)  score += 20
                if (asset.has_web_crop)          score += 10
                if (asset.has_social_crop)       score += 10
                return (
                  <div>
                    <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                      <span>Readiness score</span>
                      <span className="font-bold" style={{ color: score >= 80 ? '#16a34a' : score >= 50 ? '#d97706' : '#ef4444' }}>{score}%</span>
                    </div>
                    <div className="bg-gray-100 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full" style={{
                        width: `${score}%`,
                        backgroundColor: score >= 80 ? '#16a34a' : score >= 50 ? '#d97706' : '#ef4444',
                      }} />
                    </div>
                  </div>
                )
              })()}
            </div>
            {!asset.alt_text && (
              <p className="text-[11px] text-amber-600 mt-2">⚠ Add alt text to reach 80% readiness.</p>
            )}
            <div className="flex justify-end mt-4">
              <button type="submit" form="readiness-form" className="text-xs px-4 py-2 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-700">
                Save Readiness
              </button>
            </div>
          </form>

          {/* Canva / Creative coordination */}
          <form id="canva-form" action={saveCanvaInfo} className="bg-white border border-gray-100 rounded-2xl p-5 space-y-4">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Canva / Design Work</h2>
            <input type="hidden" name="id" value={asset.id} form="canva-form" />

            <div className="space-y-2.5">
              <CheckField name="needs_canva_graphic"  label="Needs Canva graphic"   checked={asset.needs_canva_graphic}  formId="canva-form" />
              <CheckField name="needs_quote_graphic"  label="Needs quote graphic"   checked={asset.needs_quote_graphic}  formId="canva-form" />
              <CheckField name="needs_social_square"  label="Needs social square"   checked={asset.needs_social_square}  formId="canva-form" />
              <CheckField name="needs_print_crop"     label="Needs print crop"      checked={asset.needs_print_crop}     formId="canva-form" />
              <CheckField name="needs_homepage_hero"  label="Needs homepage hero"   checked={asset.needs_homepage_hero}  formId="canva-form" />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Canva Link</label>
              <input
                type="url"
                name="canva_link"
                form="canva-form"
                defaultValue={asset.canva_link ?? ''}
                placeholder="https://www.canva.com/design/..."
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-300"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Assigned Designer</label>
              <input
                type="text"
                name="assigned_designer"
                form="canva-form"
                defaultValue={asset.assigned_designer ?? ''}
                placeholder="Designer name"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-300"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Graphic Requested Date</label>
              <input
                type="date"
                name="graphic_requested_at"
                form="canva-form"
                defaultValue={asset.graphic_requested_at ? asset.graphic_requested_at.slice(0, 10) : ''}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-300"
              />
            </div>

            {asset.graphic_completed_at ? (
              <p className="text-xs text-green-600 font-semibold">
                ✓ Graphic completed {new Date(asset.graphic_completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            ) : (
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" name="mark_graphic_done" value="true" form="canva-form" className="w-4 h-4 rounded" />
                <span className="text-gray-600">Mark graphic as complete</span>
              </label>
            )}

            <div className="flex justify-end pt-1">
              <button type="submit" form="canva-form" className="text-xs px-4 py-2 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-700">
                Save Design Info
              </button>
            </div>
          </form>

          {/* Usage tracking */}
          <form id="usage-form" action={saveUsage} className="bg-white border border-gray-100 rounded-2xl p-5 space-y-3">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Usage Locations</h2>
            <input type="hidden" name="id" value={asset.id} form="usage-form" />
            <p className="text-[11px] text-gray-400 -mt-1 mb-2">Where is this asset currently used?</p>
            <div className="grid grid-cols-2 gap-2">
              <CheckField name="used_on_homepage"         label="Homepage"        checked={asset.used_on_homepage}         formId="usage-form" />
              <CheckField name="used_in_article"          label="Article"         checked={asset.used_in_article}          formId="usage-form" />
              <CheckField name="used_in_guide"            label="Guide"           checked={asset.used_in_guide}            formId="usage-form" />
              <CheckField name="used_in_newsletter"       label="Newsletter"      checked={asset.used_in_newsletter}       formId="usage-form" />
              <CheckField name="used_on_social"           label="Social media"    checked={asset.used_on_social}           formId="usage-form" />
              <CheckField name="used_in_print"            label="Print issue"     checked={asset.used_in_print}            formId="usage-form" />
              <CheckField name="used_in_family_favorites" label="Fam Favorites"   checked={asset.used_in_family_favorites} formId="usage-form" />
              <CheckField name="used_in_sponsor_section"  label="Sponsor section" checked={asset.used_in_sponsor_section}  formId="usage-form" />
            </div>
            <div className="flex justify-end pt-2">
              <button type="submit" form="usage-form" className="text-xs px-4 py-2 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-700">
                Save Usage
              </button>
            </div>
          </form>

          {/* Linked content */}
          {(linkedSubTitle || linkedAdvName || asset.linked_guide_slug) && (
            <div className="bg-white border border-gray-100 rounded-2xl p-5 space-y-3">
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Linked Content</h2>
              {linkedSubTitle && (
                <div className="flex items-center gap-2">
                  <span className="text-sm">📝</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide">Submission</p>
                    <p className="text-xs font-semibold text-gray-700 truncate">{linkedSubTitle}</p>
                  </div>
                  <Link href={`/admin/community/${asset.linked_submission_id}`} className="text-xs text-indigo-600 hover:underline font-semibold shrink-0">
                    View →
                  </Link>
                </div>
              )}
              {linkedAdvName && (
                <div className="flex items-center gap-2">
                  <span className="text-sm">🤝</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide">Sponsor</p>
                    <p className="text-xs font-semibold text-gray-700 truncate">{linkedAdvName}</p>
                  </div>
                </div>
              )}
              {asset.linked_guide_slug && (
                <div className="flex items-center gap-2">
                  <span className="text-sm">📖</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-wide">Guide</p>
                    <p className="text-xs font-semibold text-gray-700">{asset.linked_guide_slug}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Asset timestamps */}
          <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 space-y-1.5">
            <p className="text-[10px] text-gray-400">
              <span className="font-semibold">Added:</span>{' '}
              {new Date(asset.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
            <p className="text-[10px] text-gray-400">
              <span className="font-semibold">Updated:</span>{' '}
              {new Date(asset.updated_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
            <p className="text-[10px] text-gray-400 font-mono break-all">{asset.id}</p>
          </div>

        </div>
      </div>
    </main>
  )
}
