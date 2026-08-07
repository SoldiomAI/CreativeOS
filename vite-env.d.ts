/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string;
  readonly VITE_STRIPE_PRICE_PRO?: string;
  readonly VITE_STRIPE_PRICE_CREDITS_10?: string;
  readonly VITE_STRIPE_PRICE_CREDITS_50?: string;
  readonly VITE_YOUTUBE_AGENT_URL?: string;
  readonly VITE_YOUTUBE_AGENT_API_KEY?: string;
  readonly GEMINI_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
