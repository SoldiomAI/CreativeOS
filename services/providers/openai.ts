// OpenAI-compatible provider: works with api.openai.com or any compatible
// gateway (Azure OpenAI via proxy, LiteLLM, OpenRouter, local servers).
import { ImageFile, CreativeConcept, SocialCampaign } from '../../types';
import { GenerationProvider, TextOptions, TtsOptions, GeneratedAudio } from './types';
import { getOpenAiKey, getOpenAiBaseUrl, getAspectRatio } from '../config';

const TEXT_MODEL = 'gpt-4o-mini';
const IMAGE_MODEL = 'dall-e-3';
const IMAGE_EDIT_MODEL = 'gpt-image-1';
const TTS_MODEL = 'tts-1';

/** Map the app's Gemini-named voices onto OpenAI TTS voices. */
const VOICE_MAP: Record<string, string> = {
  Kore: 'alloy',
  Puck: 'echo',
  Zephyr: 'shimmer',
  Charon: 'onyx',
  Fenrir: 'fable',
  Aoede: 'nova',
};

const sizeForAspect = (): string => {
  switch (getAspectRatio()) {
    case '16:9': return '1792x1024';
    case '1:1': return '1024x1024';
    default: return '1024x1792'; // 9:16
  }
};

const requireKey = (): string => {
  const key = getOpenAiKey();
  if (!key) throw new Error('API_KEY_REQUIRED');
  return key;
};

const apiError = async (res: Response, fallback: string): Promise<Error> => {
  if (res.status === 401 || res.status === 403) return new Error('API_KEY_INVALID');
  let detail = '';
  try {
    const body = await res.json();
    detail = body?.error?.message ?? '';
  } catch { /* non-JSON body */ }
  return new Error(detail || `${fallback} (HTTP ${res.status})`);
};

const stripFences = (raw: string): string =>
  raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');

export class OpenAIProvider implements GenerationProvider {
  readonly id = 'openai';
  readonly label = 'OpenAI';

  private async chat(messages: { role: string; content: string }[], json = false): Promise<string> {
    const key = requireKey();
    const res = await fetch(`${getOpenAiBaseUrl()}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: TEXT_MODEL,
        messages,
        ...(json ? { response_format: { type: 'json_object' } } : {}),
      }),
    });
    if (!res.ok) throw await apiError(res, 'Text generation failed');
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty response from model.');
    return content;
  }

  async generateText(prompt: string, options?: TextOptions): Promise<string> {
    const system = [
      'You are an expert short-form content copywriter.',
      options?.tone ? `Tone: ${options.tone}.` : '',
      options?.platform ? `Target platform: ${options.platform}.` : '',
      options?.language === 'ar' ? 'Respond in Arabic.' : '',
      'Return only the requested copy — no preamble.',
    ].filter(Boolean).join(' ');
    return (await this.chat([
      { role: 'system', content: system },
      { role: 'user', content: prompt },
    ])).trim();
  }

  async generateCreativeConcepts(topic: string): Promise<CreativeConcept[]> {
    const raw = await this.chat([
      {
        role: 'system',
        content:
          'You generate viral short-form video concepts. Respond with JSON: {"concepts":[{"title":string,"hook":string,"visualDescription":string,"viralScore":number 1-100,"rationale":string}]} with exactly 3 concepts.',
      },
      { role: 'user', content: `Topic: ${topic}` },
    ], true);
    const parsed = JSON.parse(stripFences(raw));
    const list = Array.isArray(parsed) ? parsed : parsed.concepts;
    if (!Array.isArray(list) || list.length === 0) throw new Error('No concepts returned.');
    return list;
  }

  async generateSocialMetadata(topic: string, hook: string, description: string): Promise<SocialCampaign> {
    const raw = await this.chat([
      {
        role: 'system',
        content:
          'You write platform-native social captions. Respond with JSON: {"youtube":{"caption":string,"hashtags":string[]},"instagram":{...same},"tiktok":{...same}}.',
      },
      { role: 'user', content: `Topic: ${topic}\nHook: ${hook}\nVisual: ${description}` },
    ], true);
    return JSON.parse(stripFences(raw));
  }

  async generateImage(prompt: string): Promise<string> {
    const key = requireKey();
    const res = await fetch(`${getOpenAiBaseUrl()}/images/generations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        prompt,
        n: 1,
        size: sizeForAspect(),
        response_format: 'b64_json',
      }),
    });
    if (!res.ok) throw await apiError(res, 'Image generation failed');
    const data = await res.json();
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) throw new Error('No image returned.');
    return `data:image/png;base64,${b64}`;
  }

  async editImage(imageFile: ImageFile, prompt: string): Promise<string> {
    const key = requireKey();
    const bytes = Uint8Array.from(atob(imageFile.base64), (c) => c.charCodeAt(0));
    const form = new FormData();
    form.append('model', IMAGE_EDIT_MODEL);
    form.append('prompt', prompt);
    form.append('image', new Blob([bytes], { type: imageFile.type }), imageFile.name || 'image.png');
    const res = await fetch(`${getOpenAiBaseUrl()}/images/edits`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
    if (!res.ok) throw await apiError(res, 'Image edit failed');
    const data = await res.json();
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) throw new Error('No edited image returned.');
    return `data:image/png;base64,${b64}`;
  }

  async generateSpeech(text: string, options?: TtsOptions): Promise<GeneratedAudio> {
    const key = requireKey();
    const voice = VOICE_MAP[options?.voice ?? ''] ?? 'alloy';
    const res = await fetch(`${getOpenAiBaseUrl()}/audio/speech`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: TTS_MODEL, voice, input: text, response_format: 'mp3' }),
    });
    if (!res.ok) throw await apiError(res, 'Speech generation failed');
    const blob = await res.blob();
    const mime = blob.type || 'audio/mpeg';
    return { url: URL.createObjectURL(blob), blob, mime };
  }

  async generateVideo(): Promise<string> {
    throw new Error('Video generation is not available on the OpenAI provider yet — switch to Gemini (Veo) in Settings.');
  }
}
