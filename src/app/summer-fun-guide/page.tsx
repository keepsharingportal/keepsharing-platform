import { SummerFunGuide } from '@/components/rrp/SummerFunGuide'
import type { Camp } from '@/components/rrp/SummerFunGuide'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: '2026 Summer Fun Guide — River Region Parents',
  description: 'Everything happening this summer for River Region kids. Search camps, sports, arts programs, swim lessons, and more.',
}

async function getCamps(): Promise<Camp[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('summer_fun_guide')
      .select('*')
      .eq('publication', 'RRP')
      .order('featured', { ascending: false })
      .order('business_name', { ascending: true })
    if (error || !data?.length) return []
    return data as Camp[]
  } catch {
    return []
  }
}

export default async function SummerFunGuidePage() {
  const camps = await getCamps()
  return <SummerFunGuide initialCamps={camps} />
}
