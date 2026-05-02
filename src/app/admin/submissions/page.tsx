import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import { SubmissionsQueue } from './SubmissionsQueue'

export const metadata: Metadata = { title: 'Submissions Queue — Admin' }

export default async function SubmissionsPage() {
  const supabase = await createClient()

  const { data: submissions } = await supabase
    .from('reader_submissions')
    .select('*')
    .order('ai_score', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(100)

  return <SubmissionsQueue initialSubmissions={submissions ?? []} />
}
