<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Performance Creative OS

Create **any short-form video from a prompt and optional images**, using free open sources:

| Source | Type | Cost |
| --- | --- | --- |
| [Lightricks/LTX-Video](https://huggingface.co/spaces/Lightricks/ltx-video-distilled) | Text / Image → Video (HF Space) | Free |
| [ByteDance/AnimateDiff-Lightning](https://huggingface.co/spaces/ByteDance/AnimateDiff-Lightning) | Text → Video (HF Space) | Free |
| [CogVideoX-2B](https://huggingface.co/spaces/zai-org/CogVideoX-2B-Space) | Text → Video (HF Space) | Free |
| [Wan2.1](https://huggingface.co/Wan-AI/Wan2.1-T2V-1.3B) | HF Inference / Space | Free tier / credits |
| Local compositor | Prompt + images → WebM in-browser | Always free |
| [MusicGen](https://huggingface.co/spaces/sanchit-gandhi/musicgen-streaming) | Prompt → soundtrack | Free (+ local score fallback) |
| [Edge-TTS](https://huggingface.co/spaces/innoai/Edge-TTS-Text-to-Speech) | Prompt → voiceover | Free |
| Gemini Veo 3.1 | Premium image → video | Paid API key |

View the original AI Studio shell: https://ai.studio/apps/drive/1tuNPhOa8D1Xc0RSVOpdhV4awmrINfxox

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Optional `GEMINI_API_KEY` in [`.env.local`](.env.local) for concepts, Imagen stills, and Veo.
3. Run the app:
   `npm run dev`  
   Open **http://localhost:5173/** (not `:3000`, which is reserved for Antigravity).
4. Paste a free HF token in **Optimization / Connections** (browser `localStorage` only — not bundled).

## Quality checks

```bash
npm run typecheck
npm run build
```

## Factory Studio

1. Open **Prompt → Movie**
2. Write a prompt, optionally upload images (or generate a still)
3. Keep **Soundtrack** + **Voiceover** on (MusicGen / Edge-TTS, with local music fallback)
4. Pick a free model (`Auto` tries HF Spaces then local)
5. Play the movie with sound, download, or distribute
