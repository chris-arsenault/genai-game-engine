# WorldStateStore Observability Extensions

_Updated during Autonomous Sessions #62–64 (2025-10-30)._

## Overview
- Expanded `src/game/state/slices/factionSlice.js` with cascade-aware telemetry so QA and narrative tools can trace attitude changes, cascade sources, and reset provenance directly through selectors.
- Enhanced `src/game/state/slices/tutorialSlice.js` to capture prompt history snapshots, exposing a deterministic timeline of onboarding prompts for automated suites and debug overlays.
- Refreshed `benchmarks/state-store-prototype.js` to exercise the new reducers/selectors and assert the dispatch mean stays under **0.25 ms**.
- Session #63 surfaced cascade and tutorial selectors inside the debug HUD (`index.html`, `src/main.js`) and SaveManager inspector, with Playwright coverage.
- Session #64 wires the same telemetry directly into player-facing HUD panels (`ReputationUI`, `TutorialOverlay`, `SaveInspectorOverlay`) so QA can validate cascade activity and tutorial progress in builds without devtools.

## Faction Cascade Telemetry
- **State shape updates**
  - Each faction record now stores `lastAttitudeChange`, bounded `attitudeHistory` (10 entries), and cascade metadata (`lastCascade`, `cascadeCount`, `cascadeSources`).
  - Store-level `lastCascadeEvent` tracks the most recent cascade trigger for quick HUD/debug overlay access.
- **Selectors**
  - `factionSlice.selectors.selectFactionLastAttitudeChange` → latest change payload (clone-safe).
  - `factionSlice.selectors.selectFactionAttitudeHistory` → limited history array for timeline visualisations.
  - `factionSlice.selectors.selectFactionCascadeSummary` → global snapshot containing `lastCascadeEvent` plus per-faction cascade statistics.
- **Debug overlay integration**
  - `src/main.js` consumes `selectFactionCascadeSummary` to render cascade counts, sources, and relative timing within the developer HUD.
  - Playwright smoke (`tests/e2e/debug-overlay-telemetry.spec.js`) dispatches cascade events through `WorldStateStore.dispatch` and asserts the HUD output.
- **Event instrumentation**
  - `WorldStateStore` dispatch now forwards `sourceFactionName` where provided.
  - `FactionManager.cascadeReputationChange` emits cascade events with source metadata (`sourceFactionId` / `sourceFactionName`).
- **Regression coverage**
  - `tests/game/state/slices/factionSlice.test.js` validates cascade history, hydration, and selector behaviour.
  - `tests/game/state/worldStateStore.test.js` asserts cascade summary wiring from the EventBus through to selectors.

## Tutorial Prompt History Snapshots
- **State shape updates**
  - Tutorial slice tracks `promptHistorySnapshots` (default cap: 10) capturing event, timestamp, completed steps, and prompt details.
  - Runtime config now honours both `promptHistoryLimit` and `promptHistorySnapshotLimit`; `WorldStateStore` wiring exposes `tutorialPromptSnapshotLimit`.
- **Selectors**
  - `tutorialSlice.selectors.selectPromptHistorySnapshots` → full snapshot timeline (cloned).
  - `tutorialSlice.selectors.selectLatestPromptSnapshot` → convenience accessor for overlays/loggers.
  - Existing `selectPromptHistory` / `selectTutorialProgress` continue to function unchanged.
- **Debug overlay integration**
  - Developer HUD lists latest snapshot metadata and a short timeline sourced from `selectPromptHistorySnapshots`.
  - Tutorial automation guide now references the HUD timeline for quick validation, supplementing Playwright assertions.
- **Instrumentation hooks**
  - Snapshots recorded on `TUTORIAL_STEP_COMPLETED`, `TUTORIAL_COMPLETED`, and `TUTORIAL_SKIPPED`; tutorial start clears prior history.
  - Guide updated (`docs/guides/tutorial-automation-troubleshooting.md`) so QA automation asserts against snapshot data when validating prompt order.
