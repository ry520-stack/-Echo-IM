import imageCompression from 'browser-image-compression';

export async function compressImage(file: File): Promise<File> {
  try {
    return await imageCompression(file, {
      maxSizeMB: 2.5,
      maxWidthOrHeight: 3200,
      useWebWorker: true,
      fileType: 'image/webp',
      initialQuality: 0.95,
    });
  } catch {
    // Fallback: return original if compression fails
    return file;
  }
}
