import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  doc,
  getDoc,
  collection,
  addDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import {
  Lesson,
  Activity,
  BloomLevelNumber,
  BLOOM_LEVELS,
  SubmissionStatus,
} from '../../types';
import { ChevronLeft, CheckCircle, AlertCircle, FileText, Lock } from 'lucide-react';
import { BloomBadge } from '../../components/common/BloomBadge';
import { RichTextView } from '../../components/common/RichTextView';
import { VoiceRecordingPlayer } from './players/VoiceRecordingPlayer';
import { AiSpeakingPlayer } from './players/AiSpeakingPlayer';
import { FileUploadPlayer } from './players/FileUploadPlayer';
import { QuizPlayer } from './players/QuizPlayer';
import { TextResponsePlayer } from './players/TextResponsePlayer';
import { FileCard } from '../../components/common/FileCard';

export const ActivityPlayerHost: React.FC = () => {
  const { lessonId, activityId } = useParams<{ lessonId: string; activityId: string }>();
  const navigate = useNavigate();
  const { firebaseUser, profile } = useAuth();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  useEffect(() => {
    if (!lessonId || !activityId) return;

    const loadData = async () => {
      try {
        const lessonSnap = await getDoc(doc(db, 'lessons', lessonId));
        if (lessonSnap.exists()) {
          setLesson({ id: lessonSnap.id, ...lessonSnap.data() } as Lesson);
        }

        const actSnap = await getDoc(doc(db, 'lessons', lessonId, 'activities', activityId));
        if (actSnap.exists()) {
          setActivity({ id: actSnap.id, ...actSnap.data() } as Activity);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `lessons/${lessonId}/activities/${activityId}`);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [lessonId, activityId]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-12 space-y-4">
        <div className="h-6 w-32 bg-white dark:bg-[#18122b] rounded animate-pulse" />
        <div className="h-64 bg-white dark:bg-[#18122b] rounded-[18px] animate-pulse" />
      </div>
    );
  }

  if (!lesson || !activity) {
    return (
      <div className="p-8 text-center max-w-md mx-auto space-y-3">
        <AlertCircle size={36} className="mx-auto text-red-500" />
        <h2 className="text-base font-bold">Stage not found</h2>
        <button
          onClick={() => navigate(`/lessons/${lessonId}`)}
          className="px-4 py-2 text-xs font-semibold text-white bg-[#6D28D9] rounded-[14px]"
        >
          Return to Lesson
        </button>
      </div>
    );
  }

  if (lesson.isLocked || activity.isLocked) {
    return (
      <div className="p-8 text-center max-w-md mx-auto space-y-4 bg-white dark:bg-[#18122b] rounded-[18px] border border-[#E6E0F5] dark:border-[#2e234c] shadow-sm my-8">
        <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
          <Lock size={32} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[#1C1530] dark:text-white">
            {lesson.isLocked ? 'This Lesson is Locked' : 'This Stage is Locked'}
          </h2>
          <p className="text-xs text-[#5B5470] mt-1.5">
            {lesson.isLocked
              ? 'The teacher or administrator has locked access to this lesson.'
              : 'The teacher or administrator has locked this specific stage.'}
          </p>
        </div>
        <button
          onClick={() => navigate(`/lessons/${lesson.id}`)}
          className="w-full py-2.5 text-xs font-semibold text-white bg-[#6D28D9] rounded-[14px]"
        >
          Return to Lesson
        </button>
      </div>
    );
  }

  const handleSaveSubmission = async (submissionPayload: any) => {
    if (!firebaseUser || !profile) return;
    try {
      setSubmitting(true);
      const isQuiz = activity.type === 'quiz';
      const initialStatus: SubmissionStatus = isQuiz
        ? submissionPayload.status || 'passed'
        : 'pending';

      const submissionDoc = {
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        activityId: activity.id,
        bloomLevel: activity.bloomLevel,
        studentId: firebaseUser.uid,
        studentName: profile.displayName || 'Student',
        studentPhoto: profile.photoURL || '',
        teacherId: lesson.teacherId,
        type: activity.type,
        status: initialStatus,
        createdAt: new Date().toISOString(),
        ...submissionPayload,
      };

      const subsRef = collection(db, 'submissions');
      await addDoc(subsRef, submissionDoc);

      // Create notification for teacher
      if (lesson.teacherId) {
        try {
          await addDoc(collection(db, 'notifications'), {
            recipientId: lesson.teacherId,
            title: 'New Student Submission',
            body: `${profile.displayName || 'Student'} completed Level ${activity.bloomLevel} for "${lesson.title}".`,
            type: 'review',
            link: '/review',
            read: false,
            createdAt: new Date().toISOString(),
          });
        } catch (e) {
          console.warn('Notification notice:', e);
        }
      }

      setSubmittedSuccess(true);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'submissions');
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedSuccess) {
    return (
      <div className="max-w-md mx-auto py-12 px-6 bg-white dark:bg-[#18122b] rounded-[18px] border border-[#E6E0F5] dark:border-[#2e234c] text-center space-y-4 shadow-sm">
        <div className="w-16 h-16 rounded-full bg-[#EDE5FF] text-[#6D28D9] flex items-center justify-center mx-auto">
          <CheckCircle size={36} strokeWidth={2} />
        </div>
        <h2 className="text-xl font-bold text-[#1C1530] dark:text-white">
          Stage Completed & Submitted
        </h2>
        <p className="text-xs text-[#5B5470] dark:text-[#a49cb5] leading-relaxed">
          {activity.type === 'quiz'
            ? 'Your quiz has been graded and recorded.'
            : 'Your submission has been sent to your teacher for manual review. AI advisory feedback is also available.'}
        </p>
        <button
          onClick={() => navigate(`/lessons/${lesson.id}`)}
          className="w-full py-3 text-xs font-semibold text-white bg-[#6D28D9] hover:bg-[#5B21B6] rounded-[14px] transition-colors"
        >
          Continue Lesson
        </button>
      </div>
    );
  }

  // AI Speaking assistant has its own fullscreen view matching PDF Page 4
  if (activity.type === 'ai_speaking') {
    return (
      <AiSpeakingPlayer
        activity={activity}
        lessonTitle={lesson.title}
        onExit={() => navigate(`/lessons/${lesson.id}`)}
        onSubmit={handleSaveSubmission}
        onFinishSession={handleSaveSubmission}
        submitting={submitting}
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Top back navigation */}
      <button
        onClick={() => navigate(`/lessons/${lesson.id}`)}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#6D28D9] dark:text-[#a78bfa] hover:underline"
      >
        <ChevronLeft size={18} strokeWidth={2} />
        <span>Back to Lesson</span>
      </button>

      {/* Activity Header Card */}
      <div className="p-6 bg-white dark:bg-[#18122b] rounded-[18px] border border-[#E6E0F5] dark:border-[#2e234c] space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <BloomBadge level={activity.bloomLevel} showName />
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-[#EDE5FF] text-[#6D28D9]">
            {activity.bloomLevel} · {BLOOM_LEVELS[activity.bloomLevel].name}
          </span>
        </div>

        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#1C1530] dark:text-white">
            {activity.title}
          </h1>
          <p className="text-xs text-[#5B5470] mt-0.5">
            Lesson: {lesson.title}
          </p>
        </div>

        {activity.instructionsHtml && (
          <div className="pt-2 border-t border-[#E6E0F5] dark:border-[#2e234c]">
            <h3 className="text-xs font-bold uppercase text-[#5B5470] tracking-wider mb-2">
              Instructions
            </h3>
            <RichTextView html={activity.instructionsHtml} />
          </div>
        )}
      </div>

      {/* Player Implementation based on activity type */}
      {activity.type === 'voice_recording' && (
        <VoiceRecordingPlayer
          activity={activity}
          onSubmit={handleSaveSubmission}
          submitting={submitting}
        />
      )}

      {activity.type === 'file_upload' && (
        <FileUploadPlayer
          activity={activity}
          onSubmit={handleSaveSubmission}
          submitting={submitting}
        />
      )}

      {activity.type === 'quiz' && (
        <QuizPlayer
          activity={activity}
          onSubmit={handleSaveSubmission}
          submitting={submitting}
        />
      )}

      {activity.type === 'text_response' && (
        <TextResponsePlayer
          activity={activity}
          onSubmit={handleSaveSubmission}
          submitting={submitting}
        />
      )}
    </div>
  );
};
