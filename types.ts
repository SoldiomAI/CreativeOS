export interface ImageFile {
  name: string;
  type: string;
  size: number;
  base64: string;
  url: string;
}

export type VideoProvider =
  | 'auto'
  | 'ltx'
  | 'animatediff'
  | 'cogvideox'
  | 'wan-space'
  | 'hf-inference'
  | 'local'
  | 'comfy'
  | 'duix'
  | 'muapi'
  | 'veo';

export type HfVideoModel =
  | 'ltx'
  | 'animatediff'
  | 'cogvideox'
  | 'wan-space'
  | 'hf-inference';

export type AspectRatio = '9:16' | '16:9' | '1:1';

export interface VideoGenerationRequest {
  prompt: string;
  images?: ImageFile[];
  provider?: VideoProvider;
  /** Mix a soundtrack onto the finished movie (default true). */
  soundtrack?: boolean;
  /** Add TTS narration from the prompt (default true). */
  voiceover?: boolean;
  /** Target aspect for local / MuAPI (default 9:16). */
  aspectRatio?: AspectRatio;
  /** Target duration hint in seconds (local compositor + MuAPI). */
  durationSec?: number;
  /** Opening hook text burned into local compositor frames. */
  hookOverlay?: string;
}

export enum AppTab {
  DASHBOARD = 'DASHBOARD',
  STUDIO = 'STUDIO',
  LIBRARY = 'LIBRARY',
  SETTINGS = 'SETTINGS',
}

export interface CreativeConcept {
  title: string;
  hook: string;
  visualDescription: string;
  viralScore: number;
  rationale: string;
}

export interface SocialMetadata {
  caption: string;
  hashtags: string[];
}

export interface SocialCampaign {
  youtube: SocialMetadata;
  instagram: SocialMetadata;
  tiktok: SocialMetadata;
}