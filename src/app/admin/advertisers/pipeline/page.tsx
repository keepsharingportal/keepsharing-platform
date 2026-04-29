import { getAllAdvertisers } from '@/lib/db/advertisers'
import { formatCurrency, formatSize } from '@/lib/utils'

const STAGE_CONFIG = [
  { stage: 'Prospect',   color: 'bg-blue-500',   light: 'bg-blue-50 text-blue-700 ring-blue-200' },
  { stage: 'Verbal',     color: 'bg-amber-500',  light: 'bg-amber-50 text-amber-700 ring-amber-200' },
  { stage: 'Closed Won', color: 'bg-green-500',  light: 'bg-green-50 text-green-700 ring-green-200' },
  { stage: 'Renewed',    color: 'bg-purple-500', light: 'bg-purple-50 text-purple-700 ring-purple-200' },
  { stage: 'Dropped',    color: 'bg-red-400',    light: 'bg-red-50 text-red-600 ring-red-200' },
]

const TABS = ['Active Advertisers', 'Pipeline', 'Agreements', 'Ad Proofs', 'Businesses']

export default async function PipelinePage() {
  const allAds = await getAllAdvertisers()

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-white border-b border-gray-200 px-6 py-4 shrink-0">
        <h1 className="text-xl font-semibold text-gray-900">Advertisers</h1>
      </div>
      <div className="bg-white border-b border-gray-200 px-6 shrink-0">
        <div className="flex items-center gap-1">
          {TABS.map((tab) => (
            <a
              key={tab}
              href={tab === 'Active Advertisers' ? '/admin/advertisers' : tab === 'Pipeline' ? '/admin/advertisers/pipeline' : tab === 'Agreements' ? '/admin/advertisers/agreements' : tab === 'Ad Proofs' ? '/admin/advertisers/ad-proofs' : '/admin/advertisers/businesses'}
              className={`px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap border-b-2 ${
                tab === 'Pipeline'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700 border-transparent hover:border-gray-300'
              }`}
            >
              {tab}
            </a>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          {STAGE_CONFIG.map(({ stage, color, light }) => {
            const stageAds = allAds.filter((a) => a.stage === stage)
            const revenue  = stageAds.reduce((s, a) => s + a.amount, 0)

            return (
              <div key={stage} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Column header */}
                <div className={`h-1 ${color}`} />
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ring-1 ${light}`}>
                    {stage}
                  </span>
                  <span className="text-xs font-bold text-gray-500">{stageAds.length}</span>
                </div>

                {/* Revenue summary */}
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                  <span className="text-xs text-gray-500">
                    {formatCurrency(revenue)}<span className="text-gray-400">/mo</span>
                  </span>
                </div>

                {/* Cards */}
                <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                  {stageAds.length === 0 ? (
                    <div className="px-4 py-6 text-center text-xs text-gray-400">No advertisers</div>
                  ) : (
                    stageAds.map((ad) => (
                      <div key={ad.id} className="px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer">
                        <div className="text-sm font-medium text-gray-900 leading-tight">{ad.businessName}</div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-gray-500">{formatSize(ad.size)}</span>
                          <span className="text-xs font-semibold text-gray-700">{formatCurrency(ad.amount)}</span>
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{ad.issue}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
