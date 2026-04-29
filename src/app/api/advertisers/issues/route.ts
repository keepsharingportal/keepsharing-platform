import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export interface IssueOption {
  issue: string        // e.g. "RRP MAY26"
  pubAbbrev: string    // e.g. "RRP"
  monthCode: string    // e.g. "MAY"
  yearCode: string     // e.g. "26"
  count: number        // how many ad records
}

export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient()

    // Get all distinct issues with counts
    const { data, error } = await supabase
      .from('advertisers')
      .select('issue')
      .not('issue', 'is', null)

    if (error || !data) return NextResponse.json([])

    // Count and parse
    const counts: Record<string, number> = {}
    for (const row of data) {
      if (row.issue) counts[row.issue] = (counts[row.issue] ?? 0) + 1
    }

    const options: IssueOption[] = Object.entries(counts)
      .map(([issue, count]) => {
        const parts = issue.trim().split(' ')
        const pubAbbrev = parts[0] ?? ''
        const monthYear = parts[1] ?? ''
        const monthCode = monthYear.slice(0, 3)
        const yearCode  = monthYear.slice(3)
        return { issue, pubAbbrev, monthCode, yearCode, count }
      })
      .filter((o) => o.pubAbbrev && o.monthCode && o.yearCode)
      .sort((a, b) => {
        // Sort by year desc, then month desc
        const ya = parseInt(a.yearCode), yb = parseInt(b.yearCode)
        if (ya !== yb) return yb - ya
        const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
        return MONTHS.indexOf(b.monthCode) - MONTHS.indexOf(a.monthCode)
      })

    return NextResponse.json(options)
  } catch {
    return NextResponse.json([])
  }
}
