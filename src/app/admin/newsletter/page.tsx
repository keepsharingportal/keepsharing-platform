import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import { NewsletterList } from './NewsletterList'

export const metadata: Metadata = { title: 'Newsletter Subscribers — Admin' }

export default async function NewsletterAdminPage() {
  const supabase = await createClient()

  const [{ data: subscribers }, { count }] = await Promise.all([
    supabase
      .from('newsletter_subscribers')
      .select('id, email, first_name, source, tags, ghl_contact_id, subscribed_at, is_subscribed')
      .eq('is_subscribed', true)
      .order('subscribed_at', { ascending: false })
      .limit(200),
    supabase
      .from('newsletter_subscribers')
      .select('*', { count: 'exact', head: true })
      .eq('is_subscribed', true),
  ])

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="bg-white border-b border-portal-border px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-portal-text">Newsletter Subscribers</h1>
          <p className="text-sm text-portal-sub mt-0.5">{count?.toLocaleString() ?? 0} active subscribers</p>
        </div>
      </div>
      <div className="p-6">
        {(!subscribers || subscribers.length === 0) ? (
          <div className="bg-white rounded-xl border border-portal-border p-12 text-center">
            <p className="text-portal-muted">No subscribers yet. Forms are live — they'll appear here as people sign up.</p>
          </div>
        ) : (
          <NewsletterList subscribers={subscribers} />
        )}
      </div>
    </div>
  )
}
