import React from 'react';

interface LandingPageProps {
  onGetStarted: () => void;
}

const principles = [
  ['AI THINKS', 'Research, reason, write, localize and plan.'],
  ['CODE DRAWS', 'Pillow, SVG, HTML/Chromium and procedural graphics render the pixels.'],
  ['EVIDENCE VERIFIES', 'Claims remain traceable to sources and freshness policies.'],
  ['QA APPROVES', 'RTL, layout, accessibility, licensing and provenance gate release.'],
];

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  return (
    <div className="min-h-screen bg-[#080b10] text-white overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 right-[-10%] w-[700px] h-[700px] rounded-full bg-cyan-500/10 blur-[140px]" />
        <div className="absolute -bottom-40 left-[-10%] w-[700px] h-[700px] rounded-full bg-purple-500/10 blur-[140px]" />
        <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.12) 1px, transparent 1px)', backgroundSize: '36px 36px' }} />
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-10 md:py-16">
        <nav className="flex items-center justify-between mb-20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white text-black font-black grid place-items-center">S</div>
            <div>
              <div className="font-black tracking-tight">SOLDIOM</div>
              <div className="text-[10px] text-gray-500 uppercase tracking-[0.3em]">Creator OS</div>
            </div>
          </div>
          <span className="hidden sm:inline-flex px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-[10px] font-mono tracking-widest">NO GENERATIVE VISUALS</span>
        </nav>

        <section className="grid lg:grid-cols-[1.25fr_.75fr] gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/10 text-cyan-300 text-xs font-mono mb-6">
              DETERMINISTIC CONTENT INTELLIGENCE SYSTEM
            </div>
            <h1 className="text-5xl md:text-7xl font-black leading-[0.96] tracking-[-0.045em]">
              One idea.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-purple-300">An entire media company.</span>
            </h1>
            <p className="mt-7 text-lg md:text-xl text-gray-400 max-w-3xl leading-relaxed">
              Research, verify, structure, script, typeset, animate, narrate, reflow and quality-gate content for any format — with every important visual rendered deterministically by code.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <button onClick={onGetStarted} className="px-6 py-3.5 rounded-xl bg-white text-black font-black hover:bg-cyan-100 transition">Open Creator Command Center</button>
              <a href="https://github.com/Soldiom/CreativeOS" className="px-6 py-3.5 rounded-xl border border-gray-700 bg-gray-900/50 text-white font-semibold hover:border-gray-500 transition text-center">Repository</a>
            </div>
          </div>

          <div className="rounded-3xl border border-gray-700/80 bg-gray-900/70 backdrop-blur-xl p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-gray-800">
              <div>
                <div className="font-bold">Creator Compiler</div>
                <div className="text-xs text-gray-500 font-mono">PROJECT → MASTER OUTPUTS</div>
              </div>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_20px_rgba(52,211,153,.8)]" />
            </div>
            <div className="py-5 space-y-2 text-sm font-mono">
              {['Intent IR', 'Evidence IR', 'Strategy IR', 'Narrative IR', 'Scene IR', 'Render IR', 'Distribution IR', 'Performance IR'].map((item, index) => (
                <div key={item} className="flex items-center gap-3 rounded-lg border border-gray-800 bg-black/20 px-3 py-2.5">
                  <span className="text-gray-600">{String(index + 1).padStart(2, '0')}</span>
                  <span className="text-gray-200">{item}</span>
                  <span className="ml-auto text-emerald-400">✓</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 mt-20">
          {principles.map(([title, detail]) => (
            <div key={title} className="rounded-2xl border border-gray-800 bg-gray-900/40 p-5">
              <div className="text-sm font-black tracking-[0.14em] text-white">{title}</div>
              <p className="text-sm text-gray-500 leading-relaxed mt-3">{detail}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
};

export default LandingPage;
