import React, { useEffect, useState } from 'react';
import { libraryStats, LibraryItem } from '../services/libraryStore';
import { getGodModeEnabled } from '../services/godMode';
import { getMuapiKey } from '../services/muapiService';
import { getStoredHfToken } from '../services/hfVideoService';
import { AppTab } from '../types';

interface DashboardProps {
  onNavigate?: (tab: AppTab) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [total, setTotal] = useState(0);
  const [withAudio, setWithAudio] = useState(0);
  const [godCount, setGodCount] = useState(0);
  const [recent, setRecent] = useState<LibraryItem[]>([]);
  const [providers, setProviders] = useState<Record<string, number>>({});

  useEffect(() => {
    libraryStats().then((s) => {
      setTotal(s.total);
      setWithAudio(s.withAudio);
      setGodCount(s.god);
      setRecent(s.recent);
      setProviders(s.providers);
    });
  }, []);

  const pipes = [
    { label: 'HF token', on: Boolean(getStoredHfToken()) },
    { label: 'MuAPI', on: Boolean(getMuapiKey()) },
    { label: 'God Mode', on: getGodModeEnabled() },
  ];

  return (
    <div className="h-full overflow-y-auto cos-scroll p-1 space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-[11px] tracking-[0.35em] uppercase text-amber-200/70 mb-2">Command Center</p>
          <h2 className="cos-display text-4xl md:text-5xl text-[#f7f3ea]">Make the next drop.</h2>
          <p className="text-[#9aa8bc] mt-2 text-sm">Live library + pipeline status — no fake KPIs.</p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate?.(AppTab.STUDIO)}
          className="cos-btn-primary px-6 py-3 rounded-xl self-start"
        >
          Open Factory
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { k: 'Movies', v: String(total) },
          { k: 'With sound', v: String(withAudio) },
          { k: 'God Mode cuts', v: String(godCount) },
          { k: 'Providers used', v: String(Object.keys(providers).length) },
        ].map((s) => (
          <div key={s.k} className="cos-panel rounded-2xl p-4">
            <div className="text-[10px] uppercase tracking-[0.25em] text-white/40">{s.k}</div>
            <div className="cos-display text-3xl mt-2 text-amber-200">{s.v}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 cos-panel rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="cos-display text-xl">Recent shelf</h3>
            <button
              type="button"
              className="text-xs text-amber-200/80 hover:underline"
              onClick={() => onNavigate?.(AppTab.LIBRARY)}
            >
              Full library
            </button>
          </div>
          {!recent.length ? (
            <p className="text-sm text-[#9aa8bc]">No movies yet — hit Factory and cook.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {recent.map((item) => (
                <div key={item.id} className="flex gap-3 rounded-xl border border-white/5 bg-black/20 p-2">
                  <div className="w-16 h-24 rounded-lg overflow-hidden bg-black shrink-0">
                    {item.coverDataUrl || item.videoDataUrl ? (
                      item.coverDataUrl ? (
                        <img src={item.coverDataUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <video src={item.videoDataUrl} className="w-full h-full object-cover" muted />
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[9px] text-white/30">
                        n/a
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 py-1">
                    <p className="text-sm text-white line-clamp-2">{item.prompt}</p>
                    <p className="text-[11px] font-mono text-white/40 mt-2">
                      {item.provider}
                      {item.godMode ? ' · GOD' : ''}
                      {item.hasAudio ? ' · audio' : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="cos-panel rounded-2xl p-5 space-y-4">
          <h3 className="cos-display text-xl">Pipeline</h3>
          {pipes.map((p) => (
            <div key={p.label} className="flex items-center justify-between text-sm">
              <span className="text-[#9aa8bc]">{p.label}</span>
              <span className={p.on ? 'text-mintx' : 'text-white/30'}>{p.on ? 'ON' : 'OFF'}</span>
            </div>
          ))}
          <div className="pt-2 border-t border-white/10">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/35 mb-2">Top providers</p>
            {Object.keys(providers).length === 0 ? (
              <p className="text-xs text-[#9aa8bc]">—</p>
            ) : (
              Object.entries(providers)
                .sort((a, b) => Number(b[1]) - Number(a[1]))
                .slice(0, 5)
                .map(([name, count]) => (
                  <div key={name} className="flex justify-between text-xs text-[#9aa8bc] py-1">
                    <span>{name}</span>
                    <span className="font-mono text-amber-200/80">{count}</span>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
