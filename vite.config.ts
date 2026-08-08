import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        // Keep off :3000 — Antigravity / other local apps often use that port.
        port: 5173,
        strictPort: true,
        host: '0.0.0.0',
        proxy: {
          // MuAPI (Open Generative AI backend) — avoid browser CORS.
          '/api/muapi': {
            target: 'https://api.muapi.ai',
            changeOrigin: true,
            secure: true,
            rewrite: (p) => p.replace(/^\/api\/muapi/, ''),
          },
          // Stripe billing API (run: npm run payment-api)
          '/api/billing': {
            target: 'http://127.0.0.1:4242',
            changeOrigin: true,
          },
          // YouTube Automation Agent — github.com/darkzOGx/youtube-automation-agent
          '/api/youtube-agent': {
            target: 'http://127.0.0.1:3456',
            changeOrigin: true,
            rewrite: (p) => p.replace(/^\/api\/youtube-agent/, ''),
          },
          // Wan2GP bridge (python server/wangp-bridge.py + WAN2GP_ROOT)
          '/api/wangp': {
            target: 'http://127.0.0.1:7867',
            changeOrigin: true,
            rewrite: (p) => p.replace(/^\/api\/wangp/, '/api/wangp'),
          },
          // SOLDIOM Content Factory (FastAPI soldiom-content-factory)
          '/api/scf': {
            target: 'http://127.0.0.1:7870',
            changeOrigin: true,
            rewrite: (p) => p.replace(/^\/api\/scf/, '/api/scf'),
          },
        },
      },
      preview: {
        port: 4173,
        strictPort: true,
        host: '0.0.0.0',
        proxy: {
          '/api/muapi': {
            target: 'https://api.muapi.ai',
            changeOrigin: true,
            secure: true,
            rewrite: (p) => p.replace(/^\/api\/muapi/, ''),
          },
          '/api/billing': {
            target: 'http://127.0.0.1:4242',
            changeOrigin: true,
          },
          // YouTube Automation Agent — github.com/darkzOGx/youtube-automation-agent
          '/api/youtube-agent': {
            target: 'http://127.0.0.1:3456',
            changeOrigin: true,
            rewrite: (p) => p.replace(/^\/api\/youtube-agent/, ''),
          },
          // Wan2GP bridge (python server/wangp-bridge.py + WAN2GP_ROOT)
          '/api/wangp': {
            target: 'http://127.0.0.1:7867',
            changeOrigin: true,
            rewrite: (p) => p.replace(/^\/api\/wangp/, '/api/wangp'),
          },
          // SOLDIOM Content Factory (FastAPI soldiom-content-factory)
          '/api/scf': {
            target: 'http://127.0.0.1:7870',
            changeOrigin: true,
            rewrite: (p) => p.replace(/^\/api\/scf/, '/api/scf'),
          },
        },
      },
      plugins: [react()],
      define: {
        // Gemini key for local AI Studio / Imagen / Veo. Prefer .env.local; never commit secrets.
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || ''),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || ''),
        'process.env.GOOGLE_CLIENT_ID': JSON.stringify(env.GOOGLE_CLIENT_ID || env.VITE_GOOGLE_CLIENT_ID || ''),
        'process.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify(env.VITE_GOOGLE_CLIENT_ID || env.GOOGLE_CLIENT_ID || ''),
        // HF token should come from in-app Settings (localStorage), not the client bundle.
        'process.env.HF_TOKEN': JSON.stringify(''),
        'process.env.VITE_HF_TOKEN': JSON.stringify(''),
        'process.env.VITE_STRIPE_PUBLISHABLE_KEY': JSON.stringify(env.VITE_STRIPE_PUBLISHABLE_KEY || ''),
        'process.env.VITE_STRIPE_PRICE_PRO': JSON.stringify(env.VITE_STRIPE_PRICE_PRO || ''),
        'process.env.VITE_STRIPE_PRICE_CREDITS_10': JSON.stringify(env.VITE_STRIPE_PRICE_CREDITS_10 || ''),
        'process.env.VITE_STRIPE_PRICE_CREDITS_50': JSON.stringify(env.VITE_STRIPE_PRICE_CREDITS_50 || ''),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
