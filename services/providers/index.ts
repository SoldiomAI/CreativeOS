import { GenerationProvider } from './types';
import { GeminiProvider } from './gemini';
import { DemoProvider } from './demo';
import { isDemoMode } from '../config';

const gemini = new GeminiProvider();
const demo = new DemoProvider();

/**
 * Returns the active provider. Gemini when an API key is configured,
 * otherwise the zero-key DemoProvider. Future backends plug in here.
 */
export const getProvider = (): GenerationProvider => (isDemoMode() ? demo : gemini);

export * from './types';