- **Regression coverage**
  - `tests/game/state/slices/tutorialSlice.test.js` covers timeline creation, hydration, and snapshot limit enforcement.
  - `tests/game/state/worldStateStore.test.js` exercises snapshot selectors via EventBus-driven events.

## Debug Overlay & Inspector Surfaces
- **HUD updates**: `index.html` adds faction cascade and tutorial snapshot containers, while `src/main.js` renders selector output with relative time helpers.
- **SaveManager inspector**: `SaveManager.getInspectorSummary()` returns cascade and tutorial telemetry (fallback-safe) for console inspection, with Jest coverage. `SaveManager.exportInspectorSummary()` extends this surface with JSON + CSV artifact generation so QA/CI pipelines can capture cascade timelines and tutorial snapshots without ad-hoc scripts.
- **End-to-end coverage**: `tests/e2e/debug-overlay-telemetry.spec.js` seeds cascade/tutorial events via `WorldStateStore.dispatch` and verifies HUD text plus console cleanliness. `tests/e2e/cascade-mission-telemetry.spec.js` runs a narrative mission cadence, drives faction cascades, and exercises the export pipeline.

## HUD Telemetry Panels
- **ReputationUI (`src/game/ui/ReputationUI.js`)**
  - Subscribes to `WorldStateStore` updates via `factionSlice.selectors.selectFactionCascadeSummary`.
  - Renders cascade summary lines and hotspot rankings beneath the faction header.
  - Jest coverage in `tests/game/ui/ReputationUI.test.js` validates telemetry hydration and hotspot ordering.
- **TutorialOverlay (`src/game/ui/TutorialOverlay.js`)**
  - Leverages `buildTutorialOverlayView` to display latest tutorial snapshots and a trimmed timeline sidebar.
  - Responds to store updates to keep prompts, highlights, and telemetry synchronized.
  - Jest coverage in `tests/game/ui/TutorialOverlay.test.js` and `tests/game/ui/helpers/tutorialViewModel.test.js`.
- **SaveInspectorOverlay (`src/game/ui/SaveInspectorOverlay.js`)**
  - Reads `SaveManager.getInspectorSummary()` with fallback selectors so QA can open the HUD overlay (default `[O]`) and inspect cascade/tutorial metrics.
  - Canvas render util draws summary metrics, cascade targets, and tutorial timeline.
  - Jest coverage in `tests/game/ui/SaveInspectorOverlay.test.js`.
- **End-to-end validation**
  - Playwright smoke `tests/e2e/hud-telemetry.spec.js` dispatches cascade/tutorial events, ensures UI overlays surface telemetry, and falls back to explicit `show()` calls if key edge detection is swallowed in headless environments.
  - Mission-focused `tests/e2e/cascade-mission-telemetry.spec.js` progresses Memory Parlor objectives, leverages `FactionReputationSystem` cascades, and validates that HUD summaries and export artifacts stay in sync.

## Benchmark Refresh
- Script: `node benchmarks/state-store-prototype.js`
  - Adds cascade/tutor events and queries `selectFactionCascadeSummary` + `selectPromptHistorySnapshots`.
  - Emits dispatch threshold verdict: **PASS** when mean ≤ 0.25 ms (current mean ≈ 0.0100 ms for 500 dispatches).
  - Summary JSON now carries `dispatchThreshold` and `dispatchThresholdMet` for automated gating.
- Recommended use: integrate into CI smoke to guard regressions on observability-heavy reducers.

