// Issuu URL helpers.
//
// Publication URL format:  https://issuu.com/{user}/docs/{doc_slug}
// Embed URL format:        https://e.issuu.com/embed.html?d={doc_slug}&u={user}
//
// We derive the embed URL from the publication URL the admin pastes
// instead of storing it as a second field — keeps the data model small
// and avoids the embed URL drifting out of sync when an editor updates
// the publication URL.

/**
 * Derive the Issuu embed URL from a publication URL. Returns null when
 * the input isn't a recognizable Issuu link so the caller can fall back
 * to the static cover image.
 */
export function deriveIssuuEmbedUrl(publicationUrl: string | null | undefined): string | null {
  if (!publicationUrl) return null
  try {
    const u = new URL(publicationUrl)
    if (!/(^|\.)issuu\.com$/i.test(u.hostname)) return null
    // Path is /{user}/docs/{slug} — may have a locale prefix or trailing
    // pieces (page references, comments). We anchor on the "docs" segment.
    const parts = u.pathname.split('/').filter(Boolean)
    const docsIdx = parts.indexOf('docs')
    if (docsIdx < 1 || docsIdx === parts.length - 1) return null
    const user = parts[docsIdx - 1]
    const slug = parts[docsIdx + 1]
    if (!user || !slug) return null
    return `https://e.issuu.com/embed.html?d=${encodeURIComponent(slug)}&u=${encodeURIComponent(user)}`
  } catch {
    return null
  }
}

/**
 * Normalize any Issuu input into a publication URL — the shape the rest
 * of the codebase expects. Accepts:
 *
 *   1. Full iframe embed snippet:
 *      <iframe ... src="https://e.issuu.com/embed.html?d=…&u=…"></iframe>
 *   2. Bare embed src URL:
 *      https://e.issuu.com/embed.html?d=…&u=…
 *   3. Publication URL:
 *      https://issuu.com/{user}/docs/{slug}
 *
 * Returns null when the input isn't recognizable. The admin form runs
 * input through this on save so the editor can paste whatever Issuu's UI
 * gives them — embed code, src, or the page URL — and we always store
 * the same canonical publication URL.
 */
export function extractIssuuPublicationUrl(input: string | null | undefined): string | null {
  if (!input) return null
  const trimmed = input.trim()
  if (!trimmed) return null

  // If it looks like an iframe snippet, pull out the src.
  const srcMatch  = trimmed.match(/src=["']([^"']+)["']/i)
  const candidate = srcMatch?.[1] ?? trimmed

  try {
    const u = new URL(candidate)
    if (!/(^|\.)issuu\.com$/i.test(u.hostname)) return null

    // Embed URL — has user + slug in query params.
    if (u.hostname.toLowerCase().startsWith('e.')) {
      const slug = u.searchParams.get('d')
      const user = u.searchParams.get('u')
      if (!slug || !user) return null
      return `https://issuu.com/${user}/docs/${slug}`
    }

    // Publication URL — slug + user in the path.
    const parts   = u.pathname.split('/').filter(Boolean)
    const docsIdx = parts.indexOf('docs')
    if (docsIdx < 1 || !parts[docsIdx + 1]) return null
    const user = parts[docsIdx - 1]
    const slug = parts[docsIdx + 1]
    return `https://issuu.com/${user}/docs/${slug}`
  } catch {
    return null
  }
}
