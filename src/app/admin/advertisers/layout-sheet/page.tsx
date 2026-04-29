import { LayoutSheetClient } from '@/components/advertisers/LayoutSheetClient'

interface Props {
  searchParams: Promise<{ pub?: string; month?: string; year?: string }>
}

export default async function LayoutSheetPage({ searchParams }: Props) {
  const params = await searchParams
  const pub   = params.pub   ?? 'RRP'
  const month = params.month ?? 'MAR'
  const year  = params.year  ?? '26'

  // Don't pre-fetch all records — LayoutSheetClient always loads per-issue via API.
  // Pre-fetching 3,949 rows at page load is too slow and hits PostgREST row limits.
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <LayoutSheetClient
        initialAdvertisers={[]}
        defaultPub={pub}
        defaultMonth={month}
        defaultYear={year}
      />
    </div>
  )
}
