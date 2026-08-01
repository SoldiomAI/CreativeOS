import React from 'react';
import { AppTab } from '../types';

interface SidebarProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange }) => {
  const menuItems = [
    { id: AppTab.DASHBOARD, label: 'Command Center', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
    )},
    { id: AppTab.STUDIO, label: 'Factory Studio', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
    )},
    { id: AppTab.LIBRARY, label: 'Asset Library', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
    )},
    { id: AppTab.SETTINGS, label: 'Optimization', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path></svg>
    )}
  ];

  return (
    <div className="w-20 md:w-64 bg-gray-900 border-r border-gray-800 flex flex-col justify-between h-full transition-all duration-300">
      <div>
        <div className="h-20 flex items-center justify-center md:justify-start md:px-6 border-b border-gray-800">
             <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
                <span className="text-white font-bold text-lg">P</span>
             </div>
             <span className="ml-3 font-bold text-white text-lg hidden md:block tracking-tight">Creative OS</span>
        </div>
        
        <nav className="mt-6 px-2 md:px-4 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-center md:justify-start p-3 rounded-lg transition-all duration-200 group ${
                activeTab === item.id 
                ? 'bg-blue-600/10 text-blue-400 border border-blue-900/50' 
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <span className={`${activeTab === item.id ? 'text-blue-400' : 'group-hover:text-white'}`}>{item.icon}</span>
              <span className="ml-3 font-medium hidden md:block">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
      
      <div className="p-4 border-t border-gray-800 hidden md:block">
        <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-2">Compute Credits</p>
            <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden mb-1">
                <div className="bg-green-400 h-full w-3/4"></div>
            </div>
            <p className="text-right text-xs text-white font-mono">75%</p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;