import { GenerationProvider } from './types';
import { GeminiProvider } from './gemini';
import { DemoProvider } from './demo';
import { OpenAIProvider } from './openai';
import { isDemoMode, getProviderId } from '../config';

const gemini = new GeminiProvider();
const demo = new DemoProvider();
const openai = new OpenAIProvider();

/**
 * Returns the active provider: the one selected in Settings when it has a
 * key, otherwise the zero-key DemoProvider. Future backends plug in here.
 */
export const getProvider = (): GenerationProvider => {
  if (isDemoMode()) return demo;
  return getProviderId() === 'openai' ? openai : gemini;
};

export * from './types';
