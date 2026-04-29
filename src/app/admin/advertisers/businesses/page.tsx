import { getAllAdvertisers } from '@/lib/db/advertisers'
import { BusinessesClient, type BusinessRecord } from '@/components/businesses/BusinessesClient'

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
const CURRENT_ISSUE_DATE = 2026 * 100 + 4 // MAY26 (April index = 4)

function issueToDate(issue: string): number {
  const parts = issue.trim().split(' ')
  const monthYear = parts[1] ?? ''
  const monthCode = monthYear.slice(0, 3).toUpperCase()
  const yearCode  = parseInt(monthYear.slice(3)) + 2000
  const monthIdx  = MONTHS.indexOf(monthCode)
  if (monthIdx === -1 || isNaN(yearCode)) return 0
  return yearCode * 100 + monthIdx
}

function renewalScore(issueCount: number, lastIssueDate: number): BusinessRecord['renewalScore'] {
  if (issueCount === 1) return 'new'
  const monthsAgo = CURRENT_ISSUE_DATE - lastIssueDate
  if (monthsAgo <= 1)  return 'high'
  if (monthsAgo <= 3)  return 'medium'
  return 'low'
}

export default async function BusinessesPage() {
  const allAds = await getAllAdvertisers()

  const bizMap = new Map<string, BusinessRecord>()

  for (const ad of allAds) {
    const key = ad.businessName.trim().toLowerCase()
    if (!bizMap.has(key)) {
      bizMap.set(key, {
        name:         ad.businessName,
        contact:      ad.contactName ?? '',
        email:        '',
        phone:        '',
        publication:  ad.publication,
        totalRevenue: 0,
        adCount:      0,
        issues:       [],
        lastIssue:    ad.issue,
        ads:          [],
        renewalScore: 'new',
      })
    }
    const b = bizMap.get(key)!
    b.totalRevenue += ad.amount ?? 0
    b.adCount++
    b.ads.push(ad)
    if (!b.issues.includes(ad.issue)) b.issues.push(ad.issue)
  }

  const businesses: BusinessRecord[] = Array.from(bizMap.values()).map((b) => {
    const sorted = b.issues.slice().sort((a, z) => issueToDate(z) - issueToDate(a))
    const lastIssue = sorted[0] ?? b.lastIssue
    const score = renewalScore(b.issues.length, issueToDate(lastIssue))
    return { ...b, issues: sorted, lastIssue, renewalScore: score }
  }).sort((a, z) => a.name.localeCompare(z.name))

  const totalRevenue = businesses.reduce((s, b) => s + b.totalRevenue, 0)

  return <BusinessesClient businesses={businesses} totalRevenue={totalRevenue} />
}
