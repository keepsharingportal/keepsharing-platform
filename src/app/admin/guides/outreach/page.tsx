import Link from 'next/link'
import { BookOpen, ChevronRight, Clock, CheckCircle2, Mail, AlertCircle } from 'lucide-react'
import { GUIDE_CALENDAR, getGuideStats } from '@/lib/mock-guides'

const MONTH_NAMES = ['', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

function StatusBar({ not_sent, sent, responded, updated, total }: {
  not_sent: number; sent: number; responded: number; updated: number; total: number
}) {
  if (total === 0) return <div className="text-xs text-portal-muted">No listings yet</div>
  return (
    <div className="space-y-2">
      <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
        {not_sent  > 0 && <div className="bg-gray-300"     style={{ width: `${(not_sent  / total) * 100}%` }} />}
        {sent      > 0 && <div className="bg-amber-400"    style={{ width: `${(sent      / total) * 100}%` }} />}
        {responded > 0 && <div className="bg-blue-400"     style={{ width: `${(responded / total) * 100}%` }} />}
        {updated   > 0 && <div className="bg-portal-green-lt0"    style={{ width: `${(updated   / total) * 100}%` }} />}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px]">
        {not_sent  > 0 && <span className="text-portal-sub"  >{not_sent} not sent</span>}
        {sent      > 0 && <span className="text-amber-600" >{sent} sent</span>}
        {responded > 0 && <span className="text-portal-blue"  >{responded} responded</span>}
        {updated   > 0 && <span className="text-portal-green" >{updated} updated</span>}
      </div>
    </div>
  )
}

export default function GuidesPage() {
  const year = 2026
  const currentMonth = new Date().getMonth() + 1

  const guidesWithStats = GUIDE_CALENDAR.map((g) => ({
    ...g,
    stats: getGuideStats(g.month, year),
  }))

  const totalListings  = guidesWithStats.reduce((s, g) => s + g.stats.total, 0)
  const totalNotSent   = guidesWithStats.reduce((s, g) => s + g.stats.not_sent, 0)
  const totalUpdated   = guidesWithStats.reduce((s, g) => s + g.stats.updated, 0)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-portal-border px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-portal-text">Guide Management</h1>
          <p className="text-sm text-portal-sub mt-0.5">
            12 seasonal guides · {year} · {totalListings} total listings across all guides
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <div className="flex items-center gap-1.5 text-amber-600">
            <AlertCircle size={14} />
            <span className="font-semibold">{totalNotSent}</span>
            <span className="text-portal-sub">not sent</span>
          </div>
          <div className="flex items-center gap-1.5 text-portal-green">
            <CheckCircle2 size={14} />
            <span className="font-semibold">{totalUpdated}</span>
            <span className="text-portal-sub">updated</span>
          </div>
        </div>
      </div>

      {/* Guide grid */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {guidesWithStats.map((guide) => {
            const isPast    = guide.month < currentMonth
            const isCurrent = guide.month === currentMonth
            const urgentSoon = guide.month === currentMonth + 1

            return (
              <div key={guide.month}
                className={`bg-white rounded-lg border overflow-hidden hover:shadow-md transition-shadow ${
                  isCurrent ? 'border-portal-border-2 ring-1 ring-portal-blue/30' :
                  urgentSoon ? 'border-amber-200' : 'border-portal-border'
                }`}
              >
                {/* Color bar */}
                <div className={`h-1 ${isCurrent ? 'bg-portal-blue-lt0' : isPast ? 'bg-gray-200' : 'bg-gradient-to-r from-teal-400 to-blue-400'}`} />

                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-bold text-portal-muted uppercase tracking-wide">
                          {MONTH_NAMES[guide.month]}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] bg-portal-blue-lt text-portal-blue px-1.5 py-0.5 rounded-full ring-1 ring-portal-blue/30 font-semibold">
                            Current
                          </span>
                        )}
                        {urgentSoon && (
                          <span className="text-[10px] bg-portal-amber-lt text-portal-amber px-1.5 py-0.5 rounded-full border border-portal-amber/30 font-semibold">
                            Up next
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-semibold text-portal-text">{guide.name}</h3>
                    </div>
                    <span className="text-lg font-bold text-portal-text shrink-0">
                      {guide.stats.total > 0 ? guide.stats.total : '—'}
                    </span>
                  </div>

                  {/* Category tags */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {guide.topCategories.slice(0, 3).map((cat) => (
                      <span key={cat} className="text-[10px] px-1.5 py-0.5 rounded bg-portal-bg text-portal-sub border border-portal-border">
                        {cat}
                      </span>
                    ))}
                  </div>

                  {/* Status bar */}
                  <StatusBar {...guide.stats} />

                  {/* Actions */}
                  <div className="flex gap-2 mt-4">
                    <Link
                      href={`/admin/guides/outreach/${guide.month}`}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium text-portal-text bg-portal-bg border border-portal-border rounded-lg hover:bg-portal-row-hover transition-colors"
                    >
                      <BookOpen size={12} /> Manage
                    </Link>
                    {guide.stats.not_sent > 0 && (
                      <button className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium text-portal-amber bg-portal-amber-lt border border-amber-200 rounded-lg hover:bg-portal-amber-lt transition-colors">
                        <Mail size={12} /> Send {guide.stats.not_sent}
                      </button>
                    )}
                    {guide.stats.not_sent === 0 && guide.stats.responded > 0 && (
                      <button className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium text-portal-blue bg-portal-blue-lt border border-blue-200 rounded-lg hover:bg-portal-blue-lt transition-colors">
                        <CheckCircle2 size={12} /> Review {guide.stats.responded}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
