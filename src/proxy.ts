import { NextResponse, type NextRequest } from 'next/server'

// Auth enforcement is disabled in local dev (no Supabase credentials).
// When real Supabase credentials are added to .env.local, swap this for
// full session refresh + /admin route protection (see supabase docs).
export async function proxy(request: NextRequest) {
  return NextResponse.next({ request })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
