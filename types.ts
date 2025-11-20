export interface ImageFile {
  name: string;
  type: string;
  size: number;
  base64: string;
  url: string;
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