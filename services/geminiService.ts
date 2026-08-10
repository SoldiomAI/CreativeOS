// Compatibility facade over the provider layer. Existing components import
// generation functions from here; the active provider (Gemini or Demo) is
// resolved per call in services/providers.
import { ImageFile, CreativeConcept, SocialCampaign } from '../types';
import { getProvider, TextOptions, TtsOptions, GeneratedAudio } from './providers';

// Helper to convert file to base64
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });
};

export const generateText = (prompt: string, options?: TextOptions): Promise<string> =>
  getProvider().generateText(prompt, options);

export const generateCreativeConcepts = (topic: string): Promise<CreativeConcept[]> =>
  getProvider().generateCreativeConcepts(topic);

export const generateSocialMetadata = (
  topic: string,
  hook: string,
  description: string
): Promise<SocialCampaign> => getProvider().generateSocialMetadata(topic, hook, description);

export const generateImage = (prompt: string): Promise<string> =>
  getProvider().generateImage(prompt);

export const editImage = (imageFile: ImageFile, prompt: string): Promise<string> =>
  getProvider().editImage(imageFile, prompt);

export const generateSpeech = (text: string, options?: TtsOptions): Promise<GeneratedAudio> =>
  getProvider().generateSpeech(text, options);

export const generateVideo = (
  imageFile: ImageFile,
  prompt: string,
  setLoadingMessage: (message: string) => void
): Promise<string> => getProvider().generateVideo(imageFile, prompt, setLoadingMessage);

