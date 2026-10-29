import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import {
  Lesson,
  Activity,
  BloomLevelNumber,
  BLOOM_LEVELS,
  ACTIVITY_TYPES,
  Submission,
} from '../../types';
import { ChevronLeft, Lock, Check, Download, AlertCircle } from 'lucide-react';
import { RichTextView } from '../../components/common/RichTextView';
import { ActivityIcon } from '../../components/common/ActivityIcon';
import { resolveFileUrl } from '../../firebase/storageService';
import { FileCard } from '../../components/common/FileCard';
import { LessonComments } from '../../components/lessons/LessonComments';

export const LessonDetail: React.FC = () => {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const { firebaseUser, role, isAdmin } = useAuth();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [submissions, setSubmissions] = useState<Record<BloomLevelNumber, Submission | null>>({
    1: null,
    2: null,
    3: null,
    4: null,
    5: null,
    6: null,
  });
  const [loading, setLoading] = useState(true);
  const [downloadingAll, setDownloadingAll] = useState(false);

  useEffect(() => {
    if (!lessonId) return;

    // Fetch Lesson
    const lessonRef = doc(db, 'lessons', lessonId);
    const unsubscribeLesson = onSnapshot(
      lessonRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setLesson({ id: docSnap.id, ...docSnap.data() } as Lesson);
        }
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `lessons/${lessonId}`);
        setLoading(false);
      }
    );

    // Fetch Activities
    const activitiesRef = collection(db, 'lessons', lessonId, 'activities');
    const actQuery = query(activitiesRef, orderBy('bloomLevel', 'asc'));
    const unsubscribeActivities = onSnapshot(
      actQuery,
      (snapshot) => {
        const list: Activity[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as Activity);
        });
        setActivities(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, `lessons/${lessonId}/activities`);
      }
    );

    // Fetch Student Submissions if student is signed in
    let unsubscribeSubmissions: (() => void) | null = null;
    if (firebaseUser) {
      const subsRef = collection(db, 'submissions');
      const subsQuery = query(
        subsRef,
        where('lessonId', '==', lessonId),
        where('studentId', '==', firebaseUser.uid)
      );

      unsubscribeSubmissions = onSnapshot(
        subsQuery,
        (snapshot) => {
          const map: Record<BloomLevelNumber, Submission | null> = {
            1: null,
            2: null,
            3: null,
            4: null,
            5: null,
            6: null,
          };
          snapshot.forEach((d) => {
            const data = { id: d.id, ...d.data() } as Submission;
            map[data.bloomLevel] = data;
          });
          setSubmissions(map);
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, 'submissions');
        }
      );
    }

    return () => {
      unsubscribeLesson();
      unsubscribeActivities();
      if (unsubscribeSubmissions) unsubscribeSubmissions();
    };
  }, [lessonId, firebaseUser]);

  if (loading) {
    return (
      <div className="space-y-4 max-w-3xl mx-auto py-8">
        <div className="h-8 w-32 bg-white dark:bg-[#18122b] rounded-lg animate-pulse" />
        <div className="h-48 bg-white dark:bg-[#18122b] rounded-[18px] animate-pulse" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="p-8 text-center max-w-md mx-auto space-y-4">
        <AlertCircle size={40} className="mx-auto text-red-500" />
        <h2 className="text-lg font-bold">Lesson not found</h2>
        <button
          onClick={() => navigate('/lessons')}
          className="px-4 py-2 text-xs font-semibold text-white bg-[#6D28D9] rounded-[14px]"
        >
          Back to Lessons
        </button>
      </div>
    );
  }

  // Calculate completed count
  const completedCount = ([1, 2, 3, 4, 5, 6] as BloomLevelNumber[]).filter((level) => {
    const sub = submissions[level];
    return sub && (sub.status === 'approved' || sub.status === 'passed' || sub.status === 'pending');
  }).length;

  const getActivityStatus = (level: BloomLevelNumber) => {
    const sub = submissions[level];
    if (sub) {
      if (sub.status === 'approved' || sub.status === 'passed') return 'done';
      if (sub.status === 'pending') return 'pending';
      if (sub.status === 'revise') return 'revise';
      return 'in_progress';
    }

    // Unlock logic: Level 1 is always unlocked. Level N unlocks if Level N-1 is submitted/passed
    if (level === 1 || lesson.unlockMode === 'open') return 'start';

    const previousSub = submissions[(level - 1) as BloomLevelNumber];
    if (previousSub && ['approved', 'passed', 'pending'].includes(previousSub.status)) {
      return 'start';
    }

    return 'locked';
  };

  const handleDownloadAll = async () => {
    if (!lesson.files || lesson.files.length === 0) return;
    try {
      setDownloadingAll(true);
      // Trigger individual downloads for attached files
      for (const f of lesson.files) {
        if (f.downloadUrl) {
          const actionableUrl = await resolveFileUrl(f.downloadUrl);
          const a = document.createElement('a');
          a.href = actionableUrl;
          a.download = f.displayName || f.originalFileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          await new Promise((r) => setTimeout(r, 400));
        }
      }
    } finally {
      setDownloadingAll(false);
    }
  };

  const allLevels: BloomLevelNumber[] = [1, 2, 3, 4, 5, 6];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top back navigation (Matches PDF Page 3) */}
      <button
        onClick={() => navigate('/lessons')}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#6D28D9] dark:text-[#a78bfa] hover:underline cursor-pointer"
      >
        <ChevronLeft size={18} strokeWidth={2} />
        <span>Lessons</span>
      </button>

      {/* 16:9 Thumbnail Header if available */}
      {lesson.thumbnailUrl && (
        <div className="w-full aspect-video rounded-[18px] overflow-hidden border border-[#E6E0F5] dark:border-[#2e234c] shadow-sm">
          <img
            src={lesson.thumbnailUrl}
            alt={lesson.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Lesson Header Title & Overview */}
      <div className="space-y-3">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1C1530] dark:text-white">
          {lesson.title}
        </h1>
        {lesson.descriptionHtml && (
          <RichTextView
            html={lesson.descriptionHtml}
            className="text-sm sm:text-base text-[#5B5470] dark:text-[#a49cb5]"
          />
        )}
      </div>

      {/* Attached Lesson Files Section */}
      {lesson.files && lesson.files.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#1C1530] dark:text-white">
              Lesson Files ({lesson.files.length})
            </h2>
            {lesson.files.length >= 2 && (
              <button
                onClick={handleDownloadAll}
                disabled={downloadingAll}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#6D28D9] bg-[#EDE5FF] hover:bg-[#d8cff0] rounded-[10px] transition-colors"
              >
                <Download size={14} strokeWidth={2} />
                <span>{downloadingAll ? 'Downloading...' : 'Download all'}</span>
              </button>
            )}
          </div>
          <div className="space-y-2.5">
            {lesson.files.map((file) => (
              <FileCard key={file.fileId} file={file} />
            ))}
          </div>
        </div>
      )}

      {/* Bloom Activities Section (Matches PDF Page 3) */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#1C1530] dark:text-white">
            Bloom activities
          </h2>
          <span className="text-sm font-semibold text-[#6D28D9] dark:text-[#a78bfa]">
            {completedCount} / 6
          </span>
        </div>

        {/* 6 Numbered Activities Stack */}
        <div className="space-y-3">
          {allLevels.map((lvl) => {
            const activity = activities.find((a) => a.bloomLevel === lvl);
            const status = getActivityStatus(lvl);
            const isLocked = status === 'locked';

            return (
              <div
                key={lvl}
                onClick={() => {
                  if (!isLocked && activity) {
                    navigate(`/lessons/${lesson.id}/activity/${activity.id}`);
                  }
                }}
                className={`flex items-center justify-between p-4 rounded-[18px] border transition-all ${
                  isLocked
                    ? 'bg-slate-50/60 dark:bg-[#18122b]/50 border-slate-200/60 dark:border-[#2e234c]/60 opacity-70 cursor-not-allowed'
                    : 'bg-white dark:bg-[#18122b] border-[#E6E0F5] dark:border-[#2e234c] hover:border-[#8B5CF6] hover:shadow-sm cursor-pointer'
                }`}
              >
                {/* Left: Line Icon & Level Details */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0 ${
                      isLocked
                        ? 'bg-slate-100 dark:bg-[#201838] text-slate-400'
                        : 'bg-[#EDE5FF] dark:bg-[#201838] text-[#6D28D9] dark:text-[#a78bfa]'
                    }`}
                  >
                    {activity ? (
                      <ActivityIcon type={activity.type} size={22} strokeWidth={1.8} />
                    ) : (
                      <span className="font-bold text-sm">{lvl}</span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] font-semibold text-[#6D28D9] dark:text-[#a78bfa] block">
                      {lvl} · {BLOOM_LEVELS[lvl].name}
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-[#1C1530] dark:text-white truncate">
                      {activity?.title || `${BLOOM_LEVELS[lvl].name} Activity`}
                    </h3>
                    <p className="text-xs text-[#5B5470] dark:text-[#a49cb5] truncate">
                      {activity
                        ? ACTIVITY_TYPES[activity.type]?.label
                        : BLOOM_LEVELS[lvl].tagline}
                    </p>
                  </div>
                </div>

                {/* Right: State Pill */}
                <div className="shrink-0 pl-3">
                  {status === 'done' && (
                    <span className="px-3 py-1.5 text-xs font-semibold rounded-full bg-[#EDE5FF] text-[#6D28D9] dark:bg-[#2e1d54] dark:text-[#a78bfa] inline-flex items-center gap-1">
                      <Check size={14} strokeWidth={2.5} />
                      <span>Done</span>
                    </span>
                  )}

                  {status === 'pending' && (
                    <span className="px-3 py-1.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                      Pending
                    </span>
                  )}

                  {status === 'revise' && (
                    <span className="px-3 py-1.5 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                      Revise
                    </span>
                  )}

                  {status === 'start' && (
                    <span className="px-3.5 py-1.5 text-xs font-semibold rounded-full bg-[#6D28D9] text-white">
                      Start
                    </span>
                  )}

                  {status === 'locked' && (
                    <span className="px-3 py-1.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 inline-flex items-center gap-1">
                      <Lock size={12} strokeWidth={2} />
                      <span>Locked</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Comments Section */}
      <LessonComments lessonId={lesson.id} teacherId={lesson.teacherId} />
    </div>
  );
};
