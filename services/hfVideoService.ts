import { Client } from '@gradio/client';
import { InferenceClient } from '@huggingface/inference';
import { ImageFile, HfVideoModel } from '../types';

const DEFAULT_NEGATIVE =
  'worst quality, inconsistent motion, blurry, jittery, distorted, watermark, text overlay';

const getHfToken = (): string | undefined => {
  const fromEnv = (process.env.HF_TOKEN || process.env.VITE_HF_TOKEN || '').trim();
  if (fromEnv) return fromEnv;
  try {
    return localStorage.getItem('creativeos_hf_token')?.trim() || undefined;
  } catch {
    return undefined;
  }
};

export const setStoredHfToken = (token: string) => {
  localStorage.setItem('creativeos_hf_token', token.trim());
};

export const getStoredHfToken = (): string => {
  try {
    return localStorage.getItem('creativeos_hf_token') || '';
  } catch {
    return '';
  }
};

const extractVideoUrl = (payload: unknown): string | null => {
  if (!payload) return null;
  if (typeof payload === 'string') {
    if (payload.startsWith('http') || payload.startsWith('blob:') || payload.startsWith('data:')) {
      return payload;
    }
    return null;
  }
  if (Array.isArray(payload)) {
    for (const item of payload) {
      const found = extractVideoUrl(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;
    if (typeof obj.url === 'string') return obj.url;
    if (typeof obj.video === 'string') return obj.video;
    if (obj.video && typeof obj.video === 'object') {
      const nested = extractVideoUrl(obj.video);
      if (nested) return nested;
    }
    if (typeof obj.path === 'string' && obj.path.startsWith('http')) return obj.path;
    for (const value of Object.values(obj)) {
      const found = extractVideoUrl(value);
      if (found) return found;
    }
  }
  return null;
};

const toGradioImage = (image: ImageFile) => ({
  url: `data:${image.type};base64,${image.base64}`,
  orig_name: image.name,
  mime_type: image.type,
  is_stream: false,
  meta: { _type: 'gradio.FileData' },
});

const fetchAsObjectUrl = async (url: string): Promise<string> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download HF video (${response.status})`);
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

type ProgressFn = (message: string) => void;

const connectSpace = async (space: string) => {
  const token = getHfToken();
  // Prefer `token`; older Gradio clients also accept `hf_token`.
  return Client.connect(
    space,
    token ? ({ token, hf_token: token } as { token: `hf_${string}`; hf_token: `hf_${string}` }) : {}
  );
};

/** Free LTX-Video Space — text-to-video and image-to-video (GitHub/HF open model). */
export const generateWithLtxSpace = async (
  prompt: string,
  images: ImageFile[],
  setLoadingMessage: ProgressFn
): Promise<string> => {
  setLoadingMessage('Connecting to Lightricks/LTX-Video (HF Space)…');
  const client = await connectSpace('Lightricks/ltx-video-distilled');
  const hasImage = images.length > 0;

  setLoadingMessage(
    hasImage
      ? 'Animating image with LTX-Video (free HF Space)…'
      : 'Generating video with LTX-Video (free HF Space)…'
  );

  const result = await client.predict(hasImage ? '/image_to_video' : '/text_to_video', {
    prompt,
    negative_prompt: DEFAULT_NEGATIVE,
    input_image_filepath: hasImage ? toGradioImage(images[0]) : null,
    input_video_filepath: null,
    height_ui: 768,
    width_ui: 512,
    mode: hasImage ? 'image-to-video' : 'text-to-video',
    duration_ui: 3,
    ui_frames_to_use: 9,
    seed_ui: Math.floor(Math.random() * 1_000_000),
    randomize_seed: true,
    ui_guidance_scale: 1,
    improve_texture_flag: true,
  });

  const url = extractVideoUrl(result.data);
  if (!url) throw new Error('LTX Space returned no video');
  setLoadingMessage('Downloading LTX video…');
  return fetchAsObjectUrl(url);
};

/** Free AnimateDiff Lightning Space — prompt-only short clips. */
export const generateWithAnimateDiffSpace = async (
  prompt: string,
  setLoadingMessage: ProgressFn
): Promise<string> => {
  setLoadingMessage('Connecting to AnimateDiff-Lightning (HF Space)…');
  const client = await connectSpace('ByteDance/AnimateDiff-Lightning');
  setLoadingMessage('Rendering AnimateDiff clip (free HF Space)…');
  const result = await client.predict('/generate_image', {
    prompt,
    base: 'epiCRealism',
    motion: 'guoyww/animatediff-motion-lora-zoom-in',
    step: '4',
  });
  const url = extractVideoUrl(result.data);
  if (!url) throw new Error('AnimateDiff Space returned no video');
  setLoadingMessage('Downloading AnimateDiff video…');
  return fetchAsObjectUrl(url);
};

/** Free CogVideoX-2B Space — text-to-video. */
export const generateWithCogVideoSpace = async (
  prompt: string,
  setLoadingMessage: ProgressFn
): Promise<string> => {
  setLoadingMessage('Connecting to CogVideoX-2B (HF Space)…');
  const client = await connectSpace('zai-org/CogVideoX-2B-Space');
  setLoadingMessage('Generating with CogVideoX-2B (free HF Space)…');
  const result = await client.predict('/generate', {
    prompt,
    num_inference_steps: 30,
    guidance_scale: 6,
  });
  const url = extractVideoUrl(result.data);
  if (!url) throw new Error('CogVideoX Space returned no video');
  setLoadingMessage('Downloading CogVideoX video…');
  return fetchAsObjectUrl(url);
};

/** Free community Wan2.1 Space — text-to-video. */
export const generateWithWanSpace = async (
  prompt: string,
  setLoadingMessage: ProgressFn
): Promise<string> => {
  setLoadingMessage('Connecting to Wan2.1 Space…');
  const client = await connectSpace('fffiloni/Wan2.1');
  setLoadingMessage('Generating with Wan2.1 (free HF Space)…');
  const result = await client.predict('/infer', { prompt });
  const url = extractVideoUrl(result.data);
  if (!url) throw new Error('Wan Space returned no video');
  setLoadingMessage('Downloading Wan video…');
  return fetchAsObjectUrl(url);
};

/**
 * Hugging Face Inference Providers (Wan / LTX via fal/wavespeed).
 * Uses free HF account credits when available — requires HF token.
 */
export const generateWithHfInference = async (
  prompt: string,
  images: ImageFile[],
  setLoadingMessage: ProgressFn
): Promise<string> => {
  const token = getHfToken();
  if (!token) {
    throw new Error('HF_TOKEN_REQUIRED');
  }

  const client = new InferenceClient(token);
  if (images.length > 0) {
    setLoadingMessage('Running image-to-video via HF Inference (Wan)…');
    const bytes = await fetch(`data:${images[0].type};base64,${images[0].base64}`).then((r) =>
      r.arrayBuffer()
    );
    const video = await client.imageToVideo({
      model: 'Wan-AI/Wan2.1-I2V-14B-480P',
      inputs: new Blob([bytes], { type: images[0].type }),
      parameters: { prompt },
      provider: 'auto',
    });
    return URL.createObjectURL(video);
  }

  setLoadingMessage('Running text-to-video via HF Inference (Wan 1.3B)…');
  const video = await client.textToVideo({
    model: 'Wan-AI/Wan2.1-T2V-1.3B',
    inputs: prompt,
    provider: 'auto',
  });
  return URL.createObjectURL(video);
};

export const generateWithHfModel = async (
  model: HfVideoModel,
  prompt: string,
  images: ImageFile[],
  setLoadingMessage: ProgressFn
): Promise<string> => {
  switch (model) {
    case 'ltx':
      return generateWithLtxSpace(prompt, images, setLoadingMessage);
    case 'animatediff':
      return generateWithAnimateDiffSpace(prompt, setLoadingMessage);
    case 'cogvideox':
      return generateWithCogVideoSpace(prompt, setLoadingMessage);
    case 'wan-space':
      return generateWithWanSpace(prompt, setLoadingMessage);
    case 'hf-inference':
      return generateWithHfInference(prompt, images, setLoadingMessage);
    default:
      throw new Error(`Unknown HF model: ${model}`);
  }
};
