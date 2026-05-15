// /blogger-portal/posts/new
// New-post canvas. Server component verifies session + finds the blogger
// row, then hands off to the client editor.

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { BloggerPostEditor } from '../BloggerPostEditor'

export const metadata = { title: 'New Post — Blogger Portal' }
export const dynamic  = 'force-dynamic'

export default async function NewBloggerPostPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/blogger-portal/login')

  const admin = createAdminClient()
  const { data: blogger } = await admin
    .from('bloggers')
    .select('id, display_name')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!blogger) redirect('/blogger-portal')

  return (
    <BloggerPostEditor
      mode="create"
      bloggerId={blogger.id}
      bloggerName={blogger.display_name}
      initial={{
        title:          '',
        subtitle:       '',
        excerpt:        '',
        body:           '',
        hero_image_url: '',
        published:      false,
        published_at:   null,
        slug:           '',
      }}
    />
  )
}
