import React, { Suspense, lazy, useEffect, useState } from 'react';
import LandingPage from './components/LandingPage';
import Sidebar from './components/Sidebar';
import Spinner from './components/Spinner';
import { AppTab } from './types';
import { I18nProvider, useI18n } from './i18n';
import { isDemoMode, navigateTo, hasStarted as loadStarted, setStarted } from './services/config';

// Tabs are code-split so the initial bundle stays small; each loads on first visit.
const Dashboard = lazy(() => import('./components/Dashboard'));
const StudioHub = lazy(() => import('./components/StudioHub'));
const Library = lazy(() => import('./components/Library'));
const Settings = lazy(() => import('./components/Settings'));

const TabFallback: React.FC = () => (
  <div className="h-full flex items-center justify-center">
    <Spinner className="w-8 h-8 text-blue-500" />
  </div>
);

const DemoBanner: React.FC = () => {
  const { t } = useI18n();
  const [demo, setDemo] = useState(isDemoMode());
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = () => setDemo(isDemoMode());
    window.addEventListener('creativeos:config-changed', handler);
    return () => window.removeEventListener('creativeos:config-changed', handler);
  }, []);

  if (!demo || dismissed) return null;

  return (
    <div className="relative z-20 mb-4 flex items-center justify-between gap-4 bg-amber-900/30 border border-amber-800/60 text-amber-200 rounded-lg px-4 py-2.5 text-sm">
      <p>
        {t('demo.banner')}{' '}
        <button onClick={() => navigateTo('SETTINGS')} className="underline hover:text-white transition">
          {t('demo.openSettings')}
        </button>
      </p>
      <button onClick={() => setDismissed(true)} className="text-amber-400 hover:text-white transition" aria-label="Dismiss">✕</button>
    </div>
  );
};

function Shell() {
  const [hasStarted, setHasStarted] = useState(loadStarted());
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.DASHBOARD);

  const start = () => {
    setStarted();
    setHasStarted(true);
  };

  useEffect(() => {
    // React is mounted — fade out the pre-React splash from index.html
    const splash = document.getElementById('splash');
    if (splash) {
      splash.style.opacity = '0';
      window.setTimeout(() => splash.remove(), 300);
    }
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const tab = (e as CustomEvent<string>).detail;
      if (tab && tab in AppTab) {
        setStarted();
        setHasStarted(true);
        setActiveTab(AppTab[tab as keyof typeof AppTab]);
      }
    };
    window.addEventListener('creativeos:navigate', handler);
    return () => window.removeEventListener('creativeos:navigate', handler);
  }, []);

  if (!hasStarted) {
    return (
      <div className="relative min-h-screen bg-gray-900 text-white flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
          <div className="absolute top-[-15%] right-[-15%] w-[600px] h-[600px] bg-indigo-600/40 rounded-full blur-[130px]"></div>
          <div className="absolute bottom-[-15%] left-[-15%] w-[600px] h-[600px] bg-purple-600/40 rounded-full blur-[130px]"></div>
        </div>
        <div className="relative z-10 w-full h-full">
            <LandingPage onGetStarted={start} />
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

         <div className="relative z-10 h-full flex flex-col">
            <DemoBanner />
            <div className="flex-grow min-h-0">
              <Suspense fallback={<TabFallback />}>
                {activeTab === AppTab.DASHBOARD && <Dashboard />}
                {activeTab === AppTab.STUDIO && <StudioHub />}
                {activeTab === AppTab.LIBRARY && <Library />}
                {activeTab === AppTab.SETTINGS && <Settings />}
              </Suspense>
            </div>
         </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <Shell />
    </I18nProvider>
  );
}
