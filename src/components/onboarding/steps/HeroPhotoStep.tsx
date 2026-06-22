'use client'

// Onboarding Step 3 — Hero photo.
// Re-uses the existing HeroImageUpload widget (Sharp-resized, WebP,
// stored in Supabase Storage). Writes the resulting public URL to
// advertiser_accounts.hero_photo_url so it renders at the top of the
// canonical ListingDetailPage.

import { HeroImageUpload } from '@/components/admin/HeroImageUpload'

type Advertiser = Record<string, unknown> & {
  hero_photo_url?: string | null
}

interface Props {
  advertiser: Advertiser
  onSave:     (patch: Partial<Advertiser>) => void
}

export function HeroPhotoStep({ advertiser, onSave }: Props) {
  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-[20px] font-bold text-portal-text">Hero photo</h2>
        <p className="text-[12px] text-portal-sub mt-1">
          The big image at the top of your listing. Choose a wide, brightly-lit
          photo that captures what the experience feels like — kids mid-fun
          beats a logo every time.
        </p>
      </header>

      <div className="grid lg:grid-cols-[1fr,280px] gap-6">
        <div>
          <HeroImageUpload
            value={advertiser.hero_photo_url ?? ''}
            onChange={url => onSave({ hero_photo_url: url || null })}
            context="asset"
          />
          <p className="text-[10px] text-portal-muted mt-3 leading-relaxed">
            Large files are auto-resized to fit the listing page. JPEG, PNG, WebP, GIF supported.
          </p>
        </div>

        <aside className="rounded-lg border border-portal-border bg-portal-bg p-4 text-[11px] text-portal-sub leading-relaxed">
          <div className="text-[10px] font-bold uppercase tracking-widest text-portal-muted mb-2">
            Photo tips
          </div>
          <ul className="space-y-1.5 list-disc pl-4">
            <li>Wide / landscape orientation works best</li>
            <li>Kids visible (with model release) outperform empty-room shots 3:1</li>
            <li>Natural light beats fluorescent every time</li>
            <li>If you don&apos;t have a great photo, we recommend hiring a local photographer for $250–$400</li>
          </ul>
        </aside>
      </div>
    </div>
  )
}
