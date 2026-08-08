import React from 'react';

const StatCard = ({ title, value, detail }: { title: string; value: string; detail: string }) => (
  <div className="rounded-2xl border border-gray-800 bg-gray-900/50 p-4">
    <div className="text-[11px] uppercase tracking-[0.18em] text-gray-500">{title}</div>
    <div className="text-2xl font-black text-white mt-2">{value}</div>
    <div className="text-xs text-gray-500 mt-1">{detail}</div>
  </div>
);

const Dashboard: React.FC = () => {
  const systems = [
    ['Evidence Graph', 'Source → claim → content → scene traceability', 'READY'],
    ['Arabic Core', 'RTL shaping, bidi, mixed-language and snapshot gates', 'SPEC'],
    ['Renderer Abstraction', 'Pillow / SVG / HTML / browser / procedural 3D', 'SPEC'],
    ['Release Gates', 'Evidence, layout, accessibility, licensing, provenance', 'SPEC'],
    ['Learning Loop', 'Analytics + experiments without false causal claims', 'SPEC'],
  ];

  return (
    <div className="h-full overflow-y-auto pr-1">
      <div className="max-w-7xl mx-auto pb-10 space-y-6">
        <header>
          <div className="text-xs font-mono text-cyan-300 tracking-[0.2em] uppercase">SOLDIOM Creator OS</div>
          <h2 className="text-3xl font-black text-white mt-2">Command Center</h2>
          <p className="text-gray-500 mt-2">Control plane for a deterministic, evidence-backed media company.</p>
        </header>

        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard title="Visual policy" value="Deterministic" detail="Generative image/video path removed" />
          <StatCard title="Compiler stages" value="9 IRs" detail="Intent through learning" />
          <StatCard title="Default evidence" value="Strict" detail="Public claims require traceable support" />
          <StatCard title="Primary languages" value="AR + EN" detail="Arabic is first-class infrastructure" />
        </div>

        <div className="grid xl:grid-cols-[1.4fr_.6fr] gap-6">
          <section className="rounded-2xl border border-gray-800 bg-gray-900/50 p-5">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="font-bold text-white">System architecture</h3>
                <p className="text-sm text-gray-500">Implementation tracks now defined in the repository spec.</p>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono">GOD MODE BRANCH</span>
            </div>
            <div className="space-y-2">
              {systems.map(([name, detail, status]) => (
                <div key={name} className="rounded-xl border border-gray-800 bg-black/20 p-4 flex gap-4 items-start">
                  <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 grid place-items-center text-cyan-300 font-mono text-xs">✓</div>
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-100">{name}</div>
                    <div className="text-xs text-gray-500 mt-1">{detail}</div>
                  </div>
                  <span className="ml-auto text-[10px] font-mono text-gray-500">{status}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-gray-800 bg-gray-900/50 p-5">
            <h3 className="font-bold text-white">Release constitution</h3>
            <p className="text-sm text-gray-500 mt-1 mb-4">Master outputs remain blocked until critical gates pass.</p>
            <div className="space-y-3 text-sm">
              {['Evidence', 'Arabic / RTL', 'Layout', 'Accessibility', 'Licensing', 'Audio / Video', 'Provenance', 'Reproducibility'].map((gate) => (
                <div key={gate} className="flex items-center justify-between border-b border-gray-800 pb-2 last:border-0">
                  <span className="text-gray-300">{gate}</span>
                  <span className="text-amber-300 text-[10px] font-mono">GATED</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