## Telemetry Export Monitoring
- **Adapter instrumentation**: `src/game/telemetry/TelemetryArtifactWriterAdapter.js` now records per-writer timings, success/failure counts, and emits `telemetry:artifacts_written` / `telemetry:artifact_failed`. SaveManager boots a default instance (eventBus wired) so automation pipelines only need to register writers.
- **Filesystem writer**: `src/game/telemetry/FileSystemTelemetryWriter.js` persists artifacts with deterministic UTF-8 output and recursive dir creation. Combine with adapter fan-out for QA captures, Playwright attachments, or CI upload staging.
- **CLI export task**: `scripts/telemetry/exportInspectorTelemetry.js` (exposed via `npm run export-telemetry`) instantiates SaveManager with the filesystem writer, hydrates optional snapshots, and invokes `CiArtifactPublisher` to emit `ci-artifacts.json` manifests. Upload commands can be supplied via repeated `--ciCommand` flags **or** the new environment hooks `TELEMETRY_CI_COMMANDS` / `TELEMETRY_CI_COMMANDS_PATH`, which accept JSON arrays or newline-delimited definitions. Local runs default to dry-run metadata while CI honours command execution when `CI=true`.
- **CI artifact publisher**: `src/game/telemetry/CiArtifactPublisher.js` writes metadata manifests and executes optional upload commands with dependency-injected runners. Lifecycle events (`telemetry:ci_publish_started/completed/failed`) bubble through the EventBus for dashboards; Jest coverage (`tests/game/telemetry/CiArtifactPublisher.test.js`) asserts command invocation, metadata payloads, and failure handling.
- **Integration coverage**: `tests/integration/telemetryExportTask.test.js` drives `runTelemetryExport` end-to-end with a seeded `WorldStateStore`, verifying artifact persistence, metadata manifests, and dry-run logging. Treat this suite as the smoke test whenever adjusting CLI flags or publisher behaviour.
- **Asynchronous export contract**: `SaveManager.exportInspectorSummary()` is now `async`—always `await window.game.saveManager.exportInspectorSummary(...)` inside automation helpers to ensure writer completion and metrics availability (`result.metrics.artifactsWritten`, etc.).
- **Writer benchmark**: `benchmarks/telemetry-export-writer.js` exercises adapter + filesystem writer against synthetic summaries. Target <10 ms per artifact on CI runners; keep console output in the session handoff when thresholds drift.
- **Dispatch regression guardrail**
  - After integrating adapters or transcript recorders, rerun `node benchmarks/state-store-prototype.js` and compare `dispatchMeanMs` deltas (budget: +0.01 ms max variance, guardrail still ≤0.25 ms).
  - Record benchmark outputs in `benchmark-results/` for trend analysis; link the latest run inside session handoffs.
- **CI verification**
  - GitHub Actions (`.github/workflows/ci.yml`) now runs `npm run export-telemetry` after Playwright, setting `TELEMETRY_EXPORT_DIR=telemetry-artifacts` and piping a JSON context payload generated in-line. Artifact uploads are handled by the dedicated "Upload inspector telemetry artifacts" step, keeping manifests alongside JSON/CSV outputs.
  - `.github/ci/telemetry-commands.json` wires in `node scripts/telemetry/providers/githubUpload.js`, which now executes a real `gh artifact upload` when the CLI is present, captures stdout/stderr/exit codes, and persists provider results back to `ci-artifacts.json`. Dry runs and missing CLI scenarios still bail out gracefully with explicit skip reasons.
  - Provider coverage lives in `tests/integration/githubUploadProvider.test.js`, which exercises dry-run skips, CLI-missing paths, failure handling for absent files, and happy-path uploads with captured metrics.
  - On failure, parse adapter summary logs to pinpoint failing writer (filesystem vs CI publisher) and rerun locally with `DEBUG=telemetry npm run export-telemetry`.
