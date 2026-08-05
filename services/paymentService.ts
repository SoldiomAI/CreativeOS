/**
 * Stripe billing client — talks to the local payment API (`server/payment-api.mjs`).
 * Works in dev via Vite proxy `/api/billing` → :4242. Production: deploy the same server
 * or map to serverless functions with identical routes.
 */

import { applyCheckoutGrant } from './creditsStore';

export type BillingPlanId = 'pro_monthly' | 'credits_10' | 'credits_50';

export type BillingPlan = {
  id: BillingPlanId;
  name: string;
  priceLabel: string;
  blurb: string;
  /** Stripe Price ID — set in Optimization or .env (VITE_STRIPE_PRICE_*). */
  priceId: string;
};

const LS_PRICE = {
  pro: 'creativeos_stripe_price_pro',
  c10: 'creativeos_stripe_price_credits_10',
  c50: 'creativeos_stripe_price_credits_50',
};

const read = (key: string) => {
  try {
    return localStorage.getItem(key) || '';
  } catch {
    return '';
  }
};

const write = (key: string, v: string) => {
  try {
    if (v) localStorage.setItem(key, v);
    else localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
};

export const getStripePublishableKey = () =>
  read('creativeos_stripe_pk') ||
  (typeof import.meta !== 'undefined' && (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_STRIPE_PUBLISHABLE_KEY) ||
  '';

export const setStripePublishableKey = (v: string) => write('creativeos_stripe_pk', v.trim());

export const getBillingApiBase = () => read('creativeos_billing_api') || '/api/billing';

export const setBillingApiBase = (v: string) =>
  write('creativeos_billing_api', v.trim().replace(/\/+$/, ''));

export const getStripePricePro = () =>
  read(LS_PRICE.pro) ||
  (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_STRIPE_PRICE_PRO ||
  '';

export const setStripePricePro = (v: string) => write(LS_PRICE.pro, v.trim());
export const getStripePriceCredits10 = () =>
  read(LS_PRICE.c10) ||
  (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_STRIPE_PRICE_CREDITS_10 ||
  '';
export const setStripePriceCredits10 = (v: string) => write(LS_PRICE.c10, v.trim());
export const getStripePriceCredits50 = () =>
  read(LS_PRICE.c50) ||
  (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_STRIPE_PRICE_CREDITS_50 ||
  '';
export const setStripePriceCredits50 = (v: string) => write(LS_PRICE.c50, v.trim());

export const BILLING_PLANS = (): BillingPlan[] => [
  {
    id: 'pro_monthly',
    name: 'Pro',
    priceLabel: '$19/mo',
    blurb: '100 hosted credits/mo · priority MuAPI · unlimited local',
    priceId: getStripePricePro(),
  },
  {
    id: 'credits_10',
    name: 'Credit pack',
    priceLabel: '$5',
    blurb: '10 hosted generation credits (MuAPI / Veo without your own key)',
    priceId: getStripePriceCredits10(),
  },
  {
    id: 'credits_50',
    name: 'Studio pack',
    priceLabel: '$19',
    blurb: '50 hosted credits — best for batch social drops',
    priceId: getStripePriceCredits50(),
  },
];

export type BillingHealth = {
  ok: boolean;
  stripe: boolean;
  message?: string;
};

export const pingBillingApi = async (): Promise<BillingHealth> => {
  try {
    const res = await fetch(`${getBillingApiBase()}/health`);
    if (!res.ok) return { ok: false, stripe: false, message: `HTTP ${res.status}` };
    return (await res.json()) as BillingHealth;
  } catch (e: unknown) {
    return {
      ok: false,
      stripe: false,
      message: e instanceof Error ? e.message : 'Billing API unreachable',
    };
  }
};

/** Create a Stripe Checkout session and redirect the browser. */
export const startCheckout = async (planId: BillingPlanId): Promise<void> => {
  const plan = BILLING_PLANS().find((p) => p.id === planId);
  if (!plan?.priceId) {
    throw new Error(
      'Stripe Price ID not configured. Add price IDs in Optimization → Billing, or set VITE_STRIPE_PRICE_* in .env.local and run the payment API server.'
    );
  }

  const origin = window.location.origin;
  const res = await fetch(`${getBillingApiBase()}/create-checkout-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      planId,
      priceId: plan.priceId,
      successUrl: `${origin}/?billing=success&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${origin}/?billing=cancel`,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Checkout failed (${res.status})`);
  }

  const { url } = (await res.json()) as { url?: string };
  if (!url) throw new Error('No checkout URL returned');
  window.location.href = url;
};

/** After Stripe redirect, verify session and grant credits locally. */
export const handleBillingReturn = async (): Promise<'success' | 'cancel' | null> => {
  const params = new URLSearchParams(window.location.search);
  const billing = params.get('billing');
  if (!billing) return null;

  if (billing === 'cancel') {
    window.history.replaceState({}, '', window.location.pathname);
    return 'cancel';
  }

  if (billing === 'success') {
    const sessionId = params.get('session_id');
    window.history.replaceState({}, '', window.location.pathname);
    if (!sessionId) return 'success';

    try {
      const res = await fetch(`${getBillingApiBase()}/session/${encodeURIComponent(sessionId)}`);
      if (res.ok) {
        const data = (await res.json()) as { grant?: { credits?: number; proMonths?: number } };
        if (data.grant) applyCheckoutGrant(data.grant);
      }
    } catch {
      /* grant may arrive via webhook instead */
    }
    return 'success';
  }

  return null;
};
