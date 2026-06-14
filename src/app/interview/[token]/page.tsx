// /interview/[token] — public form the nominee opens from the
// outreach email. Loads the submission by interview_token, shows
// per-type questions (from submission_type_columns.interview_template),
// and accepts text answers + image uploads.
//
// Token-secured: anyone with the token can submit, but the URL is
// hard to guess (32 random bytes base64url-encoded). After submission
// the editor's admin view shows the answers in the Interview column
// and the phase advances to 'interview-received'.

import { notFound } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { loadBrand } from '@/lib/brands'
import { InterviewForm } from './InterviewForm'

export const metadata = { title: 'Your interview — KeepSharing' }
export const dynamic  = 'force-dynamic'

interface PageProps { params: Promise<{ token: string }> }

function sb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
    { auth: { persistSession: false } },
  )
}

interface InterviewQuestion {
  key:      string
  label:    string
  prompt?:  string
  type:     'text' | 'longtext' | 'select'
  required: boolean
  options?: string[]
}

interface ImageReqs {
  min_required:     number
  max:              number
  recommended_count?: number
  types?:           string[]
}

export default async function InterviewPage({ params }: PageProps) {
  const { token } = await params
  if (!token || token.length < 16) notFound()

  const db = sb()

  // Look up submission by token
  const { data: subRow } = await db
    .from('community_submissions')
    .select('id, submission_type, target_publication, nominee_name, nominee_email, working_title, related_person_name, related_business_name, related_school_name, phase, interview_submitted_at, interview_responses, interview_image_urls')
    .eq('interview_token', token)
    .maybeSingle()
  if (!subRow) notFound()

  type Sub = {
    id: string; submission_type: string; target_publication: string;
    nominee_name: string | null; nominee_email: string | null;
    working_title: string | null;
    related_person_name: string | null; related_business_name: string | null; related_school_name: string | null;
    phase: string; interview_submitted_at: string | null;
    interview_responses: Record<string, string> | null;
    interview_image_urls: Array<{ url: string; caption?: string }> | null;
  }
  const sub = subRow as unknown as Sub

  // Per-type config
  const { data: cfgRow } = await db
    .from('submission_type_columns')
    .select('label, interview_template, image_requirements, article_format')
    .eq('submission_type', sub.submission_type)
    .maybeSingle()
  type Cfg = { label: string | null; interview_template: InterviewQuestion[]; image_requirements: ImageReqs; article_format: string }
  const cfg = (cfgRow as Cfg | null) ?? { label: null, interview_template: [], image_requirements: { min_required: 0, max: 4 }, article_format: 'profile' }

  const brand     = await loadBrand(sub.target_publication ?? 'rrp')
  const brandName = brand?.displayName ?? 'River Region Parents'

  const nomineeFirst = (sub.nominee_name ?? sub.related_person_name ?? '').split(' ')[0] || 'there'
  const typeLabel    = cfg.label ?? sub.submission_type.replace(/-/g, ' ')

  // Already submitted? Show a thank-you instead of the form.
  if (sub.interview_submitted_at) {
    return (
      <Shell brandName={brandName} typeLabel={typeLabel}>
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <div style={{ fontSize: 48, marginBottom: 14 }}>✓</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>Thanks, {nomineeFirst}.</h2>
          <p style={{ color: '#475569', maxWidth: 460, margin: '0 auto', lineHeight: 1.5 }}>
            We got your interview submission. Our editorial team will draft your feature using your answers and reach out if anything needs follow-up.
          </p>
          <p style={{ color: '#94a3b8', fontSize: 13, marginTop: 20 }}>
            Submitted {new Date(sub.interview_submitted_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </Shell>
    )
  }

  return (
    <Shell brandName={brandName} typeLabel={typeLabel}>
      <InterviewForm
        token={token}
        nomineeFirst={nomineeFirst}
        typeLabel={typeLabel}
        articleFormat={cfg.article_format}
        questions={cfg.interview_template ?? []}
        imageReqs={cfg.image_requirements ?? { min_required: 0, max: 4 }}
      />
    </Shell>
  )
}

function Shell({ brandName, typeLabel, children }: { brandName: string; typeLabel: string; children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #F8FAFC 0%, #ffffff 200px)',
      fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
    }}>
      <header style={{ background: '#0F2640', padding: '20px 0' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 700, color: 'white' }}>
            {brandName}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: 2, marginTop: 4 }}>
            {typeLabel} Interview
          </div>
        </div>
      </header>
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px 80px' }}>
        {children}
      </main>
    </div>
  )
}
