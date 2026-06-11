// ── /contribute/[token] — public magic-link Q&A landing ─────────────────────
// Token-authenticated, no login. Contributor lands here from an email,
// answers the questions, hits submit. We fire AI drafting in the
// background; the editor reviews the draft in admin.

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { ContributorForm } from './ContributorForm'

export const metadata: Metadata = { title: 'Contribute to River Region Parents' }
export const dynamic = 'force-dynamic'

interface Props { params: Promise<{ token: string }> }

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

interface Question { key: string; label: string; placeholder?: string; required?: boolean }

export default async function ContributePage({ params }: Props) {
  const { token } = await params
  const sb = supabaseAdmin()

  const { data: inviteData } = await sb
    .from('contributor_invites')
    .select(`
      id, ask, brand_slug, target_column, questions, status, expires_at, sent_at,
      contributor_id,
      contributors:contributor_id (name, email)
    `)
    .eq('token', token)
    .maybeSingle()
  const invite = inviteData as null | {
    id: string; ask: string | null; brand_slug: string; target_column: string | null;
    questions: Question[]; status: string; expires_at: string | null; sent_at: string;
    contributor_id: string;
    contributors: { name: string; email: string } | { name: string; email: string }[] | null;
  }

  if (!invite) notFound()

  if (invite.status === 'completed') {
    return <Confirmation />
  }
  if (invite.status === 'revoked') {
    return (
      <Shell>
        <h1 className="text-2xl font-bold text-portal-text mb-2">This link is no longer active</h1>
        <p className="text-portal-sub">The editorial team revoked this invite. If you think this is a mistake, reply to the email that sent you here.</p>
      </Shell>
    )
  }
  if (invite.expires_at && new Date(invite.expires_at).getTime() < Date.now()) {
    return (
      <Shell>
        <h1 className="text-2xl font-bold text-portal-text mb-2">This link has expired</h1>
        <p className="text-portal-sub">Sent {new Date(invite.sent_at).toLocaleDateString()}. Reach back out and we&apos;ll send a fresh one.</p>
      </Shell>
    )
  }

  const contributor = Array.isArray(invite.contributors) ? invite.contributors[0] : invite.contributors
  const questions = (Array.isArray(invite.questions) ? invite.questions : []) as Question[]

  return (
    <Shell>
      <header className="mb-8">
        <p className="text-[11px] uppercase tracking-widest text-portal-blue font-bold mb-2">River Region Parents · Contributor Q&amp;A</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-portal-text leading-tight">Hi {contributor?.name?.split(' ')[0] ?? 'there'}, thanks for sharing your story.</h1>
        {invite.ask && (
          <div className="mt-5 bg-portal-blue-lt border-l-4 border-portal-blue rounded-r-md p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-portal-blue mb-1">What we&apos;re asking for</p>
            <p className="text-sm text-portal-text leading-relaxed whitespace-pre-wrap">{invite.ask}</p>
          </div>
        )}
        <p className="text-portal-sub text-sm mt-4 leading-relaxed">
          Answer in your own voice — short or long, however feels natural. Our editor will polish it into a final article and send it back for your approval before publishing.
        </p>
      </header>
      <ContributorForm
        token={token}
        questions={questions}
      />
    </Shell>
  )
}

function Confirmation() {
  return (
    <Shell>
      <h1 className="text-3xl font-bold text-portal-text mb-3">Got it — thank you.</h1>
      <p className="text-portal-sub leading-relaxed">
        Your responses are with our editor. We&apos;ll be in touch soon with a draft for your review before anything is published. If you remembered something you wanted to add, just reply to the email that sent you here.
      </p>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-portal-bg">
      <div className="max-w-2xl mx-auto px-6 py-12">
        {children}
      </div>
    </main>
  )
}
