'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Bell, HelpCircle, MessageSquare,
  X, Search, Send, ChevronRight, Loader2, Check,
  ExternalLink, LogOut, RefreshCw, Wrench,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { searchArticles } from '@/lib/knowledge-base'
import { createClient } from '@/lib/supabase/client'

// ── Mock notifications ────────────────────────────────────────────────────────

type Notification = {
  id: number
  dot: 'red' | 'amber' | 'green' | 'blue'
  title: string
  body: string
  time: string
  href?: string
  read: boolean
}

const MOCK_NOTIFICATIONS: Notification[] = [
  { id: 1, dot: 'red',   title: 'Ad proof needed',          body: 'Baptist Health artwork missing — deadline today', time: '2h ago', href: '/admin/advertisers/ad-proofs', read: false },
  { id: 2, dot: 'red',   title: 'SFG upgrade paid',         body: 'YMCA Montgomery upgraded to Enhanced listing', time: '3h ago', href: '/admin/content/forms', read: false },
  { id: 3, dot: 'amber', title: 'Editorial item overdue',   body: 'Student Spotlight — May issue — past due date', time: '5h ago', href: '/admin/content/editorial-board', read: false },
  { id: 4, dot: 'amber', title: 'Agreement pending review', body: 'Prattville Christian — signed 2 days ago', time: '2d ago', href: '/admin/advertisers/agreements', read: false },
  { id: 5, dot: 'green', title: 'Import complete',          body: '3,949 records imported successfully', time: '3d ago', href: '/admin/import', read: true },
  { id: 6, dot: 'blue',  title: 'Anniversary spotlight',    body: 'Robert & Linda Braswell — Premium — needs PDF', time: '4d ago', href: '/admin/content/anniversaries', read: true },
]

const DOT_COLORS: Record<Notification['dot'], string> = {
  red:   'bg-red-500',
  amber: 'bg-amber-400',
  green: 'bg-green-500',
  blue:  'bg-portal-blue-lt0',
}

// ── AI Chat message type ───────────────────────────────────────────────────────

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
  articles?: { id: string; title: string; category: string }[]
}

// ── Sub-components ────────────────────────────────────────────────────────────

