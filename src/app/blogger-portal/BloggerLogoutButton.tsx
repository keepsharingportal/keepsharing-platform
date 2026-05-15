'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LogOut, RefreshCw } from 'lucide-react'

export function BloggerLogoutButton() {
  const router        = useRouter()
  const [busy, setBusy] = useState(false)

  async function signOut() {
    setBusy(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/blogger-portal/login')
    router.refresh()
  }

  return (
    <button
      onClick={signOut}
      disabled={busy}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-gray-200 bg-white rounded-lg hover:bg-gray-50 text-gray-700 disabled:opacity-50"
    >
      {busy ? <RefreshCw size={11} className="animate-spin" /> : <LogOut size={11} />}
      Sign out
    </button>
  )
}
