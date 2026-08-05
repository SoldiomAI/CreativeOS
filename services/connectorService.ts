/**
 * Agent Reach connectors — every publish has four routes with automatic fallback:
 *
 *   1. API        — direct platform API (YouTube Data API v3 today) or a Postiz-compatible
 *                   scheduler API (25+ networks, self-hostable: github.com/gitroomhq/postiz-app).
 *   2. MCP/webhook — a generic HTTP bridge. Point it at an MCP server's HTTP endpoint,
 *                   Zapier/Make/n8n webhook, or any automation that accepts JSON.
 *   3. CLI        — a generated publish.sh (ffmpeg transcode + youtubeuploader + curl to
 *                   Postiz/webhook) you can run from any terminal or cron.
 *   4. Manual     — export pack (video + captions) + clipboard + OS share sheet.
 *
 * All settings live in localStorage; nothing is required — unconfigured routes are skipped.
 */

import { SocialCampaign, SocialMetadata } from '../types';
import { formatCaptionWithTags } from './socialExport';

export type PublishRoute = 'api' | 'scheduler' | 'mcp' | 'cli' | 'share' | 'manual';

export type ReachPlatform = 'youtube' | 'instagram' | 'tiktok';

const LS = {
  postizBase: 'creativeos_postiz_base_url',
  postizKey: 'creativeos_postiz_api_key',
  webhookUrl: 'creativeos_reach_webhook_url',
  webhookAuth: 'creativeos_reach_webhook_auth',
};

const read = (key: string): string => {
  try {
    return localStorage.getItem(key) || '';
  } catch {
    return '';
  }
};

const write = (key: string, value: string) => {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    /* private mode */
  }
};

export const getPostizBaseUrl = () => read(LS.postizBase);
export const setPostizBaseUrl = (v: string) => write(LS.postizBase, v.trim().replace(/\/+$/, ''));
export const getPostizApiKey = () => read(LS.postizKey);
export const setPostizApiKey = (v: string) => write(LS.postizKey, v.trim());
export const getReachWebhookUrl = () => read(LS.webhookUrl);
export const setReachWebhookUrl = (v: string) => write(LS.webhookUrl, v.trim());
export const getReachWebhookAuth = () => read(LS.webhookAuth);
export const setReachWebhookAuth = (v: string) => write(LS.webhookAuth, v.trim());

export type ConnectorAvailability = {
  /** Postiz-compatible scheduler API configured (base URL + key). */
  scheduler: boolean;
  /** Generic MCP/webhook bridge configured. */
  mcp: boolean;
  /** OS share sheet available (mobile mostly). */
  share: boolean;
};

export const getConnectorAvailability = (): ConnectorAvailability => ({
  scheduler: Boolean(getPostizBaseUrl() && getPostizApiKey()),
  mcp: Boolean(getReachWebhookUrl()),
  share: typeof navigator !== 'undefined' && typeof navigator.share === 'function',
});

/* ------------------------------------------------------------------ */
/* Route 1b: Postiz-compatible scheduler API                            */
/* ------------------------------------------------------------------ */

type PostizIntegration = {
  id: string;
  identifier: string; // e.g. 'youtube', 'instagram', 'tiktok'
  name: string;
};

const postizHeaders = () => ({
  Authorization: getPostizApiKey(),
});

/** List connected accounts on the scheduler (Postiz public API v1). */
export const listPostizIntegrations = async (): Promise<PostizIntegration[]> => {
  const base = getPostizBaseUrl();
  const res = await fetch(`${base}/public/v1/integrations`, { headers: postizHeaders() });
  if (!res.ok) throw new Error(`Scheduler integrations failed (${res.status})`);
  const data = await res.json();
  return Array.isArray(data) ? data : data?.integrations || [];
};

const uploadToPostiz = async (blob: Blob, filename: string): Promise<{ id: string; path: string }> => {
  const base = getPostizBaseUrl();
  const form = new FormData();
  form.append('file', new File([blob], filename, { type: blob.type || 'video/webm' }));
  const res = await fetch(`${base}/public/v1/upload`, {
    method: 'POST',
    headers: postizHeaders(),
    body: form,
  });
  if (!res.ok) throw new Error(`Scheduler upload failed (${res.status})`);
  return res.json();
};

export type SchedulerPublishResult = {
  postId?: string;
  integration: string;
  scheduled: boolean;
};

