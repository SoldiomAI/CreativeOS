export enum AppTab {
  DASHBOARD = 'DASHBOARD',
  STUDIO = 'STUDIO',
  LIBRARY = 'LIBRARY',
  SETTINGS = 'SETTINGS',
}

export type CompilerStage =
  | 'INTENT'
  | 'EVIDENCE'
  | 'STRATEGY'
  | 'NARRATIVE'
  | 'SCENE'
  | 'RENDER'
  | 'DISTRIBUTION'
  | 'PERFORMANCE'
  | 'LEARNING';

export interface ProjectConstitution {
  projectId: string;
  objective: string;
  audiences: string[];
  markets: string[];
  languages: string[];
  platforms: string[];
  brand?: string;
  tone: string[];
  contentGoal: string;
  conversionGoal?: string;
  evidenceLevel: 'standard' | 'strict' | 'locked';
  visualPolicy: 'deterministic_only';
}

export interface EvidenceClaim {
  id: string;
  claim: string;
  type: 'fact' | 'statistic' | 'quote' | 'inference';
  confidence: number;
  sources: string[];
  dateSensitive: boolean;
  verifiedAt?: string;
  allowedForPublication: boolean;
}

export interface ContentAtom {
  id: string;
  type: 'hook' | 'fact' | 'statistic' | 'quote' | 'definition' | 'analogy' | 'case-study' | 'cta' | 'insight';
  text: string;
  claimIds?: string[];
}

export interface NarrativeNode {
  id: string;
  type: 'hook' | 'problem' | 'proof' | 'insight' | 'example' | 'resolution' | 'cta';
  contentAtomIds: string[];
  dependsOn?: string[];
}

export interface SceneElement {
  id: string;
  component: string;
  content?: string;
  data?: Record<string, unknown>;
  rtl?: boolean;
  claimIds?: string[];
}

export interface SceneIR {
  id: string;
  purpose: string;
  durationSeconds?: number;
  language: string;
  direction: 'rtl' | 'ltr';
  elements: SceneElement[];
  transition?: string;
}

export interface OutputFormat {
  id: string;
  label: string;
  aspect: string;
  enabled: boolean;
  status: 'planned' | 'ready' | 'blocked';
}

export interface QualityGate {
  id: string;
  label: string;
  status: 'pass' | 'warn' | 'block' | 'pending';
  detail?: string;
}
