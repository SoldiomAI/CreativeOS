import React, { useMemo, useState } from 'react';
import { CompilerStage, OutputFormat } from '../types';

const stages: { id: CompilerStage; label: string; detail: string }[] = [
  { id: 'INTENT', label: 'Intent', detail: 'Objective, audience, market and constraints' },
  { id: 'EVIDENCE', label: 'Evidence', detail: 'Claims, sources, freshness and contradictions' },
  { id: 'STRATEGY', label: 'Strategy', detail: 'Angles, hooks, campaign and platform fit' },
  { id: 'NARRATIVE', label: 'Narrative', detail: 'Hook → problem → proof → insight → CTA' },
  { id: 'SCENE', label: 'Scene', detail: 'Typed components, Arabic direction and timing' },
  { id: 'RENDER', label: 'Render', detail: 'Pillow / SVG / HTML / browser / procedural 3D' },
  { id: 'DISTRIBUTION', label: 'Distribution', detail: 'Platform-specific reflow and metadata' },
  { id: 'PERFORMANCE', label: 'Performance', detail: 'Analytics mapped to content genome' },
  { id: 'LEARNING', label: 'Learning', detail: 'Experiments and quarantined improvements' },
];

const initialOutputs: OutputFormat[] = [
  { id: 'carousel-ar', label: 'Arabic Carousel', aspect: '4:5', enabled: true, status: 'planned' },
  { id: 'reel-30', label: '30s Reel', aspect: '9:16', enabled: true, status: 'planned' },
  { id: 'short-60', label: '60s Short', aspect: '9:16', enabled: true, status: 'planned' },
  { id: 'deck', label: 'Executive Deck', aspect: '16:9', enabled: true, status: 'planned' },
  { id: 'linkedin', label: 'LinkedIn Pack', aspect: 'adaptive', enabled: false, status: 'planned' },
  { id: 'article', label: 'Evidence Article', aspect: 'document', enabled: false, status: 'planned' },
];

const policyRows = [
  ['Visual generation', 'BLOCKED', 'No image/video generation models'],
  ['Arabic rendering', 'REQUIRED', 'libraqm + HarfBuzz + FriBidi path'],
  ['Evidence traceability', 'REQUIRED', 'Source → claim → block → scene → export'],
  ['Public export', 'GATED', 'Evidence + RTL + layout + licensing + provenance'],
  ['Self-improvement', 'QUARANTINED', 'Benchmark before production promotion'],
];

