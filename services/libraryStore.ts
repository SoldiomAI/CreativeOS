import { VideoProvider } from '../types';

export interface LibraryItem {
  id: string;
  prompt: string;
  provider: VideoProvider;
  /** data URL or blob URL — blob URLs won't survive reload; we store data URLs when possible */
  videoDataUrl?: string;
  createdAt: number;
  hasAudio: boolean;
}

const KEY = 'creativeos_library_v1';
const MAX_ITEMS = 24;

export const loadLibrary = (): LibraryItem[] => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LibraryItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const saveLibrary = (items: LibraryItem[]) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch (e) {
    console.warn('Library save failed (quota?)', e);
  }
};

export const blobUrlToDataUrl = async (url: string): Promise<string> => {
  const blob = await fetch(url).then((r) => r.blob());
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to persist movie to library'));
    reader.readAsDataURL(blob);
  });
};

export const addToLibrary = async (
  prompt: string,
  provider: VideoProvider,
  videoUrl: string,
  hasAudio: boolean
): Promise<LibraryItem[]> => {
  let videoDataUrl: string | undefined;
  try {
    // Cap persistence — large movies may blow localStorage; keep trying but tolerate failure.
    const blob = await fetch(videoUrl).then((r) => r.blob());
    if (blob.size < 8_000_000) {
      videoDataUrl = await blobUrlToDataUrl(videoUrl);
    }
  } catch {
    /* skip persist of bytes */
  }

  const item: LibraryItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    prompt,
    provider,
    videoDataUrl,
    createdAt: Date.now(),
    hasAudio,
  };
  const next = [item, ...loadLibrary()].slice(0, MAX_ITEMS);
  saveLibrary(next);
  return next;
};

export const removeFromLibrary = (id: string): LibraryItem[] => {
  const next = loadLibrary().filter((i) => i.id !== id);
  saveLibrary(next);
  return next;
};

export const clearLibrary = () => {
  saveLibrary([]);
};
