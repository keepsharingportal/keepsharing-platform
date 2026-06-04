'use client'

import dynamic from 'next/dynamic'
import type { CirculationStop, CirculationRoute } from '@/components/circulation/CirculationMap'

const CirculationMap = dynamic(
  () => import('@/components/circulation/CirculationMap').then(m => m.CirculationMap),
  { ssr: false, loading: () => <div className="rounded-2xl border border-border bg-muted animate-pulse" style={{ height: 500 }} /> },
)

interface Props {
  stops:  CirculationStop[]
  routes: CirculationRoute[]
}

export function PublicMapClient({ stops, routes }: Props) {
  return <CirculationMap stops={stops} routes={routes} height="calc(100vh - 280px)" />
}
