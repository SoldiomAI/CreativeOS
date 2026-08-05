/**
 * Creative OS Payment API — Stripe Checkout + webhook.
 *
 * Env (server-side only — never bundle STRIPE_SECRET_KEY):
 *   STRIPE_SECRET_KEY=sk_test_...
 *   STRIPE_WEBHOOK_SECRET=whsec_...   (optional in dev)
 *   PORT=4242
 *
 * Run: npm run payment-api
 * Dev with app: npm run dev:all
 */

import express from 'express';
import Stripe from 'stripe';

const PORT = Number(process.env.PORT || 4242);
const ORIGIN = process.env.APP_ORIGIN || 'http://localhost:5173';

const secret = process.env.STRIPE_SECRET_KEY || '';
const stripe = secret ? new Stripe(secret) : null;

/** In-memory session grants (production: use Redis/DB + webhook as source of truth). */
const sessionGrants = new Map();

const PLAN_GRANTS = {
  pro_monthly: { proMonths: 1, credits: 100 },
  credits_10: { credits: 10 },
  credits_50: { credits: 50 },
};

const app = express();

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    stripe: Boolean(stripe),
    message: stripe ? 'Stripe configured' : 'Set STRIPE_SECRET_KEY to enable checkout',
  });
});

app.get('/api/billing/health', (_req, res) => {
  res.json({
    ok: true,
    stripe: Boolean(stripe),
    message: stripe ? 'Stripe configured' : 'Set STRIPE_SECRET_KEY to enable checkout',
  });
});

app.post('/api/billing/create-checkout-session', express.json(), async (req, res) => {
  if (!stripe) {
    return res.status(503).json({
      error: 'Payment API not configured. Set STRIPE_SECRET_KEY and restart payment-api.',
    });
  }

  const { planId, priceId, successUrl, cancelUrl } = req.body || {};
  if (!planId || !priceId) {
    return res.status(400).json({ error: 'planId and priceId required' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: planId === 'pro_monthly' ? 'subscription' : 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl || `${ORIGIN}/?billing=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${ORIGIN}/?billing=cancel`,
      metadata: { planId, creativeos: '1' },
    });

    if (session.id) {
      sessionGrants.set(session.id, { planId, pending: true });
    }

    res.json({ url: session.url, sessionId: session.id });
  } catch (e) {
    console.error('[billing] checkout error', e);
    res.status(500).json({ error: e instanceof Error ? e.message : 'Checkout failed' });
  }
});

app.get('/api/billing/session/:id', async (req, res) => {
  const sessionId = req.params.id;
  if (!stripe) {
    return res.status(503).json({ error: 'Stripe not configured' });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      return res.status(402).json({ error: 'Payment not completed' });
    }

    const planId = session.metadata?.planId || sessionGrants.get(sessionId)?.planId;
    const grant = PLAN_GRANTS[planId] || { credits: 0 };
    sessionGrants.set(sessionId, { planId, grant, fulfilled: true });

    res.json({ ok: true, planId, grant });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Session lookup failed' });
  }
});

/** Stripe webhook — grants credits when checkout completes (production path). */
app.post(
  '/api/billing/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    if (!stripe) return res.status(503).send('Stripe not configured');

    const sig = req.headers['stripe-signature'];
    const whSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    try {
      if (whSecret && sig) {
        event = stripe.webhooks.constructEvent(req.body, sig, whSecret);
      } else {
        event = JSON.parse(req.body.toString());
      }
    } catch (e) {
      console.error('[billing] webhook signature error', e);
      return res.status(400).send('Webhook Error');
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const planId = session.metadata?.planId;
      const grant = PLAN_GRANTS[planId];
      if (grant) {
        sessionGrants.set(session.id, { planId, grant, webhook: true });
        console.info('[billing] checkout complete', planId, grant);
      }
    }

    res.json({ received: true });
  }
);

app.listen(PORT, '0.0.0.0', () => {
  console.info(`[CreativeOS] Payment API http://localhost:${PORT}`);
  console.info(`  Health:  http://localhost:${PORT}/api/billing/health`);
  if (!stripe) console.warn('  STRIPE_SECRET_KEY missing — checkout disabled until configured');
});
