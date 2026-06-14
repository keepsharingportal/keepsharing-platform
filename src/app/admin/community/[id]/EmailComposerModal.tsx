'use client'

// Full-screen modal with a real WYSIWYG email editor. Replaces the
// inline HTML textarea that used to live on the OutreachComposerPanel.
//
// Design vocabulary: Ads & Sponsors page. White panel, portal-app
// tokens only, no inline-styled grays.

import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit                                from '@tiptap/starter-kit'
import LinkExt                                   from '@tiptap/extension-link'
import Underline                                 from '@tiptap/extension-underline'
import Placeholder                               from '@tiptap/extension-placeholder'
import { useEffect, useState, useCallback }      from 'react'
import {
  X, Bold, Italic, Underline as UnderlineIcon,
  List, ListOrdered, Link2, Undo2, Redo2,
  Loader2, Send, AlertTriangle,
} from 'lucide-react'

interface Props {
  open:            boolean
  onClose:         () => void
  /** Title of the modal — e.g. "Outreach to nominee" or "Interview invite" */
  title:           string
  /** What the Send button says — e.g. "Approve & send email" */
  sendLabel:       string
  initialTo:       string
  initialSubject:  string
  /** Initial body in HTML. Editor renders it as rich text — the
   *  recipient sees the HTML, but the editor never sees HTML markup. */
  initialBodyHtml: string
  /** Called when editor clicks Send. The container handles the actual
   *  API call + phase advancement. */
  onSend: (payload: { to: string; subject: string; bodyHtml: string }) => Promise<void>
}

