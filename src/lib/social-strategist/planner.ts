// ── Strategist: weekly plan generator ─────────────────────────────
//
// Generates one social_plan + 25-30 social_plan_slot rows for a brand
// for the upcoming Mon-Sun week. Architecture:
//
//   1. Gather candidates from the content pool
//   2. Deterministic pre-score → top 60 shortlist
//   3. Pull performance summary (Phase 4 fills this; until then = baseline)
//   4. Ask Claude to compose the week:
//        - Pick which candidates fill which slots
//        - Write FB + IG captions per slot in brand voice
//        - Honor variety / slot-fit / editorial judgment
//   5. Persist plan + slots; editor approves in the hub UI

import type { SupabaseClient } from '@supabase/supabase-js'
import { runAI } from '@/lib/ai/client'
import { gatherCandidates, type Candidate } from './candidates'
import { shortlist, type PerformanceSummary } from './scorer'
import { loadBrandProfile } from '@/lib/seo/brand-profile'

const SLOTS = ['morning', 'midday', 'afternoon', 'evening'] as const
type Slot = typeof SLOTS[number]

const SLOT_TIME: Record<Slot, [number, number]> = {
  morning:   [8,  0],   // 08:00 local
  midday:    [12, 30],  // 12:30
  afternoon: [16, 30],  // 16:30
  evening:   [19, 30],  // 19:30
}

const SLOT_PERSONALITY: Record<Slot, string> = {
  morning:   'light/energetic — set the day; favor practical tips, school bits, upbeat events',
  midday:    'practical/useful — direct value; favor how-tos, articles, event reminders',
  afternoon: 'discovery/share — community resources, spotlights, new finds',
  evening:   'tender/family — connection-focused; quotes, family moments, reflections',
}

export interface PlannerInput {
  brandSlug:   string
  weekStart:   string                // ISO date (YYYY-MM-DD) of Monday
  slotsPerDay: number                // 3-5; default 4
}

export interface PlannerResult {
  planId:      string
  slotCount:   number
  candidatesConsidered: number
  warnings:    string[]
}

interface ClaudePlanSlot {
  day_of_week:  number               // 0=Mon..6=Sun
  slot:         Slot
  source_kind:  Candidate['sourceKind']
  source_id:    string
  fb_caption:   string
  ig_caption:   string
  tone:         string
  rationale?:   string               // why this fits; for debugging only
}

async function loadPerformanceSummary(sb: SupabaseClient, brandSlug: string): Promise<PerformanceSummary> {
  const { data } = await sb
    .from('social_performance')
    .select('source_kind, tone, engagement_rate')
    .eq('brand_slug', brandSlug)
    .gte('posted_at', new Date(Date.now() - 60 * 86400_000).toISOString())
  const buckets: Record<string, number[]> = {}
  for (const r of (data ?? []) as Array<{ source_kind: string; tone: string | null; engagement_rate: number }>) {
    const k = `${r.source_kind}:${r.tone ?? 'any'}`
    ;(buckets[k] ??= []).push(Number(r.engagement_rate))
  }
  const byKindTone: Record<string, number> = {}
  const allMeans: number[] = []
  for (const k of Object.keys(buckets)) {
    const m = buckets[k].reduce((a, b) => a + b, 0) / buckets[k].length
    byKindTone[k] = m
    allMeans.push(m)
  }
  // Normalize so 1.0 = best in brand, 0.5 = average, 0.0 = worst.
  const max = Math.max(...allMeans, 0.0001)
  for (const k of Object.keys(byKindTone)) byKindTone[k] = byKindTone[k] / max
  return { byKindTone }
}

