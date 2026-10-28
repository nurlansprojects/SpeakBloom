import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ImageCropper } from '../../components/common/ImageCropper';
import { X, Upload, Check, AlertCircle, Camera } from 'lucide-react';
import { uploadAvatar, resizeAndCompressImage } from '../../firebase/storageService';

interface EditProfileModalProps {
  onClose: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ onClose }) => {
  const { profile, updateProfileData, changeUsername } = useAuth();

  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [photoURL, setPhotoURL] = useState(profile?.photoURL || '');
  const [rawPhotoForCrop, setRawPhotoForCrop] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSelectPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|svg)$/i.test(file.name);
      if (!isImage) {
        setErrorMessage('Please choose a valid image file (JPG, PNG, or WebP).');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setErrorMessage('Image size must be smaller than 10 MB.');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const raw = reader.result as string;
          // Immediately compress to 256x256 and display right away
          const compressed = await resizeAndCompressImage(raw, 256, 256, 0.75);
          setPhotoURL(compressed);
          setErrorMessage(null);
        } catch (err) {
          console.warn('Profile image preview notice:', err);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (displayName.trim().length < 2 || displayName.trim().length > 40) {
      setErrorMessage('Display name must be between 2 and 40 characters.');
      return;
    }

    if (bio.length > 160) {
      setErrorMessage('Bio must be 160 characters or less.');
      return;
    }

    try {
      setSaving(true);

      // If username changed, update through changeUsername check
      if (username.trim().toLowerCase() !== profile?.username?.toLowerCase()) {
        const usernameRes = await changeUsername(username.trim().toLowerCase());
        if (!usernameRes.success) {
          setErrorMessage(usernameRes.error || 'Username could not be changed.');
          setSaving(false);
          return;
        }
      }

      let finalPhotoURL = photoURL;
      if (photoURL && profile?.uid && photoURL.startsWith('data:')) {
        try {
          finalPhotoURL = await uploadAvatar(profile.uid, photoURL);
        } catch {
          // fallback to compressed data URL
        }
      }

      // Update remaining profile fields
      await updateProfileData({
        displayName: displayName.trim(),
        bio: bio.trim(),
        photoURL: finalPhotoURL || '',
      });

      setSuccessMessage('Profile updated successfully.');
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      setErrorMessage('Failed to save profile changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const initials = displayName
    ? displayName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'SB';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex flex-col w-full max-w-md bg-white dark:bg-[#18122b] rounded-[18px] border border-[#E6E0F5] dark:border-[#2e234c] overflow-hidden shadow-2xl max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E6E0F5] dark:border-[#2e234c]">
          <h2 className="text-base font-bold text-[#1C1530] dark:text-white">
            Edit Profile
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#5B5470] hover:bg-[#F7F4FF] dark:hover:bg-[#201838]"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto">
          {errorMessage && (
            <div className="p-3 text-xs text-red-700 bg-red-50 dark:bg-red-950/40 rounded-[14px] border border-red-200">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="p-3 text-xs text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 rounded-[14px] border border-emerald-200">
              {successMessage}
            </div>
          )}

          {/* Avatar upload from device */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[#6D28D9] text-white flex items-center justify-center font-bold text-lg overflow-hidden border border-[#E6E0F5] shrink-0 shadow-sm">
              {photoURL ? (
                <img
                  src={photoURL}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div className="space-y-1">
              <label className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#6D28D9] bg-[#EDE5FF] hover:bg-[#d8cff0] rounded-[10px] cursor-pointer transition-colors">
                <Upload size={14} strokeWidth={2} />
                <span>{photoURL ? 'Change Photo' : 'Upload Photo'}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleSelectPhoto}
                  className="hidden"
                />
              </label>
              {photoURL && (
                <button
                  type="button"
                  onClick={() => setPhotoURL('')}
                  className="block text-[11px] text-red-600 hover:underline"
                >
                  Remove photo
                </button>
              )}
            </div>
          </div>

          {/* Display Name */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#5B5470]">
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full p-3 text-xs rounded-[14px] border border-[#E6E0F5] dark:border-[#2e234c] bg-[#F7F4FF] dark:bg-[#201838]"
              maxLength={40}
              required
            />
          </div>

          {/* Username */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#5B5470]">
              Username
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#5B5470]">
                @
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
                className="w-full pl-7 pr-3 py-3 text-xs rounded-[14px] border border-[#E6E0F5] dark:border-[#2e234c] bg-[#F7F4FF] dark:bg-[#201838]"
                maxLength={20}
                required
              />
            </div>
            <p className="text-[11px] text-[#5B5470]">
              3-20 lowercase alphanumeric characters and underscores.
            </p>
          </div>

          {/* Bio */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-[#5B5470]">
              <span>Bio</span>
              <span>{bio.length} / 160</span>
            </div>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={160}
              placeholder="Tell others about your English learning goals..."
              className="w-full p-3 text-xs rounded-[14px] border border-[#E6E0F5] dark:border-[#2e234c] bg-[#F7F4FF] dark:bg-[#201838]"
            />
          </div>

          {/* Read-only email & role */}
          <div className="p-3 bg-[#F7F4FF] dark:bg-[#201838] rounded-[14px] text-xs space-y-1 border border-[#E6E0F5] dark:border-[#2e234c]">
            <p className="text-[#5B5470]">Email: <span className="text-[#1C1530] dark:text-white font-medium">{profile?.email}</span></p>
            <p className="text-[#5B5470]">Role: <span className="text-[#6D28D9] font-bold capitalize">{profile?.role}</span></p>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-[#5B5470] rounded-[14px] hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-[#6D28D9] hover:bg-[#5B21B6] rounded-[14px] disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Optional Cropper if user specifically requests crop */}
      {rawPhotoForCrop && (
        <ImageCropper
          imageSrc={rawPhotoForCrop}
          aspectRatio={1}
          targetWidth={256}
          targetHeight={256}
          onCropComplete={async (croppedUrl) => {
            setRawPhotoForCrop(null);
            setPhotoURL(croppedUrl);
          }}
          onCancel={() => setRawPhotoForCrop(null)}
        />
      )}
    </div>
  );
};
