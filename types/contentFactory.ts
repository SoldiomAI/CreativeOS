/** SOLDIOM Content Factory — structured pipeline types (mirrors Python models). */

export type DeploymentMode = 'local' | 'runpod' | 'gcp';

export type ContentStage =
  | 'idea'
  | 'research'
  | 'strategy'
  | 'script'
  | 'storyboard'
  | 'design'
  | 'voice'
  | 'render'
  | 'qa'
  | 'export';

export type ContentFormat =
  | 'instagram_carousel'
  | 'reel_30'
  | 'reel_60'
  | 'tiktok'
  | 'youtube_short'
  | 'linkedin_post'
  | 'x_thread'
  | 'presentation'
  | 'infographic'
  | 'article'
  | 'instagram_story'
  | 'whatsapp_teaser';

export const CONTENT_STAGES: { id: ContentStage; label: string }[] = [
  { id: 'idea', label: 'Idea' },
  { id: 'research', label: 'Research' },
  { id: 'strategy', label: 'Strategy' },
  { id: 'script', label: 'Script' },
  { id: 'storyboard', label: 'Storyboard' },
  { id: 'design', label: 'Design' },
  { id: 'voice', label: 'Voice' },
  { id: 'render', label: 'Render' },
  { id: 'qa', label: 'QA' },
  { id: 'export', label: 'Export' },
];

export type UniversalInput = {
  prompt?: string;
  url?: string;
  repo?: string;
  brand?: string;
  series?: string;
  goal?: string;
  language?: 'ar' | 'en' | 'bilingual';
  formats?: ContentFormat[] | string[];
  evidence_required?: boolean;
};

export type DirectorBrief = {
  objective?: string;
  audience?: string;
  platform?: string[];
  language?: string;
  tone?: string;
  content_type?: string;
  call_to_action?: string;
  desired_emotion?: string;
  key_message?: string;
  hook?: string;
  supporting_points?: string[];
  visual_style?: string;
  duration?: number | null;
  evidence_required?: boolean;
};

export type ContentPackItem = {
  format: ContentFormat;
  title: string;
  status: 'planned' | 'draft' | 'ready' | 'exported';
  path?: string | null;
};

export type QAReport = {
  status: 'pass' | 'warn' | 'block';
  issues?: { code: string; severity: string; message: string; scene?: number }[];
  checked_at?: string;
};

export type ProjectManifest = {
  id: string;
  slug: string;
  created_at: string;
  updated_at: string;
  stage: ContentStage;
  input: UniversalInput;
  brief?: DirectorBrief | null;
  chosen_hook?: string | null;
  script_md?: string;
  content_pack?: ContentPackItem[];
  qa?: QAReport | null;
  deployment_mode?: DeploymentMode;
  render_hash?: string | null;
};

export type ScfHealth = {
  ok: boolean;
  service?: string;
  deployment_mode?: DeploymentMode;
  libraqm?: boolean;
  gemini?: boolean;
  elevenlabs?: boolean;
  runpod?: boolean;
  gcp?: boolean;
  message?: string;
};

export type DeployModeInfo = {
  id: DeploymentMode;
  label: string;
  description: string;
  configured?: boolean;
};

export type ContentFactorySeed = {
  prompt?: string;
  url?: string;
  repo?: string;
  brand?: string;
  language?: 'ar' | 'en' | 'bilingual';
  goal?: string;
};

export type CalendarEntry = {
  id: string;
  title: string;
  scheduledAt: string;
  format: ContentFormat;
  series?: string;
  projectId?: string;
  status: 'planned' | 'queued' | 'published';
};

export type ContentSeries = {
  id: string;
  name: string;
  theme: string;
  intro?: string;
  outro?: string;
};

export type CreatorProfile = {
  writingStyle?: string;
  preferredLanguage?: 'ar' | 'en' | 'bilingual';
  dialect?: string;
  formality?: string;
  voiceId?: string;
  favouriteFormats?: ContentFormat[];
};
