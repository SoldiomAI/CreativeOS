import { ImageFile, VideoProvider, VideoGenerationRequest } from '../types';
import { generateVideo as generateVeoVideo } from './geminiService';
import { generateLocalVideo } from './localVideoService';
import { generateWithHfModel, getStoredHfToken } from './hfVideoService';
import { generateMovieAudio } from './audioService';
import { estimateVideoDuration, muxVideoWithAudio } from './muxAudioVideo';
import { withTimeout } from './utils';
import { generateImageWithComfy, pingComfyUi } from './comfyService';
import { submitDuixAvatarVideo, synthesizeDuixVoice } from './duixService';
import { fileToBase64 } from './geminiService';

const PROVIDER_TIMEOUT_MS = 180_000;

export const VIDEO_PROVIDERS: {
  id: VideoProvider;
  label: string;
  blurb: string;
  free: boolean;
  needsImage: boolean;
}[] = [
  {
    id: 'auto',
    label: 'Auto (Free first)',
    blurb: 'Tries free HF Spaces, then local compositor',
    free: true,
    needsImage: false,
  },
  {
    id: 'ltx',
    label: 'LTX-Video (HF Space)',
    blurb: 'Open Lightricks model — prompt or image→video',
    free: true,
    needsImage: false,
  },
  {
    id: 'animatediff',
    label: 'AnimateDiff Lightning',
    blurb: 'ByteDance free Space — prompt→short clip',
    free: true,
    needsImage: false,
  },
  {
    id: 'cogvideox',
    label: 'CogVideoX-2B',
    blurb: 'Zhipu open T2V model on HF Spaces',
    free: true,
    needsImage: false,
  },
  {
    id: 'wan-space',
    label: 'Wan2.1 Space',
    blurb: 'Community Wan text-to-video Space',
    free: true,
    needsImage: false,
  },
  {
    id: 'hf-inference',
    label: 'HF Inference (Wan)',
    blurb: 'Router API — needs HF token / credits',
    free: false,
    needsImage: false,
  },
  {
    id: 'comfy',
    label: 'ComfyUI (local)',
    blurb: 'github.com/Comfy-Org/ComfyUI — still→local movie',
    free: true,
    needsImage: false,
  },
  {
    id: 'duix',
    label: 'Duix.Avatar (local)',
    blurb: 'github.com/duixcom/Duix-Avatar — talking avatar',
    free: true,
    needsImage: false,
  },
  {
    id: 'local',
    label: 'Local Free Compositor',
    blurb: 'Always works offline from prompt + images',
    free: true,
    needsImage: false,
  },
  {
    id: 'veo',
    label: 'Gemini Veo 3.1',
    blurb: 'Premium Google video — requires Gemini key',
    free: false,
    needsImage: true,
  },
];

const runComfyMovie = async (
  prompt: string,
  images: ImageFile[],
  setLoadingMessage: (m: string) => void
): Promise<string> => {
  let sourceImages = images;
  if (!sourceImages.length) {
    const url = await generateImageWithComfy(prompt, setLoadingMessage);
    const file = await fetch(url)
      .then((r) => r.blob())
      .then((b) => new File([b], 'comfy.jpg', { type: b.type || 'image/jpeg' }));
    const base64 = await fileToBase64(file);
    sourceImages = [
      {
        name: file.name,
        type: file.type,
        size: file.size,
        base64,
        url,
      },
    ];
  }
  return generateLocalVideo(prompt, sourceImages, setLoadingMessage);
};

const runDuixMovie = async (
  prompt: string,
  setLoadingMessage: (m: string) => void
): Promise<string> => {
  const audioPath = await synthesizeDuixVoice(prompt, setLoadingMessage);
  return submitDuixAvatarVideo(audioPath, setLoadingMessage);
};

