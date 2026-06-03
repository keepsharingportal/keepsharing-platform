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
