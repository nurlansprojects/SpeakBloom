import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { ZoomIn, ZoomOut, Check, X } from 'lucide-react';

interface ImageCropperProps {
  imageSrc: string;
  aspectRatio: number; // 16/9 for thumbnails, 1 for avatar
  targetWidth: number; // 1280 for thumbnails, 512 for avatar
  targetHeight: number; // 720 for thumbnails, 512 for avatar
  onCropComplete: (croppedDataUrl: string) => void;
  onCancel: () => void;
}

interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  targetWidth: number,
  targetHeight: number
): Promise<string> {
  const image = new Image();
  image.src = imageSrc;
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
  });

  // Scale down target dimensions to prevent oversized data URLs
  const maxW = targetWidth > 640 ? 640 : targetWidth;
  const maxH = targetHeight > 360 ? 360 : targetHeight;

  const canvas = document.createElement('canvas');
  canvas.width = maxW;
  canvas.height = maxH;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas context unavailable');
  }

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    maxW,
    maxH
  );

  return canvas.toDataURL('image/jpeg', 0.7);
}

export const ImageCropper: React.FC<ImageCropperProps> = ({
  imageSrc,
  aspectRatio,
  targetWidth,
  targetHeight,
  onCropComplete,
  onCancel,
}) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [processing, setProcessing] = useState(false);

  const onCropChange = useCallback((newCrop: { x: number; y: number }) => {
    setCrop(newCrop);
  }, []);

  const onZoomChange = useCallback((newZoom: number) => {
    setZoom(newZoom);
  }, []);

  const onCropCompleteHandler = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    try {
      setProcessing(true);
      const croppedImage = await getCroppedImg(
        imageSrc,
        croppedAreaPixels,
        targetWidth,
        targetHeight
      );
      onCropComplete(croppedImage);
    } catch (e) {
      console.error('Cropping error:', e);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="flex flex-col w-full max-w-xl bg-white dark:bg-[#18122b] rounded-[18px] overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E6E0F5] dark:border-[#2e234c]">
          <h3 className="text-base font-semibold text-[#1C1530] dark:text-[#f3f0fc]">
            Adjust Image
          </h3>
          <button
            onClick={onCancel}
            className="p-1 rounded-lg text-[#5B5470] hover:bg-[#F7F4FF] dark:hover:bg-[#201838]"
            aria-label="Close"
          >
            <X size={20} strokeWidth={2} />
          </button>
        </div>

        {/* Cropper Container */}
        <div className="relative w-full h-72 sm:h-96 bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onCropCompleteHandler}
          />
        </div>

        {/* Zoom controls & Actions */}
        <div className="flex flex-col gap-4 p-6 bg-[#F7F4FF] dark:bg-[#201838]">
          <div className="flex items-center gap-3">
            <ZoomOut size={18} className="text-[#5B5470]" />
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-[#6D28D9]"
            />
            <ZoomIn size={18} className="text-[#5B5470]" />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2.5 text-sm font-medium text-[#5B5470] bg-white dark:bg-[#18122b] border border-[#E6E0F5] dark:border-[#2e234c] rounded-[14px] hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={processing}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#6D28D9] rounded-[14px] hover:bg-[#5B21B6] disabled:opacity-50"
            >
              <Check size={16} strokeWidth={2} />
              {processing ? 'Processing...' : 'Apply Crop'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
