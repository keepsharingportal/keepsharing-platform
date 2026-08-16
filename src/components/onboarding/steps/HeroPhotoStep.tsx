'use client'

// Onboarding Step 3 — Hero photo.
// Re-uses the existing HeroImageUpload widget (Sharp-resized, WebP,
// stored in Supabase Storage). Writes the resulting public URL to
// advertiser_accounts.hero_photo_url so it renders at the top of the
// canonical ListingDetailPage.

import { HeroImageUpload } from '@/components/admin/HeroImageUpload'

type Advertiser = Record<string, unknown> & {
  id:                     string
  hero_photo_url?:        string | null
  /** Saved uncropped upload — required for the re-crop tools (migration 227). */
  hero_photo_orig_path?:  string | null
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
          {/* 'listing-hero' rather than 'asset': same 16:9 crop, saved
              original, and 9-way gravity + drag-a-region re-crop the article
              editor has had since migration 100. On 'asset' this step could
              upload but never re-frame, so a photo whose subject sat off-centre
              had to be re-shot or re-cropped outside the tool. */}
          <HeroImageUpload
            value={advertiser.hero_photo_url ?? ''}
            onChange={url => onSave({ hero_photo_url: url || null })}
            context="listing-hero"
            articleId={advertiser.id}
            origPath={advertiser.hero_photo_orig_path ?? null}
            onOrigPathChange={p => onSave({ hero_photo_orig_path: p })}
          />
          <p className="text-[10px] text-portal-muted mt-3 leading-relaxed">
            Auto-resized and cropped to 16:9 WebP. Use the compass or zoom tool to re-frame
            without re-uploading. JPEG, PNG, WebP, GIF supported.
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
