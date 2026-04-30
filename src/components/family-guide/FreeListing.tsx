import { Phone, Globe } from 'lucide-react'
import type { GuideListing } from './types'

function fmt(phone: string): string {
  return phone.replace(/[^\d]/g, '').replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3')
}

export function FreeListing({ listing }: { listing: GuideListing }) {
  return (
    <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg border border-gray-100 bg-gray-50/50 hover:bg-white hover:border-gray-200 transition-all group">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-gray-800 truncate">{listing.business_name}</div>
        {listing.description && (
          <div className="text-xs text-gray-500 truncate mt-0.5">{listing.description}</div>
        )}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {listing.phone && (
          <a
            href={`tel:${listing.phone}`}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition-colors whitespace-nowrap"
            title={fmt(listing.phone)}
          >
            <Phone size={11} />
            <span className="hidden sm:inline">{fmt(listing.phone)}</span>
          </a>
        )}
        {listing.website && (
          <a
            href={listing.website.startsWith('http') ? listing.website : `https://${listing.website}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors"
          >
            <Globe size={11} />
            <span className="hidden sm:inline">Website</span>
          </a>
        )}
      </div>
    </div>
  )
}
