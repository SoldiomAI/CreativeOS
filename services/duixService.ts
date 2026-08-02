/**
 * Optional Duix.Avatar local API (https://github.com/duixcom/Duix-Avatar).
 * After Docker install: video synth on :8383, voice on :18180.
 */

const DUIX_VIDEO_KEY = 'creativeos_duix_video_url';
const DUIX_VOICE_KEY = 'creativeos_duix_voice_url';
const DUIX_AVATAR_VIDEO_KEY = 'creativeos_duix_avatar_video';
const DUIX_REF_AUDIO_KEY = 'creativeos_duix_ref_audio';
const DUIX_REF_TEXT_KEY = 'creativeos_duix_ref_text';
const DUIX_SPEAKER_KEY = 'creativeos_duix_speaker';

export const getDuixVideoApi = () => {
  try {
    return localStorage.getItem(DUIX_VIDEO_KEY) || 'http://127.0.0.1:8383';
  } catch {
    return 'http://127.0.0.1:8383';
  }
};

export const setDuixVideoApi = (url: string) => {
  localStorage.setItem(DUIX_VIDEO_KEY, url.trim().replace(/\/$/, ''));
};

export const getDuixVoiceApi = () => {
  try {
    return localStorage.getItem(DUIX_VOICE_KEY) || 'http://127.0.0.1:18180';
  } catch {
    return 'http://127.0.0.1:18180';
  }
};

export const setDuixVoiceApi = (url: string) => {
  localStorage.setItem(DUIX_VOICE_KEY, url.trim().replace(/\/$/, ''));
};

export const getDuixAvatarVideoPath = () => localStorage.getItem(DUIX_AVATAR_VIDEO_KEY) || '';
export const setDuixAvatarVideoPath = (p: string) => localStorage.setItem(DUIX_AVATAR_VIDEO_KEY, p.trim());
export const getDuixRefAudio = () => localStorage.getItem(DUIX_REF_AUDIO_KEY) || '';
export const setDuixRefAudio = (p: string) => localStorage.setItem(DUIX_REF_AUDIO_KEY, p.trim());
export const getDuixRefText = () => localStorage.getItem(DUIX_REF_TEXT_KEY) || '';
export const setDuixRefText = (p: string) => localStorage.setItem(DUIX_REF_TEXT_KEY, p.trim());
export const getDuixSpeaker = () => localStorage.getItem(DUIX_SPEAKER_KEY) || crypto.randomUUID();
export const setDuixSpeaker = (p: string) => localStorage.setItem(DUIX_SPEAKER_KEY, p.trim());

export const pingDuix = async (): Promise<{ video: boolean; voice: boolean }> => {
  const check = async (url: string) => {
    try {
      await fetch(url, { method: 'GET', mode: 'no-cors' });
      // no-cors opaque — treat reachability attempt as soft-true; also try CORS-friendly HEAD
      return true;
    } catch {
      return false;
    }
  };
  // Prefer real status when CORS allows
  const videoCors = async () => {
    try {
      const r = await fetch(`${getDuixVideoApi()}/easy/query?code=ping`, { method: 'GET' });
      return r.status < 500;
    } catch {
      return check(getDuixVideoApi());
    }
  };
  const voiceCors = async () => {
    try {
      const r = await fetch(`${getDuixVoiceApi()}/v1/invoke`, { method: 'OPTIONS' });
      return r.ok || r.status === 204 || r.status === 405 || r.status === 404;
    } catch {
      return check(getDuixVoiceApi());
    }
  };
  const [video, voice] = await Promise.all([videoCors(), voiceCors()]);
  return { video, voice };
};

export const synthesizeDuixVoice = async (
  text: string,
  setLoadingMessage: (m: string) => void
): Promise<string> => {
  const refAudio = getDuixRefAudio();
  const refText = getDuixRefText();
  if (!refAudio || !refText) {
    throw new Error('Configure Duix reference_audio + reference_text in Settings (from model training).');
  }
  setLoadingMessage('Synthesizing voice with local Duix.Avatar…');
  const speaker = getDuixSpeaker();
  setDuixSpeaker(speaker);
  const res = await fetch(`${getDuixVoiceApi()}/v1/invoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      speaker,
      text,
      format: 'wav',
      topP: 0.7,
      max_new_tokens: 1024,
      chunk_length: 100,
      repetition_penalty: 1.2,
      temperature: 0.7,
      need_asr: false,
      streaming: false,
      is_fixed_seed: 0,
      is_norm: 0,
      reference_audio: refAudio,
      reference_text: refText,
    }),
  });
  if (!res.ok) throw new Error(`Duix voice failed (${res.status})`);
  // Response shape varies; try JSON path or blob
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const data = await res.json();
    const url = data?.audio_url || data?.url || data?.path;
    if (!url) throw new Error('Duix voice returned no audio path');
    return String(url);
  }
  const blob = await res.blob();
  return URL.createObjectURL(blob);
};

export const submitDuixAvatarVideo = async (
  audioPath: string,
  setLoadingMessage: (m: string) => void
): Promise<string> => {
  const videoPath = getDuixAvatarVideoPath();
  if (!videoPath) {
    throw new Error('Set Duix silent avatar video path in Settings.');
  }
  const code = crypto.randomUUID();
  setLoadingMessage('Submitting Duix.Avatar lip-sync job…');
  const res = await fetch(`${getDuixVideoApi()}/easy/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audio_url: audioPath,
      video_url: videoPath,
      code,
      chaofen: 0,
      watermark_switch: 0,
      pn: 1,
    }),
  });
  if (!res.ok) throw new Error(`Duix video submit failed (${res.status})`);

  const started = Date.now();
  while (Date.now() - started < 300_000) {
    setLoadingMessage('Duix.Avatar synthesizing talking avatar…');
    const q = await fetch(`${getDuixVideoApi()}/easy/query?code=${encodeURIComponent(code)}`);
    if (q.ok) {
      const data = await q.json();
      const status = data?.status || data?.data?.status || data?.code;
      const url = data?.video_url || data?.data?.video_url || data?.path || data?.data?.path;
      if (url && (status === 'success' || status === 2 || status === 'OK' || data?.success)) {
        return String(url);
      }
      if (status === 'failed' || status === 'error') {
        throw new Error('Duix.Avatar synthesis failed');
      }
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error('Duix.Avatar timed out');
};
