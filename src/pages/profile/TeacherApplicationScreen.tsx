import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { ChevronLeft, Upload, FileText, CheckCircle, Trash2 } from 'lucide-react';

export const TeacherApplicationScreen: React.FC = () => {
  const { firebaseUser, profile } = useAuth();
  const navigate = useNavigate();

  const [reason, setReason] = useState('');
  const [experience, setExperience] = useState('');
  const [attachedFile, setAttachedFile] = useState<{ name: string; url: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSelectFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedFile({
          name: file.name,
          url: reader.result as string,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) return;

    if (!reason.trim()) {
      setErrorMessage('Please state why you want to teach on SpeakBloom.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);

      const appDoc = {
        uid: firebaseUser.uid,
        displayName: profile?.displayName || 'Applicant',
        email: profile?.email || '',
        reason: reason.trim(),
        experience: experience.trim(),
        files: attachedFile ? [attachedFile] : [],
        status: 'submitted',
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'teacherApplications', firebaseUser.uid), appDoc);
      setSubmitted(true);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `teacherApplications/${firebaseUser.uid}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-md mx-auto py-12 px-6 bg-white dark:bg-[#18122b] rounded-[18px] border border-[#E6E0F5] dark:border-[#2e234c] text-center space-y-4 shadow-sm">
        <div className="w-16 h-16 rounded-full bg-[#EDE5FF] text-[#6D28D9] flex items-center justify-center mx-auto">
          <CheckCircle size={36} strokeWidth={2} />
        </div>
        <h2 className="text-xl font-bold text-[#1C1530] dark:text-white">
          Application Submitted
        </h2>
        <p className="text-xs text-[#5B5470] dark:text-[#a49cb5] leading-relaxed">
          Thank you for applying. An administrator will review your application and update your role.
        </p>
        <button
          onClick={() => navigate('/profile')}
          className="w-full py-3 text-xs font-semibold text-white bg-[#6D28D9] rounded-[14px]"
        >
          Return to Profile
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Top Header (Matches PDF Page 9) */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/profile')}
          className="p-1 -ml-1 text-[#5B5470] hover:text-[#1C1530]"
        >
          <ChevronLeft size={20} strokeWidth={2} />
        </button>
        <h1 className="text-lg font-bold text-[#1C1530] dark:text-white">
          Teacher application
        </h1>
      </div>

      {/* 3 Steps indicator (Matches PDF Page 9: 1 Submit, 2 Review, 3 Approved) */}
      <div className="flex items-center justify-between p-1.5 bg-[#EDE5FF]/60 dark:bg-[#201838] rounded-[14px]">
        <div className="flex-1 py-1.5 px-3 rounded-[10px] bg-white dark:bg-[#18122b] text-[#6D28D9] font-bold text-xs text-center shadow-xs">
          1 Submit
        </div>
        <div className="flex-1 py-1.5 px-3 text-xs text-[#5B5470] text-center font-medium">
          2 Review
        </div>
        <div className="flex-1 py-1.5 px-3 text-xs text-[#5B5470] text-center font-medium">
          3 Approved
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 text-xs text-red-700 bg-red-50 dark:bg-red-950/40 rounded-[14px] border border-red-200">
          {errorMessage}
        </div>
      )}

      {/* Form Fields (Matches PDF Page 9) */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Why teach */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#1C1530] dark:text-white">
            Why do you want to teach?
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            placeholder="Tell us about your goals..."
            required
            className="w-full p-3 text-xs sm:text-sm rounded-[14px] border border-[#E6E0F5] dark:border-[#2e234c] bg-white dark:bg-[#18122b] focus:outline-none focus:border-[#6D28D9]"
          />
        </div>

        {/* Teaching experience */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#1C1530] dark:text-white">
            Teaching experience
          </label>
          <input
            type="text"
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            placeholder="e.g. 2 years tutoring"
            className="w-full p-3 text-xs sm:text-sm rounded-[14px] border border-[#E6E0F5] dark:border-[#2e234c] bg-white dark:bg-[#18122b] focus:outline-none focus:border-[#6D28D9]"
          />
        </div>

        {/* Certificate or sample upload */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#1C1530] dark:text-white">
            Certificate or sample (optional)
          </label>
          {!attachedFile ? (
            <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-[#E6E0F5] dark:border-[#2e234c] rounded-[18px] cursor-pointer hover:border-[#8B5CF6] transition-colors">
              <input
                type="file"
                accept=".pdf,image/*,video/*"
                onChange={handleSelectFile}
                className="hidden"
              />
              <FileText size={24} className="text-[#6D28D9] mb-1.5" />
              <span className="text-xs font-semibold text-[#1C1530] dark:text-white">
                Upload file
              </span>
              <span className="text-[11px] text-[#5B5470] mt-0.5">
                PDF, image or video
              </span>
            </label>
          ) : (
            <div className="flex items-center justify-between p-3 bg-white dark:bg-[#18122b] rounded-[14px] border border-[#E6E0F5] dark:border-[#2e234c]">
              <div className="flex items-center gap-2 text-xs font-medium truncate">
                <FileText size={16} className="text-[#6D28D9] shrink-0" />
                <span className="truncate">{attachedFile.name}</span>
              </div>
              <button
                type="button"
                onClick={() => setAttachedFile(null)}
                className="p-1 text-red-500 hover:text-red-700"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Submit Button & Subtext (Matches PDF Page 9) */}
        <div className="pt-4 space-y-2 text-center">
          <button
            type="submit"
            disabled={submitting}
            className="w-full min-h-[52px] sm:min-h-[44px] bg-[#6D28D9] hover:bg-[#5B21B6] text-white font-semibold text-sm rounded-[14px] shadow-sm transition-all disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit application'}
          </button>
          <p className="text-[11px] text-[#5B5470]">
            An admin reviews it, usually within 2 days.
          </p>
        </div>
      </form>
    </div>
  );
};
