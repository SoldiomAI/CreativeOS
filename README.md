# SOLDIOM Creator OS

> Deterministic Content Intelligence System — AI thinks. Code draws. Evidence verifies. QA approves.

SOLDIOM Creator OS is a programmable media-company operating system that turns an idea, URL, document, repository, dataset, screenshot, recording, product, business brief, or research topic into verified multi-format content.

The core rule is non-negotiable:

**No generative image models. No generative video models.**

The intelligence layer may research, reason, write, localize, plan, critique, and produce structured instructions. Final visual pixels must come from deterministic renderers, real/user-supplied media, licensed assets, browser capture, typography, charts, diagrams, SVG, procedural graphics, or code-defined 3D.

## Product thesis

Do not store “slides” or “videos” as the real product. Store a verified content graph and compile it into formats.

```text
Raw Input
  -> Intent IR
  -> Evidence IR
  -> Strategy IR
  -> Narrative IR
  -> Scene IR
  -> Render IR
  -> Distribution IR
  -> Performance IR
  -> Learning IR
```

Every stage is structured, versioned, editable, testable, cacheable, and traceable.

## What one idea can become

- Arabic / English Instagram carousels
- Reels, Shorts and TikTok videos
- YouTube explainers
- LinkedIn posts and carousels
- X threads
- infographics
- executive and government presentations
- proposals, reports, whitepapers and ebooks
- newsletters and articles
- software demos and browser walkthroughs
- campaign packs and content calendars
- subtitles, captions, thumbnails and source packs

The system does not crop one asset into every channel. Each platform compiles from the same Narrative/Evidence graph with platform-specific composition rules.

## Deterministic visual stack

Planned production backends:

- **Pillow + libraqm + HarfBuzz + FriBidi** — deterministic raster and first-class Arabic/RTL
- **SVG** — diagrams, charts, icons, editable vector output
- **HTML/CSS + Playwright/Chromium** — responsive deterministic layouts and real web capture
- **Remotion-compatible render adapter** — structured React motion when useful
- **FFmpeg** — H.264/H.265/AAC packaging, audio mixing, normalization, subtitles
- **Procedural 3D adapter** — geometry/material/light/camera driven visuals only

No Stable Diffusion, Midjourney, DALL-E, Flux, Veo-style visual generation, synthetic screenshots, or AI-generated text baked into images.

## Arabic is core infrastructure

Arabic is not a translation plugin. The renderer must support:

- explicit RTL shaping
- Arabic + English
- Arabic + numbers, percentages, currencies, dates and URLs
- punctuation and brackets
- script-aware font fallback
- shaped-text measurement before wrapping
- snapshot and pixel-difference RTL tests
- no manual string reversal
- no double reshaping

Right alignment is not considered RTL correctness.

## Core subsystems

### 1. Universal Intake
Accept text, URLs, repos, PDFs, DOCX, PPTX, XLSX/CSV, screenshots, audio, video, product assets and structured data.

### 2. Evidence Graph
Every public factual claim is linked to source evidence, freshness, confidence and every scene/output where it appears.

```text
SOURCE -> CLAIM -> CONTENT BLOCK -> SCENE -> FRAME / SLIDE / PARAGRAPH
```

If a source changes, only affected outputs need revalidation/recompilation.

### 3. Creative Council
Multiple strategy proposals can compete on clarity, originality, evidence, audience fit, retention, brand fit and risk. The winner is selected; alternatives remain versioned.

### 4. Narrative Graph
Stories are represented as logical units — hook, problem, proof, insight, example, resolution, CTA — so a 15s Reel and a 20-slide executive deck can be compiled from the same verified knowledge without randomly deleting sentences.

### 5. Renderer Abstraction
LLMs never directly place pixels. They emit typed scene/layout instructions consumed by deterministic backends.

### 6. Voice / Audio / Subtitle Pipeline
Voice is a replaceable provider layer. Approved cloned voices may be used. Audio timing drives the video timeline. SRT, VTT and burned RTL subtitle output are supported by design.

### 7. QA + Release Gates
A public/master export must pass evidence, language, RTL, layout, licensing, accessibility, audio/video integrity, provenance and reproducibility checks.

### 8. Performance Learning
When real analytics are supplied, the system learns correlations between hooks, pacing, content genome, duration, thumbnails, visual density and outcomes. Experiments remain distinct from causal claims.

## Creator compiler principles

1. **AI thinks; renderers draw.**
2. **Evidence is upstream of content.**
3. **Arabic is a first-class layout engine.**
4. **All important state is serialized.** No hidden editor state.
5. **Incremental compilation.** Change a headline; do not rerun unrelated research or scenes.
6. **Content-addressed caching.** Hash input, evidence, narrative, scenes, assets and render outputs.
7. **Determinism by default.** Pin fonts, browser, renderer, FFmpeg, locale, timezone, DPI and seeds.
8. **No silent uncertainty.** Contradictory or stale facts are resolved, disclosed, warned or blocked.
9. **Quality over volume.** The goal is useful impact, not asset count.
10. **Self-improvement happens in quarantine.** New hooks/layouts/render changes must beat golden benchmarks before promotion.

## God Mode architecture

```text
apps/
  web/                Creator command center
  cli/                Automation / batch interface
core/
  compiler/           IR transitions + dependency graph
  schemas/            Typed project contracts
  graph/              Evidence/content/narrative graph
intelligence/
  director/           Intent + production planning
  research/           Source collection and extraction
  strategy/           Hooks, narrative, campaign planning
  writer/             Platform-specific copy
  localization/       Arabic/English adaptation
  critics/            Content/design/evidence reviewers
evidence/
  sources/ claims/ citations/ freshness/ provenance/
render/
  pillow/ svg/ html/ browser/ procedural3d/
typography/
  arabic/ bidi/ shaping/ breaking/ fonts/
design/
  tokens/ components/ grammar/ layout/ themes/
motion/
  primitives/ easing/ timeline/ physics/
media/
  ffmpeg/ voice/ audio/ subtitles/ capture/
formats/
  carousel/ reel/ short/ youtube/ presentation/ document/ infographic/ web/
distribution/
  instagram/ youtube/ linkedin/ x/ generic/
analytics/
  ingest/ experiments/ attribution/ learning/
orchestration/
  workflows/ workers/ queues/ scheduler/
qa/
  content/ evidence/ visual/ arabic/ accessibility/ audio/ video/
observability/
security/
plugins/
brands/
series/
golden_tests/
projects/
```

See [`docs/GOD_MODE_SPEC.md`](docs/GOD_MODE_SPEC.md) and [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Local UI

The current repository contains a Vite/React control-plane prototype.

```bash
npm install
npm run dev
```

No image-generation API key is required.

## Current implementation milestone

This branch converts the original Performance Creative OS prototype into the Creator OS control plane and removes the previous Gemini image/video generation workflow. The UI now models the deterministic compiler stages and output packs. Backend rendering, evidence ingestion, Arabic snapshot tests, durable orchestration and export workers are the next implementation tracks defined in the roadmap.

## Non-negotiable definition of done

A master project is not complete because a file exists. It is complete only when objective, audience, evidence, language, Arabic/RTL, design, accessibility, licensing, audio/video, platform validation, provenance and reproducibility gates pass.

---

**SOLDIOM Creator OS** — a programmable, auditable media company built around verified intelligence and deterministic rendering.
