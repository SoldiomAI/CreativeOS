import React, { useCallback, useEffect, useState } from 'react';
import { takeContentFactorySeed } from '../services/appFlow';
import {
  advanceContentProject,
  chatContentProject,
  createContentProject,
  getContentProject,
  listContentProjects,
  pingContentFactory,
  setServerDeployMode,
} from '../services/contentFactoryService';
import {
  DEPLOYMENT_MODES,
  getDeploymentMode,
  setDeploymentMode,
} from '../services/deploymentModeService';
import {
  addCalendarEntry,
  getCalendarEntries,
  getContentSeries,
  getCreatorProfile,
} from '../services/contentCalendarStore';
import {
  CONTENT_STAGES,
  ContentStage,
  DeploymentMode,
  ProjectManifest,
  ScfHealth,
} from '../types/contentFactory';

const INPUT_MODES = [
  { id: 'idea', label: 'Idea' },
  { id: 'url', label: 'URL' },
  { id: 'upload', label: 'Upload' },
  { id: 'github', label: 'GitHub' },
  { id: 'research', label: 'Research' },
  { id: 'video', label: 'Video' },
] as const;

const ContentFactory: React.FC = () => {
  const [health, setHealth] = useState<ScfHealth | null>(null);
  const [deployMode, setDeployModeState] = useState<DeploymentMode>(getDeploymentMode());
  const [inputMode, setInputMode] = useState<(typeof INPUT_MODES)[number]['id']>('idea');
  const [prompt, setPrompt] = useState('');
  const [url, setUrl] = useState('');
  const [repo, setRepo] = useState('');
  const [language, setLanguage] = useState<'ar' | 'en' | 'bilingual'>('en');
  const [goal, setGoal] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<ProjectManifest | null>(null);
  const [projects, setProjects] = useState<
    { id: string; slug: string; stage: ContentStage; hook?: string; updated_at: string }[]
  >([]);
  const [chat, setChat] = useState('');
  const [chatLog, setChatLog] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    pingContentFactory().then(setHealth);
    listContentProjects().then(setProjects);
  }, []);

  useEffect(() => {
    const seed = takeContentFactorySeed();
    if (seed?.prompt) setPrompt(seed.prompt);
    if (seed?.url) {
      setUrl(seed.url);
      setInputMode('url');
    }
    if (seed?.repo) {
      setRepo(seed.repo);
      setInputMode('github');
    }
    if (seed?.language) setLanguage(seed.language);
    if (seed?.goal) setGoal(seed.goal);
    refresh();
  }, [refresh]);

  const stageIndex = project ? CONTENT_STAGES.findIndex((s) => s.id === project.stage) : -1;

  const handleCreate = async () => {
    if (!prompt.trim() && !url.trim() && !repo.trim()) {
      setError('Describe what you want to create — one sentence is enough.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const manifest = await createContentProject({
        prompt: prompt.trim(),
        url: url.trim() || undefined,
        repo: repo.trim() || undefined,
        brand: 'soldiom',
        goal: goal || undefined,
        language,
        formats: ['instagram_carousel', 'reel_30', 'reel_60', 'tiktok', 'linkedin_post', 'x_thread'],
        evidence_required: true,
        run_full: true,
      });
      setProject(manifest);
      addCalendarEntry({
        title: manifest.chosen_hook || prompt.slice(0, 60) || manifest.slug,
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        format: 'instagram_carousel',
        projectId: manifest.id,
        status: manifest.stage === 'export' ? 'queued' : 'planned',
      });
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Content Factory create failed');
    } finally {
      setBusy(false);
    }
  };

  const handleAdvance = async () => {
    if (!project) return;
    setBusy(true);
    try {
      const next = await advanceContentProject(project.id);
      setProject(next);
      await refresh();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Advance failed');
    } finally {
      setBusy(false);
    }
  };

  const handleChat = async () => {
    if (!project || !chat.trim()) return;
    setBusy(true);
    const instruction = chat.trim();
    setChat('');
    try {
      const next = await chatContentProject(project.id, instruction);
      setProject(next);
      setChatLog((log) => [`You: ${instruction}`, `System: re-render triggered → ${next.stage}`, ...log].slice(0, 12));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Chat modify failed');
    } finally {
      setBusy(false);
    }
  };

  const handleDeployMode = async (mode: DeploymentMode) => {
    setDeployModeState(mode);
    setDeploymentMode(mode);
    try {
      if (health?.ok) await setServerDeployMode(mode);
    } catch {
      /* server may be offline — client mode still saved */
    }
    pingContentFactory().then(setHealth);
  };

  const loadProject = async (id: string) => {
    setBusy(true);
    try {
      setProject(await getContentProject(id));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Load failed');
    } finally {
      setBusy(false);
    }
  };

  const creator = getCreatorProfile();
  const series = getContentSeries();
  const calendar = getCalendarEntries().slice(0, 5);

  return (
    <div className="h-full overflow-y-auto cos-scroll p-1 space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <p className="text-[11px] tracking-[0.35em] uppercase text-amber-200/70 mb-2">
            SOLDIOM Content Factory
          </p>
          <h2 className="cos-display text-4xl md:text-5xl text-[#f7f3ea]">
            Universal deterministic studio
          </h2>
          <p className="text-[#9aa8bc] mt-2 text-sm max-w-2xl">
            AI directs research, strategy, and storyboard — the renderer draws reproducible pixels.
            Pillow RTL · Playwright capture · ElevenLabs voice · local / RunPod / GCP.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span
            className={`text-[10px] font-mono uppercase px-2 py-1 rounded border ${
              health?.ok
                ? 'text-emerald-400 border-emerald-500/30'
                : 'text-rose-400 border-rose-500/30'
            }`}
          >
            {health?.ok ? `${health.deployment_mode || deployMode} · online` : 'offline'}
          </span>
          {health?.libraqm !== undefined && (
            <span className="text-[10px] font-mono text-white/40">
              libraqm {health.libraqm ? 'ON' : 'OFF'}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          <div className="cos-panel rounded-2xl p-6 space-y-4">
            <label className="block text-sm text-white/80">What do you want to create today?</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              placeholder='e.g. "Explain why sovereign AI matters for GCC governments" or "Make content about my new company"'
              className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-amber-500/50"
            />
            <div className="flex flex-wrap gap-2">
              {INPUT_MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setInputMode(m.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs border ${
                    inputMode === m.id
                      ? 'border-amber-500/50 text-amber-200 bg-amber-500/10'
                      : 'border-white/10 text-white/50'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            {(inputMode === 'url' || url) && (
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              />
            )}
            {(inputMode === 'github' || repo) && (
              <input
                value={repo}
                onChange={(e) => setRepo(e.target.value)}
                placeholder="https://github.com/org/repo"
                className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              />
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] uppercase text-white/40">Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as typeof language)}
                  className="w-full mt-1 bg-black/30 border border-white/10 rounded-lg px-2 py-2 text-sm text-white"
                >
                  <option value="en">English</option>
                  <option value="ar">Arabic</option>
                  <option value="bilingual">Bilingual</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase text-white/40">Goal</label>
                <select
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  className="w-full mt-1 bg-black/30 border border-white/10 rounded-lg px-2 py-2 text-sm text-white"
                >
                  <option value="">Auto</option>
                  <option value="viral">Viral social</option>
                  <option value="executive">Executive</option>
                  <option value="product-launch">Product launch</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-[10px] uppercase text-white/40">Deploy mode</label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {DEPLOYMENT_MODES.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleDeployMode(m.id)}
                      className={`px-2 py-1.5 rounded-lg text-[11px] border ${
                        deployMode === m.id
                          ? 'border-cyan-500/50 text-cyan-200'
                          : 'border-white/10 text-white/45'
                      }`}
                      title={m.blurb}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={handleCreate}
              className="cos-btn-primary px-6 py-3 rounded-xl disabled:opacity-50"
            >
              {busy ? 'Running pipeline…' : 'Create content pack'}
            </button>
            {error && <p className="text-sm text-rose-300">{error}</p>}
          </div>

          <div className="cos-panel rounded-2xl p-5">
            <h3 className="cos-display text-xl mb-4">Production pipeline</h3>
            <div className="flex flex-wrap gap-1">
              {CONTENT_STAGES.map((s, i) => {
                const done = stageIndex >= i;
                const active = project?.stage === s.id;
                return (
                  <div
                    key={s.id}
                    className={`px-2 py-1 rounded text-[10px] uppercase tracking-wider border ${
                      active
                        ? 'border-amber-400 text-amber-200 bg-amber-500/10'
                        : done
                          ? 'border-emerald-500/30 text-emerald-300/80'
                          : 'border-white/10 text-white/30'
                    }`}
                  >
                    {s.label}
                  </div>
                );
              })}
            </div>
            {project && (
              <div className="mt-4 space-y-3 text-sm text-[#9aa8bc]">
                <p>
                  <span className="text-white/50">Project</span>{' '}
                  <span className="font-mono text-amber-200/90">{project.slug}</span> · stage{' '}
                  <span className="text-white">{project.stage}</span>
                </p>
                {project.chosen_hook && (
                  <p>
                    <span className="text-white/50">Hook</span> {project.chosen_hook}
                  </p>
                )}
                {project.content_pack && project.content_pack.length > 0 && (
                  <div>
                    <p className="text-white/50 mb-1">Content pack ({project.content_pack.length})</p>
                    <div className="flex flex-wrap gap-1">
                      {project.content_pack.slice(0, 8).map((item) => (
                        <span
                          key={item.format}
                          className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10"
                        >
                          {item.format.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {project.qa && (
                  <p>
                    QA:{' '}
                    <span
                      className={
                        project.qa.status === 'pass'
                          ? 'text-emerald-400'
                          : project.qa.status === 'warn'
                            ? 'text-amber-300'
                            : 'text-rose-400'
                      }
                    >
                      {project.qa.status.toUpperCase()}
                    </span>
                    {project.qa.issues?.length ? ` (${project.qa.issues.length} issues)` : ''}
                  </p>
                )}
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    disabled={busy || project.stage === 'export'}
                    onClick={handleAdvance}
                    className="px-3 py-2 rounded-lg border border-white/10 text-xs hover:border-amber-500/30"
                  >
                    Advance stage
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="cos-panel rounded-2xl p-5">
            <h3 className="cos-display text-xl mb-3">Creator chat</h3>
            <p className="text-xs text-[#9aa8bc] mb-3">
              Modify the project structure — premium tone, shorter cuts, Kuwaiti Arabic, LinkedIn version…
            </p>
            <div className="flex gap-2">
              <input
                value={chat}
                onChange={(e) => setChat(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleChat()}
                placeholder="Make this more premium…"
                disabled={!project || busy}
                className="flex-grow bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white disabled:opacity-40"
              />
              <button
                type="button"
                disabled={!project || busy}
                onClick={handleChat}
                className="px-4 py-2 rounded-lg border border-white/10 text-sm disabled:opacity-40"
              >
                Apply
              </button>
            </div>
            {chatLog.length > 0 && (
              <div className="mt-3 space-y-1 text-[11px] font-mono text-white/45">
                {chatLog.map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="cos-panel rounded-2xl p-5">
            <h3 className="cos-display text-lg mb-3">Brand & series</h3>
            <p className="text-xs text-[#9aa8bc] mb-2">
              Brand: <span className="text-amber-200">soldiom</span> · {creator.writingStyle}
            </p>
            <ul className="space-y-2">
              {series.map((s) => (
                <li key={s.id} className="text-sm text-white/70 border border-white/5 rounded-lg px-3 py-2">
                  {s.name}
                  <span className="block text-[10px] text-white/35">{s.theme}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="cos-panel rounded-2xl p-5">
            <h3 className="cos-display text-lg mb-3">Content calendar</h3>
            {!calendar.length ? (
              <p className="text-xs text-[#9aa8bc]">Create a pack to schedule entries.</p>
            ) : (
              <ul className="space-y-2">
                {calendar.map((c) => (
                  <li key={c.id} className="text-xs text-[#9aa8bc] border-b border-white/5 pb-2">
                    <span className="text-white/80">{c.title}</span>
                    <span className="block font-mono text-[10px]">
                      {new Date(c.scheduledAt).toLocaleDateString()} · {c.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="cos-panel rounded-2xl p-5">
            <h3 className="cos-display text-lg mb-3">Recent projects</h3>
            {!projects.length ? (
              <p className="text-xs text-[#9aa8bc]">
                {health?.ok ? 'No projects yet.' : 'Start API: npm run content-factory'}
              </p>
            ) : (
              <ul className="space-y-2">
                {projects.slice(0, 8).map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => loadProject(p.id)}
                      className="w-full text-left text-sm text-white/80 hover:text-amber-200"
                    >
                      {p.slug}
                      <span className="block text-[10px] font-mono text-white/35">
                        {p.stage} · {p.hook?.slice(0, 40) || p.id}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="cos-panel rounded-2xl p-5 text-xs text-[#9aa8bc] space-y-2">
            <p className="text-white/50 uppercase tracking-wider text-[10px]">Architecture</p>
            <p>Intelligence → structured JSON → deterministic renderer (Pillow today, SVG/HTML later).</p>
            <p>Zero hallucination visuals: no gen-AI for Arabic text, charts, or logos.</p>
            <p className="font-mono text-[10px]">content create &quot;…&quot; --brand soldiom --formats all</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentFactory;
