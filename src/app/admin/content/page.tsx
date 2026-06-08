import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import {
  FileText, Plus, Upload, CheckCircle, AlertCircle,
  ImageOff, GraduationCap, CalendarDays, BookOpen, ArrowRight,
  Clock, Eye,
} from 'lucide-react'
import { editorialStatusInfo, columnLabel } from '@/lib/content-taxonomy'
import { articleHref } from '@/lib/articles/slug'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Content Dashboard — Admin' }
export const dynamic = 'force-dynamic'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

function oneWeekAgo() {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return d.toISOString()
}

export default async function ContentDashboard() {
  const supabase = supabaseAdmin()
  const today = new Date().toISOString().split('T')[0]

  const [
    pendingRes,
    publishedWeekRes,
    missingImageRes,
    sbPendingRes,
    eventsRes,
    guideListingsRes,
    recentRes,
  ] = await Promise.all([
    supabase.from('guide_articles').select('id', { count: 'exact', head: true })
      .eq('editorial_review_status', 'pending'),
    supabase.from('guide_articles').select('id', { count: 'exact', head: true })
      .eq('published', true)
      .gte('published_at', oneWeekAgo()),
    supabase.from('guide_articles').select('id', { count: 'exact', head: true })
      .is('hero_image_url', null),
    supabase.from('guide_articles').select('id', { count: 'exact', head: true })
      .eq('column_slug', 'school-bits')
      .eq('editorial_review_status', 'pending'),
    supabase.from('calendar_events').select('id', { count: 'exact', head: true })
      .gte('start_date', today),
    supabase.from('guide_listings').select('id', { count: 'exact', head: true })
      .eq('is_published', true),
    supabase.from('guide_articles')
      .select('id, title, slug, published, editorial_review_status, column_slug, guide_slug, published_at, hero_image_url')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const pending      = pendingRes.count      ?? 0
  const publishedWk  = publishedWeekRes.count ?? 0
  const missingImg   = missingImageRes.count  ?? 0
  const sbPending    = sbPendingRes.count     ?? 0
  const events       = eventsRes.count        ?? 0
  const guideListings = guideListingsRes.count ?? 0
  const recentArticles = recentRes.data       ?? []

  const STATS = [
    {
      label: 'Needs Review',
      value: pending,
      icon: AlertCircle,
      href: '/admin/articles/review',
      color: pending > 0 ? 'text-amber-600' : 'text-portal-muted',
      bg:    pending > 0 ? 'bg-portal-amber-lt border-amber-200' : 'bg-portal-bg border-portal-border',
      cta:   'Open Queue',
    },
    {
      label: 'Published This Week',
      value: publishedWk,
      icon: CheckCircle,
      href: '/admin/articles?filter=published',
      color: 'text-green-600',
      bg:    'bg-green-50 border-green-200',
      cta:   'View Published',
    },
    {
      label: 'Missing Images',
      value: missingImg,
      icon: ImageOff,
      href: '/admin/articles?filter=missing-image',
      color: missingImg > 0 ? 'text-orange-600' : 'text-portal-muted',
      bg:    missingImg > 0 ? 'bg-orange-50 border-orange-200' : 'bg-portal-bg border-portal-border',
      cta:   'Fix Now',
    },
    {
      label: 'School Bits Pending',
      value: sbPending,
      icon: GraduationCap,
      href: '/admin/articles?filter=school-bits',
      color: sbPending > 0 ? 'text-portal-blue' : 'text-portal-muted',
      bg:    sbPending > 0 ? 'bg-portal-blue-lt border-blue-200' : 'bg-portal-bg border-portal-border',
      cta:   'Review',
    },
    {
      label: 'Upcoming Events',
      value: events,
      icon: CalendarDays,
      href: '/admin/content/events-import',
      color: 'text-purple-600',
      bg:    'bg-purple-50 border-purple-200',
      cta:   'View Events',
    },
    {
      label: 'Active Guide Listings',
      value: guideListings,
      icon: BookOpen,
      href: '/admin/guides',
      color: 'text-indigo-600',
      bg:    'bg-indigo-50 border-indigo-200',
      cta:   'Manage',
    },
  ]

  const QUICK_ACTIONS = [
    { label: 'Write New Article',  href: '/admin/articles/new',         icon: Plus,          color: 'bg-portal-navy hover:opacity-90 text-white' },
    { label: 'Review Queue',       href: '/admin/articles/review',      icon: CheckCircle,   color: 'bg-portal-amber-lt0 hover:bg-amber-600 text-white' },
    { label: 'Import Content',     href: '/admin/content/imports',      icon: Upload,        color: 'bg-gray-800 hover:bg-gray-900 text-white' },
    { label: 'All Articles',       href: '/admin/articles',             icon: FileText,      color: 'bg-white hover:bg-portal-bg text-portal-text border border-portal-border' },
    { label: 'Add Event',          href: '/admin/content/events-import',icon: CalendarDays,  color: 'bg-white hover:bg-portal-bg text-portal-text border border-portal-border' },
    { label: 'Manage Guides',      href: '/admin/guides',               icon: BookOpen,      color: 'bg-white hover:bg-portal-bg text-portal-text border border-portal-border' },
  ]

  return (
    <div className="flex-1 overflow-y-auto bg-portal-bg">
      {/* Header */}
      <div className="bg-white border-b border-portal-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-portal-text">Content Dashboard</h1>
            <p className="text-sm text-portal-sub mt-0.5">River Region Parents editorial hub</p>
          </div>
          <Link
            href="/admin/articles/new"
            className="flex items-center gap-2 px-4 py-2 bg-portal-navy text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-colors"
          >
            <Plus size={15} /> Write New Article
          </Link>
        </div>
      </div>

      <div className="p-6 max-w-7xl mx-auto space-y-7">

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {STATS.map(s => (
            <Link
              key={s.label}
              href={s.href}
              className={`flex flex-col gap-2 p-4 rounded-xl border transition-shadow hover:shadow-md ${s.bg}`}
            >
              <div className="flex items-center justify-between">
                <s.icon size={16} className={s.color} />
                <ArrowRight size={12} className="text-gray-300" />
              </div>
              <div className={`text-3xl font-black ${s.color}`}>{s.value}</div>
              <div className="text-xs font-semibold text-portal-sub leading-tight">{s.label}</div>
              <div className="text-[10px] text-portal-muted font-medium">{s.cta} →</div>
            </Link>
          ))}
        </div>

        {/* Quick actions */}
        <div>
          <h2 className="text-sm font-semibold text-portal-sub uppercase tracking-wider mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {QUICK_ACTIONS.map(a => (
              <Link
                key={a.label}
                href={a.href}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl text-center text-sm font-semibold transition-all hover:shadow-sm ${a.color}`}
              >
                <a.icon size={20} />
                <span className="text-xs leading-tight">{a.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent articles */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-portal-sub uppercase tracking-wider">Recent Articles</h2>
            <Link href="/admin/articles" className="text-xs font-semibold text-portal-blue hover:text-portal-blue">
              View All →
            </Link>
          </div>
          <div className="bg-white rounded-xl border border-portal-border overflow-hidden divide-y divide-portal-border">
            {recentArticles.length === 0 ? (
              <div className="p-8 text-center text-portal-muted text-sm">No articles yet. Write your first one!</div>
            ) : (
              recentArticles.map(a => {
                const st  = editorialStatusInfo(a.editorial_review_status)
                const sec = columnLabel(a.column_slug) !== '—' ? columnLabel(a.column_slug) : (a.guide_slug ?? '')
                return (
                  <div key={a.id} className="flex items-center gap-3 px-4 py-3 hover:bg-portal-bg transition-colors">
                    {/* Image indicator */}
                    <div className={`w-2 h-2 rounded-full shrink-0 ${a.hero_image_url ? 'bg-green-400' : 'bg-red-300'}`} title={a.hero_image_url ? 'Has image' : 'Missing image'} />

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-portal-text truncate">{a.title}</p>
                      <p className="text-xs text-portal-muted mt-0.5">
                        {sec && <span className="text-portal-sub">{sec} · </span>}
                        {a.published_at ? new Date(a.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not published'}
                      </p>
                    </div>

                    <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${st.color}`}>
                      {st.label}
                    </span>

                    <div className="flex items-center gap-1 shrink-0">
                      <Link
                        href={`/admin/articles/${a.id}/edit`}
                        className="px-2.5 py-1 text-xs font-semibold text-portal-blue hover:bg-portal-blue-lt rounded-lg transition-colors"
                      >
                        Edit
                      </Link>
                      {a.published && (
                        <Link
                          href={articleHref(a)}
                          target="_blank"
                          className="p-1.5 text-portal-muted hover:text-portal-text rounded-lg hover:bg-portal-row-hover transition-colors"
                          title="Preview"
                        >
                          <Eye size={13} />
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Editorial workflow guide */}
        <div className="bg-white rounded-xl border border-portal-border p-5">
          <h2 className="text-sm font-semibold text-portal-text mb-3 flex items-center gap-2">
            <Clock size={14} className="text-portal-muted" />
            Editorial Workflow
          </h2>
          <div className="flex items-center gap-2 text-xs text-portal-sub flex-wrap">
            {[
              { step: '1', label: 'Import or write', color: 'bg-gray-200' },
              { step: '→', label: '', color: '' },
              { step: '2', label: 'Needs Review', color: 'bg-portal-amber-lt' },
              { step: '→', label: '', color: '' },
              { step: '3', label: 'Edit & polish', color: 'bg-portal-blue-lt' },
              { step: '→', label: '', color: '' },
              { step: '4', label: 'Approve → Published', color: 'bg-green-100' },
            ].map((s, i) => s.step === '→' ? (
              <span key={i} className="text-gray-300">→</span>
            ) : (
              <span key={i} className={`px-2.5 py-1 rounded-full font-semibold ${s.color}`}>
                {s.step}. {s.label}
              </span>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