function NotificationDropdown({ onClose }: { onClose: () => void }) {
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS)
  const unread = notifications.filter(n => !n.read).length

  const markRead = (id: number) =>
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  const markAllRead = () =>
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))

  return (
    <div className="absolute right-0 top-10 w-80 bg-white rounded-2xl border border-gray-200 shadow-2xl z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-900">Notifications</span>
          {unread > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
              {unread}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unread > 0 && (
            <button onClick={markAllRead} className="text-xs text-portal-blue hover:underline">
              Mark all read
            </button>
          )}
          <button onClick={onClose}><X size={14} className="text-gray-400" /></button>
        </div>
      </div>

      <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
        {notifications.map(n => (
          <div
            key={n.id}
            onClick={() => markRead(n.id)}
            className={cn(
              'flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer',
              !n.read && 'bg-portal-blue-lt/40'
            )}
          >
            <div className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', DOT_COLORS[n.dot])} />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-gray-900 flex items-center justify-between gap-2">
                <span className="truncate">{n.title}</span>
                <span className="text-gray-400 text-[10px] shrink-0 font-normal">{n.time}</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5 leading-snug">{n.body}</p>
            </div>
            {n.href && (
              <Link href={n.href} className="shrink-0 mt-0.5" onClick={onClose}>
                <ChevronRight size={13} className="text-gray-300 hover:text-gray-500" />
              </Link>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-gray-100 px-4 py-2">
        <Link href="/admin/today" onClick={onClose}
          className="text-xs text-portal-blue hover:underline font-medium">
          View all in Today screen →
        </Link>
      </div>
    </div>
  )
}

// ── KB search overlay ─────────────────────────────────────────────────────────

function KBSearchOverlay({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('')
  const router            = useRouter()
  const results           = query.trim() ? searchArticles(query) : []
  const inputRef          = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const go = (id: string) => { onClose(); router.push(`/admin/help?article=${id}`) }

  const CATEGORY_COLORS: Record<string, string> = {
    'Getting Started': 'bg-portal-blue-lt text-portal-blue',
    'Advertisers':     'bg-green-100 text-green-700',
    'Content':         'bg-purple-100 text-purple-700',
    'Distribution':    'bg-orange-100 text-orange-700',
    'Settings':        'bg-slate-100 text-slate-600',
    'Reports':         'bg-teal-100 text-teal-700',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
          <Search size={18} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search the knowledge base…"
            className="flex-1 text-base outline-none text-gray-900 placeholder-gray-400"
          />
          <button onClick={onClose}><X size={17} className="text-gray-400 hover:text-gray-600" /></button>
        </div>

        {/* Results */}
        {query.trim() ? (
          results.length > 0 ? (
            <ul className="max-h-80 overflow-y-auto divide-y divide-gray-50">
              {results.map(article => (
                <li key={article.id}>
                  <button
                    onClick={() => go(article.id)}
                    className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-gray-900 mb-0.5">{article.title}</div>
                      <p className="text-xs text-gray-500 line-clamp-1">{article.summary}</p>
                    </div>
                    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 mt-0.5',
                      CATEGORY_COLORS[article.category] ?? 'bg-gray-100 text-gray-600')}>
                      {article.category}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              No articles found for &ldquo;{query}&rdquo;
            </div>
          )
        ) : (
          <div className="px-4 py-4">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Quick links</div>
            <div className="flex flex-wrap gap-2">
              {['clone advertiser sheet', 'import zoho', 'editorial board', 'add advertiser', 'ad proof'].map(term => (
                <button key={term} onClick={() => setQuery(term)}
                  className="px-3 py-1.5 text-xs text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
                  {term}
                </button>
              ))}
            </div>
            <Link href="/admin/help" onClick={onClose}
              className="mt-4 block text-xs text-portal-blue font-medium hover:underline">
              Browse all articles →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

// ── AI Chat panel ─────────────────────────────────────────────────────────────

function AIChatPanel({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: "Hi! I'm the KeepSharing assistant. Ask me anything about the platform — cloning advertiser sheets, importing data, using the editorial board, or anything else." },
  ])
  const [input, setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef           = useRef<HTMLDivElement>(null)
  const inputRef            = useRef<HTMLInputElement>(null)
  const router              = useRouter()

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  useEffect(() => { inputRef.current?.focus() }, [])

  const send = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }))
      history.push({ role: 'user', content: userMsg })

      const res = await fetch('/api/help/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history, query: userMsg }),
      })

      if (res.ok) {
        const data = await res.json() as {
          reply: string
          relevantArticles: { id: string; title: string; category: string }[]
        }
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.reply,
          articles: data.relevantArticles,
        }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I hit an error. Try again or browse the help articles directly." }])
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "Network error. Check your connection and try again." }])
    } finally {
      setLoading(false)
    }
  }

  const QUICK = ['How do I clone to next month?', 'How do I import from Zoho?', 'How does the editorial board work?']

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white border-l border-gray-200 shadow-2xl z-40 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0"
        style={{ backgroundColor: 'var(--color-sidebar)' }}>
        <div className="flex items-center gap-2">
          <MessageSquare size={16} className="text-white/70" />
          <span className="text-sm font-semibold text-white">KeepSharing Assistant</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/help" onClick={onClose} className="text-white/50 hover:text-white transition-colors">
            <ExternalLink size={13} />
          </Link>
          <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={cn(
              'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
              msg.role === 'user'
                ? 'bg-portal-navy text-white rounded-br-sm'
                : 'bg-gray-100 text-gray-800 rounded-bl-sm'
            )}>
              {msg.content}
              {msg.articles && msg.articles.length > 0 && (
                <div className="mt-2 space-y-1">
                  {msg.articles.map(a => (
                    <Link key={a.id} href={`/admin/help?article=${a.id}`} onClick={onClose}
                      className="flex items-center gap-1 text-xs text-portal-blue hover:underline bg-white/60 rounded-lg px-2 py-1">
                      <ExternalLink size={10} />
                      {a.title}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-3.5 py-2.5 flex items-center gap-2">
              <Loader2 size={13} className="text-gray-400 animate-spin" />
              <span className="text-xs text-gray-400">Thinking…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts — show only at start */}
      {messages.length === 1 && (
        <div className="px-4 pb-3 flex flex-wrap gap-1.5 shrink-0">
          {QUICK.map(q => (
            <button key={q} onClick={() => { setInput(q); setTimeout(() => send(), 50) }}
              className="px-2.5 py-1 text-[11px] text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors">
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-3 pb-3 shrink-0 border-t border-gray-100 pt-3">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Ask anything about the platform…"
            className="flex-1 text-sm bg-transparent outline-none text-gray-900 placeholder-gray-400"
          />
          <button onClick={send} disabled={!input.trim() || loading}
            className="w-7 h-7 rounded-lg flex items-center justify-center disabled:opacity-40 transition-colors"
            style={{ backgroundColor: input.trim() ? '#2563EB' : '#E5E7EB' }}>
            <Send size={13} className={input.trim() ? 'text-white' : 'text-gray-400'} />
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-1.5 text-center">
          Powered by Claude · Answers based on KeepSharing knowledge base
        </p>
      </div>
    </div>
  )
}

// ── Profile dropdown ──────────────────────────────────────────────────────────

type Me = {
  email:    string
  fullName: string | null
  role:     'super' | 'admin' | 'publisher' | 'editor'
}

const ROLE_LABEL: Record<Me['role'], string> = {
  super:     'Super Admin',
  admin:     'Admin',
  publisher: 'Publisher',
  editor:    'Editor',
}

function ProfileDropdown({ me, onClose }: { me: Me | null; onClose: () => void }) {
  const [signingOut, setSigningOut] = useState(false)

  async function signOut() {
    setSigningOut(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      window.location.href = '/admin/login'
    } finally { setSigningOut(false) }
  }

  return (
    <div className="absolute right-0 top-10 w-56 bg-white rounded-2xl border border-gray-200 shadow-2xl z-50 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="text-sm font-semibold text-gray-900 truncate">
          {me?.fullName || me?.email?.split('@')[0] || '—'}
        </div>
        <div className="text-xs text-gray-400 truncate">{me?.email ?? '—'}</div>
        {me?.role && (
          <div className="text-[10px] text-portal-blue font-medium mt-0.5">{ROLE_LABEL[me.role]}</div>
        )}
      </div>
      <div className="py-1">
        <Link href="/admin/settings/account" onClick={onClose}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
          Account & Password
        </Link>
        <Link href="/admin/settings" onClick={onClose}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
          Platform Settings
        </Link>
        <Link href="/admin/help" onClick={onClose}
          className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
          Help Center
        </Link>
      </div>
      <div className="border-t border-gray-100 py-1">
        <button
          onClick={signOut}
          disabled={signingOut}
          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-40"
        >
          {signingOut ? <RefreshCw size={13} className="animate-spin" /> : <LogOut size={13} />}
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </div>
  )
}

// ── Main AdminHeader ──────────────────────────────────────────────────────────

export function AdminHeader() {
  const [openPanel, setOpenPanel] = useState<
    'notifications' | 'search' | 'chat' | 'profile' | null
  >(null)
  const [me, setMe] = useState<Me | null>(null)

  const [maintenance, setMaintenance] = useState(false)
  const [maintBusy, setMaintBusy]     = useState(false)

  // Pull identity + maintenance status on mount
  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/me', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(j => { if (!cancelled && j) setMe({ email: j.email, fullName: j.fullName, role: j.role }) })
      .catch(() => {})
    fetch('/api/admin/maintenance', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(j => { if (!cancelled && j) setMaintenance(!!j.enabled) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  async function toggleMaintenance() {
    setMaintBusy(true)
    try {
      const res = await fetch('/api/admin/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !maintenance }),
      })
      if (res.ok) {
        const j = await res.json()
        setMaintenance(j.enabled)
      }
    } finally { setMaintBusy(false) }
  }

  const isSettingsTier = me?.role === 'super' || me?.role === 'admin'

  const toggle = (panel: typeof openPanel) =>
    setOpenPanel(prev => prev === panel ? null : panel)

  const close = () => setOpenPanel(null)

  const unreadCount = MOCK_NOTIFICATIONS.filter(n => !n.read).length
  const initials = (me?.fullName || me?.email || 'AD')
    .split(/\s+|@/)
    .filter(Boolean)
    .slice(0, 2)
    .map(s => s[0]?.toUpperCase() ?? '')
    .join('') || 'AD'

  return (
    <>
      {/* Header bar (Portal: white strip, 1px portal-border) */}
      <header className="h-11 shrink-0 bg-white border-b border-portal-border flex items-center justify-end px-4 gap-1 z-30">
        {/* Maintenance toggle — Super/Admin only */}
        {isSettingsTier && (
          <button
            onClick={toggleMaintenance}
            disabled={maintBusy}
            title={maintenance ? 'Site is OFFLINE — click to bring it back' : 'Take the site offline for maintenance'}
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors mr-auto disabled:opacity-50',
              maintenance
                ? 'bg-portal-amber-lt text-portal-amber ring-1 ring-amber-300 hover:bg-amber-200'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            )}
          >
            {maintBusy ? <RefreshCw size={12} className="animate-spin" /> : <Wrench size={12} />}
            {maintenance ? 'Site Offline — Restore' : 'Maintenance'}
          </button>
        )}

        {/* Bell */}
        <div className="relative">
          <button
            onClick={() => toggle('notifications')}
            className={cn(
              'w-8 h-8 rounded-lg flex items-center justify-center transition-colors relative',
              openPanel === 'notifications' ? 'bg-portal-blue-lt text-portal-blue' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
            )}
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>
          {openPanel === 'notifications' && <NotificationDropdown onClose={close} />}
        </div>

        {/* Help / KB search */}
        <button
          onClick={() => toggle('search')}
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
            openPanel === 'search' ? 'bg-portal-blue-lt text-portal-blue' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
          )}
        >
          <HelpCircle size={16} />
        </button>

        {/* AI chat */}
        <button
          onClick={() => toggle('chat')}
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
            openPanel === 'chat' ? 'bg-portal-blue-lt text-portal-blue' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
          )}
        >
          <MessageSquare size={16} />
        </button>

        {/* Profile */}
        <div className="relative ml-1">
          <button
            onClick={() => toggle('profile')}
            className="w-7 h-7 rounded-full bg-portal-navy flex items-center justify-center text-white text-xs font-bold"
            aria-label="Open profile menu"
          >
            {initials}
          </button>
          {openPanel === 'profile' && <ProfileDropdown me={me} onClose={close} />}
        </div>
      </header>

      {/* KB search overlay (full-screen) */}
      {openPanel === 'search' && <KBSearchOverlay onClose={close} />}

      {/* AI chat side panel */}
      {openPanel === 'chat' && <AIChatPanel onClose={close} />}

      {/* Click-outside backdrop for dropdowns */}
      {(openPanel === 'notifications' || openPanel === 'profile') && (
        <div className="fixed inset-0 z-40" onClick={close} />
      )}
    </>
  )
}
