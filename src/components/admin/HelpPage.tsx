'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Search, X, ChevronRight, Clock, Tag, ArrowLeft,
  MessageSquare, BookOpen, AlertCircle, CheckCircle2,
  Loader2, Send, ExternalLink,
} from 'lucide-react'
import {
  KB_ARTICLES, KB_CATEGORIES, searchArticles, getArticle, getArticlesByCategory,
  type KBArticle, type KBRole,
} from '@/lib/knowledge-base'
import { cn } from '@/lib/utils'

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
  'Getting Started': { color: '#2563EB', bg: '#EFF6FF', icon: '🚀' },
  'Advertisers':     { color: '#16A34A', bg: '#F0FDF4', icon: '📊' },
  'Content':         { color: '#7C3AED', bg: '#F5F3FF', icon: '✏️' },
  'Distribution':    { color: '#EA580C', bg: '#FFF7ED', icon: '📦' },
  'Settings':        { color: '#475569', bg: '#F8FAFC', icon: '⚙️' },
  'Reports':         { color: '#0D9488', bg: '#F0FDFA', icon: '📈' },
}

const ROLE_CONFIG: Record<KBRole, { label: string; color: string }> = {
  publisher: { label: 'Publisher',  color: 'bg-portal-blue-lt text-portal-blue' },
  va:        { label: 'VA',         color: 'bg-green-100 text-green-700' },
  editor:    { label: 'Editor',     color: 'bg-purple-100 text-purple-700' },
  all:       { label: 'Everyone',   color: 'bg-gray-100 text-portal-sub' },
}

// ── Article card ──────────────────────────────────────────────────────────────

function ArticleCard({ article, onClick }: { article: KBArticle; onClick: () => void }) {
  const cfg = CATEGORY_CONFIG[article.category] ?? { color: '#374151', bg: '#F9FAFB', icon: '📄' }
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-lg border border-portal-border p-4 hover:border-portal-border-2 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start gap-3">
        <div className="text-xl shrink-0">{cfg.icon}</div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-portal-text group-hover:text-portal-blue transition-colors leading-snug mb-1.5">
            {article.title}
          </h3>
          <p className="text-xs text-portal-sub line-clamp-2 leading-relaxed mb-2.5">
            {article.summary}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
              style={{ backgroundColor: cfg.bg, color: cfg.color }}>
              {article.category}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-portal-muted">
              <Clock size={9} /> {article.timeRequired}
            </span>
            {article.roles.map(r => (
              <span key={r} className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-medium', ROLE_CONFIG[r]?.color)}>
                {ROLE_CONFIG[r]?.label}
              </span>
            ))}
          </div>
        </div>
        <ChevronRight size={15} className="text-gray-300 group-hover:text-blue-400 shrink-0 mt-0.5 transition-colors" />
      </div>
    </button>
  )
}

// ── Article detail view ───────────────────────────────────────────────────────

