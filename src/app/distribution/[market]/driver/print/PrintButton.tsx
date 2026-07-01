'use client'

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      style={{ padding: '10px 20px', background: '#1E3A5F', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
    >
      🖨 Print this sheet
    </button>
  )
}
