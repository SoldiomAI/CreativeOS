import { GenerationProvider } from './types';
import { isDemoMode, getProviderId } from '../config';

type LoadableId = 'gemini' | 'openai' | 'pollinations' | 'demo';

const cache = new Map<LoadableId, Promise<GenerationProvider>>();

// Providers are loaded on first use so heavy SDKs (@google/genai) stay out of
// the initial bundle. Instances are cached per id.
const load = (id: LoadableId): Promise<GenerationProvider> => {
  let loading = cache.get(id);
  if (!loading) {
    loading = (async () => {
      switch (id) {
        case 'gemini':
          return new (await import('./gemini')).GeminiProvider();
        case 'openai':
          return new (await import('./openai')).OpenAIProvider();
        case 'pollinations':
          return new (await import('./pollinations')).PollinationsProvider();
        default:
          return new (await import('./demo')).DemoProvider();
      }
    })();
    cache.set(id, loading);
  }
  return loading;
};

/**
 * Resolves the active provider: the one selected in Settings when it has a
 * key, otherwise the zero-key DemoProvider. Future backends plug in here.
 */
export const getProvider = (): Promise<GenerationProvider> => {
  if (isDemoMode()) return load('demo');
  const id = getProviderId();
  return load(id === 'openai' || id === 'pollinations' ? id : 'gemini');
};

/** Synchronous id of the active provider (for labels/asset metadata). */
export const getActiveProviderId = (): string => (isDemoMode() ? 'demo' : getProviderId());

export * from './types';
