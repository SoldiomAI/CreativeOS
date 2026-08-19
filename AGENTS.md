# Performance Creative OS

A frontend-only Vite + React 19 + TypeScript single-page app ("prompt → short-form video"). There is no backend, database, or server component — everything runs in the browser. See `README.md` for the product overview and the list of wired-in model sources.

## Cursor Cloud specific instructions

### Services
There is exactly one service: the Vite dev server. Standard scripts live in `package.json`:
- `npm run dev` — dev server (Vite), serves on `http://localhost:3000` (host `0.0.0.0`, port fixed in `vite.config.ts`).
- `npm run build` — production build (Vite/Rollup) to `dist/`.
- `npm run preview` — serve the built `dist/`.

### Lint / typecheck
There is no ESLint config and no test framework in this repo. The effective "lint" is a TypeScript typecheck: `npx tsc --noEmit` (config in `tsconfig.json`, `noEmit` already set). It passes clean.

### Environment / API keys (all optional)
The app runs fully without any keys. Optional keys are read by `vite.config.ts` from a git-ignored `.env.local` and injected via `define`:
- `GEMINI_API_KEY` — enables Gemini concepts, Imagen stills, and Veo (premium image→video).
- `HF_TOKEN` (or `VITE_HF_TOKEN`) — enables Hugging Face Spaces / Inference providers. An HF token can also be pasted at runtime in the app's Optimization/Connections tab (stored only in `localStorage`).
- Because keys are injected at Vite startup via `define`, changing `.env.local` requires restarting `npm run dev` to take effect.

### Non-obvious gotchas
- The `Local` video provider generates a WebM entirely in-browser (canvas compositor in `services/localVideoService.ts`) with no network/keys — use it for offline testing/demos. The rendered video is an intentionally dark cinematic gradient with the prompt text baked in as overlays; a near-black/dark-gray frame is expected output, not a bug.
- HF-Space-backed providers (LTX, AnimateDiff, CogVideoX, Wan) plus MusicGen soundtrack and Edge-TTS voiceover require outbound network to Hugging Face; soundtrack has a local score fallback but voiceover does not. Disable Soundtrack + Voiceover and pick the `Local` provider to keep generation fully offline.
- The app flow is: Landing → Get Started → sidebar (Command Center / Factory Studio / Asset Library / Optimization). Video creation lives under Factory Studio → "Prompt → Movie".
