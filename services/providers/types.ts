import { ImageFile, CreativeConcept, SocialCampaign } from '../../types';

export interface TextOptions {
  tone?: string;
  platform?: string;
  language?: string;
}

export interface TtsOptions {
  voice?: string;
}

export interface GeneratedAudio {
  /** Object URL playable in an <audio> element */
  url: string;
  blob: Blob;
  mime: string;
}

/**
 * Unified interface every generation backend must implement.
 * Gemini covers all modalities today; future providers (OpenAI, Replicate,
 * ElevenLabs, ...) implement the same surface and are selected in index.ts.
 */
export interface GenerationProvider {
  readonly id: string;
  readonly label: string;

  generateText(prompt: string, options?: TextOptions): Promise<string>;
  generateCreativeConcepts(topic: string): Promise<CreativeConcept[]>;
  generateSocialMetadata(topic: string, hook: string, description: string): Promise<SocialCampaign>;

  generateImage(prompt: string): Promise<string>;
  editImage(imageFile: ImageFile, prompt: string): Promise<string>;

  generateSpeech(text: string, options?: TtsOptions): Promise<GeneratedAudio>;

  generateVideo(
    imageFile: ImageFile,
    prompt: string,
    setLoadingMessage: (message: string) => void
  ): Promise<string>;
}

export const VOICES = ['Kore', 'Puck', 'Zephyr', 'Charon', 'Fenrir', 'Aoede'] as const;
export type VoiceName = (typeof VOICES)[number];
