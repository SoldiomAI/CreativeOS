# CreativeOS

**AI creative studio** — generate text, images, voiceovers, and short-form video in one workspace. Built with React 19, Vite, and pluggable AI providers (Google Gemini, OpenAI-compatible, ElevenLabs).

**Live:** https://soldiom.github.io/CreativeOS/ (installable PWA, starts in demo mode — bring your own API keys in Settings)

## Features

- **✍️ Write** — scripts, hooks, captions, and ad copy with tone & platform presets
- **🎨 Design** — text-to-image and AI image editing
- **🎙️ Voice** — text-to-speech with 6 studio voices; optional dedicated **ElevenLabs** engine
- **🎬 Video** — full pipeline: concept ideation → keyframe → Veo 3.1 video → social distribution kit, with recent-video history
- **📦 Asset Library** — every generation saved locally (IndexedDB): preview, download, delete
- **🔌 Providers** — Google Gemini or any OpenAI-compatible endpoint (OpenRouter, LiteLLM, local), switchable in Settings
- **🌐 Bilingual** — English / العربية with full RTL layout
- **📱 PWA** — installable, offline-capable shell with auto-update
- **🧪 Demo mode** — no API key? The whole UI works with locally generated placeholder assets

## Quick start

**Prerequisite:** Node.js 20+

```bash
npm install
npm run dev
```

That's it — the app starts in **demo mode** with placeholder generations.

### Enable real AI generation

Open **Settings** in the app and pick a provider:

- **Google Gemini** — key from [Google AI Studio](https://aistudio.google.com/apikey) (or set `GEMINI_API_KEY` in `.env.local` for dev)
- **OpenAI-compatible** — key + optional base URL (api.openai.com, OpenRouter, LiteLLM, local server)
- **Voice engine** — optionally route voiceovers through [ElevenLabs](https://elevenlabs.io) with its own key

Keys are stored in your browser's localStorage; they never leave your machine except in direct calls to the chosen API.

## Deployment

Pushes to `main` auto-deploy to **GitHub Pages** via `.github/workflows/deploy.yml` (build with `BASE_PATH=/CreativeOS/`, upload `dist/`, deploy). The site is a static SPA — no server, no stored secrets.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build |
| `npm run typecheck` | TypeScript type checking |

## Architecture

```
├── App.tsx                    # Shell: landing → sidebar + tab routing
├── i18n.tsx                   # EN/AR translations + RTL provider
├── components/
│   ├── StudioHub.tsx          # 4-tool studio launcher (Write/Design/Voice/Video)
│   ├── Studio.tsx             # Video pipeline (concepts → keyframe → Veo → social)
│   ├── EditorTool.tsx         # Image generation & editing
│   ├── tools/WriteTool.tsx    # Text generation
│   ├── tools/VoiceTool.tsx    # Text-to-speech
│   ├── Library.tsx            # Asset library (IndexedDB)
│   └── Settings.tsx           # API key, aspect ratio, language
└── services/
    ├── config.ts              # Key/aspect/language storage + app events
    ├── library.ts             # IndexedDB asset store (idb)
    ├── geminiService.ts       # Facade over the active provider (lazy-loaded)
    └── providers/
        ├── types.ts           # GenerationProvider interface
        ├── gemini.ts          # Google Gemini implementation
        ├── openai.ts          # OpenAI-compatible implementation
        ├── elevenlabs.ts      # Dedicated ElevenLabs speech engine
        └── demo.ts            # Offline placeholder implementation
```

**Provider layer:** all generation goes through a single `GenerationProvider` interface, resolved lazily per call — heavy SDKs stay out of the initial bundle (code-split with `React.lazy` tabs + dynamic provider imports). With no API key, the `DemoProvider` produces placeholder assets entirely in the browser (canvas images, WAV chimes, WebM clips) — so the app is always usable.

**Models used:** `gemini-2.5-flash` (text/JSON) · `imagen-4.0-generate-001` (images) · `gemini-2.5-flash-image` (editing) · `gemini-2.5-flash-preview-tts` (speech) · `veo-3.1-fast-generate-preview` (video)

## License

MIT — see [LICENSE](LICENSE).
