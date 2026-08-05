import React from 'react';
import { AppTab } from '../types';
import { getGodModeEnabled } from '../services/godMode';
import { getCredits, isPro } from '../services/creditsStore';

interface SidebarProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const god = getGodModeEnabled();
  const credits = getCredits();
  const menuItems = [
    {
      id: AppTab.DASHBOARD,
      label: 'Command',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 6h7v7H4V6zm9 0h7v4h-7V6zM4 15h7v3H4v-3zm9-3h7v6h-7v-6z" />
        </svg>
      ),
    },
    {
      id: AppTab.STUDIO,
      label: 'Factory',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 10l4.55-2.28A1 1 0 0121 8.62v6.76a1 1 0 01-1.45.89L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: AppTab.STILLS,
      label: 'Still Lab',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M4 16l4.6-4.6a2 2 0 012.8 0L16 16m-2-2l1.6-1.6a2 2 0 012.8 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: AppTab.LIBRARY,
      label: 'Library',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M5 4h4v16H5V4zm5 4h4v12h-4V8zm5-2h4v14h-4V6z" />
        </svg>
      ),
    },
    {
      id: AppTab.SETTINGS,
      label: 'Links',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      ),
    },
  ];

  return (
    <aside className="w-20 md:w-64 border-r border-[rgba(255,214,140,0.12)] bg-[#070b12]/80 backdrop-blur-md flex flex-col justify-between h-full">
      <div>
        <div className="h-20 flex items-center justify-center md:justify-start md:px-6 border-b border-[rgba(255,214,140,0.12)]">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-300 to-amber-600 flex items-center justify-center shadow-[0_0_24px_rgba(240,180,41,0.35)]">
            <span className="cos-display text-ink font-extrabold text-lg">C</span>
          </div>
          <div className="ml-3 hidden md:block">
            <div className="cos-display text-white text-lg leading-none">Creative OS</div>
            <div className="text-[10px] tracking-[0.28em] uppercase text-amber-200/60 mt-1">
              {god ? 'God Mode' : 'Factory'}
            </div>
          </div>
        </div>

        <nav className="mt-6 px-2 md:px-4 space-y-1.5">
          {menuItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-center md:justify-start p-3 rounded-xl border transition-all duration-200 ${
                  active
                    ? 'cos-nav-active border'
                    : 'border-transparent text-[#9aa8bc] hover:text-white hover:bg-white/5'
                }`}
              >
                <span>{item.icon}</span>
                <span className="ml-3 font-medium hidden md:block text-sm">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-[rgba(255,214,140,0.12)] hidden md:block">
        <p className="text-[10px] uppercase tracking-[0.3em] text-white/35 mb-2">Signal</p>
        <p className="text-xs text-[#9aa8bc] leading-relaxed mb-2">
          Free HF first. MuAPI when keyed. Local never dies.
        </p>
        <p className="text-[11px] font-mono text-amber-200/80">
          {isPro() ? 'PRO · unlimited local' : `${credits.balance} credits`}
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;
