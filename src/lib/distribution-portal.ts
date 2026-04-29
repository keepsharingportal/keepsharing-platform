/**
 * Distribution Portal client — read-only connection to drivers.keepsharing.com
 *
 * The portal is a SEPARATE application. This module only reads its data —
 * it NEVER writes to it. The platform does not manage routes or drivers.
 *
 * Configure DISTRIBUTION_PORTAL_URL and DISTRIBUTION_PORTAL_TOKEN in .env.local.
 * If not configured, returns mock data so the UI is still usable in dev.
 */

const PORTAL_URL   = process.env.DISTRIBUTION_PORTAL_URL ?? ''
const PORTAL_TOKEN = process.env.DISTRIBUTION_PORTAL_TOKEN ?? ''

export type RouteStatus = 'confirmed' | 'unconfirmed' | 'in-progress' | 'complete'

export type MarketDistribution = {
  publication: string   // e.g. "RRP"
  issue:       string   // e.g. "RRP MAY26"
  bundleCount: number
  routeCount:  number
  routesConfirmed: number
  bundlesPacked:   number
  deliveryPct:     number  // 0-100
  status:          'pending' | 'packing' | 'in-route' | 'complete'
  lastUpdated:     string  // ISO
}

export type PortalStatus = {
  connected:    boolean
  lastSync:     string
  markets:      MarketDistribution[]
  totalBundles: number
  totalRoutes:  number
}

// ── Mock data for dev / when portal isn't connected ───────────────────────────

const MOCK_PORTAL: PortalStatus = {
  connected: false,
  lastSync:  new Date().toISOString(),
  markets: [
    { publication: 'RRP', issue: 'RRP MAY26', bundleCount: 312, routeCount: 18, routesConfirmed: 18, bundlesPacked: 294, deliveryPct: 67, status: 'in-route',  lastUpdated: new Date().toISOString() },
    { publication: 'MBP', issue: 'MBP MAY26', bundleCount: 228, routeCount: 14, routesConfirmed: 12, bundlesPacked: 180, deliveryPct: 42, status: 'packing',   lastUpdated: new Date().toISOString() },
    { publication: 'AOP', issue: 'AOP MAY26', bundleCount: 156, routeCount: 9,  routesConfirmed: 9,  bundlesPacked: 156, deliveryPct: 100,status: 'complete',  lastUpdated: new Date().toISOString() },
    { publication: 'ESP', issue: 'ESP MAY26', bundleCount: 142, routeCount: 8,  routesConfirmed: 0,  bundlesPacked: 0,   deliveryPct: 0,  status: 'pending',   lastUpdated: new Date().toISOString() },
    { publication: 'GPP', issue: 'GPP MAY26', bundleCount: 198, routeCount: 12, routesConfirmed: 12, bundlesPacked: 198, deliveryPct: 88, status: 'in-route',  lastUpdated: new Date().toISOString() },
    { publication: 'RRB', issue: 'RRB MAY26', bundleCount: 88,  routeCount: 5,  routesConfirmed: 5,  bundlesPacked: 88,  deliveryPct: 100,status: 'complete',  lastUpdated: new Date().toISOString() },
  ],
  totalBundles: 1124,
  totalRoutes:  66,
}

// ── Portal API client ─────────────────────────────────────────────────────────

async function portalFetch(path: string): Promise<unknown> {
  if (!PORTAL_URL || !PORTAL_TOKEN) throw new Error('Portal not configured')
  const res = await fetch(`${PORTAL_URL}${path}`, {
    headers: { Authorization: `Bearer ${PORTAL_TOKEN}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(5000),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Portal API error: ${res.status}`)
  return res.json()
}

export async function getPortalStatus(): Promise<PortalStatus> {
  if (!PORTAL_URL) return MOCK_PORTAL

  try {
    const data = await portalFetch('/api/status') as PortalStatus
    return { ...data, connected: true, lastSync: new Date().toISOString() }
  } catch {
    return { ...MOCK_PORTAL, connected: false }
  }
}

export async function getMarketDistribution(publication: string): Promise<MarketDistribution | null> {
  const status = await getPortalStatus()
  return status.markets.find(m => m.publication === publication) ?? null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export const STATUS_LABEL: Record<MarketDistribution['status'], string> = {
  pending:   'Not started',
  packing:   'Packing',
  'in-route':'In route',
  complete:  'Complete',
}

export const STATUS_COLOR: Record<MarketDistribution['status'], string> = {
  pending:   'bg-gray-100 text-gray-500',
  packing:   'bg-amber-100 text-amber-700',
  'in-route':'bg-blue-100 text-blue-700',
  complete:  'bg-green-100 text-green-700',
}
