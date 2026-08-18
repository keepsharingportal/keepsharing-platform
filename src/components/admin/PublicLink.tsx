'use client'

// ── PublicLink / AdminBrandProvider ───────────────────────────────────────────
//
// Links from the admin to a reader-facing page.
//
// The admin is served from app.keepsharing.com, which hosts every brand and
// serves none of the public routes — a request for /afterschool-guide there
// 307s to /admin/login and then 404s. So a relative <Link href="/calendar">
// in an admin screen never reaches the calendar, no matter which brand is
// selected in the switcher: picking a brand changes what content you see, not
// how a browser resolves a relative URL.
//
// Every such link has to be absolute on the selected brand's own domain. The
// provider carries the admin's active market down from the layout (which reads
// it server-side from AdminContext) so client components don't each have to
// fetch or guess it, and adding the next brand needs no further changes here.
//
// Content that belongs to a specific brand — a syndicated article, say —
// should pass brandSlug explicitly so it opens on the brand that owns it
// rather than whichever one the editor happens to be viewing.

import { createContext, useContext } from 'react'
import { publicUrl } from '@/lib/markets'

const AdminBrandContext = createContext<string | null>(null)

export function AdminBrandProvider({
  activeMarket, children,
}: { activeMarket: string | null; children: React.ReactNode }) {
  return (
    <AdminBrandContext.Provider value={activeMarket}>
      {children}
    </AdminBrandContext.Provider>
  )
}

/** The brand currently selected in the admin switcher, or null for all-brands. */
export function useAdminBrand(): string | null {
  return useContext(AdminBrandContext)
}

/**
 * Absolute URL for a public path on the active brand's domain.
 *
 * Returns the path unchanged when no brand is resolvable (all-brands view),
 * which is the old behaviour — wrong, but no worse than inventing a host.
 */
export function usePublicUrl(): (path: string, brandSlug?: string | null) => string {
  const active = useAdminBrand()
  return (path: string, brandSlug?: string | null) => publicUrl(path, brandSlug ?? active)
}

interface Props extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  /** Public path, e.g. "/afterschool-guide". Absolutised at render. */
  path:       string
  /** Override the active brand — use for content owned by a specific brand. */
  brandSlug?: string | null
  children:   React.ReactNode
}

/**
 * Drop-in for a <Link>/<a> that points at a public page. Always opens in a new
 * tab: the editor is mid-task in the admin, and this is a "go and look at it"
 * link, not navigation.
 */
export function PublicLink({ path, brandSlug, children, ...rest }: Props) {
  const active = useAdminBrand()
  return (
    <a
      href={publicUrl(path, brandSlug ?? active)}
      target="_blank"
      rel="noopener noreferrer"
      {...rest}
    >
      {children}
    </a>
  )
}
