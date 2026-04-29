import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function generateSocialCaption(
  title: string,
  department: string,
  publication: 'RRP' | 'RRB',
  notes?: string | null,
): Promise<string> {
  const pubCtx = publication === 'RRB'
    ? 'River Region Boom — a sophisticated magazine for Montgomery-area adults 50+'
    : 'River Region Parents — a community magazine for Montgomery-area families'

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 250,
    messages: [{
      role: 'user',
      content: `Write a short, engaging social media post for ${pubCtx}.

Content piece: "${title}"
Department: ${department}
${notes ? `Notes: ${notes}` : ''}

Write 2-3 warm, authentic sentences that will resonate with the audience. Add 2-3 relevant hashtags at the end. Under 280 characters total. No quotation marks around the post itself.`,
    }],
  })

  return msg.content[0].type === 'text' ? msg.content[0].text.trim() : ''
}

export async function generateFeatureArticle(
  formType: string,
  formData: Record<string, string>,
  publication: 'RRP' | 'RRB' = 'RRB',
  wordCount = 400,
): Promise<string> {
  const pubCtx = publication === 'RRB'
    ? 'River Region Boom — a sophisticated monthly magazine for adults 50+ in Montgomery, Alabama'
    : 'River Region Parents — a community magazine for families in Montgomery, Alabama'

  const dataBlock = Object.entries(formData)
    .filter(([, v]) => v?.trim())
    .map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`)
    .join('\n')

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: `You are a feature writer for ${pubCtx}.

Write a warm, genuine ${wordCount}-word feature article for the "${formType}" section, based on these reader submissions:

${dataBlock}

Guidelines:
- Warm, celebratory voice that honors lived experience
- Use direct quotes from the answers where appropriate
- Use the person's first name after first introduction
- Short paragraphs (2–3 sentences) for readability
- End with a brief, resonant observation about the broader theme
- No byline, no headline — article body only
- Avoid "journey", "amazing", "incredible" — be specific and genuine`,
    }],
  })

  return msg.content[0].type === 'text' ? msg.content[0].text.trim() : ''
}

export async function generateAnniversarySocialPost(
  person1: string,
  person2: string,
  years: number,
  message: string,
): Promise<string> {
  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 250,
    messages: [{
      role: 'user',
      content: `Write a warm, celebratory social media post for River Region Boom congratulating a couple on their anniversary.

Couple: ${person1} & ${person2}
Years together: ${years}
Their message: "${message}"

Write 2-3 heartfelt sentences. Include relevant hashtags. Keep it under 280 characters. No quotation marks around the post.`,
    }],
  })

  return msg.content[0].type === 'text' ? msg.content[0].text.trim() : ''
}
