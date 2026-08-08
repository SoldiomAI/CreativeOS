import React from 'react';
import { AppTab } from '../types';

interface SidebarProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
}

const icon = (path: string) => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={path}></path></svg>
);

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const menuItems = [
    { id: AppTab.DASHBOARD, label: 'Command Center', icon: icon('M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z') },
    { id: AppTab.STUDIO, label: 'Creator Compiler', icon: icon('M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4') },
    { id: AppTab.LIBRARY, label: 'Knowledge + Assets', icon: icon('M4 19.5A2.5 2.5 0 016.5 17H20M4 4.5A2.5 2.5 0 016.5 2H20v15H6.5A2.5 2.5 0 004 19.5z') },
    { id: AppTab.SETTINGS, label: 'Policies + QA', icon: icon('M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z') },
  ];

  return (
    <div className="w-20 md:w-64 bg-gray-950 border-r border-gray-800 flex flex-col justify-between h-full transition-all duration-300">
      <div>
        <div className="h-20 flex items-center justify-center md:justify-start md:px-6 border-b border-gray-800">
          <div className="w-9 h-9 bg-white text-black rounded-xl flex items-center justify-center font-black">S</div>
          <div className="ml-3 hidden md:block">
            <div className="font-black text-white leading-tight">Creator OS</div>
            <div className="text-[9px] tracking-[0.2em] text-gray-500 uppercase">SOLDIOM</div>
          </div>
        </div>
        <nav className="mt-6 px-2 md:px-4 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-center md:justify-start p-3 rounded-xl transition-all duration-200 group ${activeTab === item.id ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20' : 'text-gray-500 border border-transparent hover:bg-gray-900 hover:text-white'}`}
            >
              <span>{item.icon}</span>
              <span className="ml-3 font-medium hidden md:block text-sm">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
      <div className="p-4 border-t border-gray-800 hidden md:block">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
          <div className="text-[10px] font-mono tracking-wider text-emerald-300">VISUAL POLICY</div>
          <div className="text-xs text-gray-400 mt-1">Deterministic only</div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
