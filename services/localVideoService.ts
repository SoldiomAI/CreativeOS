import { ImageFile } from '../types';
import { detectMood } from './audioService';
import { buildGodBrief, MovieBeat } from './godMode';

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

const startLiveScore = (prompt: string, durationSec: number) => {
  const audioCtx = new AudioContext();
  const dest = audioCtx.createMediaStreamDestination();
  const master = audioCtx.createGain();
  master.gain.value = 0.32;
  master.connect(dest);

  const mood = detectMood(prompt);
  const scaleMap = {
    cinematic: [130.81, 164.81, 196.0, 246.94, 261.63, 329.63],
    upbeat: [196.0, 220.0, 246.94, 293.66, 329.63, 392.0],
    dark: [98.0, 116.54, 146.83, 174.61, 196.0],
    dreamy: [174.61, 196.0, 220.0, 261.63, 329.63, 392.0],
    tech: [110.0, 146.83, 164.81, 220.0, 277.18, 329.63],
  } as const;
  const notes = scaleMap[mood];
  const t0 = audioCtx.currentTime;

  // Pads
  for (let i = 0; i < 4; i++) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = mood === 'upbeat' || mood === 'tech' ? 'sawtooth' : 'sine';
    osc.frequency.value = notes[i % notes.length] / (i < 2 ? 1 : 2);
    gain.gain.value = 0.055;
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = mood === 'dark' ? 700 : 2200;
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + durationSec + 0.3);
  }

  // Melodic pulses / risers at beat boundaries
  const beat = mood === 'upbeat' ? 0.32 : mood === 'tech' ? 0.4 : 0.52;
  for (let t = 0; t < durationSec; t += beat) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = notes[Math.floor((t / beat) % notes.length)];
    const start = t0 + t;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + beat * 0.85);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + beat);
  }

  // Soft kick
  for (let t = 0; t < durationSec; t += beat * 2) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    const start = t0 + t;
    osc.frequency.setValueAtTime(110, start);
    osc.frequency.exponentialRampToValueAtTime(45, start + 0.18);
    gain.gain.setValueAtTime(0.22, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.22);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + 0.25);
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

const drawFilmBars = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, w, h * 0.07);
  ctx.fillRect(0, h * 0.93, w, h * 0.07);
  ctx.strokeStyle = `rgba(240,180,41,${0.08 + Math.sin(t * 6) * 0.03})`;
  ctx.lineWidth = 2;
  ctx.strokeRect(18, 18, w - 36, h - 36);
};

const drawTitleCard = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  title: string,
  hook: string,
  progress: number
) => {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#070b12');
  g.addColorStop(1, '#1a1208');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = `rgba(240,180,41,${0.9 * Math.min(1, progress * 2)})`;
  ctx.font = `800 ${Math.round(w * 0.035)}px Syne, sans-serif`;
  ctx.fillText('CREATIVE OS', 40, h * 0.38);
  ctx.fillStyle = `rgba(247,243,234,${Math.min(1, progress * 1.4)})`;
  ctx.font = `700 ${Math.round(w * 0.07)}px Syne, sans-serif`;
  wrapText(ctx, hook || title, w - 80)
    .slice(0, 3)
    .forEach((line, i) => ctx.fillText(line, 40, h * 0.48 + i * w * 0.08));
};

const drawEndCard = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  cta: string,
  progress: number
) => {
  const g = ctx.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, w);
  g.addColorStop(0, '#1c1408');
  g.addColorStop(1, '#070b12');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = `rgba(93,255,194,${0.95 * Math.min(1, progress * 1.5)})`;
  ctx.font = `700 ${Math.round(w * 0.055)}px Syne, sans-serif`;
  wrapText(ctx, cta, w - 80)
    .slice(0, 3)
    .forEach((line, i) => ctx.fillText(line, 40, h * 0.48 + i * w * 0.07));
};

