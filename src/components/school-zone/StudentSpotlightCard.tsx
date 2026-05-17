// StudentSpotlightCard — the visual unit for an individual student
// spotlight. School name pill top-right. Image positioned to favor
// faces (object-position bias toward the top of the photo so school
// portraits and team photos don't get heads cropped off).

import Image from 'next/image'
import Link from 'next/link'
import { GraduationCap, ArrowRight } from 'lucide-react'
import { getFallback } from '@/lib/image-fallbacks'

interface Props {
  id:            string
  slug:          string
  title:         string
  excerpt:       string | null
  hero_image_url: string | null
  school_name:   string | null
  school_region: string | null
  published_at:  string | null
}

function fmtDate(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function StudentSpotlightCard(props: Props) {
  const img = props.hero_image_url || getFallback('school_zone', props.id)

  return (
    <Link
      href={`/articles/${props.slug}`}
      className="group flex flex-col rounded-2xl border border-border/50 bg-card overflow-hidden hover:border-primary/30 hover:shadow-md transition-all"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-primary/5">
        <Image
          src={img}
          alt={props.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          // Bias toward the top of the image so heads in school photos
          // don't get cropped off when the source is a portrait or group
          // shot. Most uploaded photos have faces in the upper third.
          style={{ objectFit: 'cover', objectPosition: 'center 25%' }}
          className="group-hover:scale-105 transition-transform duration-500"
          unoptimized
        />
        {/* "Student Spotlight" eyebrow, top-left */}
        <span className="absolute top-2.5 left-2.5 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest bg-white/90 text-primary px-2 py-0.5 rounded backdrop-blur-sm shadow-sm">
          <GraduationCap className="h-2.5 w-2.5" />
          Spotlight
        </span>
        {/* School name pill, top-right */}
        {props.school_name && (
          <span className="absolute top-2.5 right-2.5 text-[10px] font-bold bg-primary text-primary-foreground px-2 py-1 rounded-full shadow-sm max-w-[60%] truncate">
            {props.school_name}
          </span>
        )}
      </div>

      <div className="flex flex-col flex-1 p-4">
        <h3 className="font-bold text-base leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-1.5">
          {props.title}
        </h3>
        {props.excerpt && (
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 mb-3 flex-1">
            {props.excerpt}
          </p>
        )}
        <div className="flex items-center justify-between gap-2 pt-2 mt-auto border-t border-border/30">
          <span className="text-[11px] text-muted-foreground">
            {fmtDate(props.published_at)}
          </span>
          <span className="text-[11px] font-bold text-primary inline-flex items-center gap-0.5 group-hover:gap-1 transition-all">
            Read <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      </div>
    </Link>
  )
}
