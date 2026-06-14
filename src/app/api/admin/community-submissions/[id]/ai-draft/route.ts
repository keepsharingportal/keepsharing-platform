// POST /api/admin/community-submissions/[id]/ai-draft
//
// Drafts an article body from the nominator's submission + the nominee's
// interview responses + the per-type article_format. Routes through
// the central runAI() so brand-voice rules and AI budget caps apply.
//
// Output formats by article_format:
//   'q-and-a'        — formatted as bolded questions with answers below
//   'profile'        — narrative biographical feature
//   'write-up'       — sports-style narrative with quotes pulled inline
//   'news-brief'     — short 200-word news announcement
//   'photo-caption'  — 1-2 sentence caption for a photo-led item
//   'roundup'        — list-style with intro paragraph

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { runAI } from '@/lib/ai/client'
import { loadBrand, buildBrandPromptFragment } from '@/lib/brands'

export const runtime     = 'nodejs'
export const dynamic     = 'force-dynamic'
export const maxDuration = 60

interface RouteCtx { params: Promise<{ id: string }> }

interface Sub {
  id:                      string
  submission_type:         string
  target_publication:      string
  working_title:           string | null
  excerpt:                 string | null
  ai_draft_content:        string | null
  related_person_name:     string | null
  related_business_name:   string | null
  related_school_name:     string | null
  submitter_name:          string | null
  nominee_name:            string | null
  interview_responses:     Record<string, string> | null
}

interface TypeCfg {
  label:              string | null
  article_format:     string
  interview_template: Array<{ key: string; label: string }>
}

export async function POST(_req: NextRequest, ctx: RouteCtx) {
  const adminCtx = await requireAdmin()
  const { id }   = await ctx.params

  const sb = createAdminClient()
  const { data: subRow, error: subErr } = await sb
    .from('community_submissions')
    .select('id, submission_type, target_publication, working_title, excerpt, ai_draft_content, related_person_name, related_business_name, related_school_name, submitter_name, nominee_name, interview_responses')
    .eq('id', id)
    .maybeSingle()
  if (subErr || !subRow) return NextResponse.json({ error: 'submission not found' }, { status: 404 })
  const sub = subRow as unknown as Sub

  const { data: cfgRow } = await sb
    .from('submission_type_columns')
    .select('label, article_format, interview_template')
    .eq('submission_type', sub.submission_type)
    .maybeSingle()
  const cfg = (cfgRow as TypeCfg | null) ?? { label: null, article_format: 'profile', interview_template: [] }

  const brand     = await loadBrand(sub.target_publication ?? 'rrp')
  if (!brand) return NextResponse.json({ error: 'unknown publication' }, { status: 400 })

  const brandFragment = buildBrandPromptFragment(brand)
  const subjectName   = sub.related_person_name || sub.related_business_name || sub.related_school_name || sub.nominee_name || ''
  const typeLabel     = cfg.label ?? sub.submission_type

  // Format-specific guidance for the prompt
  const formatGuide = formatGuidance(cfg.article_format)

  // Interview Q&A block — only included if we have responses
  let interviewBlock = ''
  if (sub.interview_responses && Object.keys(sub.interview_responses).length > 0) {
    interviewBlock = '\n\nNOMINEE INTERVIEW RESPONSES:\n' + cfg.interview_template
      .map(q => {
        const ans = sub.interview_responses?.[q.key]?.trim()
        return ans ? `Q: ${q.label}\nA: ${ans}` : null
      })
      .filter(Boolean)
      .join('\n\n')
  }

  const systemPrompt = `You write community feature articles for a family-focused regional publication.

${brandFragment}

You will be given a nominator's submission and (when available) the nominee's interview responses. Write a complete article in the ${cfg.article_format} format.

${formatGuide}

Rules:
- Match the brand voice rules above
- Lead with a strong hook, never a generic opener like "Meet Jane"
- Use the nominee's own words in quotes when they're vivid
- Local + specific: name the city, the neighborhood, the school
- Length: 350-550 words unless the format is news-brief (150-250) or photo-caption (50-80)
- No headline — caller will set the title separately
- Return ONLY the article body. No JSON, no preamble, no markdown headers above the body.`

  const userPrompt = `NOMINATION:
Subject: ${subjectName || '(no subject named)'}
Nominator: ${sub.submitter_name ?? '(unknown)'}
Type: ${typeLabel}
${sub.working_title ? `Editor's working title: ${sub.working_title}` : ''}
${sub.excerpt ? `Editor's excerpt: ${sub.excerpt}` : ''}${interviewBlock}

Now write the article body.`

  try {
    const out = await runAI({
      taskKind:     'drafting',
      caller:       'community-submission-draft',
      systemPrompt,
      messages:     [{ role: 'user', content: userPrompt }],
      maxTokens:    1500,
      adminId:      adminCtx.userId,
    })

    const draft = out.text.trim()

    // Write back. Also bump phase to 'draft-ready' if it's currently
    // earlier in the workflow (so the editor sees the next action button).
    const updates: Record<string, unknown> = {
      ai_draft_content: draft,
      ai_draft_status:  'ready',
    }
    const { data: phaseRow } = await sb
      .from('community_submissions')
      .select('phase')
      .eq('id', id)
      .maybeSingle()
    const currentPhase = (phaseRow?.phase as string) ?? 'nominated'
    if (['nominated', 'nomination-accepted', 'outreach-sent', 'nominee-accepted', 'interview-sent', 'interview-received'].includes(currentPhase)) {
      updates.phase = 'draft-ready'
    }

    await sb.from('community_submissions').update(updates).eq('id', id)

    return NextResponse.json({ ok: true, draft, length: draft.length })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'AI draft failed' },
      { status: 502 },
    )
  }
}

function formatGuidance(format: string): string {
  switch (format) {
    case 'q-and-a':
      return `Format: Q&A. Open with a 1-2 paragraph intro setting the scene, then render each interview question as a bold header (use **Question** format on its own line) followed by the answer on the next line. Edit the answers lightly for clarity but keep the voice. Skip questions where the answer is empty.`
    case 'profile':
      return `Format: Narrative profile. A flowing 4-6 paragraph feature that weaves the nominator's pitch with the nominee's own words. Pull 1-2 of the nominee's most vivid lines into quotes. Build to an ending that captures who they are.`
    case 'write-up':
      return `Format: Sports/event-style write-up. Lead with the moment or stat. Then context. Then coach/player quotes (use their interview answers). End with what's next.`
    case 'news-brief':
      return `Format: Short news brief. Lead paragraph answers who/what/when/where. Second paragraph adds why-it-matters context. 150-250 words total.`
    case 'photo-caption':
      return `Format: Photo caption. 1-2 sentences. Name the person, the moment, and one detail that earns the photo's place.`
    case 'roundup':
      return `Format: Roundup with intro. Open with a 1-paragraph intro that frames the list, then enumerated entries (one paragraph each) for each item. End with a CTA inviting reader nominations.`
    default:
      return ''
  }
}
