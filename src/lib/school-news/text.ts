// Text helpers shared by the public bit cards + lightbox.

/**
 * Convert Unicode "Mathematical Alphanumeric Symbols" (U+1D400–U+1D7FF)
 * back to ASCII. This is the block people paste from Facebook headline
 * generators — 𝐄𝐥𝐦𝐨𝐫𝐞, 𝓮𝓵𝓮𝓰𝓪𝓷𝓽, 𝕕𝕠𝕦𝕓𝕝𝕖, etc. They look "bold/script/
 * fraktur" because the browser falls back to a math font with that
 * glyph, which then reads as a totally different typeface from the rest
 * of the title.
 *
 * Covers: bold, italic, bold-italic, script, bold-script, fraktur, bold
 * fraktur, double-struck, sans-serif, sans-serif bold, sans-serif italic,
 * sans-serif bold italic, monospace — both letter blocks and the digit
 * variants at U+1D7CE–U+1D7FF.
 *
 * Strategy: each letter block is 52 codepoints (26 upper + 26 lower).
 * Offset into the block gives the ASCII position. Digit blocks are 10
 * codepoints each.
 */
export function normalizeUnicodeText(text: string): string {
  if (!text) return ''
  return text.replace(/[\u{1D400}-\u{1D7FF}]/gu, ch => {
    const code = ch.codePointAt(0)!
    // Digit blocks — 5 sets of 10 at the end of the range
    if (code >= 0x1D7CE) {
      const digit = (code - 0x1D7CE) % 10
      return String.fromCharCode(0x30 + digit) // '0' = 0x30
    }
    // Letter blocks — each 52 chars (26 upper + 26 lower)
    const offset = (code - 0x1D400) % 52
    return offset < 26
      ? String.fromCharCode(0x41 + offset)         // 'A' = 0x41
      : String.fromCharCode(0x61 + (offset - 26))  // 'a' = 0x61
  })
}

/**
 * Split a blurb on blank lines so intentional paragraph breaks survive
 * rendering. Single newlines inside a paragraph (common when a Facebook
 * post hard-wraps mid-sentence) are preserved as soft breaks within the
 * same paragraph. Also normalizes Unicode math-alphabet characters so
 * pasted-from-Facebook bold/script text renders in the site font.
 *
 * Returns one trimmed string per paragraph, empties filtered out.
 *
 * "first para\n\nsecond para"        → ["first para", "second para"]
 * "FB hard-wrap\ncontinues here"     → ["FB hard-wrap\ncontinues here"]
 * "  spaced  \n\n  out  \n\n"        → ["spaced", "out"]
 */
export function splitBlurbParagraphs(text: string): string[] {
  if (!text) return []
  return normalizeUnicodeText(text)
    .split(/\n\s*\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0)
}
