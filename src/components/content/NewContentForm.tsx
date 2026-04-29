'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Calendar, UtensilsCrossed, CheckCircle } from 'lucide-react'

const CONTENT_TYPES = [
  { id: 'weekend-reservation', label: "This Weekend's Reservation", icon: UtensilsCrossed, description: 'Auto-schedules Friday 6am · appears in Taste department on Boom' },
]

function getNextFriday6am(): string {
  const now  = new Date()
  const day  = now.getDay() // 0=Sun, 5=Fri
  const diff = (5 - day + 7) % 7 || 7
  const next = new Date(now)
  next.setDate(now.getDate() + diff)
  next.setHours(6, 0, 0, 0)
  return next.toISOString().slice(0, 16)
}

export function NewContentForm() {
  const router   = useRouter()
  const [type, setType]         = useState('weekend-reservation')
  const [restaurantName, setRestaurantName] = useState('')
  const [dishRec, setDishRec]   = useState('')
  const [description, setDescription] = useState('')
  const [restaurantUrl, setRestaurantUrl] = useState('')
  const [scheduledFor, setScheduledFor]   = useState(getNextFriday6am())
  const [publication, setPublication]     = useState('RRB')
  const [submitting, setSubmitting]       = useState(false)
  const [error, setError]       = useState('')
  const [done, setDone]         = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      const res = await fetch('/api/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantName,
          dishRec,
          description,
          restaurantUrl: restaurantUrl || null,
          scheduledFor,
          publication,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to create content')
      }

      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
        <CheckCircle className="text-green-500 mb-4" size={48} />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Content Scheduled!</h2>
        <p className="text-sm text-gray-500 mb-6">
          &ldquo;{restaurantName}&rdquo; will publish to Boom&apos;s Taste department on{' '}
          {new Date(scheduledFor).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at 6:00 AM.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => { setDone(false); setRestaurantName(''); setDishRec(''); setDescription(''); setRestaurantUrl(''); setScheduledFor(getNextFriday6am()) }}
            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
          >
            Add Another
          </button>
          <button
            onClick={() => router.push('/admin/content/editorial-board')}
            className="px-4 py-2 text-sm font-semibold text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            View Editorial Board
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">New Content</h1>
        <p className="text-xs text-gray-500 mt-0.5">Create and schedule editorial content</p>
      </div>

      <div className="p-6 max-w-2xl space-y-6">

        {/* Content type picker */}
        <div>
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Content Type</div>
          <div className="space-y-2">
            {CONTENT_TYPES.map(ct => (
              <button
                key={ct.id}
                type="button"
                onClick={() => setType(ct.id)}
                className={cn(
                  'w-full flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all',
                  type === ct.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
                )}
              >
                <ct.icon size={20} className={cn('mt-0.5 shrink-0', type === ct.id ? 'text-blue-600' : 'text-gray-400')} />
                <div>
                  <div className="text-sm font-semibold text-gray-900">{ct.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{ct.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Weekend Reservation form */}
        {type === 'weekend-reservation' && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <div className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <UtensilsCrossed size={15} className="text-orange-500" />
                Restaurant Details
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Publication <span className="text-blue-500">*</span>
                </label>
                <select
                  value={publication}
                  onChange={e => setPublication(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-xl outline-none focus:border-blue-400"
                >
                  <option value="RRB">River Region Boom</option>
                  <option value="RRP">River Region Parents</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Restaurant Name <span className="text-blue-500">*</span>
                </label>
                <input
                  required
                  value={restaurantName}
                  onChange={e => setRestaurantName(e.target.value)}
                  placeholder="e.g. The Vintage Year"
                  className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-xl outline-none focus:border-blue-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Dish Recommendation
                </label>
                <input
                  value={dishRec}
                  onChange={e => setDishRec(e.target.value)}
                  placeholder="e.g. The pan-seared grouper with lemon butter"
                  className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-xl outline-none focus:border-blue-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Description <span className="text-blue-500">*</span>
                  <span className="font-normal text-gray-400 ml-1">(displayed to readers)</span>
                </label>
                <textarea
                  required
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Write a 2–3 sentence recommendation for readers. Why this place, why this weekend?"
                  className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-xl outline-none focus:border-blue-400 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Restaurant Website
                  <span className="font-normal text-gray-400 ml-1">(optional)</span>
                </label>
                <input
                  type="url"
                  value={restaurantUrl}
                  onChange={e => setRestaurantUrl(e.target.value)}
                  placeholder="https://thevintageyear.com"
                  className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-xl outline-none focus:border-blue-400"
                />
              </div>
            </div>

            {/* Schedule */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="text-sm font-bold text-gray-700 flex items-center gap-2 mb-4">
                <Calendar size={15} className="text-blue-500" />
                Schedule
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Publish Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={scheduledFor}
                  onChange={e => setScheduledFor(e.target.value)}
                  className="w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-xl outline-none focus:border-blue-400"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Default is next Friday at 6:00 AM. Appears in Boom&apos;s Taste department.
                </p>
              </div>
            </div>

            {error && (
              <div className="px-4 py-3 rounded-xl text-sm bg-red-50 text-red-700 border border-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Scheduling…' : 'Schedule Content →'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
