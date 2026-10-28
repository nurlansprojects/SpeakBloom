import React, { useState } from 'react';
import { Activity } from '../../../types';
import { Send, AlertCircle } from 'lucide-react';

interface TextResponsePlayerProps {
  activity: Activity;
  onSubmit: (data: { textAnswer: string }) => Promise<void>;
  submitting: boolean;
}

export const TextResponsePlayer: React.FC<TextResponsePlayerProps> = ({
  activity,
  onSubmit,
  submitting,
}) => {
  const [text, setText] = useState('');

  const minWords = activity.settings.minWordCount || 10;
  const maxWords = activity.settings.maxWordCount || 250;

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;

  const isValid = wordCount >= minWords && wordCount <= maxWords;

  const handleSubmit = async () => {
    if (!isValid) return;
    await onSubmit({ textAnswer: text.trim() });
  };

  return (
    <div className="p-6 bg-white dark:bg-[#18122b] rounded-[18px] border border-[#E6E0F5] dark:border-[#2e234c] space-y-4">
      <div className="space-y-1">
        <h3 className="text-base font-bold text-[#1C1530] dark:text-white">
          Written Reflection & Analysis
        </h3>
        <p className="text-xs text-[#5B5470] dark:text-[#a49cb5]">
          Please write your answer clearly in English. Minimum {minWords} words, maximum {maxWords} words.
        </p>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        placeholder="Type your spoken preparation or written analysis here..."
        className="w-full p-4 text-sm rounded-[14px] border border-[#E6E0F5] dark:border-[#2e234c] bg-[#F7F4FF] dark:bg-[#201838] focus:outline-none focus:border-[#6D28D9] leading-relaxed text-[#1C1530] dark:text-[#f3f0fc]"
      />

      {/* Counters & Validations */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#5B5470] pt-1">
        <div className="flex items-center gap-3">
          <span className={wordCount < minWords || wordCount > maxWords ? 'text-amber-600 font-semibold' : 'text-[#6D28D9] font-semibold'}>
            {wordCount} words
          </span>
          <span>·</span>
          <span>{charCount} characters</span>
        </div>

        {wordCount < minWords && (
          <span className="text-amber-600">
            Write at least {minWords - wordCount} more word{minWords - wordCount === 1 ? '' : 's'}
          </span>
        )}

        {wordCount > maxWords && (
          <span className="text-red-500">
            Exceeds maximum by {wordCount - maxWords} word{wordCount - maxWords === 1 ? '' : 's'}
          </span>
        )}
      </div>

      <div className="flex justify-end pt-3 border-t border-[#E6E0F5] dark:border-[#2e234c]">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || !isValid}
          className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#6D28D9] hover:bg-[#5B21B6] rounded-[14px] disabled:opacity-50 transition-all cursor-pointer"
        >
          <Send size={16} strokeWidth={2} />
          <span>{submitting ? 'Submitting...' : 'Submit Answer'}</span>
        </button>
      </div>
    </div>
  );
};
