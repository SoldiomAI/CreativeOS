# CreativeOS

**AI creative studio** — generate text, images, voiceovers, and short-form video in one workspace. Built with React 19, Vite, and the Google Gemini API.

## Features

- **✍️ Write** — scripts, hooks, captions, and ad copy (Gemini 2.5 Flash) with tone & platform presets
- **🎨 Design** — text-to-image (Imagen 4) and AI image editing (Gemini 2.5 Flash Image)
- **🎙️ Voice** — text-to-speech with 6 studio voices (Gemini 2.5 Flash TTS), WAV export
- **🎬 Video** — full pipeline: concept ideation → keyframe → Veo 3.1 video → social distribution kit
- **📦 Asset Library** — every generation saved locally (IndexedDB): preview, download, delete
- **🌐 Bilingual** — English / العربية with full RTL layout
- **🧪 Demo mode** — no API key? The whole UI works with locally generated placeholder assets

## Quick start

**Prerequisite:** Node.js 20+

```bash
npm install
npm run dev
```

That's it — the app starts in **demo mode** with placeholder generations.

### Enable real AI generation

Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey), then either:

1. **Environment file** — copy `.env.example` to `.env.local` and set:
   ```
   GEMINI_API_KEY=your_key_here
   ```
2. **In-app** — open **Settings** and paste the key (stored in your browser's localStorage; it never leaves your machine except in direct calls to the Gemini API).

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
    ├── geminiService.ts       # Facade over the active provider
    └── providers/
        ├── types.ts           # GenerationProvider interface
        ├── gemini.ts          # Google Gemini implementation
        └── demo.ts            # Offline placeholder implementation
```

**Provider layer:** all generation goes through a single `GenerationProvider` interface. With no API key, the `DemoProvider` produces placeholder assets entirely in the browser (canvas images, WAV chimes, WebM clips) — so the app is always usable. Additional providers (OpenAI, Replicate, ElevenLabs, …) can be added by implementing the same interface.

**Models used:** `gemini-2.5-flash` (text/JSON) · `imagen-4.0-generate-001` (images) · `gemini-2.5-flash-image` (editing) · `gemini-2.5-flash-preview-tts` (speech) · `veo-3.1-fast-generate-preview` (video)

## License

MIT — see [LICENSE](LICENSE).
