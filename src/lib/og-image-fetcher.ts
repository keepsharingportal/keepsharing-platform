export async function fetchOGImage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'RiverRegionParents/1.0 (+https://riverregionparents.com)' },
      signal:  AbortSignal.timeout(5000),
    })
    if (!response.ok) return null
    const html  = await response.text()
    const match = html.match(/<meta\s+(?:property|name)=["']og:image["']\s+content=["']([^"']+)["']/i)
                ?? html.match(/<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["']og:image["']/i)
    const raw   = match?.[1] ?? null
    if (!raw) return null
    // Make relative URLs absolute
    if (raw.startsWith('//')) return `https:${raw}`
    if (raw.startsWith('/')) {
      const base = new URL(url)
      return `${base.protocol}//${base.host}${raw}`
    }
    return raw
  } catch {
    return null
  }
}
