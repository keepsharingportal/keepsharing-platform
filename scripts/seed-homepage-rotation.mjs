// ── scripts/seed-homepage-rotation.mjs ────────────────────────────────────────
// One-shot data setup for the homepage Featured Guide + 4-column rotation.
//
//   node --env-file=.env.local scripts/seed-homepage-rotation.mjs
//
// What this does:
//   1. Sets guide_configs.featured_month for each guide so the homepage
//      Featured Guide tile picks the right monthly issue automatically.
//   2. Seeds a guide_articles row for Marcus Johnson (Play Ball) by lifting
//      data from the existing community_spotlights row, so the homepage
//      4-column rotation has a real Play Ball entry from day one.
//
// Run AFTER applying migration 067 in the Supabase SQL editor.

import { createClient } from '@supabase/supabase-js'

const supa = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
)

// ── 1. Featured month per guide ──────────────────────────────────────────────
// Matches the print rhythm in src/lib/mock-guides.ts (GUIDE_CALENDAR).
const FEATURED_MONTHS = [
  { slug: 'summer-camp',     month: 3 },  // March  — Summer Camp Guide
  { slug: 'childcare',       month: 4 },  // April  — Child Care Guide
  { slug: 'summer-fun',      month: 5 },  // May    — Summer Fun + VBS
  { slug: 'newcomer',        month: 6 },  // June   — Family Resource Guide (was Newcomers)
  { slug: 'birthday-party',  month: 7 },  // July   — Birthday Guide
  { slug: 'private-school',  month: 8 },  // August — Back to School
  { slug: 'special-needs',   month: 9 },  // Sept   — Special Needs Guide
  { slug: 'healthy-kids',    month: 11 }, // Nov    — Healthy Kids Guide
  // afterschool intentionally left null
]

console.log('=== Setting featured_month on guide_configs ===')
for (const { slug, month } of FEATURED_MONTHS) {
  const { error } = await supa
    .from('guide_configs')
    .update({ featured_month: month })
    .eq('guide_type_slug', slug)
  if (error) {
    console.error(`  ${slug}: ${error.message}`)
    if (error.message.includes('column') || error.message.includes('featured_month')) {
      console.error('\n⚠ Did you run supabase/migrations/067 in the Supabase SQL editor?')
      console.error('   alter table guide_configs add column featured_month smallint;')
      process.exit(1)
    }
  } else {
    console.log(`  ${slug}: month=${month}`)
  }
}

// ── 2. Seed Marcus Johnson as a Play Ball article ────────────────────────────
console.log('\n=== Seeding Play Ball article from community_spotlights ===')
const { data: marcusRow } = await supa
  .from('community_spotlights')
  .select('honoree_name, honoree_context, hero_image_url')
  .eq('spotlight_type', 'student')
  .ilike('honoree_name', 'Marcus%')
  .maybeSingle()

if (!marcusRow) {
  console.log('  No Marcus Johnson row found in community_spotlights — skipping seed.')
} else {
  const slug = 'play-ball-marcus-johnson'

  const { data: existing } = await supa
    .from('guide_articles')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (existing) {
    console.log(`  guide_articles row already exists (id=${existing.id}) — skipping.`)
  } else {
    const title  = `Play Ball: ${marcusRow.honoree_name}`
    const body   = `<p>${marcusRow.honoree_context ?? ''}</p>`
    const insert = await supa.from('guide_articles').insert({
      title,
      slug,
      excerpt:           marcusRow.honoree_context ?? null,
      body,
      body_format:       'html',
      author_name:       'River Region Parents',
      hero_image_url:    marcusRow.hero_image_url ?? null,
      profile_image_url: marcusRow.hero_image_url ?? null,
      column_slug:       'play-ball',
      published:         true,
      published_at:      new Date().toISOString(),
      editorial_review_status: 'approved',
      target_publication: 'RRP',
    }).select('id').single()

    if (insert.error) {
      console.error('  insert error:', insert.error.message)
      if (insert.error.message.includes('profile_image_url')) {
        console.error('\n⚠ Did you run supabase/migrations/067 in the Supabase SQL editor?')
        console.error('   alter table guide_articles add column profile_image_url text;')
        process.exit(1)
      }
    } else {
      console.log(`  inserted guide_articles ${insert.data.id} → ${title}`)
    }
  }
}

// ── 3. Backfill profile_image_url from hero_image_url for the rotation cols ─
console.log('\n=== Backfilling profile_image_url for rotation columns ===')
const ROTATION_COLS = ['mom-to-mom', 'teacher-of-month', 'grands-greatest', 'play-ball']
for (const col of ROTATION_COLS) {
  const { data: rows } = await supa
    .from('guide_articles')
    .select('id, hero_image_url, profile_image_url')
    .eq('column_slug', col)
    .eq('published', true)
  let n = 0
  for (const r of rows ?? []) {
    if (!r.profile_image_url && r.hero_image_url) {
      const { error } = await supa
        .from('guide_articles')
        .update({ profile_image_url: r.hero_image_url })
        .eq('id', r.id)
      if (!error) n++
    }
  }
  console.log(`  ${col}: backfilled ${n} row(s)`)
}

console.log('\n✓ Done.')
