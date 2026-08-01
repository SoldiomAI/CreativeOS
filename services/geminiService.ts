import { GoogleGenAI, Modality, GenerateVideosOperation, Type } from "@google/genai";
import { ImageFile, CreativeConcept, SocialCampaign } from '../types';
import { safeErrorMessage } from './utils';

const getGeminiKey = (): string | undefined => {
  const key = (process.env.API_KEY || process.env.GEMINI_API_KEY || '').trim();
  return key || undefined;
};

const requireGeminiKey = (): string => {
  const key = getGeminiKey();
  if (!key) {
    throw new Error('GEMINI_API_KEY missing. Set it in .env.local or use free HF/local movie providers.');
  }
  return key;
};

/** AI Studio exposes window.aistudio; local Vite does not. */
const hasAiStudioKeySelected = async (): Promise<boolean | 'unavailable'> => {
  const studio = (window as unknown as { aistudio?: { hasSelectedApiKey?: () => Promise<boolean> } }).aistudio;
  if (!studio?.hasSelectedApiKey) return 'unavailable';
  try {
    return await studio.hasSelectedApiKey();
  } catch {
    return false;
  }
};

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });
};

export const generateCreativeConcepts = async (topic: string): Promise<CreativeConcept[]> => {
  const ai = new GoogleGenAI({ apiKey: requireGeminiKey() });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `Generate 3 viral short-form video concepts for the topic: "${topic}". 
    Focus on high-retention hooks and visually striking imagery suitable for short-form video.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            hook: { type: Type.STRING, description: "The opening text overlay or spoken line" },
            visualDescription: { type: Type.STRING, description: "Detailed visual prompt for video generation" },
            viralScore: { type: Type.INTEGER, description: "Estimated viral potential 0-100" },
            rationale: { type: Type.STRING }
          }
        }
      }
    }
  });

  if (response.text) {
    return JSON.parse(response.text);
  }
  throw new Error("Failed to generate concepts");
};

export const generateSocialMetadata = async (topic: string, hook: string, description: string): Promise<SocialCampaign> => {
  const ai = new GoogleGenAI({ apiKey: requireGeminiKey() });
  const response = await ai.models.generateContent({
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
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          youtube: {
            type: Type.OBJECT,
            properties: {
              caption: { type: Type.STRING },
              hashtags: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          },
          instagram: {
             type: Type.OBJECT,
            properties: {
              caption: { type: Type.STRING },
              hashtags: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          },
          tiktok: {
             type: Type.OBJECT,
            properties: {
              caption: { type: Type.STRING },
              hashtags: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          }
        }
      }
    }
  });

  if (response.text) {
    return JSON.parse(response.text);
  }
  throw new Error("Failed to generate social metadata");
};

export const editImage = async (imageFile: ImageFile, prompt: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: requireGeminiKey() });
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          inlineData: {
            data: imageFile.base64,
            mimeType: imageFile.type,
          },
        },
        {
          text: prompt,
        },
      ],
    },
    config: {
        responseModalities: [Modality.IMAGE],
    },
  });

  const parts = response.candidates?.[0]?.content?.parts || [];
  for (const part of parts) {
    if (part.inlineData?.data) {
      return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
    }
  }

  throw new Error("No image generated from edit");
};


export const generateImage = async (prompt: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: requireGeminiKey() });
  const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: '9:16',
      },
  });

  const image = response.generatedImages?.[0]?.image?.imageBytes;
  if (image) {
    return `data:image/jpeg;base64,${image}`;
  }
  
  throw new Error("No image generated");
};


export const generateVideo = async (
    imageFile: ImageFile, 
    prompt: string, 
    setLoadingMessage: (message: string) => void
  ): Promise<string> => {

  const studioKey = await hasAiStudioKeySelected();
  if (studioKey === false) {
    setLoadingMessage('API Key required for video generation.');
    throw new Error('API_KEY_REQUIRED');
  }
  if (studioKey === 'unavailable' && !getGeminiKey()) {
    setLoadingMessage('Gemini API key required for Veo.');
    throw new Error('API_KEY_REQUIRED');
  }

  const ai = new GoogleGenAI({ apiKey: requireGeminiKey() });
  
  setLoadingMessage('Initializing Veo-3.1...');
  let operation: GenerateVideosOperation;
  try {
    operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      image: {
        imageBytes: imageFile.base64,
        mimeType: imageFile.type,
      },
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '9:16'
      }
    });
  } catch(e: unknown) {
    const msg = safeErrorMessage(e);
    if (msg.includes('Requested entity was not found.')) {
        throw new Error('API_KEY_INVALID');
    }
    throw e instanceof Error ? e : new Error(msg);
  }

  let i = 0;
  const loadingMessages = [
    "Analyzing visual structure...",
    "Synthesizing motion vectors...",
    "Applying physics simulation...",
    "Rendering lighting passes...",
    "Upscaling frames...",
    "Finalizing temporal coherence...",
  ];

  while (!operation.done) {
    setLoadingMessage(loadingMessages[i % loadingMessages.length]);
    i++;
    await new Promise(resolve => setTimeout(resolve, 5000)); 
    operation = await ai.operations.getVideosOperation({operation: operation});
  }

  if (operation.error) {
    throw new Error(`Video generation failed: ${operation.error.message || 'unknown error'}`);
  }

  setLoadingMessage('Transferring asset...');

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (downloadLink) {
    const key = getGeminiKey();
    const response = await fetch(key ? `${downloadLink}&key=${key}` : downloadLink);
    
    if (!response.ok) {
        throw new Error(`Failed to download video: ${response.statusText}`);
    }
    
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }

  throw new Error('Video generation completed but returned no data.');
};
