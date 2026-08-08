# Creator OS Implementation Roadmap

## Phase 0 — Repository reset
Status: **in progress / this upgrade**

- Replace generative-image/video studio with deterministic Creator Compiler UI.
- Remove legacy Gemini visual generation dependency and service.
- Add typed IR contracts.
- Add God Mode specification and architecture blueprint.
- Add release/quality principles to README.

## Phase 1 — Deterministic render kernel

Deliverables:

- `render/pillow/` backend
- `render/svg/` backend
- renderer interface and registry
- design-token loader
- asset registry
- typography measurement API
- deterministic frame/image export

Acceptance:

- same project + same environment = byte-identical or pixel-identical output according to backend policy
- no network calls inside render functions
- golden image tests committed

## Phase 2 — Arabic / RTL core

Deliverables:

- libraqm-capable Pillow container
- HarfBuzz/FriBidi validation
- script/direction detection
- mixed Arabic/English layout tests
- percentages, dates, currency, acronyms, URLs and punctuation fixtures
- `verify_rtl` snapshot suite

Acceptance:

- zero manual string reversal
- raster/browser test corpus passes
- no disconnected glyphs or bidi regressions

## Phase 3 — Evidence graph

Deliverables:

- source ingestion contract
- claim schema and claim-source edges
- freshness/TTL policy
- contradiction records
- claim usage graph
- source lock / research lock

Acceptance:

- every factual atom can resolve to one or more sources
- stale/invalidated claims list all affected outputs

## Phase 4 — Narrative / strategy compiler

Deliverables:

- Project Constitution
- hook laboratory
- creative council candidate schema
- strategy judge
- content atoms
- narrative DAG
- long-to-short graph compression

Acceptance:

- one evidence package compiles into multiple lengths/formats without unsupported facts

## Phase 5 — Layout engine

Deliverables:

- component library
- constraint solver
- safe-area rules
- density profiles per platform
- automatic text fitting
- layout scoring

Initial components:

`Headline, Paragraph, BigNumber, Quote, Statistic, Badge, Card, Timeline, Comparison, Table, BarChart, LineChart, DonutChart, Progress, Flow, ArchitectureDiagram, Citation, Screenshot, BrowserFrame, DeviceFrame, CodeBlock, Checklist, FeatureGrid, CTA, Subtitle, LowerThird`

Acceptance:

- no clipping/overlap across golden projects
- mobile/vertical/horizontal reflow tests pass

## Phase 6 — Browser capture + software demo engine

Deliverables:

- Playwright/Chromium capture worker
- full-page and element screenshots
- mobile/desktop viewports
- interaction scripts
- scroll/click/type/highlight annotations

Acceptance:

- real UI capture only; no fabricated screenshots
- capture metadata and source URL stored in asset manifest

## Phase 7 — Motion + video compiler

Deliverables:

- frame/timeline abstraction
- deterministic easing and fixed-timestep motion
- Pillow frame streamer
- optional HTML/React motion renderer adapter
- FFmpeg encoder
- resumable frame ranges

Acceptance:

- frames stream to disk/object storage; no full-video RAM accumulation
- deterministic timing and frame count

## Phase 8 — Voice, audio and subtitles

Deliverables:

- provider-neutral voice interface
- ElevenLabs adapter optional
- narration timing ingestion
- background music/SFX registry
- ducking and loudness normalization
- SRT/VTT/ASS/burned subtitles
- Arabic subtitle rendering tests

Acceptance:

- voice provider can be swapped without changing project format
- subtitle/audio/video sync QA passes

## Phase 9 — Platform adapters

Deliverables:

- Instagram
- TikTok
- YouTube
- LinkedIn
- X
- generic web
- presentation
- document

Acceptance:

- each adapter recompiles/reflows; no naïve resize-only pipeline

## Phase 10 — QA + provenance

Deliverables:

- evidence gate
- language/RTL gate
- visual/layout gate
- accessibility gate
- licensing gate
- audio/video integrity gate
- build/provenance manifest
- optional C2PA signing adapter

Acceptance:

- blocked critical gate prevents master/public export

## Phase 11 — Durable orchestration

Deliverables:

- durable workflow engine
- queues/workers by workload
- retries/idempotence
- content-addressed cache
- object storage
- OpenTelemetry traces/metrics/logs

Acceptance:

- long render/research jobs resume after worker termination

## Phase 12 — Analytics + learning laboratory

Deliverables:

- performance ingestion
- content-genome attribution
- experiment definitions
- A/B variant tracking
- correlation vs experiment evidence separation
- Creator DNA / Brand DNA learning summaries

Acceptance:

- system never labels correlation as causation without experimental support

## Phase 13 — Quarantined self-evolution

Deliverables:

- experiment branches
- golden project benchmark suite
- regression scoring
- candidate promotion policy
- rollback

Acceptance:

- production code/policies never self-modify directly
- evidence, safety, privacy and provenance gates cannot be weakened by learned optimization

## Phase 14 — Sovereign deployment

Deliverables:

- offline-capable render stack
- local model-provider adapter
- local evidence corpus support
- private object storage
- internal voice option
- hardened container images and SBOM

Acceptance:

- same project format runs in cloud and controlled/on-prem environments

## Priority order

The build should prioritize **render determinism + Arabic correctness + evidence traceability** before adding more autonomous agent behavior. Those three capabilities are the product moat and the hardest parts to retrofit later.
