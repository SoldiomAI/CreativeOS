import React from 'react';

const StatCard = ({ title, value, change, trend }: { title: string, value: string, change: string, trend: 'up' | 'down' | 'neutral' }) => (
  <div className="bg-gray-800/50 border border-gray-700 p-4 rounded-lg backdrop-blur-sm">
    <h3 className="text-gray-400 text-xs font-mono uppercase tracking-widest mb-1">{title}</h3>
    <div className="flex items-end justify-between">
      <span className="text-2xl font-bold text-white">{value}</span>
      <span className={`text-sm font-mono ${trend === 'up' ? 'text-green-400' : trend === 'down' ? 'text-red-400' : 'text-gray-400'}`}>
        {change}
      </span>
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  return (
    <div className="h-full flex flex-col gap-6 overflow-y-auto p-1">
      <div className="flex justify-between items-center mb-2">
        <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Command Center</h2>
            <p className="text-gray-400 text-sm">Prompt → Movie pipeline: <span className="text-green-400">READY on :5173</span></p>
        </div>
        <div className="flex space-x-2">
            <span className="px-3 py-1 rounded-full bg-emerald-900/30 text-emerald-400 border border-emerald-800 text-xs font-mono">HF FREE: READY</span>
            <span className="px-3 py-1 rounded-full bg-blue-900/30 text-blue-400 border border-blue-800 text-xs font-mono">LTX + MUSICGEN + TTS</span>
            <span className="px-3 py-1 rounded-full bg-purple-900/30 text-purple-400 border border-purple-800 text-xs font-mono">VEO: OPTIONAL</span>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Est. Viral Coefficient" value="1.42" change="+12.5%" trend="up" />
        <StatCard title="Production Velocity" value="8m 12s" change="-30s" trend="up" />
        <StatCard title="Model Drift" value="0.03%" change="Stable" trend="neutral" />
        <StatCard title="Content Variance" value="High" change="Risk: Low" trend="up" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow">
        {/* Trend Radar */}
        <div className="lg:col-span-2 bg-gray-800/30 border border-gray-700 rounded-xl p-6">
          <h3 className="text-white font-bold mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
            Trend Radar (Real-time)
          </h3>
          <div className="space-y-4">
            {[
                { topic: "ASMR Unboxing", growth: 94, sentiment: "Positive" },
                { topic: "AI Tutorials", growth: 88, sentiment: "Neutral" },
                { topic: "Sustainable Fashion", growth: 76, sentiment: "Positive" },
                { topic: "Retro Tech", growth: 62, sentiment: "Rising" }
            ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border-l-2 border-cyan-500 hover:bg-gray-700/50 transition cursor-pointer">
                    <span className="text-gray-200 font-medium">{item.topic}</span>
                    <div className="flex items-center space-x-4">
                        <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400" style={{ width: `${item.growth}%` }}></div>
                        </div>
                        <span className="text-cyan-400 font-mono text-sm">{item.growth}%</span>
                    </div>
                </div>
            ))}
          </div>
        </div>

        {/* Quick Actions / System Log */}
        <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-6 flex flex-col">
           <h3 className="text-white font-bold mb-4">System Log</h3>
           <div className="flex-grow space-y-3 text-xs font-mono text-gray-400 overflow-hidden">
                <div className="flex gap-2"><span className="text-blue-500">10:42:01</span> <span>Batch #492 completed.</span></div>
                <div className="flex gap-2"><span className="text-blue-500">10:41:55</span> <span>Optimizing thumbnails...</span></div>
                <div className="flex gap-2"><span className="text-blue-500">10:41:12</span> <span>Veo inference started.</span></div>
                <div className="flex gap-2"><span className="text-blue-500">10:40:05</span> <span>Hook Foundry: 3 concepts generated.</span></div>
                <div className="flex gap-2"><span className="text-blue-500">10:39:22</span> <span>Ingesting market signals...</span></div>
           </div>
           <button className="mt-4 w-full py-2 border border-gray-600 text-gray-300 hover:text-white hover:border-gray-400 rounded transition text-xs uppercase tracking-wider">
             View Full Logs
           </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;