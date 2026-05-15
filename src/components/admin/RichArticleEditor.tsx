'use client'

import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { AlignableImage, type ImageAlign } from './tiptap-extensions/AlignableImage'
import LinkExt from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import { useState, useCallback, useRef } from 'react'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, Quote, Link2, Image as ImageIcon,
  Undo2, Redo2, Type, Heading2, Heading3,
  Upload, AlignCenter, AlignLeft, AlignRight, Maximize2,
  RefreshCw, Minus, Code,
} from 'lucide-react'

// Markdown → HTML: lives in shared lib so ArticleBody (server component) can use it too.
export { markdownToHtml } from '@/lib/markdown-to-html'
import { markdownToHtml } from '@/lib/markdown-to-html'

// ── Toolbar button ────────────────────────────────────────────────────────────

function ToolBtn({
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
        'flex items-center justify-center w-8 h-8 rounded transition-colors text-sm',
        active   ? 'bg-gray-800 text-white'                         : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
        disabled ? 'opacity-25 cursor-not-allowed pointer-events-none' : '',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function Sep() {
  return <span className="w-px h-5 bg-gray-200 mx-1 shrink-0" />
}

// ── Inline URL popover (link / image) ─────────────────────────────────────────

function UrlInput({
  placeholder,
  value,
  onChange,
  onConfirm,
  onCancel,
  confirmLabel = 'Insert',
}: {
  placeholder: string
  value: string
  onChange: (v: string) => void
  onConfirm: () => void
  onCancel: () => void
  confirmLabel?: string
}) {
  return (
    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-200">
      <input
        autoFocus
        type="url"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); onConfirm() }
          if (e.key === 'Escape') onCancel()
        }}
        placeholder={placeholder}
        className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-blue-400 bg-white min-w-0"
      />
      <button
        type="button"
        onClick={onConfirm}
        className="shrink-0 px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        {confirmLabel}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="shrink-0 px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
      >
        Cancel
      </button>
    </div>
  )
}

// ── Toolbar ───────────────────────────────────────────────────────────────────

const ALIGN_OPTIONS: { value: ImageAlign; label: string; Icon: React.ElementType }[] = [
  { value: 'full',   label: 'Full width', Icon: Maximize2   },
  { value: 'center', label: 'Center',     Icon: AlignCenter },
  { value: 'left',   label: 'Float left', Icon: AlignLeft   },
  { value: 'right',  label: 'Float right',Icon: AlignRight  },
]

