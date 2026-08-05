import React, { useEffect, useState } from 'react';
import {
  BILLING_PLANS,
  BillingPlanId,
  getBillingApiBase,
  getStripePriceCredits10,
  getStripePriceCredits50,
  getStripePricePro,
  getStripePublishableKey,
  pingBillingApi,
  setBillingApiBase,
  setStripePriceCredits10,
  setStripePriceCredits50,
  setStripePricePro,
  setStripePublishableKey,
  startCheckout,
} from '../services/paymentService';
import { getCredits, isPro } from '../services/creditsStore';

type BillingPanelProps = {
  compact?: boolean;
  onNotice?: (msg: string) => void;
};

const BillingPanel: React.FC<BillingPanelProps> = ({ compact, onNotice }) => {
  const [health, setHealth] = useState<{ ok: boolean; stripe: boolean; message?: string } | null>(null);
  const [loading, setLoading] = useState<BillingPlanId | null>(null);
  const [credits, setCredits] = useState(getCredits());
  const [pk, setPk] = useState(getStripePublishableKey());
  const [apiBase, setApiBase] = useState(getBillingApiBase());
  const [pricePro, setPricePro] = useState(getStripePricePro());
  const [price10, setPrice10] = useState(getStripePriceCredits10());
  const [price50, setPrice50] = useState(getStripePriceCredits50());

  useEffect(() => {
    pingBillingApi().then(setHealth);
    setCredits(getCredits());
  }, []);

  const refreshCredits = () => setCredits(getCredits());

  const handleCheckout = async (planId: BillingPlanId) => {
    setLoading(planId);
    try {
      await startCheckout(planId);
    } catch (e: unknown) {
      onNotice?.(e instanceof Error ? e.message : 'Checkout failed');
    } finally {
      setLoading(null);
    }
  };

  if (compact) {
    return (
      <div className="cos-panel rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold">Credits</h3>
          <span className={`text-xs font-mono ${isPro() ? 'text-amber-300' : 'text-emerald-400'}`}>
            {isPro() ? 'PRO' : `${credits.balance} left`}
          </span>
        </div>
        <p className="text-xs text-gray-400">
          Hosted MuAPI/Veo without your own key uses credits. Local + your HF token stays free.
        </p>
        <div className="flex flex-wrap gap-2">
          {BILLING_PLANS()
            .filter((p) => p.priceId)
            .slice(0, 2)
            .map((plan) => (
              <button
                key={plan.id}
                type="button"
                disabled={Boolean(loading)}
                onClick={() => handleCheckout(plan.id)}
                className="text-xs px-3 py-2 rounded-lg cos-btn-primary text-ink font-semibold disabled:opacity-50"
              >
                {loading === plan.id ? '…' : plan.priceLabel}
              </button>
            ))}
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-4 border border-gray-700 rounded-xl p-4 bg-gray-800/40">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-white font-semibold">Billing (Stripe)</h3>
          <p className="text-gray-400 text-sm mt-1">
            Payment API ready — run <span className="text-gray-200 font-mono">npm run dev:all</span> for
            checkout in dev. Production: deploy <span className="text-gray-200">server/payment-api.mjs</span>.
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[10px] uppercase tracking-wider text-white/40">Balance</div>
          <div className="cos-display text-2xl text-amber-200">{credits.balance}</div>
          {isPro() && <div className="text-[10px] text-amber-300 font-mono">PRO active</div>}
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs font-mono">
        <span
          className={`px-2 py-1 rounded ${health?.ok ? 'bg-emerald-900/40 text-emerald-300' : 'bg-rose-900/40 text-rose-300'}`}
        >
          API {health?.ok ? 'UP' : 'DOWN'}
        </span>
        <span
          className={`px-2 py-1 rounded ${health?.stripe ? 'bg-emerald-900/40 text-emerald-300' : 'bg-amber-900/40 text-amber-300'}`}
        >
          Stripe {health?.stripe ? 'OK' : 'needs key'}
        </span>
        {health?.message && <span className="text-gray-500 truncate">{health.message}</span>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {BILLING_PLANS().map((plan) => (
          <div key={plan.id} className="border border-gray-700 rounded-lg p-3 bg-gray-900/50 flex flex-col">
            <div className="font-semibold text-white">{plan.name}</div>
            <div className="text-amber-200 cos-display text-xl my-1">{plan.priceLabel}</div>
            <p className="text-xs text-gray-400 flex-grow mb-3">{plan.blurb}</p>
            <button
              type="button"
              disabled={!plan.priceId || Boolean(loading)}
              onClick={() => handleCheckout(plan.id)}
              className="w-full py-2 rounded-lg cos-btn-primary text-ink text-sm font-bold disabled:opacity-40"
            >
              {!plan.priceId
                ? 'Set price ID'
                : loading === plan.id
                  ? 'Redirecting…'
                  : 'Checkout'}
            </button>
          </div>
        ))}
      </div>

      <details className="text-sm">
        <summary className="text-gray-400 cursor-pointer hover:text-white">Stripe configuration</summary>
        <div className="mt-3 space-y-2">
          <label className="block text-xs text-gray-500 font-mono uppercase">Publishable key (pk_…)</label>
          <input
            value={pk}
            onChange={(e) => {
              setPk(e.target.value);
              setStripePublishableKey(e.target.value);
            }}
            placeholder="pk_test_…"
            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white outline-none"
          />
          <label className="block text-xs text-gray-500 font-mono uppercase">Billing API base</label>
          <input
            value={apiBase}
            onChange={(e) => {
              setApiBase(e.target.value);
              setBillingApiBase(e.target.value);
            }}
            placeholder="/api/billing"
            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white outline-none"
          />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              ['Pro price ID', pricePro, setPricePro, setStripePricePro],
              ['Credits 10', price10, setPrice10, setStripePriceCredits10],
              ['Credits 50', price50, setPrice50, setStripePriceCredits50],
            ].map(([label, val, setVal, persist]) => (
              <div key={String(label)}>
                <label className="block text-[10px] text-gray-500 font-mono uppercase mb-1">{label}</label>
                <input
                  value={val as string}
                  onChange={(e) => {
                    (setVal as (v: string) => void)(e.target.value);
                    (persist as (v: string) => void)(e.target.value);
                  }}
                  placeholder="price_…"
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-2 py-1.5 text-xs text-white outline-none"
                />
              </div>
            ))}
          </div>
          <p className="text-[11px] text-gray-500">
            Server secret: <span className="text-gray-300">STRIPE_SECRET_KEY</span> in env only (never in
            browser). Webhook: <span className="text-gray-300">POST /api/billing/webhook</span>
          </p>
          <button
            type="button"
            onClick={() => {
              pingBillingApi().then(setHealth);
              refreshCredits();
            }}
            className="text-xs text-cyan-400 hover:underline"
          >
            Re-test API
          </button>
        </div>
      </details>
    </section>
  );
};

export default BillingPanel;
