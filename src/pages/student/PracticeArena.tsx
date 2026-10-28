import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { Mic, Bot, Plus, BookOpen, Sparkles } from 'lucide-react';
import { AiSpeakingPlayer } from './players/AiSpeakingPlayer';
import { Activity, Lesson } from '../../types';

export const PracticeArena: React.FC = () => {
  const [publishedActivities, setPublishedActivities] = useState<Array<{ activity: Activity; lessonTitle: string }>>([]);
  const [activeActivity, setActiveActivity] = useState<{ activity: Activity; lessonTitle: string } | null>(null);
  const [customTopicModal, setCustomTopicModal] = useState(false);
  const [customTopic, setCustomTopic] = useState('');
  const [customRole, setCustomRole] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRealSpeakingActivities = async () => {
      try {
        const lessonsSnap = await getDocs(
          query(collection(db, 'lessons'), where('status', '==', 'published'))
        );
        const list: Array<{ activity: Activity; lessonTitle: string }> = [];

        for (const lessonDoc of lessonsSnap.docs) {
          const lData = lessonDoc.data() as Lesson;
          const actsSnap = await getDocs(
            query(
              collection(db, 'lessons', lessonDoc.id, 'activities'),
              where('type', '==', 'ai_speaking')
            )
          );
          actsSnap.forEach((actDoc) => {
            list.push({
              activity: { id: actDoc.id, ...actDoc.data() } as Activity,
              lessonTitle: lData.title,
            });
          });
        }

        setPublishedActivities(list);
      } catch (err) {
        console.warn('Practice activities notice:', err);
      } finally {
        setLoading(false);
      }
    };

    loadRealSpeakingActivities();
  }, []);

  const handleStartCustomSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTopic.trim()) return;

    const customAct: Activity = {
      id: `custom_${Date.now()}`,
      lessonId: 'free_practice',
      bloomLevel: 3,
      type: 'ai_speaking',
      title: customTopic.trim(),
      instructionsHtml: `<p>Practice conversing on: ${customTopic.trim()}</p>`,
      requiresReview: false,
      order: 3,
      settings: {
        aiScenario: customTopic.trim(),
        aiRole: customRole.trim() || 'English conversation partner',
      },
    };

    setActiveActivity({ activity: customAct, lessonTitle: customTopic.trim() });
    setCustomTopicModal(false);
  };

  if (activeActivity) {
    return (
      <div className="max-w-2xl mx-auto py-2">
        <AiSpeakingPlayer
          activity={activeActivity.activity}
          lessonTitle={activeActivity.lessonTitle}
          onExit={() => setActiveActivity(null)}
          onFinishSession={async () => {
            setActiveActivity(null);
          }}
          submitting={false}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1C1530] dark:text-white">
            Speaking Practice
          </h1>
          <p className="text-sm text-[#5B5470] dark:text-[#a49cb5] mt-1">
            Engage in spoken conversation sessions with the AI English assistant.
          </p>
        </div>

        <button
          onClick={() => setCustomTopicModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#6D28D9] hover:bg-[#5B21B6] rounded-[14px] shadow-sm transition-colors cursor-pointer self-start sm:self-center"
        >
          <Plus size={16} strokeWidth={2} />
          <span>Practice Custom Topic</span>
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((n) => (
            <div
              key={n}
              className="h-36 bg-white dark:bg-[#18122b] rounded-[18px] border border-[#E6E0F5] animate-pulse"
            />
          ))}
        </div>
      ) : publishedActivities.length === 0 ? (
        <div className="p-10 text-center bg-white dark:bg-[#18122b] rounded-[18px] border border-[#E6E0F5] dark:border-[#2e234c] space-y-4">
          <Bot size={36} className="mx-auto text-[#6D28D9]" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#1C1530] dark:text-white">
              No assigned speaking practices yet
            </h3>
            <p className="text-xs text-[#5B5470] max-w-sm mx-auto">
              When your teacher publishes lessons with AI Speaking Assistant activities, they will appear here. You can also start a custom topic practice anytime.
            </p>
          </div>
          <button
            onClick={() => setCustomTopicModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-[#6D28D9] rounded-[14px]"
          >
            <Mic size={14} />
            <span>Choose a Topic to Speak About</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {publishedActivities.map((item) => (
            <div
              key={item.activity.id}
              onClick={() => setActiveActivity(item)}
              className="cursor-pointer p-5 bg-white dark:bg-[#18122b] border border-[#E6E0F5] dark:border-[#2e234c] rounded-[18px] hover:border-[#8B5CF6] hover:shadow-sm transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <span className="text-[11px] font-semibold text-[#6D28D9] block">
                  Lesson: {item.lessonTitle}
                </span>
                <h3 className="text-base font-bold text-[#1C1530] dark:text-white">
                  {item.activity.title}
                </h3>
                <p className="text-xs text-[#5B5470] line-clamp-2">
                  Role: {item.activity.settings.aiRole || 'Conversational tutor'}
                </p>
              </div>

              <div className="pt-4 flex items-center justify-between text-xs font-semibold text-[#6D28D9] border-t border-[#E6E0F5] dark:border-[#2e234c] mt-3">
                <span>Start Session</span>
                <Mic size={16} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Custom Topic Modal */}
      {customTopicModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-[#18122b] rounded-[18px] p-6 space-y-4 border border-[#E6E0F5] dark:border-[#2e234c] shadow-2xl">
            <h3 className="text-base font-bold text-[#1C1530] dark:text-white">
              Custom Speaking Practice
            </h3>
            <p className="text-xs text-[#5B5470]">
              Enter any real-world conversation topic or role you would like to practice.
            </p>

            <form onSubmit={handleStartCustomSession} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#5B5470]">
                  Topic / Scenario
                </label>
                <input
                  type="text"
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  placeholder="e.g. Discussing favorite books, preparing for an exchange program..."
                  required
                  className="w-full p-3 text-xs rounded-[14px] bg-[#F7F4FF] dark:bg-[#201838] border border-[#E6E0F5] dark:border-[#2e234c] focus:outline-none focus:border-[#6D28D9]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#5B5470]">
                  AI Role in Character (Optional)
                </label>
                <input
                  type="text"
                  value={customRole}
                  onChange={(e) => setCustomRole(e.target.value)}
                  placeholder="e.g. Classmate, travel agent, librarian..."
                  className="w-full p-3 text-xs rounded-[14px] bg-[#F7F4FF] dark:bg-[#201838] border border-[#E6E0F5] dark:border-[#2e234c] focus:outline-none focus:border-[#6D28D9]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCustomTopicModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#5B5470]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-[#6D28D9] rounded-[14px]"
                >
                  Start Speaking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
