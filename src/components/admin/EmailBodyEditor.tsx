'use client'

// ── EmailBodyEditor ──────────────────────────────────────────────────────────
// A minimal, email-appropriate rich-text editor for lead-magnet delivery
// emails and similar transactional/marketing templates. Wraps TipTap
// (same stack as the article editor and the community email composer)
// but keeps the toolbar tight: bold, italic, underline, lists, link,
// undo/redo — no headings/images/font-family/colors because email
// clients render those inconsistently.
//
// Bonus feature: token quick-inserts. Editors can drop {{first_name}},
// {{party_date}}, or a pre-styled download button linking to
// {{file_url}} with one click instead of typing the token text and
// hoping they spelled it right.
//
// Emits/receives HTML via value/onChange so it's a drop-in replacement
// for a <textarea> that holds email HTML.

import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import LinkExt from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import { useEffect } from 'react'
import {
  Bold, Italic, Underline as UnderlineIcon,
  List, ListOrdered, Link2, Undo2, Redo2, Download,
} from 'lucide-react'

interface Props {
  value:       string
  onChange:    (html: string) => void
  placeholder?: string
  minHeight?:  number
  tokens?:     Array<{ label: string; token: string }>
  /** When set, adds a "Download button" quick-insert that drops a
   *  pre-styled coral CTA linking to {{file_url}}. Perfect for lead
   *  magnet delivery emails. */
  showDownloadButtonInsert?: boolean
}

const DEFAULT_TOKENS = [
  { label: 'First name', token: '{{first_name}}' },
  { label: 'Party date', token: '{{party_date}}' },
  { label: 'File URL',   token: '{{file_url}}'   },
]

// Coral-styled download CTA. Uses inline styles because email clients
// strip <style> blocks and Tailwind classes.
const DOWNLOAD_BUTTON_HTML =
  '<p><a href="{{file_url}}" style="display:inline-block;background:#ff7a59;color:#fff;font-weight:700;padding:10px 18px;border-radius:8px;text-decoration:none;">Download the planner (PDF)</a></p>'

function TBtn({
  onClick, active, disabled, title, children,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick() }}
      disabled={disabled}
      title={title}
      className={[
        'flex items-center justify-center w-8 h-8 rounded text-sm transition-colors',
        active   ? 'bg-slate-800 text-white' : 'text-portal-sub hover:bg-portal-row-hover hover:text-portal-text',
        disabled ? 'opacity-30 cursor-not-allowed'                                        : '',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function Sep() {
  return <span className="w-px h-5 bg-slate-200 mx-1 shrink-0" />
}

function TokenBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick() }}
      className="text-[11px] font-semibold text-portal-blue hover:bg-portal-blue/10 rounded px-2 py-1 transition-colors border border-portal-blue/30 hover:border-portal-blue"
    >
      {label}
    </button>
  )
}

export function EmailBodyEditor({
  value, onChange, placeholder, minHeight = 260,
  tokens = DEFAULT_TOKENS, showDownloadButtonInsert = false,
}: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ link: false, underline: false }),
      Underline,
      LinkExt.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener noreferrer' } }),
      Placeholder.configure({ placeholder: placeholder ?? 'Write your email…' }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: { class: 'email-body-editor-content' },
    },
  })

  // When the parent swaps rows (e.g. clicks a different lead magnet in
  // the list), sync the editor content. Avoids the parent-state and
  // editor-state going out of sync on re-mount.
  useEffect(() => {
    if (!editor) return
    if (editor.getHTML() === value) return
    editor.commands.setContent(value || '', { emitUpdate: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor])

  if (!editor) return null

  function promptLink() {
    const prev = editor?.getAttributes('link').href ?? ''
    const url  = window.prompt('Link URL', prev || 'https://')
    if (url === null) return
    if (url === '') {
      editor?.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  return (
    <div className="rounded-lg border border-portal-border bg-white overflow-hidden">
      {/* Formatting toolbar */}
      <div className="flex items-center gap-1 flex-wrap px-2 py-1.5 border-b border-portal-border bg-slate-50">
        <TBtn active={editor.isActive('bold')}       onClick={() => editor.chain().focus().toggleBold().run()}       title="Bold (⌘/Ctrl+B)"><Bold size={13} /></TBtn>
        <TBtn active={editor.isActive('italic')}     onClick={() => editor.chain().focus().toggleItalic().run()}     title="Italic (⌘/Ctrl+I)"><Italic size={13} /></TBtn>
        <TBtn active={editor.isActive('underline')}  onClick={() => editor.chain().focus().toggleUnderline().run()}  title="Underline"><UnderlineIcon size={13} /></TBtn>
        <Sep />
        <TBtn active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list"><List size={13} /></TBtn>
        <TBtn active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Numbered list"><ListOrdered size={13} /></TBtn>
        <Sep />
        <TBtn active={editor.isActive('link')} onClick={promptLink} title="Link"><Link2 size={13} /></TBtn>
        <Sep />
        <TBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo"><Undo2 size={13} /></TBtn>
        <TBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo"><Redo2 size={13} /></TBtn>
      </div>

      {/* Token quick-inserts — one click drops the token or a pre-styled
          CTA at the cursor position, so editors don't have to type
          {{file_url}} correctly. */}
      <div className="flex items-center gap-2 flex-wrap px-3 py-2 border-b border-portal-border bg-portal-bg">
        <span className="text-[10px] font-bold uppercase tracking-wider text-portal-muted">Insert</span>
        {tokens.map(t => (
          <TokenBtn
            key={t.token}
            label={t.label}
            onClick={() => editor.chain().focus().insertContent(t.token).run()}
          />
        ))}
        {showDownloadButtonInsert && (
          <button
            type="button"
            onMouseDown={e => { e.preventDefault(); editor.chain().focus().insertContent(DOWNLOAD_BUTTON_HTML).run() }}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-white bg-[#ff7a59] hover:bg-[#e86644] rounded px-2 py-1 transition-colors"
          >
            <Download size={11} /> Download button
          </button>
        )}
      </div>

      {/* Editing surface */}
      <div style={{ minHeight }} className="px-4 py-3">
        <EditorContent editor={editor} />
      </div>

      {/* Editor styling — email-appropriate defaults so what she sees
          resembles what will render in an inbox. Placeholder pattern
          matches other admin editors. */}
      <style jsx global>{`
        .email-body-editor-content {
          outline: none;
          font-size: 14px;
          line-height: 1.6;
          color: #0f172a;
          min-height: 240px;
        }
        .email-body-editor-content p { margin: 0 0 0.9rem 0; }
        .email-body-editor-content p:last-child { margin-bottom: 0; }
        .email-body-editor-content a { color: #ff7a59; text-decoration: underline; }
        .email-body-editor-content ul,
        .email-body-editor-content ol { padding-left: 1.25rem; margin: 0 0 0.9rem 0; }
        .email-body-editor-content ul li { list-style: disc; }
        .email-body-editor-content ol li { list-style: decimal; }
        .email-body-editor-content strong { font-weight: 700; }
        .email-body-editor-content em { font-style: italic; }
        .email-body-editor-content p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: #94a3b8;
          float: left;
          height: 0;
          pointer-events: none;
        }
      `}</style>
    </div>
  )
}
