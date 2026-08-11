import React, { useEffect, useState } from 'react';
import { AssetRecord, AssetType, listAssets, stripMarkdown } from '../services/library';
import { isDemoMode, getProviderId, navigateTo } from '../services/config';
import { useI18n, TranslationKey } from '../i18n';

interface StatDef {
  type: AssetType;
  labelKey: TranslationKey;
  accent: string;
}

const STATS: StatDef[] = [
  { type: 'text', labelKey: 'library.text', accent: 'text-blue-400' },
  { type: 'image', labelKey: 'library.image', accent: 'text-cyan-400' },
  { type: 'audio', labelKey: 'library.audio', accent: 'text-purple-400' },
  { type: 'video', labelKey: 'library.video', accent: 'text-indigo-400' },
];

interface QuickAction {
  tool: 'write' | 'design' | 'voice' | 'video';
  labelKey: TranslationKey;
  descKey: TranslationKey;
  accent: string;
}

const ACTIONS: QuickAction[] = [
  { tool: 'write', labelKey: 'tool.write', descKey: 'tool.write.desc', accent: 'from-blue-600 to-cyan-500' },
  { tool: 'design', labelKey: 'tool.design', descKey: 'tool.design.desc', accent: 'from-cyan-600 to-teal-500' },
  { tool: 'voice', labelKey: 'tool.voice', descKey: 'tool.voice.desc', accent: 'from-purple-600 to-blue-500' },
  { tool: 'video', labelKey: 'tool.video', descKey: 'tool.video.desc', accent: 'from-blue-600 to-indigo-500' },
];

const openTool = (tool: QuickAction['tool']) => {
  // Persist the choice: StudioHub is lazy-loaded, so its event listener may not
  // be attached yet on first navigation. It reads this key on mount.
  try { sessionStorage.setItem('creativeos.pendingTool', tool); } catch { /* non-blocking */ }
  navigateTo('STUDIO');
  window.dispatchEvent(new CustomEvent('creativeos:studio-tool', { detail: tool }));
};

const Thumb: React.FC<{ asset: AssetRecord; url: string | null }> = ({ asset, url }) => (
  <button
    onClick={() => navigateTo('LIBRARY')}
    className="w-28 h-28 shrink-0 rounded-xl overflow-hidden bg-gray-900 border border-gray-700 hover:border-gray-500 transition relative group"
    title={asset.prompt}
    aria-label={asset.prompt || asset.type}
  >
    {asset.type === 'image' && url && <img src={url} alt={asset.prompt} className="w-full h-full object-cover" />}
    {asset.type === 'video' && url && <video src={url} muted className="w-full h-full object-cover" />}
    {asset.type === 'audio' && (
      <div className="w-full h-full flex items-center justify-center">
        <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z"></path></svg>
      </div>
    )}
    {asset.type === 'text' && (
      <p className="p-2 text-[10px] text-gray-400 line-clamp-5 text-left rtl:text-right whitespace-pre-wrap">
        {typeof asset.data === 'string' ? stripMarkdown(asset.data) : ''}
      </p>
    )}
    <span className="absolute bottom-1 left-1 rtl:left-auto rtl:right-1 text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-gray-950/80 text-gray-300">
      {asset.type}
    </span>
  </button>
);

const Dashboard: React.FC = () => {
  const { t } = useI18n();
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [demo, setDemo] = useState(isDemoMode());

  const refresh = async () => {
    const list = await listAssets();
    setAssets(list);
    setUrls((prev) => {
      const next: Record<string, string> = {};
      for (const a of list.slice(0, 8)) {
        if (typeof a.data !== 'string') {
          next[a.id] = prev[a.id] ?? URL.createObjectURL(a.data);
        }
      }
      return next;
    });
  };

  useEffect(() => {
    refresh();
    const onLib = () => refresh();
    const onCfg = () => setDemo(isDemoMode());
    window.addEventListener('creativeos:library-changed', onLib);
    window.addEventListener('creativeos:config-changed', onCfg);
    return () => {
      window.removeEventListener('creativeos:library-changed', onLib);
      window.removeEventListener('creativeos:config-changed', onCfg);
    };
  }, []);

  const counts = STATS.map((s) => assets.filter((a) => a.type === s.type).length);
  const recent = assets.slice(0, 8);
  const providerLabel = demo ? t('dash.demo') : getProviderId() === 'openai' ? 'OpenAI' : 'Gemini';

  return (
    <div className="h-full flex flex-col gap-6 overflow-y-auto p-1">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight">{t('dash.title')}</h2>
          <p className="text-gray-400 text-sm">{t('dash.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-mono border ${
            demo
              ? 'bg-amber-900/30 text-amber-400 border-amber-800'
              : 'bg-green-900/30 text-green-400 border-green-800'
          }`}>
            {t('dash.provider')}: {providerLabel}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-gray-800/50 border border-gray-700 p-4 rounded-lg backdrop-blur-sm">
          <h3 className="text-gray-400 text-xs font-mono uppercase tracking-widest mb-1">{t('dash.total')}</h3>
          <span className="text-2xl font-bold text-white">{assets.length}</span>
        </div>
        {STATS.map((s, i) => (
          <div key={s.type} className="bg-gray-800/50 border border-gray-700 p-4 rounded-lg backdrop-blur-sm">
            <h3 className="text-gray-400 text-xs font-mono uppercase tracking-widest mb-1">{t(s.labelKey)}</h3>
            <span className={`text-2xl font-bold ${s.accent}`}>{counts[i]}</span>
          </div>
        ))}
      </div>

      {/* Quick create */}
      <div>
        <h3 className="text-white font-bold mb-3">{t('dash.quickActions')}</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {ACTIONS.map((a) => (
            <button
              key={a.tool}
              onClick={() => openTool(a.tool)}
              className="group bg-gray-800/50 border border-gray-700 hover:border-gray-500 rounded-xl p-4 text-left rtl:text-right transition hover:bg-gray-800"
            >
              <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${a.accent} mb-3 flex items-center justify-center text-white text-lg font-bold shadow`}>
                +
              </div>
              <p className="text-white font-semibold text-sm">{t(a.labelKey)}</p>
              <p className="text-gray-500 text-xs mt-0.5">{t(a.descKey)}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Recent assets */}
      <div className="flex-grow">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-bold">{t('dash.recent')}</h3>
          {assets.length > 0 && (
            <button onClick={() => navigateTo('LIBRARY')} className="text-blue-400 hover:text-blue-300 text-sm transition">
              {t('dash.viewAll')} <span className="inline-block rtl:rotate-180">→</span>
            </button>
          )}
        </div>
        {recent.length === 0 ? (
          <div className="border border-dashed border-gray-700 rounded-xl p-10 flex flex-col items-center gap-4 text-center">
            <p className="text-gray-500 text-sm">{t('dash.empty')}</p>
            <button
              onClick={() => navigateTo('STUDIO')}
              className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold px-5 py-2.5 rounded-lg transition"
            >
              {t('dash.openStudio')}
            </button>
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-2">
            {recent.map((a) => (
              <Thumb key={a.id} asset={a} url={urls[a.id] ?? null} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
