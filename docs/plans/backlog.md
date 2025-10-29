# Development Backlog: The Memory Syndicate
**Prioritized Implementation Tasks**

---

## Document Overview

**Version**: 1.1
**Last Updated**: 2025-10-31
**Status**: Active Development
**Current Sprint**: Sprint 8 – Final Polish & Production

### Current High-Priority Focus (Groomed 2025-10-29)

| ID | Priority | Status | Summary | Next Steps |
| --- | --- | --- | --- | --- |
| TUT-201 | P0 | Completed | Tutorial case blocked at step 3 (`evidence_detection`) because legacy scene entities bypassed ECS detection events. | ECS-aligned tutorial scene entities shipped Session #51; re-run tutorial smoke tests after combat audio validation. |
| AUDIO-351 | P0 | Completed | Validate live combat/disguise trigger routing through `AmbientSceneAudioController` using real combat loop events. | Adaptive audio routing now responds to gameplay emits; telemetry verified by Jest/Playwright suites and new infiltration benchmark. |
| PERF-214 | P1 | Pending | Browser-level performance profiling for adaptive audio + overlay interactions to confirm <16 ms frame time budget. | Run Chromium/Firefox performance audits with combat/stealth transitions, log hotspots, and file perf follow-ups as needed. |
| UX-173 | P1 | Pending | Improve debug audio overlay ergonomics (keyboard shortcuts, focus management). | Prototype keyboard navigation + focus traps, add Jest/Playwright coverage for accessibility interactions. |

**Next Session Focus**: AUDIO-351 closed — focus shifts to AUDIO-351 follow-up benchmarks and manual tutorial QA instrumentation.

_Historical session handoffs (Sessions 2–44) now live under `archive/docs/reports/` for reference._

### Purpose

This backlog translates the roadmap into actionable, prioritized tasks. Each task includes:
- Unique task ID
- Priority level
- Clear description and acceptance criteria
- Dependencies and blockers
- Estimated effort
- Tags for filtering

### How to Use This Backlog

1. **Sprint Planning**: Pull P0 and P1 tasks for current milestone
2. **Daily Work**: Focus on tasks marked `in_progress` or highest priority `pending`
3. **Dependency Management**: Check dependencies before starting tasks
4. **Progress Tracking**: Move tasks from pending → in_progress → completed
5. **Refinement**: Add details to future tasks as they approach

---

## Priority System

### P0 - Critical (Blocking)
Tasks that block other work or are required for milestone completion. Must be completed first.
- Examples: Core engine scaffolding, critical dependencies, milestone gates
- Timeline: Complete ASAP within current sprint

### P1 - High Priority (Core Features)
Essential features for the milestone. Define the milestone's success.
- Examples: Main gameplay systems, key mechanics, integration points
- Timeline: Complete within current sprint

### P2 - Medium Priority (Important but Deferrable)
Important features that enhance quality but aren't strictly required for milestone.
- Examples: Polish, optimization, secondary features, nice-to-haves
- Timeline: Complete if time permits, or defer to next sprint

### P3 - Low Priority (Optional/Polish)
Nice-to-have features, polish items, or speculative improvements.
- Examples: Extra features, cosmetic improvements, experimental ideas
- Timeline: Defer unless surplus time available

---

## Tagging System

**System Tags**:
- `engine` - Core engine systems (ECS, rendering, physics)
- `gameplay` - Game-specific mechanics (investigation, combat, stealth)
- `narrative` - Story, quests, dialogue, lore
- `test` - Testing infrastructure, test cases
- `docs` - Documentation, comments, guides
- `perf` - Performance optimization, profiling
- `asset` - Asset management, requests, integration
- `ux` - User interface, user experience
- `refactor` - Code cleanup, refactoring, technical debt

**Domain Tags**:
- `ecs` - Entity-Component-System
- `rendering` - Graphics and rendering
- `physics` - Physics and collision
- `investigation` - Detective mechanics
- `faction` - Faction and reputation systems
- `procedural` - Procedural generation
- `quest` - Quest and story systems

---

## 🚨 PRODUCT OWNER SHORT-TERM PRIORITIES

**Critical Issues Blocking Manual Validation**

