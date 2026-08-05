/**
 * Cross-tab coordination — connects every feature into one pipeline:
 *
 *   Dashboard / Library / Stills ──seed──▶ Studio (create or straight to Caption Studio)
 *   Studio ──write-back──▶ Library (captions + publish outcomes)
 *
 * Seeds are consume-once: a tab sets one, App switches tabs, the target tab takes it
 * on mount. Held in module memory (not persisted) — they only matter within a session.
 */

import { ImageFile } from '../types';

/** Seed for the Studio create step: remix a prompt, animate a still, etc. */
export type StudioSeed = {
  prompt?: string;
  hook?: string;
  images?: ImageFile[];
  godMode?: boolean;
};

/** Seed to reopen a saved Library movie directly in Caption Studio for (re)publishing. */
export type DistributeSeed = {
  libraryItemId: string;
};

let studioSeed: StudioSeed | null = null;
let distributeSeed: DistributeSeed | null = null;

export const setStudioSeed = (seed: StudioSeed) => {
  studioSeed = seed;
  distributeSeed = null;
};

export const takeStudioSeed = (): StudioSeed | null => {
  const seed = studioSeed;
  studioSeed = null;
  return seed;
};

export const setDistributeSeed = (seed: DistributeSeed) => {
  distributeSeed = seed;
  studioSeed = null;
};

export const takeDistributeSeed = (): DistributeSeed | null => {
  const seed = distributeSeed;
  distributeSeed = null;
  return seed;
};
