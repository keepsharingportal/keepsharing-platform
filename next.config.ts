import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ── Type checking runs BEFORE the build, not inside it ────────────────────
  //
  // Vercel killed the build with SIGKILL during "Running TypeScript": a
  // container out-of-memory, not a type error. The repo is ~1,500 TS/TSX
  // files, and `next build` type-checks them in a worker while the compiled
  // output is still resident, so peak memory lands above the build
  // container's ceiling.
  //
  // Raising --max-old-space-size would make it WORSE. A Node heap limit
  // reports "JavaScript heap out of memory"; SIGKILL is the kernel's OOM
  // killer taking the process because the CONTAINER filled up. Giving Node a
  // bigger heap just lets it grow further before GC and hit that wall sooner.
  //
  // So the check is not skipped — it is moved. `npm run build` is
  // `tsc --noEmit && next build`, which runs the same compiler over the same
  // files and fails the deploy exactly as before, but as its own process that
  // exits and frees its memory before the build starts. Two modest peaks
  // instead of one large one.
  //
  // Next's OWN compile step is untouched and still runs here. That is the
  // half that catches the Next-specific rules tsc cannot see — a client-only
  // option in a Server Component, a bad `use client` boundary — which is the
  // half that has broken production before. "Compiled successfully" in the
  // log above the crash is that step passing.
  typescript: { ignoreBuildErrors: true },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "maps.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      // Community calendar: event images come from organizer websites (hundreds of domains)
      { protocol: "https", hostname: "**" },
      { protocol: "http",  hostname: "**" },
    ],
  },
  async redirects() {
    return [
      // ── WordPress URL preservation ──────────────────────────────────────────
      // Articles: /YYYY/MM/DD/slug → /articles/slug (common WP permalink format)
      { source: "/:year(\\d{4})/:month(\\d{2})/:day(\\d{2})/:slug",
        destination: "/articles/:slug", permanent: true },
      // Articles: /YYYY/MM/slug → /articles/slug
      { source: "/:year(\\d{4})/:month(\\d{2})/:slug",
        destination: "/articles/:slug", permanent: true },
      // Category archives: /category/school-bits → /articles?category=school-bits
      { source: "/category/:cat",
        destination: "/articles", permanent: false },
      // WP tag archives → /articles
      { source: "/tag/:tag",
        destination: "/articles", permanent: false },
      // WP author archives → /articles
      { source: "/author/:author",
        destination: "/articles", permanent: false },
      // WP page → drop /page/ prefix
      { source: "/page/:num",
        destination: "/", permanent: false },
      // WP search → /articles
      { source: "/search/:term*",
        destination: "/articles", permanent: false },
      // Common WP admin/login paths → redirect away
      { source: "/wp-admin",        destination: "/admin", permanent: false },
      { source: "/wp-admin/:path*", destination: "/admin", permanent: false },
      { source: "/wp-login.php",    destination: "/admin", permanent: false },

      // /newcomer-guide → /family-resource-guide (retiring the newcomer-guide URL)
      { source: "/newcomer-guide",           destination: "/family-resource-guide",        permanent: true },
      { source: "/newcomer-guide/:path*",    destination: "/family-resource-guide/:path*", permanent: true },

      // /columns/frg-best-of → /best-of (canonical Best Of landing page).
      // The legacy URL still resolves via the column page (slug-tolerant),
      // but 301'ing tells search engines to consolidate ranking on the
      // shorter brandable URL.
      { source: "/columns/frg-best-of",      destination: "/best-of",              permanent: true },

      // Legacy newcomer guide redirects
      { source: "/family-guide",            destination: "/newcomer-guide",        permanent: true },
      { source: "/family-guide/:path*",     destination: "/newcomer-guide/:path*", permanent: true },
      { source: "/new-to-river-region",     destination: "/newcomer-guide",        permanent: true },
      { source: "/newcomer",                destination: "/newcomer-guide",        permanent: true },

      // Old /family-resource-guide/[slug] → new top-level guide URLs
      { source: "/family-resource-guide/newcomer",               destination: "/family-resource-guide",   permanent: true },
      { source: "/family-resource-guide/newcomer/:path*",        destination: "/family-resource-guide/:path*", permanent: true },
      { source: "/family-resource-guide/private-school",         destination: "/private-school-guide",    permanent: true },
      { source: "/family-resource-guide/private-school/:path*",  destination: "/private-school-guide/:path*", permanent: true },
      { source: "/family-resource-guide/summer-camp",            destination: "/summer-camp-guide",       permanent: true },
      { source: "/family-resource-guide/summer-camp/:path*",     destination: "/summer-camp-guide/:path*", permanent: true },
      { source: "/family-resource-guide/childcare",              destination: "/childcare-guide",         permanent: true },
      { source: "/family-resource-guide/childcare/:path*",       destination: "/childcare-guide/:path*",  permanent: true },
      { source: "/family-resource-guide/healthy-kids",           destination: "/healthy-kids-guide",      permanent: true },
      { source: "/family-resource-guide/healthy-kids/:path*",    destination: "/healthy-kids-guide/:path*", permanent: true },
      { source: "/family-resource-guide/summer-fun",             destination: "/summer-fun-guide",        permanent: true },
      { source: "/family-resource-guide/summer-fun/:path*",      destination: "/summer-fun-guide/:path*", permanent: true },
      { source: "/family-resource-guide/birthday-party",         destination: "/birthday-party-guide",    permanent: true },
      { source: "/family-resource-guide/birthday-party/:path*",  destination: "/birthday-party-guide/:path*", permanent: true },
      { source: "/family-resource-guide/afterschool",            destination: "/afterschool-guide",       permanent: true },
      { source: "/family-resource-guide/afterschool/:path*",     destination: "/afterschool-guide/:path*", permanent: true },
      { source: "/family-resource-guide/special-needs",          destination: "/special-needs-guide",     permanent: true },
      { source: "/family-resource-guide/special-needs/:path*",   destination: "/special-needs-guide/:path*", permanent: true },
    ];
  },
};

export default nextConfig;