import { GoogleGenAI, Modality, GenerateVideosOperation, Type } from '@google/genai';
import { ImageFile, CreativeConcept, SocialCampaign } from '../../types';
import { GenerationProvider, TextOptions, TtsOptions, GeneratedAudio } from './types';
import { getApiKey, getAspectRatio } from '../config';

// Wrap raw 16-bit PCM (Gemini TTS output) in a WAV container so browsers can play it.
const pcmToWav = (pcm: Uint8Array, sampleRate: number): Blob => {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  const byteRate = sampleRate * 2; // mono, 16-bit
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + pcm.length, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, pcm.length, true);
  return new Blob([header, pcm.buffer as ArrayBuffer], { type: 'audio/wav' });
};

const base64ToBytes = (b64: string): Uint8Array => {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
};

export class GeminiProvider implements GenerationProvider {
  readonly id = 'gemini';
  readonly label = 'Google Gemini';

  private client(): GoogleGenAI {
    return new GoogleGenAI({ apiKey: getApiKey() });
  }

  async generateText(prompt: string, options?: TextOptions): Promise<string> {
    const parts: string[] = [prompt];
    if (options?.tone) parts.push(`Tone: ${options.tone}.`);
    if (options?.platform) parts.push(`Target platform: ${options.platform}.`);
    if (options?.language) parts.push(`Respond in ${options.language}.`);
    const response = await this.client().models.generateContent({
      model: 'gemini-2.5-flash',
      contents: parts.join('\n'),
    });
    if (response.text) return response.text;
    throw new Error('Failed to generate text');
  }

  async generateCreativeConcepts(topic: string): Promise<CreativeConcept[]> {
    const response = await this.client().models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate 3 viral short-form video concepts for the topic: "${topic}". 
      Focus on high-retention hooks and visually striking imagery suitable for Veo generation.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              hook: { type: Type.STRING, description: 'The opening text overlay or spoken line' },
              visualDescription: { type: Type.STRING, description: 'Detailed visual prompt for video generation' },
              viralScore: { type: Type.INTEGER, description: 'Estimated viral potential 0-100' },
              rationale: { type: Type.STRING },
            },
          },
        },
      },
    });
    if (response.text) return JSON.parse(response.text);
    throw new Error('Failed to generate concepts');
  }

  async generateSocialMetadata(topic: string, hook: string, description: string): Promise<SocialCampaign> {
    const metadataSchema = {
      type: Type.OBJECT,
      properties: {
        caption: { type: Type.STRING },
        hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
    };
    const response = await this.client().models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate viral social media metadata for a short video.
      Topic: ${topic}
      Hook: ${hook}
      Visuals: ${description}
      
      Create specific variants for YouTube Shorts, Instagram Reels, and TikTok.
      - YouTube: SEO-focused, slightly longer, includes keywords.
      - Instagram: Aesthetic, lifestyle-focused, engaging.
      - TikTok: Trendy, short, punchy, uses trending tags.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            youtube: metadataSchema,
            instagram: metadataSchema,
            tiktok: metadataSchema,
          },
        },
      },
    });
    if (response.text) return JSON.parse(response.text);
    throw new Error('Failed to generate social metadata');
  }

  async generateImage(prompt: string): Promise<string> {
    const response = await this.client().models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: getAspectRatio(),
      },
    });
    if (response.generatedImages && response.generatedImages.length > 0) {
      const base64ImageBytes = response.generatedImages[0].image?.imageBytes;
      if (base64ImageBytes) return `data:image/jpeg;base64,${base64ImageBytes}`;
    }
    throw new Error('No image generated');
  }

  async editImage(imageFile: ImageFile, prompt: string): Promise<string> {
    const response = await this.client().models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: imageFile.base64, mimeType: imageFile.type } },
          { text: prompt },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });
    const parts = response.candidates?.[0]?.content?.parts ?? [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    throw new Error('No image generated from edit');
  }

  async generateSpeech(text: string, options?: TtsOptions): Promise<GeneratedAudio> {
    const response = await this.client().models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: options?.voice || 'Kore' },
          },
        },
      },
    });
    const parts = response.candidates?.[0]?.content?.parts ?? [];
    for (const part of parts) {
      if (part.inlineData?.data) {
        const mime = part.inlineData.mimeType || 'audio/L16;codec=pcm;rate=24000';
        const rateMatch = /rate=(\d+)/.exec(mime);
        const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;
        const blob = pcmToWav(base64ToBytes(part.inlineData.data), sampleRate);
        return { url: URL.createObjectURL(blob), blob, mime: 'audio/wav' };
      }
    }
    throw new Error('No audio generated');
  }

  async generateVideo(
    imageFile: ImageFile,
    prompt: string,
    setLoadingMessage: (message: string) => void
  ): Promise<string> {
    setLoadingMessage('Initializing Veo-3.1...');
    let operation: GenerateVideosOperation;
    const ai = this.client();
    try {
      operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt,
        image: {
          imageBytes: imageFile.base64,
          mimeType: imageFile.type,
        },
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: getAspectRatio() === '1:1' ? '9:16' : getAspectRatio(),
        },
      });
    } catch (e: any) {
      if (e.message?.includes('Requested entity was not found.')) {
        throw new Error('API_KEY_INVALID');
      }
      throw e;
    }

    let i = 0;
    const loadingMessages = [
      'Analyzing visual structure...',
      'Synthesizing motion vectors...',
      'Applying physics simulation...',
      'Rendering lighting passes...',
      'Upscaling frames...',
      'Finalizing temporal coherence...',
    ];

    while (!operation.done) {
      setLoadingMessage(loadingMessages[i % loadingMessages.length]);
      i++;
      await new Promise((resolve) => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({ operation });
    }

    if (operation.error) {
      throw new Error(`Video generation failed: ${operation.error.message}`);
    }

    setLoadingMessage('Transferring asset...');

    if (operation.response?.generatedVideos?.[0]?.video?.uri) {
      const downloadLink = operation.response.generatedVideos[0].video.uri;
      const response = await fetch(`${downloadLink}&key=${getApiKey()}`);
      if (!response.ok) {
        throw new Error(`Failed to download video: ${response.statusText}`);
      }
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    }

    throw new Error('Video generation completed but returned no data.');
  }
}
