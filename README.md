<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Performance Creative OS

Create **any short-form video from a prompt and optional images**, using free open sources — plus optional MuAPI (Open Generative AI) and a social **export pack**.

| Source | Type | Cost |
| --- | --- | --- |
| [k2-fsa/OmniVoice](https://github.com/k2-fsa/OmniVoice) | Multilingual TTS voiceover (HF Space) | Free |
| [Comfy-Org/ComfyUI](https://github.com/Comfy-Org/ComfyUI) | Local text→image → movie | Free (local) |
| [cjpais/Handy](https://github.com/cjpais/Handy) | Offline desktop STT; Studio Dictate uses Web Speech | Free |
| [duixcom/Duix-Avatar](https://github.com/duixcom/Duix-Avatar) | Local talking avatar (Docker APIs) | Free (local) |
| [deepbeepmeep/Wan2GP](https://github.com/deepbeepmeep/Wan2GP) | Local GPU video (Wan 2.1/2.2, LTX-2, Hunyuan, Flux) | Free (local GPU) |
| [Anil-matcha/Open-Generative-AI](https://github.com/Anil-matcha/Open-Generative-AI) | Optional MuAPI Seedance/Wan T2V & I2V | MuAPI key |
| [Lightricks/LTX-Video](https://huggingface.co/spaces/Lightricks/ltx-video-distilled) | Text / Image → Video (HF Space) | Free |
| [ByteDance/AnimateDiff-Lightning](https://huggingface.co/spaces/ByteDance/AnimateDiff-Lightning) | Text → Video (HF Space) | Free |
| [CogVideoX-2B](https://huggingface.co/spaces/zai-org/CogVideoX-2B-Space) | Text → Video (HF Space) | Free |
| [Wan2.1](https://huggingface.co/Wan-AI/Wan2.1-T2V-1.3B) | HF Inference / Space | Free tier / credits |
| Local compositor | Prompt + images → WebM (aspect presets + hook overlay) | Always free |
| [MusicGen](https://huggingface.co/spaces/sanchit-gandhi/musicgen-streaming) | Prompt → soundtrack | Free (+ local score fallback) |
| [Edge-TTS](https://huggingface.co/spaces/innoai/Edge-TTS-Text-to-Speech) | Voiceover fallback | Free |
| Gemini Veo 3.1 | Premium image → video | Paid API key |

**Social companions (linked from Caption Studio):**
- [Free-AI-Social-Media-Scheduler](https://github.com/Anil-matcha/Free-AI-Social-Media-Scheduler) — real schedule/publish
- [AI-Youtube-Shorts-Generator](https://github.com/SamurAIGPT/AI-Youtube-Shorts-Generator) — long-form → vertical shorts

View the original AI Studio shell: https://ai.studio/apps/drive/1tuNPhOa8D1Xc0RSVOpdhV4awmrINfxox

## Run Locally

**Prerequisites:** Node.js

1. Copy [`.env.example`](.env.example) → `.env.local` and fill keys you need.
2. Install dependencies: `npm install`
3. **App only:** `npm run dev` → **http://localhost:5173/** (not `:3000`)
4. **App + Stripe billing API:** `npm run dev:all` (Vite + payment API on `:4242`, proxied at `/api/billing`)

### Connected pipeline (ready to use)

| Tab | What it does | Connects to |
| --- | --- | --- |
| **Command** | Live stats, pipeline status, one-click publish on recent cuts | Library, Factory, Billing |
| **Still Lab** | Generate/edit stills → quick local video → **Animate in Factory** / **Publish** | Factory Caption Studio |
| **Factory** | Hook Foundry → Prompt→Movie (all providers, God Mode) → save to Library | Still Lab seeds, Caption Studio |
| **Library** | IndexedDB movies, publish ledger, **Publish** / **Remix** | Caption Studio, Factory |
| **Links** | All connectors + **Billing (Stripe)** | Every publish route |
| **Content** | SOLDIOM Content Factory — deterministic carousels, reels, decks | Research → render → QA → export |

Flow: **Still Lab → Factory → Library → Caption Studio → YouTube / Scheduler / MCP / CLI / manual**

**Content Factory flow:** **Idea/URL/GitHub → Research → Strategy → Storyboard → Deterministic render → QA → Content pack**

4. Paste tokens in **Links** (browser `localStorage` only — not bundled):
   - Free HF token for Spaces / Inference
   - Optional MuAPI key for Open Generative AI models (proxied via `/api/muapi`)
   - **Google OAuth Web Client ID** for real YouTube Shorts publish (YouTube Data API v3; JS origin `http://localhost:5173`)
   - Optional `GOOGLE_CLIENT_ID` in `.env.local`

### Real social publish — all ways, with fallbacks

Every publish tries each configured route in order until one succeeds, so there is always a way out:

| Route | What it is | Setup |
| --- | --- | --- |
| **Direct API** | YouTube Shorts via Google OAuth → YouTube Data API resumable upload (`publishAt` for scheduling) | Google OAuth Web Client ID in Optimization |
| **YouTube Agent** | [youtube-automation-agent](https://github.com/darkzOGx/youtube-automation-agent) — 7 AI agents generate + queue publish from your topic (Gemini free tier on agent) | Clone agent, `npm run walkthrough`, run on `:3456`, set URL in Links |
| **Scheduler API** | Postiz-compatible API ([self-hostable](https://github.com/gitroomhq/postiz-app), 25+ networks / 50+ accounts) — Creative OS uploads the video and creates/schedules posts there | Scheduler base URL + API key in Optimization → Agent Reach |
| **MCP / webhook bridge** | Generic JSON job (`tool: publish_post`, platform, caption, hashtags, scheduleAt, video data URL) POSTed to any MCP HTTP endpoint, Zapier/Make/n8n webhook, or custom worker | Bridge URL (+ optional Authorization header) in Optimization → Agent Reach |
| **CLI script** | Caption Studio generates `creativeos-publish.sh`: ffmpeg WebM→MP4 transcode, per-platform caption files, [youtubeuploader](https://github.com/porjo/youtubeuploader), and curl calls to the scheduler/bridge — runnable from any terminal or cron | Nothing — download and run |
| **Share sheet / manual** | OS share sheet with the video file (mobile IG/TikTok handoff); final fallback copies the caption to clipboard + export pack download | Nothing |

The route that actually delivered is shown per platform (`via api / scheduler / mcp / share / manual`).
Captions use **Gemini** when `GEMINI_API_KEY` is set (local marketing fallback otherwise).

### Billing (Stripe payment API)

Payment API is included and ready — configure Stripe to enable checkout:

1. Create products/prices in [Stripe Dashboard](https://dashboard.stripe.com/products)
2. Set in `.env.local`:
   - `VITE_STRIPE_PUBLISHABLE_KEY`, `VITE_STRIPE_PRICE_*` (client)
   - `STRIPE_SECRET_KEY` (server only — `npm run payment-api`)
3. Optional webhook: `POST /api/billing/webhook` with `STRIPE_WEBHOOK_SECRET`
4. Plans in **Links → Billing**: Pro monthly, 10-credit pack, 50-credit pack
5. Free tier starts with **10 hosted credits**; Pro adds 100/mo. Own API keys (HF, MuAPI, Gemini) bypass credits.

```bash
npm run payment-api    # billing only
npm run dev:all        # app + billing together
```

### Optional local backends

- **ComfyUI** — [ComfyUI](https://github.com/Comfy-Org/ComfyUI) on `http://127.0.0.1:8188`
- **Duix.Avatar** — [Duix-Avatar](https://github.com/duixcom/Duix-Avatar) Docker (`:8383` / `:18180`)
- **Handy** — [Handy](https://github.com/cjpais/Handy) for offline desktop dictation
- **OmniVoice** — automatic voiceover via [k2-fsa/OmniVoice](https://github.com/k2-fsa/OmniVoice) HF Space
- **MuAPI** — [Open Generative AI](https://github.com/Anil-matcha/Open-Generative-AI) / [muapi.ai](https://muapi.ai) (defaults: `seedance-v2.0-t2v`, `wan2.2-image-to-video`)
- **Wan2GP** — [Wan2GP](https://github.com/deepbeepmeep/Wan2GP) local GPU pipeline via `server/wangp-bridge.py`:

```bash
git clone https://github.com/deepbeepmeep/Wan2GP
export WAN2GP_ROOT=/path/to/Wan2GP
npm run wangp-bridge   # :7867, proxied at /api/wangp
```

Set `model_type` in **Links** (or export settings JSON from WanGP UI). Factory provider **Wan2GP (local GPU)** or **Auto** when the bridge is ready. Generation can take several minutes on consumer GPUs.

### SOLDIOM Content Factory (deterministic studio)

**Intelligence decides what to say; the renderer draws reproducible pixels** — no generative image models for core slides, Arabic text, charts, or logos.

```bash
pip install -r soldiom-content-factory/requirements.txt
npm run content-factory          # FastAPI on :7870, proxied at /api/scf
npm run dev                      # open Content tab in the app
```

**Deploy modes** (Links → Content Factory, or `SCF_DEPLOY_MODE`):

| Mode | Use case |
| --- | --- |
| **local** | Projects on disk + Pillow/FFmpeg on this machine |
| **runpod** | Metadata local; GPU render via RunPod serverless (`RUNPOD_API_KEY`, `RUNPOD_ENDPOINT_ID`) |
| **gcp** | Cloud Run worker (`GCP_CLOUD_RUN_URL`) + optional GCS bucket |

**CLI:**

```bash
npm run content-factory:cli -- create "Explain sovereign AI for GCC" --language ar --format carousel,reel
```

**Pipeline:** Director → Research → Strategy → Script → Storyboard → Design (Pillow RTL via libraqm) → Voice (ElevenLabs) → Render → QA → Export pack.

Optional: Playwright for website captures (`pip install playwright && playwright install chromium`).

## Quality checks

```bash
npm run typecheck
npm run build
```

## God Mode

Toggle **God Mode** in Factory Studio for a 1000× short-form cut:

- Multi-beat local compositor (title card → beats → end CTA)
- Auto hook extraction + safe-zone burn-in
- Forced soundtrack + voiceover, amplified provider prompts
- Longer vertical duration, cover-frame capture
- Auto-opens Caption Studio for export pack
- Library persists in **IndexedDB** (covers + metadata)

## Factory Studio

1. Open **Prompt → Movie** (or Hook Foundry → send a concept)
2. Pick a **platform preset** (TikTok / Reels / Shorts / square / landscape)
3. Optional **opening hook** (burned into local/Comfy frames)
4. Write or **Dictate** a prompt; upload images or generate a still
5. Keep soundtrack + voiceover on; pick Auto or MuAPI
6. **Captions + Export** → copy per platform or **Download Export Pack** (video + captions.txt + pack.json)
