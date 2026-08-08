# AGENTS.md — SOLDIOM Creator OS

This repository is building a deterministic content intelligence system. Follow these rules for every implementation task.

## Prime directive

**AI thinks. Code draws. Evidence verifies. QA approves.**

## Hard rules

1. Do not add generative image or generative video APIs, models, dependencies, prompts or fallbacks.
2. Do not create synthetic screenshots. Browser/product screenshots must come from real capture or supplied assets.
3. Do not render factual charts/diagrams as opaque generated images. Use deterministic chart/vector/layout code.
4. Do not manually reverse Arabic text. Use proper bidi/shaping.
5. Do not introduce an LLM call into the pixel/render loop.
6. Do not bypass evidence, licensing, privacy, accessibility, RTL or provenance gates to make a demo pass.
7. Do not self-modify production logic. Experimental improvements live on branches and must pass benchmarks/golden tests.
8. Do not store secrets in source, logs, project JSON or exports.

## Architectural contracts

- Intelligence creates structured IR only.
- Rendering consumes Scene/Render IR only.
- External providers sit behind adapters.
- All important state is serialized and versioned.
- Every stage is independently cacheable and invalidatable.
- Public factual claims must connect to Evidence IR.

## Required order for major features

1. Read `README.md`.
2. Read `docs/GOD_MODE_SPEC.md`.
3. Read `docs/ARCHITECTURE.md`.
4. Check `docs/ROADMAP.md` and choose the earliest incomplete dependency required by the task.
5. Define/update schema first.
6. Implement smallest production-grade slice.
7. Add tests, including failure cases.
8. Add/refresh golden fixtures when rendering behavior changes.
9. Run typecheck/build/tests.
10. Document tradeoffs and remaining gaps.

## Arabic requirements

Every typography/layout change must consider:

- pure Arabic
- Arabic + English
- Arabic + numbers
- Arabic + percentage
- Arabic + currency
- Arabic + date/time
- Arabic + URL
- Arabic + parentheses
- Arabic + emoji

Treat missing glyphs, disconnected Arabic, reversed runs or misplaced punctuation as release-blocking defects.

## Determinism requirements

Pin or record anything that can change output:

- renderer version
- browser revision
- FFmpeg version
- font hashes
- dimensions/DPI
- locale/timezone
- random seed
- asset hashes

When randomness is needed for procedural graphics, use an explicit seed and fixed timestep.

## QA expectations

At minimum test:

- schema validation
- empty/malformed inputs
- overflow/clipping
- missing fonts/assets
- RTL fixtures
- safe areas
- deterministic hashes/snapshots
- stale evidence behavior
- blocked release gates

## Completion standard

Do not claim a phase is complete because code exists. A phase is complete only when its acceptance criteria in `docs/ROADMAP.md` pass and the relevant tests/fixtures are committed.
