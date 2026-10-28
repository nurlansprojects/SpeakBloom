import React, { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Link as LinkIcon, Unlink } from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Write here...',
  className = '',
}) => {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: true },
        orderedList: { keepMarks: true },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer nofollow',
          class: 'text-[#6D28D9] underline',
        },
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'min-h-[100px] p-3 text-sm focus:outline-none text-[#1C1530] dark:text-[#f3f0fc]',
        placeholder,
      },
    },
  });

  if (!editor) {
    return null;
  }

  const handleSetLink = () => {
    let url = linkUrl.trim();
    if (!url) {
      editor.chain().focus().unsetLink().run();
    } else {
      if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
      }
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
    setLinkUrl('');
    setShowLinkInput(false);
  };

  return (
    <div className={`border border-[#E6E0F5] dark:border-[#2e234c] rounded-[14px] bg-white dark:bg-[#18122b] overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 bg-[#F7F4FF] dark:bg-[#201838] border-b border-[#E6E0F5] dark:border-[#2e234c]">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded-lg text-xs font-semibold transition-colors ${
            editor.isActive('bold')
              ? 'bg-[#EDE5FF] text-[#6D28D9]'
              : 'text-[#5B5470] hover:bg-white dark:hover:bg-[#2a1e4a]'
          }`}
          title="Bold"
          aria-label="Bold"
        >
          <Bold size={16} strokeWidth={2} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded-lg text-xs font-semibold transition-colors ${
            editor.isActive('italic')
              ? 'bg-[#EDE5FF] text-[#6D28D9]'
              : 'text-[#5B5470] hover:bg-white dark:hover:bg-[#2a1e4a]'
          }`}
          title="Italic"
          aria-label="Italic"
        >
          <Italic size={16} strokeWidth={2} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-1.5 rounded-lg text-xs font-semibold transition-colors ${
            editor.isActive('underline')
              ? 'bg-[#EDE5FF] text-[#6D28D9]'
              : 'text-[#5B5470] hover:bg-white dark:hover:bg-[#2a1e4a]'
          }`}
          title="Underline"
          aria-label="Underline"
        >
          <UnderlineIcon size={16} strokeWidth={2} />
        </button>

        <span className="w-[1px] h-4 bg-[#E6E0F5] dark:bg-[#2e234c] mx-1" />

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded-lg text-xs font-semibold transition-colors ${
            editor.isActive('bulletList')
              ? 'bg-[#EDE5FF] text-[#6D28D9]'
              : 'text-[#5B5470] hover:bg-white dark:hover:bg-[#2a1e4a]'
          }`}
          title="Bullet List"
          aria-label="Bullet List"
        >
          <List size={16} strokeWidth={2} />
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1.5 rounded-lg text-xs font-semibold transition-colors ${
            editor.isActive('orderedList')
              ? 'bg-[#EDE5FF] text-[#6D28D9]'
              : 'text-[#5B5470] hover:bg-white dark:hover:bg-[#2a1e4a]'
          }`}
          title="Numbered List"
          aria-label="Numbered List"
        >
          <ListOrdered size={16} strokeWidth={2} />
        </button>

        <span className="w-[1px] h-4 bg-[#E6E0F5] dark:bg-[#2e234c] mx-1" />

        <button
          type="button"
          onClick={() => {
            const previousUrl = editor.getAttributes('link').href || '';
            setLinkUrl(previousUrl);
            setShowLinkInput(!showLinkInput);
          }}
          className={`p-1.5 rounded-lg text-xs font-semibold transition-colors ${
            editor.isActive('link')
              ? 'bg-[#EDE5FF] text-[#6D28D9]'
              : 'text-[#5B5470] hover:bg-white dark:hover:bg-[#2a1e4a]'
          }`}
          title="Insert Link"
          aria-label="Insert Link"
        >
          <LinkIcon size={16} strokeWidth={2} />
        </button>

        {editor.isActive('link') && (
          <button
            type="button"
            onClick={() => editor.chain().focus().unsetLink().run()}
            className="p-1.5 rounded-lg text-xs text-[#5B5470] hover:bg-white dark:hover:bg-[#2a1e4a]"
            title="Remove Link"
            aria-label="Remove Link"
          >
            <Unlink size={16} strokeWidth={2} />
          </button>
        )}
      </div>

      {/* Link Input Bar */}
      {showLinkInput && (
        <div className="flex items-center gap-2 p-2 bg-white dark:bg-[#18122b] border-b border-[#E6E0F5] dark:border-[#2e234c]">
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://example.com"
            className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-[#E6E0F5] dark:border-[#2e234c] bg-[#F7F4FF] dark:bg-[#201838] focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSetLink();
              }
            }}
          />
          <button
            type="button"
            onClick={handleSetLink}
            className="px-3 py-1.5 text-xs font-semibold text-white bg-[#6D28D9] rounded-lg hover:bg-[#5B21B6]"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={() => setShowLinkInput(false)}
            className="px-2 py-1.5 text-xs text-[#5B5470]"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Content Editor */}
      <EditorContent editor={editor} />
    </div>
  );
};