/**
 * God-tier offline compositor: multi-beat movie with title/end cards,
 * Ken Burns, safe-zone hooks, and baked soundtrack.
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
    godMode?: boolean;
    beats?: MovieBeat[];
    endCta?: string;
  }
): Promise<string> => {
  const fps = options?.fps ?? 30;
  const withSound = options?.withSound !== false;
  const godMode = options?.godMode === true;
  const sized = sizeForAspect(options?.aspectRatio);
  const width = options?.width ?? sized.width;
  const height = options?.height ?? sized.height;

  const brief = buildGodBrief(prompt, {
    hook: options?.hookOverlay,
    durationSec: options?.durationSec,
    godMode,
  });
  const beats = options?.beats?.length ? options.beats : brief.beats;
  const hook = brief.hook;
  const endCta = options?.endCta || brief.endCta;

  setLoadingMessage(godMode ? 'God Mode composing multi-beat movie…' : 'Composing local movie…');

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported in this browser');

  const loaded: (HTMLImageElement | null)[] = [];
  if (images.length) {
    for (const file of images.slice(0, Math.max(beats.length, 1))) {
      loaded.push(await loadImage(file.url));
    }
  }
  while (loaded.length < beats.length) loaded.push(loaded[loaded.length - 1] || null);

  const titleSec = godMode ? 1.35 : 0.8;
  const endSec = godMode ? 1.5 : 0.9;
  const beatFrames = beats.map((b) => Math.max(1, Math.round(b.seconds * fps)));
  const titleFrames = Math.round(titleSec * fps);
  const endFrames = Math.round(endSec * fps);
  const totalFrames = titleFrames + beatFrames.reduce((a, b) => a + b, 0) + endFrames;
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
    videoBitsPerSecond: godMode ? 6_500_000 : 4_500_000,
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

  let frame = 0;
  const renderBeat = (
    beatIndex: number,
    localT: number,
    globalT: number,
    beat: MovieBeat,
    img: HTMLImageElement | null
  ) => {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#070b12');
    gradient.addColorStop(0.55, '#121a28');
    gradient.addColorStop(1, '#1a1208');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    if (img) {
      const scale = 1.06 + localT * 0.14;
      const panX = (localT - 0.5) * width * 0.1 * (beatIndex % 2 === 0 ? 1 : -1);
      const panY = (0.5 - localT) * height * 0.06;
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
      // Abstract motion field when no stills
      for (let i = 0; i < 8; i++) {
        const x = ((i * 97 + globalT * 40) % width) - 40;
        const y = ((i * 53 + Math.sin(globalT + i) * 80) % height);
        ctx.fillStyle = `rgba(240,180,41,${0.04 + (i % 3) * 0.02})`;
        ctx.beginPath();
        ctx.arc(x, y, 60 + i * 18, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Crossfade veil at beat edges
    const edge = Math.min(localT, 1 - localT);
    if (edge < 0.12) {
      ctx.fillStyle = `rgba(7,11,18,${(0.12 - edge) / 0.12 * 0.55})`;
      ctx.fillRect(0, 0, width, height);
    }

    drawFilmBars(ctx, width, height, globalT);

    // Hook / beat text safe zones
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, width, Math.min(200, height * 0.2));
    ctx.fillStyle = '#ffd56a';
    ctx.font = `700 ${Math.round(width * 0.042)}px Syne, sans-serif`;
    wrapText(ctx, beatIndex === 0 ? hook : beat.onScreenText, width - 72)
      .slice(0, 3)
      .forEach((line, idx) => ctx.fillText(line, 36, 58 + idx * Math.round(width * 0.05)));

    ctx.fillStyle = 'rgba(0,0,0,0.48)';
    ctx.fillRect(0, height - 260, width, 260);
    ctx.fillStyle = '#5dffc2';
    ctx.font = `600 ${Math.round(width * 0.028)}px Outfit, sans-serif`;
    ctx.fillText(`BEAT ${beatIndex + 1}/${beats.length} · GOD COMPOSITOR`, 36, height - 200);
    ctx.fillStyle = '#f7f3ea';
    ctx.font = `600 ${Math.round(width * 0.038)}px Outfit, sans-serif`;
    wrapText(ctx, beat.visual, width - 72)
      .slice(0, 3)
      .forEach((line, idx) => ctx.fillText(line, 36, height - 150 + idx * Math.round(width * 0.045)));
  };

  while (frame < totalFrames) {
    const globalT = frame / fps;

    if (frame < titleFrames) {
      drawTitleCard(ctx, width, height, brief.title, hook, frame / titleFrames);
    } else if (frame >= totalFrames - endFrames) {
      const p = (frame - (totalFrames - endFrames)) / endFrames;
      drawEndCard(ctx, width, height, endCta, p);
    } else {
      let cursor = frame - titleFrames;
      let beatIndex = 0;
      while (beatIndex < beatFrames.length - 1 && cursor >= beatFrames[beatIndex]) {
        cursor -= beatFrames[beatIndex];
        beatIndex += 1;
      }
      const localT = cursor / beatFrames[beatIndex];
      renderBeat(beatIndex, localT, globalT, beats[beatIndex], loaded[beatIndex] || null);
    }

    if (frame % Math.round(fps) === 0) {
      setLoadingMessage(
        `${godMode ? 'God Mode' : 'Local'} render… ${Math.round((frame / totalFrames) * 100)}%`
      );
    }

    const target = startedAt + (frame + 1) * frameDurationMs;
    const delay = Math.max(0, target - performance.now());
    await new Promise((r) => setTimeout(r, delay));
    frame += 1;
  }

  setLoadingMessage('Finalizing movie…');
  if (recorder.state !== 'inactive') recorder.stop();
  const resultUrl = await stopped;
  videoStream.getTracks().forEach((t) => t.stop());
  await score?.stop();
  return resultUrl;
};
