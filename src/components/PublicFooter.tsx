// Public-site footer. Server component — it fetches the
// nav_visibility data on render so editors can rename, hide, add
// custom links, or flip "open in new tab" without a deploy. The
// override map is cached for 30 seconds at the helper level, so this
// isn't a per-request DB hit in practice.

import Link from 'next/link'
import { NewsletterSignup } from '@/components/NewsletterSignup'
import {
  FOOTER_EXPLORE, FOOTER_CONNECT, FOOTER_LEGAL, mergeNavItems,
  type NavItem,
} from '@/lib/site-nav/items'
import { getNavRenderData } from '@/lib/site-nav/visibility'

interface FooterLinkProps {
  item: NavItem
  openInNewTab?: boolean
}

function FooterLink({ item, openInNewTab }: FooterLinkProps) {
  const isExternal = !!item.external || openInNewTab
  if (isExternal) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-primary transition-colors"
      >
        {item.label}
      </a>
    )
  }
  return (
    <Link href={item.href} className="hover:text-primary transition-colors">
      {item.label}
    </Link>
  )
}

export async function PublicFooter() {
  const { overrides, customs } = await getNavRenderData()

  // For each column, pull in the matching catalog items + any custom
  // items the admin nested under the column's parent_key. The footer
  // columns don't have a parent dropdown in the catalog, so we use
  // their group-label as the parent_key the admin will assign for
  // custom items targeting that column.
  const exploreCustoms = customs.filter(c => c.parentKey === 'footer.explore')
  const connectCustoms = customs.filter(c => c.parentKey === 'footer.connect')
  const legalCustoms   = customs.filter(c => c.parentKey === 'footer.legal')

  const explore = mergeNavItems(FOOTER_EXPLORE, overrides, exploreCustoms)
  const connect = mergeNavItems(FOOTER_CONNECT, overrides, connectCustoms)
  const legal   = mergeNavItems(FOOTER_LEGAL,   overrides, legalCustoms)

  function newTabFor(key: string): boolean {
    return overrides.get(key)?.openInNewTab ?? false
  }

  return (
    <footer className="bg-muted pt-14 pb-8 border-t mt-12 font-sans">
      <div className="container">

        {/* Newsletter strip */}
        <div className="rounded-2xl bg-primary/8 border border-primary/15 px-6 py-6 mb-12 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="shrink-0">
            <p className="font-bold text-foreground text-base leading-tight">Get the weekly River Region family newsletter</p>
            <p className="text-sm text-muted-foreground mt-0.5">Events, stories, and local tips — free every week.</p>
          </div>
          <div className="w-full md:max-w-sm">
            <NewsletterSignup variant="inline" source="footer" />
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-8 mb-12">
          <div className="md:col-span-2">
            <div className="flex flex-col mb-6">
              <div className="leading-none mb-2">
                <span className="text-3xl font-black tracking-tight text-foreground whitespace-nowrap">
                  River Region <span className="text-primary">Parents</span>
                </span>
              </div>
              <span className="text-sm font-medium text-muted-foreground">The Go-To Resource for River Region Families</span>
            </div>
            <p className="text-muted-foreground max-w-sm mb-6">
              Your hyper-local hub for family fun, support, and connection in the River Region.
            </p>
          </div>

          {explore.length > 0 && (
            <div>
              <h4 className="font-semibold mb-4">Explore</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                {explore.map(item => (
                  <li key={item.key}>
                    <FooterLink item={item} openInNewTab={newTabFor(item.key)} />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {connect.length > 0 && (
            <div>
              <h4 className="font-semibold mb-4">Connect</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                {connect.map(item => (
                  <li key={item.key}>
                    <FooterLink item={item} openInNewTab={newTabFor(item.key)} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} River Region Parents. All rights reserved.</p>
          {legal.length > 0 && (
            <div className="flex gap-4">
              {legal.map(item => (
                <span key={item.key} className="hover:text-foreground transition-colors">
                  <FooterLink item={item} openInNewTab={newTabFor(item.key)} />
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </footer>
  )
}
