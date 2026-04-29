'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Truck, RefreshCw, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PortalStatus, MarketDistribution } from '@/lib/distribution-portal'
import { STATUS_LABEL, STATUS_COLOR } from '@/lib/distribution-portal'

// ── Compact row (for Today screen) ───────────────────────────────────────────

export function DistributionStatusRow({ market }: { market: MarketDistribution }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-xs font-semibold text-gray-800">{market.publication}</span>
          <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', STATUS_COLOR[market.status])}>
            {STATUS_LABEL[market.status]}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[10px] text-gray-500">
          <span>{market.routesConfirmed}/{market.routeCount} routes confirmed</span>
          <span>{market.bundlesPacked}/{market.bundleCount} bundles packed</span>
        </div>
        {/* Delivery progress bar */}
        <div className="mt-1.5 bg-gray-100 rounded-full h-1.5 overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all',
              market.deliveryPct === 100 ? 'bg-green-500' :
              market.deliveryPct > 50    ? 'bg-blue-500' :
              market.deliveryPct > 0     ? 'bg-amber-400' : 'bg-gray-200'
            )}
            style={{ width: `${market.deliveryPct}%` }}
          />
        </div>
        <div className="text-[9px] text-gray-400 mt-0.5">{market.deliveryPct}% delivered</div>
      </div>
    </div>
  )
}

// ── Full widget (for Today screen sidebar) ────────────────────────────────────

export function DistributionWidget() {
  const [status, setStatus]   = useState<PortalStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/distribution/status')
      if (res.ok) setStatus(await res.json())
      else setError('Could not load portal data')
    } catch {
      setError('Distribution portal unreachable')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const portalUrl = process.env.NEXT_PUBLIC_DISTRIBUTION_PORTAL_URL ?? 'https://drivers.keepsharing.com'

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Truck size={14} className="text-blue-600" />
          <span className="text-sm font-bold text-gray-900">Distribution</span>
          {status && (
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium',
              status.connected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
              {status.connected ? 'Live' : 'Mock data'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={load} className="text-gray-400 hover:text-gray-600">
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          </button>
          <a href={portalUrl} target="_blank" rel="noopener noreferrer"
            className="text-gray-400 hover:text-blue-600 transition-colors">
            <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {loading ? (
        <div className="px-4 py-6 text-center text-xs text-gray-400">Loading portal data…</div>
      ) : error ? (
        <div className="px-4 py-4 flex items-center gap-2 text-xs text-red-600">
          <AlertCircle size={13} /> {error}
        </div>
      ) : status ? (
        <div className="divide-y divide-gray-50">
          {status.markets.map(market => (
            <div key={market.publication} className="px-4 py-3">
              <DistributionStatusRow market={market} />
            </div>
          ))}

          {/* Totals footer */}
          <div className="px-4 py-3 bg-gray-50">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>{status.totalBundles.toLocaleString()} total bundles · {status.totalRoutes} routes</span>
              <a href={portalUrl} target="_blank" rel="noopener noreferrer"
                className="text-blue-600 font-medium hover:underline flex items-center gap-0.5">
                Portal <ExternalLink size={9} />
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

// ── Compact market card supplement (for My Markets) ──────────────────────────

export function MarketBundleCount({ publication }: { publication: string }) {
  const [market, setMarket] = useState<MarketDistribution | null>(null)

  useEffect(() => {
    fetch('/api/distribution/status')
      .then(r => r.json())
      .then((data: PortalStatus) => {
        setMarket(data.markets.find(m => m.publication === publication) ?? null)
      })
      .catch(() => {})
  }, [publication])

  if (!market) return null

  return (
    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
      <Truck size={11} />
      <span>{market.bundleCount} bundles</span>
      <span className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-medium', STATUS_COLOR[market.status])}>
        {STATUS_LABEL[market.status]}
      </span>
    </div>
  )
}
