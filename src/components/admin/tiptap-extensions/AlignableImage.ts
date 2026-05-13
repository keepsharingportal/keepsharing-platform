// Custom Tiptap image extension that adds alignment and caption attributes.
// Replaces the plain @tiptap/extension-image import in RichArticleEditor.
// Alignment is stored as data-align on the <img> element so ArticleBody
// can render it identically on the public site.

import ImageExt from '@tiptap/extension-image'

export type ImageAlign = 'full' | 'center' | 'left' | 'right'

// Inline styles shown while editing — gives immediate visual feedback.
const EDITOR_STYLES: Record<ImageAlign, string> = {
  full:   'max-width: 100%; display: block; margin: 1.25em 0; border-radius: 8px;',
  center: 'display: block; margin: 1.25em auto; max-width: 75%; border-radius: 8px;',
  left:   'float: left; margin: 0.5em 1.5em 1em 0; max-width: 45%; border-radius: 8px;',
  right:  'float: right; margin: 0.5em 0 1em 1.5em; max-width: 45%; border-radius: 8px;',
}

export const AlignableImage = ImageExt.extend({
  addAttributes() {
    return {
      ...this.parent?.(),

      'data-align': {
        default: 'full' as ImageAlign,
        parseHTML: el => (el.getAttribute('data-align') as ImageAlign) ?? 'full',
        renderHTML: attrs => ({
          'data-align': attrs['data-align'] ?? 'full',
          // Apply inline style so alignment is visible in the editor
          style: EDITOR_STYLES[attrs['data-align'] as ImageAlign ?? 'full'] ?? EDITOR_STYLES.full,
        }),
      },

      'data-caption': {
        default: null as string | null,
        parseHTML: el => el.getAttribute('data-caption') ?? null,
        renderHTML: attrs =>
          attrs['data-caption'] ? { 'data-caption': attrs['data-caption'] } : {},
      },
    }
  },
})
