// ── Shared next/font/google instances ────────────────────────────────────────
//
// Every font the app uses, instantiated exactly once.
//
// Why this exists: eight layouts each called Fraunces({...}) and DM_Sans({...})
// with the same options, so a cold build made ~28 font-loader calls for 10
// families. Next fetches each from Google at build time, and when that fetch
// fails the generated CSS references font files that were never written —
// producing a wall of "module not found" on
// [next]/internal/font/google/fraunces_*.module.css and a failed build. That is
// exactly how the 2026-08-16 Vercel deploy died: a package-lock change
// invalidated the build cache, every font had to be fetched fresh at once, and
// the fetches didn't all land.
//
// Importing shared instances collapses that to one fetch per family, and means
// a weight added here reaches every surface instead of only the layout someone
// remembered to edit.
//
// The CSS variable names are unchanged, so nothing downstream has to move.

import {
  Geist, Geist_Mono, Allura, Fraunces, Inter, Montserrat,
  Playfair_Display, DM_Sans, DM_Mono, Source_Serif_4,
} from 'next/font/google'

export const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
export const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

// Magazine-style cursive for column wordmarks (e.g. Grands Raising Grands).
export const allura = Allura({ variable: '--font-allura', weight: '400', subsets: ['latin'], display: 'swap' })

// Editorial serif. Weights are the UNION of what the layouts previously asked
// for individually — the root layout wanted 600/700/900, the portals wanted
// 300/500/700/900 with italics. One superset instance serves both; asking for a
// weight nobody uses costs a subset in the same request, not a new request.
export const fraunces = Fraunces({
  variable: '--font-fraunces',
  subsets:  ['latin'],
  weight:   ['300', '500', '600', '700', '900'],
  style:    ['normal', 'italic'],
  display:  'swap',
})

export const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets:  ['latin'],
  weight:   ['300', '400', '500', '600'],
  display:  'swap',
})

export const dmMono = DM_Mono({
  variable: '--font-dm-mono',
  subsets:  ['latin'],
  weight:   ['300', '400', '500'],
  display:  'swap',
})

export const inter      = Inter({ variable: '--font-inter', subsets: ['latin'], display: 'swap' })
export const montserrat = Montserrat({ variable: '--font-montserrat', subsets: ['latin'], display: 'swap' })

export const playfair = Playfair_Display({
  variable: '--font-playfair',
  subsets:  ['latin'],
  weight:   ['400', '600', '700'],
  display:  'swap',
})

export const sourceSerif = Source_Serif_4({ variable: '--font-source-serif', subsets: ['latin'] })
