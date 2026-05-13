import { redirect } from 'next/navigation'

// /guides is not the canonical URL — /local-guides is.
// Redirect any inbound links or stale bookmarks to the correct location.
export default function GuidesRedirect() {
  redirect('/local-guides')
}
