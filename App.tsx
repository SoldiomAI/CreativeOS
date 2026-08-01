import React, { useState } from 'react';
import LandingPage from './components/LandingPage';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Studio from './components/Studio';
import { AppTab } from './types';

export default function App() {
  const [hasStarted, setHasStarted] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.DASHBOARD);

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
         {/* Background Elements */}
         <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0 opacity-20">
            <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-600/30 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/30 rounded-full blur-[120px]"></div>
         </div>

         <div className="relative z-10 h-full">
            {activeTab === AppTab.DASHBOARD && <Dashboard />}
            {activeTab === AppTab.STUDIO && <Studio />}
            {activeTab === AppTab.LIBRARY && (
                <div className="flex items-center justify-center h-full text-gray-500 font-mono text-sm">
                    Library Module: Offline
                </div>
            )}
            {activeTab === AppTab.SETTINGS && (
                <div className="max-w-lg mx-auto h-full flex flex-col justify-center gap-4 p-4">
                    <h2 className="text-2xl font-bold text-white">Connections</h2>
                    <p className="text-gray-400 text-sm">
                      Paste a free Hugging Face token to unlock ZeroGPU Spaces and Inference Providers.
                      Get one at{' '}
                      <a
                        href="https://huggingface.co/settings/tokens"
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-400 underline"
                      >
                        huggingface.co/settings/tokens
                      </a>
                      .
                    </p>
                    <input
                      type="password"
                      defaultValue={(() => {
                        try { return localStorage.getItem('creativeos_hf_token') || ''; } catch { return ''; }
                      })()}
                      onChange={(e) => {
                        try { localStorage.setItem('creativeos_hf_token', e.target.value.trim()); } catch { /* ignore */ }
                      }}
                      placeholder="hf_..."
                      className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white outline-none focus:border-cyan-500"
                    />
                    <p className="text-xs text-gray-500 font-mono">
                      Gemini / Veo still uses GEMINI_API_KEY from .env.local when selected.
                    </p>
                </div>
            )}
         </div>
      </main>
    </div>
  );
}