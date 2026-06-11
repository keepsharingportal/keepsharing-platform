// ── Community Submission Draft Generator ─────────────────────────────────────
// AI-assisted first-pass drafts for all community submission types.
//
// AI drafts are assistance only. Human approval required before publication.
// All outputs must be reviewed by an editor before any content goes live.
//
// TODO: Set ANTHROPIC_API_KEY in your .env.local file
//   ANTHROPIC_API_KEY=sk-ant-...

import { runAI }                from '@/lib/ai/client'
import { createClient }          from '@supabase/supabase-js'
import { getSubmissionType }     from './submissions'
import type { SubmissionTypeConfig } from './submissions'

// ── Internal Supabase client (service role, for background/action use) ────────

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL        ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY       ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY   ?? '',
  )
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface DraftSubmission {
  id:              string
  submission_type: string
  submitter_name:  string
  payload:         Record<string, string>
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatAnswers(payload: Record<string, string>, config: SubmissionTypeConfig): string {
  return config.fields
    .map(f => {
      const v = (payload[f.id] ?? '').trim()
      return v ? `${f.label}:\n${v}` : null
    })
    .filter(Boolean)
    .join('\n\n')
}

function getMissingRequired(payload: Record<string, string>, config: SubmissionTypeConfig): string[] {
  return config.fields
    .filter(f => f.required && !(payload[f.id] ?? '').trim())
    .map(f => f.label)
}

// ── Shared editorial context ───────────────────────────────────────────────────

const CTX = `You are an editorial assistant for River Region Parents, a trusted family media publication in the Montgomery, Alabama metro area (Prattville, Pike Road, Wetumpka, Millbrook, and surrounding communities). You help editors prepare first-draft content from community submissions.

Rules — follow without exception:
• Warm, local, and community-focused tone
• Clear and readable — not stiff, not overhyped
• Use real names, schools, and neighborhoods exactly as provided
• Never add facts not stated in the submission
• Never invent quotes or dialogue
• Never create awards, achievements, or credentials not stated by the submitter
• This is a first draft for human editorial review — write accordingly`

// ── Type-specific prompt builders ──────────────────────────────────────────────

function buildPrompt(sub: DraftSubmission, config: SubmissionTypeConfig): string {
  const answers = formatAnswers(sub.payload, config)

  switch (sub.submission_type) {

    case 'teacher-of-the-month':
      return `${CTX}

TASK: Write a Teacher of the Month nomination feature (~150–200 words) for River Region Parents magazine.

Format:
• Open with the teacher's name, school, and grade/subject
• Describe what makes them exceptional (from the nomination reason)
• Include the specific story or moment the nominator shared
• Close with a warm, community-affirming line
• Third person — no subheadings

Submission:
${answers}

Nominator relationship: ${sub.payload['submitter_relationship'] ?? 'not specified'}`

    case 'mom-to-mom':
      return `${CTX}

TASK: Write a Mom to Mom column intro/profile (~200–250 words) for River Region Parents. This column profiles real local moms.

Format:
• Open identifying who she is: neighborhood, kids, occupation or passion
• Flow into her story using her actual words (clean them up, but preserve her voice)
• Include her motherhood wisdom and favorite family spot if provided
• End with a line that makes readers want to meet her
• Friendly magazine-feature style

Submission:
${answers}`

    case 'grands-are-the-greatest':
      return `${CTX}

TASK: Write a Grands Are the Greatest feature (~150–200 words) for River Region Parents. This column celebrates extraordinary grandparents.

Format:
• Open with the grandparent's name and city
• Describe why they are exceptional — use the submitter's words
• Include the specific memory or story if provided
• Write with warmth and respect — this is often a family keepsake
• Close honoring both the grandparent and the family bond
• Third person

Submission:
${answers}`

    case 'play-ball':
      return `${CTX}

TASK: Write a Play Ball athlete spotlight (~125–175 words) for River Region Parents. This column celebrates young local athletes.

Format:
• Open with the athlete's name, sport, and school/team
• Describe what makes them stand out — use the specific traits mentioned
• Include the achievement or memorable moment if provided
• Upbeat community-sports energy — not a press release
• Third person

Submission:
${answers}`

    case 'student-spotlight':
      return `${CTX}

TASK: Write a Student Spotlight blurb (~100–150 words) for River Region Parents digital (and possibly print).

Format:
• Open with the student's name, grade, and school
• Describe what makes them stand out, using the submitted details
• Include the achievement or notable moment if provided
• Warm and encouraging — this celebrates a child's accomplishment
• Third person

Submission:
${answers}`

    case 'school-news':
      return `${CTX}

TASK: Write a School Bits news item (~75–100 words) for River Region Parents. This section covers school community news.

Format:
• Lead with the school name and the news topic
• State key facts clearly and briefly
• Include contact info if provided
• Factual and clear — not a press release
• Third person

Submission:
${answers}`

    case 'birthday-celebration':
      return `${CTX}

TASK: Write a birthday shoutout (maximum 55 words) for the River Region Parents birthday page.

Format:
• Start with the child's first name and age turning
• Include birthday date or month
• If a birthday message was provided, include it in quotes attributed to "the family"
• Warm, celebratory, very brief — this is a listing, not a feature

Submission:
${answers}`

    case 'event-submission':
      return `${CTX}

TASK: Write a cleaned event listing summary (~75–100 words) for the River Region Parents Things To Do calendar.

Format:
• Event name first
• Date, time, and location on the second line
• Short description: what it is, who it's for, why families should attend
• Include website/registration link if provided
• Note if free or paid
• Factual — no hype language

Submission:
${answers}`

    case 'parent-picks':
      return `${CTX}

TASK: Write a Parent Picks business spotlight (~100–150 words) for River Region Parents magazine.

Format:
• Open with the business name and type
• Describe what makes it special to local families — use the submitter's specific words
• Avoid generic praise — keep it specific to what was shared
• Close with a soft call-to-action or website URL if provided
• Third person, warm community voice

Submission:
${answers}`

    case 'boom-profile':
      return `${CTX}

TASK: Write a River Region Boom profile intro/feature (~300–350 words). Boom profiles community leaders, entrepreneurs, and change-makers.

Format:
• Open with a compelling, person-first hook — who this person is and what drives them
• Move into their story: what shaped them, what they're building
• Include their love for the River Region using their specific words
• Describe their current project or what excites them most
• Close positioning them as someone worth knowing in this community
• First-person quotes are welcome here — drawn directly from their submitted words
• Energetic, forward-looking, locally grounded

Submission:
${answers}`

    default:
      return `${CTX}

TASK: Write a short editorial feature (~150 words) from this community submission for River Region Parents.

Submission type: ${sub.submission_type}

Submission:
${answers}`
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function generateCommunityDraft(submissionId: string): Promise<void> {
  const supabase = supabaseAdmin()

  const { data } = await supabase
    .from('community_submissions')
    .select('id, submission_type, submitter_name, payload')
    .eq('id', submissionId)
    .single()

  if (!data) {
    console.error('[community-drafts] submission not found:', submissionId)
    return
  }

  const sub    = data as unknown as DraftSubmission
  const config = getSubmissionType(sub.submission_type)

  if (!config) {
    console.error('[community-drafts] unknown submission type:', sub.submission_type)
    return
  }

  // ── Missing required fields: skip generation, write guidance note ─────────
  const missing = getMissingRequired(sub.payload, config)
  if (missing.length > 0) {
    const note = [
      '⚠️  Missing Info — Draft Not Generated',
      '',
      'This submission is missing required information before a draft can be written.',
      'Collect the following from the submitter, then regenerate:',
      '',
      ...missing.map(f => `  • ${f}`),
    ].join('\n')

    await supabase
      .from('community_submissions')
      .update({
        ai_draft_content: note,
        ai_draft_status:  'needs_info',
        ai_prompt_used:   `${sub.submission_type}-v1-missing_info`,
      })
      .eq('id', submissionId)

    return
  }

  // ── Mark as generating ────────────────────────────────────────────────────
  await supabase
    .from('community_submissions')
    .update({ ai_draft_status: 'generating' })
    .eq('id', submissionId)

  // ── Call AI via the central wrapper ───────────────────────────────────────
  // runAI() handles the no-key case (throws AINotConfiguredError) which
  // surfaces here as a 'failed' draft with the error message, instead of
  // silently bypassing usage tracking + budget caps.
  try {
    const prompt = buildPrompt(sub, config)

    const aiResponse = await runAI({
      taskKind: 'drafting',
      caller:   `community-drafts.${sub.submission_type}`,
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 1024,
    })
    const draft = aiResponse.text.trim()

    await supabase
      .from('community_submissions')
      .update({
        ai_draft_content: draft,
        ai_draft_status:  'ready',
        ai_prompt_used:   `${sub.submission_type}-v1`,
      })
      .eq('id', submissionId)

    console.log('[community-drafts] draft ready for', submissionId)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[community-drafts] generation failed:', msg)
    await supabase
      .from('community_submissions')
      .update({
        ai_draft_content: `Draft generation failed: ${msg}`,
        ai_draft_status:  'failed',
      })
      .eq('id', submissionId)
  }
}
