import React, { useState } from 'react';
import { CreativeConcept, SocialCampaign, VideoProvider } from '../types';
import { generateCreativeConcepts, generateSocialMetadata } from '../services/geminiService';
import VideoCreator from './VideoCreator';
import Spinner from './Spinner';

type StudioMode = 'create' | 'ideate';

const Studio: React.FC = () => {
  const [mode, setMode] = useState<StudioMode>('create');
  const [step, setStep] = useState<'produce' | 'result' | 'distribute'>('produce');

  // Ideation
  const [topic, setTopic] = useState('');
  const [concepts, setConcepts] = useState<CreativeConcept[]>([]);
  const [selectedConcept, setSelectedConcept] = useState<CreativeConcept | null>(null);
  const [isGeneratingConcepts, setIsGeneratingConcepts] = useState(false);
  const [seedPrompt, setSeedPrompt] = useState('');

  // Result
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [usedPrompt, setUsedPrompt] = useState('');
  const [providerUsed, setProviderUsed] = useState<VideoProvider | null>(null);

  // Distribution
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
    setMode('create');
    setStep('produce');
  };

  const handleVideoComplete = (url: string, prompt: string, used: VideoProvider) => {
    setVideoUrl(url);
    setUsedPrompt(prompt);
    setProviderUsed(used);
    setStep('result');
  };

  const handleStartDistribution = async () => {
    setStep('distribute');
    setIsGeneratingSocial(true);
    try {
      const campaign = await generateSocialMetadata(
        topic || usedPrompt.slice(0, 80),
        selectedConcept?.hook || usedPrompt.slice(0, 120),
        selectedConcept?.visualDescription || usedPrompt
      );
      setSocialCampaign(campaign);
    } catch {
      setError('Failed to generate social variants.');
    } finally {
      setIsGeneratingSocial(false);
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    const platforms = ['youtube', 'instagram', 'tiktok'];
    for (const platform of platforms) {
      setPlatformStatuses((prev) => ({ ...prev, [platform]: 'uploading' }));
      await new Promise((resolve) => setTimeout(resolve, 1200));
      setPlatformStatuses((prev) => ({ ...prev, [platform]: 'optimizing' }));
      await new Promise((resolve) => setTimeout(resolve, 800));
      setPlatformStatuses((prev) => ({ ...prev, [platform]: 'done' }));
    }
    setIsPublishing(false);
    setIsPublished(true);
  };

  const reset = () => {
    setStep('produce');
    setMode('create');
    setVideoUrl(null);
    setUsedPrompt('');
    setProviderUsed(null);
    setConcepts([]);
    setTopic('');
    setSelectedConcept(null);
    setSeedPrompt('');
    setSocialCampaign(null);
    setPlatformStatuses({ youtube: 'idle', instagram: 'idle', tiktok: 'idle' });
    setIsPublished(false);
    setIsPublishing(false);
    setError(null);
  };

  if (step === 'result' && videoUrl) {
    return (
      <div className="h-full flex flex-col items-center justify-center animate-fade-in">
        <div className="max-w-md w-full bg-gray-800/50 border border-gray-700 rounded-2xl p-6 shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-2 text-center">Movie Ready</h2>
          <p className="text-center text-xs font-mono text-cyan-400 mb-4">
            Provider: {providerUsed || 'unknown'}
          </p>
          <div className="aspect-[9/16] bg-black rounded-lg overflow-hidden mb-6 ring-4 ring-gray-700">
            <video src={videoUrl} controls autoPlay loop className="w-full h-full object-cover" />
          </div>
          <a
            href={videoUrl}
            download="creativeos-video.webm"
            className="block text-center mb-4 text-sm text-cyan-400 hover:underline"
          >
            Download video
          </a>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={reset}
              className="py-3 rounded-lg border border-gray-600 text-gray-300 hover:text-white font-medium"
            >
              New Project
            </button>
            <button
              onClick={handleStartDistribution}
              className="py-3 rounded-lg bg-green-600 hover:bg-green-500 text-white font-bold shadow-lg shadow-green-900/20"
            >
              Distribute
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
          <h2 className="text-3xl font-bold text-white mb-2">Campaign Deployed</h2>
          <p className="text-gray-400 mb-8">
            Scheduled {scheduleDate} @ {scheduleTime}
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
        <div className="flex justify-between items-center mb-6 bg-gray-800/50 p-4 rounded-xl border border-gray-700">
          <div>
            <h2 className="text-xl font-bold text-white">Distribution Autopilot</h2>
            <p className="text-gray-400 text-sm">Review metadata and schedule deployment.</p>
          </div>
          <div className="flex items-center gap-4">
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
              onClick={handlePublish}
              disabled={isPublishing}
              className="bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white font-bold px-6 py-2 rounded-lg"
            >
              {isPublishing ? 'Deploying…' : 'Launch Campaign'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow overflow-y-auto pb-4">
          {(
            [
              ['youtube', 'YouTube Shorts', 'red'],
              ['instagram', 'Instagram Reels', 'pink'],
              ['tiktok', 'TikTok', 'cyan'],
            ] as const
          ).map(([key, title, color]) => (
            <div
              key={key}
              className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden flex flex-col relative"
            >
              {platformStatuses[key] !== 'idle' && (
                <div className="absolute inset-0 bg-black/80 z-10 flex flex-col items-center justify-center">
                  {platformStatuses[key] === 'done' ? (
                    <div className="text-green-500">Scheduled</div>
                  ) : (
                    <div className={`text-${color}-400 flex flex-col items-center`}>
                      <Spinner className="mb-2" />
                      {platformStatuses[key]}
                    </div>
                  )}
                </div>
              )}
              <div className="p-4 border-b border-gray-800">
                <h3 className="font-bold text-white">{title}</h3>
              </div>
              <div className="p-4 space-y-3">
                <textarea
                  defaultValue={socialCampaign?.[key].caption}
                  className="w-full h-28 bg-gray-800 border border-gray-700 rounded p-3 text-sm text-gray-300 outline-none resize-none"
                />
                <div className="flex flex-wrap gap-2">
                  {socialCampaign?.[key].hashtags.map((tag, i) => (
                    <span key={i} className="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
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

      {error && (
        <div className="bg-red-900/20 border border-red-800 p-3 rounded text-red-300 text-sm">
          {error}
        </div>
      )}

      {mode === 'create' ? (
        <div className="flex-grow min-h-0">
          <VideoCreator
            key={seedPrompt}
            initialPrompt={seedPrompt}
            onComplete={handleVideoComplete}
          />
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <h2 className="text-xl font-bold text-white mb-2">Hook Foundry</h2>
            <p className="text-gray-400 text-sm mb-4">
              Generate viral concepts, then send one into Create Video.
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
