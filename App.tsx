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
                <div className="flex items-center justify-center h-full text-gray-500 font-mono text-sm">
                    Optimization Matrix: Calibrating...
                </div>
            )}
         </div>
      </main>
    </div>
  );
}