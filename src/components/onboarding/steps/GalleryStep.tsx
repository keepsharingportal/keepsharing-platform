'use client'

// Onboarding Step — Photo Gallery
//
// advertiser_accounts.gallery_image_urls: public Supabase Storage URLs, Sharp
// resized via /api/admin/upload.
//
// The upload/reorder/remove control now lives in @/components/admin/GalleryUpload
// so the guide listing editor uses exactly the same thing. It used to be
// implemented inline here, which meant gallery photos could only ever be added
// by walking an advertiser through this wizard — an existing listing had no
// route to a gallery at all. It also posted raw files, so anything over
// Vercel's ~4.5 MB body limit failed with an opaque error; the shared component
// compresses first.

import { GalleryUpload } from '@/components/admin/GalleryUpload'

type Advertiser = Record<string, unknown> & {
  gallery_image_urls?: string[] | null
}

interface Props {
  advertiser: Advertiser
  onSave:     (patch: Partial<Advertiser>) => void
}

const MAX = 8

export function GalleryStep({ advertiser, onSave }: Props) {
  const list = (advertiser.gallery_image_urls ?? []) as string[]

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-[20px] font-bold text-portal-text">Photo gallery</h2>
        <p className="text-[12px] text-portal-sub mt-1">
          Up to {MAX} photos that show what your space and programmes feel like.
          The hero photo is the headline; these support it.
        </p>
      </header>

      <GalleryUpload
        value={list}
        max={MAX}
        onChange={next => onSave({ gallery_image_urls: next })}
      />

      <aside className="rounded-lg border border-portal-border bg-portal-bg p-4 text-[11px] text-portal-sub leading-relaxed">
        <div className="text-[10px] font-bold uppercase tracking-widest text-portal-muted mb-2">
          Photo tips
        </div>
        <ul className="space-y-1.5 list-disc pl-4">
          <li>Kids mid-activity beat empty rooms — with a model release on file</li>
          <li>Show the space a parent will actually walk into</li>
          <li>Bright and in focus matters more than professional</li>
          <li>Order counts: the listing page shows the first four</li>
        </ul>
      </aside>
    </div>
  )
}
