import { Client } from '@gradio/client';
import { getStoredHfToken } from './hfVideoService';

export type AudioMood = 'cinematic' | 'upbeat' | 'dark' | 'dreamy' | 'tech';

const extractAudioUrl = (payload: unknown): string | null => {
  if (!payload) return null;
  if (typeof payload === 'string' && (payload.startsWith('http') || payload.startsWith('data:'))) {
    return payload;
  }
  if (Array.isArray(payload)) {
    for (const item of payload) {
      const found = extractAudioUrl(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof payload === 'object') {
    const obj = payload as Record<string, unknown>;
    if (typeof obj.url === 'string') return obj.url;
    if (typeof obj.path === 'string' && obj.path.startsWith('http')) return obj.path;
    for (const value of Object.values(obj)) {
      const found = extractAudioUrl(value);
      if (found) return found;
    }
  }
  return null;
};

const connectSpace = async (space: string) => {
  const token = (process.env.HF_TOKEN || getStoredHfToken() || '').trim();
  return Client.connect(
    space,
    token ? ({ token, hf_token: token } as { token: `hf_${string}`; hf_token: `hf_${string}` }) : {}
  );
};

export const detectMood = (prompt: string): AudioMood => {
  const p = prompt.toLowerCase();
  if (/(dark|horror|noir|rain|night|cyber)/.test(p)) return 'dark';
  if (/(party|dance|fun|happy|upbeat|energetic)/.test(p)) return 'upbeat';
  if (/(dream|soft|romantic|clouds|slow)/.test(p)) return 'dreamy';
  if (/(tech|ai|futur|neon|robot)/.test(p)) return 'tech';
  return 'cinematic';
};

const musicPromptFor = (prompt: string, mood: AudioMood): string => {
  const styles: Record<AudioMood, string> = {
    cinematic: 'cinematic orchestral soundtrack, emotional strings, soft percussion',
    upbeat: 'upbeat electronic pop instrumental, bright synths, energetic drums',
    dark: 'dark ambient soundtrack, low drones, tense pulses',
    dreamy: 'dreamy ambient music, soft pads, gentle piano',
    tech: 'futuristic synthwave instrumental, neon arps, driving bass',
  };
  return `${styles[mood]}, inspired by: ${prompt.slice(0, 160)}`;
};

/** Free MusicGen HF Space — prompt → instrumental soundtrack. */
export const generateMusicWithHf = async (
  prompt: string,
  durationSec: number,
  setLoadingMessage: (m: string) => void
): Promise<Blob> => {
  setLoadingMessage('Scoring soundtrack with MusicGen (HF Space)…');
  const mood = detectMood(prompt);
  const client = await connectSpace('sanchit-gandhi/musicgen-streaming');
  // Space enforces a minimum length of 10 seconds.
  const length = Math.max(10, Math.min(20, Math.ceil(durationSec + 1)));
  const result = await client.predict('/generate_audio', {
    text_prompt: musicPromptFor(prompt, mood),
    audio_length_in_s: length,
    play_steps_in_s: 1.5,
    seed: Math.floor(Math.random() * 1000),
  });
  const url = extractAudioUrl(result.data);
  if (!url) throw new Error('MusicGen returned no audio');
  return fetchAudioBlob(url);
};

/** Download direct audio or stitch HLS (m3u8) AAC segments from Gradio Spaces. */
const fetchAudioBlob = async (url: string): Promise<Blob> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download audio (${response.status})`);

  const contentType = response.headers.get('content-type') || '';
  const isPlaylist =
    url.includes('.m3u8') ||
    contentType.includes('mpegurl') ||
    contentType.includes('m3u8');

  if (!isPlaylist) {
    return response.blob();
  }

  const playlist = await response.text();
  const base = url.slice(0, url.lastIndexOf('/') + 1);
  const segments = playlist
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));

  if (!segments.length) throw new Error('MusicGen playlist had no segments');

  const parts: ArrayBuffer[] = [];
  for (const segment of segments) {
    const segUrl = segment.startsWith('http') ? segment : `${base}${segment}`;
    const segRes = await fetch(segUrl);
    if (!segRes.ok) throw new Error('Failed to download MusicGen AAC segment');
    parts.push(await segRes.arrayBuffer());
  }

  const total = parts.reduce((n, p) => n + p.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(new Uint8Array(part), offset);
    offset += part.byteLength;
  }
  return new Blob([out], { type: 'audio/aac' });
};

/** Free Edge-TTS HF Space — narration voiceover. */
export const generateVoiceoverWithHf = async (
  narration: string,
  setLoadingMessage: (m: string) => void
): Promise<Blob> => {
  setLoadingMessage('Recording voiceover with Edge-TTS (HF Space)…');
  const client = await connectSpace('innoai/Edge-TTS-Text-to-Speech');
  const result = await client.predict('/tts_interface', {
    text: narration.slice(0, 280),
    voice: 'en-US-JennyNeural - en-US (Female)',
    rate: 0,
    pitch: 0,
  });
  const url = extractAudioUrl(result.data);
  if (!url) throw new Error('Edge-TTS returned no audio');
  return fetchAudioBlob(url);
};

/**
 * Always-available free local soundtrack (Web Audio).
 * Returns a WAV blob matching the requested duration.
 */
export const generateLocalSoundtrack = async (
  prompt: string,
  durationSec: number,
  setLoadingMessage: (m: string) => void
): Promise<Blob> => {
  setLoadingMessage('Composing free local soundtrack…');
  const mood = detectMood(prompt);
  const sampleRate = 44100;
  const length = Math.max(1, Math.floor(durationSec * sampleRate));
  const ctx = new OfflineAudioContext(2, length, sampleRate);

  const master = ctx.createGain();
  master.gain.value = 0.28;
  master.connect(ctx.destination);

  const scaleMap: Record<AudioMood, number[]> = {
    cinematic: [130.81, 164.81, 196.0, 246.94, 261.63],
    upbeat: [196.0, 220.0, 246.94, 293.66, 329.63],
    dark: [98.0, 116.54, 146.83, 174.61],
    dreamy: [174.61, 196.0, 220.0, 261.63, 329.63],
    tech: [110.0, 146.83, 164.81, 220.0, 277.18],
  };
  const notes = scaleMap[mood];

  // Pad bed
  for (let i = 0; i < 3; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = mood === 'upbeat' || mood === 'tech' ? 'sawtooth' : 'sine';
    osc.frequency.value = notes[i % notes.length] / (i === 0 ? 1 : 2);
    gain.gain.value = 0.08;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = mood === 'dark' ? 600 : 1800;
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    osc.start(0);
    osc.stop(durationSec);
  }

  // Melodic pulses
  const beat = mood === 'upbeat' ? 0.35 : 0.55;
  for (let t = 0; t < durationSec; t += beat) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = notes[Math.floor((t / beat) % notes.length)];
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + beat * 0.9);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + beat);
  }

  // Soft noise texture / whoosh
  const noiseLen = sampleRate * Math.min(2, durationSec);
  const buffer = ctx.createBuffer(1, noiseLen, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.15;
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.05, 0);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, Math.min(2, durationSec));
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'highpass';
  noiseFilter.frequency.value = 800;
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(master);
  noise.start(0);

  const rendered = await ctx.startRendering();
  return audioBufferToWavBlob(rendered);
};

export const audioBufferToWavBlob = (buffer: AudioBuffer): Blob => {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const samples = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = samples * blockAlign;
  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);

  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < samples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, buffer.getChannelData(ch)[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([arrayBuffer], { type: 'audio/wav' });
};

export const buildNarrationText = (prompt: string): string => {
  const cleaned = prompt.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= 160) return cleaned;
  return `${cleaned.slice(0, 157).trim()}…`;
};

export const generateMovieAudio = async (
  prompt: string,
  durationSec: number,
  options: { soundtrack: boolean; voiceover: boolean },
  setLoadingMessage: (m: string) => void
): Promise<{ music?: Blob; voice?: Blob }> => {
  const out: { music?: Blob; voice?: Blob } = {};

  if (options.soundtrack) {
    // Always have a local score ready; upgrade to MusicGen when the Space cooperates.
    try {
      out.music = await generateMusicWithHf(prompt, durationSec, setLoadingMessage);
    } catch (e) {
      console.warn('MusicGen unavailable, using local score', e);
      out.music = await generateLocalSoundtrack(prompt, durationSec, setLoadingMessage);
    }
  }

  if (options.voiceover) {
    try {
      out.voice = await generateVoiceoverWithHf(buildNarrationText(prompt), setLoadingMessage);
    } catch {
      setLoadingMessage('Voiceover Space busy — continuing with soundtrack only…');
    }
  }

  return out;
};
