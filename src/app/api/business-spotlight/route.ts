import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? '',
})

interface SpotlightBody {
  info: { businessName: string; contactName: string; email: string; phone: string; website?: string }
  answers: Record<string, string>
}

const QUESTION_LABELS = [
  'What the business does and who they serve',
  'What makes them different',
  'How long in business and how it started',
  'Connection to Montgomery families',
  'What parents should know',
  'Current specials or promotions',
  'A success story or testimonial',
  'How to get in touch',
]

export async function POST(req: NextRequest) {
  try {
    const { info, answers } = await req.json() as SpotlightBody

    // Build the Q&A context for Claude
    const qaText = QUESTION_LABELS.map((label, i) => {
      const key = `q${i + 1}`
      const ans = answers[key]?.trim()
      return ans ? `**${label}:** ${ans}` : null
    }).filter(Boolean).join('\n\n')

    const prompt = `You are a warm, professional editorial writer for River Region Parents, a hyperlocal family magazine in Montgomery, Alabama. Write a 400-word business spotlight article about ${info.businessName}.

Use the following information the business owner provided:

${qaText}

Guidelines:
- Write in a warm, engaging editorial style appropriate for a family magazine
- Write in third-person (refer to the business and owner by name)
- Lead with something compelling about what makes this business special to local families
- Include a quote if the owner shared one in their answers (format it naturally)
- End with a clear call to action: how families can reach them
- Do NOT include a headline (the editorial team will add one)
- Do NOT use generic filler phrases like "in conclusion" or "in summary"
- Keep it exactly around 400 words — tight, readable, no fluff
- Make it feel local and specific to Montgomery, not generic

Business details:
- Name: ${info.businessName}
- Contact: ${info.contactName}
- Phone: ${info.phone}
- Website: ${info.website || 'not provided'}

Write the article now:`

    const message = await anthropic.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 700,
      messages: [{ role: 'user', content: prompt }],
    })

    const article = message.content[0].type === 'text' ? message.content[0].text : ''

    // Store in Supabase content queue
    try {
      const supabase = await createClient()
      await supabase.from('business_spotlights').insert({
        business_name: info.businessName,
        contact_name:  info.contactName,
        email:         info.email,
        phone:         info.phone,
        website:       info.website ?? null,
        answers:       answers,
        article_draft: article,
        status:        'pending_review',
        publication:   'RRP',
        submitted_at:  new Date().toISOString(),
      })

      // Add to content queue
      await supabase.from('notifications').insert({
        type:    'business_spotlight_submitted',
        title:   `Business Spotlight ready for review — ${info.businessName}`,
        body:    `AI article draft generated · ${info.contactName} · ${info.email}`,
        urgency: 'incoming',
        publication: 'RRP',
        metadata: { businessName: info.businessName, email: info.email },
      })
    } catch { /* DB non-blocking */ }

    return NextResponse.json({ article, success: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Business spotlight API error:', msg)
    return NextResponse.json({ error: msg, article: null }, { status: 500 })
  }
}
