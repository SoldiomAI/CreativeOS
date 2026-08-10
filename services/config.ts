// Central configuration & API key management for CreativeOS.
// Key resolution order: localStorage override -> env-injected key (vite define).

const LS_API_KEY = 'creativeos.apiKey';
const LS_ASPECT = 'creativeos.aspectRatio';
const LS_LANG = 'creativeos.lang';

export type AspectRatio = '9:16' | '16:9' | '1:1';
export type Language = 'en' | 'ar';

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

export const isDemoMode = (): boolean => !getApiKey();

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
