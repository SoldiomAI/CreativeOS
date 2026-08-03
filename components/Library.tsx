import React, { useEffect, useState } from 'react';
import {
  clearLibraryAsync,
  loadLibraryAsync,
  LibraryItem,
  removeFromLibraryAsync,
} from '../services/libraryStore';
import { downloadCover } from '../services/coverFrame';
import { formatCaptionWithTags } from '../services/socialExport';

const Library: React.FC = () => {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    setItems(await loadLibraryAsync());
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, []);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-[#9aa8bc] text-sm">Loading library…</div>
    );
  }

  if (!items.length) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-6">
        <p className="cos-display text-3xl text-white mb-3">Asset Library</p>
        <p className="text-[#9aa8bc] text-sm max-w-md">
          Movies land here in IndexedDB (bigger than localStorage). Create one in Factory Studio.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto cos-scroll p-1 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="cos-display text-3xl text-white">Asset Library</h2>
          <p className="text-[#9aa8bc] text-sm">{items.length} saved</p>
        </div>
        <button
          onClick={async () => {
            await clearLibraryAsync();
            setItems([]);
          }}
          className="text-xs text-white/40 hover:text-rose-300 underline"
        >
          Clear all
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map((item) => (
          <div key={item.id} className="cos-panel rounded-2xl overflow-hidden">
            <div className="aspect-[9/16] bg-black relative">
              {item.videoDataUrl ? (
                <video src={item.videoDataUrl} controls className="w-full h-full object-cover" />
              ) : item.coverDataUrl ? (
                <img src={item.coverDataUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="h-full flex items-center justify-center text-white/30 text-xs p-4 text-center">
                  Preview unavailable
                </div>
              )}
              {item.godMode && (
                <span className="absolute top-2 left-2 text-[10px] tracking-widest uppercase bg-amber-500 text-ink px-2 py-1 rounded font-bold">
                  God
                </span>
              )}
            </div>
            <div className="p-3 space-y-2">
              {item.hook && <p className="text-amber-200/90 text-xs italic line-clamp-1">“{item.hook}”</p>}
              <p className="text-sm text-white line-clamp-2">{item.prompt}</p>
              <div className="flex items-center justify-between text-[11px] font-mono text-white/40">
                <span>
                  {item.provider}
                  {item.hasAudio ? ' · audio' : ''}
                  {item.aspectRatio ? ` · ${item.aspectRatio}` : ''}
                </span>
                <span>{new Date(item.createdAt).toLocaleString()}</span>
              </div>
              {item.captions?.tiktok && (
                <p className="text-[11px] text-white/45 line-clamp-2">
                  {formatCaptionWithTags(item.captions.tiktok)}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {item.videoDataUrl && (
                  <a
                    href={item.videoDataUrl}
                    download={`creativeos-${item.id}.webm`}
                    className="flex-1 text-center py-2 rounded-lg bg-amber-500/20 text-amber-100 text-xs font-semibold hover:bg-amber-500/30"
                  >
                    Download
                  </a>
                )}
                {item.coverDataUrl && (
                  <button
                    type="button"
                    onClick={async () => {
                      const blob = await fetch(item.coverDataUrl!).then((r) => r.blob());
                      downloadCover(blob, `creativeos-${item.id}-cover.jpg`);
                    }}
                    className="px-3 py-2 rounded-lg border border-white/10 text-xs text-white/70 hover:text-white"
                  >
                    Cover
                  </button>
                )}
                <button
                  onClick={async () => setItems(await removeFromLibraryAsync(item.id))}
                  className="px-3 py-2 rounded-lg border border-white/10 text-xs text-white/40 hover:text-rose-300"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Library;
