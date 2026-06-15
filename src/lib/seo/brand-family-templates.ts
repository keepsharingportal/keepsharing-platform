// ── Brand family templates — the inheritance backbone ──────────────────
//
// Every brand belongs to a FAMILY. Family-level defaults capture
// everything that's shared across all brands in that family — audience
// archetype, voice DNA, default pillar structure, default negative
// space, content philosophy.
//
// When an editor clicks "Generate first draft" the seed function
// composes: family template + market intel + brand identity → Claude.
// That produces a 90-95% complete profile instead of a generic 60-70%
// one. Editor only tunes local nuances.
//
// Adding a new family is a code change: define the template, plug it
// into the FAMILY_TEMPLATES map, done.
//
// Why code, not DB:
//   - Family-level facts change rarely (audience archetype doesn't
//     shift quarter to quarter)
//   - Code is version-controlled — we can see who changed the audience
//     profile and why
//   - First drafts work without any DB seeding — new brands ship usable

import type { BrandFamily } from '@/lib/markets'

export interface FamilyTemplate {
  family:                 BrandFamily

  /** Audience archetype paragraph for the prompt. Drives every
   *  recommendation's tone + intent matching. */
  audienceArchetype:      string

  /** Voice DNA — one paragraph the AI must internalize. Do's, don'ts,
   *  tone calibration. */
  voiceDna:               string

  /** Default pillar STRUCTURE — categories every brand in this family
   *  should have a version of. Claude tunes the target_keyword to the
   *  local market; the structure stays consistent across the family
   *  so cross-brand work scales later. */
  defaultPillarStructure: Array<{
    title:             string
    description:       string
    /** Example target keyword — Claude rewrites with the local market
     *  baked in. */
    targetKeywordHint: string
    /** Why this pillar exists for this family. Helps Claude reason
     *  about supporting keywords. */
    rationale:         string
  }>

  /** Default negative space — topics this family of publication should
   *  not cover. Editor can add brand-specific exclusions on top. */
  defaultNegativeSpace:   string[]

  /** Default editorial preferences — long-form vs. list, expert vs.
   *  peer, evergreen vs. timely. Shapes every recommendation. */
  defaultEditorialPrefs: {
    formatPreference:    'long-form' | 'list' | 'mixed'
    voicePreference:     'peer' | 'expert' | 'institutional'
    publishingCadence:   string
    evergreenVsTimely:   string
  }

  /** Content philosophy — what wins for THIS audience. One paragraph
   *  Claude reads to calibrate every angle. */
  contentPhilosophy:      string
}

// ── parents family — local family publication, weekly+ cadence ────────

