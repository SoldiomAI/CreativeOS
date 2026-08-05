/** Local credits ledger — synced from Stripe checkout success / webhook when billing API is live. */

export type PlanTier = 'free' | 'pro';

export type CreditsSnapshot = {
  tier: PlanTier;
  /** One-time purchased credits (MuAPI / hosted generation). */
  balance: number;
  /** Pro subscription active until (ms epoch). */
  proUntil: number | null;
  /** Lifetime movies created (informational). */
  moviesCreated: number;
};

const LS = 'creativeos_credits_v1';
const FREE_START = 10;
const PRO_MONTHLY_CREDITS = 100;

const read = (): CreditsSnapshot => {
  try {
    const raw = localStorage.getItem(LS);
    if (raw) return JSON.parse(raw) as CreditsSnapshot;
  } catch {
    /* ignore */
  }
  return { tier: 'free', balance: FREE_START, proUntil: null, moviesCreated: 0 };
};

const write = (snap: CreditsSnapshot) => {
  try {
    localStorage.setItem(LS, JSON.stringify(snap));
  } catch {
    /* private mode */
  }
};

export const getCredits = (): CreditsSnapshot => {
  const snap = read();
  if (snap.proUntil && snap.proUntil < Date.now()) {
    const downgraded = { ...snap, tier: 'free' as PlanTier, proUntil: null };
    write(downgraded);
    return downgraded;
  }
  return snap;
};

export const isPro = (): boolean => {
  const { proUntil } = getCredits();
  return Boolean(proUntil && proUntil > Date.now());
};

/** Hosted/paid provider generation costs 1 credit unless user has their own API key. */
export const canUseHostedGeneration = (hasOwnKey: boolean): boolean =>
  hasOwnKey || isPro() || getCredits().balance > 0;

export const consumeCredit = (reason = 'generation'): boolean => {
  if (isPro()) return true;
  const snap = getCredits();
  if (snap.balance <= 0) return false;
  write({ ...snap, balance: snap.balance - 1 });
  console.info('[CreativeOS] credit consumed:', reason, 'remaining', snap.balance - 1);
  return true;
};

export const recordMovieCreated = () => {
  const snap = getCredits();
  write({ ...snap, moviesCreated: snap.moviesCreated + 1 });
};

export const grantCredits = (amount: number) => {
  const snap = getCredits();
  write({ ...snap, balance: snap.balance + amount });
};

export const activatePro = (months = 1) => {
  const snap = getCredits();
  const base = snap.proUntil && snap.proUntil > Date.now() ? snap.proUntil : Date.now();
  const proUntil = base + months * 30 * 24 * 60 * 60 * 1000;
  write({
    ...snap,
    tier: 'pro',
    proUntil,
    balance: snap.balance + PRO_MONTHLY_CREDITS,
  });
};

export const applyCheckoutGrant = (grant: { credits?: number; proMonths?: number }) => {
  if (grant.proMonths) activatePro(grant.proMonths);
  if (grant.credits) grantCredits(grant.credits);
};
