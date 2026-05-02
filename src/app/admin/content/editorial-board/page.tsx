// Editorial board component was removed in BR#16 redesign
// TODO: rebuild using new design system
function EditorialBoardClient() { return <p className="p-8 text-gray-500">Editorial board view — coming soon after BR#16 redesign.</p> }

export const metadata = { title: 'Editorial Board — KeepSharing Admin' }

export default function EditorialBoardPage() {
  return <EditorialBoardClient />
}
