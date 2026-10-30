import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase/config';
import { Lesson } from '../../types';
import { Search, Filter, BookOpen, Lock } from 'lucide-react';
import { Logo } from '../../components/common/Logo';

export const LessonsCatalog: React.FC = () => {
  const navigate = useNavigate();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'in_progress' | 'completed'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'lessons'), where('status', '==', 'published'));
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

  const filteredLessons = lessons.filter((lesson) => {
    const matchesSearch =
      lesson.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lesson.teacherName?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1C1530] dark:text-white">
          Lessons
        </h1>
        <p className="text-sm text-[#5B5470] dark:text-[#a49cb5] mt-1">
          Explore structured speaking lessons across all 6 Bloom's Taxonomy levels.
        </p>
      </div>

      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5B5470]"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search lesson title or teacher..."
            className="w-full pl-10 pr-4 py-3 text-sm rounded-[14px] bg-white dark:bg-[#18122b] border border-[#E6E0F5] dark:border-[#2e234c] focus:outline-none focus:border-[#8B5CF6]"
          />
        </div>

        {/* Filter Segmented Buttons */}
        <div className="flex items-center p-1 bg-white dark:bg-[#18122b] border border-[#E6E0F5] dark:border-[#2e234c] rounded-[14px]">
          {(['all', 'in_progress', 'completed'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-[10px] capitalize transition-colors ${
                activeFilter === filter
                  ? 'bg-[#6D28D9] text-white shadow-sm'
                  : 'text-[#5B5470] hover:text-[#1C1530]'
              }`}
            >
              {filter.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Lesson Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-64 bg-white dark:bg-[#18122b] rounded-[18px] border border-[#E6E0F5] animate-pulse"
            />
          ))}
        </div>
      ) : filteredLessons.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#18122b] rounded-[18px] border border-[#E6E0F5] dark:border-[#2e234c] space-y-3">
          <BookOpen size={36} className="mx-auto text-[#6D28D9]" />
          <h3 className="text-base font-semibold text-[#1C1530] dark:text-white">
            No lessons match your query
          </h3>
          <p className="text-xs text-[#5B5470] max-w-sm mx-auto">
            Try adjusting your search terms or filter selection.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredLessons.map((lesson) => (
            <div
              key={lesson.id}
              onClick={() => navigate(`/lessons/${lesson.id}`)}
              className="cursor-pointer group flex flex-col bg-white dark:bg-[#18122b] border border-[#E6E0F5] dark:border-[#2e234c] rounded-[18px] overflow-hidden hover:border-[#8B5CF6] hover:shadow-md transition-all"
            >
              {/* 16:9 Thumbnail Image */}
              <div className="relative aspect-video w-full bg-[#EDE5FF] dark:bg-[#201838] overflow-hidden">
                {lesson.thumbnailUrl ? (
                  <img
                    src={lesson.thumbnailUrl}
                    alt={lesson.title}
                    className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Logo size={48} />
                  </div>
                )}
                <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5">
                  {lesson.isLocked && (
                    <span className="px-2 py-1 text-[11px] font-bold rounded-full bg-amber-500/90 text-white backdrop-blur-sm inline-flex items-center gap-1">
                      <Lock size={11} />
                      <span>Locked</span>
                    </span>
                  )}
                  <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-black/60 text-white backdrop-blur-sm">
                    6 stages
                  </span>
                </div>
              </div>

              {/* Lesson Card Details */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <h3 className="font-bold text-base text-[#1C1530] dark:text-white line-clamp-1 group-hover:text-[#6D28D9] transition-colors">
                    {lesson.title}
                  </h3>
                  <p className="text-xs text-[#5B5470] dark:text-[#a49cb5] mt-0.5">
                    By {lesson.teacherName || 'Teacher'}
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-[#E6E0F5] dark:border-[#2e234c]">
                  <span className="text-[#5B5470]">
                    {lesson.files?.length || 0} attached files
                  </span>
                  <span className="font-semibold text-[#6D28D9] dark:text-[#a78bfa]">
                    View lesson
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
