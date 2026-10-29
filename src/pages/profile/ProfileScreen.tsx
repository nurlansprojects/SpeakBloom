import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, onSnapshot, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { TeacherApplication, Submission } from '../../types';
import {
  User,
  Award,
  Flame,
  BookOpen,
  ChevronRight,
  Edit2,
  FileText,
  LogOut,
  CheckCircle,
  Sparkles,
  Camera,
} from 'lucide-react';
import { EditProfileModal } from './EditProfileModal';
import { resizeAndCompressImage } from '../../firebase/storageService';

export const ProfileScreen: React.FC = () => {
  const { profile, role, signOutUser, firebaseUser, updateProfileData } = useAuth();
  const navigate = useNavigate();

  const [application, setApplication] = useState<TeacherApplication | null>(null);
  const [submissionCount, setSubmissionCount] = useState(0);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [updatingPhoto, setUpdatingPhoto] = useState(false);

  const handleDirectPhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|svg)$/i.test(file.name);
      if (!isImage) return;

      try {
        setUpdatingPhoto(true);
        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            const raw = reader.result as string;
            const compressed = await resizeAndCompressImage(raw, 256, 256, 0.8);
            await updateProfileData({ photoURL: compressed });
          } catch (err) {
            console.error('Failed to update photo:', err);
          } finally {
            setUpdatingPhoto(false);
          }
        };
        reader.readAsDataURL(file);
      } catch {
        setUpdatingPhoto(false);
      }
    }
  };

  useEffect(() => {
    if (!firebaseUser) return;

    // Check teacher application status for current user doc
    const appDocRef = doc(db, 'teacherApplications', firebaseUser.uid);
    const unsubscribeApp = onSnapshot(
      appDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setApplication(docSnap.data() as TeacherApplication);
        } else {
          setApplication(null);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, `teacherApplications/${firebaseUser.uid}`);
      }
    );

    // Count user submissions
    const subsQ = query(
      collection(db, 'submissions'),
      where('studentId', '==', firebaseUser.uid)
    );
    const unsubscribeSubs = onSnapshot(
      subsQ,
      (snap) => {
        setSubmissionCount(snap.size);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'submissions');
      }
    );

    return () => {
      unsubscribeApp();
      unsubscribeSubs();
    };
  }, [firebaseUser]);

  const initials = profile?.displayName
    ? profile.displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'SB';

  return (
    <div className="max-w-md mx-auto space-y-6">
      {/* Profile Header (Matches PDF Page 8) */}
      <div className="flex flex-col items-center text-center space-y-3 pt-4">
        <div className="relative group">
          {profile?.photoURL ? (
            <img
              src={profile.photoURL}
              alt={profile.displayName}
              className="w-24 h-24 rounded-full object-cover border-2 border-[#6D28D9] shadow-sm"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-[#6D28D9] text-white flex items-center justify-center font-extrabold text-2xl shadow-md">
              {initials}
            </div>
          )}

          {/* Quick change photo button */}
          <label
            className="absolute bottom-0 right-0 p-2 rounded-full bg-white dark:bg-[#18122b] text-[#6D28D9] border border-[#E6E0F5] dark:border-[#2e234c] shadow-sm hover:scale-105 transition-transform cursor-pointer"
            aria-label="Change Profile Photo"
            title="Change photo"
          >
            <Camera size={14} strokeWidth={2} />
            <input
              type="file"
              accept="image/*"
              onChange={handleDirectPhotoChange}
              disabled={updatingPhoto}
              className="hidden"
            />
          </label>
        </div>

        {updatingPhoto && (
          <span className="text-xs text-[#6D28D9] font-medium animate-pulse">
            Updating profile photo...
          </span>
        )}

        <div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-[#1C1530] dark:text-white">
              {profile?.displayName || 'Scholar'}
            </h1>
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="p-1.5 rounded-full text-[#6D28D9] hover:bg-[#EDE5FF] transition-colors"
              aria-label="Edit Profile"
              title="Edit Profile"
            >
              <Edit2 size={15} strokeWidth={2} />
            </button>
          </div>
          <p className="text-xs text-[#5B5470] dark:text-[#a49cb5] mt-0.5">
            @{profile?.username || 'user'}
          </p>
          <span className="inline-block mt-2 px-3 py-1 text-xs font-semibold rounded-full bg-[#EDE5FF] text-[#6D28D9] capitalize">
            {role}
          </span>
          {profile?.bio && (
            <p className="text-xs text-[#5B5470] mt-2 max-w-xs mx-auto">
              {profile.bio}
            </p>
          )}
        </div>
      </div>

      {/* Stats Counter Bar (Matches PDF Page 8: Lessons, Day streak, Level) */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3.5 bg-white dark:bg-[#18122b] rounded-[18px] border border-[#E6E0F5] dark:border-[#2e234c] text-center shadow-sm">
          <p className="text-xl sm:text-2xl font-extrabold text-[#1C1530] dark:text-white">
            {submissionCount}
          </p>
          <p className="text-[11px] text-[#5B5470] mt-0.5">Submissions</p>
        </div>

        <div className="p-3.5 bg-white dark:bg-[#18122b] rounded-[18px] border border-[#E6E0F5] dark:border-[#2e234c] text-center shadow-sm">
          <p className="text-xl sm:text-2xl font-extrabold text-[#1C1530] dark:text-white">
            {profile?.streak || 1}
          </p>
          <p className="text-[11px] text-[#5B5470] mt-0.5">Day streak</p>
        </div>

        <div className="p-3.5 bg-white dark:bg-[#18122b] rounded-[18px] border border-[#E6E0F5] dark:border-[#2e234c] text-center shadow-sm">
          <p className="text-xl sm:text-2xl font-extrabold text-[#6D28D9] dark:text-[#a78bfa]">
            Apply
          </p>
          <p className="text-[11px] text-[#5B5470] mt-0.5">Bloom Level</p>
        </div>
      </div>

      {/* Teacher Application Banner (Matches PDF Page 8) */}
      {role === 'student' && (
        <div className="p-5 bg-gradient-to-br from-[#EDE5FF] to-white dark:from-[#201838] dark:to-[#18122b] rounded-[18px] border border-[#d8cff0] dark:border-[#2e234c] space-y-3">
          {application ? (
            <div className="space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6D28D9]">
                Teacher Application Status
              </span>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold capitalize text-[#1C1530] dark:text-white">
                  {application.status === 'review'
                    ? 'In Review'
                    : application.status === 'submitted'
                    ? 'Submitted'
                    : application.status}
                </span>
                <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700">
                  {application.status}
                </span>
              </div>
              <p className="text-xs text-[#5B5470]">
                {application.status === 'approved'
                  ? 'Congratulations! Your application has been approved.'
                  : 'An administrator is reviewing your teaching credentials.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <h3 className="font-bold text-base text-[#1C1530] dark:text-white">
                  Want to teach on SpeakBloom?
                </h3>
                <p className="text-xs text-[#5B5470] dark:text-[#a49cb5] mt-1 leading-relaxed">
                  Apply for a teacher role and create your own lessons across the 6 Bloom levels.
                </p>
              </div>
              <button
                onClick={() => navigate('/apply-teacher')}
                className="w-full py-3.5 bg-[#6D28D9] hover:bg-[#5B21B6] text-white text-sm font-semibold rounded-[14px] shadow-sm transition-all"
              >
                Apply to be a teacher
              </button>
            </div>
          )}
        </div>
      )}

      {/* Grouped Settings Rows (Matches PDF Page 8) */}
      <div className="bg-white dark:bg-[#18122b] rounded-[18px] border border-[#E6E0F5] dark:border-[#2e234c] divide-y divide-[#E6E0F5] dark:divide-[#2e234c] overflow-hidden">
        <button
          onClick={() => navigate('/lessons')}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-[#F7F4FF] dark:hover:bg-[#201838] transition-colors"
        >
          <div className="flex items-center gap-3">
            <BookOpen size={20} className="text-[#6D28D9]" />
            <span className="text-sm font-semibold text-[#1C1530] dark:text-white">
              My progress
            </span>
          </div>
          <ChevronRight size={18} className="text-[#5B5470]" />
        </button>

        <button
          onClick={() => setIsEditModalOpen(true)}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-[#F7F4FF] dark:hover:bg-[#201838] transition-colors"
        >
          <div className="flex items-center gap-3">
            <Edit2 size={20} className="text-[#6D28D9]" />
            <span className="text-sm font-semibold text-[#1C1530] dark:text-white">
              Edit profile & username
            </span>
          </div>
          <ChevronRight size={18} className="text-[#5B5470]" />
        </button>

        <button
          onClick={() => signOutUser()}
          className="w-full flex items-center justify-between p-4 text-left hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 transition-colors"
        >
          <div className="flex items-center gap-3">
            <LogOut size={20} />
            <span className="text-sm font-semibold">Sign Out</span>
          </div>
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <EditProfileModal onClose={() => setIsEditModalOpen(false)} />
      )}
    </div>
  );
};
