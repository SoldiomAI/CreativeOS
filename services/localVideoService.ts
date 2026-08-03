import { ImageFile } from '../types';
import { detectMood } from './audioService';

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

const startLiveScore = (prompt: string, durationSec: number) => {
  const audioCtx = new AudioContext();
  const dest = audioCtx.createMediaStreamDestination();
  const master = audioCtx.createGain();
  master.gain.value = 0.3;
  master.connect(dest);

  const mood = detectMood(prompt);
  const scaleMap = {
    cinematic: [130.81, 164.81, 196.0, 246.94, 261.63],
    upbeat: [196.0, 220.0, 246.94, 293.66, 329.63],
    dark: [98.0, 116.54, 146.83, 174.61],
    dreamy: [174.61, 196.0, 220.0, 261.63, 329.63],
    tech: [110.0, 146.83, 164.81, 220.0, 277.18],
  } as const;
  const notes = scaleMap[mood];
  const t0 = audioCtx.currentTime;

  for (let i = 0; i < 3; i++) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = mood === 'upbeat' || mood === 'tech' ? 'sawtooth' : 'sine';
    osc.frequency.value = notes[i % notes.length] / (i === 0 ? 1 : 2);
    gain.gain.value = 0.07;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = mood === 'dark' ? 600 : 1800;
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + durationSec + 0.2);
  }

  const beat = mood === 'upbeat' ? 0.35 : 0.55;
  for (let t = 0; t < durationSec; t += beat) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = notes[Math.floor((t / beat) % notes.length)];
    const start = t0 + t;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.16, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + beat * 0.9);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + beat);
  }

  return {
    stream: dest.stream,
    stop: async () => {
      try {
        await audioCtx.close();
      } catch {
        /* ignore */
      }
    },
  };
};

const sizeForAspect = (
  aspectRatio: '9:16' | '16:9' | '1:1' | undefined
): { width: number; height: number } => {
  switch (aspectRatio) {
    case '16:9':
      return { width: 1280, height: 720 };
    case '1:1':
      return { width: 1080, height: 1080 };
    case '9:16':
    default:
      return { width: 720, height: 1280 };
  }
};

/**
 * Free offline compositor: prompt + images → movie with baked-in soundtrack
 * using Canvas + Web Audio + MediaRecorder.
 */
export const generateLocalVideo = async (
  prompt: string,
  images: ImageFile[],
  setLoadingMessage: (message: string) => void,
  options?: {
    secondsPerImage?: number;
    fps?: number;
    withSound?: boolean;
    aspectRatio?: '9:16' | '16:9' | '1:1';
    durationSec?: number;
    hookOverlay?: string;
    width?: number;
    height?: number;
  }
): Promise<string> => {
  const fps = options?.fps ?? 30;
  const withSound = options?.withSound !== false;
  const sized = sizeForAspect(options?.aspectRatio);
  const width = options?.width ?? sized.width;
  const height = options?.height ?? sized.height;
  const hook = (options?.hookOverlay || '').trim();

  const clipCount = Math.max(1, images.length || 1);
  let secondsPerImage = options?.secondsPerImage ?? (images.length > 1 ? 2.5 : 4);
  if (options?.durationSec && options.durationSec > 0) {
    secondsPerImage = options.durationSec / clipCount;
  }

  setLoadingMessage('Composing free local movie with sound...');

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported in this browser');

  const frames: { img: HTMLImageElement | null; caption: string }[] = [];
  if (images.length === 0) {
    frames.push({ img: null, caption: prompt });
  } else {
    for (const file of images.slice(0, 6)) {
      frames.push({ img: await loadImage(file.url), caption: prompt });
    }
  }

  const totalFrames = Math.max(1, Math.round(frames.length * secondsPerImage * fps));
  const framesPerClip = Math.max(1, Math.round(secondsPerImage * fps));
  const durationSec = totalFrames / fps;

  const videoStream = canvas.captureStream(fps);
  const score = withSound ? startLiveScore(prompt, durationSec) : null;
  if (score) {
    score.stream.getAudioTracks().forEach((track) => videoStream.addTrack(track));
  }

  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
    ? 'video/webm;codecs=vp9,opus'
    : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
      ? 'video/webm;codecs=vp8,opus'
      : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : '';

  if (!mimeType) {
    await score?.stop();
    throw new Error('MediaRecorder WebM is not supported in this browser');
  }

  const recorder = new MediaRecorder(videoStream, {
    mimeType,
    videoBitsPerSecond: 4_000_000,
    audioBitsPerSecond: 192_000,
  });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  const stopped = new Promise<string>((resolve, reject) => {
    recorder.onerror = () => reject(new Error('Local video recording failed'));
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      resolve(URL.createObjectURL(blob));
    };
  });

  recorder.start(100);
  const frameDurationMs = 1000 / fps;
  const startedAt = performance.now();

  for (let i = 0; i < totalFrames; i++) {
    const clipIndex = Math.min(frames.length - 1, Math.floor(i / framesPerClip));
    const localT = (i % framesPerClip) / framesPerClip;
    const { img, caption } = frames[clipIndex];

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

    // Safe-zone hook for Shorts/Reels (first ~2s emphasized via larger type early on).
    if (hook) {
      const hookProgress = i / Math.max(1, fps * 2.2);
      const hookAlpha = hookProgress < 1 ? 1 : Math.max(0.55, 1 - (hookProgress - 1) * 0.35);
      ctx.fillStyle = `rgba(0,0,0,${0.55 * hookAlpha})`;
      ctx.fillRect(0, 0, width, Math.min(220, height * 0.22));
      ctx.fillStyle = `rgba(255,255,255,${hookAlpha})`;
      ctx.font = `700 ${Math.round(width * 0.045)}px Georgia, "Times New Roman", serif`;
      const hookLines = wrapText(ctx, hook, width - 72);
      hookLines.slice(0, 3).forEach((line, idx) => {
        ctx.fillText(line, 36, 64 + idx * Math.round(width * 0.055));
      });
    }

    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, height - 280, width, 280);
    ctx.fillStyle = '#67e8f9';
    ctx.font = 'bold 22px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText('CREATIVE OS · PROMPT→MOVIE + SOUND', 36, height - 220);
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 34px Georgia, "Times New Roman", serif';
    const lines = wrapText(ctx, caption || 'Untitled creation', width - 72);
    lines.forEach((line, idx) => {
      ctx.fillText(line, 36, height - 160 + idx * 42);
    });

    if (i % Math.round(fps) === 0) {
      setLoadingMessage(`Rendering local movie… ${Math.round((i / totalFrames) * 100)}%`);
    }

    const target = startedAt + (i + 1) * frameDurationMs;
    const delay = Math.max(0, target - performance.now());
    await new Promise((r) => setTimeout(r, delay));
  }

  setLoadingMessage('Finalizing local movie…');
  if (recorder.state !== 'inactive') recorder.stop();
  const resultUrl = await stopped;
  videoStream.getTracks().forEach((t) => t.stop());
  await score?.stop();
  return resultUrl;
};
