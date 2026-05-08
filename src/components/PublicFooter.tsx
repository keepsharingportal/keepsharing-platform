import Link from 'next/link'

export function PublicFooter() {
  return (
    <footer className="bg-muted pt-16 pb-8 border-t mt-12">
      <div className="container">
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

          <div>
            <h4 className="font-semibold mb-4">Explore</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="/local-guides" className="hover:text-primary transition-colors">Local Guides</Link></li>
              <li><Link href="/calendar" className="hover:text-primary transition-colors">Event Calendar</Link></li>
              <li><Link href="/articles" className="hover:text-primary transition-colors">Articles</Link></li>
              <li><Link href="/columns/mom-to-mom" className="hover:text-primary transition-colors">Mom to Mom</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Connect</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li><Link href="/advertise" className="hover:text-primary transition-colors">Advertise with Us</Link></li>
              <li><Link href="/calendar/submit" className="hover:text-primary transition-colors">Submit an Event</Link></li>
              <li><Link href="/nominate" className="hover:text-primary transition-colors">Nominate Someone</Link></li>
              <li><a href="https://instagram.com/riverregionparents" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">Instagram</a></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} River Region Parents. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}