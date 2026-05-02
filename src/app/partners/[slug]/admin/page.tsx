import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { PartnerDashboard } from './PartnerDashboard'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  )
}

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ token?: string }>
}

export default async function PartnerAdminPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { token } = await searchParams
  const supabase = supabaseAdmin()
  const cookieStore = await cookies()

  let advertiserId: string | null = null

  // Check token from URL (magic link auth)
  if (token) {
    const { data: authToken } = await supabase
      .from('partner_auth_tokens')
      .select('advertiser_id, expires_at, used_at')
      .eq('token', token)
      .maybeSingle()

    if (!authToken) {
      return (
        <div style={{ minHeight: '100vh', backgroundColor: '#faf8f5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ maxWidth: 400, textAlign: 'center' }}>
            <p style={{ fontSize: 18, fontWeight: 700, color: '#1a2744', marginBottom: 10 }}>This link isn&apos;t valid.</p>
            <p style={{ fontSize: 14, color: '#666', marginBottom: 20 }}>It may have expired or already been used.</p>
            <Link href={`/partners/${slug}/login`} style={{ display: 'inline-block', padding: '10px 22px', borderRadius: 10, fontSize: 14, fontWeight: 700, backgroundColor: '#1a2744', color: 'white', textDecoration: 'none' }}>
              Request a new link
            </Link>
          </div>
        </div>
      )
    }

    if (new Date(authToken.expires_at) < new Date()) {
      return (
        <div style={{ minHeight: '100vh', backgroundColor: '#faf8f5', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ maxWidth: 400, textAlign: 'center' }}>
            <p style={{ fontSize: 18, fontWeight: 700, color: '#1a2744', marginBottom: 10 }}>This link has expired.</p>
            <p style={{ fontSize: 14, color: '#666', marginBottom: 20 }}>Magic links expire after 24 hours for security.</p>
            <Link href={`/partners/${slug}/login`} style={{ display: 'inline-block', padding: '10px 22px', borderRadius: 10, fontSize: 14, fontWeight: 700, backgroundColor: '#1a2744', color: 'white', textDecoration: 'none' }}>
              Request a new link
            </Link>
          </div>
        </div>
      )
    }

    // Mark token as used
    await supabase.from('partner_auth_tokens').update({ used_at: new Date().toISOString() }).eq('token', token)
    advertiserId = authToken.advertiser_id
  } else {
    // Check session cookie
    const sessionCookie = cookieStore.get(`partner_session_${slug}`)
    advertiserId = sessionCookie?.value ?? null
  }

  if (!advertiserId) {
    redirect(`/partners/${slug}/login`)
  }

  // Fetch account + leads
  const { data: account } = await supabase
    .from('advertiser_accounts')
    .select('*')
    .eq('id', advertiserId)
    .maybeSingle()

  if (!account || account.slug !== slug) {
    redirect(`/partners/${slug}/login`)
  }

  const { data: leads } = await supabase
    .from('partner_leads')
    .select('*')
    .eq('advertiser_id', advertiserId)
    .order('created_at', { ascending: false })
    .limit(200)

  return (
    <PartnerDashboard
      account={account}
      initialLeads={leads ?? []}
      token={token ?? null}
    />
  )
}
