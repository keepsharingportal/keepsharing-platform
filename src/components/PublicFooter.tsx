import Link from 'next/link'
import { BrandLogo } from '@/components/BrandLogo'

export function PublicFooter() {
  const year = new Date().getFullYear()
  return (
    <footer className="bg-foreground text-white mt-16">
      <div className="container py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Brand */}
        <div className="md:col-span-1">
          <div className="mb-4">
            <BrandLogo size="lg" withTagline={true} href="/" variant="footer" />
          </div>
          <p className="text-sm text-white/60 leading-relaxed">
            Local family media serving the River Region since 2001.
          </p>
        </div>

        {/* Guides */}
        <div>
          <p className="font-semibold text-sm mb-3 text-white/80 uppercase tracking-wider">Local Guides</p>
          <ul className="space-y-2">
            {[
              ['Family Resource Guide', '/family-resource-guide'],
              ['Private School Guide', '/private-school-guide'],
              ['Summer Camp Guide', '/summer-camp-guide'],
              ['Childcare Guide', '/childcare-guide'],
              ['Healthy Kids Guide', '/healthy-kids-guide'],
            ].map(([label, href]) => (
              <li key={href}><Link href={href} className="text-sm text-white/60 hover:text-white transition-colors">{label}</Link></li>
            ))}
          </ul>
        </div>

        {/* More guides */}
        <div>
          <p className="font-semibold text-sm mb-3 text-white/80 uppercase tracking-wider">More Guides</p>
          <ul className="space-y-2">
            {[
              ['Summer Fun Guide', '/summer-fun-guide'],
              ['Birthday Party Guide', '/birthday-party-guide'],
              ['After-School Guide', '/afterschool-guide'],
              ['Special Needs Guide', '/special-needs-guide'],
              ['Local Guides Index', '/local-guides'],
            ].map(([label, href]) => (
              <li key={href}><Link href={href} className="text-sm text-white/60 hover:text-white transition-colors">{label}</Link></li>
            ))}
          </ul>
        </div>

        {/* Company */}
        <div>
          <p className="font-semibold text-sm mb-3 text-white/80 uppercase tracking-wider">Company</p>
          <ul className="space-y-2">
            {[
              ['Advertise With Us', '/advertise'],
              ['Calendar', '/calendar'],
              ['Articles', '/newcomer-guide/articles'],
            ].map(([label, href]) => (
              <li key={href}><Link href={href} className="text-sm text-white/60 hover:text-white transition-colors">{label}</Link></li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="container py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-white/40">© {year} KeepSharing LLC. All rights reserved.</p>
          <p className="text-xs text-white/40">May 2026 Issue</p>
        </div>
      </div>
    </footer>
  )
}
