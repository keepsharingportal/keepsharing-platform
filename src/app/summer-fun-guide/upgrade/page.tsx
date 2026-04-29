'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Check, ShieldCheck } from 'lucide-react'

const ENHANCED_FEATURES = [
  'Full description (up to 500 characters)',
  'Registration status badge (Open / Waitlist / Full)',
  'Ages and price range displayed',
  'Indoor/outdoor setting tag',
  'Neighborhood area tag',
  'Enhanced badge on listing card',
  'Sorts above all Community listings',
  'Listed for the full 2026 summer season',
]

function UpgradeForm() {
  const params = useSearchParams()
  const prefillName = params.get('name') ?? ''
  const prefillSlug = params.get('slug') ?? ''

  const [businessName, setBusinessName] = useState(prefillName)
  const [contactName, setContactName]   = useState('')
  const [email, setEmail]               = useState('')
  const [phone, setPhone]               = useState('')
  const [submitting, setSubmitting]     = useState(false)
  const [error, setError]               = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await fetch('/api/summer-guide/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName, contactName, email, phone, existingSlug: prefillSlug }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Checkout failed')
      }
      const { url } = await res.json()
      if (url) window.location.href = url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          Business / Program Name <span className="text-blue-500">*</span>
        </label>
        <input
          required
          value={businessName}
          onChange={e => setBusinessName(e.target.value)}
          placeholder="As it appears in the Summer Fun Guide"
          className="w-full px-3 py-2.5 text-sm text-gray-900 border border-gray-300 rounded-xl outline-none focus:border-blue-400"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Your Name <span className="text-blue-500">*</span>
          </label>
          <input
            required
            value={contactName}
            onChange={e => setContactName(e.target.value)}
            placeholder="Full name"
            className="w-full px-3 py-2.5 text-sm text-gray-900 border border-gray-300 rounded-xl outline-none focus:border-blue-400"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Phone
          </label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="(334) 555-0100"
            className="w-full px-3 py-2.5 text-sm text-gray-900 border border-gray-300 rounded-xl outline-none focus:border-blue-400"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          Email <span className="text-blue-500">*</span>
        </label>
        <input
          required
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Where we'll send your profile link"
          className="w-full px-3 py-2.5 text-sm text-gray-900 border border-gray-300 rounded-xl outline-none focus:border-blue-400"
        />
        <p className="text-xs text-gray-400 mt-1">
          After payment we&apos;ll email you a link to complete your enhanced profile.
        </p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
      >
        {submitting ? 'Redirecting to payment…' : 'Pay $175 — Upgrade to Enhanced →'}
      </button>

      <p className="text-center text-xs text-gray-400">
        Secure payment via Stripe. One-time fee for the full 2026 summer season.
      </p>
    </form>
  )
}

export default function UpgradePage() {
  return (
    <div className="min-h-screen bg-gray-50 px-5 py-10">
      <div className="max-w-2xl mx-auto">
        <Link href="/summer-fun-guide" className="flex items-center gap-1.5 text-sm text-blue-600 font-medium mb-8">
          <ArrowLeft size={15} /> Back to Summer Fun Guide
        </Link>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left: what you get */}
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-blue-600 mb-2">
              River Region Parents
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Upgrade to Enhanced Listing
            </h1>
            <p className="text-sm text-gray-600 mb-6">
              Stand out from free community listings. Enhanced listings include full details,
              registration status, and placement above community listings for the entire
              2026 summer season.
            </p>

            <div className="bg-white rounded-2xl border border-blue-200 p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="text-base font-bold text-gray-900">Enhanced Listing</div>
                <div className="text-2xl font-extrabold text-blue-700">$175</div>
              </div>
              <ul className="space-y-2">
                {ENHANCED_FEATURES.map(f => (
                  <li key={f} className="flex items-start gap-2 text-xs text-gray-700">
                    <Check size={13} className="text-green-600 shrink-0 mt-0.5" strokeWidth={2.5} />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-sm font-bold text-amber-800 mb-1">
                <ShieldCheck size={15} />
                Become an Advertiser
              </div>
              <p className="text-xs text-amber-700">
                Print ad clients get the full Advertiser tier — gold border, trust badge, homepage
                featured section, and priority placement — included with their campaign.
              </p>
              <Link href="/advertise" className="inline-block mt-2 text-xs font-semibold text-amber-800 hover:underline">
                Learn about print advertising →
              </Link>
            </div>
          </div>

          {/* Right: form */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-base font-bold text-gray-900 mb-5">Your Information</h2>
            <Suspense fallback={<div className="text-sm text-gray-400">Loading…</div>}>
              <UpgradeForm />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  )
}
