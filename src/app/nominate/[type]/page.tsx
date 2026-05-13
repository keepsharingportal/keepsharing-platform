// Legacy route — redirects to the real submission form at /submit/[type]
// This handles any bookmarked or linked /nominate/teacher etc. URLs.

import { redirect, notFound } from 'next/navigation'

const TYPE_MAP: Record<string, string> = {
  'teacher':          'teacher-of-the-month',
  'play-ball':        'play-ball',
  'grands':           'grands-are-the-greatest',
  'moms':             'mom-to-mom',
  'community':        'student-spotlight',
  'student':          'student-spotlight',
  'school-news':      'school-news',
  'birthday':         'birthday-celebration',
}

interface Props {
  params: Promise<{ type: string }>
}

export default async function NominateTypeRedirect({ params }: Props) {
  const { type } = await params
  const submitType = TYPE_MAP[type]
  if (!submitType) notFound()
  redirect(`/submit/${submitType}`)
}
