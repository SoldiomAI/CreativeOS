import React, { useEffect, useState } from 'react';
import { clearLibrary, loadLibrary, LibraryItem, removeFromLibrary } from '../services/libraryStore';

const Library: React.FC = () => {
  const [items, setItems] = useState<LibraryItem[]>([]);

  useEffect(() => {
    setItems(loadLibrary());
  }, []);

  if (!items.length) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center px-6">
        <p className="text-white text-lg font-semibold mb-2">Asset Library</p>
        <p className="text-gray-400 text-sm max-w-md">
          Movies you create in Factory Studio are saved here (when small enough for browser storage).
          Generate one with Prompt → Movie to fill the shelf.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-1 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Asset Library</h2>
          <p className="text-gray-400 text-sm">{items.length} saved movie{items.length === 1 ? '' : 's'}</p>
        </div>
        <button
          onClick={() => {
            clearLibrary();
            setItems([]);
          }}
          className="text-xs text-gray-400 hover:text-red-400 underline"
        >
          Clear all
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map((item) => (
          <div key={item.id} className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
            <div className="aspect-[9/16] bg-black">
              {item.videoDataUrl ? (
                <video src={item.videoDataUrl} controls className="w-full h-full object-cover" />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500 text-xs p-4 text-center">
                  Preview unavailable (file too large to persist). Re-create from Studio.
                </div>
              )}
            </div>
            <div className="p-3 space-y-2">
              <p className="text-sm text-white line-clamp-2">{item.prompt}</p>
              <div className="flex items-center justify-between text-[11px] font-mono text-gray-500">
                <span>{item.provider}{item.hasAudio ? ' · audio' : ''}</span>
                <span>{new Date(item.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex gap-2">
                {item.videoDataUrl && (
                  <a
                    href={item.videoDataUrl}
                    download={`creativeos-${item.id}.webm`}
                    className="flex-1 text-center py-2 rounded-lg bg-cyan-700/40 text-cyan-300 text-xs font-semibold hover:bg-cyan-700/60"
                  >
                    Download
                  </a>
                )}
                <button
                  onClick={() => setItems(removeFromLibrary(item.id))}
                  className="px-3 py-2 rounded-lg border border-gray-700 text-xs text-gray-400 hover:text-red-300"
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
