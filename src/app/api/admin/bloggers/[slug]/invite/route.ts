// POST /api/admin/bloggers/[slug]/invite
//
// Sends a magic-link login email to the blogger's saved email address.
// Uses signInWithOtp because it (a) creates the auth user if missing,
// (b) sends the email automatically via Supabase, and (c) works the
// same for first-time and repeat invites.
//
// The link redirects to /auth/callback?next=/blogger-portal. The
// callback also binds bloggers.user_id when the email matches an
// active blogger row.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 })

  const admin = createAdminClient()

  const { data: blogger, error: readErr } = await admin
    .from('bloggers')
    .select('id, email')
    .eq('slug', slug)
    .maybeSingle()

  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 })
  if (!blogger)        return NextResponse.json({ error: 'Blogger not found' },               { status: 404 })
  if (!blogger.email)  return NextResponse.json({ error: 'Save the blogger email first.' },   { status: 400 })

  const url      = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const siteUrl  = process.env.NEXT_PUBLIC_SITE_URL || ''
  const redirect = `${siteUrl}/auth/callback?next=${encodeURIComponent('/blogger-portal')}`

  // signInWithOtp on the anon client sends the magic-link email and
  // creates the auth user if they don't exist yet.
  const anon = createClient(url, anonKey, { auth: { persistSession: false } })
  const { error: otpErr } = await anon.auth.signInWithOtp({
    email: blogger.email,
    options: { emailRedirectTo: redirect },
  })

  if (otpErr) return NextResponse.json({ error: otpErr.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
