// ── AI-powered event extractor ────────────────────────────────────────────────
// Takes a URL or pasted text and uses Claude to extract structured events.
// All extracted events MUST go to pending review — never auto-publish.
//
// Designed for sources without iCal feeds (MPAC, WSFA, funinmontgomery,
// Facebook events). The operator pastes a URL or text into the admin extract
// page; Claude returns a structured JSON array of events; operator reviews
// each one before saving to the calendar.

import Anthropic from '@anthropic-ai/sdk'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ExtractedEvent {
  title:            string
  description:      string | null
  start_date:       string         // YYYY-MM-DD (Central time assumed)
  end_date:         string | null  // YYYY-MM-DD, optional
  start_time:       string | null  // "4:00 PM" 12-hour, or null for all-day
  end_time:         string | null
  location_name:    string | null  // Venue (e.g. "Montgomery Zoo")
  address:          string | null  // Street + city + state
  city:             string | null  // City name only
  is_free:          boolean | null
  cost_text:        string | null  // "$10 / Free / $5 kids"
  age_range:        string | null  // "All ages / 8+ / Adults"
  registration_url: string | null
  organizer_name:   string | null
  source_url:       string | null  // Event page URL if known
  confidence_notes: string | null  // Anything Claude is unsure about
}

export interface ExtractionResult {
  events:        ExtractedEvent[]
  source_url:    string | null
  source_text_excerpt: string | null
  model_notes:   string | null
  errors:        string[]
}

// ── Schema for Claude's structured output ────────────────────────────────────

const EVENT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['events', 'model_notes'],
  properties: {
    model_notes: {
      type: 'string',
      description:
        'Short summary of what was found (or why nothing was found). Mention low-confidence guesses.',
    },
    events: {
      type: 'array',
      description: 'One entry per distinct event found.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'title', 'description', 'start_date', 'end_date',
          'start_time', 'end_time', 'location_name', 'address', 'city',
          'is_free', 'cost_text', 'age_range', 'registration_url',
          'organizer_name', 'source_url', 'confidence_notes',
        ],
        properties: {
          title:            { type: ['string'], description: 'Event title' },
          description:      { type: ['string', 'null'], description: 'Plain-text description of the event' },
          start_date:       { type: 'string', description: 'YYYY-MM-DD. Assume Central time. If the source omits a year, infer the next future occurrence.' },
          end_date:         { type: ['string', 'null'], description: 'YYYY-MM-DD if a multi-day event; otherwise null' },
          start_time:       { type: ['string', 'null'], description: 'Like "4:00 PM" (12-hour); null for all-day events' },
          end_time:         { type: ['string', 'null'], description: 'Like "6:30 PM"; null if unknown' },
          location_name:    { type: ['string', 'null'], description: 'Venue name, e.g. "Montgomery Zoo"' },
          address:          { type: ['string', 'null'], description: 'Street + city + state if available' },
          city:             { type: ['string', 'null'], description: 'City name only' },
          is_free:          { type: ['boolean', 'null'], description: 'true if explicitly free; null if unclear' },
          cost_text:        { type: ['string', 'null'], description: 'Cost text like "$10 / $5 kids" — null if free or unknown' },
          age_range:        { type: ['string', 'null'], description: 'Like "All ages / 8+ / Adults" — null if unclear' },
          registration_url: { type: ['string', 'null'], description: 'Direct link to register or buy tickets' },
          organizer_name:   { type: ['string', 'null'], description: 'Hosting organization' },
          source_url:       { type: ['string', 'null'], description: 'URL of the event detail page if available' },
          confidence_notes: { type: ['string', 'null'], description: 'Anything you had to guess at, OR a one-line confidence summary' },
        },
      },
    },
  },
} as const

// ── Fetch a URL's text content ────────────────────────────────────────────────

async function fetchPageText(url: string): Promise<{ text: string; content_type: string }> {
  const res = await fetch(url, {
    method:   'GET',
    redirect: 'follow',
    headers:  {
      'Accept':     'text/html, text/plain, */*',
      'User-Agent': 'KeepSharing-Calendar-Extractor/1.0',
    },
  })
  if (!res.ok) {
    throw new Error(`Source URL returned HTTP ${res.status}`)
  }
  const text = await res.text()
  const content_type = res.headers.get('content-type') ?? 'text/html'

  // Strip <script> / <style> / inline JS/CSS blobs to reduce token cost.
  // Convert remaining HTML to a lightly-cleaned text representation. The
  // extractor doesn't need perfect markup — Claude is robust to messy input.
  const cleaned = text
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()

  return { text: cleaned, content_type }
}

