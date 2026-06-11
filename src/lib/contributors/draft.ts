// Generate an AI article draft from a contributor's Q&A response.
//
// Calls runAI() with taskKind='qa' so it picks up the configured default
// model (Sonnet 4.6 by default — best balance of voice quality + cost).
// Reads the per-brand voice from brand_voice (migration 154) so each brand
// keeps its own tone. Returns a structured object the editor UI can render
// and one-click publish to guide_articles.

import { runAI } from '@/lib/ai/client'
import { loadBrand, buildBrandPromptFragment } from '@/lib/brands'

export interface QAQuestion {
  key:          string
  label:        string
  placeholder?: string
  required?:    boolean
}

export interface DraftInput {
  brandSlug:        string
  templateName:    string
  targetColumn?:   string | null
  contributorName: string
  contributorBio?: string | null
  expertiseTags?:  string[]
  ask?:            string | null
  questions:       QAQuestion[]
  responses:       Record<string, string>
  draftingBrief?:  string | null
  adminId?:        string | null
}

export interface DraftArticle {
  /** A short headline option in title case. */
  headline:        string
  /** Two alternate headline options for the editor to choose between. */
  alternates:      string[]
  /** A magazine-style deck (1-2 sentence subhead). */
  deck:            string
  /** Article body, in plain prose with paragraph breaks. */
  body:            string
  /** Suggested topic tags (lower-kebab-case). */
  tagSuggestions:  string[]
  /** Suggested pull-quote (~25 words, in the contributor's voice). */
  pullQuote:       string
  /** AI commentary on what it flagged for editorial review. */
  reviewerNotes:   string
}

function buildPrompt(input: DraftInput, brandFragment: string): string {
  const responsesBlock = input.questions.map(q => {
    const a = input.responses[q.key] ?? ''
    if (!a.trim()) return null
    return `## ${q.label}\n${a.trim()}`
  }).filter(Boolean).join('\n\n')

  const expertise = (input.expertiseTags ?? []).length > 0
    ? `Expertise tags: ${input.expertiseTags!.join(', ')}.`
    : ''

  return [
    `## BRAND CONTEXT`,
    brandFragment,
    '',
    `## COMMISSION`,
    input.targetColumn ? `Target column / section: ${input.targetColumn}.` : '',
    input.draftingBrief ? `Template drafting brief: ${input.draftingBrief}` : '',
    `Contributor: ${input.contributorName}${input.contributorBio ? ` — ${input.contributorBio}` : ''}.`,
    expertise,
    input.ask ? `What the editorial team asked for:\n${input.ask}` : '',
    '',
    `## CONTRIBUTOR'S RESPONSES\n${responsesBlock}`,
    '',
    `## OUTPUT`,
    `Return STRICT JSON matching this shape exactly:`,
    `{`,
    `  "headline":      "string — primary headline, title case",`,
    `  "alternates":    ["string", "string"],`,
    `  "deck":          "string — 1-2 sentence subhead",`,
    `  "body":          "string — article body, paragraph breaks as \\n\\n",`,
    `  "tagSuggestions":["lower-kebab-case", "lower-kebab-case"],`,
    `  "pullQuote":     "string — ~25 words from the contributor's perspective",`,
    `  "reviewerNotes": "string — what you flagged for the editor's attention"`,
    `}`,
    'Use the contributor\'s voice authentically + the brand\'s voice rules. Do NOT fabricate facts not present in the responses. Output JSON only — no markdown wrapper, no commentary outside the object.',
  ].filter(Boolean).join('\n')
}

export async function generateContributorDraft(input: DraftInput): Promise<DraftArticle> {
  const brand = await loadBrand(input.brandSlug)
  const brandFragment = brand
    ? buildBrandPromptFragment(brand)
    : `Brand: ${input.brandSlug.toUpperCase()} (no voice rules configured)`
  const prompt = buildPrompt(input, brandFragment)
  const response = await runAI({
    taskKind: 'qa',
    caller:   'contributor.qa.draft',
    systemPrompt: 'You are an editorial assistant for a hyperlocal media publisher. You draft magazine-quality articles from contributor Q&A responses, matching the brand voice you are given. Your output is JSON only.',
    messages: [{ role: 'user', content: prompt }],
    maxTokens: 1800,
    adminId:  input.adminId ?? null,
  })

  // Trim possible markdown wrapping defensively.
  let raw = response.text.trim()
  if (raw.startsWith('```')) {
    raw = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
  }
  const parsed = JSON.parse(raw) as DraftArticle
  return parsed
}