const runProvider = async (
  provider: Exclude<VideoProvider, 'auto'>,
  prompt: string,
  images: ImageFile[],
  setLoadingMessage: (m: string) => void
): Promise<string> => {
  const work = async () => {
    switch (provider) {
      case 'local':
        return generateLocalVideo(prompt, images, setLoadingMessage);
      case 'comfy':
        return runComfyMovie(prompt, images, setLoadingMessage);
      case 'duix':
        return runDuixMovie(prompt, setLoadingMessage);
      case 'veo': {
        if (!images[0]) throw new Error('Veo needs at least one source image');
        return generateVeoVideo(images[0], prompt, setLoadingMessage);
      }
      case 'ltx':
      case 'animatediff':
      case 'cogvideox':
      case 'wan-space':
      case 'hf-inference':
        return generateWithHfModel(provider, prompt, images, setLoadingMessage);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  };

  return withTimeout(work(), PROVIDER_TIMEOUT_MS, provider);
};

const withSoundtrack = async (
  videoUrl: string,
  prompt: string,
  request: VideoGenerationRequest,
  providerUsed: VideoProvider,
  setLoadingMessage: (m: string) => void
): Promise<string> => {
  // Duix.Avatar already ships lip-synced speech; skip extra mix.
  if (providerUsed === 'duix') return videoUrl;

  const wantMusic = request.soundtrack !== false;
  const wantVoice = request.voiceover !== false;
  if (!wantMusic && !wantVoice) return videoUrl;

  const localAlreadyScored =
    (providerUsed === 'local' || providerUsed === 'comfy') && wantMusic;
  if (localAlreadyScored && !wantVoice) return videoUrl;

  const durationSec = await estimateVideoDuration(videoUrl, 6);
  const tracks = await generateMovieAudio(
    prompt,
    durationSec,
    {
      soundtrack: wantMusic && !localAlreadyScored,
      voiceover: wantVoice,
    },
    setLoadingMessage
  );

  if (!tracks.length) return videoUrl;

  try {
    return await muxVideoWithAudio(videoUrl, tracks, setLoadingMessage, {
      musicGain: tracks.some((t) => t.kind === 'voice') ? 0.42 : 0.7,
      voiceGain: 1,
      keepOriginalAudio: localAlreadyScored,
    });
  } catch (e) {
    setLoadingMessage('Audio mix failed — returning video without extra mix');
    console.warn(e);
    return videoUrl;
  }
};

/**
 * Create a movie from a prompt and optional images using free HF/GitHub models,
 * then mix soundtrack + voiceover from free audio Spaces (with local music fallback).
 */
export const generateAnyVideo = async (
  request: VideoGenerationRequest,
  setLoadingMessage: (message: string) => void
): Promise<{ url: string; providerUsed: VideoProvider; hasAudio: boolean }> => {
  const prompt = request.prompt.trim();
  if (!prompt) throw new Error('Enter a prompt describing the movie you want.');

  const images = request.images || [];
  const provider = request.provider || 'auto';
  const wantAudio = request.soundtrack !== false || request.voiceover !== false;

  let url: string;
  let providerUsed: VideoProvider;

  if (provider !== 'auto') {
    url = await runProvider(provider, prompt, images, setLoadingMessage);
    providerUsed = provider;
  } else {
    const hasToken = Boolean(getStoredHfToken() || process.env.HF_TOKEN);
    const comfyUp = await pingComfyUi().catch(() => false);
    const chain: Exclude<VideoProvider, 'auto'>[] = images.length
      ? hasToken
        ? ['ltx', 'hf-inference', 'local']
        : comfyUp
          ? ['ltx', 'comfy', 'local']
          : ['ltx', 'local']
      : comfyUp
        ? ['ltx', 'cogvideox', 'comfy', 'local']
        : ['ltx', 'cogvideox', 'wan-space', 'local'];

    const errors: string[] = [];
    let produced: string | null = null;
    let used: VideoProvider | null = null;
    for (const candidate of chain) {
      try {
        setLoadingMessage(`Trying ${candidate}…`);
        produced = await runProvider(candidate, prompt, images, setLoadingMessage);
        used = candidate;
        break;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`${candidate}: ${msg}`);
        setLoadingMessage(`${candidate} unavailable — trying next free source…`);
      }
    }
    if (!produced || !used) {
      throw new Error(`All free video sources failed.\n${errors.slice(0, 4).join('\n')}`);
    }
    url = produced;
    providerUsed = used;
  }

  const mixed = await withSoundtrack(url, prompt, request, providerUsed, setLoadingMessage);
  const hasAudio =
    providerUsed === 'duix' ||
    (wantAudio &&
      (providerUsed === 'local' ||
        providerUsed === 'comfy' ||
        mixed !== url ||
        request.soundtrack !== false ||
        request.voiceover !== false));

  return { url: mixed, providerUsed, hasAudio };
};
