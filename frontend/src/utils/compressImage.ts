import imageCompression from 'browser-image-compression';

export async function compressImage(file: File, maxMB = 3): Promise<File> {
  // GIF 不压缩，避免动图失效
  if (file.type === 'image/gif') return file;

  try {
    return await imageCompression(file, {
      maxSizeMB: maxMB,
      maxWidthOrHeight: 2560,
      useWebWorker: true,
      initialQuality: 0.92,
    });
  } catch {
    // HEIC 等特殊格式压缩失败，保留原文件
    return file;
  }
}

export async function prepareChatImage(file: File): Promise<File> {
  if (file.type === 'image/gif') return file;
  if (file.size <= 15 * 1024 * 1024) return file;
  return compressImage(file, 10);
}

export async function prepareMomentImage(file: File): Promise<File> {
  if (file.type === 'image/gif') return file;
  if (file.size <= 20 * 1024 * 1024) return file;
  return compressImage(file, 12);
}

// 表情包专用压缩（画质优先），返回 [file, compressed]
export async function compressEmoji(file: File): Promise<[File, boolean]> {
  if (file.type === 'image/gif') return [file, true];
  // 小图和表情尽量保留原图，避免糊
  if (file.size <= 5 * 1024 * 1024) return [file, true];
  try {
    const result = await imageCompression(file, {
      maxSizeMB: 6,
      maxWidthOrHeight: 2200,
      useWebWorker: true,
      initialQuality: 0.96,
    });
    return [result, true];
  } catch {
    return [file, false];
  }
}
