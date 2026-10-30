export type UserRole = 'student' | 'teacher' | 'admin';

export type BloomLevelNumber = 1 | 2 | 3 | 4 | 5 | 6;

export interface BloomLevelInfo {
  level: BloomLevelNumber;
  name: string;
  tagline: string;
}

export const BLOOM_LEVELS: Record<BloomLevelNumber, BloomLevelInfo> = {
  1: { level: 1, name: 'Remember', tagline: 'Recall facts, key terms and basic concepts' },
  2: { level: 2, name: 'Understand', tagline: 'Explain ideas or concepts in your own words' },
  3: { level: 3, name: 'Apply', tagline: 'Use knowledge in new conversational situations' },
  4: { level: 4, name: 'Analyze', tagline: 'Draw connections among ideas, compare and contrast' },
  5: { level: 5, name: 'Evaluate', tagline: 'Justify a stance, critique, or give constructive feedback' },
  6: { level: 6, name: 'Create', tagline: 'Produce new or original spoken work and projects' },
};

export type ActivityType =
  | 'voice_recording'
  | 'ai_speaking'
  | 'file_upload'
  | 'quiz'
  | 'text_response';

export interface ActivityTypeMeta {
  type: ActivityType;
  label: string;
  description: string;
  iconName: string;
}

export const ACTIVITY_TYPES: Record<ActivityType, ActivityTypeMeta> = {
  voice_recording: {
    type: 'voice_recording',
    label: 'Voice recording',
    description: 'Record spoken responses with waveform visualization and playback',
    iconName: 'mic',
  },
  ai_speaking: {
    type: 'ai_speaking',
    label: 'AI speaking assistant',
    description: 'Interactive conversation with AI tutor for role-play and dialogue',
    iconName: 'bot',
  },
  file_upload: {
    type: 'file_upload',
    label: 'File uploading',
    description: 'Upload audio, video, PDF, or presentations for teacher evaluation',
    iconName: 'upload',
  },
  quiz: {
    type: 'quiz',
    label: 'Quizzes',
    description: 'Auto-graded comprehension checks, multiple-choice and short answers',
    iconName: 'list-checks',
  },
  text_response: {
    type: 'text_response',
    label: 'Text response',
    description: 'Written reflection or notes with live word counter',
    iconName: 'pen-line',
  },
};

export interface UserProfile {
  uid: string;
  displayName: string;
  username: string;
  usernameLower: string;
  usernameChangedAt?: string;
  bio?: string;
  photoURL?: string;
  email: string;
  role: UserRole;
  createdAt: string;
  lastActiveAt?: string;
  streak: number;
  fcmTokens?: string[];
  blockedUids?: string[];
}

export interface LessonFile {
  fileId: string;
  displayName: string;
  originalFileName: string;
  storagePath: string;
  downloadUrl?: string;
  kind: 'mp3' | 'mp4' | 'pptx';
  mimeType: string;
  sizeBytes: number;
  levelScope: 'lesson' | BloomLevelNumber;
  downloadCount: number;
  uploadedAt: string;
  order: number;
}

export interface Lesson {
  id: string;
  teacherId: string;
  teacherName: string;
  title: string;
  descriptionHtml: string;
  thumbnailPath?: string;
  thumbnailUrl?: string;
  status: 'draft' | 'published';
  unlockMode: 'sequential' | 'open';
  isLocked?: boolean;
  createdAt: string;
  updatedAt: string;
  files: LessonFile[];
  studentCount?: number;
}

export interface ActivitySettings {
  maxDurationSeconds?: number;
  promptCount?: number;
  aiScenario?: string;
  aiRole?: string;
  aiPace?: 'normal' | 'slow';
  aiMaxDurationMinutes?: number;
  allowedFileTypes?: string[];
  maxFileSizeMb?: number;
  minWordCount?: number;
  maxWordCount?: number;
  passMarkPercent?: number;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  maxAttempts?: number;
  timeLimitMinutes?: number;
  showCorrectAnswers?: boolean;
  questions?: QuizQuestion[];
}

export interface Activity {
  id: string;
  lessonId: string;
  bloomLevel: BloomLevelNumber;
  type: ActivityType;
  title: string;
  instructionsHtml: string;
  fileRefs?: string[];
  requiresReview: boolean;
  order: number;
  isLocked?: boolean;
  settings: ActivitySettings;
}

export type Stage = Activity;
export type StageType = ActivityType;
export const STAGE_TYPES = ACTIVITY_TYPES;

export type QuizQuestionType =
  | 'single_choice'
  | 'multiple_choice'
  | 'true_false'
  | 'short_text'
  | 'audio_question';

export interface QuizQuestion {
  id: string;
  type: QuizQuestionType;
  textHtml: string;
  mediaPath?: string;
  mediaUrl?: string;
  options: string[];
  correctAnswers: (string | number)[];
  points: number;
  explanation?: string;
  order: number;
}

export interface CommentItem {
  id: string;
  lessonId: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  authorPhoto?: string;
  authorRole?: UserRole;
  text: string;
  parentId?: string;
  createdAt: string;
  editedAt?: string;
  deleted?: boolean;
  reportCount?: number;
}

export interface Conversation {
  id: string;
  participants: string[];
  participantProfiles?: Record<string, Partial<UserProfile>>;
  lastMessage?: string;
  lastMessageAt?: string;
  unread?: Record<string, number>;
  mutedBy?: string[];
}

export interface DirectMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
  readBy?: string[];
}

export type SubmissionStatus =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'revise'
  | 'passed'
  | 'failed';

export interface Submission {
  id: string;
  lessonId: string;
  lessonTitle: string;
  activityId: string;
  bloomLevel: BloomLevelNumber;
  studentId: string;
  studentName: string;
  studentPhoto?: string;
  teacherId: string;
  type: ActivityType;
  files?: Array<{ name: string; url: string; size: number; mimeType: string }>;
  textAnswer?: string;
  audioUrl?: string;
  score?: number;
  transcript?: string;
  aiFeedback?: {
    fluency?: number;
    pronunciationNotes?: string;
    grammarIssues?: string[];
    vocabularySuggestions?: string[];
    summary?: string;
  };
  aiSessionId?: string;
  status: SubmissionStatus;
  teacherFeedback?: string;
  createdAt: string;
  reviewedAt?: string;
}

export interface StudentProgress {
  studentId: string;
  lessonId: string;
  levelStatus: Record<BloomLevelNumber, 'locked' | 'start' | 'in_progress' | 'pending' | 'done' | 'revise'>;
  percent: number;
  completedActivitiesCount: number;
  updatedAt: string;
}

export interface TeacherApplication {
  uid: string;
  displayName: string;
  email: string;
  reason: string;
  experience: string;
  files?: Array<{ name: string; url: string }>;
  status: 'submitted' | 'review' | 'approved' | 'declined';
  adminNote?: string;
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface InAppNotification {
  id: string;
  recipientId: string;
  title: string;
  body: string;
  type: 'review' | 'comment' | 'message' | 'application' | 'system';
  link?: string;
  read: boolean;
  createdAt: string;
}
