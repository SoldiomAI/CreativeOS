/**
 * God Mode — amplify a single prompt into a short-form movie brief:
 * hook, multi-beat scenes, end CTA, and social-ready extras.
 */

export type MovieBeat = {
  title: string;
  visual: string;
  onScreenText: string;
  seconds: number;
};

export type GodBrief = {
  hook: string;
  title: string;
  beats: MovieBeat[];
  endCta: string;
  aspectHint: '9:16';
  totalSeconds: number;
  socialSeed: string;
};

const clean = (s: string) => s.replace(/\s+/g, ' ').trim();

export const extractHook = (prompt: string, explicit?: string): string => {
  if (explicit?.trim()) return clean(explicit).slice(0, 90);
  const text = clean(prompt);
  if (!text) return 'Watch this.';
  const first = text.split(/[.!?\n]/)[0] || text;
  if (first.length <= 72) return first;
  return `${first.slice(0, 69).trim()}…`;
};

const splitRawBeats = (prompt: string): string[] => {
  const text = clean(prompt);
  const byBreak = text
    .split(/\n+| monologue:| scene\s*\d+:| beat\s*\d+:/i)
    .map(clean)
    .filter((p) => p.length > 8);
  if (byBreak.length >= 2) return byBreak.slice(0, 5);

  const bySentence = text
    .split(/(?<=[.!?])\s+/)
    .map(clean)
    .filter((p) => p.length > 12);
  if (bySentence.length >= 2) return bySentence.slice(0, 5);

  // Synthesize cinematic beats from one prompt
  return [
    `Open on: ${text}`,
    `Push in — detail and motion: ${text}`,
    `Climax energy — ${text}`,
    `Resolve with a memorable final frame of: ${text}`,
  ];
};

export const buildGodBrief = (
  prompt: string,
  options?: { hook?: string; durationSec?: number; godMode?: boolean }
): GodBrief => {
  const god = options?.godMode !== false;
  const hook = extractHook(prompt, options?.hook);
  const raw = splitRawBeats(prompt);
  const target = Math.max(god ? 18 : 10, options?.durationSec || (god ? 22 : 12));
  const per = Math.max(2.2, target / Math.max(1, raw.length + (god ? 2 : 1)));

  const beats: MovieBeat[] = raw.map((visual, i) => ({
    title: `Beat ${i + 1}`,
    visual,
    onScreenText: i === 0 ? hook : clean(visual).slice(0, 64),
    seconds: per,
  }));

  if (god && beats.length < 3) {
    while (beats.length < 3) {
      beats.push({
        title: `Beat ${beats.length + 1}`,
        visual: `${prompt} — cinematic continuation`,
        onScreenText: hook,
        seconds: per,
      });
    }
  }

  const totalSeconds =
    beats.reduce((s, b) => s + b.seconds, 0) + (god ? 2.4 : 1.2);

  return {
    hook,
    title: clean(prompt).slice(0, 48) || 'Untitled Drop',
    beats,
    endCta: god ? 'Follow for the next drop · Creative OS' : 'Creative OS',
    aspectHint: '9:16',
    totalSeconds,
    socialSeed: `${hook} — ${clean(prompt).slice(0, 120)}`,
  };
};

export const amplifyPromptForProviders = (prompt: string, godMode: boolean): string => {
  if (!godMode) return prompt;
  const brief = buildGodBrief(prompt, { godMode: true });
  return [
    prompt.trim(),
    `Cinematic short-form vertical video, high retention, ${brief.beats.length} visual beats.`,
    `Opening hook energy: ${brief.hook}`,
    'Dynamic camera, rich lighting, social-native pacing.',
  ].join(' ');
};

export const GOD_MODE_KEY = 'creativeos_god_mode';

export const getGodModeEnabled = (): boolean => {
  try {
    return localStorage.getItem(GOD_MODE_KEY) === '1';
  } catch {
    return false;
  }
};

export const setGodModeEnabled = (on: boolean) => {
  localStorage.setItem(GOD_MODE_KEY, on ? '1' : '0');
};