const Studio: React.FC = () => {
  const [idea, setIdea] = useState('');
  const [stage, setStage] = useState<CompilerStage>('INTENT');
  const [outputs, setOutputs] = useState<OutputFormat[]>(initialOutputs);
  const [language, setLanguage] = useState<'ar' | 'en' | 'ar,en'>('ar,en');
  const [evidence, setEvidence] = useState<'standard' | 'strict' | 'locked'>('strict');

  const enabledCount = useMemo(() => outputs.filter((output) => output.enabled).length, [outputs]);

  const toggleOutput = (id: string) => {
    setOutputs((current) => current.map((output) => output.id === id ? { ...output, enabled: !output.enabled } : output));
  };

  return (
    <div className="h-full overflow-y-auto pr-1">
      <div className="max-w-7xl mx-auto space-y-6 pb-10">
        <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 text-[11px] font-mono tracking-wider">DETERMINISTIC_ONLY</span>
              <span className="px-2.5 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-[11px] font-mono tracking-wider">CREATOR COMPILER</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">Creator OS Studio</h1>
            <p className="text-gray-400 mt-2 max-w-3xl">Turn anything into a verified content universe. Intelligence plans and writes; deterministic renderers create the pixels.</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500 uppercase tracking-[0.2em]">Selected outputs</div>
            <div className="text-3xl font-black text-white">{enabledCount}</div>
          </div>
        </header>

        <section className="rounded-2xl border border-gray-700 bg-gray-900/70 p-5 md:p-6 shadow-2xl">
          <label className="text-xs font-mono uppercase tracking-[0.22em] text-cyan-300">What do you want to create?</label>
          <textarea
            value={idea}
            onChange={(event) => setIdea(event.target.value)}
            placeholder="Idea, URL, repository, research topic, product, campaign, report..."
            className="mt-3 w-full min-h-32 resize-y rounded-xl border border-gray-700 bg-black/30 px-4 py-4 text-lg text-white placeholder:text-gray-600 outline-none focus:border-cyan-500/70"
          />
          <div className="mt-4 grid md:grid-cols-3 gap-3">
            <label className="rounded-xl border border-gray-800 bg-gray-950/40 p-3">
              <span className="block text-[11px] uppercase tracking-wider text-gray-500 mb-2">Languages</span>
              <select value={language} onChange={(event) => setLanguage(event.target.value as typeof language)} className="w-full bg-transparent text-sm text-white outline-none">
                <option className="bg-gray-900" value="ar,en">Arabic + English</option>
                <option className="bg-gray-900" value="ar">Arabic</option>
                <option className="bg-gray-900" value="en">English</option>
              </select>
            </label>
            <label className="rounded-xl border border-gray-800 bg-gray-950/40 p-3">
              <span className="block text-[11px] uppercase tracking-wider text-gray-500 mb-2">Evidence policy</span>
              <select value={evidence} onChange={(event) => setEvidence(event.target.value as typeof evidence)} className="w-full bg-transparent text-sm text-white outline-none">
                <option className="bg-gray-900" value="strict">Strict</option>
                <option className="bg-gray-900" value="locked">Locked research</option>
                <option className="bg-gray-900" value="standard">Standard</option>
              </select>
            </label>
            <div className="rounded-xl border border-gray-800 bg-gray-950/40 p-3">
              <span className="block text-[11px] uppercase tracking-wider text-gray-500 mb-2">Visual policy</span>
              <span className="text-sm font-semibold text-emerald-300">Code-rendered only</span>
            </div>
          </div>
          <button
            disabled={!idea.trim()}
            onClick={() => setStage('EVIDENCE')}
            className="mt-4 w-full md:w-auto px-6 py-3 rounded-xl bg-white text-gray-950 font-black disabled:opacity-30 disabled:cursor-not-allowed hover:bg-cyan-100 transition"
          >
            Compile Project Constitution
          </button>
        </section>

        <section className="grid xl:grid-cols-[1.5fr_1fr] gap-6">
          <div className="rounded-2xl border border-gray-700 bg-gray-900/50 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-white">Compiler pipeline</h2>
                <p className="text-sm text-gray-500">Every stage produces typed, versioned intermediate representation.</p>
              </div>
              <span className="font-mono text-xs text-cyan-300">{stage}</span>
            </div>
            <div className="space-y-2">
              {stages.map((item, index) => {
                const active = item.id === stage;
                const currentIndex = stages.findIndex((candidate) => candidate.id === stage);
                const complete = index < currentIndex;
                return (
                  <button
                    key={item.id}
                    onClick={() => setStage(item.id)}
                    className={`w-full text-left rounded-xl border p-3 transition ${active ? 'border-cyan-400/60 bg-cyan-400/10' : complete ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-gray-800 bg-black/20 hover:border-gray-700'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono text-xs ${active ? 'bg-cyan-400 text-gray-950' : complete ? 'bg-emerald-500/20 text-emerald-300' : 'bg-gray-800 text-gray-500'}`}>
                        {complete ? '✓' : String(index + 1).padStart(2, '0')}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-white">{item.label} IR</div>
                        <div className="text-xs text-gray-500 truncate">{item.detail}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-700 bg-gray-900/50 p-5">
              <h2 className="text-lg font-bold text-white mb-1">Content pack</h2>
              <p className="text-sm text-gray-500 mb-4">Recompose from shared narrative/evidence graphs; never simple crop-and-resize.</p>
              <div className="space-y-2">
                {outputs.map((output) => (
                  <button key={output.id} onClick={() => toggleOutput(output.id)} className={`w-full p-3 rounded-xl border text-left transition ${output.enabled ? 'border-purple-500/40 bg-purple-500/10' : 'border-gray-800 bg-black/20'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-white">{output.label}</div>
                        <div className="text-[11px] text-gray-500 font-mono">{output.aspect}</div>
                      </div>
                      <div className={`w-10 h-5 rounded-full p-0.5 transition ${output.enabled ? 'bg-purple-500' : 'bg-gray-700'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${output.enabled ? 'translate-x-5' : ''}`} />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-gray-700 bg-gray-900/50 p-5">
              <h2 className="text-lg font-bold text-white mb-3">Non-negotiable policies</h2>
              <div className="space-y-3">
                {policyRows.map(([name, status, detail]) => (
                  <div key={name} className="border-b border-gray-800 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-gray-200">{name}</span>
                      <span className={`text-[10px] font-mono tracking-wider ${status === 'BLOCKED' ? 'text-red-300' : status === 'REQUIRED' ? 'text-cyan-300' : status === 'GATED' ? 'text-amber-300' : 'text-purple-300'}`}>{status}</span>
                    </div>
                    <div className="text-[11px] text-gray-600 mt-1">{detail}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Studio;
