import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Camp } from '@/components/rrp/SummerFunGuide'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const pub = searchParams.get('pub') ?? 'RRP'

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('summer_fun_guide')
      .select('*')
      .eq('publication', pub)
      .order('featured', { ascending: false })
      .order('business_name', { ascending: true })

    if (error || !data?.length) return NextResponse.json([])
    return NextResponse.json(data as Camp[])
  } catch {
    return NextResponse.json([])
  }
}
