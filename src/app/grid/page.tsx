// ── /grid → /grid-tool ──────────────────────────────────────────────────────
//
// The tool moved to /grid-tool, on app.keepsharing.com and without any
// publication's branding. This redirect exists because /grid was shared as a
// link before the move, and a tool someone has bookmarked should not 404.
//
// Permanent, so anything that cached the old URL updates.

import { permanentRedirect } from 'next/navigation'

export default function GridRedirect(): never {
  permanentRedirect('/grid-tool')
}
