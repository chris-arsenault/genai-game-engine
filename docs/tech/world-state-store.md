# WorldStateStore Observability Extensions

_Updated during Autonomous Sessions #62–63 (2025-10-30)._

## Overview
- Expanded `src/game/state/slices/factionSlice.js` with cascade-aware telemetry so QA and narrative tools can trace attitude changes, cascade sources, and reset provenance directly through selectors.
- Enhanced `src/game/state/slices/tutorialSlice.js` to capture prompt history snapshots, exposing a deterministic timeline of onboarding prompts for automated suites and debug overlays.
- Refreshed `benchmarks/state-store-prototype.js` to exercise the new reducers/selectors and assert the dispatch mean stays under **0.25 ms**.
- Session #63 surfaced cascade and tutorial selectors inside the debug HUD (`index.html`, `src/main.js`) and SaveManager inspector, with Playwright coverage.

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
- **SaveManager inspector**: `SaveManager.getInspectorSummary()` returns cascade and tutorial telemetry (fallback-safe) for console inspection, with Jest coverage.
- **End-to-end coverage**: `tests/e2e/debug-overlay-telemetry.spec.js` seeds cascade/tutorial events via `WorldStateStore.dispatch` and verifies HUD text plus console cleanliness.

## Benchmark Refresh
- Script: `node benchmarks/state-store-prototype.js`
  - Adds cascade/tutor events and queries `selectFactionCascadeSummary` + `selectPromptHistorySnapshots`.
  - Emits dispatch threshold verdict: **PASS** when mean ≤ 0.25 ms (current mean ≈ 0.0108 ms for 500 dispatches).
  - Summary JSON now carries `dispatchThreshold` and `dispatchThresholdMet` for automated gating.
- Recommended use: integrate into CI smoke to guard regressions on observability-heavy reducers.

## Verification Commands
```bash
npm test -- factionSlice
npm test -- tutorialSlice
npm test -- worldStateStore
npm test -- SaveManager
npx playwright test tests/e2e/debug-overlay-telemetry.spec.js
node benchmarks/state-store-prototype.js
```

All suites must stay green; benchmark should continue reporting `Dispatch latency … : PASS`.
