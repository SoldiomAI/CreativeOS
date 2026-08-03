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
import { generateVideoWithMuapi, getMuapiKey, uploadToMuapi } from './muapiService';
import { amplifyPromptForProviders, buildGodBrief } from './godMode';

const PROVIDER_TIMEOUT_MS = 180_000;
const MUAPI_TIMEOUT_MS = 360_000;

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
    id: 'muapi',
    label: 'MuAPI (Open Generative AI)',
    blurb: 'github.com/Anil-matcha/Open-Generative-AI — Seedance/Wan via MuAPI key',
    free: false,
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

type LocalOpts = {
  aspectRatio?: VideoGenerationRequest['aspectRatio'];
  durationSec?: number;
  hookOverlay?: string;
  godMode?: boolean;
};

const runComfyMovie = async (
  prompt: string,
  images: ImageFile[],
  setLoadingMessage: (m: string) => void,
  localOpts: LocalOpts
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
  return generateLocalVideo(prompt, sourceImages, setLoadingMessage, localOpts);
};

const runDuixMovie = async (
  prompt: string,
  setLoadingMessage: (m: string) => void
): Promise<string> => {
  const audioPath = await synthesizeDuixVoice(prompt, setLoadingMessage);
  return submitDuixAvatarVideo(audioPath, setLoadingMessage);
};

const runMuapiMovie = async (
  prompt: string,
  images: ImageFile[],
  setLoadingMessage: (m: string) => void,
  request: VideoGenerationRequest
): Promise<string> => {
  let imageUrl: string | undefined;
  if (images[0]) {
    setLoadingMessage('Uploading reference image to MuAPI…');
    const blob = await fetch(images[0].url).then((r) => r.blob());
    imageUrl = await uploadToMuapi(blob, images[0].name || 'frame.jpg');
  }
  // MuAPI durations are typically 5 / 10 / 15
  const durationSec = Math.min(15, Math.max(5, Math.round(request.durationSec || 5)));
  const snapped = durationSec <= 5 ? 5 : durationSec <= 10 ? 10 : 15;
  return generateVideoWithMuapi(
    {
      prompt,
      aspectRatio: request.aspectRatio || '9:16',
      durationSec: snapped,
      imageUrl,
    },
    setLoadingMessage
  );
};

const runProvider = async (
  provider: Exclude<VideoProvider, 'auto'>,
  prompt: string,
  images: ImageFile[],
  setLoadingMessage: (m: string) => void,
  request: VideoGenerationRequest
): Promise<string> => {
  const localOpts: LocalOpts = {
    aspectRatio: request.aspectRatio || '9:16',
    durationSec: request.durationSec,
    hookOverlay: request.hookOverlay,
    godMode: request.godMode,
  };

  const work = async () => {
    const providerPrompt = amplifyPromptForProviders(prompt, Boolean(request.godMode));
    switch (provider) {
      case 'local':
        return generateLocalVideo(prompt, images, setLoadingMessage, localOpts);
      case 'comfy':
        return runComfyMovie(prompt, images, setLoadingMessage, localOpts);
      case 'duix':
        return runDuixMovie(prompt, setLoadingMessage);
      case 'muapi':
        return runMuapiMovie(providerPrompt, images, setLoadingMessage, request);
      case 'veo': {
        if (!images[0]) throw new Error('Veo needs at least one source image');
        return generateVeoVideo(images[0], providerPrompt, setLoadingMessage);
      }
      case 'ltx':
      case 'animatediff':
      case 'cogvideox':
      case 'wan-space':
      case 'hf-inference':
        return generateWithHfModel(provider, providerPrompt, images, setLoadingMessage);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  };

  const timeout = provider === 'muapi' ? MUAPI_TIMEOUT_MS : PROVIDER_TIMEOUT_MS;
  return withTimeout(work(), timeout, provider);
};

const withSoundtrack = async (
  videoUrl: string,
  prompt: string,
  request: VideoGenerationRequest,
  providerUsed: VideoProvider,
  setLoadingMessage: (m: string) => void
): Promise<string> => {
  // Duix / MuAPI often already include audio; still allow optional mix when requested.
  if (providerUsed === 'duix') return videoUrl;

  const wantMusic = request.soundtrack !== false;
  const wantVoice = request.voiceover !== false;
  if (!wantMusic && !wantVoice) return videoUrl;

  const localAlreadyScored =
    (providerUsed === 'local' || providerUsed === 'comfy') && wantMusic;
  if (localAlreadyScored && !wantVoice) return videoUrl;

  // MuAPI videos often have native audio — keep it when muxing voice/music.
  const keepOriginal = localAlreadyScored || providerUsed === 'muapi';

  const durationSec = await estimateVideoDuration(videoUrl, request.durationSec || 6);
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
      keepOriginalAudio: keepOriginal,
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

  // God Mode: ensure hook + richer duration defaults for local path
  if (request.godMode) {
    const brief = buildGodBrief(prompt, {
      hook: request.hookOverlay,
      durationSec: request.durationSec,
      godMode: true,
    });
    if (!request.hookOverlay) request.hookOverlay = brief.hook;
    if (!request.durationSec) request.durationSec = Math.ceil(brief.totalSeconds);
    if (!request.aspectRatio) request.aspectRatio = '9:16';
    request.soundtrack = request.soundtrack !== false;
    request.voiceover = request.voiceover !== false;
  }

  const images = request.images || [];
  const provider = request.provider || 'auto';
  const wantAudio = request.soundtrack !== false || request.voiceover !== false;

  let url: string;
  let providerUsed: VideoProvider;

  if (provider !== 'auto') {
    url = await runProvider(provider, prompt, images, setLoadingMessage, request);
    providerUsed = provider;
  } else {
    const hasToken = Boolean(getStoredHfToken() || process.env.HF_TOKEN);
    const hasMuapi = Boolean(getMuapiKey());
    const comfyUp = await pingComfyUi().catch(() => false);
    const chain: Exclude<VideoProvider, 'auto'>[] = [];

    if (request.godMode) {
      // God Mode: one fast HF attempt, optional MuAPI, then legendary local multi-beat.
      chain.push('ltx');
      if (hasMuapi) chain.push('muapi');
      if (comfyUp) chain.push('comfy');
      chain.push('local');
    } else {
      chain.push('ltx');
      if (images.length) {
        if (hasToken) chain.push('hf-inference');
        if (comfyUp) chain.push('comfy');
      } else {
        chain.push('cogvideox');
        if (comfyUp) chain.push('comfy');
        else chain.push('wan-space');
      }
      if (hasMuapi) chain.push('muapi');
      chain.push('local');
    }

    const errors: string[] = [];
    let produced: string | null = null;
    let used: VideoProvider | null = null;
    for (const candidate of chain) {
      try {
        setLoadingMessage(`Trying ${candidate}…`);
        produced = await runProvider(candidate, prompt, images, setLoadingMessage, request);
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
    providerUsed === 'muapi' ||
    (wantAudio &&
      (providerUsed === 'local' ||
        providerUsed === 'comfy' ||
        mixed !== url ||
        request.soundtrack !== false ||
        request.voiceover !== false));

  return { url: mixed, providerUsed, hasAudio };
};
