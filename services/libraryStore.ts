import { SocialCampaign, VideoProvider } from '../types';

export interface PublishRecord {
  platform: string;
  /** Route that delivered: api | scheduler | mcp | share | manual */
  via: string;
  url?: string;
  at: number;
}

export interface LibraryItem {
  id: string;
  prompt: string;
  provider: VideoProvider;
  /** Object URL or data URL for playback */
  videoDataUrl?: string;
  /** Cover JPEG as data URL */
  coverDataUrl?: string;
  hook?: string;
  aspectRatio?: string;
  durationSec?: number;
  captions?: SocialCampaign;
  /** Outcome ledger — where this movie went out and via which route. */
  publishes?: PublishRecord[];
  createdAt: number;
  hasAudio: boolean;
  godMode?: boolean;
}

const LS_KEY = 'creativeos_library_v1';
const DB_NAME = 'creativeos_idb';
const STORE = 'movies';
const MAX_ITEMS = 40;

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('IndexedDB open failed'));
  });

const idbGetAll = async (): Promise<LibraryItem[]> => {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => {
        const rows = (req.result as LibraryItem[]) || [];
        resolve(rows.sort((a, b) => b.createdAt - a.createdAt));
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
};

const idbPut = async (item: LibraryItem) => {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

const idbDelete = async (id: string) => {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

const idbClear = async () => {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

/** Sync legacy localStorage reader (small items only). */
export const loadLibrary = (): LibraryItem[] => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LibraryItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const loadLibraryAsync = async (): Promise<LibraryItem[]> => {
  const fromIdb = await idbGetAll();
  if (fromIdb.length) return fromIdb;
  const legacy = loadLibrary();
  // Migrate small legacy items into IDB
  for (const item of legacy.slice(0, 10)) {
    try {
      await idbPut(item);
    } catch {
      /* skip */
    }
  }
  return legacy;
};

export const saveLibrary = (items: LibraryItem[]) => {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(items.slice(0, 8)));
  } catch (e) {
    console.warn('Library LS save failed', e);
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

export type AddLibraryMeta = {
  hook?: string;
  aspectRatio?: string;
  durationSec?: number;
  coverDataUrl?: string;
  captions?: SocialCampaign;
  godMode?: boolean;
};

export const addToLibrary = async (
  prompt: string,
  provider: VideoProvider,
  videoUrl: string,
  hasAudio: boolean,
  meta?: AddLibraryMeta
): Promise<{ id: string; items: LibraryItem[] }> => {
  let videoDataUrl: string | undefined;
  try {
    const blob = await fetch(videoUrl).then((r) => r.blob());
    // IndexedDB can hold larger blobs as data URLs — soft cap ~40MB
    if (blob.size < 40_000_000) {
      videoDataUrl = await blobUrlToDataUrl(videoUrl);
    }
  } catch {
    /* skip */
  }

  const item: LibraryItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    prompt,
    provider,
    videoDataUrl,
    coverDataUrl: meta?.coverDataUrl,
    hook: meta?.hook,
    aspectRatio: meta?.aspectRatio,
    durationSec: meta?.durationSec,
    captions: meta?.captions,
    createdAt: Date.now(),
    hasAudio,
    godMode: meta?.godMode,
  };

  try {
    await idbPut(item);
    // Cap store size
    const all = await idbGetAll();
    if (all.length > MAX_ITEMS) {
      for (const old of all.slice(MAX_ITEMS)) {
        await idbDelete(old.id);
      }
    }
  } catch (e) {
    console.warn('IDB put failed, falling back to localStorage', e);
    const next = [item, ...loadLibrary()].slice(0, 8);
    saveLibrary(next);
    return { id: item.id, items: next };
  }

  // Keep a tiny LS mirror for Dashboard sync stats
  saveLibrary(
    (await idbGetAll()).slice(0, 5).map(({ videoDataUrl: _v, ...rest }) => ({
      ...rest,
      videoDataUrl: undefined,
    }))
  );

  return { id: item.id, items: await idbGetAll() };
};

export const getLibraryItem = async (id: string): Promise<LibraryItem | null> => {
  const all = await idbGetAll();
  return all.find((i) => i.id === id) || null;
};

export const updateLibraryCaptions = async (id: string, captions: SocialCampaign) => {
  const all = await idbGetAll();
  const item = all.find((i) => i.id === id);
  if (!item) return;
  item.captions = captions;
  await idbPut(item);
};

/** Append publish outcomes to an item's ledger (which platforms, via which route). */
export const recordLibraryPublish = async (id: string, records: PublishRecord[]) => {
  if (!records.length) return;
  const all = await idbGetAll();
  const item = all.find((i) => i.id === id);
  if (!item) return;
  item.publishes = [...(item.publishes || []), ...records].slice(-20);
  await idbPut(item);
};

export const removeFromLibrary = (id: string): LibraryItem[] => {
  void idbDelete(id);
  const next = loadLibrary().filter((i) => i.id !== id);
  saveLibrary(next);
  return next;
};

export const removeFromLibraryAsync = async (id: string): Promise<LibraryItem[]> => {
  await idbDelete(id);
  return idbGetAll();
};

export const clearLibrary = () => {
  void idbClear();
  saveLibrary([]);
};

export const clearLibraryAsync = async () => {
  await idbClear();
  saveLibrary([]);
};

export const libraryStats = async () => {
  const items = await loadLibraryAsync();
  const withAudio = items.filter((i) => i.hasAudio).length;
  const god = items.filter((i) => i.godMode).length;
  const providers = items.reduce<Record<string, number>>((acc, i) => {
    acc[i.provider] = (acc[i.provider] || 0) + 1;
    return acc;
  }, {});
  const publishes = items.reduce((n, i) => n + (i.publishes?.length || 0), 0);
  const published = items.filter((i) => i.publishes?.length).length;
  return {
    total: items.length,
    withAudio,
    god,
    providers,
    publishes,
    published,
    recent: items.slice(0, 6),
  };
};
