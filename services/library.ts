// Client-side persistent asset library backed by IndexedDB (via `idb`).
import { openDB, DBSchema, IDBPDatabase } from 'idb';

export type AssetType = 'text' | 'image' | 'audio' | 'video';

export interface AssetRecord {
  id: string;
  type: AssetType;
  prompt: string;
  model: string;
  createdAt: number;
  /** Plain string for text assets; Blob for binary assets */
  data: string | Blob;
  mime: string;
  projectTopic?: string;
}

interface CreativeOsDB extends DBSchema {
  assets: {
    key: string;
    value: AssetRecord;
    indexes: { 'by-createdAt': number; 'by-type': string };
  };
}

let dbPromise: Promise<IDBPDatabase<CreativeOsDB>> | null = null;

/** Strips common markdown syntax so text previews read as plain text. */
export const stripMarkdown = (text: string): string =>
  text
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^[-*]\s+/gm, '• ');

const getDb = (): Promise<IDBPDatabase<CreativeOsDB>> => {
  if (!dbPromise) {
    dbPromise = openDB<CreativeOsDB>('creativeos', 1, {
      upgrade(db) {
        const store = db.createObjectStore('assets', { keyPath: 'id' });
        store.createIndex('by-createdAt', 'createdAt');
        store.createIndex('by-type', 'type');
      },
    });
  }
  return dbPromise;
};

export const saveAsset = async (
  asset: Omit<AssetRecord, 'id' | 'createdAt'> & { id?: string }
): Promise<AssetRecord> => {
  const record: AssetRecord = {
    ...asset,
    id: asset.id ?? (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`),
    createdAt: Date.now(),
  };
  const db = await getDb();
  await db.put('assets', record);
  window.dispatchEvent(new CustomEvent('creativeos:library-changed'));
  return record;
};

export const listAssets = async (type?: AssetType): Promise<AssetRecord[]> => {
  const db = await getDb();
  const all = await db.getAllFromIndex('assets', 'by-createdAt');
  const sorted = all.reverse();
  return type ? sorted.filter((a) => a.type === type) : sorted;
};

export const getAsset = async (id: string): Promise<AssetRecord | undefined> => {
  const db = await getDb();
  return db.get('assets', id);
};

export const deleteAsset = async (id: string): Promise<void> => {
  const db = await getDb();
  await db.delete('assets', id);
  window.dispatchEvent(new CustomEvent('creativeos:library-changed'));
};

/** Fetch a data: or blob: URL into a Blob for durable storage. */
export const urlToBlob = async (url: string): Promise<Blob> => {
  const res = await fetch(url);
  return res.blob();
};

export const assetObjectUrl = (asset: AssetRecord): string | null => {
  if (typeof asset.data === 'string') return null;
  return URL.createObjectURL(asset.data);
};
