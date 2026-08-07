import React, { useEffect, useState } from 'react';
import LandingPage from './components/LandingPage';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Studio from './components/Studio';
import Library from './components/Library';
import EditorTool from './components/EditorTool';
import { getStoredHfToken, setStoredHfToken } from './services/hfVideoService';
import {
  getComfyCheckpoint,
  getComfyUrl,
  pingComfyUi,
  setComfyCheckpoint,
  setComfyUrl,
} from './services/comfyService';
import {
  getDuixAvatarVideoPath,
  getDuixRefAudio,
  getDuixRefText,
  getDuixVideoApi,
  getDuixVoiceApi,
  setDuixAvatarVideoPath,
  setDuixRefAudio,
  setDuixRefText,
  setDuixVideoApi,
  setDuixVoiceApi,
} from './services/duixService';
import {
  getMuapiI2vEndpoint,
  getMuapiKey,
  getMuapiT2vEndpoint,
  setMuapiI2vEndpoint,
  setMuapiKey,
  setMuapiT2vEndpoint,
} from './services/muapiService';
import {
  getGoogleOAuthClientId,
  getYoutubePrivacy,
  setGoogleOAuthClientId,
  setYoutubePrivacy,
  YoutubePrivacy,
} from './services/youtubeService';
import {
  getPostizApiKey,
  getPostizBaseUrl,
  getReachWebhookAuth,
  getReachWebhookUrl,
  setPostizApiKey,
  setPostizBaseUrl,
  setReachWebhookAuth,
  setReachWebhookUrl,
} from './services/connectorService';
import { setDistributeSeed, setStudioSeed } from './services/appFlow';
import { handleBillingReturn } from './services/paymentService';
import {
  getYoutubeAgentApiKey,
  getYoutubeAgentUrl,
  pingYoutubeAgent,
  setYoutubeAgentApiKey,
  setYoutubeAgentUrl,
} from './services/youtubeAgentService';
import {
  getWan2gpModelType,
  getWan2gpSettingsJson,
  pingWan2gp,
  setWan2gpModelType,
  setWan2gpSettingsJson,
} from './services/wan2gpService';
import BillingPanel from './components/BillingPanel';
import { AppTab } from './types';

