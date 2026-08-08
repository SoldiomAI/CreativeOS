# Creator OS Architecture

## System boundaries

Creator OS is split into five planes:

1. **Control plane** — project state, permissions, orchestration, approvals and UI.
2. **Intelligence plane** — research, strategy, writing, localization and critique.
3. **Evidence plane** — sources, claims, freshness, contradiction handling and provenance.
4. **Render plane** — deterministic typography, layout, charts, diagrams, motion, browser capture, audio and video assembly.
5. **Learning plane** — analytics ingestion, experiments, benchmarks and quarantined self-improvement.

## Reference flow

```text
User / API / CLI
      |
      v
Project Constitution
      |
      v
Compiler DAG ---------------------------------------------------+
  |          |          |          |          |                 |
Intent    Evidence   Strategy   Narrative    Scene              |
                                                |               |
                                                v               |
                                       Renderer Router          |
                                  /        |       |       \    |
                              Pillow      SVG     HTML     3D    |
                                  \        |       |       /    |
                                                v               |
                                         Media Timeline         |
                                                |               |
                                                v               |
                                            FFmpeg              |
                                                |               |
                                                v               |
                                          Release Gates --------+
                                                |
                                                v
                                      Platform Output Pack
```

## Control plane services

- Project service
- Version/branch service
- Policy service
- Brand/creator profile service
- Approval service
- Job scheduler
- Asset registry
- Export registry

Suggested persistent entities:

```text
Project
ProjectVersion
ProjectPolicy
Source
Claim
ContentAtom
NarrativeNode
Scene
RenderTarget
Asset
Export
QualityGateResult
Experiment
PerformanceEvent
```

## Intelligence providers

Use a provider-neutral contract. The core must not know vendor-specific model names.

```ts
interface IntelligenceProvider {
  understand(input: unknown): Promise<IntentIR>;
  research(plan: ResearchPlan): Promise<ResearchResult>;
  proposeStrategies(ctx: ProjectContext): Promise<StrategyCandidate[]>;
  write(ctx: NarrativeContext): Promise<NarrativeIR>;
  localize(ctx: LocalizationContext): Promise<LocalizationResult>;
  critique(ctx: CritiqueContext): Promise<CritiqueResult>;
}
```

Models may compete in an arena. Winning outputs must still pass evidence and schema gates.

## Evidence service

Every claim must have explicit support edges and freshness policy. Suggested relational core:

```text
sources(id, uri, title, publisher, published_at, retrieved_at, authority_rank, license)
claims(id, text, type, confidence, date_sensitive, ttl_hours, verified_at, publication_state)
claim_sources(claim_id, source_id, support_type, evidence_locator)
claim_usage(claim_id, node_type, node_id)
```

The Evidence service should expose dependency invalidation: `invalidateClaim(id)` returns every downstream atom/narrative/scene/export that must be reviewed.

## Renderer contract

```ts
interface Renderer<TOptions> {
  id: string;
  validate(scene: SceneIR, options: TOptions): ValidationResult;
  measure(scene: SceneIR, options: TOptions): MeasurementResult;
  render(scene: SceneIR, options: TOptions): Promise<RenderArtifact>;
}
```

All renderers receive resolved fonts/assets/tokens. No renderer calls an LLM while producing pixels.

## Typography pipeline

```text
Unicode text
 -> language/script detection
 -> bidi resolution
 -> shaping
 -> glyph measurement
 -> line breaking
 -> line balancing
 -> layout constraints
 -> draw
```

For Arabic raster rendering, use a libraqm-enabled Pillow build backed by HarfBuzz/FriBidi. Browser output uses standards-compliant RTL CSS and browser shaping. Snapshot parity tests compare the two paths for representative strings.

## Layout engine

Represent each scene as constraints rather than only x/y coordinates.

```json
{
  "safeArea": {"top": 64, "right": 64, "bottom": 64, "left": 64},
  "constraints": [
    {"type": "no-overlap"},
    {"type": "min-font", "value": 28},
    {"type": "max-lines", "target": "headline", "value": 3},
    {"type": "align", "target": "headline", "value": "inline-end"}
  ]
}
```

The solver may produce several valid layouts and score them using visual hierarchy/whitespace metrics.

## Render reproducibility

Master render manifests should pin:

- container digest
- renderer version
- browser and browser revision
- FFmpeg version
- font SHA-256 values
- asset hashes
- locale and timezone
- dimensions and DPI
- deterministic random seed
- project/scene/render IR hashes

## Orchestration

Jobs should be idempotent and resumable.

Recommended queues/workers:

```text
research-worker
browser-worker
layout-worker
raster-worker
vector-worker
procedural-worker
voice-worker
audio-worker
video-worker
qa-worker
export-worker
```

Parallelize independent scenes and platform variants, but serialize writes that mutate the same project node.

## Caching

Content-address cache keys:

```text
hash(input + policy + evidence + model-config)      -> intelligence cache
hash(scene + tokens + fonts + assets + dimensions) -> render cache
hash(video-timeline + audio + codec-config)         -> media cache
```

## Security

- Treat documents, repositories and webpages as untrusted input.
- Never execute repository code merely to summarize or create content about it.
- Browser capture runs sandboxed.
- Store secrets outside project state.
- Restrict external providers by project classification.
- Support private/confidential/restricted deployment policies.

## Observability

Each project compile should produce one distributed trace with spans for intake, research, evidence, strategy, narrative, layout, render, voice, FFmpeg, QA and export.

Record latency, cost, tokens, retry count, cache hit/miss, worker identity, artifact size and quality-gate outcomes.

## Deployment modes

### Cloud mode
Managed model providers, browser/render workers, object storage and scalable queues.

### Sovereign mode
Local/controlled LLMs, local evidence corpus, internal object storage, internal voice services and isolated render workers. The IR/project format remains identical across both modes.
