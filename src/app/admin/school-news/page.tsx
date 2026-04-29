'use client'

import { useState } from 'react'
import { CheckCircle2, X, Plus, Link as LinkIcon, School } from 'lucide-react'
import { MOCK_SCHOOL_NEWS, MONTGOMERY_SCHOOLS, type SchoolNewsItem, type NewsStatus } from '@/lib/mock-school-news'
import { cn } from '@/lib/utils'

const SOURCE_BADGE: Record<string, string> = {
  form:     'bg-blue-50 text-blue-700 ring-blue-200',
  email:    'bg-purple-50 text-purple-700 ring-purple-200',
  facebook: 'bg-sky-50 text-sky-700 ring-sky-200',
  manual:   'bg-gray-50 text-gray-500 ring-gray-200',
}

const TABS = ['Pending Review', 'Approved', 'Rejected']

export default function SchoolNewsPage() {
  const [items, setItems]       = useState<SchoolNewsItem[]>(MOCK_SCHOOL_NEWS)
  const [activeTab, setActiveTab] = useState('Pending Review')
  const [quickAdd, setQuickAdd] = useState(false)
  const [fbUrl, setFbUrl]       = useState('')
  const [qaBlurb, setQaBlurb]   = useState('')
  const [qaSchool, setQaSchool] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editBlurb, setEditBlurb] = useState('')

  const statusFilter: Record<string, NewsStatus> = {
    'Pending Review': 'pending',
    'Approved':       'approved',
    'Rejected':       'rejected',
  }

  const filtered = items.filter((i) => i.status === statusFilter[activeTab])
  const counts   = {
    'Pending Review': items.filter((i) => i.status === 'pending').length,
    'Approved':       items.filter((i) => i.status === 'approved').length,
    'Rejected':       items.filter((i) => i.status === 'rejected').length,
  }

  const approve = (id: string) =>
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, status: 'approved' as NewsStatus } : i))

  const reject = (id: string) =>
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, status: 'rejected' as NewsStatus } : i))

  const saveEdit = (id: string) => {
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, blurb: editBlurb } : i))
    setEditingId(null)
  }

  const handleQuickAdd = () => {
    if (!qaBlurb || !qaSchool) return
    const newItem: SchoolNewsItem = {
      id:          `sn${Date.now()}`,
      school:      qaSchool,
      blurb:       qaBlurb,
      imageUrl:    null,
      source:      fbUrl ? 'facebook' : 'manual',
      status:      'pending',
      submittedAt: new Date().toISOString().slice(0,10),
      publication: 'RRP',
      facebookUrl: fbUrl || undefined,
    }
    setItems((prev) => [newItem, ...prev])
    setFbUrl(''); setQaBlurb(''); setQaSchool(''); setQuickAdd(false)
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-gray-900">School News</h1>
          <span className="text-sm font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full ring-1 ring-amber-200">
            {counts['Pending Review']} pending
          </span>
        </div>
        <button onClick={() => setQuickAdd(!quickAdd)}
          className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
          <Plus size={14} /> Quick Add
        </button>
      </div>

      {/* Quick Add Panel */}
      {quickAdd && (
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-4 shrink-0">
          <div className="max-w-2xl space-y-3">
            <h3 className="text-sm font-semibold text-blue-900">Quick Add School News</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-blue-800 mb-1">Facebook Post URL <span className="font-normal text-blue-600">(optional)</span></label>
                <div className="relative">
                  <LinkIcon size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" />
                  <input type="url" value={fbUrl} onChange={(e) => setFbUrl(e.target.value)}
                    placeholder="https://facebook.com/post/..."
                    className="w-full pl-9 pr-3 py-2 text-sm border border-blue-200 bg-white rounded-lg outline-none focus:border-blue-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-blue-800 mb-1">School *</label>
                <select value={qaSchool} onChange={(e) => setQaSchool(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-blue-200 bg-white rounded-lg outline-none focus:border-blue-400">
                  <option value="">Select school…</option>
                  {MONTGOMERY_SCHOOLS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-800 mb-1">News Blurb *</label>
              <textarea value={qaBlurb} onChange={(e) => setQaBlurb(e.target.value)}
                placeholder="Paste the Facebook post text or type the school news blurb here…"
                className="w-full px-3 py-2 text-sm border border-blue-200 bg-white rounded-lg outline-none focus:border-blue-400 resize-y min-h-[72px]" />
            </div>
            <div className="flex gap-2">
              <button onClick={handleQuickAdd} disabled={!qaBlurb || !qaSchool}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                Add to Queue
              </button>
              <button onClick={() => setQuickAdd(false)} className="px-4 py-2 text-sm text-blue-700 hover:text-blue-900">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-6 shrink-0">
        <div className="flex items-center gap-1">
          {TABS.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab ? 'text-blue-600 border-blue-600' : 'text-gray-500 hover:text-gray-700 border-transparent hover:border-gray-300'
              }`}>
              {tab}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ring-1 ${activeTab === tab ? 'bg-blue-50 text-blue-700 ring-blue-200' : 'bg-gray-50 text-gray-400 ring-gray-200'}`}>
                {counts[tab as keyof typeof counts]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Queue */}
      <div className="flex-1 overflow-y-auto bg-[#f4f5f7] p-4 space-y-3">
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <School size={32} className="mb-2 opacity-30" />
            <p className="text-sm">No items in this queue</p>
          </div>
        )}
        {filtered.map((item) => (
          <div key={item.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900">{item.school}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ring-1 ${SOURCE_BADGE[item.source]}`}>
                      {item.source === 'facebook' ? 'Facebook' : item.source === 'email' ? 'Email' : item.source === 'form' ? 'Form' : 'Manual'}
                    </span>
                    {item.facebookUrl && (
                      <a href={item.facebookUrl} target="_blank" className="text-[10px] text-sky-600 hover:underline">View post ↗</a>
                    )}
                    <span className="text-[10px] text-gray-400 ml-auto">{item.submittedAt}</span>
                  </div>

                  {editingId === item.id ? (
                    <div className="space-y-2">
                      <textarea value={editBlurb} onChange={(e) => setEditBlurb(e.target.value)}
                        className="w-full text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400 resize-y min-h-[80px]" />
                      <div className="flex gap-2">
                        <button onClick={() => saveEdit(item.id)} className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg font-medium">Save</button>
                        <button onClick={() => setEditingId(null)} className="text-xs px-3 py-1.5 text-gray-500 hover:text-gray-700">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-700 leading-relaxed">{item.blurb}</p>
                  )}

                  {item.submittedBy && (
                    <p className="text-xs text-gray-400 mt-1.5">Submitted by: {item.submittedBy}</p>
                  )}
                </div>
              </div>
            </div>

            {item.status === 'pending' && (
              <div className="flex items-center gap-2 px-5 py-3 bg-gray-50 border-t border-gray-100">
                <button onClick={() => { setEditingId(item.id); setEditBlurb(item.blurb) }}
                  className="text-xs px-3 py-1.5 text-gray-600 border border-gray-300 bg-white rounded-lg hover:bg-gray-50 transition-colors">
                  Edit
                </button>
                <button onClick={() => approve(item.id)}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors">
                  <CheckCircle2 size={12} /> Approve → Publish
                </button>
                <button onClick={() => reject(item.id)}
                  className="flex items-center gap-1 text-xs px-3 py-1.5 text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors">
                  <X size={12} /> Reject
                </button>
              </div>
            )}
            {item.status === 'approved' && (
              <div className="px-5 py-2.5 bg-green-50 border-t border-green-100">
                <span className="text-xs text-green-700 font-medium flex items-center gap-1.5">
                  <CheckCircle2 size={12} /> Published to School Bits
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
