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
      const authUser     = data.user
      const isBlogger    = next.startsWith('/blogger-portal')
      const isAdminLogin = next.startsWith('/admin')

      if (authUser?.email && authUser.id) {
        const admin = createAdminClient()
        // Bind bloggers.user_id ↔ auth user when their emails match.
        if (isBlogger) {
          await admin
            .from('bloggers')
            .update({ user_id: authUser.id })
            .ilike('email', authUser.email)
            .is('user_id', null)
        }
        // Same backfill for admin_users so pre-provisioned rows resolve
        // on first login. Safe to run on every callback — narrow update.
        if (isAdminLogin) {
          await admin
            .from('admin_users')
            .update({ user_id: authUser.id })
            .ilike('email', authUser.email)
            .is('user_id', null)
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Fall back to a generic login error. Each portal lands back at its own
  // login page if that's where the sign-in started.
  const fallback = next.startsWith('/blogger-portal')
    ? '/blogger-portal/login?error=auth'
    : next.startsWith('/admin')
      ? '/admin/login?error=auth'
      : '/advertiser-portal/login?error=auth'
  return NextResponse.redirect(`${origin}${fallback}`)
}
