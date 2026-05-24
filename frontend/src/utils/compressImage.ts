import imageCompression from 'browser-image-compression';

export async function compressImage(file: File, maxMB = 1.2): Promise<File> {
  // GIF 不压缩，避免动图失效
  if (file.type === 'image/gif') return file;

  try {
    return await imageCompression(file, {
      maxSizeMB: maxMB,
      maxWidthOrHeight: 1600,
      useWebWorker: true,
      initialQuality: 0.82,
    });
  } catch {
    // HEIC 等特殊格式压缩失败，保留原文件
    return file;
  }
}

// 表情包专用压缩（画质优先），返回 [file, compressed]
export async function compressEmoji(file: File): Promise<[File, boolean]> {
  if (file.type === 'image/gif') return [file, true];
  // 小于 1MB 不压缩
  if (file.size <= 1024 * 1024) return [file, true];
  try {
    const result = await imageCompression(file, {
      maxSizeMB: 1.5,
      maxWidthOrHeight: 1024,
      useWebWorker: true,
      initialQuality: 0.9,
    });
    return [result, true];
  } catch {
    return [file, false];
  }
}
