import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { upsertContact } from '@/lib/ghl'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  )
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    // ── Step 1: initial capture ─────────────────────────────────────────────
    if (action === 'step1') {
      const { name, email, phone, tierInterest, sourcePage } = body

      if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

      const supabase = supabaseAdmin()

      const { data: lead, error } = await supabase
        .from('lead_submissions')
        .insert({
          submitter_name:       name ?? null,
          submitter_email:      email,
          submitter_phone:      phone ?? null,
          source_page:          sourcePage ?? '/advertise',
          target_tier_interest: tierInterest ?? null,
          form_step_completed:  1,
        })
        .select('id')
        .single()

      if (error) {
        console.error('[leads/capture step1] DB error:', error)
        return NextResponse.json({ error: 'DB error' }, { status: 500 })
      }

      // GHL sync — nurture sequence tag + tier interest
      const parts = (name ?? '').trim().split(/\s+/)
      const firstName = parts[0] ?? undefined
      const lastName  = parts.slice(1).join(' ') || undefined
      const tags = ['rrp-prospect', 'nurture-sequence']
      if (tierInterest) tags.push(`tier-interested-${tierInterest}`)

      const ghlRes = await upsertContact({
        publicationSlug: 'rrp',
        email,
        firstName,
        lastName,
        phone: phone ?? undefined,
        tags,
      })

      // Mark GHL-synced if it worked
      if (ghlRes.success && lead?.id) {
        await supabase.from('lead_submissions').update({
          ghl_synced:     true,
          ghl_contact_id: ghlRes.contactId ?? null,
        }).eq('id', lead.id)
      }

      return NextResponse.json({ success: true, leadId: lead?.id ?? null })
    }

    // ── Step 2: qualifying info ─────────────────────────────────────────────
    if (action === 'step2') {
      const { leadId, businessName, businessSize, currentMarketingSpend, biggestChallenge, skip } = body

      if (!leadId) return NextResponse.json({ error: 'leadId required' }, { status: 400 })

      const supabase = supabaseAdmin()

      await supabase.from('lead_submissions').update({
        business_name:           businessName ?? null,
        business_size:           businessSize ?? null,
        current_marketing_spend: currentMarketingSpend ?? null,
        biggest_challenge:       biggestChallenge ?? null,
        form_step_completed:     skip ? 1 : 2,
      }).eq('id', leadId)

      // Upgrade GHL tags from nurture-sequence → qualified-lead (if not a skip)
      if (!skip) {
        const { data: lead } = await supabase
          .from('lead_submissions')
          .select('ghl_contact_id, submitter_email, target_tier_interest')
          .eq('id', leadId)
          .single()

        if (lead?.submitter_email) {
          const tags = ['rrp-prospect', 'qualified-lead']
          if (lead.target_tier_interest) tags.push(`tier-interested-${lead.target_tier_interest}`)
          if (businessName) tags.push('business-info-provided')

          await upsertContact({
            publicationSlug: 'rrp',
            email:           lead.submitter_email,
            businessName:    businessName ?? undefined,
            tags,
          })
        }
      }

      return NextResponse.json({ success: true })
    }

    // ── Full form: single-step capture from /advertise page ────────────────
    if (action === 'full-form') {
      const { name, email, phone, businessName, businessType, interests, notes, sourcePage } = body

      if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

      const supabase = supabaseAdmin()

      const { data: lead } = await supabase
        .from('lead_submissions')
        .insert({
          submitter_name:        name ?? null,
          submitter_email:       email,
          submitter_phone:       phone ?? null,
          business_name:         businessName ?? null,
          source_page:           sourcePage ?? '/advertise',
          biggest_challenge:     notes ?? null,
          form_step_completed:   2,
        })
        .select('id')
        .single()

      const parts = (name ?? '').trim().split(/\s+/)
      const tags = [
        'rrp-prospect', 'qualified-lead', 'advertise-page-lead',
        ...(interests ?? []).map((i: string) => `interest-${i}`),
        ...(businessType ? [`business-type-${businessType.split('/')[0].trim().toLowerCase().replace(/\s+/g, '-')}`] : []),
      ]

      await upsertContact({
        publicationSlug: 'rrp',
        email,
        firstName:    parts[0] ?? undefined,
        lastName:     parts.slice(1).join(' ') || undefined,
        phone:        phone ?? undefined,
        businessName: businessName ?? undefined,
        tags,
      })

      return NextResponse.json({ success: true, leadId: lead?.id ?? null })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e) {
    console.error('[leads/capture] error:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
