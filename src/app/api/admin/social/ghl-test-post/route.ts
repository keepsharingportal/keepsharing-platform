// POST /api/admin/social/ghl-test-post
// Body: { brand, accountIds[], caption, imageUrl?, scheduleDate? }
//
// One-shot diagnostic to prove the GHL Social Planner pipe works end-
// to-end. The admin diagnostic page calls this with an editor's chosen
// caption + a test image. The returned postId can be deleted via the
// Social Planner UI in GHL.

import { NextRequest, NextResponse } from 'next/server'
import { requireSettingsAccess } from '@/lib/admin/auth'
import { createSocialPost } from '@/lib/ghl-social'

export const runtime     = 'nodejs'
export const dynamic     = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  await requireSettingsAccess()
  const body = await req.json().catch(() => ({})) as {
    brand?:        string
    accountIds?:   string[]
    caption?:      string
    imageUrl?:     string
    scheduleDate?: string
  }
  if (!body.brand || !body.accountIds?.length || !body.caption) {
    return NextResponse.json({ error: 'brand, accountIds, and caption are required' }, { status: 400 })
  }
  const r = await createSocialPost({
    brandSlug:    body.brand,
    accountIds:   body.accountIds,
    caption:      body.caption,
    imageUrl:     body.imageUrl ?? null,
    scheduleDate: body.scheduleDate,
  })
  return NextResponse.json(r, { status: r.ok ? 200 : 502 })
}
