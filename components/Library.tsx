import React, { useEffect, useState } from 'react';
import { AssetRecord, AssetType, listAssets, deleteAsset } from '../services/library';
import { useI18n, TranslationKey } from '../i18n';

type Filter = 'all' | AssetType;

const FILTERS: { id: Filter; labelKey: TranslationKey }[] = [
  { id: 'all', labelKey: 'library.all' },
  { id: 'text', labelKey: 'library.text' },
  { id: 'image', labelKey: 'library.image' },
  { id: 'audio', labelKey: 'library.audio' },
  { id: 'video', labelKey: 'library.video' },
];

const typeBadge: Record<AssetType, string> = {
  text: 'bg-blue-900/40 text-blue-300 border-blue-800',
  image: 'bg-cyan-900/40 text-cyan-300 border-cyan-800',
  audio: 'bg-purple-900/40 text-purple-300 border-purple-800',
  video: 'bg-indigo-900/40 text-indigo-300 border-indigo-800',
};

const extFor = (asset: AssetRecord): string => {
  if (asset.type === 'text') return 'txt';
  if (asset.mime.includes('wav')) return 'wav';
  if (asset.mime.includes('webm')) return 'webm';
  if (asset.mime.includes('png')) return 'png';
  if (asset.mime.includes('mp4')) return 'mp4';
  return 'jpg';
};

interface CardProps {
  asset: AssetRecord;
  url: string | null;
  onOpen: () => void;
  onDelete: () => void;
  t: (key: TranslationKey) => string;
}

const AssetCard: React.FC<CardProps> = ({ asset, url, onOpen, onDelete, t }) => (
  <div className="bg-gray-800/50 border border-gray-700 rounded-xl overflow-hidden flex flex-col group hover:border-gray-500 transition">
    <button onClick={onOpen} className="aspect-square bg-gray-900 flex items-center justify-center overflow-hidden relative">
      {asset.type === 'image' && url && <img src={url} alt={asset.prompt} className="w-full h-full object-cover" />}
      {asset.type === 'video' && url && <video src={url} muted className="w-full h-full object-cover" />}
      {asset.type === 'audio' && (
        <svg className="w-12 h-12 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z"></path></svg>
      )}
      {asset.type === 'text' && (
        <p className="p-4 text-xs text-gray-400 line-clamp-6 text-left rtl:text-right whitespace-pre-wrap">
          {typeof asset.data === 'string' ? asset.data : ''}
        </p>
      )}
    </button>
    <div className="p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded border ${typeBadge[asset.type]}`}>{asset.type}</span>
        <span className="text-[10px] text-gray-500 font-mono">{new Date(asset.createdAt).toLocaleDateString()}</span>
      </div>
      <p className="text-xs text-gray-400 line-clamp-2" title={asset.prompt}>{asset.prompt || '—'}</p>
      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition">
        <button
          onClick={onDelete}
          className="text-[11px] px-2 py-1 rounded border border-red-900 text-red-400 hover:bg-red-900/30 transition"
        >
          {t('library.delete')}
        </button>
      </div>
    </div>
  </div>
);

const Library: React.FC = () => {
  const { t } = useI18n();
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<AssetRecord | null>(null);

  const refresh = async () => {
    const list = await listAssets(filter === 'all' ? undefined : filter);
    setAssets(list);
    setUrls((prev) => {
      const next: Record<string, string> = {};
      for (const a of list) {
        if (typeof a.data !== 'string') {
          next[a.id] = prev[a.id] ?? URL.createObjectURL(a.data);
        }
      }
      return next;
    });
  };

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener('creativeos:library-changed', handler);
    return () => window.removeEventListener('creativeos:library-changed', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const handleDelete = async (id: string) => {
    await deleteAsset(id);
    if (selected?.id === id) setSelected(null);
  };

  const handleDownload = (asset: AssetRecord) => {
    const a = document.createElement('a');
    if (typeof asset.data === 'string') {
      a.href = URL.createObjectURL(new Blob([asset.data], { type: 'text/plain' }));
    } else {
      a.href = urls[asset.id];
    }
    a.download = `creativeos-${asset.type}-${asset.id.slice(0, 8)}.${extFor(asset)}`;
    a.click();
  };

  return (
    <div className="h-full flex flex-col animate-fade-in overflow-hidden">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">{t('library.title')}</h2>
          <p className="text-gray-400 text-sm">{t('library.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                filter === f.id
                  ? 'bg-blue-600/10 text-blue-400 border-blue-900'
                  : 'border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'
              }`}
            >
              {t(f.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {assets.length === 0 ? (
        <div className="flex-grow flex items-center justify-center text-gray-500 text-sm">
          {t('library.empty')}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 overflow-y-auto pb-6">
          {assets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              url={urls[asset.id] ?? null}
              onOpen={() => setSelected(asset)}
              onDelete={() => handleDelete(asset.id)}
              t={t}
            />
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6" onClick={() => setSelected(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-800 flex items-center justify-between">
              <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded border ${typeBadge[selected.type]}`}>{selected.type} · {selected.model}</span>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-white text-sm">{t('library.close')} ✕</button>
            </div>
            <div className="p-6 overflow-y-auto flex-grow flex items-center justify-center">
              {selected.type === 'image' && urls[selected.id] && <img src={urls[selected.id]} alt={selected.prompt} className="max-h-[55vh] rounded-lg" />}
              {selected.type === 'video' && urls[selected.id] && <video src={urls[selected.id]} controls autoPlay loop className="max-h-[55vh] rounded-lg" />}
              {selected.type === 'audio' && urls[selected.id] && <audio src={urls[selected.id]} controls className="w-full" />}
              {selected.type === 'text' && (
                <pre className="whitespace-pre-wrap text-sm text-gray-300 font-sans w-full">{typeof selected.data === 'string' ? selected.data : ''}</pre>
              )}
            </div>
            <div className="p-4 border-t border-gray-800 flex items-center justify-between gap-3">
              <p className="text-xs text-gray-500 line-clamp-1" title={selected.prompt}>{selected.prompt}</p>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => handleDownload(selected)} className="text-xs px-3 py-1.5 rounded border border-gray-600 text-gray-300 hover:text-white transition">{t('library.download')}</button>
                <button onClick={() => handleDelete(selected.id)} className="text-xs px-3 py-1.5 rounded border border-red-900 text-red-400 hover:bg-red-900/30 transition">{t('library.delete')}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Library;
