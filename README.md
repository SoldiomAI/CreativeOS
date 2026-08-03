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

1. Install dependencies:
   `npm install`
2. Optional `GEMINI_API_KEY` in [`.env.local`](.env.local) for concepts, Imagen stills, and Veo.
3. Run the app:
   `npm run dev`  
   Open **http://localhost:5173/** (not `:3000`, which is reserved for Antigravity).
4. Paste tokens in **Optimization / Connections** (browser `localStorage` only — not bundled):
   - Free HF token for Spaces / Inference
   - Optional MuAPI key for Open Generative AI models (proxied via `/api/muapi`)

### Optional local backends

- **ComfyUI** — [ComfyUI](https://github.com/Comfy-Org/ComfyUI) on `http://127.0.0.1:8188`
- **Duix.Avatar** — [Duix-Avatar](https://github.com/duixcom/Duix-Avatar) Docker (`:8383` / `:18180`)
- **Handy** — [Handy](https://github.com/cjpais/Handy) for offline desktop dictation
- **OmniVoice** — automatic voiceover via [k2-fsa/OmniVoice](https://github.com/k2-fsa/OmniVoice) HF Space
- **MuAPI** — [Open Generative AI](https://github.com/Anil-matcha/Open-Generative-AI) / [muapi.ai](https://muapi.ai) (defaults: `seedance-v2.0-t2v`, `wan2.2-image-to-video`)

## Quality checks

```bash
npm run typecheck
npm run build
```

## Factory Studio

1. Open **Prompt → Movie** (or Hook Foundry → send a concept)
2. Pick a **platform preset** (TikTok / Reels / Shorts / square / landscape)
3. Optional **opening hook** (burned into local/Comfy frames)
4. Write or **Dictate** a prompt; upload images or generate a still
5. Keep soundtrack + voiceover on; pick Auto or MuAPI
6. **Captions + Export** → copy per platform or **Download Export Pack** (video + captions.txt + pack.json)
