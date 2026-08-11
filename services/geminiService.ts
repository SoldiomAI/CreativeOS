// Compatibility facade over the provider layer. Existing components import
// generation functions from here; the active provider (Gemini, OpenAI, or
// Demo) is resolved lazily per call in services/providers.
import { ImageFile, CreativeConcept, SocialCampaign } from '../types';
import { getProvider, TextOptions, TtsOptions, GeneratedAudio } from './providers';
import { getVoiceEngine, getElevenLabsKey } from './config';

// Helper to convert file to base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });
};

export const generateText = async (prompt: string, options?: TextOptions): Promise<string> =>
  (await getProvider()).generateText(prompt, options);

export const generateCreativeConcepts = async (topic: string): Promise<CreativeConcept[]> =>
  (await getProvider()).generateCreativeConcepts(topic);

export const generateSocialMetadata = async (
  topic: string,
  hook: string,
  description: string
): Promise<SocialCampaign> => (await getProvider()).generateSocialMetadata(topic, hook, description);

export const generateImage = async (prompt: string): Promise<string> =>
  (await getProvider()).generateImage(prompt);

export const editImage = async (imageFile: ImageFile, prompt: string): Promise<string> =>
  (await getProvider()).editImage(imageFile, prompt);

export const generateSpeech = async (text: string, options?: TtsOptions): Promise<GeneratedAudio> => {
  // Dedicated voice engine takes precedence over the general provider.
  if (getVoiceEngine() === 'elevenlabs' && getElevenLabsKey()) {
    const { elevenLabsSpeech } = await import('./providers/elevenlabs');
    return elevenLabsSpeech(text, options);
  }
  return (await getProvider()).generateSpeech(text, options);
};

export const generateVideo = async (
  imageFile: ImageFile,
  prompt: string,
  setLoadingMessage: (message: string) => void
): Promise<string> => (await getProvider()).generateVideo(imageFile, prompt, setLoadingMessage);
