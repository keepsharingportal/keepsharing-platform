import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  )
}

export async function reviewSubmission(submissionId: string): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.log('[ai-review] ANTHROPIC_API_KEY not configured — skipping AI review for', submissionId)
    return
  }

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

  const client = new Anthropic({ apiKey })

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
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const parsed = JSON.parse(text.trim())

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