function isoForSlot(weekStart: string, dayIndex: number, slot: Slot): string {
  const [h, m] = SLOT_TIME[slot]
  const d = new Date(`${weekStart}T00:00:00`)
  d.setDate(d.getDate() + dayIndex)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

export async function generateWeeklyPlan(
  sb:    SupabaseClient,
  input: PlannerInput,
): Promise<PlannerResult> {
  const warnings: string[] = []
  const slotsPerDay = Math.max(3, Math.min(6, input.slotsPerDay ?? 4))
  const targetSlots = slotsPerDay * 7

  // 1. Gather candidates
  const candidates = await gatherCandidates(sb, input.brandSlug)
  if (candidates.length === 0) {
    throw new Error(`No candidates found for brand ${input.brandSlug}. Pool is empty — publish articles, add school bits, or seed the quote bank.`)
  }

  // 2. Pre-score → shortlist
  const perf = await loadPerformanceSummary(sb, input.brandSlug)
  const ranked = shortlist(candidates, perf, Math.max(60, targetSlots * 2))
  if (ranked.length < targetSlots) {
    warnings.push(`Only ${ranked.length} viable candidates for ${targetSlots} slots — plan will be short. Add more pool items.`)
  }

  // 3. Brand voice
  const voice = await loadBrandProfile(sb, input.brandSlug)
  const voiceProfile = voice?.socialVoiceProfile ?? ''

  // 4. Ask Claude to compose the week
  const candidateBlock = ranked.map((c, i) => {
    const ago = c.publishedAt
      ? `${Math.round((Date.now() - new Date(c.publishedAt).getTime()) / 86400_000)}d ago`
      : c.anchorDate
        ? `event in ${Math.round((new Date(c.anchorDate).getTime() - Date.now()) / 86400_000)}d`
        : 'evergreen'
    const used = c.lastUsedAt
      ? `last shared ${Math.round((Date.now() - new Date(c.lastUsedAt).getTime()) / 86400_000)}d ago`
      : 'never shared'
    return `[${i}] (${c.sourceKind}, score ${c.score}, ${ago}, ${used}${c.toneHint ? `, tone=${c.toneHint}` : ''})
  id: ${c.sourceId}
  title: ${c.title}
  preview: ${c.preview.slice(0, 220)}
  image: ${c.imageUrl ? 'YES' : 'NO'}
  author: ${c.authorName ?? '-'}`
  }).join('\n\n')

  const slotsBlock = SLOTS.map(s => `  - ${s}: ${SLOT_PERSONALITY[s]}`).join('\n')

  const systemPrompt = `You are the AI Social Media Manager for a local family publication.

${voiceProfile ? `BRAND VOICE PROFILE (follow verbatim):
────────────────────────────────────────
${voiceProfile}
────────────────────────────────────────
` : ''}

JOB:
Compose the next 7 days of social posts (Monday=0 .. Sunday=6) from the candidate pool below.
Pick ${slotsPerDay} posts per day, ${targetSlots} total. Honor:

- VARIETY: don't post 2 of the same source_kind back-to-back in the same day. Mix articles, school bits, events, quotes, spotlights, videos.
- SLOT FIT: each slot has a personality. Pick content that matches:
${slotsBlock}
- TIMELINESS: if an event is in the candidate list, prefer scheduling it 2-3 days before the event date. Don't post about an event after it happens.
- RECENCY: brand-new articles (published <7d ago) should appear early in the week. Older evergreen content can go anywhere.
- NO DUPES: don't use the same candidate twice in this week.
- FRESH ANGLE ON RECYCLE: if a candidate was shared recently, write the new caption from a different angle than what someone would assume the first share said.

CAPTION STYLE (per platform):
- Facebook caption (fb_caption): 40-60 words. First 60 chars must stop the scroll. Conversational. End with a soft question OR a "here's what we found" line. NO URL pasted (the link preview card handles it). 1-3 emojis where they add meaning.
- Instagram caption (ig_caption): 80-120 words. First line is what shows before "...more" — make it strong. NO URL (IG strips them). Reference "link in bio" once near the end. End with 5-10 niche locality hashtags (e.g. #riverregionparents #montgomerymoms).
- Tone: choose from supportive | celebratory | funny | inspiring | practical | tender — pick what fits the content.

OUTPUT FORMAT — raw JSON array only, no prose, no code fences:
[
  {
    "day_of_week": 0,
    "slot": "morning",
    "source_kind": "article",
    "source_id": "uuid-from-pool",
    "fb_caption": "...",
    "ig_caption": "...",
    "tone": "supportive",
    "rationale": "one sentence — why this fits this slot"
  },
  ...
]`

  const userPrompt = `BRAND: ${input.brandSlug}
WEEK STARTING: ${input.weekStart} (Monday)
SLOTS PER DAY: ${slotsPerDay}
TOTAL SLOTS TO FILL: ${targetSlots}

CANDIDATE POOL (already pre-scored; higher score = stronger candidate):
${candidateBlock}

Compose the week. Output raw JSON array only.`

  const res = await runAI({
    caller:       'social-strategist',
    taskKind:     'drafting',
    systemPrompt,
    messages:     [{ role: 'user', content: userPrompt }],
    maxTokens:    16000,
  })

  const raw = res.text.trim().replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
  let parsed: ClaudePlanSlot[]
  try {
    parsed = JSON.parse(raw) as ClaudePlanSlot[]
  } catch (e) {
    throw new Error(`Strategist returned invalid JSON: ${e instanceof Error ? e.message : String(e)}`)
  }
  if (!Array.isArray(parsed)) throw new Error('Strategist did not return an array')

  // Validate + drop slots whose source_id isn't in the shortlist (model hallucinations)
  const candidateById = new Map(ranked.map(c => [c.sourceId, c]))
  const accepted: ClaudePlanSlot[] = []
  for (const s of parsed) {
    if (!candidateById.has(s.source_id)) {
      warnings.push(`Dropped slot day=${s.day_of_week} slot=${s.slot} — source_id not in shortlist (hallucination?)`)
      continue
    }
    if (s.day_of_week < 0 || s.day_of_week > 6) continue
    if (!SLOTS.includes(s.slot)) continue
    accepted.push(s)
  }

  // 5. Persist plan + slots (transactional via two inserts — Supabase RPC if we
  //    ever need real txs, but for this we can live with non-atomic).
  const { data: planRow, error: planErr } = await sb
    .from('social_plan')
    .upsert({
      brand_slug:   input.brandSlug,
      week_start:   input.weekStart,
      status:       'draft',
      generated_at: new Date().toISOString(),
    }, { onConflict: 'brand_slug,week_start' })
    .select('id')
    .single()
  if (planErr || !planRow) throw new Error(`plan insert failed: ${planErr?.message ?? 'no row'}`)
  const planId = (planRow as { id: string }).id

  // Wipe any previous draft slots so re-running the strategist replaces them.
  await sb.from('social_plan_slot').delete().eq('plan_id', planId)

  const slotInserts = accepted.map(s => {
    const c = candidateById.get(s.source_id)!
    return {
      plan_id:       planId,
      day_of_week:   s.day_of_week,
      slot:          s.slot,
      scheduled_for: isoForSlot(input.weekStart, s.day_of_week, s.slot),
      source_kind:   s.source_kind,
      source_id:     s.source_id,
      platforms:     ['facebook', 'instagram'],
      fb_caption:    s.fb_caption,
      ig_caption:    s.ig_caption,
      image_url:     c.imageUrl,
      tone:          s.tone,
      status:        'pending',
    }
  })
  if (slotInserts.length > 0) {
    const { error: slotErr } = await sb.from('social_plan_slot').insert(slotInserts)
    if (slotErr) throw new Error(`slot insert failed: ${slotErr.message}`)
  }

  return {
    planId,
    slotCount:            accepted.length,
    candidatesConsidered: ranked.length,
    warnings,
  }
}

/** Monday-of-this-week (ISO date, YYYY-MM-DD), for cron callers. */
export function mondayOf(d: Date): string {
  const day = d.getDay()              // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day
  const m = new Date(d)
  m.setDate(m.getDate() + diff)
  m.setHours(0, 0, 0, 0)
  return m.toISOString().slice(0, 10)
}

/** Monday-of-NEXT-week — what the Sunday cron generates for. */
export function nextMonday(d: Date): string {
  const m = new Date(mondayOf(d) + 'T00:00:00')
  m.setDate(m.getDate() + 7)
  return m.toISOString().slice(0, 10)
}