const PARENTS_FAMILY: FamilyTemplate = {
  family: 'parents',

  audienceArchetype: `Primary audience: mothers aged 25-45, peak engagement 30-40. Most are
married or partnered; they are the household decision-maker for
education, healthcare, activities, and family purchases. About 70%
work outside the home (full-time or part-time); 30% are
stay-at-home or work-from-home. They consume content on mobile
during pickup lines, lunch breaks, and post-bedtime windows
(7am, 12pm, 9pm). They research IN ADVANCE — preschool tours,
summer camps, pediatricians, birthday parties — and they trust
peer recommendations over institutional copy. Secondary audience:
fathers, grandparents researching activities for grandkids,
extended family planning visits. Family decision triggers: school
zoning changes, new baby, move to the area, summer/holiday breaks.`,

  voiceDna: `Voice: peer-mom, never preachy, evidence-aware but not academic.
Write as if you're texting a friend who asked for a recommendation —
specific, honest, "here's what worked for us." Use first-person
plural ("our pediatrician", "we found") sparingly to anchor
authenticity without making it a personal blog. AVOID: marketing
fluff, generic parenting clichés ("they grow up so fast"),
condescending tone toward working moms or stay-at-home moms,
medical absolutism (always say "ask your pediatrician"), political
charge. PREFER: concrete examples, named local places, short
paragraphs, scanning-friendly subheads, "here's what to expect"
practicality. Address moms by their decision, not their identity —
"if you're choosing a preschool" beats "as a mom you might..."`,

  defaultPillarStructure: [
    {
      title:             'Education, Schools & Learning',
      description:       'Authoritative coverage of school options + tutoring + enrichment.',
      targetKeywordHint: 'best schools in <city>',
      rationale:         `School quality drives where families live. High commercial intent
                          and high E-E-A-T potential — parents trust local sources over
                          national rankings.`,
    },
    {
      title:             'Local Family Adventures & Day Trips',
      description:       'Where to go this weekend — parks, festivals, museums, day trips.',
      targetKeywordHint: 'things to do with kids in <city>',
      rationale:         `Highest-volume long-tail keyword family in the parenting space.
                          Recurring search intent (every weekend, every season). Strong
                          internal linking opportunity.`,
    },
    {
      title:             'Parenting, Child Development & Family Wellness',
      description:       'Practical, locally-anchored parenting guidance + health.',
      targetKeywordHint: 'parenting tips <city>',
      rationale:         `Trust-builder + E-E-A-T anchor. Pair generic parenting concepts
                          with local providers (pediatricians, specialists, programs).`,
    },
    {
      title:             'Summer Camps, After-School Programs & Enrichment',
      description:       'Seasonal authority on camps, sports, arts, and after-school care.',
      targetKeywordHint: '<city> summer camps',
      rationale:         `Massive Jan-Apr search spike. Decision-makers researching for
                          summer. Direct sponsor revenue opportunity.`,
    },
    {
      title:             'Newcomer & Relocation Resources',
      description:       'The "we just moved here" guide — schools, neighborhoods, doctors.',
      targetKeywordHint: 'moving to <city> with family',
      rationale:         `Captures high-intent searchers BEFORE they're a regular reader.
                          One excellent relocation guide = years of organic traffic.`,
    },
    {
      title:             'Community Voices, Spotlights & Human Interest',
      description:       'Local people stories — teachers, business owners, families.',
      targetKeywordHint: '<city> family stories',
      rationale:         `Differentiator from generic parenting blogs. Drives community
                          trust + advertiser relationships + social shares.`,
    },
  ],

  defaultNegativeSpace: [
    'Hot-button national political topics (abortion, gun policy, immigration policy)',
    'Religious doctrine debates',
    'Generic parenting clickbait ("10 things you didn\'t know about toddlers")',
    'Anti-vaccine or alternative-medicine advocacy',
    'Adult-oriented entertainment / nightlife unless family-friendly framing',
    'Negative reviews of named local businesses (we lift up, we don\'t tear down)',
  ],

  defaultEditorialPrefs: {
    formatPreference:    'mixed',
    voicePreference:     'peer',
    publishingCadence:   '2-4 articles per week, with seasonal spikes around school transitions + holidays',
    evergreenVsTimely:   'Balance — evergreen pillars + monthly timely (events, seasonal guides). Aim 60% evergreen / 40% timely.',
  },

  contentPhilosophy: `For local family publishers, locality wins over breadth. A
mediocre "best pediatricians" guide written for the named city
beats a polished national listicle. Hyper-specific named-place
content (named schools, named parks, named events) builds local
authority Google rewards. Every pillar should be answerable in
the form "the best/most/where to/how to <something> in <our
specific market>." Bias every recommendation toward the local
specifics, not generic parenting advice that any blog could write.`,
}

// ── fifty-plus family — completely different audience, voice, pillars ─

