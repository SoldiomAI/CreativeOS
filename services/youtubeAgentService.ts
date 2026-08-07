/**
 * YouTube Automation Agent connector
 * https://github.com/darkzOGx/youtube-automation-agent
 *
 * Self-hosted Express API (default :3456) with 7 AI agents:
 * strategy → script → thumbnail → SEO → production → publish → analytics.
 *
 * CreativeOS uses it two ways:
 *   1. Autonomous — POST /generate (topic from Hook Foundry / Studio) for 24/7 channel ops
 *   2. Publish fallback — when direct YouTube OAuth fails, queue agent generation from your topic
 *
 * Mutating routes accept optional x-api-key when API_KEY is set in the agent's .env.
 */

import { SocialMetadata } from '../types';
import { formatCaptionWithTags } from './socialExport';

const LS_BASE = 'creativeos_yt_agent_url';
const LS_KEY = 'creativeos_yt_agent_api_key';

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

export const getYoutubeAgentUrl = () =>
  read(LS_BASE) ||
  (import.meta.env.VITE_YOUTUBE_AGENT_URL as string | undefined) ||
  'http://127.0.0.1:3456';

export const setYoutubeAgentUrl = (v: string) =>
  write(LS_BASE, v.trim().replace(/\/+$/, ''));

export const getYoutubeAgentApiKey = () =>
  read(LS_KEY) || (import.meta.env.VITE_YOUTUBE_AGENT_API_KEY as string | undefined) || '';

export const setYoutubeAgentApiKey = (v: string) => write(LS_KEY, v.trim());

export const isYoutubeAgentConfigured = () => Boolean(getYoutubeAgentUrl());

const agentHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const key = getYoutubeAgentApiKey();
  if (key) headers['x-api-key'] = key;
  return headers;
};

/** Dev proxy path — avoids CORS when agent runs on :3456 */
export const getYoutubeAgentFetchBase = () => {
  const url = getYoutubeAgentUrl();
  if (url.includes('127.0.0.1:3456') || url.includes('localhost:3456')) {
    return '/api/youtube-agent';
  }
  return url;
};

export type YoutubeAgentHealth = {
  ok: boolean;
  initialized?: boolean;
  agents?: string[];
  message?: string;
};

export const pingYoutubeAgent = async (): Promise<YoutubeAgentHealth> => {
  try {
    const res = await fetch(`${getYoutubeAgentFetchBase()}/health`);
    if (!res.ok) return { ok: false, message: `HTTP ${res.status}` };
    const data = await res.json();
    return {
      ok: true,
      initialized: Boolean(data.initialized),
      agents: data.agents,
      message: data.initialized ? 'Agent running' : 'Agent starting or needs credentials:setup',
    };
  } catch (e: unknown) {
    return { ok: false, message: e instanceof Error ? e.message : 'Unreachable' };
  }
};

export type YoutubeAgentGenerateResult = {
  contentId: string;
  title: string;
  scheduledFor?: string | null;
  status?: string;
};

/** Trigger the full 7-agent pipeline (30–90s). Uses FREE Gemini when configured on the agent. */
export const generateViaYoutubeAgent = async (opts: {
  topic: string;
  style?: string;
  length?: 'short' | 'medium' | 'long';
}): Promise<YoutubeAgentGenerateResult> => {
  const res = await fetch(`${getYoutubeAgentFetchBase()}/generate`, {
    method: 'POST',
    headers: agentHeaders(),
    body: JSON.stringify({
      topic: opts.topic.slice(0, 200),
      style: opts.style || 'engaging',
      length: opts.length || 'short',
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || `Generate failed (${res.status})`);
  }
  return data.result as YoutubeAgentGenerateResult;
};

/** Publish a contentId immediately (agent must have real video + YouTube OAuth configured). */
export const publishYoutubeAgentContent = async (contentId: string) => {
  const res = await fetch(`${getYoutubeAgentFetchBase()}/publish/${encodeURIComponent(contentId)}`, {
    method: 'POST',
    headers: agentHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error || `Publish failed (${res.status})`);
  }
  return data.result;
};

export const getYoutubeAgentSchedule = async () => {
  const res = await fetch(`${getYoutubeAgentFetchBase()}/schedule`);
  if (!res.ok) throw new Error(`Schedule failed (${res.status})`);
  return res.json();
};

export const getYoutubeAgentAnalytics = async () => {
  const res = await fetch(`${getYoutubeAgentFetchBase()}/analytics`);
  if (!res.ok) throw new Error(`Analytics failed (${res.status})`);
  return res.json();
};

/**
 * Publish fallback for CreativeOS Shorts:
 * The agent builds its own video from the topic (Gemini pipeline) — it cannot ingest our WebM blob.
 * We pass topic + SEO metadata from Caption Studio so the agent's output aligns with our campaign.
 */
export const queueYoutubeAgentFromCreativeOs = async (opts: {
  prompt: string;
  hook?: string;
  meta: SocialMetadata;
}): Promise<YoutubeAgentGenerateResult> => {
  const topic = (opts.hook || opts.prompt).slice(0, 200);
  const style = opts.meta.hashtags?.includes('tutorial') ? 'tutorial' : 'engaging';
  return generateViaYoutubeAgent({
    topic: `${topic}\n\nSEO: ${formatCaptionWithTags(opts.meta).slice(0, 400)}`,
    style,
    length: 'short',
  });
};
