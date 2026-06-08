import Link from 'next/link'
import { getAllAdvertisers } from '@/lib/db/advertisers'
import { formatCurrency } from '@/lib/utils'
import { Table2, LayoutGrid, TrendingUp, ExternalLink } from 'lucide-react'
import { MarketBundleCount } from '@/components/distribution/DistributionWidget'

const PUB_META = [
  { abbrev: 'RRP', name: 'River Region Parents',      market: 'Montgomery',    state: 'AL', color: '#22c55e', bg: 'bg-green-50',  ring: 'ring-green-200',  text: 'text-green-700'  },
  { abbrev: 'MBP', name: 'Mobile Bay Parents',        market: 'Mobile',        state: 'AL', color: '#3b82f6', bg: 'bg-portal-blue-lt',   ring: 'ring-portal-blue/30',   text: 'text-portal-blue'   },
  { abbrev: 'AOP', name: 'Auburn Opelika Parents',    market: 'Auburn/Opelika',state: 'AL', color: '#f97316', bg: 'bg-orange-50', ring: 'ring-orange-200', text: 'text-orange-700' },
  { abbrev: 'ESP', name: 'Eastern Shore Parents',     market: 'Eastern Shore', state: 'AL', color: '#a855f7', bg: 'bg-purple-50', ring: 'ring-purple-200', text: 'text-purple-700' },
  { abbrev: 'GPP', name: 'Greater Pensacola Parents', market: 'Pensacola',     state: 'FL', color: '#14b8a6', bg: 'bg-teal-50',   ring: 'ring-teal-200',   text: 'text-teal-700'   },
  { abbrev: 'RRB', name: 'River Region Boom',         market: 'Montgomery',    state: 'AL', color: '#eab308', bg: 'bg-yellow-50', ring: 'ring-yellow-200', text: 'text-yellow-700' },
]

const CURRENT_ISSUES: Record<string, string> = {
  RRP: 'RRP MAR26', MBP: 'MBP MAR26', AOP: 'AOP MAR26',
  ESP: 'ESP MAR26', GPP: 'GPP MAR26', RRB: 'RRB MAR26',
}

export default async function MarketsPage() {
  const allAds = await getAllAdvertisers()

  const marketData = PUB_META.map((pub) => {
    const issue   = CURRENT_ISSUES[pub.abbrev]
    const ads     = allAds.filter((a) => a.publication === pub.abbrev || a.issue.startsWith(pub.abbrev + ' '))
    const current = ads.filter((a) => a.issue === issue)
    const revenue = current.reduce((s, a) => s + a.amount, 0)
    const pages   = current.reduce((s, a) => s + a.size, 0)
    const newCount    = current.filter((a) => a.designStatus === 'New').length
    const dropboxCount = current.filter((a) => a.designStatus === 'DropBox').length
    return { ...pub, issue, revenue, pages, count: current.length, newCount, dropboxCount }
  })

  const totalRevenue = marketData.reduce((s, m) => s + m.revenue, 0)
  const totalAds     = marketData.reduce((s, m) => s + m.count, 0)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-portal-border px-6 py-4 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-portal-text">My Markets</h1>
            <p className="text-sm text-portal-sub mt-0.5">March 2026 · All 6 publications</p>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="text-right">
              <div className="font-bold text-portal-text">{totalAds} ads</div>
              <div className="text-xs text-portal-muted">across all markets</div>
            </div>
            <div className="w-px h-8 bg-gray-200" />
            <div className="text-right">
              <div className="font-bold" style={{ color: 'var(--color-gold-600)' }}>
                {formatCurrency(totalRevenue)}
              </div>
              <div className="text-xs text-portal-muted">total revenue</div>
            </div>
          </div>
        </div>
      </div>

      {/* Market Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {marketData.map((m) => (
            <div
              key={m.abbrev}
              className="bg-white rounded-xl border border-portal-border overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Color bar */}
              <div className="h-1" style={{ backgroundColor: m.color }} />

              {/* Card header */}
              <div className="px-5 pt-4 pb-3 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ring-1 ${m.bg} ${m.text} ${m.ring}`}>
                      {m.abbrev}
                    </span>
                    {m.count > 0 && (
                      <span className="text-xs text-green-600 font-medium bg-green-50 px-1.5 py-0.5 rounded-full ring-1 ring-green-200">
                        Live
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-semibold text-portal-text mt-1">{m.name}</h3>
                  <p className="text-xs text-portal-muted">{m.market}, {m.state}</p>
                  <MarketBundleCount publication={m.abbrev} />
                </div>
                <button className="text-gray-300 hover:text-portal-sub transition-colors">
                  <ExternalLink size={15} />
                </button>
              </div>

              {/* Stats */}
              <div className="px-5 pb-4">
                {m.count > 0 ? (
                  <>
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-portal-text">{m.count}</div>
                        <div className="text-[10px] text-portal-muted uppercase tracking-wide mt-0.5">Advertisers</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-portal-text">{m.pages.toFixed(1)}</div>
                        <div className="text-[10px] text-portal-muted uppercase tracking-wide mt-0.5">Pages</div>
                      </div>
                      <div className="text-center">
                        <div className="text-base font-bold" style={{ color: 'var(--color-gold-600)' }}>
                          {formatCurrency(m.revenue)}
                        </div>
                        <div className="text-[10px] text-portal-muted uppercase tracking-wide mt-0.5">Revenue</div>
                      </div>
                    </div>

                    {/* Alerts */}
                    {(m.newCount > 0 || m.dropboxCount > 0) && (
                      <div className="flex gap-2 mb-4">
                        {m.newCount > 0 && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-portal-blue-lt text-portal-blue ring-1 ring-portal-blue/30 font-medium">
                            {m.newCount} New
                          </span>
                        )}
                        {m.dropboxCount > 0 && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-portal-amber-lt text-portal-amber border border-portal-amber/30 font-medium">
                            {m.dropboxCount} DropBox
                          </span>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-portal-muted mb-4">No data for March 2026</p>
                )}

                {/* Quick actions */}
                <div className="flex gap-2">
                  <Link
                    href={`/admin/advertisers/layout-sheet?pub=${m.abbrev}`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-portal-sub bg-portal-bg border border-portal-border rounded-lg hover:bg-portal-row-hover transition-colors"
                  >
                    <Table2 size={12} /> Layout Sheet
                  </Link>
                  <Link
                    href={`/admin/advertisers?pub=${m.abbrev}`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-portal-sub bg-portal-bg border border-portal-border rounded-lg hover:bg-portal-row-hover transition-colors"
                  >
                    <LayoutGrid size={12} /> Advertisers
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Coming soon markets */}
        <div className="mt-6">
          <p className="text-xs font-semibold text-portal-muted uppercase tracking-wider mb-3">Planned Markets</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {['Mobile Prime', 'Pensacola Prime', 'Wiregrass Parents'].map((name) => (
              <div key={name} className="bg-white rounded-xl border border-dashed border-portal-border p-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-portal-bg border border-portal-border flex items-center justify-center">
                  <TrendingUp size={14} className="text-gray-300" />
                </div>
                <div>
                  <div className="text-sm font-medium text-portal-muted">{name}</div>
                  <div className="text-xs text-gray-300">Launch pending</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
