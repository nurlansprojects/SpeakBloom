import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import {
  Lesson,
  Activity,
  BloomLevelNumber,
  BLOOM_LEVELS,
  ACTIVITY_TYPES,
} from '../../types';
import {
  BookOpen,
  Search,
  Lock,
  Unlock,
  Edit3,
  Trash2,
  ChevronDown,
  ChevronUp,
  Plus,
  Layers,
  AlertCircle,
  ExternalLink,
  Shield,
  Filter,
} from 'lucide-react';
import { Logo } from '../../components/common/Logo';
import { ActivityIcon } from '../../components/common/ActivityIcon';

export const AdminLessons: React.FC = () => {
  const { role, profile } = useAuth();
  const navigate = useNavigate();

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [stagesMap, setStagesMap] = useState<Record<string, Activity[]>>({});
  const [expandedLessonId, setExpandedLessonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStages, setLoadingStages] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLock, setFilterLock] = useState<'all' | 'locked' | 'unlocked'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft'>('all');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  useEffect(() => {
    // Realtime listen to ALL lessons across the entire platform
    const lessonsRef = collection(db, 'lessons');
    const unsubscribe = onSnapshot(
      lessonsRef,
      (snapshot) => {
        const list: Lesson[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as Lesson);
        });
        // Sort newest first
        list.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
        setLessons(list);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'lessons');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Fetch 6 stages for a specific lesson when expanded
  const loadStagesForLesson = async (lessonId: string) => {
    if (stagesMap[lessonId]) return;
    try {
      setLoadingStages(lessonId);
      const actsSnap = await getDocs(collection(db, 'lessons', lessonId, 'activities'));
      const list: Activity[] = [];
      actsSnap.forEach((d) => {
        list.push({ id: d.id, ...d.data() } as Activity);
      });
      list.sort((a, b) => a.bloomLevel - b.bloomLevel);
      setStagesMap((prev) => ({ ...prev, [lessonId]: list }));
    } catch (err) {
      console.error('Error fetching stages:', err);
    } finally {
      setLoadingStages(null);
    }
  };

  const toggleExpand = (lessonId: string) => {
    if (expandedLessonId === lessonId) {
      setExpandedLessonId(null);
    } else {
      setExpandedLessonId(lessonId);
      loadStagesForLesson(lessonId);
    }
  };

  // Admin toggles lock on entire lesson
  const handleToggleLessonLock = async (lesson: Lesson) => {
    const newLockState = !lesson.isLocked;
    try {
      setActionInProgress(lesson.id);
      await updateDoc(doc(db, 'lessons', lesson.id), {
        isLocked: newLockState,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `lessons/${lesson.id}`);
    } finally {
      setActionInProgress(null);
    }
  };

  // Admin toggles lock on individual stage (Bloom level 1-6)
  const handleToggleStageLock = async (lessonId: string, stage: Activity) => {
    const newLockState = !stage.isLocked;
    const stageKey = `${lessonId}_${stage.id}`;
    try {
      setActionInProgress(stageKey);
      await updateDoc(doc(db, 'lessons', lessonId, 'activities', stage.id), {
        isLocked: newLockState,
      });

      // Update local stage map immediately for snappy UI
      setStagesMap((prev) => ({
        ...prev,
        [lessonId]: (prev[lessonId] || []).map((s) =>
          s.id === stage.id ? { ...s, isLocked: newLockState } : s
        ),
      }));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `lessons/${lessonId}/activities/${stage.id}`);
    } finally {
      setActionInProgress(null);
    }
  };

  // Admin deletes any lesson
  const handleDeleteLesson = async (lesson: Lesson) => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete "${lesson.title}" by teacher "${lesson.teacherName || 'Unknown'}"? This action cannot be undone.`
      )
    ) {
      return;
    }
    try {
      setActionInProgress(lesson.id);
      // Clean up activities subcollection
      try {
        const actsSnap = await getDocs(collection(db, 'lessons', lesson.id, 'activities'));
        const deleteTasks = actsSnap.docs.map((d) => deleteDoc(d.ref));
        await Promise.all(deleteTasks);
      } catch (e) {
        console.warn('Notice cleaning up subcollections:', e);
      }

      await deleteDoc(doc(db, 'lessons', lesson.id));
      setLessons((prev) => prev.filter((l) => l.id !== lesson.id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `lessons/${lesson.id}`);
    } finally {
      setActionInProgress(null);
    }
  };

  const filteredLessons = lessons.filter((lesson) => {
    const matchesSearch =
      lesson.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lesson.teacherName && lesson.teacherName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesLock =
      filterLock === 'all'
        ? true
        : filterLock === 'locked'
        ? !!lesson.isLocked
        : !lesson.isLocked;

    const matchesStatus =
      filterStatus === 'all'
        ? true
        : filterStatus === 'published'
        ? lesson.status === 'published'
        : lesson.status === 'draft';

    return matchesSearch && matchesLock && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#6D28D9] dark:text-[#a78bfa] flex items-center gap-1">
              <Shield size={14} /> Admin Portal
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1C1530] dark:text-white mt-1">
            Manage All Lessons & Stages
          </h1>
          <p className="text-xs sm:text-sm text-[#5B5470] dark:text-[#a49cb5] mt-1">
            Oversee lessons from all teachers. Edit content, reorder 6 Bloom's Taxonomy stages, and toggle stage or lesson access locks.
          </p>
        </div>

        <button
          onClick={() => navigate('/create-lesson')}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-semibold text-sm rounded-[14px] shadow-sm transition-all shrink-0 cursor-pointer"
        >
          <Plus size={18} strokeWidth={2} />
          <span>New Lesson</span>
        </button>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5B5470]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by lesson title or teacher name..."
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-[14px] bg-white dark:bg-[#18122b] border border-[#E6E0F5] dark:border-[#2e234c] focus:outline-none focus:border-[#8B5CF6]"
          />
        </div>

        {/* Lock Filter */}
        <div className="flex items-center p-1 bg-white dark:bg-[#18122b] border border-[#E6E0F5] dark:border-[#2e234c] rounded-[14px]">
          {(['all', 'unlocked', 'locked'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilterLock(mode)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-[10px] capitalize transition-colors ${
                filterLock === mode
                  ? 'bg-[#6D28D9] text-white'
                  : 'text-[#5B5470] hover:text-[#1C1530]'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex items-center p-1 bg-white dark:bg-[#18122b] border border-[#E6E0F5] dark:border-[#2e234c] rounded-[14px]">
          {(['all', 'published', 'draft'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-[10px] capitalize transition-colors ${
                filterStatus === st
                  ? 'bg-[#6D28D9] text-white'
                  : 'text-[#5B5470] hover:text-[#1C1530]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Lessons List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-28 bg-white dark:bg-[#18122b] rounded-[18px] border border-[#E6E0F5] animate-pulse"
            />
          ))}
        </div>
      ) : filteredLessons.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#18122b] rounded-[18px] border border-[#E6E0F5] dark:border-[#2e234c] space-y-3">
          <BookOpen size={36} className="mx-auto text-[#6D28D9]" />
          <h3 className="text-base font-semibold text-[#1C1530] dark:text-white">
            No lessons found
          </h3>
          <p className="text-xs text-[#5B5470] max-w-sm mx-auto">
            {lessons.length === 0
              ? 'No teachers have created lessons yet. You can create the first lesson above.'
              : 'Try clearing your search query or filter selection.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredLessons.map((lesson) => {
            const isExpanded = expandedLessonId === lesson.id;
            const stages = stagesMap[lesson.id] || [];
            const isLessonLocked = !!lesson.isLocked;
            const isLive = lesson.status === 'published';

            return (
              <div
                key={lesson.id}
                className="bg-white dark:bg-[#18122b] border border-[#E6E0F5] dark:border-[#2e234c] rounded-[18px] overflow-hidden shadow-sm transition-all"
              >
                {/* Main Lesson Summary Row */}
                <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Left: Thumbnail & Details */}
                  <div className="flex items-center gap-3.5 min-w-0">
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
                        {/* Live/Draft Badge */}
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            isLive
                              ? 'bg-[#EDE5FF] text-[#6D28D9] dark:bg-[#2e1d54] dark:text-[#a78bfa]'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {isLive ? 'Live' : 'Draft'}
                        </span>

                        {/* Lock Status Badge */}
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            isLessonLocked
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                          }`}
                        >
                          {isLessonLocked ? <Lock size={10} /> : <Unlock size={10} />}
                          <span>{isLessonLocked ? 'Locked' : 'Unlocked'}</span>
                        </span>

                        <span className="text-[11px] font-semibold text-[#6D28D9] dark:text-[#a78bfa]">
                          6 Bloom stages
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-[#1C1530] dark:text-white truncate mt-1">
                        {lesson.title}
                      </h3>

                      <p className="text-xs text-[#5B5470] dark:text-[#a49cb5] truncate">
                        Teacher: <span className="font-semibold">{lesson.teacherName || 'Unknown'}</span>
                        {lesson.updatedAt && ` · Updated ${new Date(lesson.updatedAt).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>

                  {/* Right Actions: Lock Toggle, Edit, Delete, Expand Stages */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {/* Toggle Lesson Lock */}
                    <button
                      type="button"
                      onClick={() => handleToggleLessonLock(lesson)}
                      disabled={actionInProgress === lesson.id}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[12px] transition-colors ${
                        isLessonLocked
                          ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 dark:bg-amber-950/50 dark:text-amber-300'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                      }`}
                      title={isLessonLocked ? 'Click to Unlock Lesson' : 'Click to Lock Lesson'}
                    >
                      {isLessonLocked ? <Lock size={13} /> : <Unlock size={13} />}
                      <span>{isLessonLocked ? 'Unlock Lesson' : 'Lock Lesson'}</span>
                    </button>

                    {/* Edit Lesson */}
                    <button
                      type="button"
                      onClick={() => navigate(`/edit-lesson/${lesson.id}`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#6D28D9] bg-[#EDE5FF] hover:bg-[#d8cff0] rounded-[12px] transition-colors"
                      title="Edit this Lesson and its Stages"
                    >
                      <Edit3 size={13} />
                      <span>Edit</span>
                    </button>

                    {/* Delete Lesson */}
                    <button
                      type="button"
                      onClick={() => handleDeleteLesson(lesson)}
                      disabled={actionInProgress === lesson.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-[12px] transition-colors"
                      title="Permanently Delete Lesson"
                    >
                      <Trash2 size={13} />
                      <span>Delete</span>
                    </button>

                    {/* View/Manage 6 Stages Expand Button */}
                    <button
                      type="button"
                      onClick={() => toggleExpand(lesson.id)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#5B5470] hover:text-[#1C1530] bg-slate-50 dark:bg-[#201838] border border-[#E6E0F5] dark:border-[#2e234c] rounded-[12px] transition-colors"
                    >
                      <Layers size={13} />
                      <span>Manage Stages</span>
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>
                </div>

                {/* Expanded Stages Section */}
                {isExpanded && (
                  <div className="border-t border-[#E6E0F5] dark:border-[#2e234c] bg-[#FAF8FF] dark:bg-[#150f26] p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between pb-1">
                      <div className="flex items-center gap-2">
                        <Layers size={16} className="text-[#6D28D9]" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[#6D28D9] dark:text-[#a78bfa]">
                          6 Bloom's Taxonomy Stages
                        </h4>
                      </div>
                      <span className="text-xs text-[#5B5470]">
                        Lock or unlock individual stages for students
                      </span>
                    </div>

                    {loadingStages === lesson.id ? (
                      <div className="space-y-2 py-4">
                        {[1, 2, 3].map((n) => (
                          <div key={n} className="h-14 bg-white dark:bg-[#18122b] rounded-[12px] animate-pulse" />
                        ))}
                      </div>
                    ) : stages.length === 0 ? (
                      <div className="p-4 bg-white dark:bg-[#18122b] rounded-[12px] border border-[#E6E0F5] text-xs text-[#5B5470] text-center">
                        Stages have not been explicitly initialized for this lesson yet. Open in editor to generate all 6 Bloom stages.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {stages.map((stage) => {
                          const lvlInfo = BLOOM_LEVELS[stage.bloomLevel];
                          const typeMeta = ACTIVITY_TYPES[stage.type];
                          const isStageLocked = !!stage.isLocked;
                          const stageBusy = actionInProgress === `${lesson.id}_${stage.id}`;

                          return (
                            <div
                              key={stage.id}
                              className={`p-3.5 rounded-[14px] border transition-all flex items-center justify-between gap-3 ${
                                isStageLocked
                                  ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40'
                                  : 'bg-white dark:bg-[#18122b] border-[#E6E0F5] dark:border-[#2e234c]'
                              }`}
                            >
                              {/* Left: Icon & Title */}
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 ${
                                    isStageLocked
                                      ? 'bg-amber-100 text-amber-700'
                                      : 'bg-[#EDE5FF] dark:bg-[#201838] text-[#6D28D9] dark:text-[#a78bfa]'
                                  }`}
                                >
                                  <ActivityIcon type={stage.type} size={18} />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-bold text-[#6D28D9] dark:text-[#a78bfa]">
                                      Stage {stage.bloomLevel}: {lvlInfo?.name}
                                    </span>
                                    {isStageLocked && (
                                      <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-amber-200 text-amber-900">
                                        Locked
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs font-semibold text-[#1C1530] dark:text-white truncate">
                                    {stage.title}
                                  </p>
                                  <p className="text-[10px] text-[#5B5470] dark:text-[#a49cb5] truncate">
                                    {typeMeta?.label}
                                  </p>
                                </div>
                              </div>

                              {/* Right: Stage Lock Toggle Button */}
                              <button
                                type="button"
                                onClick={() => handleToggleStageLock(lesson.id, stage)}
                                disabled={stageBusy}
                                className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-[8px] transition-colors ${
                                  isStageLocked
                                    ? 'bg-amber-200 hover:bg-amber-300 text-amber-900'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                }`}
                                title={isStageLocked ? 'Unlock this Stage for students' : 'Lock this Stage'}
                              >
                                {isStageLocked ? <Lock size={11} /> : <Unlock size={11} />}
                                <span>{isStageLocked ? 'Locked' : 'Unlock'}</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
