import { notFound } from 'next/navigation'
import { isValidSlug, NEIGHBORHOODS } from '@/lib/neighborhood'
import { NeighborhoodBanner } from '@/components/public/NeighborhoodBanner'
import Link from 'next/link'
import { MapPin } from 'lucide-react'

interface Props {
  children: React.ReactNode
  params: Promise<{ neighborhood: string }>
}

export default async function NeighborhoodLayout({ children, params }: Props) {
  const { neighborhood } = await params
  if (!isValidSlug(neighborhood)) notFound()

  const meta = NEIGHBORHOODS[neighborhood]

  return (
    <div className="min-h-screen bg-[#f4f5f7]">
      {/* Public nav header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <Link href={`/${neighborhood}`} className="flex items-center gap-2.5">
            <div className="flex items-end gap-[3px] h-6 shrink-0">
              {[45, 75, 100, 65, 40].map((h, i) => (
                <span
                  key={i}
                  className="w-[4px] rounded-t-sm"
                  style={{
                    height: `${h}%`,
                    backgroundColor: i === 4 ? 'rgba(212,168,67,0.55)' : '#d4a843',
                  }}
                />
              ))}
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900 leading-tight">
                River Region Parents
              </div>
              <div className="text-[10px] text-gray-500 leading-tight">
                {meta.label} Edition
              </div>
            </div>
          </Link>

          {/* Nav + neighborhood picker */}
          <div className="flex items-center gap-4">
            <nav className="hidden sm:flex items-center gap-3 text-sm text-gray-600">
              <Link href={`/${neighborhood}`} className="hover:text-gray-900 transition-colors">Home</Link>
              <Link href="/advertise" className="hover:text-gray-900 transition-colors">Advertise</Link>
              <Link href="/birthday-spotlight" className="hover:text-gray-900 transition-colors">Birthday Spotlight</Link>
            </nav>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <MapPin size={11} />
              <NeighborhoodBanner currentSlug={neighborhood} />
            </div>
          </div>
        </div>
      </header>

      {/* Neighborhood hero strip */}
      <div className="bg-blue-600 text-white">
        <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center gap-2">
          <MapPin size={13} />
          <span className="text-sm font-semibold">{meta.label} Edition</span>
          <span className="text-blue-200 text-xs">·</span>
          <span className="text-blue-100 text-xs">{meta.schoolDistrict}</span>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {children}
      </main>

      <footer className="border-t border-gray-200 bg-white mt-12">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center text-xs text-gray-400">
          © 2026 KeepSharing LLC · River Region Parents · {meta.label} Edition
          <span className="mx-2">·</span>
          <Link href="/advertise" className="hover:text-gray-700">Advertise with us</Link>
        </div>
      </footer>
    </div>
  )
}
