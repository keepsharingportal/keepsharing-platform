// POST /api/admin/seo/authors — upsert one author profile

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { saveAuthorProfile, type AuthorProfile } from '@/lib/seo/authors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const ctx = await requireAdmin()
  const body = await req.json() as Partial<AuthorProfile>

  if (!body?.authorSlug || !body?.displayName) {
    return NextResponse.json({ error: 'authorSlug and displayName are required' }, { status: 400 })
  }

  const profile: AuthorProfile = {
    authorSlug:       body.authorSlug,
    displayName:      body.displayName,
    bio:              body.bio          ?? null,
    headshotUrl:      body.headshotUrl  ?? null,
    jobTitle:         body.jobTitle     ?? null,
    credentials:      Array.isArray(body.credentials) ? body.credentials : [],
    knowsAbout:       Array.isArray(body.knowsAbout)  ? body.knowsAbout  : [],
    socialUrls:       Array.isArray(body.socialUrls)  ? body.socialUrls  : [],
    contactEmail:     body.contactEmail ?? null,
    primaryBrandSlug: body.primaryBrandSlug ?? null,
  }

  try {
    const sb = createAdminClient()
    await saveAuthorProfile(sb, profile, ctx?.email ?? null)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
