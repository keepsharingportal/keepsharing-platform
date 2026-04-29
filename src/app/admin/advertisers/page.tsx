import Link from 'next/link'
import { getAllAdvertisers } from '@/lib/db/advertisers'
import { formatCurrency, formatSize } from '@/lib/utils'
import { Plus, Table2, Filter, Download, Search, ChevronLeft, ChevronRight } from 'lucide-react'

const DESIGN_BADGE: Record<string, string> = {
  New:       'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200',
  'Pick-up': 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-200',
  DropBox:   'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200',
}
const STAGE_DOT: Record<string, string> = {
  'Closed Won': 'bg-green-500', Verbal: 'bg-amber-500',
  Prospect: 'bg-blue-500', Renewed: 'bg-purple-500', Dropped: 'bg-red-500',
}
const TABS = ['Active Advertisers', 'Pipeline', 'Agreements', 'Ad Proofs', 'Businesses']
const PAGE_SIZE = 25

interface Props {
  searchParams: Promise<{ page?: string; pub?: string; q?: string }>
}

export default async function AdvertisersPage({ searchParams }: Props) {
  const params = await searchParams
  const page   = Math.max(1, parseInt(params.page ?? '1', 10))
  const pubFilter = params.pub ?? 'RRP'
  const query  = params.q ?? ''

  const allAds = await getAllAdvertisers()

  // Filter to current pub + current issue (latest per pub)
  const pubAds = allAds
    .filter((a) => {
      const matchPub = a.publication === pubFilter || a.issue.startsWith(pubFilter + ' ')
      const matchQ   = !query || a.businessName.toLowerCase().includes(query.toLowerCase())
      return matchPub && matchQ
    })
    .sort((a, b) => a.businessName.localeCompare(b.businessName))

  const totalPages  = Math.max(1, Math.ceil(pubAds.length / PAGE_SIZE))
  const paginated   = pubAds.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalRevenue = pubAds.reduce((s, a) => s + a.amount, 0)
  const totalPgs     = pubAds.reduce((s, a) => s + a.size, 0)

  const buildHref = (p: number) => `/admin/advertisers?pub=${pubFilter}&page=${p}${query ? `&q=${encodeURIComponent(query)}` : ''}`

  return (
    <div className="flex flex-col flex-1 overflow-hidden">

      {/* ── Page Header ──────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-gray-900">Advertisers</h1>
          <span className="text-sm font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full ring-1 ring-blue-200">
            {pubAds.length} contacts
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/import"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Download size={14} /> Import
          </Link>
          <Link href="/admin/advertisers/layout-sheet"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Table2 size={14} /> Layout Sheet
          </Link>
          <button className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
            <Plus size={14} /> Add Advertiser
          </button>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-6 shrink-0">
        <div className="flex items-center gap-1">
          {TABS.map((tab) => {
            const href = tab === 'Active Advertisers' ? '/admin/advertisers' : tab === 'Pipeline' ? '/admin/advertisers/pipeline' : tab === 'Agreements' ? '/admin/advertisers/agreements' : tab === 'Ad Proofs' ? '/admin/advertisers/ad-proofs' : '/admin/advertisers/businesses'
            return (
              <a key={tab} href={href}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  tab === 'Active Advertisers'
                    ? 'text-blue-600 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700 border-transparent hover:border-gray-300'
                }`}
              >
                {tab}
              </a>
            )
          })}
        </div>
      </div>

      {/* ── Toolbar ──────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3 shrink-0">
        {/* Search */}
        <form className="relative flex-1 max-w-sm" action="/admin/advertisers" method="get">
          <input type="hidden" name="pub" value={pubFilter} />
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="Search advertisers…"
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
          />
        </form>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm ml-auto">
          <span className="font-semibold text-gray-900">{pubAds.length} advertisers</span>
          <span className="text-gray-400">·</span>
          <span className="text-gray-600">{totalPgs.toFixed(2)} pp</span>
          <span className="text-gray-400">·</span>
          <span className="font-bold" style={{ color: 'var(--color-gold-600)' }}>
            {formatCurrency(totalRevenue)}
          </span>
          <span className="text-gray-400 hidden xl:block">·</span>
          <div className="hidden xl:flex items-center gap-3 text-xs text-gray-500">
            <span>New <span className="font-semibold text-blue-600">{pubAds.filter(a=>a.designStatus==='New').length}</span></span>
            <span>Pick-up <span className="font-semibold text-green-600">{pubAds.filter(a=>a.designStatus==='Pick-up').length}</span></span>
            <span>DropBox <span className="font-semibold text-amber-600">{pubAds.filter(a=>a.designStatus==='DropBox').length}</span></span>
          </div>
        </div>

        <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
          <Filter size={13} /> Filters
        </button>
      </div>

      {/* ── Table ────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto bg-white">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
            <tr>
              {[
                { label: '',            cls: 'w-8' },
                { label: 'Advertiser',  cls: '' },
                { label: 'Size',        cls: 'w-28' },
                { label: 'Design',      cls: 'w-24' },
                { label: 'Designer',    cls: 'w-28' },
                { label: 'Position',    cls: 'w-36' },
                { label: 'Notes',       cls: 'w-48' },
                { label: 'Expires',     cls: 'w-20' },
                { label: 'Amount',      cls: 'w-24 text-right' },
              ].map(({ label, cls }) => (
                <th key={label}
                  className={`px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap ${cls}`}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginated.map((ad) => (
              <tr key={ad.id} className="hover:bg-gray-50 cursor-pointer transition-colors group">
                <td className="px-4 py-3 w-8">
                  <span className={`inline-block w-2 h-2 rounded-full ${STAGE_DOT[ad.stage] ?? 'bg-gray-400'}`} title={ad.stage} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold shrink-0">
                      {ad.businessName.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                          {ad.businessName}
                        </span>
                        {ad.directory && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold ring-1 ring-amber-200">DIR</span>
                        )}
                        {ad.social && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-semibold ring-1 ring-purple-200">{ad.social}</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">{ad.contactName}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                  {formatSize(ad.size)}{ad.orientation && <span className="text-gray-400 ml-1 text-xs">{ad.orientation[0]}</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center text-xs px-2.5 py-1 rounded-full font-medium ${DESIGN_BADGE[ad.designStatus]}`}>
                    {ad.designStatus}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{ad.designer}</td>
                <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                  {ad.specialPosition
                    ? <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200 font-medium">{ad.specialPosition}</span>
                    : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3 text-sm text-gray-400 max-w-0">
                  <div className="truncate max-w-[180px]">{ad.layoutNotes || '—'}</div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{ad.expires}</td>
                <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right whitespace-nowrap">
                  {formatCurrency(ad.amount)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 border-t-2 border-gray-200">
              <td colSpan={2} className="px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">
                Total — {pubAds.length} advertisers
              </td>
              <td className="px-4 py-3 text-sm font-semibold text-gray-700">{totalPgs.toFixed(2)} pp</td>
              <td colSpan={5} />
              <td className="px-4 py-3 text-sm font-bold text-right" style={{ color: 'var(--color-gold-600)' }}>
                {formatCurrency(totalRevenue)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ── Pagination ───────────────────────────────────── */}
      <div className="bg-white border-t border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
        <span className="text-sm text-gray-500">
          Page {page} of {totalPages} · {pubAds.length} records
        </span>
        <div className="flex items-center gap-1">
          {page > 1 ? (
            <Link href={buildHref(page - 1)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <ChevronLeft size={14} /> Prev
            </Link>
          ) : (
            <button disabled className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-300 border border-gray-200 rounded-lg cursor-not-allowed">
              <ChevronLeft size={14} /> Prev
            </button>
          )}
          {/* Page numbers */}
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
            return (
              <Link key={p} href={buildHref(p)}
                className={`w-8 h-8 flex items-center justify-center text-sm rounded-lg transition-colors ${
                  p === page ? 'bg-blue-600 text-white font-semibold' : 'text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}>
                {p}
              </Link>
            )
          })}
          {page < totalPages ? (
            <Link href={buildHref(page + 1)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              Next <ChevronRight size={14} />
            </Link>
          ) : (
            <button disabled className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-300 border border-gray-200 rounded-lg cursor-not-allowed">
              Next <ChevronRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
