import React, { useEffect, useState } from 'react';
import LandingPage from './components/LandingPage';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Studio from './components/Studio';
import Library from './components/Library';
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
import { AppTab } from './types';

export default function App() {
  const [hasStarted, setHasStarted] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.STUDIO);
  const [hfToken, setHfToken] = useState(getStoredHfToken());
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

  useEffect(() => {
    if (activeTab !== AppTab.SETTINGS) return;
    pingComfyUi()
      .then((up) => setComfyStatus(up ? 'up' : 'down'))
      .catch(() => setComfyStatus('down'));
  }, [activeTab, comfyUrl]);

  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop')] bg-cover bg-center">
        <div className="absolute inset-0 bg-gray-900/90 backdrop-blur-sm"></div>
        <div className="relative z-10 w-full h-full">
          <LandingPage onGetStarted={() => setHasStarted(true)} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden font-sans">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-grow p-4 md:p-6 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0 opacity-20">
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/30 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-cyan-600/20 rounded-full blur-[120px]"></div>
        </div>

        <div className="relative z-10 h-full">
          {activeTab === AppTab.DASHBOARD && <Dashboard />}
          {activeTab === AppTab.STUDIO && <Studio />}
          {activeTab === AppTab.LIBRARY && <Library />}
          {activeTab === AppTab.SETTINGS && (
            <div className="max-w-2xl mx-auto h-full overflow-y-auto flex flex-col gap-6 p-4 pb-10">
              <div>
                <h2 className="text-2xl font-bold text-white">Connections</h2>
                <p className="text-xs text-gray-500 mt-1">
                  App URL: <span className="text-cyan-400">http://localhost:5173</span> (Antigravity
                  keeps :3000)
                </p>
              </div>

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
