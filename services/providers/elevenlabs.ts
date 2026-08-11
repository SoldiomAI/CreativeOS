import { GeneratedAudio, TtsOptions, VoiceName } from './types';
import { getElevenLabsKey } from '../config';

// Map CreativeOS voice names to ElevenLabs premade voice IDs with a similar character.
const VOICE_IDS: Record<VoiceName, string> = {
  Kore: '21m00Tcm4TlvDq8ikWAM',   // Rachel — calm narration
  Puck: 'pNInz6obpgDQGcFmaJgB',   // Adam — deep, energetic
  Zephyr: 'MF3mGyEYCl7XYWbV9V6O', // Elli — bright, youthful
  Charon: 'VR6AewLTigWG4xSOukaG', // Arnold — authoritative
  Fenrir: 'TxGEqnHWrfWFTfGW9XjX', // Josh — intense
  Aoede: 'EXAVITQu4vr4xnSDxMaL',  // Bella — warm, musical
};

/**
 * Speech-only engine backed by the ElevenLabs text-to-speech API. Selected in
 * Settings as the dedicated voice engine; all other modalities keep using the
 * active general provider.
 */
export const elevenLabsSpeech = async (
  text: string,
  options?: TtsOptions
): Promise<GeneratedAudio> => {
  const apiKey = getElevenLabsKey();
  if (!apiKey) throw new Error('API_KEY_REQUIRED');

  const voiceId = VOICE_IDS[(options?.voice as VoiceName) ?? 'Kore'] ?? VOICE_IDS.Kore;
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });

  if (!res.ok) {
    if (res.status === 401 || res.status === 403) throw new Error('API_KEY_INVALID');
    throw new Error(`ElevenLabs error ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }

  const blob = await res.blob();
  const mime = blob.type || 'audio/mpeg';
  return { url: URL.createObjectURL(blob), blob, mime };
};
