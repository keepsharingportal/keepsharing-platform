// ── robots.txt — Next.js conventional metadata route ────────────────────────
//
// Lets every well-behaved crawler index the public site; blocks the admin,
// API, and auth flows. Sitemap URL pointer included so Google finds the
// sitemap without us having to submit it manually.

import type { MetadataRoute } from 'next'
import { loadBrandContext } from '@/lib/brand-context'

export default async function robots(): Promise<MetadataRoute.Robots> {
  const ctx = await loadBrandContext()
  // AI training bot policy. The publishing industry has settled on
  // blocking generative-AI training crawlers by default — we
  // produce the content, training corpora monetize it, the value
  // exchange is broken. Search bots (Googlebot, Bingbot, Slurp,
  // DuckDuckBot) are NOT in this list because they index for search,
  // not training. Disclosure / opt-in can be revisited if a specific
  // licensing relationship is established with a vendor.
  const aiTrainingBots = [
    'GPTBot',                // OpenAI training crawler
    'OAI-SearchBot',         // OpenAI search crawler (allowed by some pubs; we block until licensing)
    'ChatGPT-User',          // ChatGPT user agent for browse-during-chat
    'ClaudeBot',             // Anthropic training crawler
    'anthropic-ai',          // legacy Anthropic agent
    'Claude-Web',            // legacy
    'Google-Extended',       // Bard/Vertex AI training (Googlebot still allowed for search)
    'CCBot',                 // Common Crawl (feeds most LLM training datasets)
    'PerplexityBot',         // Perplexity AI
    'cohere-ai',             // Cohere
    'Meta-ExternalAgent',    // Meta AI training
    'Diffbot',               // commercial web data extraction
    'ImagesiftBot',          // image dataset crawler
    'Bytespider',            // ByteDance / Doubao training
    'Applebot-Extended',     // Apple's separate AI training UA (Applebot itself still allowed for Siri)
    'YouBot',                // You.com
    'Amazonbot',             // Amazon AI
  ]

  return {
    rules: [
      {
        userAgent: '*',
        allow:     '/',
        disallow:  [
          '/admin',
          '/admin/',
          '/api',
          '/api/',
          '/auth',
          '/login',
          '/onboard',
          '/proposal',
          '/renew',
          '/update',
          '/r/',         // share-redirect tokens
        ],
      },
      // One block-rule per AI-training bot so the rule is explicit
      // and easy to remove if/when a licensing arrangement is signed.
      ...aiTrainingBots.map(ua => ({ userAgent: ua, disallow: '/' })),
    ],
    sitemap: [
      `${ctx.publicOrigin}/sitemap.xml`,
      `${ctx.publicOrigin}/news-sitemap.xml`,
      `${ctx.publicOrigin}/image-sitemap.xml`,
    ],
  }
}