// ── Main extractor ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an event-extraction assistant for a family-focused community calendar
(River Region Parents — Montgomery, AL area). You receive raw page text or pasted
text from an event source and return structured event data as JSON.

Rules:
1. Only extract events that look like real, scheduled events with a date and a title.
2. Skip navigation, marketing copy, recurring "we host classes" boilerplate without specific dates,
   and obvious noise.
3. Assume Central time. If a year is missing, infer the next future occurrence relative to today.
4. Prefer the venue's primary name for location_name; put the full address in address.
5. Use confidence_notes to flag anything uncertain: ambiguous dates, missing times, etc.
6. Cap output at the 20 most relevant events.
7. If no events are found, return an empty events array and explain why in model_notes.
8. Do not invent details. Better to leave a field null than guess.`

export async function extractEventsFromUrl(url: string): Promise<ExtractionResult> {
  const errors: string[] = []
  let pageText = ''
  try {
    const fetched = await fetchPageText(url)
    pageText = fetched.text.slice(0, 50_000)  // cap to keep prompt budget reasonable
  } catch (e) {
    errors.push(`Fetch failed: ${e instanceof Error ? e.message : String(e)}`)
    return { events: [], source_url: url, source_text_excerpt: null, model_notes: null, errors }
  }
  return runExtraction(pageText, { source_url: url })
}

export async function extractEventsFromText(text: string): Promise<ExtractionResult> {
  return runExtraction(text.slice(0, 50_000), { source_url: null })
}

async function runExtraction(
  text: string,
  meta: { source_url: string | null },
): Promise<ExtractionResult> {
  const errors: string[] = []
  if (!text.trim()) {
    errors.push('No content to extract from.')
    return { events: [], source_url: meta.source_url, source_text_excerpt: null, model_notes: null, errors }
  }

  const today = new Date().toISOString().split('T')[0]
  const userPrompt = [
    meta.source_url ? `Source URL: ${meta.source_url}` : 'Source: pasted text',
    `Today's date: ${today} (use this to infer missing years)`,
    '',
    '--- BEGIN PAGE TEXT ---',
    text,
    '--- END PAGE TEXT ---',
  ].join('\n')

  const client = new Anthropic()

  try {
    const response = await client.messages.create({
      model:      'claude-opus-4-7',
      max_tokens: 16000,
      thinking:   { type: 'adaptive' },
      output_config: {
        format: { type: 'json_schema', schema: EVENT_SCHEMA as unknown as Record<string, unknown> },
      },
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    })

    // The structured-output schema is enforced — pull the first text block and parse.
    const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text')
    if (!textBlock) {
      errors.push('Claude returned no text block.')
      return { events: [], source_url: meta.source_url, source_text_excerpt: text.slice(0, 500), model_notes: null, errors }
    }

    let parsed: { events: ExtractedEvent[]; model_notes: string }
    try {
      parsed = JSON.parse(textBlock.text)
    } catch (e) {
      errors.push(`Failed to parse model output as JSON: ${e instanceof Error ? e.message : String(e)}`)
      return { events: [], source_url: meta.source_url, source_text_excerpt: text.slice(0, 500), model_notes: textBlock.text.slice(0, 500), errors }
    }

    return {
      events:              parsed.events ?? [],
      source_url:          meta.source_url,
      source_text_excerpt: text.slice(0, 500),
      model_notes:         parsed.model_notes ?? null,
      errors,
    }
  } catch (e) {
    if (e instanceof Anthropic.APIError) {
      errors.push(`Claude API error (${e.status}): ${e.message}`)
    } else {
      errors.push(`Extraction failed: ${e instanceof Error ? e.message : String(e)}`)
    }
    return { events: [], source_url: meta.source_url, source_text_excerpt: text.slice(0, 500), model_notes: null, errors }
  }
}
