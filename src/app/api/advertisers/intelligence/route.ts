import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export type RawBusinessIntel = {
  id: string
  name: string
  phone: string | null
  email: string | null
  salesRep: string | null
  website: string | null
  lastIssue: string | null
  totalRevenue: number
  totalAds: number
  avgAmount: number
}

export async function GET() {
  try {
    const supabase = await createClient()

    // Fetch all businesses
    const { data: businesses, error: bizErr } = await supabase
      .from('businesses')
      .select('id, name, phone, email, sales_rep, website')
      .order('name')

    if (bizErr) throw bizErr

    // Fetch all advertiser records (issue + amount + business_id)
    const { data: ads, error: adErr } = await supabase
      .from('advertisers')
      .select('business_id, issue, amount, created_at')
      .order('created_at', { ascending: false })

    if (adErr) throw adErr

    // Aggregate ads by business_id: last issue, total revenue, count
    type AdAgg = { lastIssue: string; totalRevenue: number; totalAds: number }
    const adMap = new Map<string, AdAgg>()

    for (const ad of ads ?? []) {
      if (!ad.business_id) continue
      const existing = adMap.get(ad.business_id)
      if (!existing) {
        adMap.set(ad.business_id, {
          lastIssue:    ad.issue ?? '',
          totalRevenue: Number(ad.amount ?? 0),
          totalAds:     1,
        })
      } else {
        existing.totalRevenue += Number(ad.amount ?? 0)
        existing.totalAds++
        // Keep the highest-date issue (they come in desc order so first is latest)
      }
    }

    const result: RawBusinessIntel[] = (businesses ?? [])
      .filter(b => adMap.has(b.id))
      .map(b => {
        const agg = adMap.get(b.id)!
        return {
          id:           b.id,
          name:         b.name,
          phone:        b.phone ?? null,
          email:        b.email ?? null,
          salesRep:     b.sales_rep ?? null,
          website:      b.website ?? null,
          lastIssue:    agg.lastIssue || null,
          totalRevenue: Math.round(agg.totalRevenue),
          totalAds:     agg.totalAds,
          avgAmount:    agg.totalAds > 0 ? Math.round(agg.totalRevenue / agg.totalAds) : 0,
        }
      })

    return NextResponse.json(result)
  } catch {
    return NextResponse.json([], { status: 200 }) // client falls back to mock
  }
}
