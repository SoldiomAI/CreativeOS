// Central configuration & API key management for CreativeOS.
// Key resolution order: localStorage override -> env-injected key (vite define).

const LS_API_KEY = 'creativeos.apiKey';
const LS_ASPECT = 'creativeos.aspectRatio';
const LS_LANG = 'creativeos.lang';
const LS_PROVIDER = 'creativeos.provider';
const LS_OPENAI_KEY = 'creativeos.openai.apiKey';
const LS_OPENAI_BASE = 'creativeos.openai.baseUrl';
const LS_VOICE_ENGINE = 'creativeos.voiceEngine';
const LS_ELEVEN_KEY = 'creativeos.elevenlabs.apiKey';
const LS_STARTED = 'creativeos.started';

export type AspectRatio = '9:16' | '16:9' | '1:1';
export type Language = 'en' | 'ar';
export type ProviderId = 'gemini' | 'openai' | 'pollinations';
export type VoiceEngine = 'provider' | 'elevenlabs';

export const getApiKey = (): string => {
  try {
    const stored = localStorage.getItem(LS_API_KEY);
    if (stored && stored.trim()) return stored.trim();
  } catch {
    // localStorage unavailable (SSR/privacy mode) — fall through to env
  }
  return (process.env.GEMINI_API_KEY as string) || (process.env.API_KEY as string) || '';
};

export const setApiKey = (key: string): void => {
  if (key && key.trim()) {
    localStorage.setItem(LS_API_KEY, key.trim());
  } else {
    localStorage.removeItem(LS_API_KEY);
  }
  window.dispatchEvent(new CustomEvent('creativeos:config-changed'));
};

export const isDemoMode = (): boolean => !getActiveProviderKey();

export const getProviderId = (): ProviderId => {
  try {
    const v = localStorage.getItem(LS_PROVIDER);
    if (v === 'gemini' || v === 'openai' || v === 'pollinations') return v;
  } catch { /* default below */ }
  return 'gemini';
};

export const setProviderId = (id: ProviderId): void => {
  localStorage.setItem(LS_PROVIDER, id);
  window.dispatchEvent(new CustomEvent('creativeos:config-changed'));
};

export const getOpenAiKey = (): string => {
  try {
    return (localStorage.getItem(LS_OPENAI_KEY) || '').trim();
  } catch {
    return '';
  }
};

export const setOpenAiKey = (key: string): void => {
  if (key && key.trim()) {
    localStorage.setItem(LS_OPENAI_KEY, key.trim());
  } else {
    localStorage.removeItem(LS_OPENAI_KEY);
  }
  window.dispatchEvent(new CustomEvent('creativeos:config-changed'));
};

export const getOpenAiBaseUrl = (): string => {
  try {
    const v = (localStorage.getItem(LS_OPENAI_BASE) || '').trim();
    if (v) return v.replace(/\/+$/, '');
  } catch { /* default below */ }
  return 'https://api.openai.com/v1';
};

export const setOpenAiBaseUrl = (url: string): void => {
  if (url && url.trim()) {
    localStorage.setItem(LS_OPENAI_BASE, url.trim());
  } else {
    localStorage.removeItem(LS_OPENAI_BASE);
  }
  window.dispatchEvent(new CustomEvent('creativeos:config-changed'));
};

/** Key for whichever provider is currently selected (empty string → demo mode).
 *  Pollinations needs no key, so selecting it always counts as "live". */
export const getActiveProviderKey = (): string => {
  const id = getProviderId();
  if (id === 'pollinations') return 'free';
  return id === 'openai' ? getOpenAiKey() : getApiKey();
};

export const getVoiceEngine = (): VoiceEngine => {
  try {
    if (localStorage.getItem(LS_VOICE_ENGINE) === 'elevenlabs') return 'elevenlabs';
  } catch { /* default below */ }
  return 'provider';
};

export const setVoiceEngine = (engine: VoiceEngine): void => {
  localStorage.setItem(LS_VOICE_ENGINE, engine);
  window.dispatchEvent(new CustomEvent('creativeos:config-changed'));
};

export const getElevenLabsKey = (): string => {
  try {
    return (localStorage.getItem(LS_ELEVEN_KEY) || '').trim();
  } catch {
    return '';
  }
};

export const setElevenLabsKey = (key: string): void => {
  if (key && key.trim()) {
    localStorage.setItem(LS_ELEVEN_KEY, key.trim());
  } else {
    localStorage.removeItem(LS_ELEVEN_KEY);
  }
  window.dispatchEvent(new CustomEvent('creativeos:config-changed'));
};

/** Engine that will actually synthesize speech (for labels/asset metadata). */
export const getActiveSpeechEngineId = (): string => {
  if (getVoiceEngine() === 'elevenlabs' && getElevenLabsKey()) return 'elevenlabs';
  return isDemoMode() ? 'demo' : getProviderId();
};

export const hasStarted = (): boolean => {
  try {
    return localStorage.getItem(LS_STARTED) === '1';
  } catch {
    return false;
  }
};

export const setStarted = (): void => {
  try {
    localStorage.setItem(LS_STARTED, '1');
  } catch { /* non-fatal */ }
};

export const getAspectRatio = (): AspectRatio => {
  try {
    const v = localStorage.getItem(LS_ASPECT);
    if (v === '9:16' || v === '16:9' || v === '1:1') return v;
  } catch { /* default below */ }
  return '9:16';
};

export const setAspectRatio = (ratio: AspectRatio): void => {
  localStorage.setItem(LS_ASPECT, ratio);
  window.dispatchEvent(new CustomEvent('creativeos:config-changed'));
};

export const getLanguage = (): Language => {
  try {
    const v = localStorage.getItem(LS_LANG);
    if (v === 'en' || v === 'ar') return v;
  } catch { /* default below */ }
  return 'en';
};

export const setLanguage = (lang: Language): void => {
  localStorage.setItem(LS_LANG, lang);
  window.dispatchEvent(new CustomEvent('creativeos:config-changed'));
};

export const navigateTo = (tab: string): void => {
  window.dispatchEvent(new CustomEvent('creativeos:navigate', { detail: tab }));
};
