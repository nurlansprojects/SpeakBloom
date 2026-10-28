import React from 'react';
import DOMPurify from 'dompurify';

interface RichTextViewProps {
  html: string;
  className?: string;
}

export const RichTextView: React.FC<RichTextViewProps> = ({ html, className = '' }) => {
  if (!html) return null;

  const sanitized = DOMPurify.sanitize(html, {
    ADD_ATTR: ['target', 'rel'],
  });

  return (
    <div
      className={`prose prose-sm max-w-none text-[#1C1530] dark:text-[#f3f0fc] leading-relaxed [&_a]:text-[#6D28D9] [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
};
