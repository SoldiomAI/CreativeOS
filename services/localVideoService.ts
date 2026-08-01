import { ImageFile } from '../types';

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image for local video'));
    img.src = src;
  });

const wrapText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] => {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 4);
};

/**
 * Free offline compositor: turns a prompt + images into a short vertical video
 * using Canvas + MediaRecorder (Ken Burns motion + caption overlays).
 */
export const generateLocalVideo = async (
  prompt: string,
  images: ImageFile[],
  setLoadingMessage: (message: string) => void,
  options?: { secondsPerImage?: number; fps?: number }
): Promise<string> => {
  const fps = options?.fps ?? 30;
  const secondsPerImage = options?.secondsPerImage ?? (images.length > 1 ? 2.5 : 4);
  const width = 720;
  const height = 1280;

  setLoadingMessage('Composing free local video...');

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported in this browser');

  const stream = canvas.captureStream(fps);
  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
    ? 'video/webm;codecs=vp9'
    : MediaRecorder.isTypeSupported('video/webm')
      ? 'video/webm'
      : '';

  if (!mimeType) {
    throw new Error('MediaRecorder WebM is not supported in this browser');
  }

  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 4_000_000 });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const done = new Promise<string>((resolve, reject) => {
    recorder.onerror = () => reject(new Error('Local video recording failed'));
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      resolve(URL.createObjectURL(blob));
    };
  });

  const frames: { img: HTMLImageElement | null; caption: string }[] = [];
  if (images.length === 0) {
    frames.push({ img: null, caption: prompt });
  } else {
    for (const file of images.slice(0, 6)) {
      frames.push({ img: await loadImage(file.url), caption: prompt });
    }
  }

  recorder.start(100);
  const totalFrames = Math.max(1, Math.round(frames.length * secondsPerImage * fps));
  const framesPerClip = Math.max(1, Math.round(secondsPerImage * fps));

  for (let i = 0; i < totalFrames; i++) {
    const clipIndex = Math.min(frames.length - 1, Math.floor(i / framesPerClip));
    const localT = (i % framesPerClip) / framesPerClip;
    const { img, caption } = frames[clipIndex];

    // Atmosphere background
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#0b1220');
    gradient.addColorStop(0.5, '#122033');
    gradient.addColorStop(1, '#1a0f24');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    if (img) {
      const scale = 1.08 + localT * 0.12;
      const panX = (localT - 0.5) * width * 0.08 * (clipIndex % 2 === 0 ? 1 : -1);
      const panY = (0.5 - localT) * height * 0.05;
      const drawW = width * scale;
      const drawH = height * scale;
      const imgRatio = img.width / img.height;
      const canvasRatio = width / height;
      let srcW = img.width;
      let srcH = img.height;
      let srcX = 0;
      let srcY = 0;
      if (imgRatio > canvasRatio) {
        srcW = img.height * canvasRatio;
        srcX = (img.width - srcW) / 2;
      } else {
        srcH = img.width / canvasRatio;
        srcY = (img.height - srcH) / 2;
      }
      ctx.drawImage(
        img,
        srcX,
        srcY,
        srcW,
        srcH,
        (width - drawW) / 2 + panX,
        (height - drawH) / 2 + panY,
        drawW,
        drawH
      );
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(40, 200, width - 80, height - 400);
    }

    // Caption plate
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, height - 280, width, 280);
    ctx.fillStyle = '#67e8f9';
    ctx.font = 'bold 22px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText('CREATIVE OS · FREE LOCAL', 36, height - 220);
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 34px Georgia, "Times New Roman", serif';
    const lines = wrapText(ctx, caption || 'Untitled creation', width - 72);
    lines.forEach((line, idx) => {
      ctx.fillText(line, 36, height - 160 + idx * 42);
    });

    if (i % Math.round(fps) === 0) {
      setLoadingMessage(`Rendering local frames… ${Math.round((i / totalFrames) * 100)}%`);
    }

    await new Promise((r) => requestAnimationFrame(() => r(undefined)));
  }

  setLoadingMessage('Finalizing local video…');
  recorder.stop();
  stream.getTracks().forEach((t) => t.stop());
  return done;
};
