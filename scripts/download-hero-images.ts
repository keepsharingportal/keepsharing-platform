/**
 * Download curated Unsplash hero images to /public/images/heroes/
 * Run: npm run download-heroes
 */

import fs from 'fs'
import path from 'path'

const DEST = path.join(process.cwd(), 'public', 'images', 'heroes')

const HEROES = [
  { name: 'local-guides-hero.jpg',       id: 'photo-1609220136736-443140cffec6', desc: 'warm family afternoon' },
  { name: 'family-resource-hero.jpg',    id: 'photo-1588392382834-a891154bca4d', desc: 'family neighborhood street' },
  { name: 'private-school-hero.jpg',     id: 'photo-1503676260728-1c00da094a0b', desc: 'school books on desk' },
  { name: 'summer-camp-hero.jpg',        id: 'photo-1496080174650-637e3f22fa03', desc: 'kids outdoors summer' },
  { name: 'childcare-hero.jpg',          id: 'photo-1587654780291-39c9404d746b', desc: 'preschool environment' },
  { name: 'healthy-kids-hero.jpg',       id: 'photo-1559757175-5700dde675bc', desc: 'pediatric care' },
  { name: 'summer-fun-hero.jpg',         id: 'photo-1551966775-a4ddc8df052b', desc: 'family fun outside' },
  { name: 'birthday-party-hero.jpg',     id: 'photo-1530103862676-de8c9debad1d', desc: 'birthday celebration' },
  { name: 'afterschool-hero.jpg',        id: 'photo-1509062522246-3755977927d7', desc: 'kids learning afterschool' },
  { name: 'special-needs-hero.jpg',      id: 'photo-1491438590914-bc09fcaaf77a', desc: 'inclusive family joy' },
  { name: 'calendar-hero.jpg',           id: 'photo-1492684223066-81342ee5ff30', desc: 'community gathering event' },
]

async function main() {
  fs.mkdirSync(DEST, { recursive: true })
  console.log(`Downloading ${HEROES.length} hero images to ${DEST}\n`)

  const credits: string[] = ['# Hero Image Photo Credits\n', 'All images from Unsplash (unsplash.com) — free to use under Unsplash License.\n']

  for (const hero of HEROES) {
    const url  = `https://images.unsplash.com/${hero.id}?w=1600&q=80&auto=format&fit=crop`
    const dest = path.join(DEST, hero.name)

    try {
      process.stdout.write(`  ${hero.name} (${hero.desc})... `)
      const response = await fetch(url, { signal: AbortSignal.timeout(15000) })

      if (!response.ok) {
        // Try fallback URL without quality params
        const fallback = `https://images.unsplash.com/${hero.id}`
        const r2 = await fetch(fallback, { signal: AbortSignal.timeout(15000) })
        if (!r2.ok) {
          console.log(`✗ ${response.status}`)
          credits.push(`- **${hero.name}**: ${hero.id} (download failed ${response.status})`)
          continue
        }
        const buffer = await r2.arrayBuffer()
        fs.writeFileSync(dest, Buffer.from(buffer))
      } else {
        const buffer = await response.arrayBuffer()
        fs.writeFileSync(dest, Buffer.from(buffer))
      }

      const size = Math.round(fs.statSync(dest).size / 1024)
      console.log(`✓ (${size}KB)`)
      credits.push(`- **${hero.name}**: [${hero.id}](https://unsplash.com/${hero.id}) — ${hero.desc}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      console.log(`✗ ${msg}`)
      credits.push(`- **${hero.name}**: ${hero.id} (download failed: ${msg})`)
    }
  }

  const creditsPath = path.join(process.cwd(), 'docs', 'photo-credits.md')
  fs.writeFileSync(creditsPath, credits.join('\n'))
  console.log('\nPhoto credits written to docs/photo-credits.md')
  console.log('\nDone. Run migration 034 to update guide_types.hero_image_url paths.')
}

main().catch(err => { console.error(err); process.exit(1) })
