import React, { useState, useCallback } from 'react';
import { ImageFile, CreativeConcept, SocialCampaign } from '../types';
import { fileToBase64, editImage, generateImage, generateVideo, generateCreativeConcepts, generateSocialMetadata } from '../services/geminiService';
import { navigateTo } from '../services/config';
import { saveAsset, urlToBlob } from '../services/library';
import Spinner from './Spinner';
import LoadingOverlay from './LoadingOverlay';

interface StudioProps {
  onBack?: () => void;
}

interface PlatformStatus {
  name: string;
  status: 'idle' | 'uploading' | 'optimizing' | 'done';
}

const Studio: React.FC<StudioProps> = ({ onBack }) => {
  // Steps: 0: Hook Foundry, 1: Production, 2: Result, 3: Distribution
  const [step, setStep] = useState(0);
  
  // State for Step 0 (Ideation)
  const [topic, setTopic] = useState('');
  const [concepts, setConcepts] = useState<CreativeConcept[]>([]);
  const [selectedConcept, setSelectedConcept] = useState<CreativeConcept | null>(null);
  const [isGeneratingConcepts, setIsGeneratingConcepts] = useState(false);

  // State for Step 1 (Production)
  const [sourceImage, setSourceImage] = useState<ImageFile | null>(null);
  const [visualPrompt, setVisualPrompt] = useState('');
  
  // State for Step 2 (Result)
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  // State for Step 3 (Distribution)
  const [socialCampaign, setSocialCampaign] = useState<SocialCampaign | null>(null);
  const [isGeneratingSocial, setIsGeneratingSocial] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(new Date().toISOString().split('T')[0]);
  const [scheduleTime, setScheduleTime] = useState('18:00');
  
  const [platformStatuses, setPlatformStatuses] = useState<{ [key: string]: 'idle' | 'uploading' | 'optimizing' | 'done' }>({
    youtube: 'idle',
    instagram: 'idle',
    tiktok: 'idle'
  });
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPublished, setIsPublished] = useState(false);

  // General Loading/Error
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(true);

  // --- Handlers ---

  const handleGenerateConcepts = async () => {
    if (!topic) return;
    setIsGeneratingConcepts(true);
    setError(null);
    try {
      const generatedConcepts = await generateCreativeConcepts(topic);
      setConcepts(generatedConcepts);
    } catch (e: any) {
      setError("Failed to generate concepts. Try again.");
    } finally {
      setIsGeneratingConcepts(false);
    }
  };

  const handleSelectConcept = (concept: CreativeConcept) => {
    setSelectedConcept(concept);
    setVisualPrompt(concept.visualDescription);
    setStep(1); // Move to Production
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (files && files[0]) {
      const file = files[0];
      const base64 = await fileToBase64(file);
      setSourceImage({
        name: file.name,
        type: file.type,
        size: file.size,
        base64,
        url: URL.createObjectURL(file),
      });
    }
  };

  const handleGenerateAsset = async () => {
    if (!visualPrompt) return;
    setIsLoading(true);
    setLoadingMessage("Generating base asset with Imagen 3...");
    try {
      const url = await generateImage(visualPrompt);
      // Create a dummy file object for the generated image
      const file = await fetch(url).then(r => r.blob()).then(blobFile => new File([blobFile], "generated.jpg", { type: "image/jpeg" }));
      const base64 = await fileToBase64(file);
      setSourceImage({
        name: "generated.jpg",
        type: "image/jpeg",
        size: file.size,
        base64,
        url,
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProduceVideo = async () => {
    if (!sourceImage || !visualPrompt) return;
    
    setIsLoading(true);
    setError(null);
    setHasApiKey(true);
    
    try {
        const url = await generateVideo(sourceImage, visualPrompt, setLoadingMessage);
        setVideoUrl(url);
        setStep(2);
        try {
            const blob = await urlToBlob(url);
            await saveAsset({ type: 'video', mime: blob.type || 'video/mp4', data: blob, prompt: visualPrompt, model: 'veo' });
        } catch { /* library save is best-effort */ }
    } catch (e: any) {
        if (e.message === 'API_KEY_REQUIRED') {
            setHasApiKey(false);
            setError('API Key required for Veo.');
        } else if (e.message === 'API_KEY_INVALID') {
            setHasApiKey(false);
            setError('Invalid API Key.');
        } else {
            setError(e.message || 'Production failed.');
        }
    } finally {
        setIsLoading(false);
    }
  };

  const handleSelectApiKey = () => {
    setHasApiKey(true);
    setError(null);
    navigateTo('SETTINGS');
  };

  const handleStartDistribution = async () => {
     setStep(3);
     if (!selectedConcept) return;
     
     setIsGeneratingSocial(true);
     try {
        const campaign = await generateSocialMetadata(topic, selectedConcept.hook, selectedConcept.visualDescription);
        setSocialCampaign(campaign);
        try {
            const kit = (['youtube', 'instagram', 'tiktok'] as const)
              .map((p) => `## ${p.toUpperCase()}\n${campaign[p].caption}\n${campaign[p].hashtags.join(' ')}`)
              .join('\n\n');
            await saveAsset({ type: 'text', mime: 'text/plain', data: kit, prompt: `Social kit: ${topic}`, model: 'gemini', projectTopic: topic });
        } catch { /* library save is best-effort */ }
     } catch (e) {
        console.error(e);
        setError("Failed to generate social variants.");
     } finally {
        setIsGeneratingSocial(false);
     }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    
    // Simulate a sequential publishing process for visual effect
    const platforms = ['youtube', 'instagram', 'tiktok'];
    
    for (const platform of platforms) {
        setPlatformStatuses(prev => ({ ...prev, [platform]: 'uploading' }));
        await new Promise(resolve => setTimeout(resolve, 1500));
        setPlatformStatuses(prev => ({ ...prev, [platform]: 'optimizing' }));
        await new Promise(resolve => setTimeout(resolve, 1000));
        setPlatformStatuses(prev => ({ ...prev, [platform]: 'done' }));
    }

    setIsPublishing(false);
    setIsPublished(true);
  };

  const reset = () => {
    setStep(0);
    setVideoUrl(null);
    setSourceImage(null);
    setConcepts([]);
    setTopic('');
    setSocialCampaign(null);
    setPlatformStatuses({ youtube: 'idle', instagram: 'idle', tiktok: 'idle' });
    setIsPublished(false);
    setIsPublishing(false);
    setError(null);
  };

  // --- Render Steps ---

  const renderStep0 = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
        <h2 className="text-xl font-bold text-white mb-2">Hook Foundry</h2>
        <p className="text-gray-400 text-sm mb-4">Input a topic. The AI will generate viral-optimized concepts.</p>
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
                <div key={idx} className="bg-gray-900 border border-gray-700 hover:border-cyan-500 p-5 rounded-xl cursor-pointer transition-all group relative overflow-hidden" onClick={() => handleSelectConcept(concept)}>
                    <div className="absolute top-0 right-0 bg-gray-800 px-2 py-1 text-xs font-mono text-cyan-400 rounded-bl-lg border-b border-l border-gray-700">Score: {concept.viralScore}</div>
                    <h3 className="font-bold text-lg text-white mb-2 group-hover:text-cyan-400">{concept.title}</h3>
                    <div className="mb-3">
                        <span className="text-xs text-gray-500 uppercase tracking-wider font-bold">Hook</span>
                        <p className="text-gray-300 text-sm italic">"{concept.hook}"</p>
                    </div>
                    <div>
                        <span className="text-xs text-gray-500 uppercase tracking-wider font-bold">Visual</span>
                        <p className="text-gray-400 text-xs line-clamp-3">{concept.visualDescription}</p>
                    </div>
                </div>
            ))}
        </div>
      )}
    </div>
  );

  const renderStep1 = () => (
    <div className="h-full flex flex-col md:flex-row gap-6 animate-fade-in">
        <div className="md:w-1/2 flex flex-col gap-4">
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 flex-grow flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white">Production Setup</h2>
                    <button onClick={() => setStep(0)} className="text-xs text-gray-400 hover:text-white">Change Concept</button>
                </div>
                
                <div className="mb-4">
                    <label className="block text-xs font-mono text-gray-500 mb-1 uppercase">Selected Concept</label>
                    <div className="bg-gray-900/50 p-3 rounded border border-gray-700">
                        <p className="text-white font-medium text-sm">{selectedConcept?.title}</p>
                        <p className="text-gray-400 text-xs mt-1">"{selectedConcept?.hook}"</p>
                    </div>
                </div>

                <div className="mb-4 flex-grow">
                    <label className="block text-xs font-mono text-gray-500 mb-1 uppercase">Visual Prompt</label>
                    <textarea 
                        value={visualPrompt}
                        onChange={(e) => setVisualPrompt(e.target.value)}
                        className="w-full h-24 bg-gray-900 border border-gray-600 rounded p-3 text-sm text-gray-300 focus:border-cyan-500 outline-none resize-none"
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button 
                        onClick={handleGenerateAsset}
                        disabled={isLoading}
                        className="py-3 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white font-medium text-sm transition"
                    >
                        Generate Asset (Imagen)
                    </button>
                    <label className="py-3 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white font-medium text-sm transition cursor-pointer text-center">
                        Upload Asset
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileUpload(e.target.files)} />
                    </label>
                </div>
            </div>
        </div>

        <div className="md:w-1/2 flex flex-col gap-4">
            <div className="flex-grow bg-black rounded-xl border border-gray-800 flex items-center justify-center relative overflow-hidden min-h-[300px]">
                {sourceImage ? (
                    <img src={sourceImage.url} alt="Source" className="max-h-full max-w-full object-contain" />
                ) : (
                    <div className="text-center text-gray-600">
                        <p className="text-sm">No Asset Selected</p>
                    </div>
                )}
                {isLoading && <LoadingOverlay message={loadingMessage} />}
            </div>
            
            {error && (
                <div className="bg-red-900/20 border border-red-800 p-3 rounded text-red-400 text-sm flex justify-between items-center">
                    <span>{error}</span>
                    {!hasApiKey && <button onClick={handleSelectApiKey} className="text-white underline ml-2">Select Key</button>}
                </div>
            )}

            <button 
                onClick={handleProduceVideo}
                disabled={!sourceImage || isLoading}
                className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/20 transition-all transform active:scale-95 text-lg tracking-wide"
            >
                INITIATE VEO PRODUCTION
            </button>
        </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="h-full flex flex-col items-center justify-center animate-fade-in">
        <div className="max-w-md w-full bg-gray-800/50 border border-gray-700 rounded-2xl p-6 shadow-2xl">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Production Complete</h2>
            <div className="aspect-[9/16] bg-black rounded-lg overflow-hidden mb-6 ring-4 ring-gray-700">
                {videoUrl && (
                    <video src={videoUrl} controls autoPlay loop className="w-full h-full object-cover" />
                )}
            </div>
            <div className="grid grid-cols-2 gap-4">
                 <button onClick={reset} className="py-3 rounded-lg border border-gray-600 text-gray-300 hover:text-white font-medium">
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

  const renderStep3 = () => {
    if (isGeneratingSocial) {
        return (
            <div className="h-full flex flex-col items-center justify-center">
                <Spinner className="w-12 h-12 mb-4 text-cyan-400" />
                <p className="text-white text-lg">Generating platform variants...</p>
                <p className="text-gray-500 text-sm mt-2">Analyzing video content for viral hashtags.</p>
            </div>
        );
    }

    if (isPublished) {
         return (
            <div className="h-full flex flex-col items-center justify-center animate-fade-in">
                <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-green-500/40">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">Campaign Deployed</h2>
                <p className="text-gray-400 mb-8">Your content is now live across the network.</p>
                <div className="bg-gray-800 rounded-lg p-4 w-full max-w-md mb-8 border border-gray-700">
                    <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-400">Scheduled For:</span>
                        <span className="text-white font-mono">{scheduleDate} @ {scheduleTime}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                         <span className="text-gray-400">Platforms:</span>
                         <div className="flex gap-2">
                            <span className="text-red-400">YT</span>
                            <span className="text-pink-400">IG</span>
                            <span className="text-cyan-400">TK</span>
                         </div>
                    </div>
                </div>
                <button onClick={reset} className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition">Return to Studio</button>
            </div>
         );
    }

    return (
        <div className="h-full flex flex-col animate-fade-in">
            <div className="flex justify-between items-center mb-6 bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                 <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        Distribution Autopilot
                        <span className="px-2 py-0.5 rounded bg-blue-900/50 text-blue-400 text-xs border border-blue-800">BETA</span>
                    </h2>
                    <p className="text-gray-400 text-sm">Review generated metadata and schedule deployment.</p>
                 </div>
                 <div className="flex items-center gap-4">
                     <div className="flex items-center gap-2 bg-gray-900 px-3 py-2 rounded-lg border border-gray-700">
                        <span className="text-gray-400 text-xs uppercase font-bold">Schedule:</span>
                        <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="bg-transparent text-white text-sm outline-none border-none" />
                        <input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} className="bg-transparent text-white text-sm outline-none border-none" />
                     </div>
                     <button 
                        onClick={handlePublish}
                        disabled={isPublishing}
                        className="bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white font-bold px-6 py-2 rounded-lg transition shadow-lg shadow-green-900/20 flex items-center gap-2"
                     >
                        {isPublishing ? 'Deploying Sequence...' : 'Launch Campaign'}
                        {!isPublishing && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>}
                     </button>
                 </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow overflow-y-auto pb-4">
                {/* YouTube Card */}
                <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden flex flex-col relative">
                    {platformStatuses.youtube !== 'idle' && (
                        <div className="absolute inset-0 bg-black/80 z-10 flex flex-col items-center justify-center">
                            {platformStatuses.youtube === 'done' ? (
                                <div className="text-green-500 flex flex-col items-center"><svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>Scheduled</div>
                            ) : (
                                <div className="text-red-400 flex flex-col items-center"><Spinner className="mb-2"/>{platformStatuses.youtube === 'uploading' ? 'Uploading...' : 'Optimizing SEO...'}</div>
                            )}
                        </div>
                    )}
                    <div className="bg-red-900/20 border-b border-red-900/30 p-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg>
                        <h3 className="font-bold text-white">YouTube Shorts</h3>
                    </div>
                    <div className="p-4 flex-grow space-y-4">
                        <div>
                            <label className="block text-xs text-gray-500 uppercase font-bold mb-1">Caption</label>
                            <textarea 
                                defaultValue={socialCampaign?.youtube.caption}
                                className="w-full h-32 bg-gray-800 border border-gray-700 rounded p-3 text-sm text-gray-300 focus:border-red-500 outline-none resize-none"
                            />
                        </div>
                        <div>
                             <label className="block text-xs text-gray-500 uppercase font-bold mb-1">Keywords</label>
                             <div className="bg-gray-800 border border-gray-700 rounded p-2 min-h-[40px] flex flex-wrap gap-2">
                                {socialCampaign?.youtube.hashtags.map((tag, i) => (
                                    <span key={i} className="bg-red-900/30 text-red-300 text-xs px-2 py-1 rounded">#{tag}</span>
                                ))}
                             </div>
                        </div>
                    </div>
                </div>

                {/* Instagram Card */}
                <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden flex flex-col relative">
                     {platformStatuses.instagram !== 'idle' && (
                        <div className="absolute inset-0 bg-black/80 z-10 flex flex-col items-center justify-center">
                            {platformStatuses.instagram === 'done' ? (
                                <div className="text-green-500 flex flex-col items-center"><svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>Scheduled</div>
                            ) : (
                                <div className="text-pink-400 flex flex-col items-center"><Spinner className="mb-2"/>{platformStatuses.instagram === 'uploading' ? 'Uploading...' : 'Applying Filters...'}</div>
                            )}
                        </div>
                    )}
                     <div className="bg-pink-900/20 border-b border-pink-900/30 p-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-pink-500" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                        <h3 className="font-bold text-white">Instagram Reels</h3>
                    </div>
                     <div className="p-4 flex-grow space-y-4">
                        <div>
                            <label className="block text-xs text-gray-500 uppercase font-bold mb-1">Caption</label>
                            <textarea 
                                defaultValue={socialCampaign?.instagram.caption}
                                className="w-full h-32 bg-gray-800 border border-gray-700 rounded p-3 text-sm text-gray-300 focus:border-pink-500 outline-none resize-none"
                            />
                        </div>
                        <div>
                             <label className="block text-xs text-gray-500 uppercase font-bold mb-1">Hashtags</label>
                             <div className="bg-gray-800 border border-gray-700 rounded p-2 min-h-[40px] flex flex-wrap gap-2">
                                {socialCampaign?.instagram.hashtags.map((tag, i) => (
                                    <span key={i} className="bg-pink-900/30 text-pink-300 text-xs px-2 py-1 rounded">#{tag}</span>
                                ))}
                             </div>
                        </div>
                    </div>
                </div>

                {/* TikTok Card */}
                <div className="bg-gray-900 border border-gray-700 rounded-xl overflow-hidden flex flex-col relative">
                    {platformStatuses.tiktok !== 'idle' && (
                        <div className="absolute inset-0 bg-black/80 z-10 flex flex-col items-center justify-center">
                            {platformStatuses.tiktok === 'done' ? (
                                <div className="text-green-500 flex flex-col items-center"><svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>Scheduled</div>
                            ) : (
                                <div className="text-cyan-400 flex flex-col items-center"><Spinner className="mb-2"/>{platformStatuses.tiktok === 'uploading' ? 'Uploading...' : 'Syncing Audio...'}</div>
                            )}
                        </div>
                    )}
                     <div className="bg-cyan-900/20 border-b border-cyan-900/30 p-4 flex items-center gap-2">
                        <svg className="w-5 h-5 text-cyan-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93v6.16c0 2.52-1.12 4.84-2.98 6.37-1.48 1.23-3.38 1.94-5.45 1.99-2.41.04-4.78-1.03-6.26-2.83-1.51-1.84-2.18-4.26-1.8-6.6.42-2.57 2-4.81 4.22-6.11 1.37-.8 2.94-1.18 4.52-1.06.22.02.45.04.67.08v4.16c-1.11-.24-2.29-.16-3.31.26-1.08.44-1.93 1.27-2.38 2.36-.44 1.08-.42 2.31.07 3.37.48 1.04 1.39 1.86 2.52 2.19 1.15.34 2.4.19 3.45-.37 1.04-.56 1.77-1.52 1.94-2.68.04-.26.06-.52.06-.79V4.07c0-.04.01-.09.02-.13 1.21.02 2.43.01 3.64.01z"/></svg>
                        <h3 className="font-bold text-white">TikTok</h3>
                    </div>
                     <div className="p-4 flex-grow space-y-4">
                        <div>
                            <label className="block text-xs text-gray-500 uppercase font-bold mb-1">Caption</label>
                            <textarea 
                                defaultValue={socialCampaign?.tiktok.caption}
                                className="w-full h-32 bg-gray-800 border border-gray-700 rounded p-3 text-sm text-gray-300 focus:border-cyan-500 outline-none resize-none"
                            />
                        </div>
                        <div>
                             <label className="block text-xs text-gray-500 uppercase font-bold mb-1">Trending Tags</label>
                             <div className="bg-gray-800 border border-gray-700 rounded p-2 min-h-[40px] flex flex-wrap gap-2">
                                {socialCampaign?.tiktok.hashtags.map((tag, i) => (
                                    <span key={i} className="bg-cyan-900/30 text-cyan-400 text-xs px-2 py-1 rounded">#{tag}</span>
                                ))}
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
  };

  return (
    <div className="h-full p-1 flex flex-col">
      {step === 0 && renderStep0()}
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
    </div>
  );
};

export default Studio;