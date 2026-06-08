'use client'

import { useState } from 'react'
import { Share2, MessageCircle, CheckCircle2, Edit3, X, Calendar, Filter, ExternalLink } from 'lucide-react'
import { MOCK_SOCIAL_POSTS, getSocialStats, type SocialPost, type SocialStatus } from '@/lib/mock-social'
import { cn } from '@/lib/utils'

const STATUS_CONFIG: Record<SocialStatus, { label: string; cls: string }> = {
  draft:    { label: 'Draft',    cls: 'bg-gray-50 text-gray-500 ring-gray-200' },
  pending:  { label: 'Pending',  cls: 'bg-portal-amber-lt text-portal-amber ring-amber-200' },
  approved: { label: 'Approved', cls: 'bg-portal-blue-lt text-portal-blue ring-portal-blue/30' },
  posted:   { label: 'Posted',   cls: 'bg-green-50 text-green-700 ring-green-200' },
}

const PLATFORM_ICON = {
  instagram: Share2,
  facebook:  MessageCircle,
  both:      Share2,
}

const PLATFORM_COLOR = {
  instagram: 'text-rose-500',
  facebook:  'text-portal-blue',
  both:      'text-purple-500',
}

const PUBS = ['All', 'RRP', 'MBP', 'AOP', 'ESP', 'GPP', 'RRB']
const TABS = ['All', 'Pending', 'Draft', 'Approved', 'Posted']

export default function SocialQueuePage() {
  const [posts, setPosts]         = useState<SocialPost[]>(MOCK_SOCIAL_POSTS)
  const [activeTab, setActiveTab] = useState('All')
  const [pubFilter, setPubFilter] = useState('All')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editCaption, setEditCaption] = useState('')

  const stats = getSocialStats()

  const filtered = posts.filter((p) => {
    const tabMatch = activeTab === 'All' || p.status === activeTab.toLowerCase()
    const pubMatch = pubFilter === 'All' || p.publication === pubFilter
    return tabMatch && pubMatch
  })

  const statusCount = (s: SocialStatus) => posts.filter((p) => p.status === s).length

  const approve = (id: string) =>
    setPosts((prev) => prev.map((p) => p.id === id ? { ...p, status: 'approved' as SocialStatus } : p))

  const reject = (id: string) =>
    setPosts((prev) => prev.map((p) => p.id === id ? { ...p, status: 'draft' as SocialStatus } : p))

  const saveEdit = (id: string) => {
    setPosts((prev) => prev.map((p) => p.id === id ? { ...p, caption: editCaption } : p))
    setEditingId(null)
  }

  const formatScheduled = (dt: string) =>
    new Date(dt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-gray-900">Social Queue</h1>
          <span className="text-sm font-semibold text-portal-amber bg-portal-amber-lt px-2.5 py-0.5 rounded-full ring-1 ring-amber-200">
            {statusCount('pending')} pending approval
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-gray-500">All publications</span>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-600">
            <span className="font-semibold text-green-600">{statusCount('posted')}</span>
            <span>posted</span>
            <span className="text-gray-300">·</span>
            <span className="font-semibold text-portal-blue">{statusCount('approved')}</span>
            <span>approved</span>
            <span className="text-gray-300">·</span>
            <span className="font-semibold text-amber-600">{statusCount('pending')}</span>
            <span>pending</span>
          </div>
        </div>
      </div>

      {/* Tabs + filter */}
      <div className="bg-white border-b border-gray-200 px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1">
          {TABS.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab ? 'text-portal-blue border-blue-600' : 'text-gray-500 hover:text-gray-700 border-transparent hover:border-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <select value={pubFilter} onChange={(e) => setPubFilter(e.target.value)}
            className="text-sm text-gray-700 border border-gray-300 rounded-lg px-3 py-1.5 outline-none focus:border-blue-400">
            {PUBS.map((p) => <option key={p} value={p}>{p === 'All' ? 'All Publications' : p}</option>)}
          </select>
        </div>
      </div>

      {/* Post cards */}
      <div className="flex-1 overflow-y-auto bg-portal-bg p-4">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {filtered.map((post) => {
            const PlatIcon = PLATFORM_ICON[post.platform]
            const platColor = PLATFORM_COLOR[post.platform]
            return (
              <div key={post.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-sm transition-shadow">
                {/* Card header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <PlatIcon size={16} className={platColor} />
                    <span className="text-xs font-bold text-gray-500">{post.publication}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ring-1 ${STATUS_CONFIG[post.status].cls}`}>
                      {STATUS_CONFIG[post.status].label}
                    </span>
                    {post.generatedBy === 'claude' && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 font-semibold">AI</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400">
                    <Calendar size={11} />
                    {formatScheduled(post.scheduledAt)}
                  </div>
                </div>

                {/* Caption */}
                <div className="px-4 py-4">
                  {editingId === post.id ? (
                    <div className="space-y-2">
                      <textarea value={editCaption} onChange={(e) => setEditCaption(e.target.value)}
                        className="w-full text-sm text-gray-700 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-blue-400 resize-y min-h-[100px]" />
                      <div className="flex gap-2">
                        <button onClick={() => saveEdit(post.id)} className="text-xs px-3 py-1.5 bg-portal-navy text-white rounded-lg font-medium">Save</button>
                        <button onClick={() => setEditingId(null)} className="text-xs px-3 py-1.5 text-gray-500">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">{post.caption}</p>
                      <p className="text-xs text-portal-blue mt-2">{post.hashtags}</p>
                    </>
                  )}
                </div>

                {/* Posted stats */}
                {post.status === 'posted' && post.reach && (
                  <div className="px-4 pb-3 flex items-center gap-4 text-xs text-gray-500">
                    <span>Reach: <span className="font-semibold text-gray-700">{post.reach.toLocaleString()}</span></span>
                    <span>Engagements: <span className="font-semibold text-gray-700">{post.engagements?.toLocaleString()}</span></span>
                  </div>
                )}

                {/* Actions */}
                {(post.status === 'pending' || post.status === 'draft') && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-t border-gray-100">
                    <button onClick={() => { setEditingId(post.id); setEditCaption(post.caption) }}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                      <Edit3 size={11} /> Edit
                    </button>
                    <button onClick={() => approve(post.id)}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100">
                      <CheckCircle2 size={11} /> Approve → GHL
                    </button>
                    <button onClick={() => reject(post.id)}
                      className="flex items-center gap-1 text-xs px-2.5 py-1.5 text-red-500 hover:text-red-700 transition-colors">
                      <X size={11} /> Reject
                    </button>
                  </div>
                )}
                {post.status === 'approved' && (
                  <div className="px-4 py-2.5 bg-portal-blue-lt border-t border-portal-blue/20 flex items-center justify-between">
                    <span className="text-xs text-portal-blue font-medium">✓ Ready for GHL Social Planner</span>
                    <a href="https://app.gohighlevel.com" target="_blank"
                      className="flex items-center gap-1 text-xs text-portal-blue hover:text-portal-blue">
                      Open GHL <ExternalLink size={10} />
                    </a>
                  </div>
                )}
              </div>
            )
          })}

          {filtered.length === 0 && (
            <div className="col-span-2 flex flex-col items-center justify-center h-48 text-gray-400">
              <Share2 size={32} className="mb-2 opacity-30" />
              <p className="text-sm">No posts in this view</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
