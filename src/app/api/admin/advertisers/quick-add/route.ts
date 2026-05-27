// POST /api/admin/advertisers/quick-add
//
// Lightweight endpoint for creating an advertiser_account from inline forms
// (QR code creation, ad assignment, etc.) without navigating to the full
// advertiser admin. Creates a minimal row — business name + slug + optional
// contact info. The full profile can be fleshed out later in /admin/advertisers.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin/auth'

export const runtime = 'nodejs'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    { auth: { persistSession: false } },
  )
}

interface Body {
  business_name?: string
  slug?:          string
  contact_email?: string | null
  contact_phone?: string | null
  business_url?:  string | null
}

export async function POST(req: NextRequest) {
  try { await requireAdmin() }
  catch (e) { if (e instanceof Response) return e; throw e }

  const body = await req.json().catch(() => null) as Body | null
  if (!body?.business_name?.trim()) {
    return NextResponse.json({ error: 'business_name is required' }, { status: 400 })
  }

  const name = body.business_name.trim()
  const slug = (body.slug ?? name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)

  const supabase = supabaseAdmin()

  // Check slug conflict
  const { data: existing } = await supabase
    .from('advertiser_accounts')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()
  if (existing) {
    return NextResponse.json({ error: `An advertiser with slug "${slug}" already exists` }, { status: 409 })
  }

  const { data, error } = await supabase
    .from('advertiser_accounts')
    .insert({
      business_name:  name,
      slug,
      contact_email:  body.contact_email ?? null,
      contact_phone:  body.contact_phone ?? null,
      business_url:   body.business_url ?? null,
      lifecycle_stage: 'active',
    })
    .select('id, business_name, slug')
    .single()

  if (error) {
    console.error('[admin/advertisers/quick-add]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  revalidatePath('/admin/advertisers')
  revalidatePath('/admin/content/short-links')
  return NextResponse.json({ id: data.id, business_name: data.business_name, slug: data.slug })
}
