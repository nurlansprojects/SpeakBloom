import React, { useState } from 'react';
import { Upload, FileText, CheckCircle, Trash2, Send } from 'lucide-react';
import { Activity } from '../../../types';

interface FileUploadPlayerProps {
  activity: Activity;
  onSubmit: (data: { files: Array<{ name: string; url: string; size: number; mimeType: string }> }) => Promise<void>;
  submitting: boolean;
}

export const FileUploadPlayer: React.FC<FileUploadPlayerProps> = ({
  activity,
  onSubmit,
  submitting,
}) => {
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    url: string;
    size: number;
    mimeType: string;
  } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedFile({
        name: file.name,
        url: reader.result as string,
        size: file.size,
        mimeType: file.type,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;
    await onSubmit({ files: [selectedFile] });
  };

  return (
    <div className="p-6 bg-white dark:bg-[#18122b] rounded-[18px] border border-[#E6E0F5] dark:border-[#2e234c] space-y-6">
      <div className="text-center space-y-1">
        <h3 className="text-base font-bold text-[#1C1530] dark:text-white">
          Upload Your Work
        </h3>
        <p className="text-xs text-[#5B5470] dark:text-[#a49cb5]">
          Supported files: Audio, Video, PDF, Presentation, or Image (Max 50 MB)
        </p>
      </div>

      {/* Upload Drag & Drop Area */}
      {!selectedFile ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-[18px] transition-colors cursor-pointer ${
            dragOver
              ? 'border-[#6D28D9] bg-[#EDE5FF]/30'
              : 'border-[#E6E0F5] dark:border-[#2e234c] hover:border-[#8B5CF6] bg-[#F7F4FF]/50 dark:bg-[#201838]/50'
          }`}
          onClick={() => document.getElementById('file-upload-input')?.click()}
        >
          <input
            id="file-upload-input"
            type="file"
            className="hidden"
            accept="audio/*,video/*,image/*,.pdf,.pptx"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFile(e.target.files[0]);
              }
            }}
          />
          <div className="w-14 h-14 rounded-full bg-[#EDE5FF] text-[#6D28D9] flex items-center justify-center mb-3">
            <Upload size={24} strokeWidth={2} />
          </div>
          <p className="text-sm font-semibold text-[#1C1530] dark:text-white">
            Choose file from your device
          </p>
          <p className="text-xs text-[#5B5470] mt-1">
            or drag and drop here
          </p>
        </div>
      ) : (
        /* Selected File Card */
        <div className="flex items-center justify-between p-4 bg-[#F7F4FF] dark:bg-[#201838] rounded-[18px] border border-[#E6E0F5] dark:border-[#2e234c]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-[12px] bg-[#EDE5FF] text-[#6D28D9] flex items-center justify-center shrink-0">
              <FileText size={20} strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[#1C1530] dark:text-white truncate">
                {selectedFile.name}
              </p>
              <p className="text-xs text-[#5B5470]">
                {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB · Ready to submit
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedFile(null)}
            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg"
            title="Remove file"
          >
            <Trash2 size={16} strokeWidth={2} />
          </button>
        </div>
      )}

      {/* Submit Button */}
      {selectedFile && (
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#6D28D9] hover:bg-[#5B21B6] rounded-[14px] disabled:opacity-50"
          >
            <Send size={16} strokeWidth={2} />
            <span>{submitting ? 'Submitting...' : 'Submit File'}</span>
          </button>
        </div>
      )}
    </div>
  );
};
