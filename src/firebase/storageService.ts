import { ref, uploadString, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './config';

/**
 * Resizes and compresses an image data URL or blob safely using HTML5 Canvas.
 * Prevents Firestore document 1MB size limit breaches.
 * Never sets crossOrigin on data: URLs to prevent tainted canvas browser errors.
 */
export async function resizeAndCompressImage(
  dataUrl: string,
  maxWidth = 640,
  maxHeight = 360,
  quality = 0.7
): Promise<string> {
  if (!dataUrl) return '';

  return new Promise((resolve) => {
    try {
      const img = new Image();
      // Only set crossOrigin on external http/https URLs, never on data: URLs
      if (dataUrl.startsWith('http://') || dataUrl.startsWith('https://')) {
        img.crossOrigin = 'anonymous';
      }

      img.onload = () => {
        try {
          let width = img.naturalWidth || img.width || maxWidth;
          let height = img.naturalHeight || img.height || maxHeight;

          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.max(1, Math.round(width * ratio));
            height = Math.max(1, Math.round(height * ratio));
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            resolve(dataUrl);
            return;
          }

          // Fill white background for transparency support
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed);
        } catch (canvasErr) {
          console.warn('Canvas processing notice:', canvasErr);
          resolve(dataUrl);
        }
      };

      img.onerror = (e) => {
        console.warn('Image loading notice for compression:', e);
        resolve(dataUrl);
      };

      img.src = dataUrl;
    } catch (err) {
      console.warn('Image compression fallback notice:', err);
      resolve(dataUrl);
    }
  });
}

/**
 * Uploads lesson thumbnail to Firebase Storage, with resilient fallback compression.
 */
export async function uploadThumbnail(lessonId: string, rawDataUrl: string): Promise<string> {
  if (!rawDataUrl) return '';

  // Compress first so even fallback dataUrl is lightweight (< 40 KB)
  const compressed = await resizeAndCompressImage(rawDataUrl, 640, 360, 0.7);

  try {
    const storageRef = ref(storage, `lesson-thumbnails/${lessonId}/thumbnail_${Date.now()}.jpg`);
    await uploadString(storageRef, compressed, 'data_url');
    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl;
  } catch (error) {
    console.warn('Firebase Storage upload notice (using compressed fallback):', error);
    return compressed;
  }
}

/**
 * Uploads user avatar to Firebase Storage, with resilient fallback compression.
 */
export async function uploadAvatar(uid: string, rawDataUrl: string): Promise<string> {
  if (!rawDataUrl) return '';

  const compressed = await resizeAndCompressImage(rawDataUrl, 256, 256, 0.75);

  try {
    const storageRef = ref(storage, `avatars/${uid}/avatar_${Date.now()}.jpg`);
    await uploadString(storageRef, compressed, 'data_url');
    const downloadUrl = await getDownloadURL(storageRef);
    return downloadUrl;
  } catch (error) {
    console.warn('Firebase Storage upload notice (using compressed fallback):', error);
    return compressed;
  }
}

/**
 * Uploads attached lesson file with real-time percentage progress callback.
 * Uses local backend endpoint with fallback to Firebase Storage.
 */
export async function uploadLessonFileWithProgress(
  lessonId: string,
  file: File,
  onProgress: (percent: number) => void
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const fileData = reader.result as string;
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload');
      xhr.setRequestHeader('Content-Type', 'application/json');

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          const percent = Math.min(99, Math.round((event.loaded / event.total) * 100));
          onProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const resp = JSON.parse(xhr.responseText);
            onProgress(100);
            resolve(resp.downloadUrl);
          } catch (e) {
            onProgress(100);
            resolve(fileData);
          }
        } else {
          // If server upload failed, fallback to Firebase Storage
          uploadLessonFile(lessonId, file)
            .then((url) => {
              onProgress(100);
              resolve(url);
            })
            .catch(() => {
              onProgress(100);
              resolve(fileData);
            });
        }
      };

      xhr.onerror = () => {
        uploadLessonFile(lessonId, file)
          .then((url) => {
            onProgress(100);
            resolve(url);
          })
          .catch(() => {
            onProgress(100);
            resolve(fileData);
          });
      };

      xhr.send(
        JSON.stringify({
          filename: file.name,
          fileData,
          mimeType: file.type,
        })
      );
    };

    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads attached lesson file (MP3, MP4, PPTX) to Firebase Storage.
 */
export async function uploadLessonFile(lessonId: string, file: File): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storageRef = ref(storage, `lesson-files/${lessonId}/${Date.now()}_${safeName}`);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
}

