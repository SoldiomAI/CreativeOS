/**
 * Real YouTube Shorts publish via Google Identity Services + YouTube Data API v3.
 * Requires an OAuth 2.0 Web Client ID (Google Cloud Console) with YouTube Data API enabled.
 */

const CLIENT_KEY = 'creativeos_google_oauth_client_id';
const PRIVACY_KEY = 'creativeos_youtube_privacy';

export type YoutubePrivacy = 'public' | 'unlisted' | 'private';

export const getGoogleOAuthClientId = (): string => {
  try {
    const fromLs = localStorage.getItem(CLIENT_KEY)?.trim();
    if (fromLs) return fromLs;
  } catch {
    /* ignore */
  }
  return (process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '').trim();
};

export const setGoogleOAuthClientId = (id: string) => {
  localStorage.setItem(CLIENT_KEY, id.trim());
};

export const getYoutubePrivacy = (): YoutubePrivacy => {
  try {
    const v = localStorage.getItem(PRIVACY_KEY);
    if (v === 'public' || v === 'unlisted' || v === 'private') return v;
  } catch {
    /* ignore */
  }
  return 'unlisted';
};

export const setYoutubePrivacy = (p: YoutubePrivacy) => {
  localStorage.setItem(PRIVACY_KEY, p);
};

type TokenClient = {
  requestAccessToken: (opts?: { prompt?: string }) => void;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (cfg: {
            client_id: string;
            scope: string;
            callback: (resp: { access_token?: string; error?: string; error_description?: string }) => void;
          }) => TokenClient;
        };
      };
    };
  }
}

let gisLoading: Promise<void> | null = null;

const loadGis = (): Promise<void> => {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gisLoading) return gisLoading;
  gisLoading = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-gis="1"]') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services')));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.gis = '1';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
  return gisLoading;
};

export const requestYoutubeAccessToken = async (): Promise<string> => {
  const clientId = getGoogleOAuthClientId();
  if (!clientId) {
    throw new Error(
      'GOOGLE_OAUTH_CLIENT_ID_REQUIRED: Add a Google OAuth Web Client ID in Optimization (YouTube Data API enabled).'
    );
  }
  await loadGis();
  if (!window.google?.accounts?.oauth2) {
    throw new Error('Google Identity Services unavailable');
  }

  return new Promise((resolve, reject) => {
    const tokenClient = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly',
      callback: (resp) => {
        if (resp.error || !resp.access_token) {
          reject(new Error(resp.error_description || resp.error || 'Google OAuth denied'));
          return;
        }
        resolve(resp.access_token);
      },
    });
    tokenClient.requestAccessToken({ prompt: '' });
  });
};

export type YoutubeUploadInput = {
  videoBlob: Blob;
  title: string;
  description: string;
  tags?: string[];
  privacy?: YoutubePrivacy;
  /** ISO datetime — if in the future, video is private until then (real YouTube schedule). */
  publishAt?: string;
  onProgress?: (message: string) => void;
};

export type YoutubeUploadResult = {
  videoId: string;
  url: string;
  title: string;
  scheduled: boolean;
  publishAt?: string;
};

/**
 * Resumable upload to YouTube. Vertical videos ≤60s surface as Shorts with #Shorts.
 * Future publishAt uses YouTube's real schedule (private until publish time).
 */
export const uploadYoutubeShort = async (input: YoutubeUploadInput): Promise<YoutubeUploadResult> => {
  const token = await requestYoutubeAccessToken();
  const privacy = input.privacy || getYoutubePrivacy();
  input.onProgress?.('Authorizing YouTube upload…');

  const tags = Array.from(
    new Set([...(input.tags || []).map((t) => t.replace(/^#/, '')), 'Shorts', 'CreativeOS'])
  ).slice(0, 15);

  const title = (input.title.includes('#Shorts') ? input.title : `${input.title} #Shorts`).slice(0, 100);
  const description = [
    input.description.trim(),
    '',
    '#Shorts',
    tags.map((t) => `#${t}`).join(' '),
  ]
    .join('\n')
    .slice(0, 4900);

  const publishAt = input.publishAt ? new Date(input.publishAt) : null;
  const scheduleReal = Boolean(publishAt && !Number.isNaN(publishAt.getTime()) && publishAt.getTime() > Date.now() + 60_000);

  const status: Record<string, unknown> = {
    selfDeclaredMadeForKids: false,
  };
  if (scheduleReal) {
    status.privacyStatus = 'private';
    status.publishAt = publishAt!.toISOString();
  } else {
    status.privacyStatus = privacy;
  }

  const metadata = {
    snippet: {
      title,
      description,
      tags,
      categoryId: '22',
    },
    status,
  };

  input.onProgress?.(
    scheduleReal
      ? `Scheduling YouTube Short for ${publishAt!.toLocaleString()}…`
      : 'Starting resumable YouTube upload…'
  );
  const initRes = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': input.videoBlob.type || 'video/webm',
        'X-Upload-Content-Length': String(input.videoBlob.size),
      },
      body: JSON.stringify(metadata),
    }
  );

  if (!initRes.ok) {
    const errText = await initRes.text();
    if (initRes.status === 401 || initRes.status === 403) {
      throw new Error(
        `YouTube auth failed (${initRes.status}). Enable YouTube Data API v3 and add http://localhost:5173 to OAuth authorized JavaScript origins. ${errText.slice(0, 160)}`
      );
    }
    throw new Error(`YouTube upload init failed (${initRes.status}): ${errText.slice(0, 200)}`);
  }

  const uploadUrl = initRes.headers.get('Location');
  if (!uploadUrl) throw new Error('YouTube did not return a resumable upload URL');

  input.onProgress?.(`Uploading ${(input.videoBlob.size / 1_000_000).toFixed(1)} MB to YouTube…`);
  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': input.videoBlob.type || 'video/webm',
    },
    body: input.videoBlob,
  });

  if (!putRes.ok) {
    const errText = await putRes.text();
    throw new Error(`YouTube binary upload failed (${putRes.status}): ${errText.slice(0, 200)}`);
  }

  const data = await putRes.json();
  const videoId = data.id as string;
  if (!videoId) throw new Error('YouTube upload succeeded but returned no video id');

  input.onProgress?.(scheduleReal ? 'Scheduled on YouTube' : 'Live on YouTube');
  return {
    videoId,
    url: `https://youtube.com/shorts/${videoId}`,
    title: data.snippet?.title || title,
    scheduled: scheduleReal,
    publishAt: scheduleReal ? publishAt!.toISOString() : undefined,
  };
};

export const blobFromVideoUrl = async (videoUrl: string): Promise<Blob> => {
  const res = await fetch(videoUrl);
  if (!res.ok) throw new Error('Could not read movie bytes for upload');
  return res.blob();
};