const FIFTY_PLUS_FAMILY: FamilyTemplate = {
  family: 'fifty-plus',

  audienceArchetype: `Primary audience: adults aged 50-75+, split roughly evenly between
ages 50-65 (still-working, near-retirement, sandwich-generation
caring for aging parents AND adult children) and 65+ (retired,
fixed-income or near-it, grandparent role active). Decision drivers
vary widely by age: 50-60s focus on retirement planning, downsizing,
adult-child relationships, parents' care; 60-75+ focus on healthcare,
social engagement, travel, grandchildren, scams + safety. Many use
larger text, prefer simpler page layouts, scan slower. Heavy email +
print readers, lighter social media (Facebook over Instagram). They
deeply distrust condescending content — they are sharp, experienced,
and resent being talked down to. They trust source authority more
than younger demographics (named doctors, named institutions,
attribution matters).`,

  voiceDna: `Voice: respectful peer, never condescending, never assume diminished
capacity. Write as if to a smart 65-year-old who happens to be busy,
not someone who needs everything explained slowly. AVOID: "as we
age" framing (yes, we know, get to the point), "senior" labels
(many readers reject the label), tech-condescension ("don't worry,
it's easy"), youth-aspirational language (we're not trying to look
30), medical advice without source attribution. PREFER: clear
practical guidance, named experts and institutions, scannable
formatting (larger headings + shorter paragraphs HELP without
infantilizing), respect for accumulated wisdom + experience.
Address readers by their decision or situation, not their age —
"when planning a downsize" beats "as a senior..."`,

  defaultPillarStructure: [
    {
      title:             'Healthcare, Wellness & Aging Well',
      description:       'Local healthcare options, specialists, wellness programs, and care navigation.',
      targetKeywordHint: 'best doctors for seniors in <city>',
      rationale:         `Highest intent + highest E-E-A-T opportunity. Named providers,
                          named hospitals, source attribution — readers reward depth here.`,
    },
    {
      title:             'Grandparenting & Family Connection',
      description:       'Activities, advice, and resources for the grandparent role.',
      targetKeywordHint: 'things to do with grandkids in <city>',
      rationale:         `Major emotional + practical search territory. Bridges to
                          family-oriented advertisers.`,
    },
    {
      title:             'Retirement Living & Downsizing',
      description:       'Where to live, how to plan, financial + lifestyle decisions.',
      targetKeywordHint: 'best retirement communities <city>',
      rationale:         `High-stakes, multi-touch decision journey. Authoritative content
                          captures long research cycles.`,
    },
    {
      title:             'Local Activities, Day Trips & Social Engagement',
      description:       'Where to go, what to do, how to stay active and connected.',
      targetKeywordHint: 'things to do over 50 in <city>',
      rationale:         `Combats isolation, drives advertiser interest, recurring
                          search intent.`,
    },
    {
      title:             'Money, Estate & Practical Planning',
      description:       'Financial planning, estate basics, scam awareness, Medicare navigation.',
      targetKeywordHint: 'estate planning <city>',
      rationale:         `Trust-builder + protects audience from real harm (scams).
                          E-E-A-T weight is enormous.`,
    },
    {
      title:             'Community Voices & Local Spotlights',
      description:       'Profiles of locally significant 50+ figures, businesses, and stories.',
      targetKeywordHint: '<city> 50+ community stories',
      rationale:         `Authority-builder + local engagement + advertiser relationship.`,
    },
  ],

  defaultNegativeSpace: [
    'Anti-aging products, cosmetic procedures, "look 20 years younger" content',
    'Condescending "tech for seniors" framing',
    'Generic retirement listicles ("top 10 cities to retire to")',
    'Sponsored medical advice without source attribution',
    'Political content (audience skews high-engagement on both sides)',
    'Negative obituaries / divisive content',
  ],

  defaultEditorialPrefs: {
    formatPreference:    'long-form',
    voicePreference:     'expert',
    publishingCadence:   '1-2 articles per week, plus a strong monthly print parallel',
    evergreenVsTimely:   'Heavily evergreen (70%+); timely content around Medicare enrollment, tax season, holidays.',
  },

  contentPhilosophy: `For 50+ publishers, authority + respect beat trendy + viral every
time. Named experts, named institutions, source-attributed claims,
long-form depth. The audience is patient enough to read 2,000
words IF the content respects their intelligence. Bias toward
practical decision support (what to do, who to call, what
questions to ask) over inspiration content. Local matters
intensely — a "best cardiologists in <city>" piece will earn
links + trust for years.`,
}

// ── Registry + lookup ────────────────────────────────────────────────────

export const FAMILY_TEMPLATES: Record<BrandFamily, FamilyTemplate> = {
  'parents':    PARENTS_FAMILY,
  'fifty-plus': FIFTY_PLUS_FAMILY,
}

export function getFamilyTemplate(family: BrandFamily): FamilyTemplate {
  const t = FAMILY_TEMPLATES[family]
  if (!t) throw new Error(`No family template registered for "${family}"`)
  return t
}
