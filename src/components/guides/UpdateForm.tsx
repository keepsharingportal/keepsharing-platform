'use client'

import { useState } from 'react'
import { CheckCircle2, Building2 } from 'lucide-react'
import type { GuideListing } from '@/lib/mock-guides'

const inputCls = 'w-full px-3 py-2.5 text-sm text-gray-900 bg-white border border-gray-300 rounded-xl outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all'
const labelCls = 'block text-sm font-semibold text-gray-700 mb-1.5'

interface Props { entry: GuideListing; token: string }

export function UpdateForm({ entry, token }: Props) {
  const [form, setForm] = useState({
    businessName: entry.businessName,
    contactName:  entry.contactName,
    phone:        entry.phone,
    email:        entry.email,
    website:      entry.website,
    address:      entry.address,
    description:  entry.description,
    noChanges:    false,
  })
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const set = (key: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm((p) => ({ ...p, [key]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await fetch('/api/guides/submit-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ...form }),
      })
    } catch { /* best-effort */ }
    setSubmitting(false)
    setSubmitted(true)
  }

  if (submitted) return (
    <div className="text-center py-12">
      <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
        <CheckCircle2 size={32} className="text-green-500" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank you!</h2>
      <p className="text-gray-600 max-w-sm mx-auto">
        Your listing update has been received. Our team will review it and apply the changes
        before the guide publishes. We appreciate you keeping your information current!
      </p>
      <p className="text-sm text-gray-400 mt-6">You can close this window.</p>
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-4">
          <Building2 size={24} className="text-blue-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Update Your Listing</h1>
        <p className="text-gray-600 text-sm max-w-sm mx-auto">
          Review your information below and update anything that has changed. Your listing
          appears in our {entry.guideName} at no charge.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">Business Information</h2>

        <div>
          <label className={labelCls}>Business Name</label>
          <input type="text" value={form.businessName} onChange={set('businessName')} className={inputCls} required />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Primary Contact Name</label>
            <input type="text" value={form.contactName} onChange={set('contactName')} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Phone Number</label>
            <input type="tel" value={form.phone} onChange={set('phone')} className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Email Address</label>
            <input type="email" value={form.email} onChange={set('email')} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Website</label>
            <input type="url" value={form.website} onChange={set('website')} className={inputCls} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Street Address</label>
          <input type="text" value={form.address} onChange={set('address')} className={inputCls} />
        </div>

        <div>
          <label className={labelCls}>Description / Services Offered</label>
          <textarea value={form.description} onChange={set('description')}
            className={`${inputCls} resize-y min-h-[80px]`}
            placeholder="Brief description of your business and services for families…" />
          <p className="text-xs text-gray-400 mt-1">Keep it under 150 words. This appears directly in the guide.</p>
        </div>
      </div>

      <label className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-xl cursor-pointer">
        <input type="checkbox" checked={form.noChanges}
          onChange={(e) => setForm((p) => ({ ...p, noChanges: e.target.checked }))}
          className="mt-0.5 w-4 h-4 text-green-600 rounded" />
        <div>
          <div className="text-sm font-semibold text-green-800">Everything looks correct — no changes needed</div>
          <div className="text-xs text-green-700 mt-0.5">Check this if your information is already up to date</div>
        </div>
      </label>

      <button type="submit" disabled={submitting}
        className="w-full py-3.5 text-base font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-60">
        {submitting ? 'Submitting…' : form.noChanges ? 'Confirm — No Changes Needed' : 'Submit Updates'}
      </button>

      <p className="text-xs text-center text-gray-400">
        Questions about your listing? Reply to the email you received or call (334) 555-0100.
      </p>
    </form>
  )
}
