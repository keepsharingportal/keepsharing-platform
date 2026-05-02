import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  )
}

function getNextReminderTime(count: number): string {
  const days = [1, 3, 7, 14][count] ?? 14
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

const REMINDER_TEMPLATES = {
  day_1: { subject: 'You have a new lead waiting', label: 'Day 1 — new lead follow-up' },
  day_3: { subject: 'This lead is going cold', label: 'Day 3 — follow-up reminder' },
  day_7: { subject: 'Last chance — they may have moved on', label: 'Day 7 — urgent reminder' },
  final: { subject: "We'll stop reminding you about this lead", label: 'Final reminder' },
}

export async function POST() {
  const supabase = supabaseAdmin()

  const { data: overdueLeads } = await supabase
    .from('partner_leads')
    .select('*, advertiser:advertiser_accounts(business_name, contact_name, contact_email)')
    .lt('partner_next_reminder_at', new Date().toISOString())
    .eq('partner_marked_converted', false)
    .is('partner_last_action_at', null)
    .limit(50)

  let sent = 0

  for (const lead of overdueLeads ?? []) {
    const count = lead.partner_reminder_count ?? 0
    const type = count === 0 ? 'day_1' : count === 1 ? 'day_3' : count === 2 ? 'day_7' : 'final'
    const tpl = REMINDER_TEMPLATES[type as keyof typeof REMINDER_TEMPLATES]

    // Log reminder (GHL email send would go here)
    console.log(`[run-reminders] ${tpl.label} → ${lead.advertiser?.business_name ?? lead.advertiser_id} for lead ${lead.lead_first_name} ${lead.lead_last_name}`)

    await supabase.from('partner_leads').update({
      partner_reminder_count:    count + 1,
      partner_next_reminder_at:  getNextReminderTime(count + 1),
    }).eq('id', lead.id)

    sent++
  }

  return NextResponse.json({ success: true, reminders_sent: sent })
}
