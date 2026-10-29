import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  getDocs,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import {
  Lesson,
  Activity,
  BloomLevelNumber,
  BLOOM_LEVELS,
  ActivityType,
  ACTIVITY_TYPES,
  LessonFile,
  QuizQuestion,
  QuizQuestionType,
} from '../../types';
import {
  ChevronLeft,
  Upload,
  Plus,
  Trash2,
  Check,
  Eye,
  AlertTriangle,
  Smartphone,
  Edit2,
  Music,
  Video,
  FileText,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import { RichTextEditor } from '../../components/common/RichTextEditor';
import { RichTextView } from '../../components/common/RichTextView';
import { ImageCropper } from '../../components/common/ImageCropper';
import { ActivityIcon } from '../../components/common/ActivityIcon';
import { FileCard } from '../../components/common/FileCard';
import { Logo } from '../../components/common/Logo';
import {
  uploadThumbnail,
  uploadLessonFile,
  uploadLessonFileWithProgress,
  resizeAndCompressImage,
} from '../../firebase/storageService';

export const LessonEditor: React.FC = () => {
  const { lessonId } = useParams<{ lessonId?: string }>();
  const navigate = useNavigate();
  const { firebaseUser, profile } = useAuth();

  const isEditing = !!lessonId;
  const currentId = lessonId || `lesson_${Date.now()}`;

  const [title, setTitle] = useState('');
  const [descriptionHtml, setDescriptionHtml] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
  const [files, setFiles] = useState<LessonFile[]>([]);
  const [unlockMode, setUnlockMode] = useState<'sequential' | 'open'>('sequential');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');

  // Six activities, one per level (1 to 6)
  const [activities, setActivities] = useState<Record<BloomLevelNumber, Activity>>({
    1: {
      id: `${currentId}_act_1`,
      lessonId: currentId,
      bloomLevel: 1,
      type: 'voice_recording',
      title: 'Repeat & record',
      instructionsHtml: '<p>Listen to key phrases and record your clear pronunciation.</p>',
      requiresReview: true,
      order: 1,
      settings: { maxDurationSeconds: 60 },
    },
    2: {
      id: `${currentId}_act_2`,
      lessonId: currentId,
      bloomLevel: 2,
      type: 'text_response',
      title: 'Retell in your words',
      instructionsHtml: '<p>Summarize the topic concept in your own English sentences.</p>',
      requiresReview: true,
      order: 2,
      settings: { minWordCount: 15, maxWordCount: 150 },
    },
    3: {
      id: `${currentId}_act_3`,
      lessonId: currentId,
      bloomLevel: 3,
      type: 'ai_speaking',
      title: 'Speak with AI',
      instructionsHtml: '<p>Role-play a live spoken scenario with the AI conversational assistant.</p>',
      requiresReview: true,
      order: 3,
      settings: { aiScenario: 'ordering food politely at a restaurant', aiRole: 'the waiter' },
    },
    4: {
      id: `${currentId}_act_4`,
      lessonId: currentId,
      bloomLevel: 4,
      type: 'quiz',
      title: 'Compare & analyze',
      instructionsHtml: '<p>Comprehension and analytical questions to assess understanding.</p>',
      requiresReview: false,
      order: 4,
      settings: {
        passMarkPercent: 70,
        questions: [
          {
            id: 'q1',
            type: 'single_choice',
            textHtml: 'Which expression is the most polite for making a request?',
            options: ['Give me the menu.', 'Could I please see the menu?', 'I want menu now.'],
            correctAnswers: [1],
            points: 10,
            explanation: '"Could I please see..." is courteous and polite.',
            order: 1,
          },
        ],
      },
    },
    5: {
      id: `${currentId}_act_5`,
      lessonId: currentId,
      bloomLevel: 5,
      type: 'text_response',
      title: 'Evaluate & critique',
      instructionsHtml: '<p>Evaluate the scenario and justify your reasoning in English.</p>',
      requiresReview: true,
      order: 5,
      settings: { minWordCount: 20, maxWordCount: 200 },
    },
    6: {
      id: `${currentId}_act_6`,
      lessonId: currentId,
      bloomLevel: 6,
      type: 'file_upload',
      title: 'Upload your spoken project',
      instructionsHtml: '<p>Share your original speaking video or audio presentation.</p>',
      requiresReview: true,
      order: 6,
      settings: { allowedFileTypes: ['audio', 'video', 'pdf'] },
    },
  });

  const [cropImageRaw, setCropImageRaw] = useState<string | null>(null);
  const [editingLevel, setEditingLevel] = useState<BloomLevelNumber | null>(null);
  const [showPhonePreview, setShowPhonePreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // File upload progress state
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFileName, setUploadingFileName] = useState('');

  useEffect(() => {
    if (!lessonId) return;

    const loadExisting = async () => {
      try {
        const snap = await getDoc(doc(db, 'lessons', lessonId));
        if (snap.exists()) {
          const data = snap.data() as Lesson;
          setTitle(data.title || '');
          setDescriptionHtml(data.descriptionHtml || '');
          setThumbnailUrl(data.thumbnailUrl || '');
          setFiles(data.files || []);
          setUnlockMode(data.unlockMode || 'sequential');
          setStatus(data.status || 'draft');
        }

        const actsSnap = await getDocs(collection(db, 'lessons', lessonId, 'activities'));
        if (!actsSnap.empty) {
          const actMap = { ...activities };
          actsSnap.forEach((d) => {
            const a = d.data() as Activity;
            actMap[a.bloomLevel] = { ...a, id: d.id };
          });
          setActivities(actMap);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `lessons/${lessonId}`);
      }
    };

    loadExisting();
  }, [lessonId]);

  // Robust thumbnail upload and immediate preview
  const handleSelectThumbnail = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const isImg = file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|svg)$/i.test(file.name);
      if (!isImg) {
        setErrorMessage('Please select a valid image file (JPG, PNG, WebP).');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const raw = reader.result as string;
          // Instantly compress to 640x360 and display preview so it NEVER disappears
          const compressed = await resizeAndCompressImage(raw, 640, 360, 0.7);
          setThumbnailUrl(compressed);
          setErrorMessage(null);
        } catch (err) {
          console.warn('Thumbnail preview error:', err);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Lesson Files upload handling (mp3, mp4, pptx and related media)
  const handleSelectLessonFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const ext = file.name.split('.').pop()?.toLowerCase();
      let kind: 'mp3' | 'mp4' | 'pptx' | null = null;

      if (['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac', 'weba'].includes(ext || '')) kind = 'mp3';
      else if (['mp4', 'mov', 'webm', 'm4v', 'mkv', 'avi'].includes(ext || '')) kind = 'mp4';
      else if (['pptx', 'ppt', 'pdf', 'docx', 'doc', 'zip', 'txt'].includes(ext || '')) kind = 'pptx';

      if (!kind) {
        setErrorMessage('Allowed formats: audio (MP3, WAV, M4A), video (MP4, MOV, WEBM), or presentation/documents (PPTX, PDF, DOCX).');
        e.target.value = '';
        return;
      }

      try {
        setErrorMessage(null);
        setIsUploadingFile(true);
        setUploadProgress(0);
        setUploadingFileName(file.name);

        const downloadUrl = await uploadLessonFileWithProgress(currentId, file, (percent) => {
          setUploadProgress(percent);
        });

        const newFile: LessonFile = {
          fileId: `file_${Date.now()}`,
          displayName: file.name.replace(/\.[^/.]+$/, ''),
          originalFileName: file.name,
          storagePath: `lesson-files/${currentId}/${file.name}`,
          downloadUrl,
          kind,
          mimeType: file.type || (kind === 'mp3' ? 'audio/mpeg' : kind === 'mp4' ? 'video/mp4' : 'application/vnd.openxmlformats-officedocument.presentationml.presentation'),
          sizeBytes: file.size,
          levelScope: 'lesson',
          downloadCount: 0,
          uploadedAt: new Date().toISOString(),
          order: files.length + 1,
        };
        setFiles((prev) => [...prev, newFile]);
      } catch (err: any) {
        console.error('File upload error:', err);
        setErrorMessage(`Could not attach file: ${err?.message || 'Upload failed'}. Please retry.`);
      } finally {
        setIsUploadingFile(false);
        setUploadProgress(0);
        setUploadingFileName('');
        e.target.value = '';
      }
    }
  };

  // Move activities up or down between Bloom levels
  const handleMoveActivity = (level: BloomLevelNumber, direction: 'up' | 'down') => {
    const targetLevel = (direction === 'up' ? level - 1 : level + 1) as BloomLevelNumber;
    if (targetLevel < 1 || targetLevel > 6) return;

    setActivities((prev) => {
      const actA = { ...prev[level], bloomLevel: targetLevel, order: targetLevel };
      const actB = { ...prev[targetLevel], bloomLevel: level, order: level };
      return {
        ...prev,
        [level]: actB,
        [targetLevel]: actA,
      };
    });
  };

  // Reset or delete an activity slot to clean default
  const handleResetActivity = (level: BloomLevelNumber) => {
    if (!window.confirm(`Reset Level ${level} activity to blank?`)) return;
    setActivities((prev) => ({
      ...prev,
      [level]: {
        id: `${currentId}_act_${level}`,
        lessonId: currentId,
        bloomLevel: level,
        type: 'voice_recording',
        title: `${BLOOM_LEVELS[level].name} Practice`,
        instructionsHtml: '<p>Instructions for this activity.</p>',
        requiresReview: true,
        order: level,
        settings: {},
      },
    }));
  };

  // Delete entire lesson
  const handleDeleteThisLesson = async () => {
    if (!isEditing) return;
    if (!window.confirm(`Permanently delete this entire lesson ("${title}")?`)) return;

    try {
      setSaving(true);
      await deleteDoc(doc(db, 'lessons', currentId));
      navigate('/teacher');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `lessons/${currentId}`);
    } finally {
      setSaving(false);
    }
  };

  // Deep sanitize objects for Firestore to guarantee no undefined fields are written
  const cleanObjectForFirestore = (obj: any): any => {
    if (obj === null || obj === undefined) return null;
    if (typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) {
      return obj.map(cleanObjectForFirestore).filter((item) => item !== undefined);
    }
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        result[key] = cleanObjectForFirestore(value);
      }
    }
    return result;
  };

  const handleSaveLesson = async (targetStatus: 'draft' | 'published') => {
    if (!firebaseUser) {
      setErrorMessage('You must be signed in to save or publish a lesson.');
      return;
    }
    if (!title.trim()) {
      setErrorMessage('Please enter a lesson title before publishing.');
      return;
    }

    try {
      setSaving(true);
      setErrorMessage(null);

      // Upload or compress thumbnail if still raw dataUrl
      let finalThumbnailUrl = thumbnailUrl || '';
      if (thumbnailUrl && thumbnailUrl.startsWith('data:')) {
        try {
          finalThumbnailUrl = await uploadThumbnail(currentId, thumbnailUrl);
        } catch (e) {
          console.warn('Thumbnail storage notice:', e);
        }
      }

      // Ensure files array does not carry any raw oversized data URLs or undefined values
      const sanitizedFiles = files.map((f, idx) => ({
        fileId: f.fileId || `file_${Date.now()}_${idx}`,
        displayName: f.displayName || f.originalFileName || 'Lesson File',
        originalFileName: f.originalFileName || 'File',
        storagePath: f.storagePath || '',
        downloadUrl: f.downloadUrl || '',
        kind: f.kind || 'mp3',
        mimeType: f.mimeType || 'audio/mpeg',
        sizeBytes: f.sizeBytes || 0,
        levelScope: f.levelScope || 'lesson',
        downloadCount: f.downloadCount || 0,
        uploadedAt: f.uploadedAt || new Date().toISOString(),
        order: f.order || idx + 1,
      }));

      const rawLessonDoc = {
        id: currentId,
        teacherId: firebaseUser.uid,
        teacherName: profile?.displayName || firebaseUser.displayName || 'Teacher',
        title: title.trim(),
        descriptionHtml: descriptionHtml || '',
        thumbnailUrl: finalThumbnailUrl || '',
        status: targetStatus,
        unlockMode: unlockMode || 'sequential',
        files: sanitizedFiles,
        studentCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const lessonDoc = cleanObjectForFirestore(rawLessonDoc);

      // Save main lesson document and all 6 activities in parallel for instant publishing
      const saveTasks = [setDoc(doc(db, 'lessons', currentId), lessonDoc)];

      const levels: BloomLevelNumber[] = [1, 2, 3, 4, 5, 6];
      for (const lvl of levels) {
        const act = activities[lvl];
        const rawAct = {
          id: act?.id || `${currentId}_act_${lvl}`,
          lessonId: currentId,
          bloomLevel: lvl,
          type: act?.type || 'voice_recording',
          title: act?.title || `${BLOOM_LEVELS[lvl].name} Practice`,
          instructionsHtml: act?.instructionsHtml || '',
          fileRefs: act?.fileRefs || [],
          requiresReview: typeof act?.requiresReview === 'boolean' ? act.requiresReview : true,
          order: lvl,
          settings: act?.settings || {},
        };
        const sanitizedAct = cleanObjectForFirestore(rawAct);
        saveTasks.push(setDoc(doc(db, 'lessons', currentId, 'activities', rawAct.id), sanitizedAct));
      }

      await Promise.all(saveTasks);

      setStatus(targetStatus);
      navigate('/teacher');
    } catch (err: any) {
      console.error('Save lesson failed:', err);
      const errMsg = err?.message || String(err);
      setErrorMessage(`Failed to ${targetStatus === 'published' ? 'publish' : 'save'} lesson: ${errMsg}`);
    } finally {
      setSaving(false);
    }
  };

  const allLevels: BloomLevelNumber[] = [1, 2, 3, 4, 5, 6];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-[#E6E0F5] dark:border-[#2e234c]">
        <button
          type="button"
          onClick={() => navigate('/teacher')}
          className="text-sm font-semibold text-[#5B5470] hover:text-[#1C1530] dark:text-[#a49cb5]"
        >
          Cancel
        </button>

        <h1 className="text-base sm:text-lg font-bold text-[#1C1530] dark:text-white">
          {isEditing ? 'Edit Lesson' : 'New lesson'}
        </h1>

        <div className="flex items-center gap-2">
          {isEditing && (
            <button
              type="button"
              onClick={handleDeleteThisLesson}
              disabled={saving}
              className="text-xs font-semibold text-red-600 hover:bg-red-50 p-2 rounded-[10px]"
              title="Delete Lesson"
            >
              <Trash2 size={16} />
            </button>
          )}

          <button
            type="button"
            onClick={() => handleSaveLesson('draft')}
            disabled={saving}
            className="text-sm font-semibold text-[#6D28D9] dark:text-[#a78bfa] px-3 py-1.5 hover:bg-[#EDE5FF] rounded-[10px] transition-colors"
          >
            Save Draft
          </button>
          <button
            type="button"
            onClick={() => setShowPhonePreview(!showPhonePreview)}
            className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-[10px] border border-[#E6E0F5] text-[#1C1530] hover:bg-[#F7F4FF]"
          >
            <Smartphone size={14} strokeWidth={2} />
            <span>{showPhonePreview ? 'Hide Phone' : 'Live Phone'}</span>
          </button>
        </div>
      </div>

      {/* Error alert if any */}
      {errorMessage && (
        <div className="p-3 bg-red-50 text-red-700 text-xs rounded-[14px] border border-red-200">
          {errorMessage}
        </div>
      )}

      {/* Main split on desktop */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        <div className="flex-1 w-full space-y-6">
          {/* Title Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#5B5470] dark:text-[#a49cb5]">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Ordering at a Restaurant"
              className="w-full p-3.5 text-base font-semibold rounded-[14px] bg-white dark:bg-[#18122b] border border-[#E6E0F5] dark:border-[#2e234c] focus:outline-none focus:border-[#6D28D9]"
            />
          </div>

          {/* 16:9 Thumbnail from Device */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[#5B5470] dark:text-[#a49cb5]">
              Thumbnail (16:9)
            </label>
            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-white dark:bg-[#18122b] rounded-[18px] border border-[#E6E0F5] dark:border-[#2e234c]">
              <div className="w-full sm:w-48 aspect-video rounded-[14px] bg-[#EDE5FF] dark:bg-[#201838] overflow-hidden flex items-center justify-center border border-[#E6E0F5]">
                {thumbnailUrl ? (
                  <img
                    src={thumbnailUrl}
                    alt="Lesson thumbnail"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Logo size={36} />
                )}
              </div>

              <div className="space-y-2 text-center sm:text-left flex-1">
                <p className="text-xs text-[#5B5470] dark:text-[#a49cb5]">
                  Select an image from your device. It appears immediately in the preview card.
                </p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <label className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#6D28D9] rounded-[10px] cursor-pointer hover:bg-[#5B21B6]">
                    <Upload size={14} strokeWidth={2} />
                    <span>{thumbnailUrl ? 'Replace Image' : 'Choose from Device'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSelectThumbnail}
                      className="hidden"
                    />
                  </label>
                  {thumbnailUrl && (
                    <button
                      type="button"
                      onClick={() => setThumbnailUrl('')}
                      className="px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-[10px]"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Lesson Description with TipTap RichTextEditor */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-[#5B5470] dark:text-[#a49cb5]">
              Description
            </label>
            <RichTextEditor
              value={descriptionHtml}
              onChange={setDescriptionHtml}
              placeholder="Watch the example video first, then complete each activity."
            />
          </div>

          {/* Attached Files */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-[#5B5470] dark:text-[#a49cb5]">
                Attached Lesson Files ({files.length})
              </label>
              <label className="inline-flex items-center gap-1 text-xs font-semibold text-[#6D28D9] hover:underline cursor-pointer">
                <Plus size={14} strokeWidth={2} />
                <span>Add File (MP3, MP4, PPTX)</span>
                <input
                  type="file"
                  accept=".mp3,.mp4,.pptx,audio/*,video/*"
                  onChange={handleSelectLessonFile}
                  className="hidden"
                />
              </label>
            </div>

            {/* Uploading File Progress Indicator Card */}
            {isUploadingFile && (
              <div className="p-4 bg-[#EDE5FF]/60 dark:bg-[#201838] border border-[#d8cff0] dark:border-[#2e234c] rounded-[14px] space-y-2.5 shadow-sm">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText size={16} className="text-[#6D28D9] shrink-0 animate-pulse" />
                    <span className="font-semibold text-[#1C1530] dark:text-white truncate">
                      {uploadingFileName || 'Uploading file...'}
                    </span>
                  </div>
                  <span className="font-extrabold text-[#6D28D9] dark:text-[#a78bfa] shrink-0 ml-2">
                    {uploadProgress}%
                  </span>
                </div>
                <div className="w-full bg-white dark:bg-[#18122b] h-2.5 rounded-full overflow-hidden border border-[#E6E0F5] dark:border-[#2e234c]">
                  <div
                    className="bg-[#6D28D9] h-full rounded-full transition-all duration-150"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#5B5470]">
                  <span>Uploading to lesson files...</span>
                  <span>{uploadProgress === 100 ? 'Processing...' : 'Please wait'}</span>
                </div>
              </div>
            )}

            {files.length === 0 && !isUploadingFile ? (
              <div className="p-4 text-center rounded-[14px] border border-dashed border-[#E6E0F5] dark:border-[#2e234c] text-xs text-[#5B5470]">
                No files uploaded. Students can listen to audio clips or watch videos attached here.
              </div>
            ) : (
              <div className="space-y-2">
                {files.map((file, idx) => (
                  <FileCard
                    key={file.fileId}
                    file={file}
                    canDelete
                    onDelete={() => setFiles(files.filter((_, i) => i !== idx))}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Six Activity Slots with Moveable Sort and Edit/Delete */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#1C1530] dark:text-white">
                  Activities (6 levels)
                </h2>
                <p className="text-xs text-[#5B5470]">
                  Move up or down to rearrange activities across Bloom levels.
                </p>
              </div>
            </div>

            <div className="space-y-2.5">
              {allLevels.map((lvl) => {
                const act = activities[lvl];
                const typeMeta = ACTIVITY_TYPES[act.type] || ACTIVITY_TYPES['voice_recording'];

                return (
                  <div
                    key={lvl}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-white dark:bg-[#18122b] rounded-[18px] border border-[#E6E0F5] dark:border-[#2e234c] hover:border-[#8B5CF6] transition-colors gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Move Up / Down Buttons for Activity Sorting */}
                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleMoveActivity(lvl, 'up')}
                          disabled={lvl === 1}
                          className="p-1 text-[#5B5470] hover:text-[#6D28D9] disabled:opacity-20"
                          title="Move Activity Up"
                        >
                          <ArrowUp size={14} strokeWidth={2.5} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveActivity(lvl, 'down')}
                          disabled={lvl === 6}
                          className="p-1 text-[#5B5470] hover:text-[#6D28D9] disabled:opacity-20"
                          title="Move Activity Down"
                        >
                          <ArrowDown size={14} strokeWidth={2.5} />
                        </button>
                      </div>

                      <div className="w-10 h-10 rounded-[12px] bg-[#EDE5FF] dark:bg-[#201838] text-[#6D28D9] flex items-center justify-center shrink-0">
                        <ActivityIcon type={act.type} size={20} strokeWidth={1.8} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#6D28D9]">
                          {lvl} · {BLOOM_LEVELS[lvl].name}
                        </p>
                        <p className="text-sm font-semibold text-[#1C1530] dark:text-white truncate">
                          {act.title}
                        </p>
                        <p className="text-xs text-[#5B5470] truncate">
                          {typeMeta.label}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleResetActivity(lvl)}
                        className="p-1.5 text-xs text-[#5B5470] hover:text-red-600 rounded-[10px]"
                        title="Reset this activity slot"
                      >
                        <RotateCcw size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingLevel(lvl)}
                        className="px-3.5 py-1.5 text-xs font-semibold text-[#6D28D9] bg-[#EDE5FF] hover:bg-[#d8cff0] rounded-[10px] transition-colors"
                      >
                        Edit ›
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sticky Publish Button */}
          <div className="pt-4">
            <button
              type="button"
              onClick={() => handleSaveLesson('published')}
              disabled={saving || isUploadingFile}
              className="w-full min-h-[52px] sm:min-h-[44px] flex items-center justify-center gap-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-semibold text-sm sm:text-base rounded-[14px] shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <Check size={18} strokeWidth={2} />
              <span>{saving ? 'Publishing lesson...' : 'Publish lesson'}</span>
            </button>
          </div>
        </div>

        {/* Desktop Phone Frame Preview */}
        {showPhonePreview && (
          <div className="hidden lg:block w-[360px] sticky top-24 shrink-0 bg-slate-900 p-3 rounded-[36px] shadow-2xl border-4 border-slate-700">
            <div className="w-full h-[620px] bg-[#F7F4FF] dark:bg-[#0f0a1c] rounded-[28px] overflow-y-auto p-4 space-y-4">
              <div className="flex items-center justify-between text-xs font-semibold text-[#5B5470]">
                <span>Student Preview</span>
                <span className="text-[10px] bg-purple-100 text-[#6D28D9] px-2 py-0.5 rounded-full">
                  Interactive
                </span>
              </div>

              {thumbnailUrl && (
                <div className="aspect-video w-full rounded-[14px] overflow-hidden">
                  <img src={thumbnailUrl} className="w-full h-full object-cover" />
                </div>
              )}

              <div>
                <h3 className="font-extrabold text-base text-[#1C1530]">
                  {title || 'Lesson Title'}
                </h3>
                <div className="text-xs text-[#5B5470] mt-1">
                  <RichTextView html={descriptionHtml} />
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-bold text-[#1C1530]">
                  Bloom activities 0 / 6
                </span>
                {allLevels.map((lvl) => (
                  <div
                    key={lvl}
                    className="p-2.5 bg-white rounded-[14px] border border-[#E6E0F5] flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <ActivityIcon type={activities[lvl].type} size={16} />
                      <span className="font-semibold">{activities[lvl].title}</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100">
                      Locked
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Activity Settings & Full Type-Specific Builder Modal */}
      {editingLevel && (
        <ActivityConfigModal
          level={editingLevel}
          activity={activities[editingLevel]}
          onSave={(updated) => {
            setActivities((prev) => ({ ...prev, [editingLevel]: updated }));
            setEditingLevel(null);
          }}
          onClose={() => setEditingLevel(null)}
        />
      )}
    </div>
  );
};

interface ActivityConfigModalProps {
  level: BloomLevelNumber;
  activity: Activity;
  onSave: (updated: Activity) => void;
  onClose: () => void;
}

const ActivityConfigModal: React.FC<ActivityConfigModalProps> = ({
  level,
  activity,
  onSave,
  onClose,
}) => {
  const [current, setCurrent] = useState<Activity>({ ...activity, settings: { ...activity.settings } });

  const currentQuestions: QuizQuestion[] = current.settings.questions || [];

  const handleAddQuestion = () => {
    const newQ: QuizQuestion = {
      id: `q_${Date.now()}`,
      type: 'single_choice',
      textHtml: 'Enter question text...',
      options: ['Option 1', 'Option 2'],
      correctAnswers: [0],
      points: 10,
      explanation: '',
      order: currentQuestions.length + 1,
    };
    setCurrent({
      ...current,
      settings: {
        ...current.settings,
        questions: [...currentQuestions, newQ],
      },
    });
  };

  const handleUpdateQuestion = (qIndex: number, updatedQ: QuizQuestion) => {
    const list = [...currentQuestions];
    list[qIndex] = updatedQ;
    setCurrent({
      ...current,
      settings: { ...current.settings, questions: list },
    });
  };

  const handleDeleteQuestion = (qIndex: number) => {
    const list = currentQuestions.filter((_, idx) => idx !== qIndex);
    setCurrent({
      ...current,
      settings: { ...current.settings, questions: list },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-white dark:bg-[#18122b] rounded-[18px] p-6 space-y-5 max-h-[90vh] overflow-y-auto shadow-2xl border border-[#E6E0F5] dark:border-[#2e234c]">
        <div className="flex items-center justify-between border-b border-[#E6E0F5] dark:border-[#2e234c] pb-3">
          <div>
            <span className="text-xs font-bold text-[#6D28D9]">
              Level {level} · {BLOOM_LEVELS[level].name}
            </span>
            <h3 className="text-lg font-bold text-[#1C1530] dark:text-white">
              Configure Activity & Settings
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-[#5B5470] hover:text-[#1C1530]"
          >
            Cancel
          </button>
        </div>

        {/* Title */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-[#5B5470]">Activity Title</label>
          <input
            type="text"
            value={current.title}
            onChange={(e) => setCurrent({ ...current, title: e.target.value })}
            className="w-full p-2.5 text-xs rounded-lg border border-[#E6E0F5] dark:border-[#2e234c] bg-[#F7F4FF] dark:bg-[#201838]"
          />
        </div>

        {/* Activity Type Picker */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#5B5470]">Select Activity Type</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(Object.keys(ACTIVITY_TYPES) as ActivityType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setCurrent({
                    ...current,
                    type: t,
                    requiresReview: t !== 'quiz',
                  });
                }}
                className={`flex items-center gap-2 p-2.5 rounded-lg text-xs border text-left transition-colors ${
                  current.type === t
                    ? 'border-[#6D28D9] bg-[#EDE5FF] text-[#6D28D9] font-bold'
                    : 'border-[#E6E0F5] dark:border-[#2e234c] hover:bg-[#F7F4FF]'
                }`}
              >
                <ActivityIcon type={t} size={16} />
                <span className="truncate">{ACTIVITY_TYPES[t].label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-[#5B5470]">Instructions & Prompt</label>
          <RichTextEditor
            value={current.instructionsHtml}
            onChange={(html) => setCurrent({ ...current, instructionsHtml: html })}
          />
        </div>

        {/* TYPE-SPECIFIC BUILDER FIELDS */}
        {/* 1. QUIZ BUILDER FIELD (Appears right after instructions as requested!) */}
        {current.type === 'quiz' && (
          <div className="p-4 bg-[#F7F4FF] dark:bg-[#201838] rounded-[14px] border border-[#E6E0F5] dark:border-[#2e234c] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#6D28D9]">
                  Quiz Questions Builder ({currentQuestions.length})
                </h4>
                <p className="text-[11px] text-[#5B5470]">
                  Configure auto-graded questions, options, and pass criteria.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#6D28D9] rounded-lg hover:bg-[#5B21B6]"
              >
                <Plus size={14} />
                <span>Add Question</span>
              </button>
            </div>

            {/* Pass mark setting */}
            <div className="flex items-center gap-3 text-xs text-[#5B5470] bg-white dark:bg-[#18122b] p-3 rounded-lg border border-[#E6E0F5] dark:border-[#2e234c]">
              <span>Pass Mark (%):</span>
              <input
                type="number"
                min={10}
                max={100}
                value={current.settings.passMarkPercent || 70}
                onChange={(e) =>
                  setCurrent({
                    ...current,
                    settings: { ...current.settings, passMarkPercent: Number(e.target.value) },
                  })
                }
                className="w-20 p-1.5 rounded border border-[#E6E0F5] text-center font-bold"
              />
            </div>

            {/* Questions Stack */}
            <div className="space-y-3">
              {currentQuestions.map((q, qIdx) => (
                <div
                  key={q.id || qIdx}
                  className="p-3.5 bg-white dark:bg-[#18122b] rounded-lg border border-[#E6E0F5] dark:border-[#2e234c] space-y-2.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#6D28D9]">
                      Question #{qIdx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteQuestion(qIdx)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Question Type */}
                  <div className="flex items-center gap-2">
                    <span className="text-[#5B5470]">Type:</span>
                    <select
                      value={q.type}
                      onChange={(e) =>
                        handleUpdateQuestion(qIdx, {
                          ...q,
                          type: e.target.value as QuizQuestionType,
                        })
                      }
                      className="p-1.5 rounded border border-[#E6E0F5] bg-[#F7F4FF] dark:bg-[#201838]"
                    >
                      <option value="single_choice">Single Choice</option>
                      <option value="multiple_choice">Multiple Choice</option>
                      <option value="true_false">True / False</option>
                      <option value="short_text">Short Text Answer</option>
                    </select>
                  </div>

                  {/* Question Prompt */}
                  <input
                    type="text"
                    value={q.textHtml.replace(/<[^>]+>/g, '')}
                    onChange={(e) =>
                      handleUpdateQuestion(qIdx, {
                        ...q,
                        textHtml: e.target.value,
                      })
                    }
                    placeholder="Type the question prompt..."
                    className="w-full p-2 rounded border border-[#E6E0F5] bg-[#F7F4FF] dark:bg-[#201838]"
                  />

                  {/* Options (for choice types) */}
                  {(q.type === 'single_choice' || q.type === 'multiple_choice') && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] font-semibold text-[#5B5470]">
                        Answer Options (Select correct answer):
                      </span>
                      {q.options.map((opt, optIdx) => {
                        const isCorrect = q.correctAnswers.includes(optIdx);
                        return (
                          <div key={optIdx} className="flex items-center gap-2">
                            <input
                              type={q.type === 'single_choice' ? 'radio' : 'checkbox'}
                              checked={isCorrect}
                              onChange={() => {
                                if (q.type === 'single_choice') {
                                  handleUpdateQuestion(qIdx, { ...q, correctAnswers: [optIdx] });
                                } else {
                                  const updated = isCorrect
                                    ? q.correctAnswers.filter((a) => a !== optIdx)
                                    : [...q.correctAnswers, optIdx];
                                  handleUpdateQuestion(qIdx, { ...q, correctAnswers: updated });
                                }
                              }}
                              className="accent-[#6D28D9]"
                            />
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => {
                                const newOpts = [...q.options];
                                newOpts[optIdx] = e.target.value;
                                handleUpdateQuestion(qIdx, { ...q, options: newOpts });
                              }}
                              className="flex-1 p-1.5 text-xs rounded border border-[#E6E0F5]"
                            />
                            {q.options.length > 2 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const newOpts = q.options.filter((_, idx) => idx !== optIdx);
                                  handleUpdateQuestion(qIdx, { ...q, options: newOpts });
                                }}
                                className="text-slate-400 hover:text-red-500"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() =>
                          handleUpdateQuestion(qIdx, {
                            ...q,
                            options: [...q.options, `Option ${q.options.length + 1}`],
                          })
                        }
                        className="text-[11px] font-semibold text-[#6D28D9] hover:underline pt-1"
                      >
                        + Add Another Option
                      </button>
                    </div>
                  )}

                  {/* True/False selection */}
                  {q.type === 'true_false' && (
                    <div className="flex items-center gap-4 pt-1">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name={`tf_${qIdx}`}
                          checked={q.correctAnswers.includes(0)}
                          onChange={() => handleUpdateQuestion(qIdx, { ...q, options: ['True', 'False'], correctAnswers: [0] })}
                          className="accent-[#6D28D9]"
                        />
                        <span>True is Correct</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name={`tf_${qIdx}`}
                          checked={q.correctAnswers.includes(1)}
                          onChange={() => handleUpdateQuestion(qIdx, { ...q, options: ['True', 'False'], correctAnswers: [1] })}
                          className="accent-[#6D28D9]"
                        />
                        <span>False is Correct</span>
                      </label>
                    </div>
                  )}

                  {/* Short text accepted answer */}
                  {q.type === 'short_text' && (
                    <div className="space-y-1 pt-1">
                      <span className="text-[11px] font-semibold text-[#5B5470]">Accepted Answer:</span>
                      <input
                        type="text"
                        value={q.correctAnswers[0] || ''}
                        onChange={(e) => handleUpdateQuestion(qIdx, { ...q, correctAnswers: [e.target.value] })}
                        placeholder="e.g. please"
                        className="w-full p-2 text-xs rounded border border-[#E6E0F5]"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 2. VOICE RECORDING SETTINGS */}
        {current.type === 'voice_recording' && (
          <div className="p-3.5 bg-[#F7F4FF] dark:bg-[#201838] rounded-[14px] border border-[#E6E0F5] dark:border-[#2e234c] space-y-2 text-xs">
            <span className="font-bold text-[#6D28D9] uppercase">Voice Recording Settings</span>
            <div className="flex items-center gap-3">
              <span className="text-[#5B5470]">Max Duration (Seconds):</span>
              <input
                type="number"
                min={15}
                max={300}
                value={current.settings.maxDurationSeconds || 60}
                onChange={(e) =>
                  setCurrent({
                    ...current,
                    settings: { ...current.settings, maxDurationSeconds: Number(e.target.value) },
                  })
                }
                className="w-24 p-1.5 rounded border border-[#E6E0F5] text-center font-bold"
              />
            </div>
          </div>
        )}

        {/* 3. AI SPEAKING SETTINGS */}
        {current.type === 'ai_speaking' && (
          <div className="p-3.5 bg-[#F7F4FF] dark:bg-[#201838] rounded-[14px] border border-[#E6E0F5] dark:border-[#2e234c] space-y-2 text-xs">
            <span className="font-bold text-[#6D28D9] uppercase">AI Speaking Assistant Settings</span>
            <div className="space-y-2">
              <div>
                <label className="text-[#5B5470] block font-semibold">AI Role in Dialogue:</label>
                <input
                  type="text"
                  value={current.settings.aiRole || ''}
                  onChange={(e) =>
                    setCurrent({
                      ...current,
                      settings: { ...current.settings, aiRole: e.target.value },
                    })
                  }
                  placeholder="e.g. the waiter, an interviewer, a tour guide..."
                  className="w-full p-2 rounded border border-[#E6E0F5]"
                />
              </div>
              <div>
                <label className="text-[#5B5470] block font-semibold">Conversational Scenario:</label>
                <input
                  type="text"
                  value={current.settings.aiScenario || ''}
                  onChange={(e) =>
                    setCurrent({
                      ...current,
                      settings: { ...current.settings, aiScenario: e.target.value },
                    })
                  }
                  placeholder="e.g. Ordering lunch and asking for water at a restaurant..."
                  className="w-full p-2 rounded border border-[#E6E0F5]"
                />
              </div>
            </div>
          </div>
        )}

        {/* 4. TEXT RESPONSE SETTINGS */}
        {current.type === 'text_response' && (
          <div className="p-3.5 bg-[#F7F4FF] dark:bg-[#201838] rounded-[14px] border border-[#E6E0F5] dark:border-[#2e234c] space-y-2 text-xs">
            <span className="font-bold text-[#6D28D9] uppercase">Text Response Limits</span>
            <div className="flex items-center gap-4">
              <div>
                <span className="text-[#5B5470]">Min Words: </span>
                <input
                  type="number"
                  min={5}
                  value={current.settings.minWordCount || 10}
                  onChange={(e) =>
                    setCurrent({
                      ...current,
                      settings: { ...current.settings, minWordCount: Number(e.target.value) },
                    })
                  }
                  className="w-20 p-1.5 rounded border border-[#E6E0F5] text-center"
                />
              </div>
              <div>
                <span className="text-[#5B5470]">Max Words: </span>
                <input
                  type="number"
                  min={20}
                  value={current.settings.maxWordCount || 200}
                  onChange={(e) =>
                    setCurrent({
                      ...current,
                      settings: { ...current.settings, maxWordCount: Number(e.target.value) },
                    })
                  }
                  className="w-20 p-1.5 rounded border border-[#E6E0F5] text-center"
                />
              </div>
            </div>
          </div>
        )}

        {/* 5. FILE UPLOAD SETTINGS */}
        {current.type === 'file_upload' && (
          <div className="p-3.5 bg-[#F7F4FF] dark:bg-[#201838] rounded-[14px] border border-[#E6E0F5] dark:border-[#2e234c] space-y-2 text-xs">
            <span className="font-bold text-[#6D28D9] uppercase">Allowed Submission Formats</span>
            <p className="text-[#5B5470]">Students can upload audio recordings, videos, PDFs, or slides.</p>
          </div>
        )}

        <div className="pt-3 border-t border-[#E6E0F5] dark:border-[#2e234c] flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#5B5470]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSave(current)}
            className="px-5 py-2 text-xs font-semibold text-white bg-[#6D28D9] hover:bg-[#5B21B6] rounded-lg"
          >
            Save Activity
          </button>
        </div>
      </div>
    </div>
  );
};
