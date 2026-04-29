'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Heart, ArrowLeft, Printer, Share2, X } from 'lucide-react'
import { MOCK_CAMPS, CATEGORY_CONFIG, type Camp } from '@/components/rrp/SummerFunGuide'

export default function MySummerListPage() {
  const [savedIds, setSavedIds] = useState<string[]>([])
  const [camps, setCamps]       = useState<Camp[]>([])
  const [copied, setCopied]     = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('sfg_saved')
      const ids: string[] = raw ? JSON.parse(raw) : []
      setSavedIds(ids)
      // Filter mock camps for now; real data would be fetched via API
      setCamps(MOCK_CAMPS.filter(c => ids.includes(c.id)))
    } catch { /* ok */ }
  }, [])

  const remove = (id: string) => {
    const next = savedIds.filter(s => s !== id)
    setSavedIds(next)
    setCamps(prev => prev.filter(c => c.id !== id))
    localStorage.setItem('sfg_saved', JSON.stringify(next))
  }

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ok */ }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-5 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/summer-fun-guide" className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium">
            <ArrowLeft size={15} /> Back to Guide
          </Link>
          <div className="flex gap-2">
            <button onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-full hover:bg-gray-50 no-print">
              <Printer size={13} /> Print
            </button>
            <button onClick={share}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-full hover:bg-gray-50 no-print">
              <Share2 size={13} /> {copied ? 'Copied!' : 'Share'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-5 py-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
            <Heart size={18} className="fill-red-500 text-red-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Summer List</h1>
            <p className="text-sm text-gray-500">{camps.length} saved {camps.length === 1 ? 'camp' : 'camps'}</p>
          </div>
        </div>

        {camps.length === 0 ? (
          <div className="text-center py-16">
            <Heart size={40} className="mx-auto text-gray-200 mb-4" />
            <div className="text-lg font-semibold text-gray-700 mb-2">No camps saved yet</div>
            <p className="text-sm text-gray-500 mb-6">
              Tap the ♡ on any camp listing to save it here.
            </p>
            <Link href="/summer-fun-guide"
              className="inline-block px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors">
              Browse the Summer Guide
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {camps.map(camp => {
              const cfg = CATEGORY_CONFIG[camp.category] ?? { color: '#374151', bg: '#F9FAFB', border: '#E5E7EB', icon: '⭐' }
              return (
                <div key={camp.id}
                  className="bg-white rounded-2xl border border-gray-200 p-4 flex items-start gap-4 print:break-inside-avoid">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                    style={{ backgroundColor: cfg.bg }}>
                    {cfg.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <Link href={`/summer-fun-guide/${camp.slug}`}
                          className="text-sm font-bold text-gray-900 hover:text-blue-700">
                          {camp.business_name}
                        </Link>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs text-gray-500">{camp.city}</span>
                          {camp.ages && <span className="text-xs text-gray-400">· {camp.ages}</span>}
                          {camp.phone && <a href={`tel:${camp.phone}`} className="text-xs text-blue-600 font-medium no-print">{camp.phone}</a>}
                        </div>
                      </div>
                      <button onClick={() => remove(camp.id)}
                        className="text-gray-300 hover:text-red-400 transition-colors shrink-0 no-print">
                        <X size={16} />
                      </button>
                    </div>
                    {camp.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{camp.description}</p>
                    )}
                  </div>
                </div>
              )
            })}

            <div className="pt-4 no-print">
              <Link href="/summer-fun-guide"
                className="inline-block text-sm font-semibold text-blue-600 hover:underline">
                + Add more camps
              </Link>
            </div>
          </div>
        )}
      </div>

      <style>{`@media print { .no-print { display: none !important; } }`}</style>
    </div>
  )
}
