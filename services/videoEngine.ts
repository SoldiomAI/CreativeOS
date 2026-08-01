import { ImageFile, VideoProvider, VideoGenerationRequest } from '../types';
import { generateVideo as generateVeoVideo } from './geminiService';
import { generateLocalVideo } from './localVideoService';
import { generateWithHfModel } from './hfVideoService';

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

/**
 * Create a video from a prompt and optional images using free HF/GitHub models,
 * with automatic fallbacks so generation still succeeds offline.
 */
export const generateAnyVideo = async (
  request: VideoGenerationRequest,
  setLoadingMessage: (message: string) => void
): Promise<{ url: string; providerUsed: VideoProvider }> => {
  const prompt = request.prompt.trim();
  if (!prompt) throw new Error('Enter a prompt describing the video you want.');

  const images = request.images || [];
  const provider = request.provider || 'auto';

  if (provider !== 'auto') {
    const url = await runProvider(provider, prompt, images, setLoadingMessage);
    return { url, providerUsed: provider };
  }

  // Prefer Spaces known to be healthy; always end with offline local compositor.
  const chain: Exclude<VideoProvider, 'auto'>[] = images.length
    ? ['ltx', 'local']
    : ['ltx', 'cogvideox', 'wan-space', 'local'];

  const errors: string[] = [];
  for (const candidate of chain) {
    try {
      setLoadingMessage(`Trying ${candidate}…`);
      const url = await runProvider(candidate, prompt, images, setLoadingMessage);
      return { url, providerUsed: candidate };
    } catch (e: any) {
      const msg = e?.message || String(e);
      errors.push(`${candidate}: ${msg}`);
      setLoadingMessage(`${candidate} unavailable — trying next free source…`);
    }
  }

  throw new Error(
    `All free video sources failed.\n${errors.slice(0, 4).join('\n')}`
  );
};
