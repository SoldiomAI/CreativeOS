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
      },
      preview: {
        port: 4173,
        strictPort: true,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.HF_TOKEN': JSON.stringify(env.HF_TOKEN || env.VITE_HF_TOKEN || ''),
        'process.env.VITE_HF_TOKEN': JSON.stringify(env.HF_TOKEN || env.VITE_HF_TOKEN || ''),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
