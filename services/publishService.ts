import { SocialCampaign, SocialMetadata } from '../types';
import { copyToClipboard, formatCaptionWithTags } from './socialExport';
import {
  blobFromVideoUrl,
  getGoogleOAuthClientId,
  uploadYoutubeShort,
  YoutubeUploadResult,
} from './youtubeService';
import {
  getConnectorAvailability,
  publishViaMcpBridge,
  publishViaScheduler,
  PublishRoute,
  ReachPlatform,
} from './connectorService';
import {
  isYoutubeAgentConfigured,
  pingYoutubeAgent,
  queueYoutubeAgentFromCreativeOs,
} from './youtubeAgentService';

export type PlatformPublishStatus = 'idle' | 'uploading' | 'sharing' | 'done' | 'error' | 'skipped';

export type PlatformPublishResult = {
  platform: ReachPlatform;
  status: PlatformPublishStatus;
  message: string;
  /** Which route actually delivered: api | scheduler | mcp | share | manual. */
  via?: PublishRoute;
  url?: string;
};

const titleFromCaption = (meta: SocialMetadata, fallback: string): string => {
  const line = (meta.caption || fallback).split('\n')[0].replace(/#\w+/g, '').trim();
  return (line || fallback || 'Creative OS Short').slice(0, 90);
};

/**
 * Share video + caption via the OS share sheet (real Instagram/TikTok handoff on mobile).
 */
export const shareToNativeApps = async (
  videoBlob: Blob,
  caption: string,
  filename = 'creativeos-short.webm'
): Promise<'shared' | 'copied'> => {
  const file = new File([videoBlob], filename, { type: videoBlob.type || 'video/webm' });
  const nav = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean;
    share?: (data: ShareData) => Promise<void>;
  };

  if (nav.share && nav.canShare?.({ files: [file], text: caption })) {
    await nav.share({ files: [file], text: caption, title: 'Creative OS Short' });
    return 'shared';
  }
  if (nav.share) {
    await copyToClipboard(caption);
    await nav.share({ text: caption, title: 'Creative OS Short' });
    return 'shared';
  }
  await copyToClipboard(caption);
  return 'copied';
};

export type RealPublishOptions = {
  videoUrl: string;
  campaign: SocialCampaign;
  prompt: string;
  hook?: string;
  scheduleDate: string;
  scheduleTime: string;
  platforms?: ReachPlatform[];
  onPlatform?: (platform: string, status: PlatformPublishStatus, message: string) => void;
};

type LadderStep = {
  route: PublishRoute;
  run: () => Promise<PlatformPublishResult>;
};

/** Run fallback steps in order; first success wins, errors accumulate for the report. */
const runLadder = async (
  platform: ReachPlatform,
  steps: LadderStep[],
  onStatus?: (status: PlatformPublishStatus, message: string) => void
): Promise<PlatformPublishResult> => {
  const failures: string[] = [];
  for (const step of steps) {
    try {
      const result = await step.run();
      if (failures.length && result.status === 'done') {
        result.message = `${result.message} (fell back to ${step.route})`;
      }
      return result;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      const cancelled = /AbortError|cancelled|canceled/i.test(message);
      if (cancelled) {
        return { platform, status: 'skipped', message: 'Share cancelled', via: step.route };
      }
      failures.push(`${step.route}: ${message}`);
      onStatus?.('uploading', `${step.route} failed — trying next route…`);
    }
  }
  return {
    platform,
    status: 'error',
    message: failures.join('\n') || 'No publish route configured',
  };
};

/**
 * Real publish orchestration with all-ways fallback per platform:
 *
 *   YouTube:        direct API (Google OAuth) → scheduler API → MCP/webhook → manual
 *   Instagram/TikTok: scheduler API → MCP/webhook → OS share sheet → manual (clipboard)
 *
 * The CLI route lives beside this: Studio can download a generated publish.sh
 * (see connectorService.buildPublishCliScript) to run the same job from a terminal/cron.
 */