/**
 * Send one platform's post to the Postiz-compatible scheduler.
 * The scheduler owns the platform OAuth + retries — this is the 50+ account path.
 */
export const publishViaScheduler = async (opts: {
  platform: ReachPlatform;
  videoBlob: Blob;
  meta: SocialMetadata;
  scheduleAtIso?: string;
}): Promise<SchedulerPublishResult> => {
  const integrations = await listPostizIntegrations();
  const match = integrations.find((i) =>
    (i.identifier || '').toLowerCase().includes(opts.platform)
  );
  if (!match) {
    throw new Error(`No ${opts.platform} account connected on the scheduler`);
  }

  const media = await uploadToPostiz(opts.videoBlob, `creativeos-${opts.platform}.webm`);
  const base = getPostizBaseUrl();
  const body = {
    type: opts.scheduleAtIso ? 'schedule' : 'now',
    date: opts.scheduleAtIso || new Date().toISOString(),
    shortLink: false,
    posts: [
      {
        integration: { id: match.id },
        value: [
          {
            content: formatCaptionWithTags(opts.meta),
            image: [media],
          },
        ],
      },
    ],
  };

  const res = await fetch(`${base}/public/v1/posts`, {
    method: 'POST',
    headers: { ...postizHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Scheduler post failed (${res.status}) ${text.slice(0, 140)}`);
  }
  const data = await res.json().catch(() => ({}));
  return {
    postId: Array.isArray(data) ? data[0]?.postId : data?.id,
    integration: match.name || match.identifier,
    scheduled: Boolean(opts.scheduleAtIso),
  };
};

/* ------------------------------------------------------------------ */
/* Route 2: MCP / webhook bridge                                        */
/* ------------------------------------------------------------------ */

const blobToDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

/** Videos above this size are not inlined into the webhook payload. */
const MAX_INLINE_VIDEO_BYTES = 25 * 1024 * 1024;

/**
 * POST a publish job to the configured MCP/automation bridge.
 * Payload is deliberately generic: an MCP tool call shape plus flat fields, so it works
 * with MCP HTTP servers, Zapier/Make/n8n webhooks, or a custom worker.
 */
export const publishViaMcpBridge = async (opts: {
  platform: ReachPlatform;
  videoBlob: Blob;
  meta: SocialMetadata;
  prompt: string;
  hook?: string;
  scheduleAtIso?: string;
}): Promise<{ accepted: boolean; response?: string }> => {
  const url = getReachWebhookUrl();
  if (!url) throw new Error('No MCP/webhook bridge configured');

  const inlineVideo =
    opts.videoBlob.size <= MAX_INLINE_VIDEO_BYTES ? await blobToDataUrl(opts.videoBlob) : undefined;

  const payload = {
    tool: 'publish_post',
    source: 'creativeos',
    platform: opts.platform,
    caption: formatCaptionWithTags(opts.meta),
    hashtags: opts.meta.hashtags || [],
    prompt: opts.prompt,
    hook: opts.hook || '',
    scheduleAt: opts.scheduleAtIso || null,
    video: inlineVideo
      ? { encoding: 'dataUrl', mimeType: opts.videoBlob.type || 'video/webm', dataUrl: inlineVideo }
      : { encoding: 'none', note: 'video too large to inline — fetch from CreativeOS export pack' },
  };

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const auth = getReachWebhookAuth();
  if (auth) headers['Authorization'] = auth;

  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
  if (!res.ok) throw new Error(`Bridge rejected job (${res.status})`);
  const text = await res.text().catch(() => '');
  return { accepted: true, response: text.slice(0, 200) };
};

/* ------------------------------------------------------------------ */
/* Route 3: CLI script                                                  */
/* ------------------------------------------------------------------ */

const shellQuote = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;

const heredoc = (name: string, content: string) =>
  `cat > ${name} <<'CREATIVEOS_EOF'\n${content}\nCREATIVEOS_EOF`;

/**
 * Generate a self-contained publish.sh: transcode WebM→MP4, write per-platform captions,
 * upload to YouTube via youtubeuploader, and curl the same job to Postiz / the webhook
 * bridge when configured. Works from any terminal or cron — the CLI fallback route.
 */
export const buildPublishCliScript = (opts: {
  prompt: string;
  hook?: string;
  campaign: SocialCampaign;
  scheduleAtIso?: string;
  videoFilename?: string;
}): string => {
  const video = opts.videoFilename || 'creativeos-movie.webm';
  const postizBase = getPostizBaseUrl();
  const postizKey = getPostizApiKey();
  const webhook = getReachWebhookUrl();
  const webhookAuth = getReachWebhookAuth();
  const title = (opts.hook || opts.prompt).split('\n')[0].slice(0, 90) || 'Creative OS Short';

  const lines: string[] = [
    '#!/usr/bin/env bash',
    '# Creative OS — CLI publish fallback. Run next to the downloaded movie file.',
    `# Prompt: ${opts.prompt.replace(/\n/g, ' ').slice(0, 160)}`,
    'set -euo pipefail',
    '',
    `VIDEO=${shellQuote(video)}`,
    'MP4="${VIDEO%.*}.mp4"',
    '',
    '# --- 1. Transcode WebM -> MP4 (H.264/AAC) for maximum platform compatibility ---',
    'if command -v ffmpeg >/dev/null 2>&1; then',
    '  [ -f "$MP4" ] || ffmpeg -y -i "$VIDEO" -c:v libx264 -pix_fmt yuv420p -c:a aac -movflags +faststart "$MP4"',
    'else',
    '  echo "ffmpeg not found — uploading original WebM (YouTube accepts it; IG/TikTok need MP4)"',
    '  MP4="$VIDEO"',
    'fi',
    '',
    '# --- 2. Captions per platform ---',
    heredoc('youtube.txt', formatCaptionWithTags(opts.campaign.youtube)),
    heredoc('instagram.txt', formatCaptionWithTags(opts.campaign.instagram)),
    heredoc('tiktok.txt', formatCaptionWithTags(opts.campaign.tiktok)),
    '',
    '# --- 3. YouTube via CLI (github.com/porjo/youtubeuploader — needs client_secrets.json) ---',
    'if command -v youtubeuploader >/dev/null 2>&1; then',
    `  youtubeuploader -filename "$MP4" -title ${shellQuote(title)} -description "$(cat youtube.txt)"${
      opts.scheduleAtIso ? ` -metaJSON <(echo '{"publishAt":"${opts.scheduleAtIso}"}')` : ''
    }`,
    'else',
    '  echo "youtubeuploader not installed — skip (brew install youtubeuploader / see github.com/porjo/youtubeuploader)"',
    'fi',
    '',
  ];

  if (postizBase && postizKey) {
    lines.push(
      '# --- 4. Postiz-compatible scheduler API (25+ networks) ---',
      `POSTIZ_BASE=${shellQuote(postizBase)}`,
      `POSTIZ_KEY=${shellQuote(postizKey)}`,
      'UPLOAD=$(curl -sf -H "Authorization: $POSTIZ_KEY" -F "file=@$MP4" "$POSTIZ_BASE/public/v1/upload")',
      'echo "Uploaded media: $UPLOAD"',
      'echo "Now create posts per integration: POST $POSTIZ_BASE/public/v1/posts (see docs.postiz.com/public-api)"',
      ''
    );
  } else {
    lines.push(
      '# --- 4. Scheduler API not configured in Creative OS (Optimization > Agent Reach) ---',
      ''
    );
  }

  if (webhook) {
    lines.push(
      '# --- 5. MCP/webhook bridge (Zapier / Make / n8n / custom MCP HTTP endpoint) ---',
      `curl -sf -X POST ${webhookAuth ? `-H ${shellQuote(`Authorization: ${webhookAuth}`)} ` : ''}-H "Content-Type: application/json" \\`,
      `  -d "{\\"tool\\":\\"publish_post\\",\\"source\\":\\"creativeos-cli\\",\\"caption\\":$(python3 -c 'import json,sys;print(json.dumps(open("youtube.txt").read()))'),\\"scheduleAt\\":${JSON.stringify(
        opts.scheduleAtIso || null
      ).replace(/"/g, '\\"')}}" \\`,
      `  ${shellQuote(webhook)}`,
      ''
    );
  }

  lines.push(
    '# --- Manual fallback: captions are in youtube.txt / instagram.txt / tiktok.txt ---',
    'echo "Done. Manual captions ready: youtube.txt instagram.txt tiktok.txt"'
  );

  return lines.join('\n');
};
