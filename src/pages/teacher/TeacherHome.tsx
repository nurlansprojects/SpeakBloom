import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { Lesson } from '../../types';
import { Plus, BookOpen, Users, CheckCircle, FileText, ChevronRight, Edit3, Trash2, ArrowUp, ArrowDown, Lock, Unlock } from 'lucide-react';
import { Logo } from '../../components/common/Logo';

export const TeacherHome: React.FC = () => {
  const { profile, firebaseUser } = useAuth();
  const navigate = useNavigate();

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!firebaseUser) return;

    // Fetch Teacher's lessons
    const q = query(
      collection(db, 'lessons'),
      where('teacherId', '==', firebaseUser.uid)
    );

    const unsubscribeLessons = onSnapshot(
      q,
      (snapshot) => {
        const fetched: Lesson[] = [];
        snapshot.forEach((doc) => {
          fetched.push({ id: doc.id, ...doc.data() } as Lesson);
        });
        setLessons(fetched);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'lessons');
        setLoading(false);
      }
    );

    // Fetch real pending review count
    const subQ = query(
      collection(db, 'submissions'),
      where('teacherId', '==', firebaseUser.uid),
      where('status', '==', 'pending')
    );

    const unsubscribeSubs = onSnapshot(
      subQ,
      (snapshot) => {
        setPendingCount(snapshot.size);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'submissions');
      }
    );

    return () => {
      unsubscribeLessons();
      unsubscribeSubs();
    };
  }, [firebaseUser]);

  // Real student count without fake fallback data
  const totalStudents = lessons.reduce((acc, curr) => acc + (curr.studentCount || 0), 0);

  const handleDeleteLesson = async (e: React.MouseEvent, lessonId: string, title: string) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to permanently delete the lesson "${title}"?`)) {
      return;
    }
    try {
      setDeletingId(lessonId);
      await deleteDoc(doc(db, 'lessons', lessonId));
      setLessons((prev) => prev.filter((l) => l.id !== lessonId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `lessons/${lessonId}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleMoveLesson = (e: React.MouseEvent, index: number, direction: 'up' | 'down') => {
    e.stopPropagation();
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= lessons.length) return;

    const newLessons = [...lessons];
    const temp = newLessons[index];
    newLessons[index] = newLessons[targetIndex];
    newLessons[targetIndex] = temp;
    setLessons(newLessons);
  };

  const handleToggleLock = async (e: React.MouseEvent, lesson: Lesson) => {
    e.stopPropagation();
    try {
      await updateDoc(doc(db, 'lessons', lesson.id), {
        isLocked: !lesson.isLocked,
        updatedAt: new Date().toISOString(),
      });
      setLessons((prev) =>
        prev.map((l) => (l.id === lesson.id ? { ...l, isLocked: !lesson.isLocked } : l))
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `lessons/${lesson.id}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Teacher Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#6D28D9] dark:text-[#a78bfa]">
            Teacher
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1C1530] dark:text-white">
            {profile?.displayName || 'Teacher'}
          </h1>
        </div>
      </div>

      {/* Stats Counter Bar - Real Data */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="p-4 bg-white dark:bg-[#18122b] rounded-[18px] border border-[#E6E0F5] dark:border-[#2e234c] text-center shadow-sm">
          <p className="text-2xl sm:text-3xl font-extrabold text-[#1C1530] dark:text-white">
            {lessons.length}
          </p>
          <p className="text-xs text-[#5B5470] dark:text-[#a49cb5] mt-1 font-medium">
            Lessons
          </p>
        </div>

        <div className="p-4 bg-white dark:bg-[#18122b] rounded-[18px] border border-[#E6E0F5] dark:border-[#2e234c] text-center shadow-sm">
          <p className="text-2xl sm:text-3xl font-extrabold text-[#1C1530] dark:text-white">
            {totalStudents}
          </p>
          <p className="text-xs text-[#5B5470] dark:text-[#a49cb5] mt-1 font-medium">
            Students
          </p>
        </div>

        <div
          onClick={() => navigate('/review')}
          className="p-4 bg-[#EDE5FF] dark:bg-[#201838] rounded-[18px] border border-[#d8cff0] dark:border-[#2e234c] text-center shadow-sm cursor-pointer hover:border-[#6D28D9] transition-colors"
        >
          <p className="text-2xl sm:text-3xl font-extrabold text-[#6D28D9] dark:text-[#a78bfa]">
            {pendingCount}
          </p>
          <p className="text-xs text-[#6D28D9] dark:text-[#a78bfa] mt-1 font-semibold">
            To review
          </p>
        </div>
      </div>

      {/* Primary Action Button */}
      <button
        onClick={() => navigate('/create-lesson')}
        className="w-full min-h-[52px] sm:min-h-[44px] flex items-center justify-center gap-2 px-6 py-3.5 bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-semibold text-sm sm:text-base rounded-[14px] shadow-sm hover:shadow transition-all cursor-pointer"
      >
        <Plus size={20} strokeWidth={2} />
        <span>Create new lesson</span>
      </button>

      {/* My Lessons List with Reordering, Editing, and Deletion */}
      <div className="space-y-3 pt-2">
        <h2 className="text-lg font-bold text-[#1C1530] dark:text-white">
          My lessons
        </h2>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-24 bg-white dark:bg-[#18122b] rounded-[18px] animate-pulse border border-[#E6E0F5]"
              />
            ))}
          </div>
        ) : lessons.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-[#18122b] rounded-[18px] border border-[#E6E0F5] dark:border-[#2e234c] space-y-2">
            <BookOpen size={32} className="mx-auto text-[#6D28D9]" />
            <h3 className="font-semibold text-sm">No lessons created yet</h3>
            <p className="text-xs text-[#5B5470]">
              Click "+ Create new lesson" above to create your first lesson.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {lessons.map((lesson, idx) => {
              const isLive = lesson.status === 'published';
              return (
                <div
                  key={lesson.id}
                  onClick={() => navigate(`/edit-lesson/${lesson.id}`)}
                  className="cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white dark:bg-[#18122b] border border-[#E6E0F5] dark:border-[#2e234c] rounded-[18px] hover:border-[#8B5CF6] hover:shadow-sm transition-all gap-3"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Reorder Buttons (Move up/down) */}
                    <div className="flex flex-col gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => handleMoveLesson(e, idx, 'up')}
                        disabled={idx === 0}
                        className="p-1 rounded text-[#5B5470] hover:bg-[#EDE5FF] hover:text-[#6D28D9] disabled:opacity-20 transition-colors"
                        title="Move Up"
                        aria-label="Move Lesson Up"
                      >
                        <ArrowUp size={14} strokeWidth={2.5} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleMoveLesson(e, idx, 'down')}
                        disabled={idx === lessons.length - 1}
                        className="p-1 rounded text-[#5B5470] hover:bg-[#EDE5FF] hover:text-[#6D28D9] disabled:opacity-20 transition-colors"
                        title="Move Down"
                        aria-label="Move Lesson Down"
                      >
                        <ArrowDown size={14} strokeWidth={2.5} />
                      </button>
                    </div>

                    <div className="w-14 h-14 rounded-[14px] bg-[#EDE5FF] dark:bg-[#201838] overflow-hidden flex items-center justify-center shrink-0 border border-[#E6E0F5]">
                      {lesson.thumbnailUrl ? (
                        <img
                          src={lesson.thumbnailUrl}
                          alt={lesson.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Logo size={28} />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-semibold text-[#6D28D9] dark:text-[#a78bfa] block">
                          6 stages
                        </span>
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            isLive
                              ? 'bg-[#EDE5FF] text-[#6D28D9] dark:bg-[#2e1d54] dark:text-[#a78bfa]'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {isLive ? 'Live' : 'Draft'}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            lesson.isLocked
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                          }`}
                        >
                          {lesson.isLocked ? <Lock size={10} /> : <Unlock size={10} />}
                          <span>{lesson.isLocked ? 'Locked' : 'Unlocked'}</span>
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-[#1C1530] dark:text-white truncate mt-0.5">
                        {lesson.title}
                      </h3>
                      <p className="text-xs text-[#5B5470] dark:text-[#a49cb5] truncate">
                        {isLive ? `${lesson.studentCount || 0} students enrolled` : 'Draft in progress'}
                      </p>
                    </div>
                  </div>

                  {/* Actions: Lock toggle, Edit & Delete buttons */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0 self-end sm:self-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={(e) => handleToggleLock(e, lesson)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-[10px] transition-colors ${
                        lesson.isLocked
                          ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                      title={lesson.isLocked ? 'Click to Unlock this lesson' : 'Click to Lock this lesson'}
                    >
                      {lesson.isLocked ? <Lock size={13} /> : <Unlock size={13} />}
                      <span>{lesson.isLocked ? 'Locked' : 'Unlock'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/edit-lesson/${lesson.id}`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#6D28D9] bg-[#EDE5FF] hover:bg-[#d8cff0] rounded-[10px] transition-colors"
                    >
                      <Edit3 size={14} strokeWidth={2} />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteLesson(e, lesson.id, lesson.title)}
                      disabled={deletingId === lesson.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-[10px] transition-colors"
                      title="Delete Lesson"
                    >
                      <Trash2 size={14} strokeWidth={2} />
                      <span>{deletingId === lesson.id ? 'Deleting...' : 'Delete'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
