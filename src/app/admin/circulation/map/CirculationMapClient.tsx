'use client'

// Client wrapper so the admin map page can stay a server component for
// the data fetch and only pull Leaflet on the client. react-leaflet
// touches `window` on import — has to be loaded via dynamic { ssr: false }.

import dynamic from 'next/dynamic'
import type { CirculationStop, CirculationRoute } from '@/components/circulation/CirculationMap'

const CirculationMap = dynamic(
  () => import('@/components/circulation/CirculationMap').then(m => m.CirculationMap),
  { ssr: false, loading: () => <MapSkeleton /> },
)

function MapSkeleton() {
  return (
    <div className="rounded-lg border border-portal-border bg-portal-bg animate-pulse" style={{ height: 600 }} />
  )
}

interface Props {
  stops:  CirculationStop[]
  routes: CirculationRoute[]
}

export function CirculationMapClient({ stops, routes }: Props) {
  return <CirculationMap stops={stops} routes={routes} height="calc(100vh - 240px)" />
}