function Toolbar({ editor, onSetHero }: { editor: Editor; onSetHero?: (url: string) => void }) {
  const [linkUrl, setLinkUrl]   = useState('')
  const [showLink, setShowLink] = useState(false)

  const [showImage, setShowImage]         = useState(false)
  const [imageMode, setImageMode]         = useState<'url' | 'upload'>('url')
  const [imageUrl, setImageUrl]           = useState('')
  const [imageAlt, setImageAlt]           = useState('')
  const [imageCaption, setImageCaption]   = useState('')
  const [imageAlign, setImageAlign]       = useState<ImageAlign>('full')
  const [uploading, setUploading]         = useState(false)
  const [uploadError, setUploadError]     = useState<string | null>(null)
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const insertLink = useCallback(() => {
    const url = linkUrl.trim()
    if (!url) {
      editor.chain().focus().unsetLink().run()
    } else {
      editor.chain().focus().setLink({ href: url, target: '_blank', rel: 'noopener noreferrer' }).run()
    }
    setLinkUrl('')
    setShowLink(false)
  }, [editor, linkUrl])

  const resetImage = useCallback(() => {
    setImageUrl(''); setImageAlt(''); setImageCaption('')
    setImageAlign('full'); setImageMode('url')
    setUploadedPreview(null); setUploadError(null)
    setShowImage(false)
  }, [])

  const insertImage = useCallback(() => {
    const url = imageUrl.trim()
    if (!url) { resetImage(); return }
    // Insert via insertContent so custom attributes are applied
    editor.chain().focus().insertContent({
      type: 'image',
      attrs: {
        src:            url,
        alt:            imageAlt.trim() || null,
        'data-align':   imageAlign,
        'data-caption': imageCaption.trim() || null,
      },
    }).run()
    // Italic caption paragraph below image
    if (imageCaption.trim()) {
      editor.chain().insertContent(`<p><em>${imageCaption.trim()}</em></p>`).run()
    }
    resetImage()
  }, [editor, imageUrl, imageAlt, imageCaption, imageAlign, resetImage])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError(null)
    setUploadedPreview(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('context', 'article')
      const res  = await fetch('/api/admin/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) {
        setUploadError(json.error ?? `Upload failed (${res.status})`)
      } else {
        setImageUrl(json.url)
        setUploadedPreview(json.url)
        if (!imageAlt) setImageAlt(file.name.replace(/\.[^.]+$/, ''))
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setUploading(false)
      // Reset file input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const openLink = () => {
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run()
      return
    }
    setShowImage(false)
    setShowLink(v => !v)
  }

  const openImage = () => {
    setShowLink(false)
    setShowImage(v => !v)
  }

  return (
    <div className="border-b border-gray-200 bg-gray-50/95 backdrop-blur-sm px-3 py-2 rounded-t-lg sticky top-0 z-20 shadow-sm">
      <div className="flex items-center flex-wrap gap-0.5">
        {/* Block type */}
        <ToolBtn onClick={() => editor.chain().focus().setParagraph().run()} active={editor.isActive('paragraph')} title="Paragraph">
          <Type size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })} title="Heading 2">
          <Heading2 size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })} title="Heading 3">
          <Heading3 size={14} />
        </ToolBtn>

        <Sep />

        {/* Inline formatting */}
        <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold (Ctrl+B)">
          <Bold size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic (Ctrl+I)">
          <Italic size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline (Ctrl+U)">
          <UnderlineIcon size={14} />
        </ToolBtn>

        <Sep />

        {/* Lists */}
        <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')} title="Bullet List">
          <List size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numbered List">
          <ListOrdered size={14} />
        </ToolBtn>

        <Sep />

        {/* Block elements */}
        <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Blockquote / Pull Quote">
          <Quote size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal Divider">
          <Minus size={14} />
        </ToolBtn>

        <Sep />

        {/* Inline extras */}
        <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">
          <Strikethrough size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Inline Code">
          <Code size={14} />
        </ToolBtn>

        <Sep />

        {/* Link & Image */}
        <ToolBtn onClick={openLink} active={editor.isActive('link') || showLink} title="Insert / Remove Link">
          <Link2 size={14} />
        </ToolBtn>
        <ToolBtn onClick={openImage} active={showImage} title="Insert Image by URL">
          <ImageIcon size={14} />
        </ToolBtn>

        <Sep />

        {/* History */}
        <ToolBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo (Ctrl+Z)">
          <Undo2 size={14} />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo (Ctrl+Y)">
          <Redo2 size={14} />
        </ToolBtn>
      </div>

      {showLink && (
        <UrlInput
          placeholder="https://..."
          value={linkUrl}
          onChange={setLinkUrl}
          onConfirm={insertLink}
          onCancel={() => setShowLink(false)}
          confirmLabel={editor.isActive('link') ? 'Update' : 'Insert Link'}
        />
      )}

      {showImage && (
        <div className="mt-2 pt-3 border-t border-gray-200 space-y-3 bg-gray-50 rounded-b-lg p-3 -mx-3 -mb-2">
          {/* Hidden file input */}
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
            className="hidden" onChange={handleFileChange} />

          {/* Mode toggle */}
          <div className="flex gap-1.5">
            <button type="button" onClick={() => setImageMode('url')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${imageMode === 'url' ? 'bg-white border border-blue-400 text-blue-700 shadow-sm' : 'text-gray-500 hover:bg-white border border-gray-200'}`}>
              <Link2 size={11} /> Paste URL
            </button>
            <button type="button" onClick={() => setImageMode('upload')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${imageMode === 'upload' ? 'bg-white border border-blue-400 text-blue-700 shadow-sm' : 'text-gray-500 hover:bg-white border border-gray-200'}`}>
              <Upload size={11} /> Upload File
            </button>
          </div>

          {/* URL mode */}
          {imageMode === 'url' && (
            <input autoFocus type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); insertImage() } if (e.key === 'Escape') resetImage() }}
              placeholder="Image URL: https://..."
              className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-blue-400 bg-white" />
          )}

          {/* Upload mode */}
          {imageMode === 'upload' && (
            <div>
              {uploadedPreview ? (
                /* Uploaded — show preview */
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={uploadedPreview} alt="preview" className="w-16 h-16 rounded-lg object-cover border border-gray-200" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-green-700">✓ Uploaded</p>
                    <p className="text-[11px] text-gray-500 truncate">{uploadedPreview.split('/').pop()}</p>
                    <button type="button" onClick={() => fileInputRef.current?.click()}
                      className="text-[11px] text-blue-600 hover:underline mt-1">Replace image</button>
                  </div>
                </div>
              ) : (
                /* Not yet uploaded */
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                  className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-white transition-colors disabled:opacity-50">
                  {uploading
                    ? <><RefreshCw size={14} className="animate-spin" /> Optimising &amp; uploading…</>
                    : <><Upload size={14} /> Click to choose an image (max 15 MB)</>}
                </button>
              )}
              {uploadError && (
                <p className="text-xs text-red-600 mt-1.5">{uploadError}</p>
              )}
            </div>
          )}

          {/* Alt + Caption */}
          <div className="flex gap-2">
            <input type="text" value={imageAlt} onChange={e => setImageAlt(e.target.value)}
              placeholder="Alt text (describe image for accessibility)"
              className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-blue-400 bg-white" />
            <input type="text" value={imageCaption} onChange={e => setImageCaption(e.target.value)}
              placeholder="Caption (optional)"
              className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-blue-400 bg-white" />
          </div>

          {/* Alignment picker */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-gray-500 shrink-0">Alignment:</span>
            <div className="flex gap-1">
              {ALIGN_OPTIONS.map(({ value, label, Icon }) => (
                <button key={value} type="button" onClick={() => setImageAlign(value)}
                  title={label}
                  className={`flex items-center justify-center w-7 h-7 rounded transition-colors ${imageAlign === value ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-100'}`}>
                  <Icon size={12} />
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap">
            <button type="button" onClick={insertImage} disabled={!imageUrl.trim()}
              className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors">
              Insert Image
            </button>
            {onSetHero && imageUrl.trim() && (
              <button type="button" onClick={() => { onSetHero(imageUrl.trim()); resetImage() }}
                className="px-3 py-1.5 text-xs font-semibold border border-blue-300 text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                Set as Hero Image
              </button>
            )}
            <button type="button" onClick={resetImage}
              className="px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg text-gray-600 hover:bg-white transition-colors ml-auto">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

interface Props {
  initialContent: string
  onChange: (html: string) => void
  placeholder?: string
  onSetHero?: (url: string) => void
}

export function RichArticleEditor({ initialContent, onChange, placeholder = 'Start writing…', onSetHero }: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      // StarterKit v3 includes Link and Underline — disable to avoid duplicate names.
      StarterKit.configure({ link: false, underline: false }),
      Underline,
      AlignableImage.configure({ inline: false, allowBase64: false }),
      LinkExt.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder }),
    ],
    content: markdownToHtml(initialContent),
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'rich-editor-content',
      },
    },
  })

  if (!editor) return null

  return (
    <>
      {/* No overflow-hidden on this wrapper — it breaks the toolbar's
          sticky positioning inside scroll containers. The toolbar handles
          its own rounded-top corners, and EditorContent stays within the
          rounded outer border without needing overflow clipping. */}
      <div className="border border-gray-200 rounded-lg bg-white">
        <Toolbar editor={editor} onSetHero={onSetHero} />
        <EditorContent editor={editor} />
      </div>
      <style>{`
        .rich-editor-content {
          min-height: 520px;
          padding: 2rem 2.5rem;
          font-size: 17px;
          line-height: 1.75;
          color: #1c1c1e;
          outline: none;
          font-family: Georgia, 'Times New Roman', serif;
        }
        .rich-editor-content p { margin: 0 0 1.1em; }
        .rich-editor-content p:last-child { margin-bottom: 0; }
        .rich-editor-content h2 {
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 1.55em;
          font-weight: 700;
          color: #111;
          margin: 1.6em 0 0.5em;
          line-height: 1.2;
        }
        .rich-editor-content h3 {
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 1.2em;
          font-weight: 700;
          color: #111;
          margin: 1.4em 0 0.4em;
          line-height: 1.3;
        }
        .rich-editor-content strong { font-weight: 700; }
        .rich-editor-content em { font-style: italic; }
        .rich-editor-content u { text-decoration: underline; }
        .rich-editor-content a { color: #2563eb; text-decoration: underline; cursor: pointer; }
        .rich-editor-content ul {
          list-style: disc;
          margin: 0.75em 0 0.75em 1.75em;
          padding: 0;
        }
        .rich-editor-content ol {
          list-style: decimal;
          margin: 0.75em 0 0.75em 1.75em;
          padding: 0;
        }
        .rich-editor-content li { margin-bottom: 0.35em; }
        .rich-editor-content blockquote {
          border-left: 4px solid #d1d5db;
          margin: 1.75em 0;
          padding: 0.6em 0 0.6em 1.25em;
          color: #555;
          font-style: italic;
          background: #f9fafb;
          border-radius: 0 8px 8px 0;
        }
        .rich-editor-content img {
          max-width: 100%;
          height: auto;
          border-radius: 8px;
          margin: 1.5em auto;
          display: block;
          box-shadow: 0 1px 4px rgba(0,0,0,0.08);
        }
        .rich-editor-content .ProseMirror-selectednode img {
          outline: 3px solid #2563eb;
          outline-offset: 2px;
        }
        .rich-editor-content p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #9ca3af;
          pointer-events: none;
          height: 0;
          font-style: italic;
          font-family: system-ui, sans-serif;
        }
        .rich-editor-content hr {
          border: none;
          border-top: 2px solid #e5e7eb;
          margin: 2em 0;
        }
        .rich-editor-content s { text-decoration: line-through; color: #9ca3af; }
        .rich-editor-content code {
          font-family: 'Fira Mono', 'Consolas', monospace;
          font-size: 0.87em;
          background: #f3f4f6;
          color: #be185d;
          padding: 0.1em 0.4em;
          border-radius: 4px;
        }
      `}</style>
    </>
  )
}
