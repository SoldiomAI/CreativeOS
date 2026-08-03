import React, { useState } from 'react';
import { CreativeConcept, SocialCampaign, SocialMetadata, VideoProvider } from '../types';
import { generateCreativeConcepts, generateSocialMetadata } from '../services/geminiService';
import { addToLibrary } from '../services/libraryStore';
import {
  buildFallbackCampaign,
  copyToClipboard,
  downloadSocialExportPack,
  formatCaptionWithTags,
} from '../services/socialExport';
import { captureVideoCover, downloadCover } from '../services/coverFrame';
import { revokeObjectUrl } from '../services/utils';
import VideoCreator from './VideoCreator';
import Spinner from './Spinner';

type StudioMode = 'create' | 'ideate';

const PLATFORM_STATUS_COLOR: Record<string, string> = {
  youtube: 'text-red-400',
  instagram: 'text-pink-400',
  tiktok: 'text-cyan-400',
};

const Studio: React.FC = () => {
  const [mode, setMode] = useState<StudioMode>('create');
  const [step, setStep] = useState<'produce' | 'result' | 'distribute'>('produce');

  const [topic, setTopic] = useState('');
  const [concepts, setConcepts] = useState<CreativeConcept[]>([]);
  const [selectedConcept, setSelectedConcept] = useState<CreativeConcept | null>(null);
  const [isGeneratingConcepts, setIsGeneratingConcepts] = useState(false);
  const [seedPrompt, setSeedPrompt] = useState('');
  const [seedHook, setSeedHook] = useState('');

  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [usedPrompt, setUsedPrompt] = useState('');
  const [usedHook, setUsedHook] = useState('');
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [durationSec, setDurationSec] = useState(15);
  const [providerUsed, setProviderUsed] = useState<VideoProvider | null>(null);
  const [hasAudio, setHasAudio] = useState(false);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [copyNote, setCopyNote] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [usedGodMode, setUsedGodMode] = useState(false);

  const [socialCampaign, setSocialCampaign] = useState<SocialCampaign | null>(null);
  const [isGeneratingSocial, setIsGeneratingSocial] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().split('T')[0]);
  const [scheduleTime, setScheduleTime] = useState('18:00');
  const [platformStatuses, setPlatformStatuses] = useState<{
    [key: string]: 'idle' | 'uploading' | 'optimizing' | 'done';
  }>({
    youtube: 'idle',
    instagram: 'idle',
    tiktok: 'idle',
  });
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updatePlatform = (key: keyof SocialCampaign, patch: Partial<SocialMetadata>) => {
    setSocialCampaign((prev) => {
      if (!prev) return prev;
      return { ...prev, [key]: { ...prev[key], ...patch } };
    });
  };

  const handleGenerateConcepts = async () => {
    if (!topic) return;
    setIsGeneratingConcepts(true);
    setError(null);
    try {
      const generatedConcepts = await generateCreativeConcepts(topic);
      setConcepts(generatedConcepts);
    } catch {
      setError('Failed to generate concepts. You can still write a prompt manually in Create.');
    } finally {
      setIsGeneratingConcepts(false);
    }
  };

  const handleSelectConcept = (concept: CreativeConcept) => {
    setSelectedConcept(concept);
    setSeedPrompt(concept.visualDescription);
    setSeedHook(concept.hook);
    setMode('create');
    setStep('produce');
  };

  const handleVideoComplete = async (
    url: string,
    prompt: string,
    used: VideoProvider,
    audio: boolean,
    meta?: { aspectRatio: string; durationSec: number; hook: string; godMode?: boolean }
  ) => {
    revokeObjectUrl(videoUrl);
    revokeObjectUrl(coverUrl);
    setVideoUrl(url);
    setUsedPrompt(prompt);
    setUsedHook(meta?.hook || seedHook || selectedConcept?.hook || '');
    setAspectRatio(meta?.aspectRatio || '9:16');
    setDurationSec(meta?.durationSec || 15);
    setProviderUsed(used);
    setHasAudio(audio);
    setUsedGodMode(Boolean(meta?.godMode));
    setStep('result');
    setSavedNote(null);

    let coverDataUrl: string | undefined;
    try {
      const cover = await captureVideoCover(url, 0.8);
      setCoverUrl(cover.url);
      coverDataUrl = await fetch(cover.url)
        .then((r) => r.blob())
        .then(
          (blob) =>
            new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(String(reader.result));
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            })
        );
    } catch {
      setCoverUrl(null);
    }

    try {
      await addToLibrary(prompt, used, url, audio, {
        hook: meta?.hook || seedHook,
        aspectRatio: meta?.aspectRatio,
        durationSec: meta?.durationSec,
        coverDataUrl,
        godMode: meta?.godMode,
      });
      setSavedNote('Saved to Asset Library (IndexedDB)');
    } catch {
      setSavedNote('Created — library save skipped');
    }

    if (meta?.godMode) {
      const hookForSocial = meta?.hook || seedHook || selectedConcept?.hook || prompt.slice(0, 120);
      window.setTimeout(async () => {
        setStep('distribute');
        setIsGeneratingSocial(true);
        setError(null);
        try {
          const campaign = await generateSocialMetadata(
            topic || prompt.slice(0, 80),
            hookForSocial,
            selectedConcept?.visualDescription || prompt
          );
          setSocialCampaign(campaign);
        } catch {
          setSocialCampaign(buildFallbackCampaign(prompt, hookForSocial));
        } finally {
          setIsGeneratingSocial(false);
        }
      }, 350);
    }
  };

  const handleStartDistribution = async () => {
    setStep('distribute');
    setIsGeneratingSocial(true);
    setError(null);
    try {
      const campaign = await generateSocialMetadata(
        topic || usedPrompt.slice(0, 80),
        usedHook || selectedConcept?.hook || usedPrompt.slice(0, 120),
        selectedConcept?.visualDescription || usedPrompt
      );
      setSocialCampaign(campaign);
    } catch {
      setSocialCampaign(buildFallbackCampaign(usedPrompt, usedHook || selectedConcept?.hook));
      setError('Could not AI-generate captions — using marketing-style fallbacks.');
    } finally {
      setIsGeneratingSocial(false);
    }
  };

  const handleCopyPlatform = async (key: keyof SocialCampaign) => {
    if (!socialCampaign) return;
    const ok = await copyToClipboard(formatCaptionWithTags(socialCampaign[key]));
    setCopyNote(ok ? `Copied ${key} caption` : 'Clipboard unavailable');
    setTimeout(() => setCopyNote(null), 2000);
  };

  const handleExportPack = async () => {
    if (!videoUrl || !socialCampaign) return;
    setExporting(true);
    setError(null);
    try {
      await downloadSocialExportPack({
        videoUrl,
        prompt: usedPrompt,
        campaign: socialCampaign,
        hook: usedHook,
        provider: providerUsed || undefined,
        scheduledFor: `${scheduleDate} ${scheduleTime}`,
        aspectRatio,
        durationSec,
      });
      setCopyNote('Export pack downloaded (video + captions.txt + pack.json)');
      setTimeout(() => setCopyNote(null), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Export pack failed');
    } finally {
      setExporting(false);
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    const platforms = ['youtube', 'instagram', 'tiktok'];
    for (const platform of platforms) {
      setPlatformStatuses((prev) => ({ ...prev, [platform]: 'uploading' }));
      await new Promise((resolve) => setTimeout(resolve, 900));
      setPlatformStatuses((prev) => ({ ...prev, [platform]: 'optimizing' }));
      await new Promise((resolve) => setTimeout(resolve, 600));
      setPlatformStatuses((prev) => ({ ...prev, [platform]: 'done' }));
    }
    setIsPublishing(false);
    setIsPublished(true);
  };

  const reset = () => {
    revokeObjectUrl(videoUrl);
    revokeObjectUrl(coverUrl);
    setStep('produce');
    setMode('create');
    setVideoUrl(null);
    setCoverUrl(null);
    setUsedPrompt('');
    setUsedHook('');
    setProviderUsed(null);
    setHasAudio(false);
    setUsedGodMode(false);
    setSavedNote(null);
    setConcepts([]);
    setTopic('');
    setSelectedConcept(null);
    setSeedPrompt('');
    setSeedHook('');
    setSocialCampaign(null);
    setPlatformStatuses({ youtube: 'idle', instagram: 'idle', tiktok: 'idle' });
    setIsPublished(false);
    setIsPublishing(false);
    setError(null);
    setCopyNote(null);
  };

  if (step === 'result' && videoUrl) {
    return (
      <div className="h-full flex flex-col items-center justify-center cos-rise">
        <div className="max-w-md w-full cos-panel rounded-2xl p-6 shadow-2xl">
          <h2 className="cos-display text-3xl text-white mb-2 text-center">
            {usedGodMode ? 'God Mode Cut Ready' : 'Movie Ready'}
          </h2>
          <p className="text-center text-xs font-mono text-amber-200/80 mb-1">
            Provider: {providerUsed || 'unknown'}
            {hasAudio ? ' · with sound' : ''} · {aspectRatio} · ~{durationSec}s
            {usedGodMode ? ' · GOD' : ''}
          </p>
          {savedNote && (
            <p className="text-center text-[11px] text-mintx mb-3">{savedNote}</p>
          )}
          <div
            className={`bg-black rounded-lg overflow-hidden mb-4 ring-1 ring-amber-500/20 mx-auto ${
              aspectRatio === '16:9'
                ? 'aspect-video w-full'
                : aspectRatio === '1:1'
                  ? 'aspect-square max-w-sm'
                  : 'aspect-[9/16] max-w-sm'
            }`}
          >
            <video src={videoUrl} controls autoPlay loop className="w-full h-full object-cover" />
          </div>
          {coverUrl && (
            <div className="flex items-center gap-3 mb-4">
              <img src={coverUrl} alt="Cover" className="w-14 h-20 object-cover rounded border border-white/10" />
              <button
                type="button"
                className="text-xs text-amber-200 hover:underline"
                onClick={async () => {
                  const blob = await fetch(coverUrl).then((r) => r.blob());
                  downloadCover(blob);
                }}
              >
                Download cover frame
              </button>
            </div>
          )}
          <a
            href={videoUrl}
            download="creativeos-movie.webm"
            className="block text-center mb-4 text-sm text-amber-200 hover:underline"
          >
            Download movie
          </a>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={reset}
              className="py-3 rounded-xl cos-btn-ghost font-medium"
            >
              New Project
            </button>
            <button
              onClick={handleStartDistribution}
              className="py-3 rounded-xl cos-btn-primary"
            >
              Captions + Export
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'distribute') {
    if (isGeneratingSocial) {
      return (
        <div className="h-full flex flex-col items-center justify-center">
          <Spinner className="w-12 h-12 mb-4 text-cyan-400" />
          <p className="text-white text-lg">Generating platform variants...</p>
        </div>
      );
    }

    if (isPublished) {
      return (
        <div className="h-full flex flex-col items-center justify-center animate-fade-in">
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-green-500/40">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-3xl font-bold text-white mb-2">Demo Schedule Complete</h2>
          <p className="text-gray-400 mb-2 text-sm">
            Preview only — no real posts were published. Use Export Pack or a scheduler like{' '}
            <a
              className="text-cyan-400 underline"
              href="https://github.com/Anil-matcha/Free-AI-Social-Media-Scheduler"
              target="_blank"
              rel="noreferrer"
            >
              Free-AI-Social-Media-Scheduler
            </a>
            .
          </p>
          <p className="text-gray-500 mb-8 font-mono text-xs">
            {scheduleDate} @ {scheduleTime}
          </p>
          <button
            onClick={reset}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition"
          >
            Return to Studio
          </button>
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col animate-fade-in">
        {error && (
          <div className="mb-3 bg-amber-900/20 border border-amber-800 p-3 rounded text-amber-200 text-sm">
            {error}
          </div>
        )}
        {copyNote && (
          <div className="mb-3 bg-emerald-900/20 border border-emerald-800 p-3 rounded text-emerald-200 text-sm">
            {copyNote}
          </div>
        )}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-6 bg-gray-800/50 p-4 rounded-xl border border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Caption Studio
              <span className="px-2 py-0.5 rounded bg-amber-900/40 text-amber-300 text-[10px] border border-amber-800">
                DEMO PUBLISH
              </span>
            </h2>
            <p className="text-gray-400 text-sm">
              Edit captions, copy per platform, or download an export pack. Schedule is simulated.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-gray-900 px-3 py-2 rounded-lg border border-gray-700">
              <input
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="bg-transparent text-white text-sm outline-none"
              />
              <input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                className="bg-transparent text-white text-sm outline-none"
              />
            </div>
            <button
              onClick={handleExportPack}
              disabled={exporting || !socialCampaign}
              className="bg-cyan-700 hover:bg-cyan-600 disabled:bg-gray-600 text-white font-bold px-4 py-2 rounded-lg text-sm"
            >
              {exporting ? 'Exporting…' : 'Download Export Pack'}
            </button>
            <button
              onClick={handlePublish}
              disabled={isPublishing}
              className="bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white font-bold px-6 py-2 rounded-lg"
            >
              {isPublishing ? 'Simulating…' : 'Simulate Schedule'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow overflow-y-auto pb-4">
          {(
            [
              ['youtube', 'YouTube Shorts'],
              ['instagram', 'Instagram Reels'],
              ['tiktok', 'TikTok'],
            ] as const
          ).map(([key, title]) => (
            <div
              key={key}
              className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden flex flex-col relative"
            >
              {platformStatuses[key] !== 'idle' && (
                <div className="absolute inset-0 bg-black/80 z-10 flex flex-col items-center justify-center">
                  {platformStatuses[key] === 'done' ? (
                    <div className="text-green-500">Demo scheduled</div>
                  ) : (
                    <div className={`${PLATFORM_STATUS_COLOR[key]} flex flex-col items-center`}>
                      <Spinner className="mb-2" />
                      {platformStatuses[key]}
                    </div>
                  )}
                </div>
              )}
              <div className="p-4 border-b border-gray-800 flex items-center justify-between gap-2">
                <h3 className="font-bold text-white">{title}</h3>
                <button
                  type="button"
                  onClick={() => handleCopyPlatform(key)}
                  className="text-xs text-cyan-400 hover:underline"
                >
                  Copy
                </button>
              </div>
              <div className="p-4 space-y-3">
                <textarea
                  value={socialCampaign?.[key]?.caption || ''}
                  onChange={(e) => updatePlatform(key, { caption: e.target.value })}
                  className="w-full h-28 bg-gray-800 border border-gray-700 rounded p-3 text-sm text-gray-300 outline-none resize-none"
                />
                <div className="flex flex-wrap gap-2">
                  {(socialCampaign?.[key]?.hashtags || []).map((tag, i) => (
                    <span key={i} className="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-gray-500 mt-2 pb-2">
          Real posting:{' '}
          <a
            className="text-cyan-400 underline"
            href="https://github.com/Anil-matcha/Free-AI-Social-Media-Scheduler"
            target="_blank"
            rel="noreferrer"
          >
            Social Media Scheduler
          </a>
          {' · '}
          Long→shorts:{' '}
          <a
            className="text-cyan-400 underline"
            href="https://github.com/SamurAIGPT/AI-Youtube-Shorts-Generator"
            target="_blank"
            rel="noreferrer"
          >
            AI YouTube Shorts Generator
          </a>
          {' · '}
          Multi-model studio:{' '}
          <a
            className="text-cyan-400 underline"
            href="https://github.com/Anil-matcha/Open-Generative-AI"
            target="_blank"
            rel="noreferrer"
          >
            Open Generative AI
          </a>
        </p>
      </div>
    );
  }

  return (
    <div className="h-full p-1 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setMode('create')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
            mode === 'create'
              ? 'bg-cyan-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          Prompt → Movie
        </button>
        <button
          onClick={() => setMode('ideate')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
            mode === 'ideate'
              ? 'bg-cyan-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          Hook Foundry
        </button>
      </div>

      {error && mode === 'ideate' && (
        <div className="bg-red-900/20 border border-red-800 p-3 rounded text-red-300 text-sm">
          {error}
        </div>
      )}

      {mode === 'create' ? (
        <div className="flex-grow min-h-0">
          <VideoCreator
            key={`${seedPrompt}|${seedHook}`}
            initialPrompt={seedPrompt}
            initialHook={seedHook}
            onComplete={handleVideoComplete}
          />
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-2">Hook Foundry</h2>
            <p className="text-gray-400 text-sm mb-4">
              Generate viral concepts, then send one into Prompt → Movie (hook + visual prompt).
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. 'Cyberpunk Street Food', 'Productivity Hacks'"
                className="flex-grow bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <button
                onClick={handleGenerateConcepts}
                disabled={isGeneratingConcepts || !topic}
                className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white font-bold px-6 py-3 rounded-lg transition-colors flex items-center"
              >
                {isGeneratingConcepts ? <Spinner className="w-5 h-5" /> : 'Ignite'}
              </button>
            </div>
          </div>

          {concepts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {concepts.map((concept, idx) => (
                <div
                  key={idx}
                  className="bg-gray-900 border border-gray-700 hover:border-cyan-500 p-5 rounded-xl cursor-pointer transition-all group"
                  onClick={() => handleSelectConcept(concept)}
                >
                  <div className="text-xs font-mono text-cyan-400 mb-2">Score: {concept.viralScore}</div>
                  <h3 className="font-bold text-lg text-white mb-2 group-hover:text-cyan-400">
                    {concept.title}
                  </h3>
                  <p className="text-gray-300 text-sm italic mb-2">"{concept.hook}"</p>
                  <p className="text-gray-400 text-xs line-clamp-3">{concept.visualDescription}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Studio;
