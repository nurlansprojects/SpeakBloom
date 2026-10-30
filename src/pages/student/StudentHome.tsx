import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, onSnapshot, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { Lesson, BLOOM_LEVELS, BloomLevelNumber } from '../../types';
import { Check, ChevronRight, BookOpen, Clock, AlertCircle, Lock } from 'lucide-react';
import { Logo } from '../../components/common/Logo';

export const StudentHome: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'lessons'),
      where('status', '==', 'published')
    );

    const unsubscribe = onSnapshot(
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

    return () => unsubscribe();
  }, []);

  const featuredLesson = lessons[0];
  const firstName = profile?.displayName ? profile.displayName.split(' ')[0] : 'Learner';

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1C1530] dark:text-white">
          Welcome, {profile?.displayName || firstName}
        </h1>
      </div>

      {/* "Continue learning" Hero Card */}
      {featuredLesson ? (
        <div
          onClick={() => navigate(`/lessons/${featuredLesson.id}`)}
          className="cursor-pointer relative overflow-hidden p-6 rounded-[18px] bg-gradient-to-br from-[#6D28D9] to-[#8B5CF6] text-white shadow-lg shadow-purple-950/10 hover:shadow-xl transition-all"
        >
          <div className="flex flex-col gap-3">
            <span className="text-xs font-semibold tracking-wide uppercase text-purple-200">
              Continue learning
            </span>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
              {featuredLesson.title}
            </h2>

            {/* Progress indicator */}
            <div className="w-full bg-white/25 rounded-full h-2 mt-2 overflow-hidden">
              <div
                className="bg-white h-full rounded-full transition-all duration-500"
                style={{ width: '50%' }}
              />
            </div>
            <p className="text-xs font-medium text-purple-100">
              3 of 6 stages done
            </p>
          </div>
        </div>
      ) : (
        <div className="p-6 rounded-[18px] bg-white dark:bg-[#18122b] border border-[#E6E0F5] dark:border-[#2e234c] text-center space-y-2">
          <BookOpen className="mx-auto text-[#6D28D9]" size={32} />
          <h3 className="font-semibold text-base">Welcome to SpeakBloom</h3>
          <p className="text-xs text-[#5B5470] max-w-sm mx-auto">
            Your teacher is preparing lessons. New lessons will appear here automatically.
          </p>
        </div>
      )}

      {/* Lessons List Section (Matches PDF Page 2) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#1C1530] dark:text-white">
            Lessons
          </h2>
          <button
            onClick={() => navigate('/lessons')}
            className="text-xs font-semibold text-[#6D28D9] hover:underline"
          >
            View all
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-20 bg-white dark:bg-[#18122b] rounded-[18px] animate-pulse border border-[#E6E0F5]"
              />
            ))}
          </div>
        ) : lessons.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-[#18122b] rounded-[18px] border border-[#E6E0F5] dark:border-[#2e234c]">
            <p className="text-sm text-[#5B5470] dark:text-[#a49cb5]">
              No published lessons yet. Check back shortly.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {lessons.map((lesson, idx) => (
              <div
                key={lesson.id}
                onClick={() => navigate(`/lessons/${lesson.id}`)}
                className="cursor-pointer flex items-center justify-between p-4 bg-white dark:bg-[#18122b] border border-[#E6E0F5] dark:border-[#2e234c] rounded-[18px] hover:border-[#8B5CF6] hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* Thumbnail / Icon container */}
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

                  {/* Title & Teacher info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-[#6D28D9] dark:text-[#a78bfa] block">
                        6 stages
                      </span>
                      {lesson.isLocked && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.2 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                          <Lock size={10} />
                          <span>Locked</span>
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm sm:text-base font-bold text-[#1C1530] dark:text-white truncate">
                      {lesson.title}
                    </h3>
                    <p className="text-xs text-[#5B5470] dark:text-[#a49cb5] truncate">
                      By {lesson.teacherName || 'Teacher'}
                    </p>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="shrink-0 pl-2">
                  <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-[#EDE5FF] text-[#6D28D9] dark:bg-[#2e1d54] dark:text-[#a78bfa]">
                    {lesson.isLocked ? 'Locked' : idx === 0 ? 'New' : '2/6'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
