import React, { useEffect, useState } from 'react';
import { CreativeConcept, ImageFile, SocialCampaign, SocialMetadata, VideoProvider } from '../types';
import { generateCreativeConcepts, generateSocialMetadata } from '../services/geminiService';
import {
  addToLibrary,
  getLibraryItem,
  recordLibraryPublish,
  updateLibraryCaptions,
} from '../services/libraryStore';
import { takeDistributeSeed, takeStudioSeed } from '../services/appFlow';
import {
  buildFallbackCampaign,
  copyToClipboard,
  downloadSocialExportPack,
  downloadTextFile,
  formatCaptionWithTags,
} from '../services/socialExport';
import { captureVideoCover, downloadCover } from '../services/coverFrame';
import { publishForReal, PlatformPublishStatus } from '../services/publishService';
import { buildPublishCliScript, getConnectorAvailability } from '../services/connectorService';
import { getGoogleOAuthClientId } from '../services/youtubeService';
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
  const [seedImages, setSeedImages] = useState<ImageFile[]>([]);
  const [libraryItemId, setLibraryItemId] = useState<string | null>(null);

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
  const [platformStatuses, setPlatformStatuses] = useState<Record<string, PlatformPublishStatus>>({
    youtube: 'idle',
    instagram: 'idle',
    tiktok: 'idle',
  });
  const [platformMessages, setPlatformMessages] = useState<Record<string, string>>({});
  const [platformRoutes, setPlatformRoutes] = useState<Record<string, string>>({});
  const [publishLinks, setPublishLinks] = useState<Record<string, string>>({});
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updatePlatform = (key: keyof SocialCampaign, patch: Partial<SocialMetadata>) => {
    setSocialCampaign((prev) => {
      if (!prev) return prev;
      return { ...prev, [key]: { ...prev[key], ...patch } };
    });
  };

  // Consume cross-tab seeds: remix/animate from Dashboard, Library or Stills,
  // or jump straight into Caption Studio to (re)publish a saved movie.
  useEffect(() => {
    const studio = takeStudioSeed();
    if (studio) {
      setSeedPrompt(studio.prompt || '');
      setSeedHook(studio.hook || '');
      setSeedImages(studio.images || []);
      setMode('create');
      setStep('produce');
      return;
    }

    const dist = takeDistributeSeed();
    if (!dist) return;
    void (async () => {
      const item = await getLibraryItem(dist.libraryItemId);
      if (!item?.videoDataUrl) {
        setError('This library item has no stored video — create a new movie instead.');
        return;
      }
      setLibraryItemId(item.id);
      setVideoUrl(item.videoDataUrl);
      setUsedPrompt(item.prompt);
      setUsedHook(item.hook || '');
      setAspectRatio(item.aspectRatio || '9:16');
      setDurationSec(item.durationSec || 15);
      setProviderUsed(item.provider);
      setHasAudio(item.hasAudio);
      setUsedGodMode(Boolean(item.godMode));
      setCoverUrl(item.coverDataUrl || null);
      setStep('distribute');
      if (item.captions) {
        setSocialCampaign(item.captions);
        return;
      }
      setIsGeneratingSocial(true);
      try {
        const campaign = await generateSocialMetadata(
          item.prompt.slice(0, 80),
          item.hook || item.prompt.slice(0, 120),
          item.prompt
        );
        setSocialCampaign(campaign);
        await updateLibraryCaptions(item.id, campaign);
      } catch {
        setSocialCampaign(buildFallbackCampaign(item.prompt, item.hook));
      } finally {
        setIsGeneratingSocial(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    let savedId: string | null = null;
    try {
      const { id } = await addToLibrary(prompt, used, url, audio, {
        hook: meta?.hook || seedHook,
        aspectRatio: meta?.aspectRatio,
        durationSec: meta?.durationSec,
        coverDataUrl,
        godMode: meta?.godMode,
      });
      savedId = id;
      setLibraryItemId(id);
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
          if (savedId) await updateLibraryCaptions(savedId, campaign);
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
      if (libraryItemId) await updateLibraryCaptions(libraryItemId, campaign);
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

  const handleDownloadCliScript = () => {
    if (!socialCampaign) return;
    const script = buildPublishCliScript({
      prompt: usedPrompt,
      hook: usedHook,
      campaign: socialCampaign,
      scheduleAtIso: `${scheduleDate}T${scheduleTime}:00`,
    });
    downloadTextFile(script, 'creativeos-publish.sh');
    setCopyNote('publish.sh downloaded — run it next to the movie file (chmod +x first)');
    setTimeout(() => setCopyNote(null), 4000);
  };

  const handlePublish = async () => {
    if (!videoUrl || !socialCampaign) return;
    setIsPublishing(true);
    setError(null);
    setPublishLinks({});
    setPlatformMessages({});
    setPlatformRoutes({});
    setPlatformStatuses({ youtube: 'idle', instagram: 'idle', tiktok: 'idle' });

    try {
      const { results, youtube } = await publishForReal({
        videoUrl,
        campaign: socialCampaign,
        prompt: usedPrompt,
        hook: usedHook,
        scheduleDate,
        scheduleTime,
        onPlatform: (platform, status, message) => {
          setPlatformStatuses((prev) => ({ ...prev, [platform]: status }));
          setPlatformMessages((prev) => ({ ...prev, [platform]: message }));
        },
      });

      const links: Record<string, string> = {};
      if (youtube?.url) links.youtube = youtube.url;
      setPublishLinks(links);
      const routes: Record<string, string> = {};
      for (const r of results) if (r.via) routes[r.platform] = r.via;
      setPlatformRoutes(routes);

      // Write outcomes back to the Asset Library (outcome ledger).
      if (libraryItemId) {
        await updateLibraryCaptions(libraryItemId, socialCampaign);
        await recordLibraryPublish(
          libraryItemId,
          results
            .filter((r) => r.status === 'done')
            .map((r) => ({ platform: r.platform, via: r.via || 'unknown', url: r.url, at: Date.now() }))
        );
      }

      const hardFail = results.filter((r) => r.status === 'error');
      if (hardFail.length === results.length) {
        setError(hardFail.map((r) => `${r.platform}: ${r.message}`).join('\n'));
      } else {
        setIsPublished(true);
        if (hardFail.length) {
          setError(hardFail.map((r) => `${r.platform}: ${r.message}`).join('\n'));
        }
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Publish failed');
    } finally {
      setIsPublishing(false);
    }
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
    setSeedImages([]);
    setLibraryItemId(null);
    setSocialCampaign(null);
    setPlatformStatuses({ youtube: 'idle', instagram: 'idle', tiktok: 'idle' });
    setPlatformMessages({});
    setPlatformRoutes({});
    setPublishLinks({});
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
        <div className="h-full flex flex-col items-center justify-center cos-rise">
          <div className="w-20 h-20 bg-amber-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-amber-500/40">
            <svg className="w-10 h-10 text-ink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="cos-display text-3xl text-white mb-2">Published for real</h2>
          <p className="text-[#9aa8bc] mb-2 text-sm text-center max-w-md">
            YouTube uses Google OAuth + YouTube Data API. Instagram/TikTok use your device share sheet when
            available.
          </p>
          <p className="text-white/50 mb-4 font-mono text-xs">
            {scheduleDate} @ {scheduleTime}
          </p>
          {publishLinks.youtube && (
            <a
              href={publishLinks.youtube}
              target="_blank"
              rel="noreferrer"
              className="mb-6 text-amber-200 underline text-sm"
            >
              Open YouTube Short
            </a>
          )}
          {error && (
            <p className="text-amber-200/90 text-xs mb-4 max-w-md text-center whitespace-pre-wrap">{error}</p>
          )}
          <div className="space-y-2 text-xs text-[#9aa8bc] mb-8">
            {(['youtube', 'instagram', 'tiktok'] as const).map((p) => (
              <div key={p}>
                <span className="text-white/70 uppercase tracking-wider mr-2">{p}</span>
                {platformRoutes[p] && (
                  <span className="mr-2 px-1.5 py-0.5 rounded bg-white/10 text-[10px] uppercase tracking-wider text-amber-200">
                    via {platformRoutes[p]}
                  </span>
                )}
                {platformMessages[p] || platformStatuses[p]}
              </div>
            ))}
          </div>
          <button onClick={reset} className="px-8 py-3 cos-btn-primary rounded-xl">
            Return to Studio
          </button>
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col animate-fade-in">
        {error && (
          <div className="mb-3 bg-amber-900/20 border border-amber-800 p-3 rounded text-amber-200 text-sm whitespace-pre-wrap">
            {error}
          </div>
        )}
        {copyNote && (
          <div className="mb-3 bg-emerald-900/20 border border-emerald-800 p-3 rounded text-emerald-200 text-sm">
            {copyNote}
          </div>
        )}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-6 cos-panel p-4 rounded-xl">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Caption Studio
              <span className="px-2 py-0.5 rounded bg-emerald-900/40 text-emerald-300 text-[10px] border border-emerald-800">
                REAL PUBLISH
              </span>
            </h2>
            <p className="text-gray-400 text-sm">
              Publish tries every configured route in order: direct API → scheduler API → MCP/webhook →
              share sheet → manual. There is always a fallback.
              {!getGoogleOAuthClientId() && (
                <span className="text-amber-300"> Add Google OAuth Client ID in Optimization first.</span>
              )}
            </p>
            <p className="text-[11px] font-mono mt-1 space-x-3">
              {(() => {
                const a = getConnectorAvailability();
                const chip = (label: string, on: boolean) => (
                  <span key={label} className={on ? 'text-emerald-400' : 'text-gray-600'}>
                    {on ? '●' : '○'} {label}
                  </span>
                );
                return [
                  chip('YouTube API', Boolean(getGoogleOAuthClientId())),
                  chip('Scheduler API', a.scheduler),
                  chip('MCP/Webhook', a.mcp),
                  chip('Share sheet', a.share),
                  chip('CLI + Manual', true),
                ];
              })()}
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
              onClick={handleDownloadCliScript}
              disabled={!socialCampaign}
              title="Generate publish.sh: ffmpeg transcode + youtubeuploader + scheduler/webhook curl — run from terminal or cron"
              className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 border border-gray-600 text-gray-200 font-bold px-4 py-2 rounded-lg text-sm"
            >
              CLI script
            </button>
            <button
              onClick={handlePublish}
              disabled={isPublishing}
              className="cos-btn-primary disabled:opacity-50 text-ink font-bold px-6 py-2 rounded-lg"
            >
              {isPublishing ? 'Publishing…' : 'Publish for real'}
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
                <div className="absolute inset-0 bg-black/80 z-10 flex flex-col items-center justify-center p-4 text-center">
                  {platformStatuses[key] === 'done' ? (
                    <div className="text-emerald-400 text-sm">
                      {platformRoutes[key] && (
                        <span className="block mb-1 text-[10px] uppercase tracking-wider text-amber-200">
                          via {platformRoutes[key]}
                        </span>
                      )}
                      {platformMessages[key] || 'Done'}
                      {publishLinks[key] && (
                        <a
                          className="block mt-2 underline text-amber-200"
                          href={publishLinks[key]}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open
                        </a>
                      )}
                    </div>
                  ) : platformStatuses[key] === 'error' || platformStatuses[key] === 'skipped' ? (
                    <div className="text-amber-200 text-xs whitespace-pre-wrap">
                      {platformMessages[key] || platformStatuses[key]}
                    </div>
                  ) : (
                    <div className={`${PLATFORM_STATUS_COLOR[key]} flex flex-col items-center text-xs`}>
                      <Spinner className="mb-2" />
                      {platformMessages[key] || platformStatuses[key]}
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
          Google power: YouTube Data API v3 + Gemini captions. Enable YouTube Data API and set OAuth Web Client
          ID (authorized JS origin <span className="text-gray-300">http://localhost:5173</span>).
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
            key={`${seedPrompt}|${seedHook}|${seedImages.length}`}
            initialPrompt={seedPrompt}
            initialHook={seedHook}
            initialImages={seedImages}
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
