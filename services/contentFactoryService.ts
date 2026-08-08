/**
 * SOLDIOM Content Factory API client
 * Python FastAPI — soldiom-content-factory/api/main.py
 */

import {
  ContentFactorySeed,
  ContentStage,
  DeployModeInfo,
  DeploymentMode,
  ProjectManifest,
  ScfHealth,
  UniversalInput,
} from '../types/contentFactory';
import { getDeploymentMode } from './deploymentModeService';

const LS = {
  apiBase: 'creativeos_scf_api_base',
};

const read = (k: string) => {
  try {
    return localStorage.getItem(k) || '';
  } catch {
    return '';
  }
};

export const getScfApiBase = () => read(LS.apiBase) || '/api/scf';

export const setScfApiBase = (v: string) => {
  try {
    localStorage.setItem(LS.apiBase, v.trim().replace(/\/+$/, ''));
  } catch {
    /* ignore */
  }
};

export const pingContentFactory = async (): Promise<ScfHealth> => {
  try {
    const res = await fetch(`${getScfApiBase()}/health`);
    const data = await res.json().catch(() => ({}));
    return {
      ok: Boolean(data.ok),
      service: data.service,
      deployment_mode: data.deployment_mode,
      libraqm: data.libraqm,
      gemini: data.gemini,
      elevenlabs: data.elevenlabs,
      runpod: data.runpod,
      gcp: data.gcp,
      message: res.ok ? undefined : `HTTP ${res.status}`,
    };
  } catch (e: unknown) {
    return {
      ok: false,
      message:
        e instanceof Error
          ? e.message
          : 'Content Factory offline — run: npm run content-factory',
    };
  }
};

export const fetchDeployModes = async (): Promise<{
  current: DeploymentMode;
  modes: DeployModeInfo[];
}> => {
  const res = await fetch(`${getScfApiBase()}/deploy/modes`);
  if (!res.ok) throw new Error(`Deploy modes failed (${res.status})`);
  return res.json();
};

export const setServerDeployMode = async (mode: DeploymentMode) => {
  const res = await fetch(`${getScfApiBase()}/deploy/mode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode }),
  });
  if (!res.ok) throw new Error(`Set deploy mode failed (${res.status})`);
  return res.json();
};

export type CreateProjectOpts = UniversalInput & { run_full?: boolean };

export const createContentProject = async (opts: CreateProjectOpts): Promise<ProjectManifest> => {
  const res = await fetch(`${getScfApiBase()}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...opts,
      formats: opts.formats || ['instagram_carousel', 'reel_30', 'linkedin_post'],
      run_full: opts.run_full !== false,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || data.error || `Create failed (${res.status})`);
  return data as ProjectManifest;
};

export const listContentProjects = async (): Promise<
  { id: string; slug: string; stage: ContentStage; hook?: string; updated_at: string }[]
> => {
  const res = await fetch(`${getScfApiBase()}/projects`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.projects || [];
};

export const getContentProject = async (id: string): Promise<ProjectManifest> => {
  const res = await fetch(`${getScfApiBase()}/projects/${id}`);
  if (!res.ok) throw new Error(`Project not found (${res.status})`);
  return res.json();
};

export const advanceContentProject = async (
  id: string,
  stage?: ContentStage
): Promise<ProjectManifest> => {
  const res = await fetch(`${getScfApiBase()}/projects/${id}/advance`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stage }),
  });
  if (!res.ok) throw new Error(`Advance failed (${res.status})`);
  return res.json();
};

export const chatContentProject = async (
  id: string,
  instruction: string
): Promise<ProjectManifest> => {
  const res = await fetch(`${getScfApiBase()}/projects/${id}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ instruction }),
  });
  if (!res.ok) throw new Error(`Chat modify failed (${res.status})`);
  return res.json();
};

export const seedToCreateOpts = (seed: ContentFactorySeed): CreateProjectOpts => ({
  prompt: seed.prompt,
  url: seed.url,
  repo: seed.repo,
  brand: seed.brand || 'soldiom',
  goal: seed.goal,
  language: seed.language || 'en',
  formats: ['instagram_carousel', 'reel_30', 'reel_60', 'linkedin_post', 'x_thread'],
  run_full: true,
});

export const getActiveDeployMode = () => getDeploymentMode();
