# Creator OS — God Mode Specification

## 1. Mission

Build a universal deterministic content operating system that behaves like a complete media organization. It must accept nearly any digital input, construct a verified knowledge/evidence graph, design multiple creative strategies, compile narratives into typed scenes, render those scenes through deterministic backends, produce platform-specific outputs, quality-gate every master export, and learn from real performance data without confusing correlation with causation.

## 2. Hard constraints

- No generative image model.
- No generative video model.
- No synthetic screenshot generation.
- No charts or diagrams produced as opaque AI imagery.
- No manual Arabic string reversal.
- No silent fact fabrication or silent conflict resolution.
- No self-modifying production behavior without benchmark/quarantine gates.
- No credentials in project files, logs, Git, screenshots or exports.

## 3. Core compiler

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

Each IR must be schema-validated, versioned, serializable, diffable, hashable and independently cacheable.

### Intent IR
Captures objective, audience, market, language, platform, tone, conversion goal, risk, evidence policy, brand policy and visual policy.

### Evidence IR
Captures source metadata, extracted facts, quotes, statistics, source authority, recency, confidence, contradictions, licensing and claim-to-source edges.

### Strategy IR
Captures creative angle candidates, hook candidates, campaign structure, medium recommendation, audience fit, expected strengths/risks and selected strategy.

### Narrative IR
Represents logical story structure as nodes rather than only linear prose. Standard nodes: hook, problem, tension, proof, insight, example, resolution, CTA.

### Scene IR
Represents deterministic scene composition: language, direction, typed components, data bindings, timing, citations, layout constraints and transitions.

### Render IR
Resolves design tokens, exact fonts, dimensions, coordinates/constraints, assets, renderer backend, animation keyframes, hashes and output targets.

### Distribution IR
Captures platform-specific reflow, title, caption, description, safe zones, ratio, duration, metadata and output packaging.

### Performance / Learning IR
Associates real analytics with topic, hook, narrative structure, thumbnail, duration, visual density and CTA while preserving experiment provenance.

## 4. Evidence graph

Every factual statement must be modelled as a claim object.

```text
Source -> Claim -> Atom -> Narrative Node -> Scene -> Export
```

Required operations:
- source authority ranking
- publication/retrieval timestamps
- volatile-fact TTLs
- contradiction detection
- stale claim revalidation
- quote provenance
- exact output impact graph

A changed or invalid claim must identify every affected output for targeted recompilation.

## 5. Creative council

For important projects, parallel strategy agents produce competing proposals. At minimum compare:
- clarity-first
- evidence/authority-first
- curiosity-first
- emotion-first
- conversion-first
- contrarian/novel framing

Judging dimensions:
- clarity
- originality
- evidence strength
- audience fit
- retention potential
- brand fit
- conversion fit
- safety / reputational risk

Do not blend every proposal. Select a winner and retain alternatives as branches.

## 6. Content genome

Every content unit should expose reusable atoms:
- hook
- promise
- problem
- tension
- insight
- proof
- case study
- analogy
- objection
- answer
- resolution
- CTA

This permits faithful long-to-short and short-to-long transformation without random truncation.

## 7. Deterministic rendering backends

### Pillow backend
Best for exact raster frames and pixel-level reproducibility.

### SVG backend
Best for vector diagrams, charts, icons, typography and editable infographics.

### HTML/Chromium backend
Best for responsive layout, browser-like interfaces, complex tables, dashboards and web capture.

### Procedural 3D backend
Optional code-defined geometry/material/light/camera scenes. Fixed seeds and fixed timesteps are mandatory.

### Video assembly
FFmpeg packages frame sequences, browser-rendered frames, audio, subtitles and masters.

All renderers must consume the same Scene/Render IR contracts.

## 8. Arabic core

Arabic must be tested as infrastructure, not language content only.

