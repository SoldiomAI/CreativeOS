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
| Gemini Veo 3.1 | Premium image → video | Paid API key |

View the original AI Studio shell: https://ai.studio/apps/drive/1tuNPhOa8D1Xc0RSVOpdhV4awmrINfxox

## Run Locally

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Optional keys in [`.env.local`](.env.local):
   - `GEMINI_API_KEY` — concepts, Imagen stills, Veo
   - `HF_TOKEN` — free Hugging Face token for Spaces / Inference Providers
3. Run the app:
   `npm run dev`

You can also paste an HF token in **Optimization / Connections** inside the app (stored in `localStorage` only).

## Factory Studio

1. Open **Create Video**
2. Write a prompt, optionally upload images (or generate a still)
3. Pick a free model (`Auto` tries HF Spaces then local)
4. Download or distribute
