import { SocialCampaign, SocialMetadata } from '../types';
import { copyToClipboard, formatCaptionWithTags } from './socialExport';
import {
  blobFromVideoUrl,
  getGoogleOAuthClientId,
  uploadYoutubeShort,
  YoutubeUploadResult,
} from './youtubeService';

export type PlatformPublishStatus = 'idle' | 'uploading' | 'sharing' | 'done' | 'error' | 'skipped';

export type PlatformPublishResult = {
  platform: 'youtube' | 'instagram' | 'tiktok';
  status: PlatformPublishStatus;
  message: string;
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
  platforms?: Array<'youtube' | 'instagram' | 'tiktok'>;
  onPlatform?: (platform: string, status: PlatformPublishStatus, message: string) => void;
};

/**
 * Real publish orchestration:
 * - YouTube Shorts: Google OAuth + YouTube Data API (binary upload / schedule)
 * - Instagram & TikTok: native share sheet with file when the OS supports it (real app handoff)
 */
export const publishForReal = async (opts: RealPublishOptions): Promise<{
  results: PlatformPublishResult[];
  youtube?: YoutubeUploadResult;
}> => {
  const platforms = opts.platforms || ['youtube', 'instagram', 'tiktok'];
  const results: PlatformPublishResult[] = [];
  let youtube: YoutubeUploadResult | undefined;
  const blob = await blobFromVideoUrl(opts.videoUrl);

  if (platforms.includes('youtube')) {
    opts.onPlatform?.('youtube', 'uploading', 'Connecting Google / YouTube…');
    try {
      if (!getGoogleOAuthClientId()) {
        throw new Error(
          'GOOGLE_OAUTH_CLIENT_ID_REQUIRED: Add Google OAuth Client ID in Optimization to publish Shorts for real.'
        );
      }
      const publishAt = `${opts.scheduleDate}T${opts.scheduleTime}:00`;
      youtube = await uploadYoutubeShort({
        videoBlob: blob,
        title: titleFromCaption(opts.campaign.youtube, opts.hook || opts.prompt),
        description: formatCaptionWithTags(opts.campaign.youtube),
        tags: opts.campaign.youtube.hashtags,
        publishAt,
        onProgress: (m) => opts.onPlatform?.('youtube', 'uploading', m),
      });
      const msg = youtube.scheduled
        ? `Scheduled ${youtube.publishAt ? new Date(youtube.publishAt).toLocaleString() : ''}`
        : 'Published';
      opts.onPlatform?.('youtube', 'done', msg);
      results.push({
        platform: 'youtube',
        status: 'done',
        message: msg,
        url: youtube.url,
      });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'YouTube publish failed';
      opts.onPlatform?.('youtube', 'error', message);
      results.push({ platform: 'youtube', status: 'error', message });
    }
  }

  for (const platform of ['instagram', 'tiktok'] as const) {
    if (!platforms.includes(platform)) continue;
    opts.onPlatform?.(platform, 'sharing', 'Opening system share…');
    try {
      const caption = formatCaptionWithTags(opts.campaign[platform]);
      const mode = await shareToNativeApps(blob, caption, `creativeos-${platform}.webm`);
      const message =
        mode === 'shared'
          ? `Shared to device — pick ${platform === 'instagram' ? 'Instagram' : 'TikTok'} in the sheet`
          : 'Caption copied — download the movie and paste into the app (desktop has no file share API)';
      opts.onPlatform?.(platform, 'done', message);
      results.push({ platform, status: 'done', message });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : `${platform} share cancelled`;
      // User cancelling share is common — treat as skipped not hard fail
      const cancelled = /AbortError|cancelled|canceled/i.test(message);
      opts.onPlatform?.(platform, cancelled ? 'skipped' : 'error', message);
      results.push({
        platform,
        status: cancelled ? 'skipped' : 'error',
        message: cancelled ? 'Share cancelled' : message,
      });
    }
  }

  return { results, youtube };
};
