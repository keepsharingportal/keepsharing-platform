import { dmSans, fraunces } from '@/lib/fonts'



export default function AdvertiseLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${fraunces.variable} ${dmSans.variable}`} style={{ fontFamily: 'var(--font-dm-sans, sans-serif)' }}>
      {children}
    </div>
  )
}
