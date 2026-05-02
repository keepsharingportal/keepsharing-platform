/**
 * Fetch OG images for calendar events that have a website but no hero image.
 * Run: npm run fetch-event-images
 *
 * Updates calendar_events.hero_image_url for events where:
 *   - website is set
 *   - hero_image_url is null
 *   - og_image_fetched is false (or null)
 */

import * as path from 'path'
import { createClient } from '@supabase/supabase-js'
import { fetchOGImage } from '../src/lib/og-image-fetcher'

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const dotenv = require('dotenv')
  dotenv.config({ path: path.join(process.cwd(), '.env.local') })
  dotenv.config({ path: path.join(process.cwd(), '.env') })
} catch { /* dotenv not installed */ }

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

async function main() {
  console.log('Fetching OG images for calendar events...\n')

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL')
    process.exit(1)
  }

  const { data: events } = await supabase
    .from('calendar_events')
    .select('id, title, website')
    .not('website', 'is', null)
    .is('hero_image_url', null)
    .or('og_image_fetched.is.null,og_image_fetched.eq.false')
    .order('start_date', { ascending: true })
    .limit(100)

  if (!events?.length) {
    console.log('No events need image fetching.')
    return
  }

  console.log(`Found ${events.length} events to process.\n`)
  let found = 0
  let failed = 0

  for (const event of events) {
    process.stdout.write(`  "${event.title.slice(0, 50)}"... `)
    const imageUrl = await fetchOGImage(event.website!)

    if (imageUrl) {
      await supabase
        .from('calendar_events')
        .update({
          hero_image_url:                imageUrl,
          og_image_fetched:              true,
          og_image_fetch_attempted_at:   new Date().toISOString(),
        })
        .eq('id', event.id)
      console.log('✓')
      found++
    } else {
      await supabase
        .from('calendar_events')
        .update({
          og_image_fetched:            true,
          og_image_fetch_attempted_at: new Date().toISOString(),
        })
        .eq('id', event.id)
      console.log('no image')
      failed++
    }

    await new Promise(r => setTimeout(r, 250))
  }

  console.log(`\nDone. ${found} images found, ${failed} had no OG image.`)
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
