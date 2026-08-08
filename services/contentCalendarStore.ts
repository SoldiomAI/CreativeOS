/** Brand memory, content calendar, series, creator profile — local persistence. */

import {
  CalendarEntry,
  ContentSeries,
  CreatorProfile,
  ContentFormat,
} from '../types/contentFactory';

const LS = {
  calendar: 'creativeos_scf_calendar',
  series: 'creativeos_scf_series',
  creator: 'creativeos_scf_creator_profile',
  brand: 'creativeos_scf_brand',
};

const readJson = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
};

export const getCalendarEntries = (): CalendarEntry[] =>
  readJson<CalendarEntry[]>(LS.calendar, []);

export const addCalendarEntry = (entry: Omit<CalendarEntry, 'id'> & { id?: string }) => {
  const items = getCalendarEntries();
  const id = entry.id || `cal_${Date.now()}`;
  items.unshift({ ...entry, id });
  writeJson(LS.calendar, items.slice(0, 100));
  return id;
};

export const getContentSeries = (): ContentSeries[] =>
  readJson<ContentSeries[]>(LS.series, [
    {
      id: 'ai_in_60',
      name: 'AI in 60 Seconds',
      theme: 'premium_black_gold',
      intro: 'Quick sovereign AI beat',
    },
    {
      id: 'cyber_explained',
      name: 'Cybersecurity Explained',
      theme: 'cyberpunk',
    },
  ]);

export const getCreatorProfile = (): CreatorProfile =>
  readJson<CreatorProfile>(LS.creator, {
    writingStyle: 'confident, evidence-backed',
    preferredLanguage: 'bilingual',
    dialect: 'gcc',
    formality: 'executive',
    favouriteFormats: ['instagram_carousel', 'reel_30'] as ContentFormat[],
  });

export const setCreatorProfile = (profile: CreatorProfile) => writeJson(LS.creator, profile);

export const getActiveBrand = () => readJson(LS.brand, 'soldiom') as string;
export const setActiveBrand = (brand: string) => writeJson(LS.brand, brand);
