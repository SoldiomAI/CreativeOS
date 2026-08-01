import { ImageFile, VideoProvider, VideoGenerationRequest } from '../types';
import { generateVideo as generateVeoVideo } from './geminiService';
import { generateLocalVideo } from './localVideoService';
import { generateWithHfModel } from './hfVideoService';
import { generateMovieAudio } from './audioService';
import { estimateVideoDuration, muxVideoWithAudio } from './muxAudioVideo';

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

const runProvider = async (
  provider: Exclude<VideoProvider, 'auto'>,
  prompt: string,
  images: ImageFile[],
  setLoadingMessage: (m: string) => void
): Promise<string> => {
  switch (provider) {
    case 'local':
      return generateLocalVideo(prompt, images, setLoadingMessage);
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

const withSoundtrack = async (
  videoUrl: string,
  prompt: string,
  request: VideoGenerationRequest,
  providerUsed: VideoProvider,
  setLoadingMessage: (m: string) => void
): Promise<string> => {
  const wantMusic = request.soundtrack !== false;
  const wantVoice = request.voiceover !== false;
  if (!wantMusic && !wantVoice) return videoUrl;

  // Local compositor already bakes a free score into the WebM.
  const localAlreadyScored = providerUsed === 'local' && wantMusic;
  if (localAlreadyScored && !wantVoice) return videoUrl;

  const durationSec = await estimateVideoDuration(videoUrl, 6);
  const audio = await generateMovieAudio(
    prompt,
    durationSec,
    {
      soundtrack: wantMusic && !localAlreadyScored,
      voiceover: wantVoice,
    },
    setLoadingMessage
  );

  const blobs = [audio.music, audio.voice].filter(Boolean) as Blob[];
  if (!blobs.length) return videoUrl;

  try {
    return await muxVideoWithAudio(videoUrl, blobs, setLoadingMessage, {
      musicGain: audio.voice ? 0.42 : 0.7,
      voiceGain: 1,
      keepOriginalAudio: localAlreadyScored,
    });
  } catch (e: any) {
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
): Promise<{ url: string; providerUsed: VideoProvider }> => {
  const prompt = request.prompt.trim();
  if (!prompt) throw new Error('Enter a prompt describing the movie you want.');

  const images = request.images || [];
  const provider = request.provider || 'auto';

  let url: string;
  let providerUsed: VideoProvider;

  if (provider !== 'auto') {
    url = await runProvider(provider, prompt, images, setLoadingMessage);
    providerUsed = provider;
  } else {
    const chain: Exclude<VideoProvider, 'auto'>[] = images.length
      ? ['ltx', 'local']
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
      } catch (e: any) {
        const msg = e?.message || String(e);
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
  return { url: mixed, providerUsed };
};
