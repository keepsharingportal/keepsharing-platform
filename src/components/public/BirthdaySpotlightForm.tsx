'use client'

import { useState, useRef } from 'react'
import { Star, Camera, ChevronRight, Check } from 'lucide-react'

const TIERS = [
  {
    id: 'basic',
    name: 'Basic Spotlight',
    price: 25,
    priceId: process.env.NEXT_PUBLIC_STRIPE_BIRTHDAY_BASIC ?? 'price_basic',
    color: 'border-gray-200 hover:border-blue-300',
    selectedColor: 'border-blue-500 bg-blue-50',
    badge: '',
    features: ['Photo + name in magazine', 'Birthday message', 'Digital keepsake link'],
  },
  {
    id: 'featured',
    name: 'Featured Spotlight',
    price: 45,
    priceId: process.env.NEXT_PUBLIC_STRIPE_BIRTHDAY_FEATURED ?? 'price_featured',
    color: 'border-gray-200 hover:border-rose-300',
    selectedColor: 'border-rose-500 bg-rose-50',
    badge: 'Most Popular',
    features: ['Everything in Basic', 'Social media share post', 'Larger photo placement', 'Birthday week feature'],
  },
  {
    id: 'premium',
    name: 'Birthday Star',
    price: 75,
    priceId: process.env.NEXT_PUBLIC_STRIPE_BIRTHDAY_PREMIUM ?? 'price_premium',
    color: 'border-gray-200 hover:border-amber-300',
    selectedColor: 'border-amber-500 bg-amber-50',
    badge: 'Premium',
    features: ['Everything in Featured', 'Dedicated social post', 'Newsletter feature', 'Printable digital certificate'],
  },
]

const inputCls = 'w-full px-3 py-2.5 text-sm text-gray-900 bg-white border border-gray-300 rounded-xl outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all placeholder:text-gray-400'
const labelCls = 'block text-sm font-semibold text-gray-700 mb-1.5'

interface FormData {
  childName: string
  childAge: string
  birthdayDate: string
  parentName: string
  parentEmail: string
  parentPhone: string
  message: string
  tier: string
  photo: File | null
}

