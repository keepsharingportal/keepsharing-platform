// Pure server-safe utility — no React, no DOM, no Tiptap, no 'use client'.
// Converts simple markdown to HTML for imported articles.
// If the input is already HTML it is returned as-is.

function isHtml(s: string): boolean {
  return /<[a-z][\s\S]*>/i.test(s)
}

function applyInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,     '<em>$1</em>')
    .replace(/`(.+?)`/g,       '<code>$1</code>')
}

export function markdownToHtml(md: string): string {
  if (!md?.trim()) return ''
  if (isHtml(md))  return md

  const lines      = md.split('\n')
  const blocks: string[] = []
  let listItems: string[] = []
  let ordered      = false

  const flushList = () => {
    if (!listItems.length) return
    const tag = ordered ? 'ol' : 'ul'
    blocks.push(`<${tag}>${listItems.map(li => `<li>${li}</li>`).join('')}</${tag}>`)
    listItems = []
  }

  for (const line of lines) {
    const t = line.trim()
    if (!t) { flushList(); continue }

    // Headings (h1 treated as h2 in article context)
    if (t.startsWith('### ')) { flushList(); blocks.push(`<h3>${applyInline(t.slice(4))}</h3>`);                        continue }
    if (t.startsWith('## '))  { flushList(); blocks.push(`<h2>${applyInline(t.slice(3))}</h2>`);                        continue }
    if (t.startsWith('# '))   { flushList(); blocks.push(`<h2>${applyInline(t.slice(2))}</h2>`);                        continue }
    if (t.startsWith('> '))   { flushList(); blocks.push(`<blockquote><p>${applyInline(t.slice(2))}</p></blockquote>`); continue }

    // Standard markdown image: ![alt](url)
    const imgStd = t.match(/^!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/)
    if (imgStd)  { flushList(); blocks.push(`<figure><img src="${imgStd[2]}" alt="${imgStd[1]}" /></figure>`); continue }

    // Non-standard bare image used by some importers: !(url)
    const imgBare = t.match(/^!\((https?:\/\/[^\s)]+)\)/)
    if (imgBare) { flushList(); blocks.push(`<figure><img src="${imgBare[1]}" alt="" /></figure>`); continue }

    // Raw image URL on its own line
    const imgUrl = t.match(/^(https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp)(?:\?[^\s]*)?)\s*$/i)
    if (imgUrl)  { flushList(); blocks.push(`<figure><img src="${imgUrl[1]}" alt="" /></figure>`); continue }

    const bulletMatch   = t.match(/^[-*]\s+(.+)/)
    if (bulletMatch)   { ordered = false; listItems.push(applyInline(bulletMatch[1])); continue }

    const numberedMatch = t.match(/^\d+\.\s+(.+)/)
    if (numberedMatch) { ordered = true;  listItems.push(applyInline(numberedMatch[1])); continue }

    flushList()
    blocks.push(`<p>${applyInline(t)}</p>`)
  }
  flushList()

  return blocks.join('\n')
}