export const publishForReal = async (opts: RealPublishOptions): Promise<{
  results: PlatformPublishResult[];
  youtube?: YoutubeUploadResult;
}> => {
  const platforms = opts.platforms || ['youtube', 'instagram', 'tiktok'];
  const results: PlatformPublishResult[] = [];
  let youtube: YoutubeUploadResult | undefined;
  const blob = await blobFromVideoUrl(opts.videoUrl);
  const avail = getConnectorAvailability();
  const scheduleAtIso = `${opts.scheduleDate}T${opts.scheduleTime}:00`;
  const scheduleInFuture = new Date(scheduleAtIso).getTime() > Date.now();

  const schedulerStep = (platform: ReachPlatform, meta: SocialMetadata): LadderStep => ({
    route: 'scheduler',
    run: async () => {
      opts.onPlatform?.(platform, 'uploading', 'Sending to scheduler (Postiz API)…');
      const r = await publishViaScheduler({
        platform,
        videoBlob: blob,
        meta,
        scheduleAtIso: scheduleInFuture ? new Date(scheduleAtIso).toISOString() : undefined,
      });
      return {
        platform,
        status: 'done' as const,
        via: 'scheduler' as const,
        message: r.scheduled
          ? `Scheduled on ${r.integration} via scheduler API`
          : `Queued on ${r.integration} via scheduler API`,
      };
    },
  });

  const mcpStep = (platform: ReachPlatform, meta: SocialMetadata): LadderStep => ({
    route: 'mcp',
    run: async () => {
      opts.onPlatform?.(platform, 'uploading', 'Handing to MCP/webhook bridge…');
      await publishViaMcpBridge({
        platform,
        videoBlob: blob,
        meta,
        prompt: opts.prompt,
        hook: opts.hook,
        scheduleAtIso: scheduleInFuture ? new Date(scheduleAtIso).toISOString() : undefined,
      });
      return {
        platform,
        status: 'done' as const,
        via: 'mcp' as const,
        message: 'Job accepted by MCP/webhook bridge',
      };
    },
  });

  const manualStep = (platform: ReachPlatform, meta: SocialMetadata): LadderStep => ({
    route: 'manual',
    run: async () => {
      await copyToClipboard(formatCaptionWithTags(meta));
      return {
        platform,
        status: 'done' as const,
        via: 'manual' as const,
        message: 'Caption copied — download the movie (or CLI script) and post manually',
      };
    },
  });

  if (platforms.includes('youtube')) {
    const steps: LadderStep[] = [];

    if (getGoogleOAuthClientId()) {
      steps.push({
        route: 'api',
        run: async () => {
          opts.onPlatform?.('youtube', 'uploading', 'Connecting Google / YouTube…');
          youtube = await uploadYoutubeShort({
            videoBlob: blob,
            title: titleFromCaption(opts.campaign.youtube, opts.hook || opts.prompt),
            description: formatCaptionWithTags(opts.campaign.youtube),
            tags: opts.campaign.youtube.hashtags,
            publishAt: scheduleAtIso,
            onProgress: (m) => opts.onPlatform?.('youtube', 'uploading', m),
          });
          const msg = youtube.scheduled
            ? `Scheduled ${youtube.publishAt ? new Date(youtube.publishAt).toLocaleString() : ''}`
            : 'Published';
          return { platform: 'youtube' as const, status: 'done' as const, via: 'api' as const, message: msg, url: youtube.url };
        },
      });
    }
    if (avail.scheduler) steps.push(schedulerStep('youtube', opts.campaign.youtube));
    if (isYoutubeAgentConfigured()) {
      steps.push({
        route: 'youtube-agent',
        run: async () => {
          opts.onPlatform?.('youtube', 'uploading', 'Handing topic to YouTube Automation Agent…');
          const health = await pingYoutubeAgent();
          if (!health.ok) throw new Error(health.message || 'YouTube Agent unreachable');
          const result = await queueYoutubeAgentFromCreativeOs({
            prompt: opts.prompt,
            hook: opts.hook,
            meta: opts.campaign.youtube,
          });
          const msg = result.scheduledFor
            ? `Agent queued "${result.title}" for ${new Date(result.scheduledFor).toLocaleString()}`
            : `Agent pipeline started: "${result.title}" (contentId ${result.contentId})`;
          return {
            platform: 'youtube' as const,
            status: 'done' as const,
            via: 'youtube-agent' as const,
            message: `${msg} — agent generates its own video via Gemini (see dashboard :3456)`,
          };
        },
      });
    }
    if (avail.mcp) steps.push(mcpStep('youtube', opts.campaign.youtube));
    steps.push(manualStep('youtube', opts.campaign.youtube));

    const result = await runLadder('youtube', steps, (s, m) => opts.onPlatform?.('youtube', s, m));
    opts.onPlatform?.('youtube', result.status, result.message);
    results.push(result);
  }

  for (const platform of ['instagram', 'tiktok'] as const) {
    if (!platforms.includes(platform)) continue;
    const meta = opts.campaign[platform];
    const steps: LadderStep[] = [];

    if (avail.scheduler) steps.push(schedulerStep(platform, meta));
    if (avail.mcp) steps.push(mcpStep(platform, meta));
    steps.push({
      route: 'share',
      run: async () => {
        opts.onPlatform?.(platform, 'sharing', 'Opening system share…');
        const caption = formatCaptionWithTags(meta);
        const mode = await shareToNativeApps(blob, caption, `creativeos-${platform}.webm`);
        if (mode === 'copied') throw new Error('No file share API on this device');
        return {
          platform,
          status: 'done' as const,
          via: 'share' as const,
          message: `Shared to device — pick ${platform === 'instagram' ? 'Instagram' : 'TikTok'} in the sheet`,
        };
      },
    });
    steps.push(manualStep(platform, meta));

    const result = await runLadder(platform, steps, (s, m) => opts.onPlatform?.(platform, s, m));
    opts.onPlatform?.(platform, result.status, result.message);
    results.push(result);
  }

  return { results, youtube };
};
