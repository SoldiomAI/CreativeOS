import React, { useEffect, useRef, useState } from 'react';
import { ImageFile, VideoProvider } from '../types';
import { fileToBase64, generateImage } from '../services/geminiService';
import { generateAnyVideo, VIDEO_PROVIDERS } from '../services/videoEngine';
import { getStoredHfToken, setStoredHfToken } from '../services/hfVideoService';
import { generateImageWithComfy } from '../services/comfyService';
import { isSpeechDictationSupported, startPromptDictation } from '../services/speechDictation';
import { revokeObjectUrl, safeErrorMessage } from '../services/utils';
import Spinner from './Spinner';
import LoadingOverlay from './LoadingOverlay';

interface VideoCreatorProps {
  initialPrompt?: string;
  onComplete: (
    videoUrl: string,
    prompt: string,
    providerUsed: VideoProvider,
    hasAudio: boolean
  ) => void;
}

const VideoCreator: React.FC<VideoCreatorProps> = ({ initialPrompt = '', onComplete }) => {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [images, setImages] = useState<ImageFile[]>([]);
  const [provider, setProvider] = useState<VideoProvider>('auto');
  const [hfToken, setHfToken] = useState(getStoredHfToken());
  const [showToken, setShowToken] = useState(false);
  const [soundtrack, setSoundtrack] = useState(true);
  const [voiceover, setVoiceover] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [dictating, setDictating] = useState(false);
  const [interimDictation, setInterimDictation] = useState('');
  const stopDictationRef = useRef<(() => void) | null>(null);
  const promptBaseRef = useRef(initialPrompt);
  const canDictate = isSpeechDictationSupported();

  useEffect(() => {
    return () => {
      stopDictationRef.current?.();
    };
  }, []);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const next: ImageFile[] = [];
    for (const file of Array.from(files).slice(0, 6 - images.length)) {
      if (!file.type.startsWith('image/')) continue;
      const base64 = await fileToBase64(file);
      next.push({
        name: file.name,
        type: file.type,
        size: file.size,
        base64,
        url: URL.createObjectURL(file),
      });
    }
    setImages((prev) => [...prev, ...next].slice(0, 6));
  };

  const pushStill = async (url: string, name: string) => {
    const file = await fetch(url)
      .then((r) => r.blob())
      .then((blob) => new File([blob], name, { type: blob.type || 'image/jpeg' }));
    const base64 = await fileToBase64(file);
    setImages((prev) =>
      [
        {
          name,
          type: file.type,
          size: file.size,
          base64,
          url,
        },
        ...prev,
      ].slice(0, 6)
    );
  };

  const handleGenerateStill = async () => {
    if (!prompt.trim()) {
      setError('Add a prompt first to generate a still.');
      return;
    }
    setIsLoading(true);
    setLoadingMessage('Generating still with Imagen…');
    setError(null);
    try {
      const url = await generateImage(prompt);
      await pushStill(url, 'generated.jpg');
    } catch (e: unknown) {
      setError(
        safeErrorMessage(e, 'Still generation failed. You can still upload images or use prompt-only models.')
      );
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const handleComfyStill = async () => {
    if (!prompt.trim()) {
      setError('Add a prompt first to generate a ComfyUI still.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const url = await generateImageWithComfy(prompt, setLoadingMessage);
      await pushStill(url, 'comfy.jpg');
    } catch (e: unknown) {
      setError(safeErrorMessage(e, 'ComfyUI still failed'));
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const toggleDictation = () => {
    if (dictating) {
      stopDictationRef.current?.();
      stopDictationRef.current = null;
      setDictating(false);
      setInterimDictation('');
      return;
    }
    promptBaseRef.current = prompt.trim();
    setDictating(true);
    setInterimDictation('');
    setError(null);
    stopDictationRef.current = startPromptDictation(
      (text, isFinal) => {
        if (isFinal) {
          const base = promptBaseRef.current;
          const next = base ? `${base} ${text}`.trim() : text.trim();
          promptBaseRef.current = next;
          setPrompt(next);
          setInterimDictation('');
        } else {
          const base = promptBaseRef.current;
          setInterimDictation(text);
          setPrompt(base ? `${base} ${text}`.trim() : text);
        }
      },
      (message) => {
        setError(message);
        setDictating(false);
        stopDictationRef.current = null;
      }
    );
  };

  const handleCreate = async () => {
    if (!prompt.trim()) {
      setError('Describe the video you want in the prompt.');
      return;
    }
    if (hfToken.trim()) setStoredHfToken(hfToken);

    setIsLoading(true);
    setError(null);
    try {
      const { url, providerUsed, hasAudio } = await generateAnyVideo(
        { prompt, images, provider, soundtrack, voiceover },
        setLoadingMessage
      );
      onComplete(url, prompt, providerUsed, hasAudio);
    } catch (e: unknown) {
      const message = safeErrorMessage(e, 'Video generation failed');
      if (message.includes('HF_TOKEN_REQUIRED')) {
        setShowToken(true);
        setError('This provider needs a free Hugging Face token. Paste it below, then retry.');
      } else if (message === 'API_KEY_REQUIRED' || message === 'API_KEY_INVALID') {
        setError('Gemini Veo needs a valid API key. Pick a free HF/local provider instead, or select a key.');
      } else {
        setError(message);
      }
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  return (
    <div className="h-full flex flex-col lg:flex-row gap-6 animate-fade-in relative">
      {isLoading && (
        <div className="absolute inset-0 z-20 rounded-xl overflow-hidden">
          <LoadingOverlay message={loadingMessage || 'Creating video…'} />
        </div>
      )}

      <div className="lg:w-3/5 flex flex-col gap-4">
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h2 className="text-xl font-bold text-white">Prompt → Movie</h2>
              <p className="text-gray-400 text-sm mt-1">
                Prompt + optional images → free HF / GitHub models (OmniVoice, ComfyUI, Duix, Handy-style
                dictation), then soundtrack + voiceover.
              </p>
            </div>
            <span className="shrink-0 text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded border border-emerald-800 text-emerald-400 bg-emerald-900/20">
              Free + sound
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 mb-1">
            <label className="block text-xs font-mono text-gray-500 uppercase">Prompt</label>
            <button
              type="button"
              onClick={toggleDictation}
              disabled={isLoading || (!canDictate && !dictating)}
              className={`text-xs px-2 py-1 rounded border transition ${
                dictating
                  ? 'border-rose-500 text-rose-300 bg-rose-900/30'
                  : 'border-gray-600 text-gray-300 hover:border-cyan-500 hover:text-cyan-300'
              } disabled:opacity-40`}
              title={
                canDictate
                  ? 'Dictate prompt (Handy-inspired browser STT)'
                  : 'Web Speech unavailable — use Handy desktop for offline STT'
              }
            >
              {dictating ? 'Stop dictation' : canDictate ? 'Dictate' : 'Dictate (needs Chrome/Edge)'}
            </button>
          </div>
          <textarea
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              if (!dictating) promptBaseRef.current = e.target.value;
            }}
            placeholder="e.g. A cyberpunk street-food cart at night, neon rain, cinematic push-in, vertical short-form"
            className="w-full h-32 bg-gray-900 border border-gray-600 rounded-lg p-3 text-sm text-gray-200 focus:border-cyan-500 outline-none resize-none"
            disabled={isLoading}
          />
          {dictating && (
            <p className="text-[11px] text-rose-300/80 mt-1 font-mono">
              Listening…{interimDictation ? ` “${interimDictation.slice(0, 60)}”` : ''} · Inspired by{' '}
              <a
                className="underline"
                href="https://github.com/cjpais/Handy"
                target="_blank"
                rel="noreferrer"
              >
                Handy
              </a>
            </p>
          )}

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-700 bg-gray-900/40 cursor-pointer">
              <input
                type="checkbox"
                checked={soundtrack}
                onChange={(e) => setSoundtrack(e.target.checked)}
                disabled={isLoading}
                className="accent-cyan-500"
              />
              <span>
                <span className="block text-sm text-white font-semibold">Soundtrack</span>
                <span className="block text-xs text-gray-400">MusicGen HF Space → local score fallback</span>
              </span>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-700 bg-gray-900/40 cursor-pointer">
              <input
                type="checkbox"
                checked={voiceover}
                onChange={(e) => setVoiceover(e.target.checked)}
                disabled={isLoading}
                className="accent-cyan-500"
              />
              <span>
                <span className="block text-sm text-white font-semibold">Voiceover</span>
                <span className="block text-xs text-gray-400">OmniVoice → Edge-TTS from your prompt</span>
              </span>
            </label>
          </div>

          <div className="mt-4">
            <label className="block text-xs font-mono text-gray-500 mb-2 uppercase">Model source</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
              {VIDEO_PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setProvider(p.id)}
                  disabled={isLoading}
                  className={`text-left p-3 rounded-lg border transition ${
                    provider === p.id
                      ? 'border-cyan-500 bg-cyan-900/20'
                      : 'border-gray-700 bg-gray-900/40 hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-white">{p.label}</span>
                    <span
                      className={`text-[10px] font-mono ${
                        p.free ? 'text-emerald-400' : 'text-amber-400'
                      }`}
                    >
                      {p.free ? 'FREE' : 'KEY'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{p.blurb}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowToken((v) => !v)}
              className="text-xs text-gray-400 hover:text-white underline"
            >
              {showToken ? 'Hide HF token' : 'Add free HF token (optional)'}
            </button>
          </div>
          {showToken && (
            <div className="mt-2">
              <input
                type="password"
                value={hfToken}
                onChange={(e) => setHfToken(e.target.value)}
                placeholder="hf_... from huggingface.co/settings/tokens"
                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
              />
              <p className="text-[11px] text-gray-500 mt-1">
                Free read token unlocks ZeroGPU Spaces + Inference Providers. Stored only in this browser.
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-900/20 border border-red-800 p-3 rounded-lg text-red-300 text-sm whitespace-pre-wrap">
            {error}
          </div>
        )}

        <button
          onClick={handleCreate}
          disabled={isLoading || !prompt.trim()}
          className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/20 transition-all active:scale-[0.99] text-lg tracking-wide"
        >
          {isLoading ? (
            <span className="inline-flex items-center gap-2 justify-center">
              <Spinner className="w-5 h-5" /> Making movie…
            </span>
          ) : (
            'Create Movie with Sound'
          )}
        </button>
      </div>

      <div className="lg:w-2/5 flex flex-col gap-4">
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5 flex-grow flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-white font-bold">Reference images</h3>
            <span className="text-xs text-gray-500 font-mono">{images.length}/6</span>
          </div>
          <p className="text-xs text-gray-400 mb-3">
            Optional. Used for image-to-video (LTX/Wan/Veo) or multi-image local composition.
          </p>

          <div className="grid grid-cols-2 gap-2 mb-3">
            {images.map((img, idx) => (
              <div key={`${img.name}-${idx}`} className="relative aspect-[9/16] bg-black rounded-lg overflow-hidden border border-gray-700">
                <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() =>
                    setImages((prev) => {
                      const target = prev[idx];
                      revokeObjectUrl(target?.url);
                      return prev.filter((_, i) => i !== idx);
                    })
                  }
                  className="absolute top-1 right-1 bg-black/70 text-white text-xs px-2 py-0.5 rounded"
                >
                  Remove
                </button>
              </div>
            ))}
            {images.length < 6 && (
              <label className="aspect-[9/16] border border-dashed border-gray-600 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-cyan-500 hover:text-cyan-400 cursor-pointer transition">
                <span className="text-2xl leading-none mb-1">+</span>
                <span className="text-xs">Upload</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                  disabled={isLoading}
                />
              </label>
            )}
          </div>

          <div className="mt-auto grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={handleGenerateStill}
              disabled={isLoading || !prompt.trim()}
              className="py-2.5 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white text-sm transition disabled:opacity-50"
            >
              Generate still (Imagen)
            </button>
            <button
              type="button"
              onClick={handleComfyStill}
              disabled={isLoading || !prompt.trim()}
              className="py-2.5 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white text-sm transition disabled:opacity-50"
            >
              Generate still (local ComfyUI)
            </button>
          </div>
        </div>

        <div className="bg-gray-900/60 border border-gray-700 rounded-xl p-4 text-xs text-gray-400 space-y-2">
          <p className="text-gray-300 font-semibold">GitHub + HF sources</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>
              <a
                className="text-cyan-400 hover:underline"
                href="https://github.com/k2-fsa/OmniVoice"
                target="_blank"
                rel="noreferrer"
              >
                k2-fsa/OmniVoice
              </a>{' '}
              — multilingual TTS voiceover
            </li>
            <li>
              <a
                className="text-cyan-400 hover:underline"
                href="https://github.com/Comfy-Org/ComfyUI"
                target="_blank"
                rel="noreferrer"
              >
                Comfy-Org/ComfyUI
              </a>{' '}
              — local still → movie
            </li>
            <li>
              <a
                className="text-cyan-400 hover:underline"
                href="https://github.com/cjpais/Handy"
                target="_blank"
                rel="noreferrer"
              >
                cjpais/Handy
              </a>{' '}
              — offline STT (Dictate uses Web Speech; Handy for desktop)
            </li>
            <li>
              <a
                className="text-cyan-400 hover:underline"
                href="https://github.com/duixcom/Duix-Avatar"
                target="_blank"
                rel="noreferrer"
              >
                duixcom/Duix-Avatar
              </a>{' '}
              — local talking avatar
            </li>
            <li>
              <a
                className="text-cyan-400 hover:underline"
                href="https://huggingface.co/spaces/Lightricks/ltx-video-distilled"
                target="_blank"
                rel="noreferrer"
              >
                LTX-Video
              </a>
              , AnimateDiff, CogVideoX, Wan + MusicGen / Edge-TTS
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default VideoCreator;
