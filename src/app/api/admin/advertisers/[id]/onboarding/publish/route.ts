// POST /api/admin/advertisers/[id]/onboarding/publish
//
// Admin-driven publish: flips guide_listings.is_published=true and
// stamps onboarding_status='submitted' so the queue surfaces it as
// reviewed. Used both at wizard end ("Publish my listing") and from
// the review queue ("Approve").

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface Body { guide_slug?: string }
interface RouteParams { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: RouteParams) {
  await requireAdmin()
  const { id } = await params
  const body = await req.json().catch(() => ({})) as Body
  const guideSlug = body.guide_slug

  const sb = createAdminClient()

  // Stamp onboarding status no matter what
  await sb.from('advertiser_accounts')
    .update({ onboarding_status: 'submitted' })
    .eq('id', id)

  // Publish the matching guide_listings row(s). If a guide is specified
  // we only publish that one; otherwise we publish every listing for
  // this advertiser.
  let q = sb.from('guide_listings').update({ is_published: true }).eq('advertiser_account_id', id)
  if (guideSlug) q = q.eq('guide_type_slug', guideSlug)
  const { error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