export default function App() {
  const [hasStarted, setHasStarted] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.STUDIO);
  const [hfToken, setHfToken] = useState(getStoredHfToken());
  const [googleClientId, setGoogleClientIdState] = useState(getGoogleOAuthClientId());
  const [ytPrivacy, setYtPrivacyState] = useState<YoutubePrivacy>(getYoutubePrivacy());
  const [muapiKey, setMuapiKeyState] = useState(getMuapiKey());
  const [muapiT2v, setMuapiT2vState] = useState(getMuapiT2vEndpoint());
  const [muapiI2v, setMuapiI2vState] = useState(getMuapiI2vEndpoint());
  const [comfyUrl, setComfyUrlState] = useState(getComfyUrl());
  const [comfyCkpt, setComfyCkptState] = useState(getComfyCheckpoint());
  const [comfyStatus, setComfyStatus] = useState<'unknown' | 'up' | 'down'>('unknown');
  const [duixVideo, setDuixVideoState] = useState(getDuixVideoApi());
  const [duixVoice, setDuixVoiceState] = useState(getDuixVoiceApi());
  const [duixAvatar, setDuixAvatarState] = useState(getDuixAvatarVideoPath());
  const [duixRefAudio, setDuixRefAudioState] = useState(getDuixRefAudio());
  const [duixRefText, setDuixRefTextState] = useState(getDuixRefText());
  const [postizBase, setPostizBaseState] = useState(getPostizBaseUrl());
  const [postizKey, setPostizKeyState] = useState(getPostizApiKey());
  const [reachWebhook, setReachWebhookState] = useState(getReachWebhookUrl());
  const [reachWebhookAuth, setReachWebhookAuthState] = useState(getReachWebhookAuth());
  const [ytAgentUrl, setYtAgentUrlState] = useState(getYoutubeAgentUrl());
  const [ytAgentKey, setYtAgentKeyState] = useState(getYoutubeAgentApiKey());
  const [ytAgentStatus, setYtAgentStatus] = useState<'unknown' | 'up' | 'down'>('unknown');
  const [wangpModel, setWangpModelState] = useState(getWan2gpModelType());
  const [wangpSettings, setWangpSettingsState] = useState(getWan2gpSettingsJson());
  const [wangpStatus, setWangpStatus] = useState<'unknown' | 'up' | 'down'>('unknown');
  const [studioSessionKey, setStudioSessionKey] = useState(0);
  const [billingNotice, setBillingNotice] = useState<string | null>(null);

  const goTab = (tab: AppTab) => setActiveTab(tab);

  const goStudioCreate = (seed?: Parameters<typeof setStudioSeed>[0]) => {
    if (seed) setStudioSeed(seed);
    setStudioSessionKey((k) => k + 1);
    setActiveTab(AppTab.STUDIO);
  };

  const goStudioPublish = (libraryItemId: string) => {
    setDistributeSeed({ libraryItemId });
    setStudioSessionKey((k) => k + 1);
    setActiveTab(AppTab.STUDIO);
  };

  useEffect(() => {
    if (activeTab !== AppTab.SETTINGS) return;
    pingComfyUi()
      .then((up) => setComfyStatus(up ? 'up' : 'down'))
      .catch(() => setComfyStatus('down'));
    pingYoutubeAgent()
      .then((h) => setYtAgentStatus(h.ok && h.initialized ? 'up' : h.ok ? 'down' : 'down'))
      .catch(() => setYtAgentStatus('down'));
    pingWan2gp()
      .then((h) => setWangpStatus(h.ready ? 'up' : h.ok ? 'down' : 'down'))
      .catch(() => setWangpStatus('down'));
  }, [activeTab, comfyUrl, ytAgentUrl, wangpModel]);

  useEffect(() => {
    void handleBillingReturn().then((result) => {
      if (result === 'success') {
        setBillingNotice('Payment successful — credits updated.');
        setActiveTab(AppTab.SETTINGS);
      } else if (result === 'cancel') {
        setBillingNotice('Checkout cancelled.');
      }
    });
  }, []);

  if (!hasStarted) {
    return <LandingPage onGetStarted={() => setHasStarted(true)} />;
  }

  return (
    <div className="flex h-screen cos-app-shell text-white overflow-hidden font-body">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-grow p-4 md:p-6 overflow-hidden relative cos-grain">
        <div className="relative z-10 h-full">
          {billingNotice && (
            <div className="mb-3 cos-panel rounded-lg px-4 py-2 text-sm text-emerald-200 flex justify-between items-center">
              <span>{billingNotice}</span>
              <button type="button" className="text-white/50 hover:text-white" onClick={() => setBillingNotice(null)}>
                ×
              </button>
            </div>
          )}
          {activeTab === AppTab.DASHBOARD && (
            <Dashboard onNavigate={goTab} onStudioCreate={goStudioCreate} onStudioPublish={goStudioPublish} />
          )}
          {activeTab === AppTab.STUDIO && <Studio key={studioSessionKey} />}
          {activeTab === AppTab.STILLS && (
            <EditorTool
              onAnimate={(image, promptText) =>
                goStudioCreate({ prompt: promptText, images: [image], hook: promptText.slice(0, 120) })
              }
              onPublishVideo={goStudioPublish}
            />
          )}
          {activeTab === AppTab.LIBRARY && (
            <Library onStudioCreate={goStudioCreate} onStudioPublish={goStudioPublish} />
          )}
          {activeTab === AppTab.SETTINGS && (
            <div className="max-w-2xl mx-auto h-full overflow-y-auto flex flex-col gap-6 p-4 pb-10">
              <div>
                <h2 className="text-2xl font-bold text-white">Connections</h2>
                <p className="text-xs text-gray-500 mt-1">
                  App URL: <span className="text-cyan-400">http://localhost:5173</span> (Antigravity
                  keeps :3000)
                </p>
              </div>

              <BillingPanel onNotice={setBillingNotice} />

              <section className="space-y-3 border border-gray-700 rounded-xl p-4 bg-gray-800/40">
                <h3 className="text-white font-semibold">Google / YouTube (real publish)</h3>
                <p className="text-gray-400 text-sm">
                  OAuth Web Client ID from Google Cloud Console. Enable{' '}
                  <span className="text-gray-200">YouTube Data API v3</span>. Authorized JavaScript origin:{' '}
                  <span className="text-amber-200">http://localhost:5173</span>
                </p>
                <label className="block text-xs text-gray-500 font-mono uppercase">OAuth client ID</label>
                <input
                  value={googleClientId}
                  onChange={(e) => {
                    setGoogleClientIdState(e.target.value);
                    setGoogleOAuthClientId(e.target.value);
                  }}
                  placeholder="xxxxx.apps.googleusercontent.com"
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                />
                <label className="block text-xs text-gray-500 font-mono uppercase">
                  Default privacy (when not scheduling)
                </label>
                <select
                  value={ytPrivacy}
                  onChange={(e) => {
                    const v = e.target.value as YoutubePrivacy;
                    setYtPrivacyState(v);
                    setYoutubePrivacy(v);
                  }}
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                >
                  <option value="unlisted">Unlisted</option>
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
                <p className="text-xs text-gray-500">
                  Future schedule date/time → YouTube private until publishAt (real schedule). Gemini still
                  writes captions via GEMINI_API_KEY.
                </p>
              </section>

              <section className="space-y-3 border border-gray-700 rounded-xl p-4 bg-gray-800/40">
                <h3 className="text-white font-semibold">Agent Reach — publish connectors</h3>
                <p className="text-gray-400 text-sm">
                  Publishing always has a route: direct API → scheduler API → MCP/webhook → share sheet →
                  CLI script / manual. Configure any (or none) — unconfigured routes are skipped and the
                  next fallback is used.
                </p>

                <label className="block text-xs text-gray-500 font-mono uppercase">
                  Scheduler API base URL (Postiz-compatible,{' '}
                  <a
                    className="text-cyan-400 underline normal-case"
                    href="https://github.com/gitroomhq/postiz-app"
                    target="_blank"
                    rel="noreferrer"
                  >
                    self-hostable
                  </a>
                  )
                </label>
                <input
                  value={postizBase}
                  onChange={(e) => {
                    setPostizBaseState(e.target.value);
                    setPostizBaseUrl(e.target.value);
                  }}
                  placeholder="https://api.postiz.com or http://localhost:3000/api"
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                />
                <label className="block text-xs text-gray-500 font-mono uppercase">Scheduler API key</label>
                <input
                  type="password"
                  value={postizKey}
                  onChange={(e) => {
                    setPostizKeyState(e.target.value);
                    setPostizApiKey(e.target.value);
                  }}
                  placeholder="Postiz public API key"
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                />
                <p className="text-xs text-gray-500">
                  One scheduler holds the OAuth for 25+ networks / 50+ accounts — Creative OS sends the
                  video + captions there and it posts or schedules for you.
                </p>

                <label className="block text-xs text-gray-500 font-mono uppercase">
                  MCP / webhook bridge URL
                </label>
                <input
                  value={reachWebhook}
                  onChange={(e) => {
                    setReachWebhookState(e.target.value);
                    setReachWebhookUrl(e.target.value);
                  }}
                  placeholder="MCP HTTP endpoint, Zapier/Make/n8n webhook, or custom worker"
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                />
                <label className="block text-xs text-gray-500 font-mono uppercase">
                  Bridge Authorization header (optional)
                </label>
                <input
                  type="password"
                  value={reachWebhookAuth}
                  onChange={(e) => {
                    setReachWebhookAuthState(e.target.value);
                    setReachWebhookAuth(e.target.value);
                  }}
                  placeholder="Bearer …"
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-emerald-500"
                />
                <p className="text-xs text-gray-500">
                  The bridge receives a JSON job (<span className="text-gray-300">tool: publish_post</span>,
                  platform, caption, hashtags, scheduleAt, video as data URL) — MCP-friendly and works with
                  any automation. The CLI route needs nothing here: Caption Studio can download{' '}
                  <span className="text-gray-300">publish.sh</span> (ffmpeg + youtubeuploader + curl).
                </p>
              </section>

              <section className="space-y-3 border border-gray-700 rounded-xl p-4 bg-gray-800/40">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-white font-semibold">
                    YouTube Automation Agent{' '}
                    <a
                      className="text-cyan-400 text-xs font-normal underline"
                      href="https://github.com/darkzOGx/youtube-automation-agent"
                      target="_blank"
                      rel="noreferrer"
                    >
                      github.com/darkzOGx/youtube-automation-agent
                    </a>
                  </h3>
                  <span
                    className={`text-[10px] font-mono uppercase ${
                      ytAgentStatus === 'up'
                        ? 'text-emerald-400'
                        : ytAgentStatus === 'down'
                          ? 'text-rose-400'
                          : 'text-gray-500'
                    }`}
                  >
                    {ytAgentStatus === 'up' ? 'running' : ytAgentStatus === 'down' ? 'offline' : '…'}
                  </span>
                </div>
                <p className="text-gray-400 text-sm">
                  7 AI agents (strategy → script → thumbnail → SEO → production → publish → analytics).
                  Run locally with <span className="text-gray-200">npm start</span> on port{' '}
                  <span className="text-gray-200">3456</span>. Uses your Gemini key for free-tier video.
                  CreativeOS hands off topics when direct YouTube OAuth fails — the agent generates its own
                  video and queues publish.
                </p>
                <label className="block text-xs text-gray-500 font-mono uppercase">Agent API URL</label>
                <input
                  value={ytAgentUrl}
                  onChange={(e) => {
                    setYtAgentUrlState(e.target.value);
                    setYoutubeAgentUrl(e.target.value);
                  }}
                  placeholder="http://127.0.0.1:3456"
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-red-500"
                />
                <label className="block text-xs text-gray-500 font-mono uppercase">
                  x-api-key (matches agent API_KEY in .env)
                </label>
                <input
                  type="password"
                  value={ytAgentKey}
                  onChange={(e) => {
                    setYtAgentKeyState(e.target.value);
                    setYoutubeAgentApiKey(e.target.value);
                  }}
                  placeholder="optional"
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-red-500"
                />
                <p className="text-xs text-gray-500">
                  Setup:{' '}
                  <code className="text-gray-300">git clone … && npm install && npm run walkthrough</code>.
                  Dev proxy: <span className="text-gray-300">/api/youtube-agent</span> → :3456.
                </p>
              </section>

              <section className="space-y-3 border border-gray-700 rounded-xl p-4 bg-gray-800/40">
                <h3 className="text-white font-semibold">Hugging Face</h3>
                <p className="text-gray-400 text-sm">
                  Free token unlocks ZeroGPU Spaces (incl. OmniVoice) and Inference Providers.{' '}
                  <a
                    href="https://huggingface.co/settings/tokens"
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-400 underline"
                  >
                    Get a token
                  </a>
                  .
                </p>
                <input
                  type="password"
                  value={hfToken}
                  onChange={(e) => {
                    const value = e.target.value;
                    setHfToken(value);
                    setStoredHfToken(value);
                  }}
                  placeholder="hf_..."
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white outline-none focus:border-cyan-500"
                />
                <p className="text-xs text-gray-500 font-mono">
                  Browser localStorage only. Gemini / Veo uses GEMINI_API_KEY from .env.local.
                </p>
              </section>

              <section className="space-y-3 border border-gray-700 rounded-xl p-4 bg-gray-800/40">
                <h3 className="text-white font-semibold">
                  MuAPI / Open Generative AI{' '}
                  <a
                    className="text-cyan-400 text-xs font-normal underline"
                    href="https://github.com/Anil-matcha/Open-Generative-AI"
                    target="_blank"
                    rel="noreferrer"
                  >
                    GitHub
                  </a>
                </h3>
                <p className="text-gray-400 text-sm">
                  Optional paid upgrade for Seedance / Wan video via{' '}
                  <a
                    href="https://muapi.ai"
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-400 underline"
                  >
                    muapi.ai
                  </a>
                  . Free HF/local path stays default.
                </p>
                <label className="block text-xs text-gray-500 font-mono uppercase">API key</label>
                <input
                  type="password"
                  value={muapiKey}
                  onChange={(e) => {
                    setMuapiKeyState(e.target.value);
                    setMuapiKey(e.target.value);
                  }}
                  placeholder="MuAPI x-api-key"
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 font-mono uppercase mb-1">
                      T2V endpoint
                    </label>
                    <input
                      value={muapiT2v}
                      onChange={(e) => {
                        setMuapiT2vState(e.target.value);
                        setMuapiT2vEndpoint(e.target.value);
                      }}
                      className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 font-mono uppercase mb-1">
                      I2V endpoint
                    </label>
                    <input
                      value={muapiI2v}
                      onChange={(e) => {
                        setMuapiI2vState(e.target.value);
                        setMuapiI2vEndpoint(e.target.value);
                      }}
                      className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Defaults: <span className="text-gray-300">seedance-v2.0-t2v</span> /{' '}
                  <span className="text-gray-300">wan2.2-image-to-video</span>. Dev calls proxy through{' '}
                  <span className="text-gray-300">/api/muapi</span>.
                </p>
              </section>

              <section className="space-y-3 border border-gray-700 rounded-xl p-4 bg-gray-800/40">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-white font-semibold">
                    ComfyUI{' '}
                    <a
                      className="text-cyan-400 text-xs font-normal underline"
                      href="https://github.com/Comfy-Org/ComfyUI"
                      target="_blank"
                      rel="noreferrer"
                    >
                      github.com/Comfy-Org/ComfyUI
                    </a>
                  </h3>
                  <span
                    className={`text-[10px] font-mono uppercase ${
                      comfyStatus === 'up'
                        ? 'text-emerald-400'
                        : comfyStatus === 'down'
                          ? 'text-rose-400'
                          : 'text-gray-500'
                    }`}
                  >
                    {comfyStatus === 'up' ? 'reachable' : comfyStatus === 'down' ? 'offline' : '…'}
                  </span>
                </div>
                <label className="block text-xs text-gray-500 font-mono uppercase">API base URL</label>
                <input
                  value={comfyUrl}
                  onChange={(e) => {
                    setComfyUrlState(e.target.value);
                    setComfyUrl(e.target.value);
                  }}
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
                />
                <label className="block text-xs text-gray-500 font-mono uppercase">Checkpoint name</label>
                <input
                  value={comfyCkpt}
                  onChange={(e) => {
                    setComfyCkptState(e.target.value);
                    setComfyCheckpoint(e.target.value);
                  }}
                  placeholder="v1-5-pruned-emaonly.safetensors"
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
                />
                <p className="text-xs text-gray-500">
                  Run ComfyUI locally, then use provider <span className="text-gray-300">ComfyUI</span> or
                  Generate still (ComfyUI) in Studio.
                </p>
              </section>

              <section className="space-y-3 border border-gray-700 rounded-xl p-4 bg-gray-800/40">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-white font-semibold">
                    Wan2GP (local GPU){' '}
                    <a
                      className="text-cyan-400 text-xs font-normal underline"
                      href="https://github.com/deepbeepmeep/Wan2GP"
                      target="_blank"
                      rel="noreferrer"
                    >
                      github.com/deepbeepmeep/Wan2GP
                    </a>
                  </h3>
                  <span
                    className={`text-[10px] font-mono uppercase ${
                      wangpStatus === 'up'
                        ? 'text-emerald-400'
                        : wangpStatus === 'down'
                          ? 'text-rose-400'
                          : 'text-gray-500'
                    }`}
                  >
                    {wangpStatus === 'up' ? 'ready' : wangpStatus === 'down' ? 'offline' : '…'}
                  </span>
                </div>
                <p className="text-gray-400 text-sm">
                  Wan 2.1/2.2, LTX-2, Hunyuan, Flux, and 50+ models on your GPU. Clone Wan2GP, set{' '}
                  <span className="text-gray-200">WAN2GP_ROOT</span>, run{' '}
                  <span className="text-gray-200">npm run wangp-bridge</span> (port{' '}
                  <span className="text-gray-200">7867</span>). Pick provider{' '}
                  <span className="text-gray-200">Wan2GP (local GPU)</span> in Factory or let Auto use it when
                  the bridge is ready.
                </p>
                <label className="block text-xs text-gray-500 font-mono uppercase">model_type</label>
                <input
                  value={wangpModel}
                  onChange={(e) => {
                    setWangpModelState(e.target.value);
                    setWan2gpModelType(e.target.value);
                  }}
                  placeholder="wan2.2_t2v_14B"
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
                />
                <label className="block text-xs text-gray-500 font-mono uppercase">
                  Optional settings JSON (export from WanGP UI)
                </label>
                <textarea
                  value={wangpSettings}
                  onChange={(e) => {
                    setWangpSettingsState(e.target.value);
                    setWan2gpSettingsJson(e.target.value);
                  }}
                  rows={3}
                  placeholder='{"num_inference_steps": 25}'
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white font-mono outline-none focus:border-cyan-500"
                />
                <p className="text-xs text-gray-500">
                  Setup:{' '}
                  <code className="text-gray-300">
                    export WAN2GP_ROOT=/path/to/Wan2GP && npm run wangp-bridge
                  </code>
                  . Dev proxy: <span className="text-gray-300">/api/wangp</span> → :7867.
                </p>
              </section>

              <section className="space-y-3 border border-gray-700 rounded-xl p-4 bg-gray-800/40">
                <h3 className="text-white font-semibold">
                  Duix.Avatar{' '}
                  <a
                    className="text-cyan-400 text-xs font-normal underline"
                    href="https://github.com/duixcom/Duix-Avatar"
                    target="_blank"
                    rel="noreferrer"
                  >
                    github.com/duixcom/Duix-Avatar
                  </a>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 font-mono uppercase mb-1">
                      Video API (:8383)
                    </label>
                    <input
                      value={duixVideo}
                      onChange={(e) => {
                        setDuixVideoState(e.target.value);
                        setDuixVideoApi(e.target.value);
                      }}
                      className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 font-mono uppercase mb-1">
                      Voice API (:18180)
                    </label>
                    <input
                      value={duixVoice}
                      onChange={(e) => {
                        setDuixVoiceState(e.target.value);
                        setDuixVoiceApi(e.target.value);
                      }}
                      className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
                <label className="block text-xs text-gray-500 font-mono uppercase">
                  Silent avatar video path (server-side)
                </label>
                <input
                  value={duixAvatar}
                  onChange={(e) => {
                    setDuixAvatarState(e.target.value);
                    setDuixAvatarVideoPath(e.target.value);
                  }}
                  placeholder="/path/to/silent_avatar.mp4"
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
                />
                <label className="block text-xs text-gray-500 font-mono uppercase">
                  Reference audio path
                </label>
                <input
                  value={duixRefAudio}
                  onChange={(e) => {
                    setDuixRefAudioState(e.target.value);
                    setDuixRefAudio(e.target.value);
                  }}
                  placeholder="/path/to/ref.wav"
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
                />
                <label className="block text-xs text-gray-500 font-mono uppercase">Reference text</label>
                <textarea
                  value={duixRefText}
                  onChange={(e) => {
                    setDuixRefTextState(e.target.value);
                    setDuixRefText(e.target.value);
                  }}
                  rows={2}
                  placeholder="Transcript of the reference audio"
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-500 resize-none"
                />
              </section>

              <section className="space-y-2 border border-gray-700 rounded-xl p-4 bg-gray-800/40 text-sm text-gray-400">
                <h3 className="text-white font-semibold">Also integrated</h3>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    <a
                      className="text-cyan-400 underline"
                      href="https://github.com/Anil-matcha/Open-Generative-AI"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open Generative AI
                    </a>{' '}
                    — MuAPI multi-model studio companion
                  </li>
                  <li>
                    <a
                      className="text-cyan-400 underline"
                      href="https://github.com/Anil-matcha/Free-AI-Social-Media-Scheduler"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Free-AI-Social-Media-Scheduler
                    </a>{' '}
                    — real schedule/publish (Creative OS exports a caption pack)
                  </li>
                  <li>
                    <a
                      className="text-cyan-400 underline"
                      href="https://github.com/darkzOGx/youtube-automation-agent"
                      target="_blank"
                      rel="noreferrer"
                    >
                      youtube-automation-agent
                    </a>{' '}
                    — 7-agent autonomous YouTube channel (Gemini) · fallback publish route
                  </li>
                  <li>
                    <a
                      className="text-cyan-400 underline"
                      href="https://github.com/deepbeepmeep/Wan2GP"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Wan2GP
                    </a>{' '}
                    — local GPU video (Wan 2.1/2.2, LTX-2, Hunyuan, Flux) via bridge on :7867
                  </li>
                  <li>
                    <a
                      className="text-cyan-400 underline"
                      href="https://github.com/k2-fsa/OmniVoice"
                      target="_blank"
                      rel="noreferrer"
                    >
                      OmniVoice
                    </a>{' '}
                    — default voiceover via HF Space (Edge-TTS fallback)
                  </li>
                  <li>
                    <a
                      className="text-cyan-400 underline"
                      href="https://github.com/cjpais/Handy"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Handy
                    </a>{' '}
                    — Studio Dictate uses Web Speech; Handy for fully offline desktop STT
                  </li>
                </ul>
              </section>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
