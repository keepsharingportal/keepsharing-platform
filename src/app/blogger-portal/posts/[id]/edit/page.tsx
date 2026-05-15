// /blogger-portal/posts/[id]/edit
// Edit one of the logged-in blogger's posts. Server component checks
// ownership via author_blogger_id before rendering the editor.

import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { BloggerPostEditor } from '../../BloggerPostEditor'

export const metadata = { title: 'Edit Post — Blogger Portal' }
export const dynamic  = 'force-dynamic'

interface Props { params: Promise<{ id: string }> }

export default async function EditBloggerPostPage({ params }: Props) {
  const { id }   = await params
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

  const { data: post } = await admin
    .from('guide_articles')
    .select('id, title, subtitle, excerpt, body, hero_image_url, published, published_at, slug, author_blogger_id')
    .eq('id', id)
    .maybeSingle()

  if (!post)                                 notFound()
  if (post.author_blogger_id !== blogger.id) notFound()

  return (
    <BloggerPostEditor
      mode="edit"
      bloggerId={blogger.id}
      bloggerName={blogger.display_name}
      initial={{
        id:             post.id as string,
        title:          (post.title          as string) ?? '',
        subtitle:       (post.subtitle       as string) ?? '',
        excerpt:        (post.excerpt        as string) ?? '',
        body:           (post.body           as string) ?? '',
        hero_image_url: (post.hero_image_url as string) ?? '',
        published:      !!post.published,
        published_at:   (post.published_at as string | null) ?? null,
        slug:           (post.slug as string) ?? '',
      }}
    />
  )
}
