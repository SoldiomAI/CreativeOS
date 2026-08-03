import { SocialCampaign, SocialMetadata } from '../types';

export type PlatformPresetId = 'reels' | 'tiktok' | 'shorts' | 'landscape' | 'square';

export type PlatformPreset = {
  id: PlatformPresetId;
  label: string;
  blurb: string;
  aspectRatio: '9:16' | '16:9' | '1:1';
  durationSec: number;
  width: number;
  height: number;
};

export const PLATFORM_PRESETS: PlatformPreset[] = [
  {
    id: 'tiktok',
    label: 'TikTok',
    blurb: '9:16 · ~15s',
    aspectRatio: '9:16',
    durationSec: 15,
    width: 720,
    height: 1280,
  },
  {
    id: 'reels',
    label: 'IG Reels',
    blurb: '9:16 · ~15s',
    aspectRatio: '9:16',
    durationSec: 15,
    width: 720,
    height: 1280,
  },
  {
    id: 'shorts',
    label: 'YT Shorts',
    blurb: '9:16 · ~20s',
    aspectRatio: '9:16',
    durationSec: 20,
    width: 720,
    height: 1280,
  },
  {
    id: 'square',
    label: 'Feed square',
    blurb: '1:1 · ~10s',
    aspectRatio: '1:1',
    durationSec: 10,
    width: 1080,
    height: 1080,
  },
  {
    id: 'landscape',
    label: 'Landscape',
    blurb: '16:9 · ~15s',
    aspectRatio: '16:9',
    durationSec: 15,
    width: 1280,
    height: 720,
  },
];

export const getPreset = (id: PlatformPresetId): PlatformPreset =>
  PLATFORM_PRESETS.find((p) => p.id === id) || PLATFORM_PRESETS[0];

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'creativeos';

const formatPlatformBlock = (name: string, meta: SocialMetadata): string => {
  const tags = (meta.hashtags || []).map((t) => (t.startsWith('#') ? t : `#${t}`)).join(' ');
  return `=== ${name} ===\n${meta.caption || ''}\n\n${tags}\n`;
};

export const buildExportPackText = (
  prompt: string,
  campaign: SocialCampaign,
  extras?: { hook?: string; provider?: string; scheduledFor?: string }
): string => {
  const parts = [
    'Creative OS — Social Export Pack',
    `Prompt: ${prompt}`,
    extras?.hook ? `Hook: ${extras.hook}` : '',
    extras?.provider ? `Provider: ${extras.provider}` : '',
    extras?.scheduledFor ? `Suggested schedule: ${extras.scheduledFor}` : '',
    '',
    formatPlatformBlock('YouTube Shorts', campaign.youtube),
    formatPlatformBlock('Instagram Reels', campaign.instagram),
    formatPlatformBlock('TikTok', campaign.tiktok),
    '',
    'Companion tools:',
    '- Open Generative AI: https://github.com/Anil-matcha/Open-Generative-AI',
    '- Free AI Social Media Scheduler: https://github.com/Anil-matcha/Free-AI-Social-Media-Scheduler',
    '- AI YouTube Shorts Generator: https://github.com/SamurAIGPT/AI-Youtube-Shorts-Generator',
  ];
  return parts.filter((p) => p !== undefined).join('\n');
};

export const buildExportPackJson = (
  prompt: string,
  campaign: SocialCampaign,
  extras?: { hook?: string; provider?: string; scheduledFor?: string; aspectRatio?: string; durationSec?: number }
) => ({
  app: 'CreativeOS',
  prompt,
  hook: extras?.hook || '',
  provider: extras?.provider || '',
  scheduledFor: extras?.scheduledFor || '',
  aspectRatio: extras?.aspectRatio || '9:16',
  durationSec: extras?.durationSec ?? null,
  platforms: campaign,
  links: {
    openGenerativeAi: 'https://github.com/Anil-matcha/Open-Generative-AI',
    socialScheduler: 'https://github.com/Anil-matcha/Free-AI-Social-Media-Scheduler',
    youtubeShortsGenerator: 'https://github.com/SamurAIGPT/AI-Youtube-Shorts-Generator',
  },
});

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
};

export const downloadTextFile = (text: string, filename: string) => {
  downloadBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), filename);
};

export const downloadJsonFile = (data: unknown, filename: string) => {
  downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), filename);
};

export const downloadVideoFromUrl = async (videoUrl: string, filename: string) => {
  const blob = await fetch(videoUrl).then((r) => r.blob());
  const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
  downloadBlob(blob, filename.endsWith('.mp4') || filename.endsWith('.webm') ? filename : `${filename}.${ext}`);
};

export const downloadSocialExportPack = async (opts: {
  videoUrl: string;
  prompt: string;
  campaign: SocialCampaign;
  hook?: string;
  provider?: string;
  scheduledFor?: string;
  aspectRatio?: string;
  durationSec?: number;
}) => {
  const base = `creativeos-${slugify(opts.prompt)}`;
  await downloadVideoFromUrl(opts.videoUrl, `${base}-movie`);
  downloadTextFile(
    buildExportPackText(opts.prompt, opts.campaign, {
      hook: opts.hook,
      provider: opts.provider,
      scheduledFor: opts.scheduledFor,
    }),
    `${base}-captions.txt`
  );
  downloadJsonFile(
    buildExportPackJson(opts.prompt, opts.campaign, {
      hook: opts.hook,
      provider: opts.provider,
      scheduledFor: opts.scheduledFor,
      aspectRatio: opts.aspectRatio,
      durationSec: opts.durationSec,
    }),
    `${base}-pack.json`
  );
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
};

export const formatCaptionWithTags = (meta: SocialMetadata): string => {
  const tags = (meta.hashtags || []).map((t) => (t.startsWith('#') ? t : `#${t}`)).join(' ');
  return `${meta.caption || ''}\n\n${tags}`.trim();
};

/** Local marketing-style caption variants when Gemini is unavailable. */
export const buildFallbackCampaign = (prompt: string, hook?: string): SocialCampaign => {
  const line = (hook || prompt).replace(/\s+/g, ' ').trim().slice(0, 140);
  const short = prompt.replace(/\s+/g, ' ').trim().slice(0, 90);
  return {
    youtube: {
      caption: `${line}\n\nFull vibe: ${short}\n\nSubscribe for more AI shorts.`,
      hashtags: ['shorts', 'ai', 'creativeos', 'youtubeshorts'],
    },
    instagram: {
      caption: `${line}\n\n✨ Made in Creative OS\n💾 Save this for your next shoot`,
      hashtags: ['reels', 'aesthetic', 'aiart', 'creators'],
    },
    tiktok: {
      caption: `${line} 🔥`,
      hashtags: ['fyp', 'viral', 'ai', 'foryou'],
    },
  };
};
