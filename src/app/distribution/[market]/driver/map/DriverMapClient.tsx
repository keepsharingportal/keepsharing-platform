'use client'

// Thin Client wrapper around CirculationMap. Needed so the dynamic
// import with `ssr: false` lives inside a Client Component — Next.js 16
// forbids that at the top level of a Server Component file.

import dynamic from 'next/dynamic'
import type { CirculationStop, CirculationRoute } from '@/components/circulation/CirculationMap'

const CirculationMap = dynamic(
  () => import('@/components/circulation/CirculationMap').then(m => m.CirculationMap),
  {
    ssr:     false,
    loading: () => <div style={{ height: '100%', background: '#F1F5F9' }} />,
  },
)

interface Props {
  stops:        CirculationStop[]
  routes:       CirculationRoute[]
  showFilter?:  boolean
}

export function DriverMapClient({ stops, routes, showFilter }: Props) {
  return (
    <CirculationMap
      stops={stops}
      routes={routes}
      showSearch={false}
      showFilter={!!showFilter}
      height="100%"
    />
  )
}
