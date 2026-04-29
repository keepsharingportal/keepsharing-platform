import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MONTH_LABELS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
function currentMonth() {
  const d = new Date()
  return `${MONTH_LABELS[d.getMonth()]}${String(d.getFullYear()).slice(2)}`
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      action: 'generate' | 'send' | 'convert_trial' | 'update_performance'
      clientId?: string
      reportId?: string
      leadCount?: number
      metaSpend?: number
    }
    const supabase = await createClient()

    if (body.action === 'generate') {
      if (!body.clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 })
      const month = currentMonth()

      // Grab current performance for the summary snapshot
      const { data: perf } = await supabase
        .from('marketing_performance')
        .select('*')
        .eq('client_id', body.clientId)
        .eq('report_month', month)
        .maybeSingle()

      const { data, error } = await supabase
        .from('marketing_reports')
        .insert({
          client_id:    body.clientId,
          report_month: month,
          summary_data: perf ?? {},
          generated_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (error) throw error
      return NextResponse.json({ reportId: data.id })
    }

    if (body.action === 'send') {
      if (!body.reportId) return NextResponse.json({ error: 'reportId required' }, { status: 400 })
      const { error } = await supabase
        .from('marketing_reports')
        .update({ sent_at: new Date().toISOString() })
        .eq('id', body.reportId)
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    if (body.action === 'convert_trial') {
      if (!body.clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 })
      const { error } = await supabase
        .from('marketing_clients')
        .update({ status: 'active', trial_converted_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', body.clientId)
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    if (body.action === 'update_performance') {
      if (!body.clientId) return NextResponse.json({ error: 'clientId required' }, { status: 400 })
      const month = currentMonth()
      const leadCount = body.leadCount ?? 0
      const metaSpend = body.metaSpend ?? 0
      const cpl = leadCount > 0 ? metaSpend / leadCount : null
      const { error } = await supabase
        .from('marketing_performance')
        .upsert({
          client_id:     body.clientId,
          report_month:  month,
          lead_count:    leadCount,
          meta_spend:    metaSpend,
          cost_per_lead: cpl,
          last_synced_at: new Date().toISOString(),
        }, { onConflict: 'client_id,report_month' })
      if (error) throw error
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
