'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, RefreshCw, Check } from 'lucide-react'
import { CATEGORY_OPTIONS, TIER_LABELS, getProposalTemplate, fillProposalTemplate } from '@/lib/proposal-templates'
import { createClient } from '@/lib/supabase/client'

const CONTRACT_OPTIONS = [3, 6, 12]

function generateToken(businessName: string) {
  const slug = businessName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  return `${slug}-${Math.random().toString(36).slice(2, 7)}`
}

export default function NewProposalPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [form, setForm] = useState({
    business_name: '', contact_first_name: '', contact_last_name: '',
    contact_email: '', contact_phone: '', business_category: '', estimated_ltv: '',
    recommended_tier: '', custom_monthly_price: '', contract_length_months: 12,
    intro_paragraph: '', value_props_text: '', roi_math: '', onboarding_timeline: '',
  })

  // Auto-fill from template when category + tier are both set
  useEffect(() => {
    if (!form.business_category || !form.recommended_tier || !form.business_name) return
    const tpl = getProposalTemplate(form.business_category, form.recommended_tier)
    if (!tpl) return
    const filled = fillProposalTemplate(tpl, form.business_name)
    setForm(f => ({
      ...f,
      custom_monthly_price: f.custom_monthly_price || String(filled.monthly_price),
      contract_length_months: f.contract_length_months === 12 ? filled.contract_months : f.contract_length_months,
      intro_paragraph: f.intro_paragraph || filled.intro_paragraph,
      value_props_text: f.value_props_text || filled.value_props.join('\n'),
      roi_math: f.roi_math || filled.roi_math,
      onboarding_timeline: f.onboarding_timeline || filled.onboarding_timeline,
    }))
  }, [form.business_category, form.recommended_tier, form.business_name])

  async function save(status: 'draft' | 'sent') {
    if (!form.business_name) return
    setSaving(true)
    try {
      const supabase = createClient()
      const valueProps = form.value_props_text
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean)

      const { data } = await supabase.from('proposals').insert({
        token_slug:             generateToken(form.business_name),
        business_name:          form.business_name,
        contact_first_name:     form.contact_first_name || null,
        contact_last_name:      form.contact_last_name || null,
        contact_email:          form.contact_email || null,
        contact_phone:          form.contact_phone || null,
        business_category:      form.business_category || null,
        estimated_ltv:          form.estimated_ltv || null,
        recommended_tier:       form.recommended_tier || null,
        custom_monthly_price:   form.custom_monthly_price ? Number(form.custom_monthly_price) : null,
        contract_length_months: form.contract_length_months,
        intro_paragraph:        form.intro_paragraph || null,
        value_props:            valueProps,
        roi_math:               form.roi_math || null,
        onboarding_timeline:    form.onboarding_timeline || null,
        status,
        sent_at:                status === 'sent' ? new Date().toISOString() : null,
        created_by:             'jason',
      }).select('id').single()

      setSaved(true)
      setTimeout(() => router.push('/admin/proposals'), 800)
    } catch (e) {
      console.error(e)
    }
    setSaving(false)
  }

  const inp = 'w-full px-3.5 py-2.5 text-sm rounded-lg border border-portal-border outline-none focus:border-portal-blue bg-white'
  const lbl = 'block text-xs font-semibold text-portal-sub mb-1.5'
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({...f, [k]: e.target.value}))

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="bg-white border-b border-portal-border px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-portal-text">New Proposal</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => save('draft')} disabled={saving || !form.business_name} className="px-4 py-2 text-sm font-semibold border border-portal-border-2 rounded-lg text-portal-text hover:bg-portal-bg disabled:opacity-40 disabled:cursor-not-allowed">
            Save Draft
          </button>
          <button onClick={() => save('sent')} disabled={saving || !form.business_name} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-portal-navy text-white rounded-lg hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed">
            {saving ? <><RefreshCw size={13} className="animate-spin" /> Saving…</> : saved ? <><Check size={13} /> Saved!</> : <>Generate & Send <ArrowRight size={13} /></>}
          </button>
        </div>
      </div>

      <div className="p-6 max-w-3xl">
        {/* Section 1: Business Info */}
        <div className="bg-white rounded-lg border border-portal-border p-5 mb-5">
          <h2 className="text-base font-semibold text-portal-text mb-4">Business Info</h2>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className={lbl}>Business name *</label>
              <input className={inp} placeholder="Business name" value={form.business_name} onChange={set('business_name')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Contact first name</label>
                <input className={inp} placeholder="First" value={form.contact_first_name} onChange={set('contact_first_name')} />
              </div>
              <div>
                <label className={lbl}>Contact last name</label>
                <input className={inp} placeholder="Last" value={form.contact_last_name} onChange={set('contact_last_name')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Email</label>
                <input type="email" className={inp} placeholder="email@business.com" value={form.contact_email} onChange={set('contact_email')} />
              </div>
              <div>
                <label className={lbl}>Phone</label>
                <input type="tel" className={inp} placeholder="(334) 555-0100" value={form.contact_phone} onChange={set('contact_phone')} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Business category</label>
                <select className={inp} value={form.business_category} onChange={set('business_category')}>
                  <option value="">Select category…</option>
                  {CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className={lbl}>Estimated customer LTV</label>
                <input className={inp} placeholder="e.g. $1,200–$3,000" value={form.estimated_ltv} onChange={set('estimated_ltv')} />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Recommendation */}
        <div className="bg-white rounded-lg border border-portal-border p-5 mb-5">
          <h2 className="text-base font-semibold text-portal-text mb-4">Recommendation</h2>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className={lbl}>Recommended tier</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(TIER_LABELS).map(([k, v]) => (
                  <label key={k} className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer text-sm ${form.recommended_tier === k ? 'border-blue-500 bg-portal-blue-lt' : 'border-portal-border'}`}>
                    <input type="radio" name="tier" value={k} checked={form.recommended_tier === k} onChange={() => setForm(f => ({...f, recommended_tier: k}))} className="sr-only" />
                    <span className="font-medium text-portal-text">{v.split(' — ')[0]}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Monthly price ($)</label>
                <input type="number" className={inp} placeholder="1500" value={form.custom_monthly_price} onChange={set('custom_monthly_price')} />
              </div>
              <div>
                <label className={lbl}>Contract length (months)</label>
                <select className={inp} value={form.contract_length_months} onChange={e => setForm(f => ({...f, contract_length_months: Number(e.target.value)}))}>
                  {CONTRACT_OPTIONS.map(m => <option key={m} value={m}>{m} months</option>)}
                </select>
              </div>
            </div>
          </div>
          {form.business_category && form.recommended_tier && (
            <p className="text-xs text-portal-blue mt-3">
              ✓ Template auto-filled from {form.business_category} × {form.recommended_tier}. Edit the content below as needed.
            </p>
          )}
        </div>

        {/* Section 3: Proposal Content */}
        <div className="bg-white rounded-lg border border-portal-border p-5 mb-5">
          <h2 className="text-base font-semibold text-portal-text mb-4">Proposal Content</h2>
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className={lbl}>Opening paragraph</label>
              <textarea className={`${inp} resize-none`} rows={4} value={form.intro_paragraph} onChange={set('intro_paragraph')} placeholder="After our conversation, here's what we'd build…" />
            </div>
            <div>
              <label className={lbl}>What we&apos;d build — one item per line</label>
              <textarea className={`${inp} resize-none`} rows={7} value={form.value_props_text} onChange={set('value_props_text')} placeholder="Custom Offer Page — a conversion page around your offer&#10;Magazine Presence — full-page ad every month&#10;..." />
            </div>
            <div>
              <label className={lbl}>ROI math</label>
              <textarea className={`${inp} resize-none`} rows={4} value={form.roi_math} onChange={set('roi_math')} placeholder="The math behind why this investment pays off…" />
            </div>
            <div>
              <label className={lbl}>Onboarding timeline</label>
              <textarea className={`${inp} resize-none`} rows={3} value={form.onboarding_timeline} onChange={set('onboarding_timeline')} placeholder="Week 1: Onboarding form. Week 2: Page goes live…" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
