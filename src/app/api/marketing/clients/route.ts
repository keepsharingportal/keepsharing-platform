import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MONTH_LABELS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
function currentMonth() {
  const d = new Date()
  return `${MONTH_LABELS[d.getMonth()]}${String(d.getFullYear()).slice(2)}`
}

export async function GET() {
  try {
    const supabase = await createClient()
    const month = currentMonth()

    const { data: clients, error } = await supabase
      .from('marketing_clients')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    const { data: perf } = await supabase
      .from('marketing_performance')
      .select('*')
      .eq('report_month', month)

    const { data: reports } = await supabase
      .from('marketing_reports')
      .select('*')
      .order('generated_at', { ascending: false })

    const perfMap = Object.fromEntries((perf ?? []).map(p => [p.client_id, p]))

    // Most recent report per client
    type ReportRow = NonNullable<typeof reports>[number]
    const reportMap: Record<string, ReportRow> = {}
    for (const r of reports ?? []) {
      if (!reportMap[r.client_id]) reportMap[r.client_id] = r
    }

    const enriched = (clients ?? []).map(c => ({
      id: c.id,
      businessName: c.business_name,
      industry: c.industry,
      primaryOffer: c.primary_offer,
      targetAudience: c.target_audience,
      serviceAreaZips: c.service_area_zips ?? [],
      ghlAccountId: c.ghl_account_id,
      metaAdAccountId: c.meta_ad_account_id,
      landingPageUrl: c.landing_page_url,
      trialStartedAt: c.trial_started_at,
      trialConvertedAt: c.trial_converted_at,
      status: c.status,
      leadCountThisMonth: perfMap[c.id]?.lead_count ?? 0,
      metaSpendThisMonth: Number(perfMap[c.id]?.meta_spend ?? 0),
      costPerLead: perfMap[c.id]?.cost_per_lead ? Number(perfMap[c.id].cost_per_lead) : null,
      lastReportDate: reportMap[c.id]?.generated_at ?? null,
      lastReportSent: !!reportMap[c.id]?.sent_at,
      lastReportId: reportMap[c.id]?.id ?? null,
    }))

    return NextResponse.json(enriched)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('marketing_clients')
      .insert({
        business_name:       body.businessName,
        industry:            body.industry,
        primary_offer:       body.primaryOffer || null,
        target_audience:     body.targetAudience || null,
        service_area_zips:   body.serviceAreaZips ?? [],
        ghl_account_id:      body.ghlAccountId || null,
        meta_ad_account_id:  body.metaAdAccountId || null,
        landing_page_url:    body.landingPageUrl || null,
        trial_started_at:    new Date().toISOString(),
        status:              'trial',
      })
      .select('id')
      .single()

    if (error) throw error
    return NextResponse.json({ id: data.id })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
