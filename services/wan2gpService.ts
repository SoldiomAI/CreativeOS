/**
 * Wan2GP local GPU video generation
 * https://github.com/deepbeepmeep/Wan2GP
 *
 * Talks to server/wangp-bridge.py (WAN2GP_ROOT + shared.api) via Vite proxy /api/wangp.
 * Supports Wan 2.1/2.2, LTX-2, Hunyuan, Flux, and 50+ models when WanGP is installed locally.
 */

import { ImageFile } from '../types';

const LS = {
  model: 'creativeos_wangp_model',
  settings: 'creativeos_wangp_settings_json',
};

const read = (key: string) => {
  try {
    return localStorage.getItem(key) || '';
  } catch {
    return '';
  }
};

const write = (key: string, v: string) => {
  try {
    if (v) localStorage.setItem(key, v);
    else localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
};

export const getWan2gpModelType = () =>
  read(LS.model) || (import.meta.env.VITE_WANGP_MODEL_TYPE as string | undefined) || 'wan2.2_t2v_14B';

export const setWan2gpModelType = (v: string) => write(LS.model, v.trim());

/** Optional exported settings JSON from WanGP UI (merged into each job). */
export const getWan2gpSettingsJson = () => read(LS.settings);
export const setWan2gpSettingsJson = (v: string) => write(LS.settings, v.trim());

export const getWan2gpBridgeBase = () => '/api/wangp';

export type Wan2gpHealth = {
  ok: boolean;
  ready?: boolean;
  root?: string | null;
  defaultModel?: string;
  message?: string;
};

export const pingWan2gp = async (): Promise<Wan2gpHealth> => {
  try {
    const res = await fetch(`${getWan2gpBridgeBase()}/health`);
    const data = await res.json().catch(() => ({}));
    return {
      ok: Boolean(data.ok),
      ready: Boolean(data.ready),
      root: data.root,
      defaultModel: data.defaultModel,
      message: data.message || (res.ok ? undefined : `HTTP ${res.status}`),
    };
  } catch (e: unknown) {
    return {
      ok: false,
      message:
        e instanceof Error
          ? e.message
          : 'Wan2GP bridge offline — set WAN2GP_ROOT and run: python3 server/wangp-bridge.py',
    };
  }
};

const parseExtraSettings = (): Record<string, unknown> | undefined => {
  const raw = getWan2gpSettingsJson();
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed ? (parsed as Record<string, unknown>) : undefined;
  } catch {
    return undefined;
  }
};

/** Generate video via local Wan2GP GPU pipeline. Can take several minutes. */
export const generateVideoWithWan2gp = async (
  prompt: string,
  images: ImageFile[],
  setLoadingMessage: (m: string) => void,
  opts?: { aspectRatio?: string; durationSec?: number }
): Promise<string> => {
  setLoadingMessage('Connecting to Wan2GP bridge…');
  const health = await pingWan2gp();
  if (!health.ok) {
    throw new Error(
      health.message ||
        'Wan2GP bridge not running. Clone github.com/deepbeepmeep/Wan2GP, set WAN2GP_ROOT, run python3 server/wangp-bridge.py'
    );
  }
  if (!health.ready) {
    throw new Error(
      health.message ||
        'Wan2GP bridge reachable but session not ready — check WAN2GP_ROOT and WanGP dependencies'
    );
  }

  setLoadingMessage('Wan2GP generating on local GPU (may take several minutes)…');

  const body: Record<string, unknown> = {
    prompt,
    aspectRatio: opts?.aspectRatio || '9:16',
    durationSec: opts?.durationSec || 5,
    modelType: getWan2gpModelType(),
    wait: true,
    timeoutSec: 900,
    settings: parseExtraSettings(),
  };

  if (images[0]?.base64) {
    body.imageBase64 = images[0].base64;
    body.imageName = images[0].name || 'reference.png';
  }

  const res = await fetch(`${getWan2gpBridgeBase()}/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) {
    throw new Error(data.error || `Wan2GP generate failed (${res.status})`);
  }

  const videoPath = String(data.videoUrl || '');
  if (!videoPath) throw new Error('Wan2GP returned no video URL');

  setLoadingMessage('Downloading Wan2GP output…');
  const blob = await fetch(videoPath).then((r) => {
    if (!r.ok) throw new Error(`Failed to fetch Wan2GP video (${r.status})`);
    return r.blob();
  });

  return URL.createObjectURL(blob);
};
