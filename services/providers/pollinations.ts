// Pollinations.ai provider — free, no API key required, CORS-open.
// Text via the anonymous GET endpoint (the POST/OpenAI endpoint now requires
// an API key), images via image.pollinations.ai. Voice, image editing and
// video are not in the anonymous tier — they point users to Gemini/OpenAI.
// Replaces the planned Replicate provider, whose API blocks browser CORS.
import { ImageFile, CreativeConcept, SocialCampaign } from '../../types';
import { GenerationProvider, TextOptions, GeneratedAudio } from './types';
import { getAspectRatio } from '../config';

const TEXT_ENDPOINT = 'https://text.pollinations.ai';
const IMAGE_ENDPOINT = 'https://image.pollinations.ai/prompt';
const REFERRER = 'creativeos';

const dimsForAspect = (): { width: number; height: number } => {
  switch (getAspectRatio()) {
    case '16:9': return { width: 1280, height: 720 };
    case '1:1': return { width: 1024, height: 1024 };
    default: return { width: 720, height: 1280 }; // 9:16
  }
};

const friendlyError = (status: number, what: string): Error => {
  if (status === 402 || status === 429) {
    return new Error(`The free service is rate-limited right now — wait a minute and try again, or add a Gemini/OpenAI key in Settings for ${what} without limits.`);
  }
  return new Error(`Free ${what} failed (HTTP ${status}) — the free service may be busy, try again in a moment.`);
};

/** Extract a JSON object/array from a possibly chatty model response. */
const extractJson = (raw: string): string => {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const first = cleaned.search(/[[{]/);
  if (first === -1) return cleaned;
  const opener = cleaned[first];
  const closer = opener === '{' ? '}' : ']';
  const last = cleaned.lastIndexOf(closer);
  return last > first ? cleaned.slice(first, last + 1) : cleaned.slice(first);
};

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read image data.'));
    reader.readAsDataURL(blob);
  });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export class PollinationsProvider implements GenerationProvider {
  readonly id = 'pollinations';
  readonly label = 'Pollinations (Free)';

  /**
   * Anonymous text generation: GET /{prompt}. The anonymous tier has a small
   * per-IP budget, so we send exactly one request per user action and retry
   * once only on transient 5xx errors.
   */
  private async getText(prompt: string): Promise<string> {
    const url = `${TEXT_ENDPOINT}/${encodeURIComponent(prompt)}?referrer=${REFERRER}`;
    let res = await fetch(url);
    if (res.status >= 500) {
      await sleep(2500);
      res = await fetch(url);
    }
    if (!res.ok) throw friendlyError(res.status, 'text generation');
    const text = (await res.text()).trim();
    if (!text) throw new Error('Empty response from the free model.');
    return text;
  }

  async generateText(prompt: string, options?: TextOptions): Promise<string> {
    const instruction = [
      'You are an expert short-form content copywriter.',
      options?.tone ? `Tone: ${options.tone}.` : '',
      options?.platform ? `Target platform: ${options.platform}.` : '',
      options?.language === 'ar' ? 'Respond in Arabic.' : '',
      'Return only the requested copy — no preamble, no explanations.',
      `Request: ${prompt}`,
    ].filter(Boolean).join('\n');
    return this.getText(instruction);
  }

  async generateCreativeConcepts(topic: string): Promise<CreativeConcept[]> {
    const raw = await this.getText(
      'Generate exactly 3 viral short-form video concepts for the topic below. ' +
      'Respond ONLY with minified JSON, no markdown, matching: ' +
      '{"concepts":[{"title":string,"hook":string,"visualDescription":string,"viralScore":number 1-100,"rationale":string}]}' +
      `\nTopic: ${topic}`,
    );
    const parsed = JSON.parse(extractJson(raw));
    const list = Array.isArray(parsed) ? parsed : parsed.concepts;
    if (!Array.isArray(list) || list.length === 0) throw new Error('No concepts returned.');
    return list;
  }

  async generateSocialMetadata(topic: string, hook: string, description: string): Promise<SocialCampaign> {
    const raw = await this.getText(
      'Write platform-native social captions. Respond ONLY with minified JSON, no markdown, matching: ' +
      '{"youtube":{"caption":string,"hashtags":string[]},"instagram":{"caption":string,"hashtags":string[]},"tiktok":{"caption":string,"hashtags":string[]}}' +
      `\nTopic: ${topic}\nHook: ${hook}\nVisual: ${description}`,
    );
    return JSON.parse(extractJson(raw));
  }

  async generateImage(prompt: string): Promise<string> {
    const { width, height } = dimsForAspect();
    const seed = Math.floor(Math.random() * 1e9);
    const url = `${IMAGE_ENDPOINT}/${encodeURIComponent(prompt)}?width=${width}&height=${height}&seed=${seed}&nologo=true&referrer=${REFERRER}`;
    const res = await fetch(url);
    if (!res.ok) throw friendlyError(res.status, 'image generation');
    const blob = await res.blob();
    if (!blob.type.startsWith('image/')) throw new Error('The free image service returned an unexpected response.');
    return blobToDataUrl(blob);
  }

  async editImage(_imageFile: ImageFile, _prompt: string): Promise<string> {
    throw new Error('Image editing is not available on the free provider — switch to Gemini or OpenAI in Settings.');
  }

  async generateSpeech(): Promise<GeneratedAudio> {
    throw new Error('Voiceovers are not available on the free provider — switch to Gemini, OpenAI or ElevenLabs in Settings.');
  }

  async generateVideo(): Promise<string> {
    throw new Error('Video generation is not available on the free provider — switch to Gemini (Veo) in Settings.');
  }
}
