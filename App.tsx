import React, { useState } from 'react';
import LandingPage from './components/LandingPage';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Studio from './components/Studio';
import { AppTab } from './types';

const Placeholder = ({ title, detail }: { title: string; detail: string }) => (
  <div className="h-full overflow-y-auto">
    <div className="max-w-5xl mx-auto rounded-2xl border border-gray-800 bg-gray-900/50 p-8">
      <div className="text-xs font-mono tracking-[0.2em] text-cyan-300 uppercase">Creator OS Module</div>
      <h2 className="text-3xl font-black text-white mt-2">{title}</h2>
      <p className="text-gray-500 mt-3 max-w-2xl">{detail}</p>
      <div className="mt-6 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200">
        Defined in the God Mode architecture; backend implementation is scheduled in the roadmap.
      </div>
    </div>
  </div>
);

export default function App() {
  const [hasStarted, setHasStarted] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.DASHBOARD);

  if (!hasStarted) return <LandingPage onGetStarted={() => setHasStarted(true)} />;

  return (
    <div className="flex h-screen bg-[#080b10] text-white overflow-hidden font-sans">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-grow p-4 md:p-6 overflow-hidden relative">
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-cyan-600/20 rounded-full blur-[130px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[130px]" />
        </div>
        <div className="relative z-10 h-full">
          {activeTab === AppTab.DASHBOARD && <Dashboard />}
          {activeTab === AppTab.STUDIO && <Studio />}
          {activeTab === AppTab.LIBRARY && <Placeholder title="Knowledge + Asset Library" detail="Verified sources, reusable content atoms, licensed/user assets, screenshots, brand packs, series packs and provenance-aware media." />}
          {activeTab === AppTab.SETTINGS && <Placeholder title="Policies + Quality Gates" detail="Configure evidence strictness, public-export gates, Arabic/RTL tests, accessibility, licensing, provenance, provider permissions and self-evolution quarantine." />}
        </div>
      </main>
    </div>
  );
}
