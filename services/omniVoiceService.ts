import { Client } from '@gradio/client';
import { getStoredHfToken } from './hfVideoService';
import { withTimeout } from './utils';

const SPACE_TIMEOUT_MS = 120_000;

const extractAudioUrl = (payload: unknown): string | null => {
  if (!payload) return null;
  if (typeof payload === 'string' && (payload.startsWith('http') || payload.startsWith('data:'))) {
    return payload;
  }
  if (Array.isArray(payload)) {
    for (const item of payload) {
      const found = extractAudioUrl(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;
    if (typeof obj.url === 'string') return obj.url;
    if (typeof obj.path === 'string' && obj.path.startsWith('http')) return obj.path;
    for (const value of Object.values(obj)) {
      const found = extractAudioUrl(value);
      if (found) return found;
    }
  }
  return null;
};

const connectSpace = async (space: string) => {
  const token = (getStoredHfToken() || '').trim();
  return Client.connect(
    space,
    token ? ({ token, hf_token: token } as { token: `hf_${string}`; hf_token: `hf_${string}` }) : {}
  );
};

const fetchAudioBlob = async (url: string): Promise<Blob> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download audio (${response.status})`);
  return response.blob();
};

const assertDecodable = async (blob: Blob): Promise<void> => {
  const ctx = new OfflineAudioContext(1, 1, 44100);
  await ctx.decodeAudioData((await blob.arrayBuffer()).slice(0));
};

/**
 * OmniVoice (https://github.com/k2-fsa/OmniVoice) via HF Space voice-design API.
 * Multilingual zero-shot TTS — preferred free GitHub voiceover source.
 */
export const generateVoiceoverWithOmniVoice = async (
  narration: string,
  setLoadingMessage: (m: string) => void
): Promise<Blob> => {
  setLoadingMessage('Narrating with OmniVoice (k2-fsa / HF Space)…');
  const client = await connectSpace('k2-fsa/OmniVoice');
  const result = await withTimeout(
    client.predict('/_design_fn', {
      text: narration.slice(0, 400),
      lang: 'English',
      ns: 16,
      gs: 2.0,
      dn: true,
      sp: 1.0,
      du: -1,
      pp: true,
      po: true,
      param_9: 'Female / 女',
      param_10: 'Young Adult / 青年',
      param_11: 'Moderate Pitch / 中音调',
      param_12: 'Auto',
      param_13: 'American Accent / 美式口音',
      param_14: 'Auto',
    }),
    SPACE_TIMEOUT_MS,
    'OmniVoice'
  );
  const url = extractAudioUrl(result.data);
  if (!url) throw new Error('OmniVoice returned no audio');
  const blob = await fetchAudioBlob(url);
  await assertDecodable(blob);
  return blob;
};