export function BirthdaySpotlightForm() {
  const [form, setForm] = useState<FormData>({
    childName: '', childAge: '', birthdayDate: '',
    parentName: '', parentEmail: '', parentPhone: '',
    message: '', tier: 'featured', photo: null,
  })
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors]         = useState<Partial<Record<keyof FormData, string>>>({})
  const fileRef = useRef<HTMLInputElement>(null)

  const set = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((p) => ({ ...p, [key]: e.target.value }))

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setForm((p) => ({ ...p, photo: file }))
    const reader = new FileReader()
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const validate = () => {
    const e: Partial<Record<keyof FormData, string>> = {}
    if (!form.childName.trim())   e.childName    = 'Child\'s name is required'
    if (!form.childAge.trim())    e.childAge     = 'Age is required'
    if (!form.birthdayDate)       e.birthdayDate = 'Birthday date is required'
    if (!form.parentName.trim())  e.parentName   = 'Parent name is required'
    if (!form.parentEmail.trim()) e.parentEmail  = 'Email is required'
    if (!form.parentPhone.trim()) e.parentPhone  = 'Phone is required'
    if (!form.photo)              e.photo        = 'A photo is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)

    try {
      // Upload photo first
      const photoData = new FormData()
      if (form.photo) photoData.append('photo', form.photo)
      photoData.append('childName', form.childName)
      photoData.append('childAge', form.childAge)
      photoData.append('birthdayDate', form.birthdayDate)
      photoData.append('parentName', form.parentName)
      photoData.append('parentEmail', form.parentEmail)
      photoData.append('parentPhone', form.parentPhone)
      photoData.append('message', form.message)
      photoData.append('tier', form.tier)

      // Create checkout session
      const res = await fetch('/api/birthday-spotlight/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tier: form.tier,
          childName: form.childName,
          birthdayDate: form.birthdayDate,
          parentEmail: form.parentEmail,
          parentName: form.parentName,
          parentPhone: form.parentPhone,
          childAge: form.childAge,
          message: form.message,
        }),
      })
      const { url, error } = await res.json()
      if (error) throw new Error(error)
      window.location.href = url
    } catch (err) {
      setSubmitting(false)
      alert('Something went wrong. Please try again or call (334) 555-0100.')
    }
  }

  const selectedTier = TIERS.find((t) => t.id === form.tier)!

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Hero */}
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-rose-100 flex items-center justify-center mx-auto mb-4">
          <Star size={28} className="text-rose-500 fill-rose-200" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Birthday Spotlight</h1>
        <p className="text-gray-600 max-w-md mx-auto">
          Celebrate your child's special day in River Region Parents magazine — seen by thousands of Montgomery families.
        </p>
      </div>

      {/* Tier selection */}
      <div>
        <p className={labelCls}>Choose your spotlight package *</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {TIERS.map((tier) => (
            <label key={tier.id}
              className={`relative flex flex-col p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                form.tier === tier.id ? tier.selectedColor : tier.color
              }`}
            >
              <input type="radio" name="tier" value={tier.id} checked={form.tier === tier.id}
                onChange={() => setForm((p) => ({ ...p, tier: tier.id }))} className="sr-only" />
              {tier.badge && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500 text-white whitespace-nowrap">
                  {tier.badge}
                </span>
              )}
              <div className="text-2xl font-bold text-gray-900 mb-0.5">${tier.price}</div>
              <div className="text-sm font-semibold text-gray-700 mb-3">{tier.name}</div>
              <ul className="space-y-1.5 text-xs text-gray-600">
                {tier.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <Check size={11} className="text-green-500 mt-0.5 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              {form.tier === tier.id && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                  <Check size={11} className="text-white" />
                </div>
              )}
            </label>
          ))}
        </div>
      </div>

      {/* Child info */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 text-xs font-bold flex items-center justify-center">1</span>
          About the Birthday Child
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Child's Name *</label>
            <input type="text" value={form.childName} onChange={set('childName')}
              placeholder="First and last name" className={inputCls} />
            {errors.childName && <p className="text-xs text-red-500 mt-1">{errors.childName}</p>}
          </div>
          <div>
            <label className={labelCls}>Turning Age *</label>
            <select value={form.childAge} onChange={set('childAge')} className={inputCls}>
              <option value="">Select age</option>
              {Array.from({ length: 18 }, (_, i) => i + 1).map((a) => (
                <option key={a} value={a}>{a} year{a !== 1 ? 's' : ''} old</option>
              ))}
            </select>
            {errors.childAge && <p className="text-xs text-red-500 mt-1">{errors.childAge}</p>}
          </div>
          <div>
            <label className={labelCls}>Birthday Date *</label>
            <input type="date" value={form.birthdayDate} onChange={set('birthdayDate')} className={inputCls} />
            {errors.birthdayDate && <p className="text-xs text-red-500 mt-1">{errors.birthdayDate}</p>}
          </div>
        </div>

        {/* Photo upload */}
        <div className="mt-4">
          <label className={labelCls}>Birthday Photo *</label>
          <div
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors ${
              photoPreview ? 'border-rose-300 bg-rose-50' : 'border-gray-200 hover:border-gray-300 bg-gray-50 hover:bg-gray-100'
            }`}
          >
            {photoPreview ? (
              <div className="flex flex-col items-center gap-2">
                <img src={photoPreview} alt="Preview" className="w-24 h-24 rounded-xl object-cover shadow-md" />
                <p className="text-xs text-rose-600 font-medium">{form.photo?.name}</p>
                <p className="text-xs text-gray-400">Click to change photo</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Camera size={28} className="text-gray-400" />
                <p className="text-sm font-medium text-gray-700">Click to upload photo</p>
                <p className="text-xs text-gray-400">JPG or PNG · Max 10MB · Clear, recent photo works best</p>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhoto} />
          {errors.photo && <p className="text-xs text-red-500 mt-1">{errors.photo}</p>}
        </div>

        {/* Birthday message */}
        <div className="mt-4">
          <label className={labelCls}>Birthday Message <span className="text-gray-400 font-normal">(optional)</span></label>
          <textarea value={form.message} onChange={set('message')}
            placeholder={`Share something special about ${form.childName || 'your child'} — a fun fact, a milestone, or a message from the family...`}
            className={`${inputCls} resize-y min-h-[80px]`} />
          <p className="text-xs text-gray-400 mt-1">{form.message.length}/200 characters</p>
        </div>
      </div>

      {/* Parent info */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-5 flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-rose-100 text-rose-600 text-xs font-bold flex items-center justify-center">2</span>
          Parent / Guardian Contact
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Parent / Guardian Name *</label>
            <input type="text" value={form.parentName} onChange={set('parentName')}
              placeholder="Your full name" className={inputCls} />
            {errors.parentName && <p className="text-xs text-red-500 mt-1">{errors.parentName}</p>}
          </div>
          <div>
            <label className={labelCls}>Email Address *</label>
            <input type="email" value={form.parentEmail} onChange={set('parentEmail')}
              placeholder="your@email.com" className={inputCls} />
            {errors.parentEmail && <p className="text-xs text-red-500 mt-1">{errors.parentEmail}</p>}
          </div>
          <div>
            <label className={labelCls}>Phone Number *</label>
            <input type="tel" value={form.parentPhone} onChange={set('parentPhone')}
              placeholder="(334) 555-0000" className={inputCls} />
            {errors.parentPhone && <p className="text-xs text-red-500 mt-1">{errors.parentPhone}</p>}
          </div>
        </div>
      </div>

      {/* Order summary + submit */}
      <div className="bg-rose-50 rounded-2xl border border-rose-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm font-semibold text-gray-700">{selectedTier.name}</div>
            <div className="text-xs text-gray-500 mt-0.5">One-time payment · Digital receipt sent to {form.parentEmail || 'your email'}</div>
          </div>
          <div className="text-2xl font-bold text-gray-900">${selectedTier.price}</div>
        </div>
        <button type="submit" disabled={submitting}
          className="w-full flex items-center justify-center gap-2 py-3.5 text-base font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-700 transition-colors disabled:opacity-60 shadow-lg shadow-rose-200">
          {submitting ? (
            <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Processing…</>
          ) : (
            <>Proceed to Payment · ${selectedTier.price} <ChevronRight size={18} /></>
          )}
        </button>
        <p className="text-xs text-center text-gray-500 mt-3">
          Secure payment via Stripe · Your info is never shared
        </p>
      </div>
    </form>
  )
}