export function EmailComposerModal({
  open, onClose, title, sendLabel,
  initialTo, initialSubject, initialBodyHtml,
  onSend,
}: Props) {
  const [to,      setTo]      = useState(initialTo)
  const [subject, setSubject] = useState(initialSubject)
  const [busy,    setBusy]    = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      // StarterKit v3 ships Link + Underline — disable to avoid the
      // "duplicate extension name" warning, we add our own below.
      StarterKit.configure({ link: false, underline: false }),
      Underline,
      LinkExt.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder: 'Write your email…' }),
    ],
    content: initialBodyHtml,
    editorProps: {
      attributes: { class: 'email-editor-content' },
    },
  })

  // Sync initialTo/Subject/Body when the modal re-opens for a different submission.
  useEffect(() => {
    if (!open) return
    setTo(initialTo)
    setSubject(initialSubject)
    setError(null)
    editor?.commands.setContent(initialBodyHtml || '')
  }, [open, initialTo, initialSubject, initialBodyHtml, editor])

  // ESC to close.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !busy) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, busy, onClose])

  if (!open) return null

  async function handleSend() {
    if (!to.trim())      { setError('Add a recipient before sending.'); return }
    if (!subject.trim()) { setError('Subject can\'t be empty.'); return }
    const bodyHtml = editor?.getHTML() ?? ''
    if (!bodyHtml.trim() || bodyHtml === '<p></p>') { setError('Body can\'t be empty.'); return }
    setBusy(true); setError(null)
    try {
      await onSend({ to: to.trim(), subject: subject.trim(), bodyHtml })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Send failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(15, 23, 42, 0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
      onClick={() => !busy && onClose()}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 760, maxHeight: '88vh',
          background: 'white',
          borderRadius: 12,
          boxShadow: '0 24px 48px -12px rgba(15, 23, 42, 0.35)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >

        {/* ── Header ─────────────────────────────────────────────── */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--color-portal-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
          background: 'white',
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-portal-text)' }}>
            {title}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            style={{
              background: 'none', border: 'none',
              padding: 4, cursor: 'pointer',
              color: 'var(--color-portal-sub)',
              borderRadius: 4,
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Scrollable body ────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20, background: 'var(--color-portal-bg)' }}>

          {error && (
            <div className="alert alert-error" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <AlertTriangle size={12} /> {error}
            </div>
          )}

          {/* To + Subject fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
            <Field label="To">
              <input
                type="email"
                value={to}
                onChange={e => setTo(e.target.value)}
                placeholder="nominee@example.com"
                style={inputStyle}
              />
            </Field>
            <Field label="Subject">
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                style={inputStyle}
              />
            </Field>
          </div>

          {/* WYSIWYG body — editor never sees raw HTML */}
          <Field label="Message">
            <div style={{
              border: '1.5px solid var(--color-portal-border)',
              borderRadius: 8,
              background: 'white',
              overflow: 'hidden',
            }}>
              {editor && <Toolbar editor={editor} />}
              <EditorContent editor={editor} />
            </div>
          </Field>

        </div>

        {/* ── Footer ─────────────────────────────────────────────── */}
        <div style={{
          padding: '14px 20px',
          borderTop: '1px solid var(--color-portal-border)',
          background: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 8, flexShrink: 0,
        }}>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            style={btnGhost}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={busy}
            style={busy ? { ...btnPrimary, opacity: 0.7, cursor: 'wait' } : btnPrimary}
          >
            {busy
              ? <><Loader2 size={14} className="animate-spin" /><span>Sending…</span></>
              : <><Send size={14} /><span>{sendLabel}</span></>}
          </button>
        </div>
      </div>

      {/* Tiptap content styles — kept colocated so the editor looks
          right without a global stylesheet dependency. */}
      <style>{`
        .email-editor-content {
          min-height: 280px;
          max-height: 50vh;
          overflow-y: auto;
          padding: 14px 18px;
          font-size: 14px;
          line-height: 1.6;
          color: var(--color-portal-text);
          outline: none;
          font-family: system-ui, -apple-system, sans-serif;
        }
        .email-editor-content p { margin: 0 0 0.85em; }
        .email-editor-content p:last-child { margin-bottom: 0; }
        .email-editor-content strong { font-weight: 700; }
        .email-editor-content em { font-style: italic; }
        .email-editor-content u { text-decoration: underline; }
        .email-editor-content a { color: var(--color-portal-blue); text-decoration: underline; }
        .email-editor-content ul, .email-editor-content ol {
          margin: 0.6em 0 0.6em 1.5em;
          padding: 0;
        }
        .email-editor-content ul { list-style: disc; }
        .email-editor-content ol { list-style: decimal; }
        .email-editor-content li { margin-bottom: 0.25em; }
        .email-editor-content blockquote {
          border-left: 3px solid var(--color-portal-blue);
          margin: 1em 0;
          padding: 0.4em 0 0.4em 1em;
          color: var(--color-portal-sub);
          font-style: italic;
        }
        .email-editor-content p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: var(--color-portal-muted);
          pointer-events: none;
          height: 0;
          font-style: italic;
        }
      `}</style>
    </div>
  )
}

// ── Subcomponents ─────────────────────────────────────────────────────────────

function Toolbar({ editor }: { editor: Editor }) {
  const [linkUrl, setLinkUrl]   = useState('')
  const [showLink, setShowLink] = useState(false)

  const insertLink = useCallback(() => {
    const url = linkUrl.trim()
    if (!url) {
      editor.chain().focus().unsetLink().run()
    } else {
      editor.chain().focus().setLink({ href: url, target: '_blank', rel: 'noopener noreferrer' }).run()
    }
    setLinkUrl(''); setShowLink(false)
  }, [editor, linkUrl])

  return (
    <div style={{
      borderBottom: '1px solid var(--color-portal-border)',
      background: 'var(--color-portal-bg)',
      padding: '6px 8px',
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
        <TBtn active={editor.isActive('bold')}      onClick={() => editor.chain().focus().toggleBold().run()}      title="Bold"><Bold size={13} /></TBtn>
        <TBtn active={editor.isActive('italic')}    onClick={() => editor.chain().focus().toggleItalic().run()}    title="Italic"><Italic size={13} /></TBtn>
        <TBtn active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline"><UnderlineIcon size={13} /></TBtn>
        <Sep />
        <TBtn active={editor.isActive('bulletList')}  onClick={() => editor.chain().focus().toggleBulletList().run()}  title="Bulleted list"><List size={13} /></TBtn>
        <TBtn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list"><ListOrdered size={13} /></TBtn>
        <Sep />
        <TBtn active={editor.isActive('link') || showLink}
              onClick={() => {
                if (editor.isActive('link')) {
                  editor.chain().focus().unsetLink().run()
                } else {
                  setShowLink(v => !v)
                }
              }}
              title="Insert link"><Link2 size={13} /></TBtn>
        <Sep />
        <TBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo"><Undo2 size={13} /></TBtn>
        <TBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo"><Redo2 size={13} /></TBtn>
      </div>

      {showLink && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 6, borderTop: '1px solid var(--color-portal-border)' }}>
          <input
            autoFocus
            type="url"
            value={linkUrl}
            onChange={e => setLinkUrl(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter')  { e.preventDefault(); insertLink() }
              if (e.key === 'Escape') setShowLink(false)
            }}
            placeholder="https://…"
            style={{ ...inputStyle, fontSize: 12, padding: '6px 8px', flex: 1 }}
          />
          <button type="button" onClick={insertLink}
            style={{ padding: '6px 12px', background: 'var(--color-portal-navy)', color: 'white', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
            Insert
          </button>
          <button type="button" onClick={() => setShowLink(false)}
            style={{ padding: '6px 12px', background: 'none', color: 'var(--color-portal-sub)', border: '1px solid var(--color-portal-border)', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}

function TBtn({
  onClick, active, disabled, title, children,
}: {
  onClick:   () => void
  active?:   boolean
  disabled?: boolean
  title:     string
  children:  React.ReactNode
}) {
  return (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick() }}
      disabled={disabled}
      title={title}
      style={{
        width: 28, height: 28,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: active ? 'var(--color-portal-navy)' : 'transparent',
        color: active ? 'white' : 'var(--color-portal-sub)',
        border: 'none', borderRadius: 4,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.3 : 1,
        transition: 'background-color 120ms',
      }}
    >
      {children}
    </button>
  )
}

function Sep() {
  return <span style={{ display: 'inline-block', width: 1, height: 18, background: 'var(--color-portal-border)', margin: '0 4px' }} />
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{
        display: 'block',
        fontSize: 10, fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '.5px',
        color: 'var(--color-portal-sub)',
        marginBottom: 4,
      }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: '1.5px solid var(--color-portal-border)',
  borderRadius: 6,
  fontSize: 13,
  fontFamily: 'inherit',
  background: 'white',
  outline: 'none',
  color: 'var(--color-portal-text)',
}

const btnPrimary: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '9px 18px',
  background: 'var(--color-portal-navy)',
  color: 'white',
  border: 'none', borderRadius: 8,
  fontSize: 13, fontWeight: 700,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}

const btnGhost: React.CSSProperties = {
  padding: '9px 14px',
  background: 'white',
  color: 'var(--color-portal-sub)',
  border: '1px solid var(--color-portal-border)',
  borderRadius: 8,
  fontSize: 13, fontWeight: 600,
  cursor: 'pointer',
}
