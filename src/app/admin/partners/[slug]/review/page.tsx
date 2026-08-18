import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { PublishPartnerButton } from './PublishPartnerButton'

interface Props { params: Promise<{ slug: string }> }

export default async function PartnerReviewPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createClient()

  // Admin check
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== 'jade31994@gmail.com') redirect('/advertiser-portal/login')

  const { data: account } = await supabase.from('advertiser_accounts')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (!account) notFound()

  const progress = (account.onboarding_progress ?? {}) as Record<string, unknown>
  const basics = (progress.basics ?? {}) as Record<string, string>

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f4f5f7', padding: '24px 20px', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <Link href="/admin" style={{ fontSize: 13, color: '#4a90d9', textDecoration: 'none' }}>← Admin</Link>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a2744', margin: '6px 0 0' }}>
              Partner Review: {account.business_name}
            </h1>
            <p style={{ fontSize: 13, color: '#888', margin: '3px 0 0' }}>
              Status: <strong>{account.onboarding_status}</strong> · /partners/{account.slug}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Link href={`/admin/go/partners/${slug}`} target="_blank" style={{ padding: '9px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: '1px solid rgba(0,0,0,0.15)', backgroundColor: 'white', color: '#333', textDecoration: 'none' }}>
              Preview page ↗
            </Link>
            <PublishPartnerButton accountId={account.id} slug={slug} currentStatus={account.onboarding_status} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Left: submitted data */}
          <div style={{ backgroundColor: 'white', borderRadius: 12, padding: 24, border: '1px solid rgba(0,0,0,0.08)' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a2744', marginBottom: 18 }}>Submitted Data</h2>

            <section style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Basics</h3>
              {[
                ['Business', account.business_name],
                ['Contact', account.contact_name],
                ['Phone', account.contact_phone],
                ['Email', account.contact_email],
                ['Website', account.business_url],
                ['Category', account.category],
                ['Status', account.onboarding_status],
              ].map(([k, v]) => v ? (
                <div key={k as string} style={{ display: 'flex', gap: 8, fontSize: 13, marginBottom: 6 }}>
                  <span style={{ color: '#888', minWidth: 70 }}>{k}</span>
                  <span style={{ color: '#333' }}>{v}</span>
                </div>
              ) : null)}
            </section>

            {!!progress.offerHeadline && (
              <section style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Offer</h3>
                {[
                  ['Headline', progress.offerHeadline],
                  ['Subheadline', progress.offerSubheadline],
                  ['Type', progress.offerType],
                  ['CTA', progress.ctaText],
                  ['Urgency', progress.offerUrgency],
                ].map(([k, v]) => v ? (
                  <div key={k as string} style={{ fontSize: 13, marginBottom: 8 }}>
                    <span style={{ color: '#888', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k as string}</span>
                    <p style={{ color: '#333', marginTop: 2 }}>{v as string}</p>
                  </div>
                ) : null)}
                {!!progress.offerValue && (
                  <div style={{ fontSize: 13, marginBottom: 8 }}>
                    <span style={{ color: '#888', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' }}>Value statement</span>
                    <p style={{ color: '#333', marginTop: 2, lineHeight: 1.55 }}>{progress.offerValue as string}</p>
                  </div>
                )}
              </section>
            )}

            {!!progress.missionStatement && (
              <section style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Mission</h3>
                <p style={{ fontSize: 13, color: '#333', lineHeight: 1.55 }}>{progress.missionStatement as string}</p>
              </section>
            )}

            {!!progress.notes && (
              <section style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Notes from partner</h3>
                <p style={{ fontSize: 13, color: '#333', lineHeight: 1.55 }}>{progress.notes as string}</p>
              </section>
            )}
          </div>

          {/* Right: live preview */}
          <div style={{ backgroundColor: 'white', borderRadius: 12, padding: 24, border: '1px solid rgba(0,0,0,0.08)' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a2744', marginBottom: 14 }}>Live Preview</h2>
            <iframe
              src={`/partners/${slug}`}
              style={{ width: '100%', height: 600, border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8 }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
