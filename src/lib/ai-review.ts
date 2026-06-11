// Submission auto-review — routed through the central AI client wrapper.
//
// Previously called Anthropic directly via the SDK and read ANTHROPIC_API_KEY
// from env. Now flows through src/lib/ai/client.ts so usage shows up in the
// dashboard, the monthly budget cap applies, and the task model can be
// swapped per-task in /admin/integrations/ai.

import { createClient } from '@supabase/supabase-js'
import { runAI } from '@/lib/ai/client'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  )
}

export async function reviewSubmission(submissionId: string): Promise<void> {
  const supabase = supabaseAdmin()
  const { data: submission } = await supabase
    .from('reader_submissions')
    .select('*')
    .eq('id', submissionId)
    .single()

  if (!submission) {
    console.error('[ai-review] submission not found:', submissionId)
    return
  }

  const prompt = `You are reviewing a submission to River Region Parents' Mom Insiders content engine. The submitter is a local mom sharing her favorite places in the River Region (Montgomery, Prattville, Wetumpka, Pike Road, Millbrook, Eastchase, Alabama).

Score this submission 1-5 on:
- Specificity: Does it name a real place with real detail? (1 = vague, 5 = very specific)
- Quotability: Would another mom read this and want to try it? (1 = boring, 5 = compelling)
- Authenticity: Does it sound like a real local mom, or generic? (1 = generic, 5 = authentic voice)

Average those three for the overall score (use one decimal place).

Then extract:
- The single most quotable sentence or phrase (verbatim from the submission, max 200 chars)
- Suggested topic tags from this list: kid-friendly-restaurant, saturday-morning, hidden-gem, newcomer-must-know, school-choice, pediatric-care, outdoor-activities, family-tradition, date-night, birthday-party, sports-activities, community-connection
- Suggested listing attachment: if they mention a specific business by name, return that business name; otherwise null
- Suggested article attachment slug: if the topic matches one of these article slugs, return it; otherwise null
  - your-first-30-days-in-the-river-region
  - choosing-the-right-school-district
  - establishing-pediatric-care
  - where-to-find-your-people
  - where-locals-take-their-kids-on-saturday

Return ONLY valid JSON with no markdown formatting:
{
  "score": 1.0,
  "quote": "verbatim quote here",
  "topic_tags": ["tag1", "tag2"],
  "suggested_listing": "Business Name or null",
  "suggested_article": "article-slug or null"
}

Submission to review (responses JSON):
${JSON.stringify(submission.submission_responses, null, 2)}`

  try {
    const response = await runAI({
      taskKind: 'classification',
      caller:   'ai-review.submission',
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 600,
    })
    const parsed = JSON.parse(response.text.trim())

    await supabase.from('reader_submissions').update({
      ai_score:                      parsed.score ?? null,
      ai_extracted_quote:            parsed.quote ?? null,
      ai_suggested_topic_tags:       parsed.topic_tags ?? [],
      ai_suggested_listing_attachment: null, // resolved by admin
      ai_suggested_article_attachment: parsed.suggested_article ?? null,
    }).eq('id', submissionId)

    console.log('[ai-review] scored submission', submissionId, '→', parsed.score)
  } catch (e) {
    console.error('[ai-review] error reviewing submission:', e)
  }
}
