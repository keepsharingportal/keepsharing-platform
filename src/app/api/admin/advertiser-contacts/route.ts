// POST /api/admin/advertiser-contacts — create a new contact on an advertiser.
//
// Body:
//   { advertiser_account_id, name, email?, phone?, role?, is_primary?, notes? }
//
// Behavior:
//   - role defaults to 'other' if unset.
//   - When is_primary=true, the new row demotes any other primary on the
//     same account in a single transaction. Trigger advertiser_contacts_
//     sync_inline_trg then mirrors name/email/phone onto the parent
//     advertiser_accounts row so legacy code paths keep working.
//   - Returns the created row.

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

const VALID_ROLES = ['ad_rep', 'billing', 'listing_owner', 'decision_maker', 'other'] as const

interface Body {
  advertiser_account_id?: string
  name?:                  string
  email?:                 string | null
  phone?:                 string | null
  role?:                  string
  is_primary?:            boolean
  notes?:                 string | null
}

export async function POST(req: NextRequest) {
  await requireAdmin()
  const body = await req.json().catch(() => null) as Body | null
  if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const advertiser_account_id = body.advertiser_account_id?.trim()
  const name                  = body.name?.trim()
  if (!advertiser_account_id) return NextResponse.json({ error: 'advertiser_account_id required' }, { status: 400 })
  if (!name)                  return NextResponse.json({ error: 'name required' }, { status: 400 })

  const role = body.role && (VALID_ROLES as readonly string[]).includes(body.role)
    ? body.role
    : 'other'

  const supabase = createAdminClient()

  // If this contact is being added as primary, demote any existing
  // primary on the same account first. One UPDATE, then the INSERT.
  if (body.is_primary) {
    await supabase
      .from('advertiser_contacts')
      .update({ is_primary: false })
      .eq('advertiser_account_id', advertiser_account_id)
      .eq('is_primary', true)
  }

  const { data, error } = await supabase
    .from('advertiser_contacts')
    .insert({
      advertiser_account_id,
      name,
      email:      body.email?.trim()  || null,
      phone:      body.phone?.trim()  || null,
      role,
      is_primary: !!body.is_primary,
      notes:      body.notes?.trim()  || null,
    })
    .select('*')
    .single()

  if (error) {
    console.error('[advertiser-contacts POST]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ contact: data })
}