function ArticleDetail({ article, onBack }: { article: KBArticle; onBack: () => void }) {
  const cfg = CATEGORY_CONFIG[article.category] ?? { color: '#374151', bg: '#F9FAFB', icon: '📄' }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Back */}
      <button onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-portal-blue font-medium mb-5 hover:underline">
        <ArrowLeft size={14} /> Back to articles
      </button>

      {/* Header */}
      <div className="bg-white rounded-lg border border-portal-border p-6 mb-5">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold"
            style={{ backgroundColor: cfg.bg, color: cfg.color }}>
            {cfg.icon} {article.category}
          </span>
          <span className="flex items-center gap-1 text-xs text-portal-muted">
            <Clock size={11} /> {article.timeRequired}
          </span>
          {article.roles.map(r => (
            <span key={r} className={cn('px-2 py-0.5 rounded-full text-[10px] font-medium', ROLE_CONFIG[r]?.color)}>
              <Tag size={8} className="inline mr-0.5" />{ROLE_CONFIG[r]?.label}
            </span>
          ))}
        </div>
        <h1 className="text-xl font-bold text-portal-text mb-2">{article.title}</h1>
        <p className="text-sm text-portal-sub leading-relaxed">{article.summary}</p>
      </div>

      {/* Steps */}
      <div className="bg-white rounded-lg border border-portal-border p-6 mb-5">
        <h2 className="text-base font-bold text-portal-text mb-4 flex items-center gap-2">
          <BookOpen size={16} className="text-portal-blue" /> Step-by-step instructions
        </h2>
        <ol className="space-y-5">
          {article.steps.map((step, i) => (
            <li key={i} className="flex gap-4">
              <div className="w-7 h-7 rounded-full bg-portal-navy text-white text-sm font-bold flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </div>
              <div className="flex-1 pb-5 border-b border-portal-border last:border-0 last:pb-0">
                <div className="text-sm font-semibold text-portal-text mb-1">{step.title}</div>
                <p className="text-sm text-portal-sub leading-relaxed">{step.description}</p>
                {/* Screenshot placeholder */}
                <div className="mt-3 h-16 rounded-xl border-2 border-dashed border-portal-border flex items-center justify-center">
                  <span className="text-xs text-gray-300">Screenshot placeholder</span>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* What happens next */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-5 mb-5">
        <h2 className="text-sm font-bold text-green-800 mb-2 flex items-center gap-2">
          <CheckCircle2 size={15} className="text-green-600" /> What happens next
        </h2>
        <p className="text-sm text-green-700 leading-relaxed">{article.whatHappensNext}</p>
      </div>

      {/* Common errors */}
      {article.commonErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-5 mb-5">
          <h2 className="text-sm font-bold text-red-800 mb-3 flex items-center gap-2">
            <AlertCircle size={15} className="text-red-500" /> Common errors & fixes
          </h2>
          <div className="space-y-3">
            {article.commonErrors.map((err, i) => (
              <div key={i} className="bg-white rounded-xl border border-red-100 p-3">
                <div className="text-xs font-semibold text-red-700 mb-1">⚠ {err.error}</div>
                <div className="text-xs text-portal-text leading-relaxed">→ {err.fix}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Related articles */}
      {article.relatedArticles.length > 0 && (
        <div className="bg-white rounded-lg border border-portal-border p-5 mb-5">
          <h2 className="text-sm font-bold text-portal-text mb-3">Related articles</h2>
          <div className="space-y-2">
            {article.relatedArticles.map(id => {
              const rel = getArticle(id)
              if (!rel) return null
              const rcfg = CATEGORY_CONFIG[rel.category] ?? { color: '#374151', bg: '#F9FAFB', icon: '📄' }
              return (
                <button key={id} onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' })
                  // Navigate handled by parent
                }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-portal-bg transition-colors text-left">
                  <span className="text-base">{rcfg.icon}</span>
                  <span className="text-sm text-portal-blue hover:underline font-medium">{rel.title}</span>
                  <ChevronRight size={13} className="text-gray-300 ml-auto" />
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Inline AI Chat ────────────────────────────────────────────────────────────

type ChatMessage = { role: 'user' | 'assistant'; content: string; articles?: { id: string; title: string }[] }

function InlineAIChat({ onArticleSelect }: { onArticleSelect: (id: string) => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

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
        const data = await res.json() as { reply: string; relevantArticles: { id: string; title: string }[] }
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply, articles: data.relevantArticles }])
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I hit an error. Try again or browse the articles." }])
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "Network error. Try again." }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-portal-border overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-portal-border"
        style={{ backgroundColor: 'var(--color-sidebar)' }}>
        <MessageSquare size={14} className="text-white/70" />
        <span className="text-sm font-semibold text-white">Ask the AI Assistant</span>
      </div>

      <div className="min-h-32 max-h-72 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-sm text-portal-muted text-center py-6">
            Ask me anything about the KeepSharing platform.
          </p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={cn(
              'max-w-[85%] rounded-lg px-3 py-2 text-sm',
              msg.role === 'user' ? 'bg-portal-navy text-white rounded-br-sm' : 'bg-gray-100 text-portal-text rounded-bl-sm'
            )}>
              {msg.content}
              {msg.articles && msg.articles.length > 0 && (
                <div className="mt-2 space-y-1">
                  {msg.articles.map(a => (
                    <button key={a.id} onClick={() => onArticleSelect(a.id)}
                      className="flex items-center gap-1 text-xs text-portal-blue bg-white/70 rounded-lg px-2 py-0.5 hover:bg-white transition-colors">
                      <ExternalLink size={9} /> {a.title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg rounded-bl-sm px-3 py-2 flex items-center gap-2">
              <Loader2 size={12} className="text-portal-muted animate-spin" />
              <span className="text-xs text-portal-muted">Thinking…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-portal-border px-3 py-2.5">
        <div className="flex items-center gap-2 bg-portal-bg border border-portal-border rounded-xl px-3 py-1.5">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); send() } }}
            placeholder="How do I clone to next month?"
            className="flex-1 text-sm bg-transparent outline-none text-portal-text placeholder-gray-400"
          />
          <button onClick={send} disabled={!input.trim() || loading}
            className={cn('w-6 h-6 rounded-lg flex items-center justify-center transition-colors',
              input.trim() ? 'bg-portal-navy' : 'bg-gray-200')}>
            <Send size={11} className={input.trim() ? 'text-white' : 'text-portal-muted'} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main HelpPage ─────────────────────────────────────────────────────────────

export function HelpPage() {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const [search, setSearch]               = useState('')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [activeArticle, setActiveArticle] = useState<KBArticle | null>(null)

  // Handle ?article= URL param
  useEffect(() => {
    const articleId = searchParams.get('article')
    if (articleId) {
      const found = getArticle(articleId)
      if (found) setActiveArticle(found)
    }
  }, [searchParams])

  const selectArticle = (article: KBArticle) => {
    setActiveArticle(article)
    router.replace(`/admin/help?article=${article.id}`, { scroll: false })
  }

  const clearArticle = () => {
    setActiveArticle(null)
    router.replace('/admin/help', { scroll: false })
  }

  const displayedArticles = search.trim()
    ? searchArticles(search)
    : activeCategory
      ? getArticlesByCategory(activeCategory)
      : KB_ARTICLES

  const CATEGORY_COUNTS = Object.fromEntries(
    KB_CATEGORIES.map(cat => [cat, getArticlesByCategory(cat).length])
  )

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-portal-border px-6 py-5 shrink-0">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-portal-text mb-1">Help Center</h1>
          <p className="text-sm text-portal-sub mb-4">
            Step-by-step guides for every workflow in the KeepSharing platform.
          </p>
          {/* Search */}
          <div className="relative max-w-xl">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-portal-muted" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setActiveCategory(null); setActiveArticle(null) }}
              placeholder="Search articles — e.g. clone sheet, import zoho, editorial board"
              className="w-full pl-10 pr-10 py-3 text-sm text-portal-text bg-portal-bg border border-portal-border rounded-lg outline-none focus:border-portal-blue focus:bg-white transition-all"
            />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-portal-muted hover:text-portal-sub">
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden flex">
        {/* Sidebar */}
        <aside className="w-56 shrink-0 bg-white border-r border-portal-border overflow-y-auto py-4 px-3">
          {/* All articles */}
          <button
            onClick={() => { setActiveCategory(null); setSearch(''); setActiveArticle(null) }}
            className={cn(
              'w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-colors mb-1',
              !activeCategory && !search
                ? 'bg-portal-blue-lt text-portal-blue'
                : 'text-portal-sub hover:bg-portal-bg'
            )}
          >
            <span>All Articles</span>
            <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-semibold',
              !activeCategory && !search ? 'bg-portal-navy text-white' : 'bg-gray-100 text-portal-sub')}>
              {KB_ARTICLES.length}
            </span>
          </button>

          <div className="h-px bg-gray-100 my-2" />

          {KB_CATEGORIES.map(cat => {
            const cfg = CATEGORY_CONFIG[cat] ?? { color: '#374151', bg: '#F9FAFB', icon: '📄' }
            const isActive = activeCategory === cat
            return (
              <button
                key={cat}
                onClick={() => { setActiveCategory(cat); setSearch(''); setActiveArticle(null) }}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-colors mb-0.5',
                  isActive ? 'text-white' : 'text-portal-sub hover:bg-portal-bg'
                )}
                style={isActive ? { backgroundColor: cfg.color } : undefined}
              >
                <span className="flex items-center gap-2">
                  <span className="text-base">{cfg.icon}</span>
                  {cat}
                </span>
                <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-semibold',
                  isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-portal-sub')}>
                  {CATEGORY_COUNTS[cat]}
                </span>
              </button>
            )
          })}

          <div className="h-px bg-gray-100 my-3" />
          <div className="px-3 text-xs font-semibold text-portal-muted uppercase tracking-wide mb-2">Quick help</div>
          <Link href="/admin/today"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-portal-sub hover:bg-portal-bg transition-colors">
            <span>📅</span> Today screen
          </Link>
          <Link href="/admin/advertisers"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-portal-sub hover:bg-portal-bg transition-colors">
            <span>📊</span> Advertisers
          </Link>
          <Link href="/admin/content/editorial-board"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-portal-sub hover:bg-portal-bg transition-colors">
            <span>✏️</span> Editorial Board
          </Link>
        </aside>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto">
          {activeArticle ? (
            <div className="max-w-3xl mx-auto px-6 py-6">
              <ArticleDetail article={activeArticle} onBack={clearArticle} />
            </div>
          ) : (
            <div className="max-w-4xl mx-auto px-6 py-6">
              {/* Section heading */}
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-bold text-portal-text">
                  {search
                    ? `${displayedArticles.length} result${displayedArticles.length !== 1 ? 's' : ''} for "${search}"`
                    : activeCategory
                      ? activeCategory
                      : `All Articles (${KB_ARTICLES.length})`
                  }
                </h2>
              </div>

              {displayedArticles.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-4xl mb-3">🔍</div>
                  <div className="text-base font-semibold text-portal-text mb-2">No articles found</div>
                  <p className="text-sm text-portal-sub mb-4">Try different keywords, or ask the AI assistant below.</p>
                  <button onClick={() => setSearch('')} className="text-sm text-portal-blue hover:underline">
                    Clear search
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
                  {displayedArticles.map(article => (
                    <ArticleCard key={article.id} article={article} onClick={() => selectArticle(article)} />
                  ))}
                </div>
              )}

              {/* AI Assistant */}
              <InlineAIChat onArticleSelect={(id) => {
                const a = getArticle(id)
                if (a) selectArticle(a)
              }} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
