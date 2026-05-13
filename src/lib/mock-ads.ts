// ⚠️  DEMO DATA — NOT PRODUCTION METRICS  ⚠️
// This file contains fabricated ad records for UI development only.
// Real ad tracking lives in the ad_placements table (migration 035).
// Real click/impression data is served by /admin/ads (not /admin/ad-server).
// TODO: Replace /admin/ad-server page with real ad_placements queries (Phase 3).

export interface AdZone {
  id: string
  name: string
  width: number
  height: number
  maxKb: number
  position: string
}

export interface AdRecord {
  id: string
  businessName: string
  publication: string
  zone: string
  imageUrl: string | null
  destinationUrl: string
  startDate: string
  endDate: string
  active: boolean
  totalClicks: number
  totalImpressions: number
  createdAt: string
}

export interface AdClick {
  id: string
  adId: string
  clickedAt: string
  zone: string
  publication: string
  referrer: string | null
}

export const AD_ZONES: AdZone[] = [
  { id: 'header-leaderboard',   name: 'Header Leaderboard',   width: 728, height: 90,  maxKb: 40,  position: 'Top of every page' },
  { id: 'article-inline-top',   name: 'Article Inline Top',   width: 600, height: 300, maxKb: 80,  position: 'After 20% of article' },
  { id: 'article-inline-mid',   name: 'Article Inline Mid',   width: 600, height: 300, maxKb: 80,  position: 'After 50% of article' },
  { id: 'article-inline-bottom',name: 'Article Inline Bottom',width: 600, height: 150, maxKb: 50,  position: 'After 80% of article' },
  { id: 'guide-sidebar',        name: 'Guide Sidebar',        width: 300, height: 250, maxKb: 60,  position: 'Alongside guide listings' },
  { id: 'email-banner',         name: 'Email Banner',         width: 600, height: 200, maxKb: 100, position: 'Inside newsletter' },
  { id: 'event-sponsor',        name: 'Event Sponsor Card',   width: 0,   height: 0,   maxKb: 40,  position: 'Inline in calendar' },
]

export const MOCK_ADS: AdRecord[] = [
  {
    id: 'ad001',
    businessName: 'Baptist Health System',
    publication: 'RRP',
    zone: 'header-leaderboard',
    imageUrl: null,
    destinationUrl: 'https://www.baptisthealth.com',
    startDate: '2026-03-01',
    endDate: '2026-05-31',
    active: true,
    totalClicks: 312,
    totalImpressions: 14800,
    createdAt: '2026-02-15',
  },
  {
    id: 'ad002',
    businessName: "Children's Hospital of Alabama",
    publication: 'RRP',
    zone: 'article-inline-top',
    imageUrl: null,
    destinationUrl: 'https://www.childrensal.org',
    startDate: '2026-03-01',
    endDate: '2026-12-31',
    active: true,
    totalClicks: 187,
    totalImpressions: 9200,
    createdAt: '2026-02-20',
  },
  {
    id: 'ad003',
    businessName: 'Deep Blue Autism Therapy',
    publication: 'RRP',
    zone: 'guide-sidebar',
    imageUrl: null,
    destinationUrl: 'https://www.deepblueautism.com',
    startDate: '2026-03-01',
    endDate: '2026-05-31',
    active: true,
    totalClicks: 94,
    totalImpressions: 4100,
    createdAt: '2026-02-22',
  },
  {
    id: 'ad004',
    businessName: 'KinderCare Learning Centers',
    publication: 'RRP',
    zone: 'article-inline-mid',
    imageUrl: null,
    destinationUrl: 'https://www.kindercare.com',
    startDate: '2026-02-01',
    endDate: '2026-04-30',
    active: true,
    totalClicks: 256,
    totalImpressions: 11600,
    createdAt: '2026-01-28',
  },
  {
    id: 'ad005',
    businessName: 'East Alabama Medical Center',
    publication: 'RRP',
    zone: 'email-banner',
    imageUrl: null,
    destinationUrl: 'https://www.eamc.org',
    startDate: '2026-01-01',
    endDate: '2026-06-30',
    active: true,
    totalClicks: 428,
    totalImpressions: 18200,
    createdAt: '2025-12-20',
  },
  {
    id: 'ad006',
    businessName: 'Elite Gymnastics Montgomery',
    publication: 'RRP',
    zone: 'article-inline-bottom',
    imageUrl: null,
    destinationUrl: 'https://www.elitegymnasticsmontgomery.com',
    startDate: '2026-03-01',
    endDate: '2026-08-31',
    active: true,
    totalClicks: 67,
    totalImpressions: 5800,
    createdAt: '2026-02-25',
  },
]

// Simulated click history — last 30 days
export function getMockClicksByDate(adId: string): { date: string; clicks: number }[] {
  const ad = MOCK_ADS.find((a) => a.id === adId)
  if (!ad) return []
  const days = 30
  const avgPerDay = Math.round(ad.totalClicks / days)
  return Array.from({ length: days }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (days - 1 - i))
    const variance = Math.floor((Math.random() - 0.5) * avgPerDay * 1.5)
    return {
      date: d.toISOString().slice(0, 10),
      clicks: Math.max(0, avgPerDay + variance),
    }
  })
}

export function getMockClicksByZone(pub = 'RRP') {
  return AD_ZONES.map((zone) => {
    const ads = MOCK_ADS.filter((a) => a.publication === pub && a.zone === zone.id)
    return {
      zone: zone.name,
      clicks: ads.reduce((s, a) => s + a.totalClicks, 0),
      impressions: ads.reduce((s, a) => s + a.totalImpressions, 0),
      ads: ads.length,
    }
  }).filter((z) => z.ads > 0)
}
