/** Grab a JPEG cover/thumbnail from a video URL. */
export const captureVideoCover = async (
  videoUrl: string,
  atSec = 0.6
): Promise<{ blob: Blob; url: string }> => {
  const video = document.createElement('video');
  video.crossOrigin = 'anonymous';
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';

  await new Promise<void>((resolve, reject) => {
    video.onloadeddata = () => resolve();
    video.onerror = () => reject(new Error('Could not load video for cover frame'));
    video.src = videoUrl;
  });

  const duration = Number.isFinite(video.duration) ? video.duration : 1;
  const seek = Math.min(Math.max(0.05, atSec), Math.max(0.05, duration * 0.35));

  await new Promise<void>((resolve, reject) => {
    video.onseeked = () => resolve();
    video.onerror = () => reject(new Error('Seek failed for cover frame'));
    try {
      video.currentTime = seek;
    } catch {
      resolve();
    }
  });

  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 720;
  canvas.height = video.videoHeight || 1280;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable for cover frame');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Cover encode failed'))),
      'image/jpeg',
      0.92
    );
  });

  return { blob, url: URL.createObjectURL(blob) };
};

export const downloadCover = (blob: Blob, filename = 'creativeos-cover.jpg') => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
};
