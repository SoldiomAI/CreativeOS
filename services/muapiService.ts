/**
 * Optional MuAPI client (same backend as Open Generative AI).
 * https://github.com/Anil-matcha/Open-Generative-AI
 * https://muapi.ai
 *
 * Browser calls go through the Vite proxy (/api/muapi → api.muapi.ai) to avoid CORS.
 */

const MUAPI_KEY = 'creativeos_muapi_key';
const MUAPI_T2V = 'creativeos_muapi_t2v';
const MUAPI_I2V = 'creativeos_muapi_i2v';

export const getMuapiKey = (): string => {
  try {
    return localStorage.getItem(MUAPI_KEY) || '';
  } catch {
    return '';
  }
};

export const setMuapiKey = (key: string) => {
  localStorage.setItem(MUAPI_KEY, key.trim());
};

export const getMuapiT2vEndpoint = (): string => {
  try {
    return localStorage.getItem(MUAPI_T2V) || 'seedance-v2.0-t2v';
  } catch {
    return 'seedance-v2.0-t2v';
  }
};

export const setMuapiT2vEndpoint = (endpoint: string) => {
  localStorage.setItem(MUAPI_T2V, endpoint.trim());
};

export const getMuapiI2vEndpoint = (): string => {
  try {
    return localStorage.getItem(MUAPI_I2V) || 'wan2.2-image-to-video';
  } catch {
    return 'wan2.2-image-to-video';
  }
};

export const setMuapiI2vEndpoint = (endpoint: string) => {
  localStorage.setItem(MUAPI_I2V, endpoint.trim());
};

/** Dev: Vite proxy. Prod preview: same proxy if served via Vite preview; else direct (may CORS). */
const getBaseUrl = (): string => {
  if (typeof window !== 'undefined' && window.location?.protocol?.startsWith('http')) {
    return '/api/muapi';
  }
  return 'https://api.muapi.ai';
};

const requireKey = (): string => {
  const key = getMuapiKey().trim();
  if (!key) throw new Error('MUAPI_KEY_REQUIRED');
  return key;
};

const pollForResult = async (
  requestId: string,
  key: string,
  setLoadingMessage: (m: string) => void,
  maxAttempts = 120,
  intervalMs = 2500
): Promise<Record<string, unknown>> => {
  const pollUrl = `${getBaseUrl()}/api/v1/predictions/${requestId}/result`;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    setLoadingMessage(`MuAPI rendering… (${attempt}/${maxAttempts})`);
    await new Promise((r) => setTimeout(r, intervalMs));
    const response = await fetch(pollUrl, {
      headers: { 'Content-Type': 'application/json', 'x-api-key': key },
    });
    if (!response.ok) {
      if (response.status >= 500) continue;
      const errText = await response.text();
      throw new Error(`MuAPI poll failed (${response.status}): ${errText.slice(0, 120)}`);
    }
    const data = (await response.json()) as Record<string, unknown>;
    const status = String(data.status || '').toLowerCase();
    if (status === 'completed' || status === 'succeeded' || status === 'success') return data;
    if (status === 'failed' || status === 'error') {
      throw new Error(`MuAPI generation failed: ${String(data.error || 'unknown')}`);
    }
  }
  throw new Error('MuAPI timed out waiting for video');
};

const extractUrl = (result: Record<string, unknown>): string => {
  const outputs = result.outputs;
  if (Array.isArray(outputs) && typeof outputs[0] === 'string') return outputs[0];
  if (typeof result.url === 'string') return result.url;
  const output = result.output as { url?: string } | undefined;
  if (output?.url) return output.url;
  throw new Error('MuAPI returned no media URL');
};

export const uploadToMuapi = async (file: Blob, filename: string): Promise<string> => {
  const key = requireKey();
  const form = new FormData();
  form.append('file', file, filename);
  const response = await fetch(`${getBaseUrl()}/api/v1/upload_file`, {
    method: 'POST',
    headers: { 'x-api-key': key },
    body: form,
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`MuAPI upload failed (${response.status}): ${errText.slice(0, 120)}`);
  }
  const data = await response.json();
  const url = data.url || data.file_url || data.data?.url;
  if (!url) throw new Error('MuAPI upload returned no URL');
  return String(url);
};

export type MuapiVideoOptions = {
  prompt: string;
  aspectRatio?: string;
  durationSec?: number;
  imageUrl?: string;
  quality?: string;
};

/**
 * Text-to-video or image-to-video via MuAPI (Open Generative AI catalog).
 */
export const generateVideoWithMuapi = async (
  options: MuapiVideoOptions,
  setLoadingMessage: (m: string) => void
): Promise<string> => {
  const key = requireKey();
  const aspectRatio = options.aspectRatio || '9:16';
  const duration = Math.min(15, Math.max(5, Math.round(options.durationSec || 5)));
  const hasImage = Boolean(options.imageUrl);
  const endpoint = hasImage ? getMuapiI2vEndpoint() : getMuapiT2vEndpoint();

  setLoadingMessage(`Queueing MuAPI ${hasImage ? 'image→video' : 'text→video'} (${endpoint})…`);

  const payload: Record<string, unknown> = {
    prompt: options.prompt,
    aspect_ratio: aspectRatio,
    duration,
  };
  if (options.quality) payload.quality = options.quality;
  else if (!hasImage) payload.quality = 'basic';
  if (hasImage) payload.image_url = options.imageUrl;

  const response = await fetch(`${getBaseUrl()}/api/v1/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': key },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errText = await response.text();
    if (response.status === 401 || response.status === 403) {
      throw new Error('MUAPI_KEY_INVALID');
    }
    throw new Error(`MuAPI request failed (${response.status}): ${errText.slice(0, 160)}`);
  }

  const submitData = await response.json();
  const requestId = submitData.request_id || submitData.id;
  if (!requestId) {
    const direct = submitData.outputs?.[0] || submitData.url;
    if (typeof direct === 'string') return direct;
    throw new Error('MuAPI did not return a request_id');
  }

  const result = await pollForResult(String(requestId), key, setLoadingMessage);
  return extractUrl(result);
};
