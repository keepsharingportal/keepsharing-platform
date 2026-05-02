import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import { Phone, Mail, Calendar, ArrowRight, Package, Users, BarChart3 } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Advertiser Portal — River Region Parents',
}

export default async function AdvertiserPortalPage() {
  const supabase = await createClient()

  // Check auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/advertiser-portal/login')
  }

  // Look up their advertiser account
  const { data: account } = await supabase
    .from('advertiser_accounts')
    .select('*, advertiser_packages(display_name, monthly_price)')
    .eq('contact_email', user.email)
    .maybeSingle()

  // Their recent leads
  const { data: leads } = account?.id
    ? await supabase
        .from('lead_submissions')
        .select('*')
        .eq('target_advertiser_id', account.id)
        .order('created_at', { ascending: false })
        .limit(10)
    : { data: [] }

  const noAccount = !account

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--fg-cream, #faf8f5)', fontFamily: 'var(--font-dm-sans, sans-serif)' }}>

      {/* Header */}
      <div style={{ backgroundColor: 'var(--fg-navy, #1a2744)', padding: '20px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 16, fontWeight: 700, color: 'white', marginBottom: 2 }}>
              River Region <span style={{ color: 'var(--fg-sky, #4a90d9)' }}>Parents</span>
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Advertiser Portal</div>
          </div>
          <form action="/auth/signout" method="post">
            <button type="submit" style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', background: 'none', border: 'none', cursor: 'pointer' }}>Sign out</button>
          </form>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px 80px' }}>

        {noAccount ? (
          /* No account found */
          <div style={{ backgroundColor: 'white', borderRadius: 20, padding: '48px 36px', textAlign: 'center', maxWidth: 520, margin: '40px auto' }}>
            <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--fg-terra)', marginBottom: 12 }}>Not found</p>
            <h2 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 22, fontWeight: 700, color: 'var(--fg-navy)', marginBottom: 12 }}>
              No active partnership found
            </h2>
            <p style={{ fontSize: 14, color: 'var(--fg-mid)', lineHeight: 1.65, marginBottom: 28 }}>
              We don&apos;t see an active partnership for <strong>{user.email}</strong>. If you believe this is an error, contact Jason.
            </p>
            <Link href="/advertise" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 24px', borderRadius: 10, fontSize: 14, fontWeight: 700, backgroundColor: 'var(--fg-terra)', color: 'white', textDecoration: 'none' }}>
              Learn about becoming a Partner <ArrowRight size={14} />
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Welcome */}
            <div style={{ backgroundColor: 'var(--fg-navy)', borderRadius: 20, padding: '28px 28px 30px' }}>
              <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--fg-gold)', marginBottom: 8 }}>Your dashboard</p>
              <h1 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 'clamp(22px, 4vw, 32px)', fontWeight: 700, color: 'white', marginBottom: 6 }}>
                Welcome, {account.business_name}
              </h1>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>Logged in as {user.email}</p>
            </div>

            {/* Package + deployments row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div style={{ backgroundColor: 'white', borderRadius: 16, padding: '22px 22px 24px', border: '1px solid rgba(0,0,0,0.07)' }}>
                <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--fg-gold-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Package size={18} color="var(--fg-gold)" />
                  </div>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--fg-dim)', marginBottom: 2 }}>Your Package</p>
                    <h3 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 18, fontWeight: 700, color: 'var(--fg-navy)' }}>
                      {(account.advertiser_packages as { display_name?: string } | null)?.display_name ?? account.package_tier ?? 'Active Partner'}
                    </h3>
                  </div>
                </div>
                {account.package_tier && (
                  <div style={{ padding: '10px 14px', borderRadius: 10, backgroundColor: 'var(--fg-cream)', fontSize: 13, color: 'var(--fg-navy)' }}>
                    <strong>${(account.advertiser_packages as { monthly_price?: number } | null)?.monthly_price ?? '—'}</strong>
                    <span style={{ color: 'var(--fg-dim)' }}> /month</span>
                  </div>
                )}
                {account.contract_start_date && (
                  <p style={{ fontSize: 12, color: 'var(--fg-dim)', marginTop: 10 }}>
                    Active since: {new Date(account.contract_start_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </p>
                )}
              </div>

              <div style={{ backgroundColor: 'white', borderRadius: 16, padding: '22px 22px 24px', border: '1px solid rgba(0,0,0,0.07)' }}>
                <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--fg-sky-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BarChart3 size={18} color="var(--fg-sky)" />
                  </div>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--fg-dim)', marginBottom: 2 }}>Active Deployments</p>
                    <h3 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 18, fontWeight: 700, color: 'var(--fg-navy)' }}>Setting up</h3>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: 'var(--fg-mid)', lineHeight: 1.6 }}>
                  Your account is being set up. Your account manager will populate your active deployments within 24 hours of contract activation.
                </p>
              </div>
            </div>

            {/* Recent leads */}
            <div style={{ backgroundColor: 'white', borderRadius: 16, border: '1px solid rgba(0,0,0,0.07)', overflow: 'hidden' }}>
              <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Users size={16} color="var(--fg-terra)" />
                <h2 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 17, fontWeight: 700, color: 'var(--fg-navy)' }}>Recent Leads</h2>
              </div>
              {leads && leads.length > 0 ? (
                <div>
                  {leads.map((lead, i) => (
                    <div key={lead.id} style={{ padding: '14px 22px', borderBottom: i < leads.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--fg-cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-fraunces, serif)', fontSize: 14, fontWeight: 700, color: 'var(--fg-navy)', flexShrink: 0 }}>
                        {(lead.submitter_name ?? lead.submitter_email ?? '?')[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-navy)' }}>{lead.submitter_name ?? 'Name not provided'}</p>
                          <p style={{ fontSize: 11, color: 'var(--fg-dim)', flexShrink: 0 }}>{new Date(lead.created_at).toLocaleDateString()}</p>
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--fg-mid)' }}>{lead.submitter_email}</p>
                        {lead.message && <p style={{ fontSize: 12, color: '#777', marginTop: 4, lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.message}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding: '32px 22px', textAlign: 'center' }}>
                  <p style={{ fontSize: 14, color: 'var(--fg-mid)' }}>No leads yet. Once your listing is live, leads will appear here.</p>
                </div>
              )}
            </div>

            {/* Contact account manager */}
            <div style={{ backgroundColor: 'white', borderRadius: 16, padding: '22px 22px 24px', border: '1px solid rgba(0,0,0,0.07)' }}>
              <h2 style={{ fontFamily: 'var(--font-fraunces, serif)', fontSize: 17, fontWeight: 700, color: 'var(--fg-navy)', marginBottom: 14 }}>
                Your Account Manager
              </h2>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16 }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg, var(--fg-navy) 0%, var(--fg-sky) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-fraunces, serif)', fontSize: 20, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                  J
                </div>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg-navy)', marginBottom: 2 }}>Jason Watson</p>
                  <p style={{ fontSize: 12, color: 'var(--fg-mid)' }}>Owner, River Region Parents</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <a href="mailto:jade31994@gmail.com" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9, fontSize: 12, fontWeight: 600, backgroundColor: 'var(--fg-sky-light)', color: 'var(--fg-sky)', textDecoration: 'none' }}>
                  <Mail size={13} /> Email Jason
                </a>
                <a href="tel:+13343285189" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9, fontSize: 12, fontWeight: 600, backgroundColor: 'var(--fg-cream)', color: 'var(--fg-navy)', textDecoration: 'none', border: '1px solid rgba(0,0,0,0.08)' }}>
                  <Phone size={13} /> Call
                </a>
                <a href="https://calendly.com" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9, fontSize: 12, fontWeight: 600, backgroundColor: 'var(--fg-cream)', color: 'var(--fg-navy)', textDecoration: 'none', border: '1px solid rgba(0,0,0,0.08)' }}>
                  <Calendar size={13} /> Schedule a call
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
