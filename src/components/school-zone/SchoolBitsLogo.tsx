// SchoolBitsLogo — two-tone wordmark used wherever a "SchoolBits" eyebrow
// or section label appears.
//
// Style: chunky bold sans-serif (system `font-sans` + `font-black`), tight
// tracking, no icon, words butted together with a hair of breathing room.
// "School" is teal-700; "Bits" is the brand coral. Matches the reference
// logo provided by the editorial team.
//
// Three sizes:
//   sm — eyebrow on cards (text-lg)
//   md — section header / lightbox header (text-2xl → text-3xl)
//   lg — standalone hero / page mastheads (text-4xl → text-5xl)

type Size = 'sm' | 'md' | 'lg'

const SIZE_CLASSES: Record<Size, string> = {
  sm: 'text-lg leading-none',
  md: 'text-2xl md:text-3xl leading-none',
  lg: 'text-4xl md:text-5xl leading-none',
}

interface Props {
  size?:      Size
  className?: string
}

export function SchoolBitsLogo({ size = 'sm', className = '' }: Props) {
  const sz = SIZE_CLASSES[size]
  return (
    <span className={`inline-flex font-sans font-black tracking-tight ${sz} ${className}`}>
      <span className="text-teal-700">School</span>
      <span className="text-primary">Bits</span>
    </span>
  )
}
