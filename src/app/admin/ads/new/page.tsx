'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { groupedPlacementTypes, findPlacementType } from '@/lib/ads/placement-types'

const CONTEXT_SLUGS: Record<string, string[]> = {
  guide: [
    'family-resource-guide', 'private-school-guide', 'summer-camp-guide', 'childcare-guide',
    'healthy-kids-guide', 'summer-fun-guide', 'birthday-party-guide', 'afterschool-guide', 'special-needs-guide',
  ],
  calendar: [],
  article:  [],
  newsletter: [],
  site_global: [],
}

export default function NewAdPage() {
  // useSearchParams suspends in app router — wrap the inner UI.
  return (
    <Suspense fallback={<div style={{ padding: 24 }}>Loading…</div>}>
      <NewAdInner />
    </Suspense>
  )
}

function NewAdInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  // /admin/ads/new?advertiser_id=… pre-fills the advertiser dropdown so
  // the "Add Placement" button on the advertiser detail page lands
  // straight into a partially-completed form.
  const initialAdvertiserId  = searchParams.get('advertiser_id')        ?? ''
  // Also accept placement_type so we can deep-link from the Slot Catalog
  // ("sell this empty slot to a specific advertiser").
  const initialPlacementType = searchParams.get('placement_type')       ?? 'school_bits_inline'

  const [advertisers, setAdvertisers] = useState<Array<{ id: string; business_name: string }>>([])
  const [saving, setSaving] = useState(false)
  const placementGroups = groupedPlacementTypes()

  const [form, setForm] = useState({
    placement_type: initialPlacementType,
    context_type: 'guide',
    context_slug: '',
    advertiser_account_id: initialAdvertiserId,
    ad_eyebrow: '',
    ad_headline: '',
    ad_description: '',
    ad_cta_label: '',
    ad_link: '',
    ad_image_url: '',
    starts_at: new Date().toISOString().slice(0, 16),
    ends_at: '',
    display_priority: 50,
    is_active: true,
  })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  useEffect(() => {
    supabase.from('advertiser_accounts').select('id, business_name').order('business_name').then(({ data }) => {
      setAdvertisers(data ?? [])
    })
  }, [])

  function set(key: string, value: string | number | boolean) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function save() {
    setSaving(true)
    const { error } = await supabase.from('ad_placements').insert({
      ...form,
      context_slug:           form.context_slug || null,
      advertiser_account_id:  form.advertiser_account_id || null,
      ad_eyebrow:             form.ad_eyebrow || null,
      ad_headline:            form.ad_headline || null,
      ad_description:         form.ad_description || null,
      ad_cta_label:           form.ad_cta_label || null,
      ad_link:                form.ad_link || null,
      ad_image_url:           form.ad_image_url || null,
      ends_at:                form.ends_at || null,
    })
    setSaving(false)
    if (!error) router.push('/admin/ads')
    else alert(`Error: ${error.message}`)
  }

  const contextSlugs = CONTEXT_SLUGS[form.context_type] ?? []

  return (
    <div style={{ padding: 24, maxWidth: 680 }}>
      <h1 style={{ fontFamily: 'var(--ed-font-serif)', fontSize: '1.5rem', fontWeight: 700, marginBottom: 24 }}>New Ad Placement</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Row label="Placement Type">
          <div>
            <select value={form.placement_type} onChange={e => set('placement_type', e.target.value)} style={sel}>
              {placementGroups.map(group => (
                <optgroup key={group.surface} label={group.label}>
                  {group.entries.map(p => (
                    <option key={p.slug} value={p.slug}>{p.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            {(() => {
              const def = findPlacementType(form.placement_type)
              return def ? (
                <p style={{ fontSize: 12, color: '#666', marginTop: 6, lineHeight: 1.4 }}>
                  <code style={{ fontSize: 11, color: '#888' }}>{def.slug}</code> — {def.description}
                </p>
              ) : null
            })()}
          </div>
        </Row>
        <Row label="Context Type">
          <select value={form.context_type} onChange={e => set('context_type', e.target.value)} style={sel}>
            {['guide', 'article', 'calendar', 'newsletter', 'site_global'].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Row>
        {contextSlugs.length > 0 && (
          <Row label="Context Slug">
            <select value={form.context_slug} onChange={e => set('context_slug', e.target.value)} style={sel}>
              <option value="">(all / global)</option>
              {contextSlugs.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Row>
        )}
        <Row label="Advertiser">
          <select value={form.advertiser_account_id} onChange={e => set('advertiser_account_id', e.target.value)} style={sel}>
            <option value="">(none)</option>
            {advertisers.map(a => <option key={a.id} value={a.id}>{a.business_name}</option>)}
          </select>
        </Row>
        <Row label="Eyebrow Label"><input value={form.ad_eyebrow} onChange={e => set('ad_eyebrow', e.target.value)} placeholder="e.g. Sponsored · Featured Partner" style={inp} /></Row>
        <Row label="Headline"><input value={form.ad_headline} onChange={e => set('ad_headline', e.target.value)} style={inp} /></Row>
        <Row label="Description"><textarea value={form.ad_description} onChange={e => set('ad_description', e.target.value)} rows={3} style={{ ...inp, resize: 'vertical' }} /></Row>
        <Row label="CTA Label"><input value={form.ad_cta_label} onChange={e => set('ad_cta_label', e.target.value)} placeholder="e.g. Learn More" style={inp} /></Row>
        <Row label="CTA Link"><input value={form.ad_link} onChange={e => set('ad_link', e.target.value)} placeholder="/healthy-kids-guide/listings/..." style={inp} /></Row>
        <Row label="Image URL"><input value={form.ad_image_url} onChange={e => set('ad_image_url', e.target.value)} placeholder="https://... or /images/..." style={inp} /></Row>
        <Row label="Starts At"><input type="datetime-local" value={form.starts_at} onChange={e => set('starts_at', e.target.value)} style={inp} /></Row>
        <Row label="Ends At"><input type="datetime-local" value={form.ends_at} onChange={e => set('ends_at', e.target.value)} style={inp} /></Row>
        <Row label="Priority (0-100)"><input type="number" value={form.display_priority} onChange={e => set('display_priority', Number(e.target.value))} min={0} max={100} style={{ ...inp, width: 100 }} /></Row>
        <Row label="Active">
          <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} />
        </Row>

        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <button onClick={save} disabled={saving} style={{ padding: '10px 24px', backgroundColor: '#C4622D', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>
            {saving ? 'Saving...' : 'Save Ad Placement'}
          </button>
          <button onClick={() => router.push('/admin/ads')} style={{ padding: '10px 24px', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer', background: 'none' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

const inp: React.CSSProperties = { padding: '7px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 14, width: '100%' }
const sel: React.CSSProperties = { ...inp }

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 12, alignItems: 'start' }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: '#444', paddingTop: 8 }}>{label}</label>
      <div>{children}</div>
    </div>
  )
}
