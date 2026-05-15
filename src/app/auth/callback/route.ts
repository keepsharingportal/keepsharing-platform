import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/advertiser-portal'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Bind bloggers.user_id ↔ auth user when their emails match. Only
      // runs on blogger-portal sign-ins; advertiser logins are untouched.
      const isBloggerLogin = next.startsWith('/blogger-portal')
      const authUser       = data.user
      if (isBloggerLogin && authUser?.email && authUser.id) {
        const admin = createAdminClient()
        await admin
          .from('bloggers')
          .update({ user_id: authUser.id })
          .ilike('email', authUser.email)
          .is('user_id', null)
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Fall back to a generic login error. Bloggers land back at their own
  // login page if that's where they started.
  const fallback = next.startsWith('/blogger-portal')
    ? '/blogger-portal/login?error=auth'
    : '/advertiser-portal/login?error=auth'
  return NextResponse.redirect(`${origin}${fallback}`)
}
