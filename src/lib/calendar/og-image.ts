// ── OG image auto-fetch ───────────────────────────────────────────────────────
// Fetches a page and pulls the og:image / twitter:image / first reasonable
// <img>. Used by the iCal ingestor and AI extraction save flow so most
// ingested events arrive with a real hero image instead of a stock fallback.

/** Pull the best hero-image URL from a given event page. Returns null on failure. */
export async function fetchOgImage(pageUrl: string): Promise<string | null> {
  if (!pageUrl || !/^https?:\/\//i.test(pageUrl)) return null

  let html: string
  try {
    const res = await fetch(pageUrl, {
      method:   'GET',
      redirect: 'follow',
      headers:  {
        'Accept':     'text/html, */*',
        'User-Agent': 'KeepSharing-Calendar-OG/1.0',
      },
    })
    if (!res.ok) return null
    html = await res.text()
  } catch {
    return null
  }

  // Match meta tags with either attribute order: property/name first or content first.
  // We accept og:image, og:image:secure_url, og:image:url, twitter:image, twitter:image:src.
  const metaPatterns: RegExp[] = [
    /<meta[^>]+property=["']og:image(?::secure_url|:url)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url|:url)?["']/i,
    /<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/i,
  ]

  for (const re of metaPatterns) {
    const m = html.match(re)
    if (m && m[1]) {
      const absolute = toAbsoluteUrl(m[1], pageUrl)
      if (absolute) return absolute
    }
  }

  // Last-resort fallback: first <img> tag with an http/https src that doesn't
  // look like a logo, ad-tracking pixel, or other noise. This is intentionally
  // conservative — for most well-built event sites OG meta tags cover us. This
  // branch handles long-tail sites that don't set meta tags.
  const adHosts  = /(doubleclick|googletag|googleads|googleadservices|facebook\.com\/tr|fbcdn\.net\/tr|google-analytics|gtag|adservice|hotjar|segment|hubspot|optimizely)/i
  const noiseTxt = /logo|favicon|icon|sprite|placeholder|spacer|pixel|tracking|beacon|google-analytics|gtag|gtm|advert/i
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi
  let m: RegExpExecArray | null
  while ((m = imgRegex.exec(html)) !== null) {
    const candidate = m[1]
    if (adHosts.test(candidate))     continue
    if (noiseTxt.test(candidate))    continue
    if (/\.svg(\?|$)/i.test(candidate)) continue
    if (/\.gif(\?|$)/i.test(candidate)) continue  // 1x1 GIFs are typically pixels
    const absolute = toAbsoluteUrl(candidate, pageUrl)
    if (absolute) return absolute
  }
  return null
}

function toAbsoluteUrl(href: string, base: string): string | null {
  try {
    return new URL(href, base).toString()
  } catch {
    return null
  }
}
