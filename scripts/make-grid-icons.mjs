// Generates the grid tool's PWA icons.
//
// Run with:  node scripts/make-grid-icons.mjs
//
// The output PNGs are committed, so this only needs running if the mark
// changes. Kept in the repo rather than done by hand so the icon set can be
// regenerated consistently instead of someone re-exporting one size and
// quietly leaving the others stale.
//
// Two shapes, because Android and iOS want different things:
//
//   "any"       a rounded square, drawn as the icon itself. Used as-is.
//   "maskable"  full-bleed background with the mark inside the middle 60%.
//               Android crops this to whatever shape the launcher uses — a
//               circle, a squircle, a teardrop — so anything near the edge
//               gets cut. Without a maskable variant Android pillarboxes the
//               icon inside a white blob, which looks broken next to every
//               other app on the home screen.

import sharp from 'sharp'
import fs from 'node:fs'
import path from 'node:path'

const OUT = path.join(process.cwd(), 'public', 'grid-tool')
fs.mkdirSync(OUT, { recursive: true })

const BG   = '#0f172a'   // slate-900, matching the tool's header mark
const LINE = '#ffffff'

/**
 * @param size   pixel size of the square
 * @param inset  fraction of the canvas left as margin around the mark
 * @param radius corner radius in px, 0 for full bleed
 */
function svg(size, inset, radius) {
  const m  = size * inset          // margin
  const s  = size - m * 2          // mark box
  const sw = Math.max(2, size * 0.035)  // stroke width
  // Two interior lines each way: a 3x3 grid reads as "grid" at 48px, where
  // 4x4 turns to mush.
  const third = s / 3
  const lines = []
  for (let i = 1; i < 3; i++) {
    const o = m + third * i
    lines.push(`<line x1="${o}" y1="${m}" x2="${o}" y2="${m + s}"/>`)
    lines.push(`<line x1="${m}" y1="${o}" x2="${m + s}" y2="${o}"/>`)
  }
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="${BG}"/>
  <g stroke="${LINE}" stroke-width="${sw}" stroke-linecap="square" fill="none">
    <rect x="${m}" y="${m}" width="${s}" height="${s}" rx="${size * 0.02}"/>
    ${lines.join('\n    ')}
  </g>
</svg>`)
}

const jobs = [
  // Standard icons: generous rounding, mark fills most of the tile.
  { file: 'icon-192.png',          size: 192, inset: 0.18, radius: 38 },
  { file: 'icon-512.png',          size: 512, inset: 0.18, radius: 102 },
  // Maskable: no rounding (the launcher supplies the shape) and the mark
  // pulled well inside the safe zone.
  { file: 'icon-maskable-192.png', size: 192, inset: 0.26, radius: 0 },
  { file: 'icon-maskable-512.png', size: 512, inset: 0.26, radius: 0 },
  // iOS home screen. Apple applies its own rounding and does NOT respect
  // transparency, so this is a filled square.
  { file: 'apple-touch-icon.png',  size: 180, inset: 0.18, radius: 0 },
]

for (const j of jobs) {
  let img = sharp(svg(j.size, j.inset, j.radius))
  // iOS composites a transparent icon onto black rather than honouring the
  // alpha, so the Apple tile is flattened onto the background colour.
  if (j.file.startsWith('apple')) img = img.flatten({ background: BG })
  await img.png({ compressionLevel: 9 }).toFile(path.join(OUT, j.file))
  console.log('wrote', path.join('public', 'grid-tool', j.file))
}
