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
  | 'veo';

export type HfVideoModel =
  | 'ltx'
  | 'animatediff'
  | 'cogvideox'
  | 'wan-space'
  | 'hf-inference';

export interface VideoGenerationRequest {
  prompt: string;
  images?: ImageFile[];
  provider?: VideoProvider;
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