### BUG-312: UI Overlay Toggle Edge Detection (Resolved)
- **Priority**: **P0 - CRITICAL BLOCKER**
- **Tags**: `ux`, `engine`, `input`, `test`
- **Effort**: 1 hour (completed Session #31)
- **Status**: ✅ **Resolved** – Manual QA confirmed overlays stay open per key press
- **Reported**: 2025-10-29 (Manual QA smoke)

**Problem**:
Faction/disguise/quest overlays and dialogue prompts were invisible during browser QA because `InputState.isPressed` toggled UI state every frame a key remained down, instantly hiding panels and preventing dialogue from staying open.

**Fix**:
- Added `InputState.wasJustPressed()` backed by per-action edge tracking to report key transitions exactly once.
- Game loop now guards overlay toggles with the new edge detection to avoid per-frame flapping.
- Added regression tests covering input edge detection and overlay toggles (`tests/game/config/Controls.test.js`, updated `tests/game/Game.uiOverlays.test.js`).

**Verification**:
- Jest targeted suite: `tests/game/config/Controls.test.js`, `tests/game/Game.uiOverlays.test.js`.
- Manual repro no longer occurs; overlays remain visible and dialogue advances normally.

**Follow-up**:
- Audit other toggle-style interactions (inventory, deduction board) once their UI hooks land to ensure they use `wasJustPressed`.

### PO-001: Fix Game Loading - Unable to Run Locally ✅
- **Priority**: **P0 - CRITICAL BLOCKER**
- **Tags**: `engine`, `critical`, `blocker`, `integration`
- **Effort**: 2-4 hours
- **Dependencies**: None (blocks all manual testing)
- **Status**: ✅ **Resolved** — Engine SystemManager now injects dependencies once and gameplay systems register via the canonical path.
- **Reported**: 2025-10-26 (Autonomous Session #3)
- **Resolved**: 2025-10-30 (Autonomous Session #59)

**Resolution Summary**:
- Refined `SystemManager.registerSystem` to accept named registrations, optional priority overrides, and to sort after initialization so systems that adjust priority during `init()` are respected.
- Refactored `Game.initializeGameSystems` to stop manual `init()` calls, registering each gameplay system with a deterministic name and relying on the engine to inject the shared EventBus.
- Ensured `FirewallScramblerSystem` declares its priority in the constructor, preventing ordering drift.
- Added Jest coverage (`tests/game/Game.systemRegistration.test.js`) to lock the registration order, dependency injection, and single-init semantics.

**Verification**:
- `npm test -- SystemManager`
- `npm test -- Game.systemRegistration`
- `npm test`

**Next Steps**:
- Perform manual dev-server smoke to confirm browser startup is clean.
- Keep monitoring for legacy references to `this.events` vs. `this.eventBus` as narrative systems are modernized.

---

### PO-002: Stand Up WorldStateStore Observability Layer
- **Priority**: **P1 - HIGH**
- **Tags**: `engine`, `ecs`, `narrative`, `refactor`
- **Effort**: 4-6 hours
- **Dependencies**: Session #16 research report (`docs/research/engine/game-state-management-comparison.md`)
- **Status**: In Progress — Phase 0 WorldStateStore scaffolding delivered (Session #17); UI migration covered by PO-003
- **Reported**: 2025-10-28 (Autonomous Session #16)

**Problem**:
Lack of centralized, queryable world state prevents verification of quest, dialogue, faction, and tutorial progression. Silent event failures cannot be detected without an authoritative store.

**Solution Outline**:
Implement Phase 0 of the hybrid Event-Sourced WorldStateStore (see `docs/plans/world-state-store-plan.md`):
1. Scaffold `WorldStateStore` with normalized slices (quests, story flags, factions, tutorial).
2. Subscribe store to EventBus (`quest:*`, `story:*`, `faction:*`, `tutorial:*`).
3. Publish memoized selectors for UI overlays and SaveManager.
4. Expose `worldStateStore.debug()` console dump gated behind `__DEV__`.

**Acceptance Criteria**:
- Store instance created in `src/game/Game.js` and shared via dependency container.
- Events produce deterministic state snapshots accessible via selectors in <1 ms.
- SaveManager can serialize state via store without manager scraping (parity verified in tests).
- Jest reducer + selector tests cover quest/story/faction happy paths and error payloads.
- Benchmark `node benchmarks/state-store-prototype.js` updated to consume real reducers.

_Progress 2025-10-30 (Session #61 instrumentation): WorldStateStore now captures blocked objectives, faction reputation resets, and inventory selection telemetry with updated slice selectors/tests to support PO-002 observability goals._
_Progress 2025-10-30 (Session #62 instrumentation): Added cascade metadata + history to faction slice, tutorial prompt snapshot timelines, and refreshed `benchmarks/state-store-prototype.js` with dispatch-threshold reporting (≤0.25 ms)._
_Progress 2025-10-30 (Session #64 implementation): Player-facing HUD overlays (Reputation, Tutorial, Save Inspector) now consume cascade/tutorial selectors with Jest + Playwright coverage ensuring QA can audit telemetry in builds without devtools._
_Progress 2025-10-30 (Session #65 export tooling): SaveManager JSON/CSV export artifacts unlock QA/CI capture, cascade mission Playwright flow verifies telemetry, and benchmark dispatch latency holds at 0.0100 ms (<0.25 ms)._
_Progress 2025-10-30 (Session #66 architecture): Authored telemetry export integration and tutorial transcript export plans (`docs/plans/telemetry-export-integration-plan.md`, `docs/plans/tutorial-transcript-export-plan.md`) plus monitoring guidance in `docs/tech/world-state-store.md`; backlog next steps aligned with the phased rollout._
_Progress 2025-10-30 (Session #67 implementation): Delivered TelemetryArtifactWriterAdapter + FileSystemTelemetryWriter with SaveManager async integration, Jest coverage, Playwright updates, documentation refresh, and a telemetry-export-writer benchmark (mean 1.39 ms over 5 iterations)._ 
_Progress 2025-10-31 (Session #68 CLI integration): Introduced `npm run export-telemetry` with `CiArtifactPublisher` metadata manifests, Jest + integration coverage, and a Playwright telemetry helper that mirrors filesystem writer outputs for cascade mission automation._
_Progress 2025-10-31 (Session #69 CI + transcript kickoff): GitHub Actions now runs the telemetry export CLI with configurable command sources and dedicated artifact uploads, telemetry helper coverage spans tutorial/debug suites, and TutorialTranscriptRecorder + serializer scaffolding feeds SaveManager summaries with fresh Jest suites._
_Progress 2025-11-01 (Session #70 transcript exports): Exporter now emits tutorial transcript CSV/Markdown artifacts consumed by CLI/Playwright, CI stage runs with provider command hooks (GitHub upload stub), and tutorial automation assertions cover transcript availability while docs/backlog capture the new pipeline._
_Progress 2025-11-01 (Session #71 runtime wiring): Game bootstrap auto-starts TutorialTranscriptRecorder for runtime sessions, GitHub upload provider executes real CLI uploads while persisting metrics into `ci-artifacts.json`, and new Jest/Playwright/integration suites guard transcript content and provider behaviour._
_Progress 2025-11-02 (Session #72 telemetry dashboards): CI workflow now appends provider-result metrics to step summaries via `reportProviderMetrics.js`, and cascade mission automation asserts tutorial transcript ordering alongside cascade telemetry artifacts._
_Progress 2025-11-03 (Session #73 resilience): `CiArtifactPublisher` downgrades missing upload executables to `status: skipped (command_not_found)` without failing exports, with new Jest/integration coverage documenting the fallback and docs refreshed for CI operators._
_Progress 2025-11-04 (Session #75 telemetry monitoring): `CiArtifactPublisher` now records fallbackSummary metrics, added `scripts/telemetry/analyzeFallbackUsage.js`, and expanded Jest coverage so repeated fallback attempts surface for operators._

**Next Steps**:
- Integrate telemetry fallback analysis CLI into CI summaries so repeated fallback attempts surface with thresholds.
- Evaluate packaging fallback uploader configuration for non-GitHub runners (self-hosted/minio) so telemetry exporters remain portable.

---

### PO-003: Migrate Quest/Tutorial/Dialogue Systems to WorldStateStore
- **Priority**: **P1 - HIGH**
- **Tags**: `gameplay`, `narrative`, `ecs`, `ux`
- **Effort**: 6-8 hours
- **Dependencies**: PO-002
- **Status**: In Progress — Dialogue/tutorial slices and UI consume WorldStateStore; first Playwright smoke (dialogue overlay) operational, debug tooling still pending
- **Reported**: 2025-10-28 (Autonomous Session #16)

**Problem**:
High-touch narrative systems (QuestSystem, DialogueSystem, TutorialSystem) currently emit events without verified state ingestion, leading to UI desync (Quest log overlay) and opaque branching logic.

**Solution Outline**:
1. Dispatch structured events (`quest:state_changed`, `dialogue:node_changed`, `tutorial:step_completed`) with full payload schema.
2. Reducers normalize data (quest objectives, dialogue options, tutorial milestones).
3. Quest/Tutorial UI overlays consume selectors, replacing manual event subscriptions.
4. Add invariant tests ensuring component-level state matches store-derived views.

_Progress 2025-10-28 (Session #18): Quest log UI + tracker HUD migrated to store selectors; quest/state parity tests added._
_Progress 2025-10-28 (Session #19 planning): Dialogue & Tutorial Store Integration plan drafted (`docs/plans/dialogue-tutorial-store-plan.md`) to unblock overlay migration; implementation remains outstanding._
_Progress 2025-10-28 (Session #20 implementation): Dialogue/tutorial slices landed with store-driven overlays, SaveManager parity, and benchmarking updates; pending Playwright selectors & debug tooling._
_Progress 2025-10-28 (Session #21 implementation): DialogueBox now instantiated via `Game.initializeUIOverlays`, forwarding keyboard input through EventBus and rendering on the HUD; Playwright selector wiring remains outstanding._
_Progress 2025-10-28 (Session #22 implementation): Procedural performance tests rebaselined (TileMap <20 ms for 10k ops, SeededRandom >5 M ops/sec) to stabilize CI while retaining performance guardrails._
_Progress 2025-10-28 (Session #23 implementation): Added Playwright smoke validating dialogue overlay + transcript selectors via WorldStateStore and prototyped debug overlay readout; next up quest path coverage._
_Progress 2025-10-28 (Session #24 implementation): Quest 001 Playwright scenario landed (branches into Case 002) and dialogue debug overlay now offers timestamped transcripts with pause/resume controls; tutorial automation + transcript retention tuning remain open._
_Progress 2025-10-30 (Session #45 implementation): Debug overlay now surfaces quest/story slices from WorldStateStore alongside automated coverage, satisfying PO-003 observability follow-up._
_Progress 2025-10-30 (Session #64 implementation): Tutorial and SaveInspector HUD overlays render WorldStateStore telemetry (snapshots, cascade summaries) with new Playwright smoke guarding regressions; export tooling + broader narrative beats remain next._
_Progress 2025-10-31 (Session #74 implementation): Added GitHub Actions artifact fallback across CiArtifactPublisher and the GitHub upload provider, expanded unit/integration suites, and re-ran observability guardrails (dispatch mean 0.0108 ms, writer mean 0.82 ms) to confirm telemetry resilience._

**Acceptance Criteria**:
- Quest log + tracker HUD read from selectors and stay in sync during quest progression playtest.
- Dialogue debug overlay can display active node/path using store data.
- Tutorial completion stored once; SaveManager load restores state via store snapshot.
- Playwright scenario covering Quest 001 validates UI state after each milestone.
- Added regression tests guard against missing reducer payload fields (throws descriptive error).

### Session #24 Backlog Updates

#### QA-201: Tutorial Playwright Regression
- **Priority**: P1
- **Tags**: `test`, `tutorial`, `narrative`
- **Effort**: 4 hours
- **Dependencies**: PO-003 selector APIs, Playwright harness
- **Description**: Extend the Playwright pack to cover tutorial prompts, ensuring `TutorialOverlay` and store selectors remain synchronized during onboarding beats.
- **Acceptance Criteria**:
  - Playwright scenario drives tutorial onboarding to completion using store-driven selectors.
  - Assertions cover prompt visibility, dismissal, and history tracking.
  - Test artifacts (screenshots/video) stored on failure.
  - Documentation updated with scenario scope and troubleshooting notes.
_Progress 2025-10-28 (Session #25 implementation): Added `tests/e2e/tutorial-overlay.spec.js` validating tutorial progression, overlay visibility, and store completion state._
_Progress 2025-10-30 (Session #53 implementation): Extended Playwright coverage to evidence collection, clue derivation, and detective vision prompts, updating `InvestigationSystem` to emit `ability:activated` for automation telemetry._
_Progress 2025-10-30 (Session #54 implementation): Added Playwright flows for case file prompts, forensic analysis completion, and deduction board resolution using event-driven helpers in `tests/e2e/tutorial-overlay.spec.js`._
_Progress 2025-10-30 (Session #55 implementation): CaseManager + DeductionSystem wired into runtime, Playwright scenarios now rely on live inputs, and troubleshooting guidance published (`docs/guides/tutorial-automation-troubleshooting.md`)._
- **Status**: ✅ Completed – documentation, runtime wiring, and automation coverage delivered Session #55.

#### UX-182: Forensic Analysis Prompt Overlay
- **Priority**: P1
- **Tags**: `ux`, `forensic`, `tutorial`
- **Effort**: 3 hours
- **Dependencies**: QA-201 runtime wiring
- **Description**: Surface forensic analysis availability through the interaction overlay so both players and automation press `KeyF` to begin analysis.
- **Acceptance Criteria**:
  - Interaction prompt shows forensic instructions when `forensic:available` fires.
  - `KeyF` input triggers `ForensicSystem.initiateAnalysis` via the new handler.
  - Tutorial counters increment through the forensic step without direct system calls.
_Progress 2025-10-30 (Session #56 implementation): Added forensic prompt queueing in `Game`, helper methods to locate evidence entities, and Playwright coverage that waits for the prompt before pressing `KeyF`._
- **Status**: ✅ Completed — Session #56 delivered prompt overlay + automation updates.

#### QA-274: Tutorial Scene Runtime Alignment
- **Priority**: P1
- **Tags**: `tutorial`, `automation`, `scene`
- **Effort**: 3 hours
- **Dependencies**: QA-201 tutorial automation
- **Description**: Refactor `TutorialScene` to reuse the Act 1 scene loader so tutorial automation uses the same entity layout, evidence definitions, and forensic metadata as the live runtime.
- **Acceptance Criteria**:
  - TutorialScene bootstrap spawns the same evidence set as Act1Scene.
  - TutorialScene unload clears spawned entities without leaking components.
  - Playwright helpers collect evidence by id and unblock forensic prompts.
_Progress 2025-10-30 (Session #56 implementation): `TutorialScene.load()` now calls `loadAct1Scene`, caches entity ids, and updates automation helpers to target evidence by id before forensic analysis._
- **Status**: ✅ Completed — Session #56 parity confirmed via Playwright tutorial suite.

#### QA-202: SaveManager LocalStorage Regression
- **Priority**: P1
- **Tags**: `test`, `engine`
- **Effort**: 3 hours
- **Dependencies**: PO-002 serialization hooks
- **Description**: Restore failing SaveManager LocalStorage tests and validate parity against the new WorldStateStore snapshot pipeline.
- **Acceptance Criteria**:
  - LocalStorage-backed SaveManager Jest tests green and running in CI.
  - Negative cases assert descriptive errors for corrupted payloads.
  - TestStatus.md reflects coverage status and ownership.
_Progress 2025-10-28 (Session #26 implementation): Added storage-unavailable regression tests, confirmed SaveManager suite passes, and updated TestStatus.md to document coverage._

#### TOOL-045: Dialogue Transcript Retention Audit
- **Priority**: P3
- **Tags**: `narrative`, `ux`, `perf`
- **Effort**: 3 hours
- **Dependencies**: Debug overlay enhancements (Session #24)
- **Description**: Profile transcript growth, define retention limits, and implement truncation/pagination safeguards to keep overlay responsive during long play sessions.
- **Status**: Deprioritized until the core gameplay vertical slice is interactive.
- **Acceptance Criteria**:
  - Benchmarks capture overlay update cost at 10, 25, and 50 transcript entries.
  - Configurable retention limit agreed with narrative team and enforced in `dialogueSlice`.
  - Overlay UI communicates when transcripts are truncated.
  - Findings documented in `docs/tech/state-store.md` (or successor).

#### PERF-118: LevelSpawnSystem Spawn Loop Baseline
- **Priority**: P3
- **Tags**: `perf`, `engine`
- **Effort**: 3 hours
- **Dependencies**: Level spawn instrumentation
- **Description**: Reproduce the >50 ms spawn spike noted in Session #17, capture telemetry, and adjust thresholds or optimize spawn batching once core systems are playable.
- **Acceptance Criteria**:
  - Benchmark script records spawn time across 5 runs with averages and variance.
  - CI perf threshold updated (or code optimized) so baseline stays <50 ms on target hardware.
  - Root cause and mitigations summarized in performance notes.

#### PERF-119: Procedural Guardrail Monitoring
- **Priority**: P3
- **Tags**: `perf`, `test`
- **Effort**: 2 hours
- **Dependencies**: Session #22 perf rebaseline
- **Description**: Capture telemetry for TileMap and SeededRandom suites post-rebaseline to confirm thresholds remain stable and alerting works after interactive build lands.
- **Acceptance Criteria**:
  - CI telemetry logged for five consecutive runs.
  - Threshold adjustments (if any) documented and linked to raw data.
  - Failing runs emit actionable messaging for engineers.

#### CI-014: Playwright Smoke Integration
- **Priority**: P3
- **Tags**: `test`, `ci`
- **Effort**: 4 hours
- **Dependencies**: CI agent access to browsers, QA-201/202
- **Status**: ✅ Completed — Session #45 adds GitHub Actions workflow that installs Playwright Chromium, runs Jest + smoke pack, emits JUnit results, and uploads failure artifacts.
- **Description**: Wire quest and dialogue Playwright smokes into the CI pipeline with junit + artifact publication to enable flake tracking once gameplay loop stabilizes.
- **Acceptance Criteria**:
  - CI pipeline installs browsers (`npx playwright install --with-deps`) and runs smoke pack headless.
  - JUnit + line reporters uploaded for telemetry dashboards.
  - Failure artifacts (video, trace) retained for 7 days.
  - Pipeline gate enforces zero retries before surfacing failures to engineers.

### Session #47 Backlog Updates

#### AUDIO-305: Adaptive Music Layer Foundation
- **Priority**: P1
- **Tags**: `audio`, `engine`, `narrative`
- **Effort**: 4 hours
- **Status**: ✅ Completed — AdaptiveMusicLayerController introduced, AmbientSceneAudioController rewired to drive stateful mixes reacting to scrambler events, and coverage added.
- **Summary**: Establish multi-layer music infrastructure (ambient/alert/combat) tied to narrative event hooks so Memory Parlor stealth sequences can swell intelligently.
- **Follow-up**: Capture combat intensity triggers from `DisguiseSystem` once combat arcs land; retune base/tension mix when bespoke stems are sourced.

#### AUDIO-306: SFX Catalog Bootstrap
- **Priority**: P1
- **Tags**: `audio`, `asset`, `engine`
- **Effort**: 3 hours
- **Status**: ✅ Completed — Catalog populated with CC0 Kenney UI cues, loader preloads buffers through AudioManager, and Game initialization now ensures SFX are ready for AudioFeedbackController.
- **Summary**: Provide declarative manifest for UI/gameplay cues with licensing metadata and automate loading so SFX hooks stop logging stubs.
- **Follow-up**: Expand catalog with investigation/combat cues once sourced; integrate AssetManager manifest entries for streaming-tier prioritization.

#### AUDIO-307: Adaptive Mix Tuning & Asset Expansion
- **Priority**: P2
- **Tags**: `audio`, `narrative`, `asset`
- **Effort**: 3 hours
- **Status**: ✅ Completed
- **Summary**: Source bespoke tension/combat stems, wire combat/disguise event transitions, stress-test telemetry, and deliver catalog filtering UX for audio designers.
- **Acceptance Criteria**:
  - Dedicated tension/combat stems registered with loop metadata.
  - Combat events invoke adaptive state transitions with Playwright coverage.
  - Fades validated to avoid gain spikes; telemetry logged for overlays.
- **Notes**: Adaptive combat/disguise triggers now flow through `AmbientSceneAudioController`, telemetry history is capped via stress harness, and the debug overlay exposes searchable/tag-filterable SFX catalog entries with Playwright coverage.

---

### Session #44 Testing & Stability

#### INFRA-221: Reconcile Jest with Playwright & Canvas dependencies
- **Priority**: P0
- **Tags**: `test`, `infrastructure`, `engine`
- **Effort**: 3 hours
- **Status**: ✅ Completed — Added `TransformStream` and Canvas gradient polyfills to the Jest setup file, relaxed jsdom frame-time assertions, and taught Jest to skip Playwright specs so `npm test` returns signal-bearing results.
- **Notes**: `tests/setup.js`, `tests/engine/integration-full.test.js`, and `package.json` updated; full suite green as of Session #44.

#### QA-318: Memory Parlor Return Dialogue Smoke
- **Priority**: P1
- **Tags**: `test`, `narrative`, `quest`
- **Effort**: 4 hours
- **Status**: ✅ Completed — New Playwright scenario drives the Memory Parlor infiltration to completion, validates quest rewards, and confirms Captain Reese follow-up dialogue on the Act 1 return path (`tests/e2e/memory-parlor-return-dialogue.spec.js`).
- **Notes**: Coverage now exercises knowledge ledger sync, quest completion, and persistent player entity reuse on quest return.

#### QA-319: Debug Overlay Inventory Evidence Seeding
- **Priority**: P2
- **Tags**: `test`, `ui`, `debug`
- **Effort**: 1 hour
- **Status**: ✅ Completed — Playwright debug overlay smoke seeds evidence metadata so the overlay copy (“1 item · 1 evidence”) remains assertable after inventory schema updates (`tests/e2e/debug-overlay-inventory.spec.js`).

### Session #27 Core Gameplay Focus

#### CORE-301: Act 1 Scene Visual Bring-Up
- **Priority**: P0
- **Tags**: `gameplay`, `rendering`
- **Effort**: 4 hours
- **Dependencies**: Layered renderer dynamic layer support (Session #26)
- **Status**: In Progress — Scene decal, caution tape, and ambient props implemented; needs browser smoke for palette tuning.
- **Description**: Ensure the Act 1 investigative scene presents readable context on load (ground decal, boundaries, NPC silhouettes, crime scene marker) so players immediately understand where they are.
- **Acceptance Criteria**:
  - Crime scene trigger area renders using the ground layer and remains aligned as the camera moves.
  - Boundary walls/environment props are visible with a distinct palette from the background grid.
  - Background layer provides a stylized gradient/grid without obscuring entities.

#### CORE-302: Player Feedback & Movement Loop
- **Priority**: P0
- **Tags**: `gameplay`, `input`, `ui`
- **Effort**: 3 hours
- **Dependencies**: CORE-301
- **Status**: In Progress — Canvas overlay palette unified across HUD layers and inventory overlay integrated; audio feedback polish review remains.
- **Description**: Provide immediate feedback for player input (camera centering, movement easing, interaction prompts) so WASD/E produce visible results.
- **Acceptance Criteria**:
  - Camera centers on the player at start and follows smoothly during movement.
  - Interaction prompts (e.g., evidence collection, area entry) appear when the player enters the relevant zone.
  - Movement emits audio/log cues or UI feedback confirming action registration.

#### CORE-303: Investigative Loop Skeleton
- **Priority**: P1
- **Tags**: `gameplay`, `narrative`
- **Effort**: 6 hours
- **Dependencies**: CORE-301, CORE-302
- **Description**: Implement the minimal investigative loop—collect evidence, unlock Detective Vision, interview witness—to prove the hybrid narrative/mechanics hook.
- **Acceptance Criteria**:
  - Collecting three evidence items unlocks Detective Vision and advances tutorial/quest state.
  - Witness NPC interaction triggers dialogue from Act 1 and logs progression in the quest tracker.
- Quest log reflects these milestones, and world state updates are visible via overlays or UI.

---

### Session #33 Debug Overlay Instrumentation

#### DEBUG-210: UI overlay visibility diagnostics
- **Priority**: P1
- **Tags**: `ux`, `debug`, `engine`
- **Effort**: 2 hours
- **Dependencies**: Session #32 EventBus cleanup
- **Status**: ✅ Completed — Session #33 added overlay visibility summaries to the debug HUD and event logging.
- **Description**: Extend the developer-facing debug overlay so QA can see which HUD panels are active, along with contextual details drawn from the Game instance.
- **Acceptance Criteria**:
  - Debug overlay lists each major UI overlay (dialogue, tutorial, quest log, etc.) with open/closed state and contextual summary.
  - Snapshot data sourced via a dedicated `Game.getOverlayStateSnapshot()` utility.
  - Automated tests cover overlay visibility instrumentation to prevent regressions.

#### SYS-228: Knowledge gate component lookup stabilisation
- **Priority**: P1
- **Tags**: `engine`, `quest`, `narrative`
- **Effort**: 1.5 hours
- **Dependencies**: Investigation System player state
- **Status**: ✅ Completed — Session #33 migrated gate evaluation to `componentRegistry` and added regression coverage.
- **Description**: Ensure `KnowledgeProgressionSystem` queries gate entities correctly during event-triggered checks to avoid missed unlocks in the investigative loop.
- **Acceptance Criteria**:
  - `checkAllGates` handles both scheduled updates and event-driven refreshes without referencing stale `this.components`.
  - Event Bus emits `gate:unlocked` with position metadata when requirements are met.
  - Jest regression verifies gates unlock when triggered via `knowledge:learned` events.

---

### Session #34 Edge-Triggered Input Integration

#### INPUT-221: Deduction board toggle via InputState edges
- **Priority**: P1
- **Tags**: `engine`, `ux`, `input`
- **Effort**: 1.5 hours
- **Dependencies**: Session #33 overlay instrumentation
- **Status**: ✅ Completed — Session #34 routed `input:deductionBoard:pressed` through EventBus with single-fire semantics.
- **Description**: Replace raw keydown handling in DeductionSystem with `InputState.wasJustPressed`-backed events to prevent rapid open/close loops.
- **Acceptance Criteria**:
  - `InputState` emits action-specific events on edge transitions.
  - DeductionSystem subscribes to `input:deductionBoard:pressed` and no longer binds DOM-level listeners.
  - Jest regression ensures duplicative events are not emitted while holding Tab.

#### ENGINE-233: Input action event bus instrumentation
- **Priority**: P1
- **Tags**: `engine`, `input`, `test`
- **Effort**: 1 hour
- **Dependencies**: Controls.js edge-detection refactor
- **Status**: ✅ Completed — Session #34 extended `InputState` to broadcast `input:action_pressed` plus action-scoped topics with coverage.
- **Description**: Provide a universal event bus hook for edge-triggered actions so UI/state systems can listen for single-fire toggles without polling.
- **Acceptance Criteria**:
  - `InputState` emits both `input:action_pressed` and `input:{action}:pressed`.
  - Existing escape handling remains intact.
  - Jest suite verifies emissions occur once per key press.

#### DEBUG-212: Case & deduction overlay telemetry harmonisation
- **Priority**: P1
- **Tags**: `ux`, `debug`, `narrative`
- **Effort**: 1 hour
- **Dependencies**: Session #33 overlay helper
- **Status**: ✅ Completed — Session #34 wired CaseFileUI and DeductionBoard into the overlay helper and snapshot diagnostics.
- **Description**: Ensure narrative overlays emit standardized visibility events and appear in the debug HUD snapshot metadata.
- **Acceptance Criteria**:
  - CaseFileUI and DeductionBoard call `emitOverlayVisibility` with contextual metadata.
  - `Game.getOverlayStateSnapshot()` reports case/deduction state when instances are present.
  - UI-level Jest coverage verifies event payloads.

---

### Session #63 Cascade & Tutorial Telemetry

#### DEBUG-248: Cascade & Tutorial Telemetry Surfaces
- **Priority**: P1
- **Tags**: `debug`, `telemetry`, `faction`, `tutorial`
- **Effort**: 2 hours
- **Dependencies**: Session #62 WorldStateStore observability
- **Status**: ✅ Completed — Session #63 surfaced cascade and tutorial selectors through the debug overlay and SaveManager inspector with automated coverage.
- **Description**: Expose faction cascade summaries and tutorial prompt snapshots directly in the developer HUD and inspector tooling so QA can validate new telemetry without digging through devtools.
- **Acceptance Criteria**:
  - Debug overlay renders cascade summaries sourced from `WorldStateStore` selectors.
  - Debug overlay lists latest tutorial snapshot metadata and timeline entries.
  - `SaveManager.getInspectorSummary()` returns cascade and tutorial telemetry for console inspection.
  - Playwright smoke verifies cascade and tutorial telemetry render in the overlay.
  - Benchmark dispatch latency remains under the 0.25 ms guardrail.

---

### Session #36 Inventory Overlay Integration

#### UI-412: Neon noir overlay theme harmonisation
- **Priority**: P1
- **Tags**: `ux`, `ui`, `core`
- **Effort**: 2 hours
- **Dependencies**: CORE-302 palette review
- **Status**: ✅ Completed — Session #36 introduced `overlayTheme` to consolidate tutorial, prompt, movement indicator, and inventory styling.
- **Description**: Refactor canvas-based overlays to share the neon noir palette, typography, and spacing so HUD layers read coherently during manual QA sweeps.
- **Acceptance Criteria**:
  - TutorialOverlay, InteractionPromptOverlay, MovementIndicatorOverlay, and InventoryOverlay consume shared color/typography tokens.
  - Overlay padding and clamping respect global margins on all resolutions.
  - Palette aligns with debug HUD and manual CORE-302 review notes.

#### INV-301: Inventory overlay world-state integration
- **Priority**: P1
- **Tags**: `ui`, `inventory`, `world-state`
- **Effort**: 3 hours
- **Dependencies**: WorldStateStore event bus instrumentation
- **Status**: ✅ Completed — Session #36 seeded an inventory slice, toggled overlays via edge-triggered input, and exposed summaries through the debug HUD.
- **Description**: Surface operative inventory within the HUD, backed by WorldStateStore data and frame hooks so QA can verify evidence items during the Hollow Case tutorial.
- **Acceptance Criteria**:
  - `inventory:*` EventBus actions populate WorldStateStore and SaveManager snapshots.
  - `input:inventory:pressed` toggles the InventoryOverlay once per key edge and updates debug overlay listings.
  - Inventory overlay lists seeded items with navigation via move inputs and highlights equipped slots.

#### INV-302: Replace seeded inventory with live acquisition events
- **Priority**: P2
- **Tags**: `inventory`, `quest`, `save`
- **Effort**: 4 hours
- **Dependencies**: INV-301
- **Status**: ✅ Completed — Session #37 routed evidence pickups, quest rewards, and vendor transactions through inventory events.
- **Description**: Removed bootstrap seeding and now drive inventory from evidence pickups, quest rewards, and NPC trades so the overlay reflects real player progress.
- **Acceptance Criteria**:
  - Evidence collection, quest rewards, and faction vendors emit `inventory:item_added` with metadata tags.
  - Save/load round-trips preserve inventory and equipment slots.
  - Debug HUD summary reflects live counts without relying on `seedInventoryState`.

#### INV-303: Implement vendor trade EventBus emitters
- **Priority**: P2
- **Tags**: `inventory`, `vendor`, `economy`
- **Effort**: 3 hours
- **Dependencies**: INV-302
- **Status**: ✅ Completed — Session #38 wired vendor transactions into `economy:purchase:completed` payloads feeding inventory autosaves.
- **Description**: Emit normalized `economy:purchase:completed` events when faction vendors transact so inventory updates and SaveManager metadata reflect vendor interactions.
- **Acceptance Criteria**:
  - Vendor/NPC trade logic dispatches a single `economy:purchase:completed` event with item descriptors, cost payload, vendor metadata, and optional faction alignment.
  - Inventory overlay and debug HUD update immediately when purchases complete; SaveManager captures vendor metadata in snapshots.
  - Jest coverage asserts event emission and inventory updates for at least one vendor scenario.

#### INV-304: Establish black market vendor branch and UI telemetry
- **Priority**: P1
- **Tags**: `inventory`, `vendor`, `dialogue`, `narrative`, `ui`
- **Effort**: 4 hours
- **Dependencies**: INV-303, DIA-208
- **Status**: ✅ Completed — Session #39 added the Black Market Broker dialogue tree, vendor purchase metadata surfaced in InventoryOverlay, and follow-on tests for dialogue consequence events.
- **Description**: Introduce an Act 1 black market vendor that trades memory parlor intel, ensure dialogue gating draws from live inventory currency, and surface vendor acquisition metadata inside the inventory UI for QA traceability.
- **Acceptance Criteria**:
  - New dialogue tree exposes purchase and trade branches using normalized `vendorTransaction` consequences plus knowledge events.
  - Act 1 scene spawns the broker NPC with interaction prompts and quest objective hooks for optional leads.
  - Inventory overlay highlights vendor-sourced items with vendor, cost, and timestamp details; Jest coverage verifies output.
  - DialogueSystem supports declarative consequence events and currency-aware conditions (`hasCurrency`, `notHasCurrency`).

#### INV-318: Add Cipher quartermaster vendor for parlor infiltration
- **Priority**: P1
- **Tags**: `inventory`, `vendor`, `narrative`, `quest`
- **Effort**: 4 hours
- **Dependencies**: INV-304, DIA-208
- **Status**: ✅ Completed — Session #40 introduced the Cipher Collective quartermaster with scrambler gear, updated Act 1 quests, and automated vendor smoke coverage.
- **Description**: Extend the vendor roster with a Cipher Collective contact who trades infiltration gear, tie the acquisition into optional Act 1 progression, and ensure metadata feeds the shared vendor pipeline.
- **Acceptance Criteria**:
  - New `cipher_quartermaster` dialogue tree exposes currency and trade branches using `hasCurrency` conditions plus vendor transactions that emit knowledge events.
  - Act 1 scene spawns the quartermaster NPC and the Hollow Case quest logs an optional objective when `cipher_scrambler_access` knowledge fires.
  - Jest/Playwright coverage validates the vendor metadata (tags, costs, dialogue context) and ensures credits are deducted through the shared pipeline.
- **Notes**: Session #41 extended this deliverable with `FirewallScramblerSystem`, adding active scrambler gating to Memory Parlor infiltration and synchronized disguise detection modifiers.

#### SCN-410: Expand Memory Parlor infiltration scene
- **Priority**: P1
- **Tags**: `scene`, `stealth`, `quest`
- **Effort**: 5 hours
- **Dependencies**: INV-318, QA-245
- **Status**: ✅ Completed — Session #43 delivered full traversal polish, quest handoff, and automated coverage.
- **Description**: Build out the Memory Parlor infiltration scene introduced in Session #42 with full geometry, quest-driven scene transitions, and exit routing so the scrambler window can be exercised end-to-end.
- **Acceptance Criteria**:
  - `loadMemoryParlorScene()` is triggered automatically when `obj_locate_parlor` completes and returns to Act 1 on `obj_escape_parlor`.
  - Firewall barrier integrates with level collision paths so scrambler activation is required to cross.
  - Interior provides stealth cover (props, line-of-sight blockers) and at least one evidence/knowledge pickup to justify infiltration.
  - Playwright infiltration spec passes without forcing the scene load manually.
  - Manual runtime smoke confirms quest tracker, disguise modifiers, and dialogue hooks behave in the new scene.
- **Notes**: Session #43 added stealth cover geometry, intel pickups (including the client registry knowledge hook), automatic return to Act 1 on escape, and extended Playwright coverage that exercises evidence collection through the quest exit. Session #45 layered in neon detection halos, guard prompt telemetry, and ambient lighting; bespoke Memory Parlor art/audio assets remain outstanding.

#### DIA-208: Support inventory-aware dialogue conditions
- **Priority**: P1
- **Tags**: `dialogue`, `inventory`
- **Effort**: 3 hours
- **Dependencies**: INV-302
- **Status**: ✅ Completed — Session #38 added inventory-aware condition evaluation and vendor consequence wiring in DialogueSystem.
- **Description**: Evaluate dialogue choice conditions such as `hasItem` and `removeItem` objects against WorldStateStore inventory data so bribe paths and item gates respond to live inventory.
- **Acceptance Criteria**:
  - DialogueTree condition evaluation supports object-form conditions (`{ type: 'hasItem', item: 'credits', amount: 50 }`) and integrates with WorldStateStore selectors.
  - Dialogue consequence handlers adjust inventory quantities or removals using the updated condition schema and emit resulting events.
  - Jest coverage verifies `hasItem` gating and credit removal for Street Vendor bribe dialogue.

#### QA-245: Debug overlay inventory smoke
- **Priority**: P1
- **Tags**: `test`, `playwright`, `ui`
- **Effort**: 1 hour
- **Dependencies**: INV-301, UI-412
- **Status**: ✅ Completed — Session #36 added Playwright coverage ensuring debug overlay rows mirror inventory visibility and summaries.
- **Description**: Extend existing Playwright suite to assert inventory listings appear in debug HUD and update when the overlay opens, preventing regressions to QA tooling.
- **Acceptance Criteria**:
  - Playwright test loads the game, opens the debug overlay, and confirms inventory rows list item counts.
  - Toggling inventory overlay flips the debug overlay `data-visible` flag.
  - Test asserts no console errors while exercising the scene.

#### PERF-214: Restore profiling harness entry point
- **Priority**: P1
- **Tags**: `perf`, `tooling`
- **Effort**: 1 hour
- **Dependencies**: None
- **Status**: ✅ Completed — Session #40 restored the profiling harness by pointing `npm run profile` at `benchmark.js` and updating benchmark component wiring to the current ECS APIs.
- **Description**: Recreate or relink the Node profiling entry point so `npm run profile` executes without module errors and captures frame timing under economy flows.
- **Acceptance Criteria**:
  - `npm run profile` runs without module-not-found failures on CI and local machines.
  - Profiling script loads representative scenes (vendor transactions + dialogue gating) and outputs V8 log for inspection.
  - Documentation updated with usage instructions and expected output location.
  - Latest run captures vendor purchase scenarios and writes JSON summaries under `benchmark-results/`.

---

## Sprint 1: Core Engine Foundation (Weeks 1-3)

**Milestone**: M1 - Core Engine
**Duration**: 3 weeks
**Goal**: Implement robust ECS foundation supporting all gameplay systems
**Success Criteria**: 60 FPS with 500 entities, >80% test coverage, zero memory leaks

### Week 1: ECS Core Implementation

#### M1-001: Project Infrastructure Setup
- **Priority**: P0
- **Tags**: `engine`, `test`, `docs`
- **Effort**: 2 hours
- **Dependencies**: None
- **Description**: Initialize development environment and build pipeline
- **Tasks**:
  - Initialize Vite build configuration
  - Configure ESLint and Prettier
  - Set up Jest testing framework with coverage reporting
  - Create initial file structure per CLAUDE.md
  - Configure Git hooks for pre-commit linting
- **Acceptance Criteria**:
  - `npm run dev` starts development server
  - `npm run test` runs Jest tests
  - `npm run lint` catches style violations
  - Project structure matches CLAUDE.md specification
  - Build completes in <5s

#### M1-002: EntityManager Implementation
- **Priority**: P0
- **Tags**: `engine`, `ecs`
- **Effort**: 4 hours
- **Dependencies**: M1-001
- **Description**: Core entity lifecycle management system
- **Files**:
  - `src/engine/ecs/EntityManager.js`
  - `tests/engine/ecs/EntityManager.test.js`
- **Implementation Requirements**:
  - Create/destroy entities with unique IDs
  - Entity pooling for performance
  - Active/inactive entity tracking
  - Entity query support (by component)
  - Batch operations (destroyAll, etc.)
- **Acceptance Criteria**:
  - Create 10,000 entities in <100ms
  - Destroy 10,000 entities in <50ms
  - Zero memory leaks after 1000 create/destroy cycles
  - Entity IDs never collide
  - Unit tests pass with >80% coverage

#### M1-003: ComponentRegistry Implementation
- **Priority**: P0
- **Tags**: `engine`, `ecs`
- **Effort**: 6 hours
- **Dependencies**: M1-002
- **Description**: Component storage and query system
- **Files**:
  - `src/engine/ecs/ComponentRegistry.js`
  - `tests/engine/ecs/ComponentRegistry.test.js`
- **Implementation Requirements**:
  - Store components by type in separate arrays
  - Add/remove/get components by entity ID
  - Query entities by component signature (smallest-set optimization)
  - Component type registration
  - Hot-path optimization (Map for lookups)
- **Acceptance Criteria**:
  - Component queries execute in <1ms for 1000 entities
  - Add component in O(1) time
  - Query optimization reduces checks by >80%
  - No memory leaks when removing components
  - Unit tests pass with >80% coverage

#### M1-004: SystemManager Implementation
- **Priority**: P0
- **Tags**: `engine`, `ecs`
- **Effort**: 4 hours
- **Dependencies**: M1-002, M1-003
- **Description**: System orchestration and update loop
- **Files**:
  - `src/engine/ecs/SystemManager.js`
  - `src/engine/ecs/System.js` (base class)
  - `tests/engine/ecs/SystemManager.test.js`
- **Implementation Requirements**:
  - Register systems with priority
  - Update systems in priority order
  - System lifecycle (init, update, cleanup)
  - Delta time tracking
  - System enable/disable support
- **Acceptance Criteria**:
  - Systems execute in correct priority order
  - System updates maintain 60 FPS with 500 entities
  - Delta time accurate to ±2ms
  - Systems can be added/removed at runtime
  - Unit tests pass with >80% coverage

#### M1-005: ECS Integration Tests
- **Priority**: P1
- **Tags**: `test`, `ecs`
- **Effort**: 3 hours
- **Dependencies**: M1-002, M1-003, M1-004
- **Description**: Integration tests for full ECS pipeline
- **Files**:
  - `tests/engine/ecs/integration.test.js`
- **Test Scenarios**:
  - Create 1000 entities with 3 components each
  - Systems process entities correctly
  - Component queries return correct results
  - Entity destruction removes all components
  - No memory leaks over 1000 iterations
- **Acceptance Criteria**:
  - All integration tests pass
  - Performance benchmarks meet targets
  - Memory usage stable (<100MB)
  - Code coverage >80% for ECS module

#### M1-006: ECS Documentation
- **Priority**: P2
- **Tags**: `docs`, `ecs`
- **Effort**: 2 hours
- **Dependencies**: M1-002, M1-003, M1-004
- **Description**: JSDoc and usage examples for ECS
- **Files**:
  - JSDoc comments in ECS source files
  - `docs/engine/ecs-usage.md` (usage guide)
- **Content**:
  - API documentation for all public methods
  - Component creation examples
  - System implementation examples
  - Performance best practices
  - Common patterns and anti-patterns
- **Acceptance Criteria**:
  - All public APIs documented with JSDoc
  - Usage guide complete with runnable examples
  - Architecture decisions explained

### Week 2: Rendering and Physics

#### M1-007: Canvas Setup and Renderer Core
- **Priority**: P0
- **Tags**: `engine`, `rendering`
- **Effort**: 3 hours
- **Dependencies**: M1-001
- **Description**: Canvas initialization and core rendering infrastructure
- **Files**:
  - `src/engine/renderer/Renderer.js`
  - `tests/engine/renderer/Renderer.test.js`
- **Implementation Requirements**:
  - Canvas creation and sizing (responsive)
  - Rendering context management (2D)
  - Clear and present operations
  - Background color support
  - Frame timing tracking
- **Acceptance Criteria**:
  - Canvas resizes with window
  - 60 FPS maintained with empty canvas
  - Context operations error-free
  - Frame time tracked accurately

#### M1-008: Camera System Implementation
- **Priority**: P0
- **Tags**: `engine`, `rendering`
- **Effort**: 4 hours
- **Dependencies**: M1-007
- **Description**: Viewport and camera controls
- **Files**:
  - `src/engine/renderer/Camera.js`
  - `tests/engine/renderer/Camera.test.js`
- **Implementation Requirements**:
  - Camera position and zoom
  - World-to-screen coordinate conversion
  - Screen-to-world coordinate conversion
  - Camera bounds and limits
  - Smooth following (lerp-based)
- **Acceptance Criteria**:
  - Coordinate conversion accurate to 1px
  - Smooth camera follow (no jitter)
  - Zoom operations smooth
  - Camera bounds enforced correctly
  - Unit tests pass with >80% coverage

#### M1-009: Layered Renderer Implementation
- **Priority**: P1
- **Tags**: `engine`, `rendering`
- **Effort**: 5 hours
- **Dependencies**: M1-007, M1-008
- **Description**: Multi-layer canvas rendering system
- **Files**:
  - `src/engine/renderer/LayeredRenderer.js`
  - `tests/engine/renderer/LayeredRenderer.test.js`
- **Implementation Requirements**:
  - Multiple canvas layers (background, game, UI)
  - Layer z-index management
  - Per-layer rendering
  - Layer visibility toggle
  - Compositing performance
- **Acceptance Criteria**:
  - 3 layers render correctly
  - Layer ordering correct
  - Compositing completes in <1ms
  - No visual artifacts
  - Performance impact <5% vs single canvas

#### M1-010: Dirty Rectangle Optimization
- **Priority**: P2
- **Tags**: `engine`, `rendering`, `perf`
- **Effort**: 4 hours
- **Dependencies**: M1-009
- **Description**: Dirty rectangle system for partial redraws
- **Files**:
  - `src/engine/renderer/DirtyRectManager.js`
  - `tests/engine/renderer/DirtyRectManager.test.js`
- **Implementation Requirements**:
  - Track dirty regions per frame
  - Merge overlapping rectangles
  - Clear only dirty regions
  - Full redraw fallback
  - Performance metrics
- **Acceptance Criteria**:
  - Dirty rect reduces redraws by >60%
  - No visual artifacts (no "uncleared" areas)
  - Merge algorithm efficient (<0.5ms)
  - Fallback works when dirty area >50% of screen

#### M1-011: RenderSystem (ECS Integration)
- **Priority**: P1
- **Tags**: `engine`, `rendering`, `ecs`
- **Effort**: 5 hours
- **Dependencies**: M1-004, M1-009
- **Description**: ECS system for rendering entities
- **Files**:
  - `src/engine/renderer/RenderSystem.js`
  - `src/engine/components/Transform.js`
  - `src/engine/components/Sprite.js`
  - `tests/engine/renderer/RenderSystem.test.js`
- **Implementation Requirements**:
  - Query entities with Transform + Sprite
  - Sort by z-index
  - Viewport culling (don't render off-screen)
  - Render sprites to canvas
  - Performance profiling hooks
- **Acceptance Criteria**:
  - 60 FPS with 1000 visible sprites
  - Viewport culling excludes off-screen entities
  - Z-sorting correct
  - Drawing completes in <8ms
  - Unit tests pass

#### M1-012: Spatial Hash Implementation
- **Priority**: P0
- **Tags**: `engine`, `physics`
- **Effort**: 5 hours
- **Dependencies**: M1-003
- **Description**: Spatial partitioning for collision detection
- **Files**:
  - `src/engine/physics/SpatialHash.js`
  - `tests/engine/physics/SpatialHash.test.js`
- **Implementation Requirements**:
  - Grid-based spatial hash
  - Insert/remove/query operations
  - Configurable cell size
  - Query by bounding box
  - Performance optimization (Set-based)
- **Acceptance Criteria**:
  - O(n) collision detection (not O(n²))
  - 1000 entities = <1000 collision checks per frame
  - 98%+ reduction vs naive approach
  - Unit tests pass with >80% coverage

#### M1-013: Collision Detection Algorithms
- **Priority**: P0
- **Tags**: `engine`, `physics`
- **Effort**: 4 hours
- **Dependencies**: M1-012
- **Description**: AABB and circle collision algorithms
- **Files**:
  - `src/engine/physics/collisionDetectors.js`
  - `tests/engine/physics/collisionDetectors.test.js`
- **Implementation Requirements**:
  - AABB vs AABB collision
  - Circle vs Circle collision
  - AABB vs Circle collision
  - Collision normal calculation
  - Penetration depth calculation
- **Acceptance Criteria**:
  - All collision types accurate
  - No false positives/negatives
  - Normal vectors correct direction
  - Penetration depth within 0.1px
  - Unit tests comprehensive

#### M1-014: CollisionSystem Implementation
- **Priority**: P1
- **Tags**: `engine`, `physics`, `ecs`
- **Effort**: 6 hours
- **Dependencies**: M1-004, M1-012, M1-013
- **Description**: ECS system for collision detection and resolution
- **Files**:
  - `src/engine/physics/CollisionSystem.js`
  - `src/engine/components/Collider.js`
  - `tests/engine/physics/CollisionSystem.test.js`
- **Implementation Requirements**:
  - Broad phase (spatial hash)
  - Narrow phase (collision algorithms)
  - Collision event emission
  - Layer-based filtering
  - Collision resolution (separate or integrate)
- **Acceptance Criteria**:
  - 1000 entities with <1000 checks per frame
  - Collision events fire correctly
  - Layer filtering works
  - No tunneling at normal velocities
  - 60 FPS maintained with 500 dynamic entities

#### M1-015: MovementSystem Implementation
- **Priority**: P1
- **Tags**: `engine`, `physics`, `ecs`
- **Effort**: 3 hours
- **Dependencies**: M1-004, M1-014
- **Description**: Entity movement and velocity integration
- **Files**:
  - `src/engine/physics/MovementSystem.js`
  - `src/engine/components/Velocity.js`
  - `tests/engine/physics/MovementSystem.test.js`
- **Implementation Requirements**:
  - Apply velocity to transform
  - Delta time integration
  - Friction/damping support
  - Acceleration support
  - Max velocity clamping
- **Acceptance Criteria**:
  - Movement smooth and frame-rate independent
  - Friction works correctly
  - Max velocity enforced
  - Unit tests pass

#### M1-016: Physics Integration Tests
- **Priority**: P1
- **Tags**: `test`, `physics`
- **Effort**: 3 hours
- **Dependencies**: M1-014, M1-015
- **Description**: Integration tests for physics pipeline
- **Files**:
  - `tests/engine/physics/integration.test.js`
- **Test Scenarios**:
  - Moving entities collide correctly
  - Collision resolution prevents overlap
  - Spatial hash updates with entity movement
  - No tunneling at tested velocities
  - Performance targets met
- **Acceptance Criteria**:
  - All integration tests pass
  - Collision pipeline stable
  - Performance benchmarks met

### Week 3: Event Bus, Assets, and Integration

#### M1-017: EventBus Core Implementation
- **Priority**: P0
- **Tags**: `engine`
- **Effort**: 4 hours
- **Dependencies**: M1-001
- **Description**: Pub/sub event system
- **Files**:
  - `src/engine/events/EventBus.js`
  - `tests/engine/events/EventBus.test.js`
- **Implementation Requirements**:
  - Subscribe/unsubscribe to events
  - Emit events with data
  - Wildcard subscriptions (e.g., 'entity:*')
  - Priority-based handler execution
  - One-time subscriptions (once)
- **Acceptance Criteria**:
  - Event dispatch <0.1ms per event
  - No memory leaks with subscribe/unsubscribe
  - Priority order enforced
  - Wildcard subscriptions work
  - Unit tests pass with >80% coverage

#### M1-018: EventQueue Implementation
- **Priority**: P1
- **Tags**: `engine`
- **Effort**: 3 hours
- **Dependencies**: M1-017
- **Description**: Deferred event processing
- **Files**:
  - `src/engine/events/EventQueue.js`
  - `tests/engine/events/EventQueue.test.js`
- **Implementation Requirements**:
  - Queue events for later processing
  - Process queue at defined intervals
  - Priority queue support
  - Batch processing
  - Queue overflow handling
- **Acceptance Criteria**:
  - Events process in correct order
  - Priority queue ordering correct
  - Batch processing efficient
  - No dropped events under load

#### M1-019: Event Naming Convention Documentation
- **Priority**: P2
- **Tags**: `docs`
- **Effort**: 1 hour
- **Dependencies**: M1-017
- **Description**: Document event naming standards
- **Files**:
  - `docs/engine/event-conventions.md`
- **Content**:
  - Naming format: 'domain:action'
  - Standard event domains
  - Standard event actions
  - Event data payload structures
  - Examples for each system
- **Acceptance Criteria**:
  - Comprehensive event list documented
  - Examples provided for all domains
  - Usage patterns clear

#### M1-020: AssetLoader Implementation
- **Priority**: P0
- **Tags**: `engine`, `asset`
- **Effort**: 4 hours
- **Dependencies**: M1-001
- **Description**: File loading utilities
- **Files**:
  - `src/engine/assets/AssetLoader.js`
  - `tests/engine/assets/AssetLoader.test.js`
- **Implementation Requirements**:
  - Load images (PNG, JPEG)
  - Load JSON data
  - Load audio files (MP3, OGG)
  - Promise-based API
  - Error handling and retries
- **Acceptance Criteria**:
  - All file types load correctly
  - Failed loads throw descriptive errors
  - Retry logic works (max 3 attempts)
  - Unit tests mock file loading

#### M1-021: AssetManager Implementation
- **Priority**: P0
- **Tags**: `engine`, `asset`
- **Effort**: 5 hours
- **Dependencies**: M1-020
- **Description**: Asset loading and caching system
- **Files**:
  - `src/engine/assets/AssetManager.js`
  - `tests/engine/assets/AssetManager.test.js`
- **Implementation Requirements**:
  - Asset registry (by key)
  - Reference counting
  - Lazy loading support
  - Asset preloading by group
  - Unload unused assets
- **Acceptance Criteria**:
  - Critical assets load in <3s
  - District assets load in <1s
  - Reference counting prevents premature unload
  - Lazy loading reduces initial memory by >60%
  - Unit tests pass

#### M1-022: Asset Priority System
- **Priority**: P2
- **Tags**: `asset`, `perf`
- **Effort**: 2 hours
- **Dependencies**: M1-021
- **Description**: Priority-based asset loading
- **Files**:
  - Update `AssetManager.js` with priority queues
- **Implementation Requirements**:
  - Three priority tiers (Critical, District, Optional)
  - Load higher priority first
  - Background loading for optional assets
  - Progress tracking per tier
- **Acceptance Criteria**:
  - Critical assets load first
  - District assets load next
  - Optional assets don't block gameplay
  - Progress events emit correctly

#### M1-023: Game Loop Implementation
- **Priority**: P0
- **Tags**: `engine`
- **Effort**: 4 hours
- **Dependencies**: M1-004, M1-017
- **Description**: Core game loop with fixed timestep
- **Files**:
  - `src/engine/GameLoop.js`
  - `tests/engine/GameLoop.test.js`
- **Implementation Requirements**:
  - requestAnimationFrame loop
  - Fixed timestep (60 FPS target)
  - Delta time calculation
  - System update orchestration
  - Pause/resume support
- **Acceptance Criteria**:
  - Loop runs at 60 FPS
  - Frame time tracked accurately
  - Pause/resume works correctly
  - Systems update in correct order

#### M1-024: Full Engine Integration Test
- **Priority**: P1
- **Tags**: `test`, `engine`
- **Effort**: 4 hours
- **Dependencies**: M1-023 (all M1 core tasks)
- **Description**: End-to-end engine test
- **Files**:
  - `tests/engine/integration-full.test.js`
- **Test Scenarios**:
  - Create game with all systems
  - Spawn 500 entities with Transform, Sprite, Velocity, Collider
  - Run for 1000 frames
  - Measure performance (FPS, memory, GC)
  - Verify no memory leaks
  - Verify 60 FPS maintained
- **Acceptance Criteria**:
  - All systems integrate correctly
  - 60 FPS maintained (avg >58 FPS)
  - Memory stable (<100MB)
  - No GC pauses >10ms
  - Zero memory leaks

#### M1-025: Engine Performance Profiling
- **Priority**: P1
- **Tags**: `perf`, `test`
- **Effort**: 3 hours
- **Dependencies**: M1-024
- **Description**: Comprehensive performance profiling
- **Tasks**:
  - Profile with Chrome DevTools
  - Identify hotspots (>10% frame time)
  - Memory profiling (heap snapshots)
  - GC pause analysis
  - Document findings and optimization opportunities
- **Acceptance Criteria**:
  - Profiling report created (`docs/performance/m1-profile.md`)
  - Hotspots identified and documented
  - Optimization opportunities prioritized
  - Baseline performance metrics recorded

#### M1-026: Engine Documentation Pass
- **Priority**: P2
- **Tags**: `docs`
- **Effort**: 3 hours
- **Dependencies**: M1-024
- **Description**: Complete engine documentation
- **Files**:
  - `docs/engine/architecture.md`
  - `docs/engine/getting-started.md`
  - README updates
- **Content**:
  - Architecture overview with diagrams
  - Component/System creation guides
  - Performance best practices
  - Common patterns
  - Troubleshooting guide
- **Acceptance Criteria**:
  - Architecture document complete
  - Getting started guide allows new developers to contribute
  - All public APIs documented

#### M1-027: Code Quality Pass
- **Priority**: P2
- **Tags**: `refactor`
- **Effort**: 4 hours
- **Dependencies**: M1-024
- **Description**: Code review and cleanup
- **Tasks**:
  - Remove commented-out code
  - Ensure consistent formatting
  - Add missing JSDoc comments
  - Refactor any complex functions (>50 lines)
  - Fix linting warnings
- **Acceptance Criteria**:
  - Zero ESLint warnings
  - All public APIs have JSDoc
  - No commented-out code
  - Functions <50 lines each
  - Files <300 lines each

---

## Sprint 2: Investigation Mechanics (Weeks 4-6)

**Milestone**: M2 - Investigation
**Duration**: 3 weeks
**Goal**: Implement core detective gameplay loop
**Success Criteria**: Tutorial case completable by >80% of playtesters, deduction board usable, 60 FPS maintained

### Week 4: Evidence Collection and Deduction Board

#### M2-001: Investigation Component and System
- **Priority**: P0
- **Tags**: `gameplay`, `investigation`, `ecs`
- **Effort**: 4 hours
- **Dependencies**: M1-004
- **Description**: Core investigation mechanics
- **Files**:
  - `src/game/components/Investigation.js`
  - `src/game/components/Evidence.js`
  - `src/game/systems/InvestigationSystem.js`
  - `tests/game/systems/InvestigationSystem.test.js`
- **Implementation Requirements**:
  - Investigation component (detection radius, ability level)
  - Evidence component (type, description, metadata)
  - Evidence detection (proximity-based)
  - Evidence collection interaction
  - Evidence added to case file
- **Acceptance Criteria**:
  - Evidence appears on screen
  - Player can collect evidence
  - Evidence stored with metadata
  - Unit tests pass

#### M2-002: Detective Vision Ability
- **Priority**: P1
- **Tags**: `gameplay`, `investigation`
- **Effort**: 5 hours
- **Dependencies**: M2-001, M1-011
- **Description**: Special vision mode highlighting evidence
- **Files**:
  - `src/game/abilities/DetectiveVision.js`
  - `src/game/systems/DetectiveVisionSystem.js`
  - Visual overlay rendering
- **Implementation Requirements**:
  - Toggle ability on/off
  - Visual highlighting of evidence entities
  - Hidden evidence becomes visible
  - Energy cost and cooldown
  - Performance impact <1ms per frame
- **Acceptance Criteria**:
  - Detective vision reveals hidden evidence
  - Visual effects clear and performant
  - Energy drain balanced
  - No performance degradation

#### M2-003: Evidence Entity Factory
- **Priority**: P1
- **Tags**: `gameplay`, `investigation`
- **Effort**: 3 hours
- **Dependencies**: M2-001
- **Description**: Create evidence entities easily
- **Files**:
  - `src/game/entities/Evidence.js`
  - `tests/game/entities/Evidence.test.js`
- **Implementation Requirements**:
  - Factory function for evidence creation
  - Evidence types (physical, digital, testimonial, forensic)
  - Randomized visual variations
  - Metadata attachment
  - Hidden vs visible evidence
- **Acceptance Criteria**:
  - Evidence entities created easily
  - All evidence types supported
  - Metadata correctly attached
  - Unit tests pass

#### M2-004: Case File Manager
- **Priority**: P0
- **Tags**: `gameplay`, `investigation`
- **Effort**: 4 hours
- **Dependencies**: M2-001
- **Description**: Case management system
- **Files**:
  - `src/game/managers/CaseManager.js`
  - `tests/game/managers/CaseManager.test.js`
- **Implementation Requirements**:
  - Create/manage cases
  - Add evidence to cases
  - Derive clues from evidence
  - Case objective tracking
  - Case completion detection
- **Acceptance Criteria**:
  - Cases created and tracked
  - Evidence organized by case
  - Clues derived correctly
  - Objectives update correctly

#### M2-005: Deduction Board UI (Basic)
- **Priority**: P1
- **Tags**: `gameplay`, `investigation`, `ux`
- **Effort**: 8 hours
- **Dependencies**: M2-004
- **Description**: Interactive clue connection interface
- **Files**:
  - `src/game/ui/DeductionBoard.js`
  - `src/game/ui/ClueNode.js`
  - CSS styling
- **Implementation Requirements**:
  - Canvas-based or DOM-based UI
  - Display clues as nodes
  - Drag-and-drop connections
  - Connection lines visualization
  - Node hovering/selection
- **Acceptance Criteria**:
  - Clues displayed clearly
  - Drag-and-drop works smoothly
  - Connections visualized
  - UI responsive (<16ms input lag)

#### M2-006: Deduction System and Theory Validation
- **Priority**: P0
- **Tags**: `gameplay`, `investigation`
- **Effort**: 6 hours
- **Dependencies**: M2-005
- **Description**: Theory validation logic
- **Files**:
  - `src/game/systems/DeductionSystem.js`
  - `src/game/data/TheoryValidator.js`
  - `tests/game/systems/DeductionSystem.test.js`
- **Implementation Requirements**:
  - Graph-based theory structure
  - Connection validation (supports, contradicts)
  - Theory accuracy calculation (0.0-1.0)
  - Multiple valid solutions support
  - Hint system for stuck players
- **Acceptance Criteria**:
  - Valid connections accepted
  - Invalid connections rejected
  - Theory accuracy calculated correctly
  - Correct theories trigger progression
  - Unit tests cover edge cases

#### M2-007: Deduction Board Polish
- **Priority**: P2
- **Tags**: `ux`, `investigation`
- **Effort**: 4 hours
- **Dependencies**: M2-006
- **Description**: Polish deduction board UX
- **Tasks**:
  - Visual feedback (connection highlighting)
  - Sound effects (connection snap, validation)
  - Tutorial tooltips
  - Undo/redo support
  - Save board state
- **Acceptance Criteria**:
  - Visual feedback clear
  - Tooltips help new players
  - Undo/redo works
  - Board state persists

### Week 5: Forensic Analysis and Minigames

#### M2-008: Forensic System Core
- **Priority**: P1
- **Tags**: `gameplay`, `investigation`
- **Effort**: 4 hours
- **Dependencies**: M2-001
- **Description**: Forensic examination mechanics
- **Files**:
  - `src/game/systems/ForensicSystem.js`
  - `tests/game/systems/ForensicSystem.test.js`
- **Implementation Requirements**:
  - Forensic tool types (fingerprint, document, memory trace)
  - Evidence analysis pipeline
  - Success/failure mechanics
  - Hidden clue revelation
  - Skill-based difficulty
- **Acceptance Criteria**:
  - Forensic tools work correctly
  - Analysis reveals hidden clues
  - Difficulty scales appropriately

#### M2-009: Fingerprint Matching Minigame
- **Priority**: P1
- **Tags**: `gameplay`, `investigation`, `ux`
- **Effort**: 6 hours
- **Dependencies**: M2-008
- **Description**: Match fingerprints to database
- **Files**:
  - `src/game/ui/ForensicMinigame.js`
  - `src/game/minigames/FingerprintMatching.js`
- **Implementation Requirements**:
  - Display partial fingerprint
  - Display 3-5 candidate matches
  - Highlight matching features
  - Time limit (optional, based on difficulty)
  - Success/failure outcomes
- **Acceptance Criteria**:
  - Minigame intuitive and engaging
  - Completion time <2 minutes
  - Success grants meaningful reward
  - Failure not punishing (can retry)

#### M2-010: Document Reconstruction Minigame
- **Priority**: P2
- **Tags**: `gameplay`, `investigation`, `ux`
- **Effort**: 6 hours
- **Dependencies**: M2-008
- **Description**: Piece together shredded documents
- **Files**:
  - `src/game/minigames/DocumentReconstruction.js`
- **Implementation Requirements**:
  - Display shredded pieces
  - Drag-and-drop assembly
  - Rotation support
  - Edge matching detection
  - Partial completion credit
- **Acceptance Criteria**:
  - Puzzle solvable in <3 minutes
  - Intuitive controls
  - Partial solutions give partial info
  - Satisfying completion feedback

#### M2-011: Memory Trace Minigame (Prototype)
- **Priority**: P2
- **Tags**: `gameplay`, `investigation`, `narrative`
- **Effort**: 6 hours
- **Dependencies**: M2-008
- **Description**: Extract fragmented memories
- **Files**:
  - `src/game/minigames/MemoryTrace.js`
- **Implementation Requirements**:
  - Display memory fragments (images, text)
  - Sequence fragments in timeline
  - Emotional tone indicators
  - Success reveals story clues
  - Ties into narrative progression
- **Acceptance Criteria**:
  - Minigame thematically appropriate
  - Reveals narrative information
  - Completion time <3 minutes
  - Emotionally engaging

#### M2-012: Forensic Minigame Integration
- **Priority**: P1
- **Tags**: `gameplay`, `investigation`
- **Effort**: 3 hours
- **Dependencies**: M2-009, M2-010, M2-011
- **Description**: Integrate minigames into investigation flow
- **Tasks**:
  - Trigger minigames from evidence examination
  - Pass results to case file
  - Update objectives on minigame completion
  - Track minigame performance (for stats)
- **Acceptance Criteria**:
  - Minigames launch correctly
  - Results integrated into case
  - Progression unlocked on success

### Week 6: Tutorial Case and Case Management

#### M2-013: Tutorial Case Data Structure
- **Priority**: P0
- **Tags**: `narrative`, `investigation`
- **Effort**: 5 hours
- **Dependencies**: M2-004, narrative team input
- **Description**: "The Hollow Case" tutorial case
- **Files**:
  - `src/game/data/cases/tutorialCase.js`
- **Implementation Requirements**:
  - Case definition (objectives, evidence, clues, theory)
  - Evidence placement data
  - NPC dialogue data (witness interviews)
  - Theory graph (correct solution)
  - Tutorial hints and guidance
- **Acceptance Criteria**:
  - Complete case data defined
  - Matches Act 1 M1.1 quest spec
  - Theory graph solvable
  - Tutorial hints helpful

#### M2-014: Case File UI
- **Priority**: P1
- **Tags**: `ux`, `investigation`
- **Effort**: 6 hours
- **Dependencies**: M2-004
- **Description**: Case file interface
- **Files**:
  - `src/game/ui/CaseFileUI.js`
  - CSS styling
- **Implementation Requirements**:
  - Display active case details
  - List objectives (completed/active)
  - Show collected evidence
  - Display derived clues
  - Case completion indicator
- **Acceptance Criteria**:
  - UI clear and organized
  - Updates in real-time
  - Easy to navigate
  - Mobile-friendly layout

#### M2-015: Tutorial Sequence Implementation
- **Priority**: P1
- **Tags**: `gameplay`, `ux`, `narrative`
- **Effort**: 6 hours
- **Dependencies**: M2-013, M2-001, M2-005
- **Description**: Guided tutorial for investigation mechanics
- **Files**:
  - `src/game/systems/TutorialSystem.js`
  - Tutorial prompts and overlays
- **Implementation Requirements**:
  - Step-by-step guidance
  - Contextual tooltips
  - Objective highlighting
  - Can be skipped (for replay)
  - Tracks tutorial completion
- **Acceptance Criteria**:
  - Tutorial teaches all mechanics
  - Completable by >80% of new players
  - Can be skipped gracefully
  - No softlocks or confusion

#### M2-016: Dialogue System (Basic)
- **Priority**: P1
- **Tags**: `gameplay`, `narrative`, `ux`
- **Effort**: 6 hours
- **Dependencies**: M1-004
- **Description**: NPC dialogue and choices
- **Files**:
  - `src/game/systems/DialogueSystem.js`
  - `src/game/ui/DialogueBox.js`
  - `tests/game/systems/DialogueSystem.test.js`
- **Implementation Requirements**:
  - Display NPC dialogue
  - Player dialogue choices
  - Branching dialogue trees
  - Dialogue history
  - Choice consequences (reputation, information)
- **Acceptance Criteria**:
  - Dialogue displays correctly
  - Choices lead to correct branches
  - Consequences tracked
  - UI readable and clear

#### M2-017: NPC Interview Mechanics
- **Priority**: P1
- **Tags**: `gameplay`, `investigation`
- **Effort**: 4 hours
- **Dependencies**: M2-016
- **Description**: Interview witnesses and suspects
- **Files**:
  - `src/game/systems/InterviewSystem.js`
- **Implementation Requirements**:
  - Interview approach selection (Aggressive/Diplomatic/Analytical)
  - NPC reactions to approaches
  - Testimony recorded to case file
  - Cross-referencing testimonies
  - Contradiction detection
- **Acceptance Criteria**:
  - Approaches affect NPC responses
  - Testimonies stored correctly
  - Contradictions detectable
  - Player learns useful information

#### M2-018: Tutorial Case Playthrough Test
- **Priority**: P1
- **Tags**: `test`, `investigation`
- **Effort**: 3 hours
- **Dependencies**: M2-015 (all M2 systems)
- **Description**: End-to-end tutorial case test
- **Test Scenarios**:
  - Complete tutorial from start to finish
  - Collect all evidence
  - Interview witnesses
  - Solve deduction board
  - Complete case objectives
  - Verify progression unlocks
- **Acceptance Criteria**:
  - Case completable without bugs
  - All mechanics work together
  - Tutorial effective (internal playtesting)
  - Performance maintained (60 FPS)

#### M2-019: Investigation Mechanics Documentation
- **Priority**: P2
- **Tags**: `docs`
- **Effort**: 3 hours
- **Dependencies**: M2-018
- **Description**: Document investigation systems
- **Files**:
  - `docs/gameplay/investigation-mechanics.md`
  - `docs/gameplay/deduction-board-guide.md`
- **Content**:
  - How investigation system works
  - Evidence types and collection
  - Deduction board usage
  - Forensic minigames guide
  - Tutorial case walkthrough
- **Acceptance Criteria**:
  - Complete documentation
  - Examples provided
  - Developer-friendly

#### M2-020: M2 Performance and Bug Fix Pass
- **Priority**: P1
- **Tags**: `perf`, `refactor`
- **Effort**: 4 hours
- **Dependencies**: M2-018
- **Description**: Optimize and fix M2 issues
- **Tasks**:
  - Profile investigation systems
  - Fix any identified bugs
  - Optimize deduction board rendering
  - Reduce GC pressure from UI updates
- **Acceptance Criteria**:
  - 60 FPS maintained with investigation UI open
  - No critical bugs
  - Memory usage stable

---

## Sprint 3: Faction and World Systems (Weeks 7-9)

**Milestone**: M3 - Faction
**Duration**: 3 weeks
**Goal**: Implement dynamic faction relationships and reactive world
**Success Criteria**: Reputation system predictable, disguises enable infiltration, world state persists

### Week 7: Reputation System

#### M3-001: Faction Data Definitions
- **Priority**: P0
- **Tags**: `gameplay`, `faction`, `narrative`
- **Effort**: 4 hours
- **Dependencies**: Narrative team (faction lore)
- **Description**: Define 5 faction data structures
- **Files**:
  - `src/game/data/factions/neurosynch.js`
  - `src/game/data/factions/archivists.js`
  - `src/game/data/factions/police.js`
  - `src/game/data/factions/curators.js`
  - `src/game/data/factions/independents.js`
- **Implementation Requirements**:
  - Faction metadata (name, description, values)
  - Ally/enemy relationships
  - Reputation thresholds (Hostile, Neutral, Friendly, Allied)
  - Faction-specific rewards
  - Initial reputation values
- **Acceptance Criteria**:
  - All 5 factions defined
  - Relationships match lore
  - Data validated (no circular dependencies)

#### M3-002: FactionManager Implementation
- **Priority**: P0
- **Tags**: `gameplay`, `faction`
- **Effort**: 5 hours
- **Dependencies**: M3-001
- **Description**: Faction reputation management
- **Files**:
  - `src/game/managers/FactionManager.js`
  - `tests/game/managers/FactionManager.test.js`
- **Implementation Requirements**:
  - Track dual-axis reputation (Fame/Infamy) per faction
  - Modify reputation with cascading to allies/enemies
  - Calculate faction attitude (Allied/Friendly/Neutral/Hostile)
  - Reputation change events
  - Save/load faction state
- **Acceptance Criteria**:
  - Reputation changes correctly
  - Cascades to allies (+50%) and enemies (-50%)
  - Attitudes calculated correctly
  - Events emitted on changes
  - Unit tests pass

#### M3-003: FactionSystem (ECS Integration)
- **Priority**: P1
- **Tags**: `gameplay`, `faction`, `ecs`
- **Effort**: 4 hours
- **Dependencies**: M3-002, M1-004
- **Description**: ECS system for faction logic
- **Files**:
  - `src/game/systems/FactionSystem.js`
  - `src/game/components/Faction.js`
  - `tests/game/systems/FactionSystem.test.js`
- **Implementation Requirements**:
  - Faction component (faction ID, attitude override)
  - Update NPC behaviors based on faction attitude
  - React to player reputation changes
  - Faction-based dialogue variations
- **Acceptance Criteria**:
  - NPCs react to faction standings
  - Behaviors change with reputation
  - Performance impact minimal

#### M3-004: Reputation UI
- **Priority**: P1
- **Tags**: `ux`, `faction`
- **Effort**: 4 hours
- **Dependencies**: M3-002
- **Description**: Display faction standings
- **Files**:
  - `src/game/ui/ReputationUI.js`
  - CSS styling
- **Implementation Requirements**:
  - List all factions with current standing
  - Visual indicators (bar, color-coded)
  - Fame/Infamy breakdown
  - Relationship web visualization (optional)
  - Tooltips explaining consequences
- **Acceptance Criteria**:
  - UI clear and informative
  - Updates in real-time
  - Tooltips helpful
  - Mobile-friendly

### Week 8: NPC Memory and Disguises

#### M3-005: NPC Component and Memory System
- **Priority**: P0
- **Tags**: `gameplay`, `faction`, `ecs`
- **Effort**: 5 hours
- **Dependencies**: M3-003
- **Description**: NPC memory and recognition
- **Files**:
  - `src/game/components/NPC.js`
  - `src/game/systems/NPCMemorySystem.js`
  - `tests/game/systems/NPCMemorySystem.test.js`
- **Implementation Requirements**:
  - NPC memory component (known player, last interaction, witnessed crimes)
  - Recognition mechanics (distance, line of sight)
  - Memory persistence across sessions
  - "Known By" list tracking
  - Faction-based memory sharing
- **Acceptance Criteria**:
  - NPCs remember player actions
  - Recognition distance appropriate
  - Memory persists across saves
  - Faction members share information

#### M3-006: NPCFactory
- **Priority**: P1
- **Tags**: `gameplay`, `faction`
- **Effort**: 3 hours
- **Dependencies**: M3-005
- **Description**: Create NPCs easily
- **Files**:
  - `src/game/entities/NPCFactory.js`
  - `tests/game/entities/NPCFactory.test.js`
- **Implementation Requirements**:
  - Factory function for NPC creation
  - Randomized appearances
  - Faction assignment
  - Behavior templates (guard, civilian, informant)
  - Dialogue assignment
- **Acceptance Criteria**:
  - NPCs created easily
  - Visual variety
  - Faction affiliations correct
  - Unit tests pass

#### M3-007: Dialogue Variations by Reputation
- **Priority**: P2
- **Tags**: `narrative`, `faction`
- **Effort**: 4 hours
- **Dependencies**: M3-003, M2-016, narrative team
- **Description**: NPC dialogue changes with reputation
- **Files**:
  - Update dialogue system for reputation checks
  - Create dialogue variations
- **Implementation Requirements**:
  - Check faction standing before dialogue
  - Select dialogue based on attitude (Hostile/Neutral/Friendly/Allied)
  - Smooth transitions between attitudes
  - Faction-specific greetings
- **Acceptance Criteria**:
  - NPCs speak differently based on reputation
  - Transitions feel natural
  - All factions have variations
  - Narrative team approves tone

#### M3-008: DisguiseSystem Implementation
- **Priority**: P0
- **Tags**: `gameplay`, `faction`, `ecs`
- **Effort**: 6 hours
- **Dependencies**: M3-005
- **Description**: Disguise mechanics
- **Files**:
  - `src/game/systems/DisguiseSystem.js`
  - `src/game/components/Disguise.js`
  - `tests/game/systems/DisguiseSystem.test.js`
- **Implementation Requirements**:
  - Equip faction disguises
  - Calculate disguise effectiveness (base * infamy penalty * known NPC check)
  - Detection rolls (periodic checks)
  - Blown cover consequences
  - Suspicious action modifiers
- **Acceptance Criteria**:
  - Disguises enable access to hostile areas
  - Detection rolls fair and predictable
  - Known NPCs see through disguises
  - Suspicious actions increase detection
  - Unit tests cover edge cases

#### M3-009: Disguise UI
- **Priority**: P1
- **Tags**: `ux`, `faction`
- **Effort**: 3 hours
- **Dependencies**: M3-008
- **Description**: Disguise selection interface
- **Files**:
  - `src/game/ui/DisguiseUI.js`
- **Implementation Requirements**:
  - List available disguises
  - Show effectiveness ratings
  - Equip/unequip disguises
  - Detection risk indicator
  - Warnings (known NPCs nearby)
- **Acceptance Criteria**:
  - UI intuitive
  - Effectiveness clear
  - Risk communicated
  - Warnings helpful

#### M3-010: Social Stealth Mechanics
- **Priority**: P1
- **Tags**: `gameplay`, `faction`
- **Effort**: 5 hours
- **Dependencies**: M3-008
- **Description**: Social stealth system
- **Files**:
  - `src/game/systems/SocialStealthSystem.js`
  - `tests/game/systems/SocialStealthSystem.test.js`
- **Implementation Requirements**:
  - Suspicion meter
  - Suspicious actions tracking (running, combat, trespassing)
  - Detection states (Unaware, Suspicious, Alerted, Combat)
  - Restricted area mechanics
  - Consequences (reputation loss, combat, arrest)
- **Acceptance Criteria**:
  - Suspicion builds from actions
  - Detection states transition correctly
  - Consequences meaningful
  - Stealth viable alternative to combat

#### M3-011: Infiltration Tutorial
- **Priority**: P2
- **Tags**: `ux`, `faction`
- **Effort**: 3 hours
- **Dependencies**: M3-010
- **Description**: Teach disguise and social stealth
- **Tasks**:
  - Tutorial sequence for disguise system
  - Explain suspicion mechanics
  - Demonstrate suspicious actions
  - Safe practice area
- **Acceptance Criteria**:
  - Tutorial teaches mechanics clearly
  - Players understand disguise system
  - Can be skipped

### Week 9: District Control and World State

#### M3-012: District Data Definitions
- **Priority**: P0
- **Tags**: `gameplay`, `faction`, `narrative`
- **Effort**: 4 hours
- **Dependencies**: Narrative team (district lore)
- **Description**: Define 4 district data structures
- **Files**:
  - `src/game/data/districts/neon-districts.js`
  - `src/game/data/districts/corporate-spires.js`
  - `src/game/data/districts/archive-undercity.js`
  - `src/game/data/districts/zenith-sector.js`
- **Implementation Requirements**:
  - District metadata (name, description, theme)
  - Controlling faction
  - Stability level
  - Access restrictions
  - Security level
  - Environmental attributes
- **Acceptance Criteria**:
  - All 4 districts defined
  - Matches narrative vision
  - Data validated

#### M3-013: WorldStateManager Implementation
- **Priority**: P0
- **Tags**: `gameplay`, `faction`
- **Effort**: 5 hours
- **Dependencies**: M3-012
- **Description**: World state persistence
- **Files**:
  - `src/game/managers/WorldStateManager.js`
  - `tests/game/managers/WorldStateManager.test.js`
- **Implementation Requirements**:
  - Track district control
  - Track NPC states
  - Track world events
  - Save/load world state
  - State change events
- **Acceptance Criteria**:
  - World state persists correctly
  - Save/load works without corruption
  - Events emitted on changes
  - Unit tests pass

#### M3-014: DistrictControlSystem
- **Priority**: P1
- **Tags**: `gameplay`, `faction`, `ecs`
- **Effort**: 4 hours
- **Dependencies**: M3-013
- **Description**: District ownership logic
- **Files**:
  - `src/game/systems/DistrictControlSystem.js`
  - `tests/game/systems/DistrictControlSystem.test.js`
- **Implementation Requirements**:
  - Calculate district control based on player actions
  - Update stability based on events
  - Change controlling faction when stability drops
  - Visual changes based on controller
  - Access restrictions enforcement
- **Acceptance Criteria**:
  - District control changes logically
  - Stability affected by player actions
  - Visual changes noticeable
  - Access restrictions enforced

#### M3-015: Restricted Area Mechanics
- **Priority**: P1
- **Tags**: `gameplay`, `faction`
- **Effort**: 4 hours
- **Dependencies**: M3-014, M3-010
- **Description**: Area access control
- **Files**:
  - `src/game/systems/RestrictedAreaSystem.js`
- **Implementation Requirements**:
  - Define restricted zones
  - Check player credentials/disguise
  - Trigger detection if unauthorized
  - Different restriction types (disguise required, hostile, credentials needed)
- **Acceptance Criteria**:
  - Restricted areas enforced
  - Credentials checked correctly
  - Disguises grant access appropriately
  - Unauthorized entry triggers detection

#### M3-016: Save/Load System Implementation
- **Priority**: P0
- **Tags**: `engine`, `gameplay`
- **Effort**: 6 hours
- **Dependencies**: M3-013, M2-004
- **Description**: Complete save/load system
- **Files**:
  - `src/engine/SaveManager.js`
  - `tests/engine/SaveManager.test.js`
- **Implementation Requirements**:
  - Serialize all game state (player, quests, factions, world, cases)
  - Save to localStorage (with fallback)
  - Multiple save slots
  - Load saved games
  - Autosave every 5 minutes
  - Versioned save format
- **Acceptance Criteria**:
  - All game state saves correctly
  - Load restores state perfectly
  - No data loss or corruption
  - Load time <2s
  - Multiple slots work
  - Autosave doesn't interrupt gameplay

#### M3-017: Save/Load Stress Testing
- **Priority**: P1
- **Tags**: `test`
- **Effort**: 3 hours
- **Dependencies**: M3-016
- **Description**: Rigorous save/load testing
- **Test Scenarios**:
  - Save and load 100 times (no corruption)
  - Save with large world state (1000+ NPCs)
  - Save during active gameplay
  - Load corrupted save (graceful failure)
  - Version migration testing
- **Acceptance Criteria**:
  - Zero corruption across 100 cycles
  - Large saves work correctly
  - Graceful failure on corruption
  - Version migration works

#### M3-018: Faction and World Integration Test
- **Priority**: P1
- **Tags**: `test`, `faction`
- **Effort**: 4 hours
- **Dependencies**: M3-017 (all M3 systems)
- **Description**: End-to-end faction system test
- **Test Scenarios**:
  - Modify reputation, verify cascades
  - Equip disguise, infiltrate hostile area
  - NPCs react to reputation changes
  - District control changes from actions
  - Save/load preserves all faction state
- **Acceptance Criteria**:
  - All systems integrate correctly
  - Reputation cascades work
  - Disguises enable infiltration
  - World state persists

#### M3-019: Faction System Documentation
- **Priority**: P2
- **Tags**: `docs`, `faction`
- **Effort**: 3 hours
- **Dependencies**: M3-018
- **Description**: Document faction systems
- **Files**:
  - `docs/gameplay/faction-system.md`
  - `docs/gameplay/disguise-guide.md`
- **Content**:
  - Reputation system mechanics
  - Faction relationships
  - Disguise effectiveness calculations
  - Social stealth tips
  - District control mechanics
- **Acceptance Criteria**:
  - Complete documentation
  - Examples provided
  - Developer and player-friendly

#### M3-020: M3 Bug Fix and Polish Pass
- **Priority**: P1
- **Tags**: `refactor`, `perf`
- **Effort**: 4 hours
- **Dependencies**: M3-018
- **Description**: Fix bugs and optimize M3
- **Tasks**:
  - Fix any identified bugs
  - Optimize faction calculations
  - Polish UI feedback
  - Reduce GC pressure from world state updates
- **Acceptance Criteria**:
  - No critical bugs
  - 60 FPS maintained
  - UI polished and clear

---

## Sprint 4-7: Future Milestones (High-Level)

### Sprint 4: Procedural Generation (Weeks 10-12, M4)

**Key Tasks** (Will be detailed closer to sprint):

- **M4-001 to M4-005**: District Layout Generation (BSP algorithm, room generation, pathfinding)
- **M4-006 to M4-010**: Case Generation System (templates, evidence placement, witness pools)
- **M4-011 to M4-015**: Narrative Anchor Integration (blend authored content with procedural)
- **M4-016 to M4-020**: Quality Validation (solvability tests, coherence checks, playtest iteration)

**Dependencies**: M1 (engine), M2 (investigation), M3 (faction basics)
**Success Criteria**: Districts generate in <1s, cases solvable by >70%, narrative anchors seamless

### Sprint 5: Combat and Progression (Weeks 13-15, M5)

**Key Tasks** (Will be detailed closer to sprint):

- **M5-001 to M5-005**: Combat System (damage, health, weapons, hit detection)
- **M5-006 to M5-010**: Stealth System (visibility, sight cones, light/shadow, detection states)
- **M5-011 to M5-015**: Enemy AI (state machine, patrol, chase, search, combat behaviors)
- **M5-016 to M5-020**: Knowledge-Gated Progression (abilities, unlocks, gates, upgrades)
- **M5-021 to M5-025**: Combat/Stealth Balance Testing

**Dependencies**: M1 (engine, physics), M2 (investigation as primary mechanic), M3 (social stealth foundation)
**Success Criteria**: Combat functional but not primary, stealth viable for >80% encounters, abilities feel impactful

### Sprint 6: Story Integration (Weeks 16-18, M6)

**Key Tasks** (Will be detailed closer to sprint):

- **M6-001 to M6-005**: Quest System (QuestManager, objectives, branching, prerequisites)
- **M6-006 to M6-010**: Story Flag System (flag tracking, persistence, conditional logic)
- **M6-011 to M6-020**: Act 1 Implementation (5 main cases, locations, NPCs, dialogue)
- **M6-021 to M6-025**: Branching Path Structure (Act 2 thread setup, player choice mechanics)
- **M6-026 to M6-030**: World State Persistence (complete save system, load validation)

**Dependencies**: M2 (investigation), M3 (faction), M5 (progression), Narrative team (complete Act 1 scripts)
**Success Criteria**: Act 1 completable start-to-finish, branching paths functional, save/load flawless

### Sprint 7: Vertical Slice Polish (Weeks 19-20, M7)

**Key Tasks** (Will be detailed closer to sprint):

- **M7-001 to M7-005**: Performance Optimization (profiling, hotspot fixes, GC optimization)
- **M7-006 to M7-010**: Audio Implementation (adaptive music, SFX, 3D positioning)
- **M7-011 to M7-015**: Visual Polish (particles, screen effects, post-processing)
- **M7-016 to M7-020**: Bug Fixing Sprint (critical, high, medium priority bugs)
- **M7-021 to M7-025**: Playtesting and Iteration (feedback collection, balance, final polish)

**Dependencies**: M1-M6 complete
**Success Criteria**: 60 FPS maintained, zero critical bugs, >80% playtester completion, >70% satisfaction

---

## Technical Debt Tracker

### Current Known Issues

**None yet** - Will be populated as issues are discovered

### Future Refactoring Needs

#### TD-001: ECS Query Caching
- **Priority**: P3
- **Effort**: 4 hours
- **Description**: Cache frequently-used component queries to reduce lookup overhead
- **Benefit**: ~10-15% performance improvement in system updates
- **When**: After M5 if performance issues arise

#### TD-002: Rendering Batching
- **Priority**: P3
- **Effort**: 6 hours
- **Description**: Batch sprite draws by texture to reduce draw calls
- **Benefit**: ~20% rendering performance improvement
- **When**: After M5 if rendering bottleneck identified

#### TD-003: Event Bus Performance
- **Priority**: P3
- **Effort**: 3 hours
- **Description**: Optimize event dispatch with subscription caching
- **Benefit**: Reduce event overhead by ~30%
- **When**: If profiling shows event dispatch as hotspot

#### TD-015: Standardize EventBus Access (Completed)
- **Priority**: P1
- **Effort**: 2 hours
- **Status**: Completed (Session #60 – 2025-10-30)
- **Description**: Refactored gameplay managers, systems, and overlays still referencing the legacy `this.events` handle so they consume the injected `eventBus`, issued a compatibility alias, and updated SystemManager to enforce the pattern automatically.
- **Benefit**: Prevents duplicate event bus instances, reduces bootstrap bugs, and ensures future systems inherit the shared bus contract.
- **Verification**: `npm test -- SystemManager`, `npm test -- Game.systemRegistration`, `npm test -- SaveManager`, `npm test -- TutorialOverlay`, `npm test -- InventoryOverlay`, `npm test`

---

## Asset Request Tracker

All asset requests logged in `assets/*/requests.json`. Human asset creation or external sourcing required.

### Critical Assets (P0 - Required for M2)

#### AR-001: UI Elements (M2)
- **Type**: Images
- **Priority**: P0
- **Needed By**: M2 (Week 6)
- **Description**: Deduction board UI, case file icons, evidence icons, button sprites
- **Specifications**:
  - Deduction board background (1024x768)
  - Clue node sprite (64x64, variations)
  - Evidence type icons (32x32 each: physical, digital, testimonial, forensic)
  - UI buttons (play, pause, settings, etc.)
- **File**: `assets/images/requests.json`

#### AR-002: Evidence Placeholder Sprites (M2)
- **Type**: Images
- **Priority**: P0
- **Needed By**: M2 (Week 4)
- **Description**: Visual representations of evidence items
- **Specifications**:
  - Generic evidence markers (32x32)
  - Fingerprint sprite
  - Document sprite
  - Neural extractor sprite
  - Blood spatter sprite
- **File**: `assets/images/requests.json`

#### AR-003: Player Character Sprite (M2)
- **Type**: Images
- **Priority**: P0
- **Needed By**: M2 (Week 4)
- **Description**: Kira player sprite with animations
- **Specifications**:
  - Idle, walk, run animations (32x32 sprite sheet)
  - Detective coat, distinctive look
  - 4-direction or 8-direction movement
- **File**: `assets/images/requests.json`

### High Priority Assets (P1 - Required for M3-M6)

#### AR-004: NPC Sprites (M3)
- **Type**: Images
- **Priority**: P1
- **Needed By**: M3 (Week 8)
- **Description**: Various NPC character sprites
- **Specifications**:
  - Civilian NPCs (5 variations, 32x32)
  - Guard NPCs (3 variations, 32x32)
  - Faction-specific clothing/colors
- **File**: `assets/images/requests.json`

#### AR-005: District Tilesets (M4)
- **Type**: Images
- **Priority**: P1
- **Needed By**: M4 (Week 10-12)
- **Description**: Tileset for 4 districts
- **Specifications**:
  - Neon Districts: Dark, neon-lit, rain-soaked (16x16 tiles)
  - Corporate Spires: Clean, sterile, high-tech (16x16 tiles)
  - Archive Undercity: Dark, ancient tech (16x16 tiles)
  - Zenith Sector: Futuristic, imposing (16x16 tiles)
- **File**: `assets/images/requests.json`

#### AR-006: UI Sound Effects (M2-M6)
- **Type**: Audio
- **Priority**: P1
- **Needed By**: M6 (Week 18)
- **Description**: UI and gameplay sound effects
- **Specifications**:
  - Evidence collection (positive chime)
  - Deduction connection (snap/click)
  - Theory validation (success/failure sounds)
  - Dialogue advance (text blip)
  - Menu navigation (hover, click)
- **File**: `assets/music/requests.json` (SFX go here too)

### Medium Priority Assets (P2 - Polish/Enhancement)

#### AR-007: Particle Effects (M7)
- **Type**: Images
- **Priority**: P2
- **Needed By**: M7 (Week 19)
- **Description**: Particle sprites for effects
- **Specifications**:
  - Rain particles (2x2)
  - Neon glow particles (4x4)
  - Memory fragment particles (8x8, ethereal)
  - Screen effects (flash, scanlines)
- **File**: `assets/images/requests.json`

#### AR-008: Adaptive Music Tracks (M7)
- **Type**: Audio
- **Priority**: P2
- **Needed By**: M7 (Week 19)
- **Description**: Layered music for adaptive system
- **Specifications**:
  - Downtown ambient layer (2 min loop)
  - Downtown tension layer (2 min loop)
  - Downtown combat layer (2 min loop)
  - Layers must sync at loop points
- **File**: `assets/music/requests.json`
- **Status**: Memory Parlor ambient loop integrated (FreePD "Goodnightmare") and routed through AmbientSceneAudioController.

#### AR-009: Environmental SFX (M7)
- **Type**: Audio
- **Priority**: P2
- **Needed By**: M7 (Week 19)
- **Description**: Ambient and environmental sounds
- **Specifications**:
  - Footsteps (concrete, metal)
  - Rain ambience
  - Neon buzz
  - Distant city sounds
  - Terminal hum
- **File**: `assets/music/requests.json`

---

## Backlog Maintenance Guidelines

### Adding New Tasks

1. Assign unique ID: `M[milestone]-[number]` (e.g., M1-028)
2. Set priority (P0-P3)
3. Tag appropriately (engine, gameplay, narrative, etc.)
4. Estimate effort (hours)
5. List dependencies
6. Write clear acceptance criteria
7. Add to appropriate sprint/milestone section

### Updating Task Status

- **Pending**: Not started
- **In Progress**: Currently being worked on
- **Blocked**: Waiting on dependency or blocker
- **Completed**: Acceptance criteria met, tested, merged

### Sprint Planning Process

1. Review upcoming sprint milestone
2. Pull all P0 tasks (critical path)
3. Pull all P1 tasks (core features)
4. Assess capacity and pull P2 tasks if time permits
5. Defer P3 tasks unless surplus capacity
6. Check dependencies are completed
7. Assign tasks to agents

### Refinement Schedule

- **Weekly**: Review current sprint, update progress
- **Bi-weekly**: Refine upcoming sprint (add details to high-level tasks)
- **End of milestone**: Review completed work, update backlog priorities

---

## Agent Assignment Guide

### Engine Developer
**Primary Focus**: M1 (Core Engine), M7 (Performance)
**Tasks**: All M1-xxx tasks, performance optimization, engine bug fixes
**Skills**: ECS architecture, rendering pipelines, physics, optimization

### Gameplay Developer
**Primary Focus**: M2 (Investigation), M3 (Faction), M4 (Procedural), M5 (Combat)
**Tasks**: All M2-xxx, M3-xxx, M4-xxx, M5-xxx tasks
**Skills**: Game mechanics, systems design, balancing

### Narrative Writer
**Primary Focus**: M2 (Tutorial case), M6 (Act 1), dialogue, quest content
**Tasks**: Content creation, dialogue writing, quest scripting
**Skills**: Storytelling, character development, branching narratives

### World-Building Agent
**Primary Focus**: M3 (Faction/District data), M4 (Narrative anchors)
**Tasks**: Faction definitions, district definitions, lore consistency
**Skills**: World-building, lore creation, thematic consistency

### Dialogue Agent
**Primary Focus**: M2 (Dialogue system), M3 (NPC variations), M6 (Act 1 dialogue)
**Tasks**: Dialogue trees, NPC voices, conversation flow
**Skills**: Character voice, dialogue pacing, emotional tone

### Test Engineer
**Primary Focus**: All milestones (unit tests, integration tests)
**Tasks**: Writing tests, test coverage, bug finding
**Skills**: Testing strategies, Jest, Playwright, QA methodology

### Playtester
**Primary Focus**: M2 (Tutorial), M6 (Act 1), M7 (Full vertical slice)
**Tasks**: Playthrough testing, feedback collection, UX evaluation
**Skills**: Player perspective, feedback articulation, bug reporting

### Optimizer
**Primary Focus**: M1 (Initial profiling), M5 (Mid-dev optimization), M7 (Final pass)
**Tasks**: Performance profiling, hotspot identification, optimization implementation
**Skills**: Profiling tools, performance analysis, optimization techniques

### Documenter
**Primary Focus**: All milestones (living documentation)
**Tasks**: JSDoc comments, usage guides, architecture docs
**Skills**: Technical writing, clarity, developer empathy

---

## Success Metrics by Milestone

### M1 (Core Engine) - Week 3
- [ ] ECS creates 10,000 entities in <100ms
- [ ] Component queries <1ms for 1000 entities
- [ ] 60 FPS with 500 sprites
- [ ] Spatial hash reduces collision checks by >90%
- [ ] Event dispatch <0.1ms per event
- [ ] Assets load in <3s (critical)
- [ ] Zero memory leaks
- [ ] Test coverage >80%

### M2 (Investigation) - Week 6
- [ ] Evidence collection functional
- [ ] Deduction board usable without tutorial
- [ ] Tutorial case completable by >80% of testers
- [ ] Forensic minigames engaging
- [ ] Detective vision reveals hidden evidence
- [ ] Theory validation feels fair
- [ ] 60 FPS maintained

### M3 (Faction) - Week 9
- [ ] Reputation changes predictable
- [ ] NPCs react to reputation
- [ ] Disguises enable infiltration (>70% success for careful players)
- [ ] District control changes visible
- [ ] World state persists correctly
- [ ] 60 FPS maintained

---

## Closing Notes

This backlog is a living document. As development progresses:

1. **Add detail** to upcoming tasks
2. **Update estimates** based on actual effort
3. **Track blockers** and resolve them quickly
4. **Defer non-critical tasks** if needed to maintain milestone dates
5. **Celebrate completions** and learn from challenges

The goal is a compelling vertical slice demonstrating The Memory Syndicate's unique hybrid gameplay. Stay focused on the critical path (M0 → M1 → M2 → M6 → M7) while managing parallel work carefully.

**Protected scope**: Investigation mechanics, faction system, Act 1 story, procedural generation. Everything else is negotiable if timeline pressures arise.

**Next immediate action**: Begin M1-001 (Project Infrastructure Setup).

---

**Document Status**: Ready for Sprint 1
**Owner**: Lead Architect
**Last Review**: 2025-10-26
**Next Review**: End of Week 1 (M1 progress check)
