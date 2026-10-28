import React, { useState } from 'react';
import { QuizQuestion, Activity } from '../../../types';
import { Play, Pause, CheckCircle2, XCircle, ArrowRight, ArrowLeft, RotateCcw, Check } from 'lucide-react';
import { RichTextView } from '../../../components/common/RichTextView';

interface QuizPlayerProps {
  activity: Activity;
  onSubmit: (data: { score: number; status: 'passed' | 'failed'; answers: any }) => Promise<void>;
  submitting: boolean;
}

export const QuizPlayer: React.FC<QuizPlayerProps> = ({ activity, onSubmit, submitting }) => {
  const questions: QuizQuestion[] = activity.settings.questions || [
    {
      id: 'q1',
      type: 'single_choice',
      textHtml: '<p>Which phrase is the most polite when asking for a table at a restaurant?</p>',
      options: [
        'Give me a table for two.',
        'Could we please have a table for two?',
        'I want two seats now.',
        'Where is our table?',
      ],
      correctAnswers: [1],
      points: 10,
      explanation: '"Could we please have..." demonstrates polite request framing.',
      order: 1,
    },
    {
      id: 'q2',
      type: 'true_false',
      textHtml: '<p>In English dining etiquette, saying "Excuse me" is an acceptable way to get the waiter\'s attention.</p>',
      options: ['True', 'False'],
      correctAnswers: [0],
      points: 10,
      explanation: 'Saying "Excuse me" is courteous and universally accepted.',
      order: 2,
    },
    {
      id: 'q3',
      type: 'short_text',
      textHtml: '<p>Complete the sentence: "I would like to order a glass of water, ______."</p>',
      options: ['please'],
      correctAnswers: ['please'],
      points: 10,
      explanation: '"please" completes the polite request.',
      order: 3,
    },
  ];

  const passMark = activity.settings.passMarkPercent || 70;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);

  const currentQ = questions[currentIndex];

  const handleSelectOption = (qId: string, optIndex: number, isMulti: boolean) => {
    if (submitted) return;
    if (isMulti) {
      const current = answers[qId] || [];
      const updated = current.includes(optIndex)
        ? current.filter((i: number) => i !== optIndex)
        : [...current, optIndex];
      setAnswers({ ...answers, [qId]: updated });
    } else {
      setAnswers({ ...answers, [qId]: optIndex });
    }
  };

  const handleTextAnswer = (qId: string, val: string) => {
    setAnswers({ ...answers, [qId]: val });
  };

  const calculateScore = () => {
    let earned = 0;
    let total = 0;

    questions.forEach((q) => {
      total += q.points;
      const userAns = answers[q.id];

      if (q.type === 'single_choice' || q.type === 'true_false') {
        if (userAns !== undefined && q.correctAnswers.includes(userAns)) {
          earned += q.points;
        }
      } else if (q.type === 'multiple_choice') {
        const correctSet = new Set(q.correctAnswers);
        const userSet = new Set(userAns || []);
        if (correctSet.size === userSet.size && [...correctSet].every((x) => userSet.has(x))) {
          earned += q.points;
        }
      } else if (q.type === 'short_text') {
        const clean = (userAns || '').trim().toLowerCase();
        const matches = q.correctAnswers.some((ans) => String(ans).toLowerCase().trim() === clean);
        if (matches) earned += q.points;
      } else {
        if (userAns !== undefined && q.correctAnswers.includes(userAns)) {
          earned += q.points;
        }
      }
    });

    const percent = Math.round((earned / (total || 1)) * 100);
    return percent;
  };

  const handleFinishQuiz = async () => {
    const finalScore = calculateScore();
    setScore(finalScore);
    setSubmitted(true);
    const status = finalScore >= passMark ? 'passed' : 'failed';
    await onSubmit({ score: finalScore, status, answers });
  };

  const handleRetry = () => {
    setAnswers({});
    setSubmitted(false);
    setCurrentIndex(0);
    setScore(0);
  };

  if (submitted) {
    const passed = score >= passMark;
    return (
      <div className="p-8 bg-white dark:bg-[#18122b] rounded-[18px] border border-[#E6E0F5] dark:border-[#2e234c] text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center bg-[#EDE5FF] text-[#6D28D9]">
          {passed ? (
            <CheckCircle2 size={36} strokeWidth={2} />
          ) : (
            <XCircle size={36} strokeWidth={2} className="text-red-500" />
          )}
        </div>

        <div className="space-y-1">
          <h3 className="text-2xl font-extrabold text-[#1C1530] dark:text-white">
            {passed ? 'Quiz Passed' : 'Needs Practice'}
          </h3>
          <p className="text-sm text-[#5B5470] dark:text-[#a49cb5]">
            You scored {score}%. (Pass mark is {passMark}%)
          </p>
        </div>

        {/* Question Review */}
        <div className="text-left space-y-3 pt-4 border-t border-[#E6E0F5] dark:border-[#2e234c]">
          <h4 className="text-xs font-bold uppercase text-[#5B5470] tracking-wider">
            Review Answers
          </h4>
          {questions.map((q, idx) => (
            <div
              key={q.id}
              className="p-3.5 rounded-[14px] bg-[#F7F4FF] dark:bg-[#201838] border border-[#E6E0F5] dark:border-[#2e234c] text-xs space-y-1"
            >
              <p className="font-semibold text-[#1C1530] dark:text-white">
                {idx + 1}. <span dangerouslySetInnerHTML={{ __html: q.textHtml }} />
              </p>
              {q.explanation && (
                <p className="text-[#5B5470]">Note: {q.explanation}</p>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-3 pt-4">
          {!passed && (
            <button
              onClick={handleRetry}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-[14px] border border-[#E6E0F5] text-[#1C1530] dark:text-white hover:bg-[#F7F4FF]"
            >
              <RotateCcw size={14} strokeWidth={2} />
              <span>Retry Quiz</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white dark:bg-[#18122b] rounded-[18px] border border-[#E6E0F5] dark:border-[#2e234c] space-y-6">
      {/* Quiz Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-[#5B5470] font-semibold">
          <span>
            Question {currentIndex + 1} of {questions.length}
          </span>
          <span>{Math.round(((currentIndex + 1) / questions.length) * 100)}%</span>
        </div>
        <div className="w-full bg-[#EDE5FF] h-2 rounded-full overflow-hidden">
          <div
            className="bg-[#6D28D9] h-full rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Current Question */}
      <div className="space-y-4">
        <div className="text-base font-bold text-[#1C1530] dark:text-white leading-relaxed">
          <RichTextView html={currentQ.textHtml} />
        </div>

        {/* Options for Single / Multiple Choice or True/False */}
        {(currentQ.type === 'single_choice' ||
          currentQ.type === 'multiple_choice' ||
          currentQ.type === 'true_false' ||
          currentQ.type === 'audio_question') && (
          <div className="space-y-2.5">
            {currentQ.options.map((option, optIdx) => {
              const isSelected =
                currentQ.type === 'multiple_choice'
                  ? (answers[currentQ.id] || []).includes(optIdx)
                  : answers[currentQ.id] === optIdx;

              return (
                <button
                  key={optIdx}
                  type="button"
                  onClick={() =>
                    handleSelectOption(
                      currentQ.id,
                      optIdx,
                      currentQ.type === 'multiple_choice'
                    )
                  }
                  className={`w-full text-left p-3.5 rounded-[14px] text-sm border transition-all flex items-center justify-between ${
                    isSelected
                      ? 'border-[#6D28D9] bg-[#EDE5FF] dark:bg-[#2e1d54] text-[#6D28D9] dark:text-[#a78bfa] font-semibold'
                      : 'border-[#E6E0F5] dark:border-[#2e234c] bg-white dark:bg-[#18122b] text-[#1C1530] dark:text-white hover:border-[#8B5CF6]'
                  }`}
                >
                  <span>{option}</span>
                  {isSelected && <Check size={16} strokeWidth={2.5} />}
                </button>
              );
            })}
          </div>
        )}

        {/* Short text input */}
        {currentQ.type === 'short_text' && (
          <div className="space-y-2">
            <input
              type="text"
              value={answers[currentQ.id] || ''}
              onChange={(e) => handleTextAnswer(currentQ.id, e.target.value)}
              placeholder="Type your answer here..."
              className="w-full p-3.5 text-sm rounded-[14px] border border-[#E6E0F5] dark:border-[#2e234c] bg-[#F7F4FF] dark:bg-[#201838] focus:outline-none focus:border-[#6D28D9]"
            />
          </div>
        )}
      </div>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-[#E6E0F5] dark:border-[#2e234c]">
        <button
          type="button"
          onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
          disabled={currentIndex === 0}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-[14px] border border-[#E6E0F5] text-[#5B5470] hover:bg-slate-50 disabled:opacity-40"
        >
          <ArrowLeft size={14} strokeWidth={2} />
          <span>Previous</span>
        </button>

        {currentIndex < questions.length - 1 ? (
          <button
            type="button"
            onClick={() => setCurrentIndex((prev) => prev + 1)}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 text-xs font-semibold rounded-[14px] bg-[#6D28D9] text-white hover:bg-[#5B21B6]"
          >
            <span>Next</span>
            <ArrowRight size={14} strokeWidth={2} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFinishQuiz}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-6 py-2.5 text-xs font-semibold rounded-[14px] bg-[#6D28D9] text-white hover:bg-[#5B21B6] disabled:opacity-50"
          >
            <span>{submitting ? 'Grading...' : 'Submit Quiz'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
