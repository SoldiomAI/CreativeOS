import React, { useEffect, useState } from 'react';
import { libraryStats, LibraryItem } from '../services/libraryStore';
import { StudioSeed } from '../services/appFlow';
import { getGodModeEnabled } from '../services/godMode';
import { getMuapiKey } from '../services/muapiService';
import { getStoredHfToken } from '../services/hfVideoService';
import { getConnectorAvailability } from '../services/connectorService';
import { getGoogleOAuthClientId } from '../services/youtubeService';
import { generateViaYoutubeAgent, pingYoutubeAgent } from '../services/youtubeAgentService';
import { pingWan2gp } from '../services/wan2gpService';
import { getCredits, isPro } from '../services/creditsStore';
import { pingBillingApi } from '../services/paymentService';
import { AppTab } from '../types';

interface DashboardProps {
  onNavigate?: (tab: AppTab) => void;
  onStudioCreate?: (seed?: StudioSeed) => void;
  onStudioPublish?: (libraryItemId: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate, onStudioCreate, onStudioPublish }) => {
  const [total, setTotal] = useState(0);
  const [withAudio, setWithAudio] = useState(0);
  const [godCount, setGodCount] = useState(0);
  const [publishCount, setPublishCount] = useState(0);
  const [publishedItems, setPublishedItems] = useState(0);
  const [recent, setRecent] = useState<LibraryItem[]>([]);
  const [providers, setProviders] = useState<Record<string, number>>({});
  const [credits, setCredits] = useState(getCredits());
  const [billingOk, setBillingOk] = useState(false);
  const [ytAgentOk, setYtAgentOk] = useState(false);
  const [wangpOk, setWangpOk] = useState(false);
  const [agentBusy, setAgentBusy] = useState(false);
  const [agentNote, setAgentNote] = useState<string | null>(null);

  useEffect(() => {
    libraryStats().then((s) => {
      setTotal(s.total);
      setWithAudio(s.withAudio);
      setGodCount(s.god);
      setPublishCount(s.publishes);
      setPublishedItems(s.published);
      setRecent(s.recent);
      setProviders(s.providers);
    });
    pingBillingApi().then((h) => setBillingOk(h.ok && h.stripe));
    pingYoutubeAgent().then((h) => setYtAgentOk(h.ok && Boolean(h.initialized)));
    pingWan2gp().then((h) => setWangpOk(Boolean(h.ready)));
    setCredits(getCredits());
  }, []);

  const reach = getConnectorAvailability();
  const pipes = [
    { label: 'HF token', on: Boolean(getStoredHfToken()) },
    { label: 'MuAPI', on: Boolean(getMuapiKey()) },
    { label: 'YouTube OAuth', on: Boolean(getGoogleOAuthClientId()) },
    { label: 'Scheduler API', on: reach.scheduler },
    { label: 'MCP bridge', on: reach.mcp },
    { label: 'YouTube Agent', on: ytAgentOk },
    { label: 'Wan2GP GPU', on: wangpOk },
    { label: 'God Mode', on: getGodModeEnabled() },
    { label: 'Billing API', on: billingOk },
  ];

  const pipeline = [
    {
      title: 'Hook Foundry',
      blurb: 'Gemini concepts → Factory',
      tab: AppTab.STUDIO,
      action: () => onStudioCreate?.(),
    },
    {
      title: 'Still Lab',
      blurb: 'Edit/generate still → animate',
      tab: AppTab.STILLS,
      action: () => onNavigate?.(AppTab.STILLS),
    },
    {
      title: 'Factory',
      blurb: 'Prompt + images → movie + sound',
      tab: AppTab.STUDIO,
      action: () => onStudioCreate?.(),
    },
    {
      title: 'YouTube Agent',
      blurb: 'Autonomous 7-agent channel (Gemini)',
      tab: AppTab.SETTINGS,
      action: async () => {
        const topic =
          recent[0]?.prompt ||
          window.prompt('Topic for YouTube Automation Agent (short-form):') ||
          '';
        if (!topic.trim()) return;
        setAgentBusy(true);
        setAgentNote(null);
        try {
          const r = await generateViaYoutubeAgent({ topic: topic.trim(), length: 'short' });
          setAgentNote(`Agent queued: "${r.title}"${r.scheduledFor ? ` @ ${new Date(r.scheduledFor).toLocaleString()}` : ''}`);
        } catch (e: unknown) {
          setAgentNote(e instanceof Error ? e.message : 'Agent failed — is it running on :3456?');
        } finally {
          setAgentBusy(false);
        }
      },
    },
    {
      title: 'Caption Studio',
      blurb: 'Publish via API / scheduler / agent / CLI',
      tab: AppTab.STUDIO,
      action: () => {
        const latest = recent.find((r) => r.videoDataUrl);
        if (latest && onStudioPublish) onStudioPublish(latest.id);
        else onNavigate?.(AppTab.STUDIO);
      },
    },
  ];

  return (
    <div className="h-full overflow-y-auto cos-scroll p-1 space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-[11px] tracking-[0.35em] uppercase text-amber-200/70 mb-2">Command Center</p>
          <h2 className="cos-display text-4xl md:text-5xl text-[#f7f3ea]">Make the next drop.</h2>
          <p className="text-[#9aa8bc] mt-2 text-sm">
            Full pipeline connected — Still Lab → Factory → Library → Caption Studio → every publish route.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 self-start">
          <button type="button" onClick={() => onStudioCreate?.()} className="cos-btn-primary px-6 py-3 rounded-xl">
            New movie
          </button>
          <button
            type="button"
            onClick={() => onNavigate?.(AppTab.SETTINGS)}
            className="px-4 py-3 rounded-xl border border-white/10 text-sm text-white/70 hover:text-white"
          >
            {isPro() ? 'Pro' : `${credits.balance} credits`}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { k: 'Movies', v: String(total) },
          { k: 'With sound', v: String(withAudio) },
          { k: 'God cuts', v: String(godCount) },
          { k: 'Publish events', v: String(publishCount) },
          { k: 'Credits', v: isPro() ? 'PRO' : String(credits.balance) },
        ].map((s) => (
          <div key={s.k} className="cos-panel rounded-2xl p-4">
            <div className="text-[10px] uppercase tracking-[0.25em] text-white/40">{s.k}</div>
            <div className="cos-display text-3xl mt-2 text-amber-200">{s.v}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {pipeline.map((step) => (
          <button
            key={step.title}
            type="button"
            disabled={step.title === 'YouTube Agent' && agentBusy}
            onClick={step.action}
            className="cos-panel rounded-2xl p-4 text-left hover:border-amber-500/30 border border-transparent transition disabled:opacity-50"
          >
            <div className="text-[10px] uppercase tracking-wider text-amber-200/60 mb-1">{step.title}</div>
            <p className="text-sm text-[#9aa8bc]">{step.blurb}</p>
          </button>
        ))}
      </div>
      {agentNote && (
        <div className="cos-panel rounded-lg px-4 py-2 text-sm text-emerald-200">{agentNote}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 cos-panel rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="cos-display text-xl">Recent shelf</h3>
            <button
              type="button"
              className="text-xs text-amber-200/80 hover:underline"
              onClick={() => onNavigate?.(AppTab.LIBRARY)}
            >
              Full library ({publishedItems} published)
            </button>
          </div>
          {!recent.length ? (
            <p className="text-sm text-[#9aa8bc]">No movies yet — start in Factory or Still Lab.</p>
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
                  <div className="min-w-0 py-1 flex flex-col">
                    <p className="text-sm text-white line-clamp-2">{item.prompt}</p>
                    <p className="text-[11px] font-mono text-white/40 mt-1">
                      {item.provider}
                      {item.godMode ? ' · GOD' : ''}
                      {item.publishes?.length ? ` · ${item.publishes.length} publishes` : ''}
                    </p>
                    {item.videoDataUrl && onStudioPublish && (
                      <button
                        type="button"
                        onClick={() => onStudioPublish(item.id)}
                        className="mt-auto self-start text-[11px] text-cyan-400 hover:underline"
                      >
                        Publish →
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="cos-panel rounded-2xl p-5 space-y-4">
          <h3 className="cos-display text-xl">Pipeline status</h3>
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