Required:
- libraqm / HarfBuzz / FriBidi path where raster rendering is used
- explicit direction metadata
- Arabic + English + acronyms
- Arabic + numbers / percentages / currency / dates / URLs
- brackets and punctuation tests
- shaped-text measurement before wrapping
- script-aware fallback fonts
- pixel snapshot tests
- browser RTL parity tests

## 9. Layout solver

Treat layout as a constraint problem.

Hard constraints:
- no overlap
- safe margins
- min font size
- max line count where configured
- no off-canvas elements
- no clipped text
- platform safe areas
- minimum contrast

Soft objectives:
- hierarchy
- balance
- rhythm
- whitespace
- visual focus
- platform-appropriate density

Generate candidate layouts and rank only valid candidates.

## 10. Motion language

Supported deterministic primitives should include fade, slide, scale, wipe, mask, draw, count, highlight, type-on, pan, zoom, parallax, spring, blur, focus, orbit and morph.

All physics must use fixed seeds, fixed timesteps and pinned constants.

## 11. Audio / voice / subtitle architecture

Voice providers are adapters, not core dependencies. Approved voice-clone use must require authorization. Narration timing drives scene timing rather than being squeezed into arbitrary visual windows.

Audio pipeline:
```text
voice -> cleanup -> silence control -> timing -> music/SFX -> ducking -> normalization -> master
```

Subtitle outputs: SRT, VTT, ASS and burned subtitles with RTL-safe line balancing.

## 12. Platform compiler

Supported output adapters should include Instagram, TikTok, YouTube, LinkedIn, X, generic web, document, presentation and archive/export packages.

Reflow is semantic. 16:9 -> 9:16 must recompute layout rather than crop.

## 13. QA gates

Master/public export gates:
- evidence
- freshness
- quote accuracy
- Arabic / bidi
- text overflow
- layout
- contrast / accessibility
- asset licensing
- brand
- audio integrity
- video integrity
- subtitle sync
- provenance
- reproducibility

Critical failure = block export.

## 14. Provenance

Every master export must be accompanied by a manifest containing project version, source IDs, asset IDs, font hashes, renderer/backend versions, browser version where relevant, FFmpeg version, locale/timezone, project hash and render hash.

Support signed content credentials/provenance manifests where appropriate.

## 15. Incremental compilation

Hash every major node and stage. If a title changes, only dependent layout/voice/render outputs should rebuild. If a source claim changes, invalidate every downstream node reachable from that claim, but no others.

## 16. Durable orchestration

Long-running production must survive worker/process/network failure. Work units should be resumable, idempotent and observable. Separate browser, CPU render, audio and optional GPU/procedural workers.

## 17. Self-evolution laboratory

Any proposed change to hooks, layouts, motion, render logic, prompts or QA must follow:

```text
Hypothesis -> Experimental branch -> Golden tests -> Regression tests -> Benchmark comparison -> Promotion candidate -> Approval policy -> Production
```

No autonomous weakening of quality, evidence, safety, provenance or privacy gates.

## 18. Anti-slop gate

Reject content that contains generic AI phrasing, empty motivational language, unsupported superlatives, fake urgency, repeated hooks, low information density, pointless adjectives or template-like conclusions.

Every public piece must answer: **Why should this exist?**

## 19. Creator / brand memory

Store explicit, user-controlled brand and creator profiles:
- approved terminology
- logo and visual tokens
- approved fonts
- tone and language style
- Arabic transliteration choices
- CTA patterns
- prohibited phrases
- series rules
- motion language

Memory must be inspectable and editable.

## 20. End state

The user can type:

> I have an idea.

The system can internally execute:

```text
UNDERSTAND
RESEARCH
VERIFY
CHALLENGE
SELECT ANGLE
WRITE
STORYBOARD
DESIGN
TYPESET
ANIMATE
NARRATE
EDIT
MIX
LOCALIZE
REFLOW
TEST
PACKAGE
MEASURE
LEARN
```

The final artifact remains structured, traceable, editable, deterministic, reproducible, testable, versioned and auditable.