- **Playwright validation**
  - `tests/e2e/utils/telemetryArtifacts.js` exposes `captureTelemetryArtifacts(page, testInfo, options)` which mirrors the filesystem writer pipeline, writes artifacts to the test output directory, and attaches JSON/CSV files plus summary blobs to Playwright reports. Failure handlers in tutorial/debug specs attach error notes if the export falters.
  - Helper coverage now spans the cascade mission, tutorial overlay, debug telemetry, and debug inventory specs, ensuring QA receives matching exports across mission, tutorial, and debug flows. Monitor report attachments to confirm writers remain wired in headless environments.
  - Use `PLAYWRIGHT_TELEMETRY_DEBUG=1 npx playwright test ...` to surface helper diagnostics during local repro.

## Tutorial Transcript Capture
- **TutorialTranscriptRecorder (`src/game/tutorial/TutorialTranscriptRecorder.js`)**
  - Subscribes to `tutorial:*` lifecycle events, records bounded transcripts (default 50 entries), and emits throttled `tutorial:transcript_updated` notifications for dashboards.
  - Designed for SaveManager export integration and future tutorial QA tooling; retention/emit cadence configurable via constructor options.
  - Jest coverage in `tests/game/tutorial/TutorialTranscriptRecorder.test.js` verifies event capture, retention limits, and update throttling.
- **Transcript serialization helpers (`src/game/tutorial/serializers/tutorialTranscriptSerializer.js`)**
  - `buildTutorialTranscript()` normalizes recorder entries for export pipelines and SaveManager summaries.
  - `serializeTranscriptToCsv()` and `serializeTranscriptToMarkdown()` power the transcript CSV/Markdown artifacts now emitted by the exporter/CLI.
  - Jest coverage in `tests/game/tutorial/tutorialTranscriptSerializer.test.js` ensures formatting and limit handling stay stable.
- **SaveManager summary integration**
  - `SaveManager.getInspectorSummary()` includes `tutorial.transcript` arrays derived from the recorder, feeding JSON summaries alongside CSV/Markdown artifacts consumed by the CLI and Playwright helper.
- **Runtime bootstrap wiring**
  - `Game.initializeGameSystems()` now instantiates `TutorialTranscriptRecorder`, passes it to `SaveManager`, and calls `start()` so every runtime session—including Playwright automation—captures transcripts without manual bootstrapping. Cleanup stops the recorder to release event listeners.
  - Regression coverage: `tests/game/Game.tutorialTranscriptRecorder.test.js` validates SaveManager wiring, transcript population after tutorial events, and cleanup unsubscribes.
- **Automation validation**
  - `tests/e2e/tutorial-overlay.spec.js` asserts that transcript summaries and CSV/Markdown artifacts include `tutorial_started`, `tutorial_step_completed`, and `tutorial_completed` events, preventing regressions where recorder wiring silently fails in headless runs.

## Verification Commands
```bash
npm test -- factionSlice
npm test -- tutorialSlice
npm test -- worldStateStore
npm test -- SaveManager
npm test -- tutorialTranscriptRecorder
npm test -- tutorialTranscriptSerializer
npm test -- --runTestsByPath tests/game/telemetry/CiArtifactPublisher.test.js tests/integration/telemetryExportTask.test.js
npm test -- ReputationUI
npm test -- TutorialOverlay
npm test -- SaveInspectorOverlay
npm test -- tutorialViewModel
npx playwright test tests/e2e/debug-overlay-telemetry.spec.js
npx playwright test tests/e2e/debug-overlay-inventory.spec.js
npx playwright test tests/e2e/hud-telemetry.spec.js
npx playwright test tests/e2e/cascade-mission-telemetry.spec.js
npx playwright test tests/e2e/tutorial-overlay.spec.js
node benchmarks/state-store-prototype.js
node benchmarks/telemetry-export-writer.js # validate writer throughput (<10ms per artifact)
DEBUG=telemetry npm run export-telemetry -- --dryRun # validates writer wiring without disk writes
npm run export-telemetry -- --artifactDir=./telemetry-artifacts --metadata=./telemetry-artifacts/ci-artifacts.json --dryRun
```

All suites must stay green; benchmark should continue reporting `Dispatch latency … : PASS`.
