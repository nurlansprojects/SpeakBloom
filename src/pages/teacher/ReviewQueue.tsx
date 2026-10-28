import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { Submission, SubmissionStatus } from '../../types';
import { Check, RotateCcw, Play, Pause, FileText, CheckCircle, Bot, Mic, Sparkles } from 'lucide-react';

export const ReviewQueue: React.FC = () => {
  const { firebaseUser, profile, isAdmin } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'revise'>('pending');
  const [processing, setProcessing] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!firebaseUser) return;

    const baseQuery = isAdmin
      ? query(collection(db, 'submissions'), where('status', '==', statusFilter))
      : query(
          collection(db, 'submissions'),
          where('teacherId', '==', firebaseUser.uid),
          where('status', '==', statusFilter)
        );

    const unsubscribe = onSnapshot(
      baseQuery,
      (snapshot) => {
        const list: Submission[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as Submission);
        });
        setSubmissions(list);
        if (list.length > 0 && !selectedSub) {
          setSelectedSub(list[0]);
          setFeedbackText(list[0].teacherFeedback || '');
        } else if (list.length === 0) {
          setSelectedSub(null);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'submissions');
      }
    );

    return () => unsubscribe();
  }, [firebaseUser, statusFilter, isAdmin]);

  const handleSelectSubmission = (sub: Submission) => {
    setSelectedSub(sub);
    setFeedbackText(sub.teacherFeedback || '');
    if (isPlayingAudio && audioEl) {
      audioEl.pause();
      setIsPlayingAudio(false);
    }
  };

  const handleUpdateStatus = async (newStatus: 'approved' | 'revise') => {
    if (!selectedSub) return;
    try {
      setProcessing(true);
      const subRef = doc(db, 'submissions', selectedSub.id);
      await updateDoc(subRef, {
        status: newStatus,
        teacherFeedback: feedbackText.trim(),
        reviewedAt: new Date().toISOString(),
      });

      // Send in-app notification to student
      try {
        await addDoc(collection(db, 'notifications'), {
          recipientId: selectedSub.studentId,
          title: newStatus === 'approved' ? 'Activity Approved!' : 'Revision Requested',
          body: `Your teacher reviewed your Level ${selectedSub.bloomLevel} submission for "${selectedSub.lessonTitle}". Feedback: ${feedbackText.trim() || 'Well done!'}`,
          type: 'review',
          link: `/lessons/${selectedSub.lessonId}`,
          read: false,
          createdAt: new Date().toISOString(),
        });
      } catch (e) {
        console.warn('Student notification notice:', e);
      }

      setFeedbackText('');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `submissions/${selectedSub.id}`);
    } finally {
      setProcessing(false);
    }
  };

  const toggleAudio = (url: string) => {
    if (isPlayingAudio && audioEl) {
      audioEl.pause();
      setIsPlayingAudio(false);
    } else {
      const p = new Audio(url);
      p.onended = () => setIsPlayingAudio(false);
      p.play();
      setAudioEl(p);
      setIsPlayingAudio(true);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header (Matches PDF Page 6) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1C1530] dark:text-white">
            Review
          </h1>
          <p className="text-sm text-[#5B5470] dark:text-[#a49cb5] mt-0.5">
            Check student submissions manually.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center p-1 bg-white dark:bg-[#18122b] rounded-[14px] border border-[#E6E0F5] dark:border-[#2e234c]">
          {(['pending', 'approved', 'revise'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-[10px] capitalize transition-colors ${
                statusFilter === st
                  ? 'bg-[#6D28D9] text-white shadow-sm'
                  : 'text-[#5B5470] hover:text-[#1C1530]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Main Review Area: Two / Three Panes on Desktop (Matches PDF Page 6) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Submissions List Pane (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#5B5470]">
            Queue ({submissions.length})
          </h2>

          {submissions.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-[#18122b] rounded-[18px] border border-[#E6E0F5] dark:border-[#2e234c]">
              <p className="text-xs text-[#5B5470]">No submissions in this status.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[70vh] overflow-y-auto">
              {submissions.map((sub) => {
                const isSelected = selectedSub?.id === sub.id;
                return (
                  <div
                    key={sub.id}
                    onClick={() => handleSelectSubmission(sub)}
                    className={`cursor-pointer p-4 rounded-[18px] border transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-[#EDE5FF]/60 dark:bg-[#2e1d54]/40 border-[#6D28D9]'
                        : 'bg-white dark:bg-[#18122b] border-[#E6E0F5] dark:border-[#2e234c] hover:border-[#8B5CF6]'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-[11px] font-bold text-[#6D28D9] block">
                        {sub.bloomLevel} · Level {sub.bloomLevel}
                      </span>
                      <h3 className="text-sm font-bold text-[#1C1530] dark:text-white truncate">
                        {sub.studentName}
                      </h3>
                      <p className="text-xs text-[#5B5470] dark:text-[#a49cb5] truncate">
                        {sub.lessonTitle} · {sub.type.replace('_', ' ')}
                      </p>
                    </div>

                    <span
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                        sub.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-700'
                          : sub.status === 'revise'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-[#EDE5FF] text-[#6D28D9]'
                      }`}
                    >
                      {sub.status === 'pending' ? 'Pending' : sub.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Active Submission Pane (7 cols on lg) - Matches PDF Page 6 */}
        <div className="lg:col-span-7">
          {selectedSub ? (
            <div className="p-6 bg-white dark:bg-[#18122b] rounded-[18px] border border-[#E6E0F5] dark:border-[#2e234c] shadow-sm space-y-6">
              {/* Header Info */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-[#1C1530] dark:text-white">
                    {selectedSub.studentName}
                  </h3>
                  <p className="text-xs text-[#5B5470] mt-0.5">
                    {selectedSub.lessonTitle}
                  </p>
                </div>
                <span className="px-3 py-1 text-xs font-bold rounded-full bg-[#EDE5FF] text-[#6D28D9]">
                  {selectedSub.bloomLevel} · Level {selectedSub.bloomLevel}
                </span>
              </div>

              {/* Submission Content Display */}
              <div className="p-4 bg-[#F7F4FF] dark:bg-[#201838] rounded-[14px] border border-[#E6E0F5] dark:border-[#2e234c] space-y-3">
                {/* Audio Recording preview */}
                {selectedSub.audioUrl && (
                  <div className="flex items-center justify-between p-3 bg-white dark:bg-[#18122b] rounded-[10px]">
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <Mic size={16} className="text-[#6D28D9]" />
                      <span>Student Voice Recording</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleAudio(selectedSub.audioUrl!)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#6D28D9] bg-[#EDE5FF] rounded-lg"
                    >
                      {isPlayingAudio ? <Pause size={14} /> : <Play size={14} />}
                      <span>{isPlayingAudio ? 'Pause' : 'Play Audio'}</span>
                    </button>
                  </div>
                )}

                {/* File Upload preview */}
                {selectedSub.files && selectedSub.files.length > 0 && (
                  <div className="space-y-2">
                    {selectedSub.files.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-white dark:bg-[#18122b] rounded-[10px]"
                      >
                        <div className="flex items-center gap-2 text-xs font-semibold truncate">
                          <FileText size={16} className="text-[#6D28D9] shrink-0" />
                          <span className="truncate">{file.name}</span>
                        </div>
                        <a
                          href={file.url}
                          download={file.name}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold text-[#6D28D9] hover:underline shrink-0 pl-2"
                        >
                          Download
                        </a>
                      </div>
                    ))}
                  </div>
                )}

                {/* Text Response preview */}
                {selectedSub.textAnswer && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold text-[#5B5470] uppercase">
                      Student Answer
                    </span>
                    <p className="text-xs text-[#1C1530] dark:text-white leading-relaxed p-3 bg-white dark:bg-[#18122b] rounded-[10px]">
                      {selectedSub.textAnswer}
                    </p>
                  </div>
                )}

                {/* AI Transcript & Advisory Feedback */}
                {selectedSub.transcript && (
                  <div className="space-y-1 pt-1">
                    <span className="text-[11px] font-bold text-[#5B5470] uppercase">
                      AI Conversation Transcript
                    </span>
                    <pre className="text-xs text-[#5B5470] font-sans whitespace-pre-wrap p-3 bg-white dark:bg-[#18122b] rounded-[10px] max-h-40 overflow-y-auto">
                      {selectedSub.transcript}
                    </pre>
                  </div>
                )}

                {/* AI Advisory Notes */}
                {selectedSub.aiFeedback && (
                  <div className="p-3 bg-purple-50/70 dark:bg-purple-950/20 rounded-[10px] text-xs space-y-1">
                    <span className="font-bold text-[#6D28D9] flex items-center gap-1">
                      <Sparkles size={14} />
                      <span>AI Advisory Notes (Not a grade)</span>
                    </span>
                    <p className="text-[#5B5470]">
                      Fluency estimate: {selectedSub.aiFeedback.fluency || 85}%
                    </p>
                    {selectedSub.aiFeedback.summary && (
                      <p className="text-[#5B5470]">{selectedSub.aiFeedback.summary}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Feedback Input (Matches PDF Page 6: "Write feedback...") */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#5B5470]">
                  Teacher Feedback
                </label>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Write feedback for the student..."
                  rows={3}
                  className="w-full p-3.5 text-xs sm:text-sm rounded-[14px] bg-[#F7F4FF] dark:bg-[#201838] border border-[#E6E0F5] dark:border-[#2e234c] focus:outline-none focus:border-[#6D28D9]"
                />
              </div>

              {/* Action Buttons: "Revise" & "Approve" (Matches PDF Page 6) */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleUpdateStatus('revise')}
                  disabled={processing}
                  className="flex-1 min-h-[52px] sm:min-h-[44px] inline-flex items-center justify-center gap-2 text-sm font-bold text-[#1C1530] dark:text-white bg-white dark:bg-[#18122b] border border-[#E6E0F5] dark:border-[#2e234c] hover:bg-slate-50 rounded-[14px] transition-colors"
                >
                  <RotateCcw size={16} strokeWidth={2} />
                  <span>Revise</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleUpdateStatus('approved')}
                  disabled={processing}
                  className="flex-1 min-h-[52px] sm:min-h-[44px] inline-flex items-center justify-center gap-2 text-sm font-bold text-white bg-[#6D28D9] hover:bg-[#5B21B6] rounded-[14px] shadow-sm transition-colors"
                >
                  <Check size={16} strokeWidth={2} />
                  <span>Approve</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-white dark:bg-[#18122b] rounded-[18px] border border-[#E6E0F5] dark:border-[#2e234c]">
              <p className="text-xs text-[#5B5470]">
                Select a submission from the queue to review and grade.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
