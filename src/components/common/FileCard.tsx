import React, { useState } from 'react';
import { Download, Music, Video, FileText, Play, Pause, Trash2, Eye } from 'lucide-react';
import { LessonFile } from '../../types';

import { resolveFileUrl } from '../../firebase/storageService';

interface FileCardProps {
  file: LessonFile;
  onDelete?: () => void;
  canDelete?: boolean;
  onDownload?: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export const FileCard: React.FC<FileCardProps> = ({
  file,
  onDelete,
  canDelete = false,
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);
  const [resolvedVideoUrl, setResolvedVideoUrl] = useState<string | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const getFileIcon = () => {
    switch (file.kind) {
      case 'mp3':
        return <Music size={22} strokeWidth={1.8} className="text-[#6D28D9]" />;
      case 'mp4':
        return <Video size={22} strokeWidth={1.8} className="text-[#6D28D9]" />;
      case 'pptx':
        return <FileText size={22} strokeWidth={1.8} className="text-[#8B5CF6]" />;
    }
  };

  const handleToggleAudio = async () => {
    if (!file.downloadUrl) return;
    if (isPlayingAudio && audioEl) {
      audioEl.pause();
      setIsPlayingAudio(false);
    } else {
      try {
        const actionableUrl = await resolveFileUrl(file.downloadUrl);
        let player = audioEl;
        if (!player || player.src !== actionableUrl) {
          player = new Audio(actionableUrl);
          player.onended = () => setIsPlayingAudio(false);
          player.onerror = () => setIsPlayingAudio(false);
          setAudioEl(player);
        }
        player.play();
        setIsPlayingAudio(true);
      } catch (err) {
        console.error('Audio playback error:', err);
        setIsPlayingAudio(false);
      }
    }
  };

  const handleOpenVideo = async () => {
    if (!file.downloadUrl) return;
    const actionableUrl = await resolveFileUrl(file.downloadUrl);
    setResolvedVideoUrl(actionableUrl);
    setShowVideoModal(true);
  };

  const handleDownload = async () => {
    if (!file.downloadUrl) return;
    try {
      setDownloading(true);
      const actionableUrl = await resolveFileUrl(file.downloadUrl);
      const link = document.createElement('a');
      link.href = actionableUrl;
      link.download = file.displayName || file.originalFileName;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Download error:', e);
    } finally {
      setTimeout(() => setDownloading(false), 800);
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white dark:bg-[#18122b] border border-[#E6E0F5] dark:border-[#2e234c] rounded-[18px] shadow-sm hover:border-[#8B5CF6] transition-colors">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-[14px] bg-[#EDE5FF] dark:bg-[#201838] flex items-center justify-center shrink-0">
            {getFileIcon()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[#1C1530] dark:text-[#f3f0fc] truncate">
              {file.displayName || file.originalFileName}
            </p>
            <p className="text-xs text-[#5B5470] dark:text-[#a49cb5] flex items-center gap-2">
              <span className="uppercase">{file.kind}</span>
              <span>·</span>
              <span>{formatBytes(file.sizeBytes)}</span>
              {file.levelScope !== 'lesson' && (
                <>
                  <span>·</span>
                  <span>Level {file.levelScope}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          {file.kind === 'mp3' && file.downloadUrl && (
            <button
              type="button"
              onClick={handleToggleAudio}
              className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] text-xs font-semibold text-[#6D28D9] bg-[#EDE5FF] hover:bg-[#d8cff0] rounded-[14px] transition-colors"
              aria-label={isPlayingAudio ? 'Pause audio' : 'Play audio'}
            >
              {isPlayingAudio ? (
                <>
                  <Pause size={16} strokeWidth={2} />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play size={16} strokeWidth={2} />
                  <span>Listen</span>
                </>
              )}
            </button>
          )}

          {file.kind === 'mp4' && file.downloadUrl && (
            <button
              type="button"
              onClick={handleOpenVideo}
              className="inline-flex items-center gap-1.5 px-3 py-2 min-h-[44px] text-xs font-semibold text-[#6D28D9] bg-[#EDE5FF] hover:bg-[#d8cff0] rounded-[14px] transition-colors"
              aria-label="Watch video"
            >
              <Eye size={16} strokeWidth={2} />
              <span>Watch</span>
            </button>
          )}

          {file.downloadUrl && (
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] text-xs font-semibold text-[#1C1530] dark:text-[#f3f0fc] bg-[#F7F4FF] dark:bg-[#201838] hover:bg-[#EDE5FF] border border-[#E6E0F5] dark:border-[#2e234c] rounded-[14px] transition-colors"
              title="Download file"
              aria-label="Download file"
            >
              <Download size={16} strokeWidth={1.8} />
              <span>{downloading ? 'Downloading...' : 'Download'}</span>
            </button>
          )}

          {canDelete && onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-[14px] transition-colors"
              title="Remove file"
              aria-label="Remove file"
            >
              <Trash2 size={16} strokeWidth={1.8} />
            </button>
          )}
        </div>
      </div>

      {/* Video Modal Player */}
      {showVideoModal && (resolvedVideoUrl || file.downloadUrl) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="flex flex-col w-full max-w-2xl bg-black rounded-[18px] overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-zinc-900 text-white">
              <span className="text-sm font-medium truncate">
                {file.displayName || file.originalFileName}
              </span>
              <button
                onClick={() => setShowVideoModal(false)}
                className="text-xs px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700"
              >
                Close
              </button>
            </div>
            <video
              src={resolvedVideoUrl || file.downloadUrl}
              controls
              autoPlay
              className="w-full max-h-[70vh] bg-black"
            />
          </div>
        </div>
      )}
    </>
  );
};
