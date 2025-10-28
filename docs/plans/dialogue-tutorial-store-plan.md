# Dialogue & Tutorial Store Integration Plan

## Context
- Research reports consulted: `docs/plans/world-state-store-plan.md`, `docs/narrative/dialogue/DIALOGUE_SYSTEM_IMPLEMENTATION.md`
- Current system state: Quest overlays consume `WorldStateStore` selectors; `DialogueSystem` + `DialogueBox` and `TutorialSystem` + `TutorialOverlay` still bind directly to EventBus payloads. SaveManager snapshots track tutorial completion only; dialogue history is transient.
- Problem being solved: Add authoritative, queryable world-state slices for dialogue and tutorial flows so UI overlays, debugging tools, SaveManager, and parity tests can observe branching narrative state deterministically. This unblocks PO-003 (dialogue/tutorial migration) and creates selectors for Playwright and tooling.

## Architecture Overview
```
                ┌───────────────────────────┐
                │         EventBus          │
                │  dialogue:* tutorial:*    │
                └───────────┬───────────────┘
                            │  dispatch actions
              ┌─────────────▼────────────────────┐
              │     WorldStateStore (extended)   │
              │  - dialogueSlice                 │
              │  - tutorialSlice (enhanced)      │
              └────────┬──────────────┬──────────┘
                       │              │
        ┌──────────────▼─────┐ ┌──────▼──────────┐
        │ dialogueSlice      │ │ tutorialSlice   │
        │ active convo, log  │ │ prompts, steps  │
        └────────┬───────────┘ └────────┬────────┘
                 │ selectors             │ selectors
        ┌────────▼──────────────┐ ┌──────▼────────────────┐
        │ dialogueViewModel     │ │ tutorialViewModel      │
        │   build UI/debug data │ │   build overlay data   │
        └────────┬──────────────┘ └────────┬───────────────┘
                 │                           │
      ┌──────────▼─────────┐     ┌───────────▼────────────┐
      │ DialogueBox & Dev  │     │ TutorialOverlay & save  │
      │ overlay components │     │ serialization consumers │
      └────────────────────┘     └────────────────────────┘
```

Component Breakdown

### Component 1: `dialogueSlice`
Purpose: Persist active dialogue session, transcript history, and available choices for deterministic UI rendering and debugging.
Responsibilities:
- Track `active` conversation (npcId, dialogueId, nodeId, speaker, text, choices, canAdvance, timestamps).
- Append entries to `history` (sequence of nodes & choices with metadata for replay).
- Record `completed` conversations per NPC, including last choice taken.
- Expose selectors for active node view model, branch history, and NPC transcripts.
Dependencies:
- EventBus events (`dialogue:started`, `dialogue:node_changed`, `dialogue:choice`, `dialogue:ended`, `dialogue:completed`).
- Memoization utility (`createSelector`).
Interface:
```javascript
export const dialogueSlice = {
  key: 'dialogue',
  getInitialState() {},
  reducer(state, action) {},
  serialize(state) {},
  selectors: {
    selectActiveDialogue(state),
    selectDialogueTranscript(state, npcId),
    selectLastChoiceForNPC(state, npcId)
  }
};
```
Events:
- Listens: `dialogue:*` mapped to `DIALOGUE_STARTED`, `DIALOGUE_NODE_CHANGED`, `DIALOGUE_CHOICE_MADE`, `DIALOGUE_ENDED`, `DIALOGUE_COMPLETED`.
- Emits (via store): `worldstate:updated` with dialogue domain payload.
Testing: Reducer + selector tests simulating full branching conversation; parity harness comparing `DialogueSystem` internal state with selectors under scripted interactions.

### Component 2: Enhanced `tutorialSlice`
Purpose: Extend tutorial state to capture prompt metadata so overlays render solely from store snapshots and SaveManager can serialize partial progress.
Responsibilities:
- Persist current prompt details (title, description, highlight, position, canSkip).
- Track timing info (`startedAt`, `durationMs`, `lastActionAt`) for analytics overlays.
- Maintain structured `completedSteps` with completion timestamps and optional rewards.
- Provide selectors for overlay view, highlight directives, completion summary.
Dependencies:
- Tutorial events (`tutorial:started`, `tutorial:step_started`, `tutorial:step_completed`, `tutorial:completed`, `tutorial:skipped`).
- Tutorial step definitions for fallback metadata.
Interface:
```javascript
selectors: {
  selectTutorialPrompt(state),
  selectTutorialProgress(state),
  selectTutorialHighlight(state)
}
```
Events:
- Same event bus topics; additional payload validation to ensure required properties exist.
Testing: Reducer tests verifying metadata capture; hydration tests ensuring SaveManager snapshot rehydrates prompt state.

### Component 3: `dialogueViewModel` helper (new)
Purpose: Build normalized structures for UI/debug overlays combining store state with `DialogueSystem`/`DialogueTree` metadata.
Responsibilities:
- Merge selector output with dialogue tree definition (speaker defaults, branching metadata).
- Provide derived fields (choice numbering, branch flags, faction gating cues).
- Offer utilities for formatting transcripts (e.g., last three exchanges) for debug panel.
Dependencies:
- `dialogueSlice.selectors`, `DialogueSystem.getDialogueTree()`.
Interface:
```javascript
export function buildActiveDialogueView(worldStateStore, dialogueSystem) {}
export function buildTranscriptForNPC(worldStateStore, npcId, options) {}
```
Events: None (pure functions).
Testing: Unit tests with fixture dialogue trees verifying view model structure and memoization (results stable until state changes).

### Component 4: `tutorialViewModel` helper (new)
Purpose: Derive overlay-ready payload (prompt string, highlight targets, progress bar values) from store state + tutorial definitions.
Responsibilities:
- Bridge between slice selectors and `TutorialOverlay` rendering API.
- Provide computed progress percentages and highlight pulses.
Dependencies:
- `tutorialSlice.selectors`, `tutorialSteps`.
Interface:
```javascript
export function buildTutorialOverlayState(worldStateStore) {}
```
Testing: Unit tests using mock state verifying fallback to definition defaults and highlight mapping.

### Component 5: UI Overlay refactor (`TutorialOverlay`, `DialogueBox`, new Dialogue Debug Overlay)
Purpose: Consume store selectors instead of listening directly to EventBus; ensure consistent updates and deterministic rendering.
Responsibilities:
- Replace direct `eventBus.subscribe` usage with `worldStateStore.onUpdate` subscription.
- Pull derived data via helpers; keep minimal imperative logic (animations, input).
- Introduce lightweight HTML debug overlay (or extend existing debug HUD) showing active dialogue node/branch for dev builds.
Dependencies:
- New helpers, store instance injected from `Game.initializeUIOverlays`.
- Input system for dialogue interactions (still event-driven for player input).
Interface:
```javascript
class TutorialOverlay {
  constructor(canvas, { eventBus, worldStateStore }) {}
  init() { this._subscribeToWorldState(); }
}
```
Events:
- Emits existing events (`tutorial:skip_requested`, `dialogue:advance_requested`) for input.
Testing: UI harness tests verifying overlays react to store updates; snapshot/render tests to ensure prompts switch correctly when store state changes.

### Component 6: `WorldStateStore` integration & serialization
Purpose: Register new slice, extend snapshot/hydrate pipelines, and guard payload schema.
Responsibilities:
- Add `dialogue` entry to `sliceRegistry`.
- Extend `snapshot()` to include dialogue transcripts (bounded history to prevent bloat) and rich tutorial progress.
- Emit descriptive errors when dialogue payloads are missing required fields.
Dependencies:
- SaveManager (hydrate/serialize), benchmarks for dispatch cost.
Testing: Jest parity suite verifying store snapshot vs legacy managers (tutorial + dialogue), benchmarking harness updates to include new actions.

## Data Flow

Player triggers NPC interaction → `DialogueSystem` emits `dialogue:started` → `WorldStateStore` dispatches `DIALOGUE_STARTED` → `dialogueSlice` persists active node → `dialogueViewModel` derives UI data → `DialogueBox` re-renders via store subscription → Player input triggers `dialogue:choice` → Store logs choice → Consequences update world state and emit additional events.  
Tutorial events follow similar path: `TutorialSystem` emits step events → `tutorialSlice` captures prompt metadata → `tutorialViewModel` supplies overlay layout → `TutorialOverlay` animates using store data → Completion triggers SaveManager snapshot update.

## Implementation Order

Phase 1: Store foundation (Est: 3 hours)  
- Files: `src/game/state/WorldStateStore.js`, `src/game/state/slices/dialogueSlice.js` (new), `src/game/state/slices/tutorialSlice.js` (enhanced), `src/game/state/utils/memoize.js` (ensure multi-arg caching).  
- Tests: `tests/game/state/slices/dialogueSlice.test.js`, extend `tutorialSlice.test.js`, add `tests/game/state/worldStateStore.dialogueParity.test.js`.  
- Success criteria: Store registers new slice, reducers pass unit tests, parity test mirrors DialogueSystem session.

Phase 2: UI + helper integration (Est: 3 hours)  
- Files: `src/game/ui/helpers/dialogueViewModel.js` (new), `src/game/ui/helpers/tutorialViewModel.js` (new), `src/game/ui/DialogueBox.js`, `src/game/ui/TutorialOverlay.js`, `src/game/Game.js` (inject store references).  
- Success criteria: Overlays respond to store updates only; no direct EventBus subscriptions for view state. Manual smoke script confirms prompts persist after SaveManager hydrate.

Phase 3: Tooling, benchmarks, documentation (Est: 2 hours)  
- Files: `benchmarks/state-store-prototype.js`, `docs/plans/backlog.md`, `docs/tech/state-store.md` (if exists), `docs/reports/autonomous-session-XX-handoff.md`, potential debug overlay HTML/CSS.  
- Tests: Extend parity suite for SaveManager hydration, add UI harness or Playwright stub for dialogue overlay toggles.  
- Success criteria: Benchmark stay <0.3 ms with additional reducers, documentation updated, PO-003 dialogue/tutorial portion marked completed.

## File Changes

New Files
- `src/game/state/slices/dialogueSlice.js` – Reducer/selectors for dialogue state.
- `src/game/ui/helpers/dialogueViewModel.js` – View model builder for dialogue overlays.
- `src/game/ui/helpers/tutorialViewModel.js` – Selector bridge for tutorial overlay.
- `tests/game/state/slices/dialogueSlice.test.js` – Reducer + selector coverage.
- `tests/game/state/worldStateStore.dialogueParity.test.js` – Dialogue parity harness using scripted interaction fixtures.
- `docs/tech/dialogue-state.md` (optional) – Developer-facing usage guide if not already covered.

Modified Files
- `src/game/state/WorldStateStore.js` – Register dialogue slice, extend snapshot/hydration, validate payloads.
- `src/game/state/slices/tutorialSlice.js` – Capture prompt metadata, new selectors, bounded history.
- `src/game/ui/DialogueBox.js` – Subscribe to store, drop direct EventBus listeners for display state.
- `src/game/ui/TutorialOverlay.js` – Store-driven prompts/highlights.
- `src/game/Game.js` – Inject store into dialogue/tutorial overlays, expose debug overlay toggle for dev builds.
- `src/game/systems/DialogueSystem.js` & `TutorialSystem.js` – Ensure emitted payloads include schema required by store (timestamps, metadata).
- `tests/game/state/slices/tutorialSlice.test.js`, `tests/game/ui/TutorialOverlay.test.js`, `tests/game/ui/DialogueBox.test.js` – Update expectations for store-driven flow.
- `benchmarks/state-store-prototype.js` – Include dialogue/tutorial dispatch cases.
- `docs/plans/backlog.md` – Reflect delivery status and dependencies.

Interface Definitions
```javascript
// dialogue slice state
{
  active: {
    npcId,
    dialogueId,
    nodeId,
    speaker,
    text,
    choices: [{ id, text, nextNode, lockedReason }],
    canAdvance,
    startedAt,
    updatedAt
  },
  history: {
    [dialogueId]: [{
      npcId,
      nodeId,
      choiceId,
      choiceText,
      timestamp
    }]
  },
  completedByNpc: {
    [npcId]: {
      lastDialogueId,
      lastNodeId,
      lastChoiceId,
      completedAt
    }
  }
}

// tutorial overlay selector contract
{
  visible: boolean,
  prompt: {
    title,
    description,
    stepId,
    index,
    total,
    canSkip
  },
  progress: {
    completed,
    total,
    percent
  },
  highlight: {
    type,
    entityTag?,
    uiElement?
  }
}
```

## Performance Considerations
- Keep dialogue history bounded (configurable limit, default 10 exchanges per NPC) to avoid snapshot bloat.
- Store reducers must shallow-clone only mutated branches; reuse preallocated arrays for history append.
- Selectors rely on memoization to prevent repeated tree merges; view model helpers cache last inputs.
- Benchmark updated to include dialogue + tutorial dispatch sequences (simulate 5-step tutorial + 10-node dialogue) with goal <0.3 ms average dispatch and <1 ms selector access.

## Testing Strategy
### Unit Tests
- Dialogue reducer handles start → node change → choice → end path, including invalid payload guards.
- Tutorial reducer stores and hydrates prompt metadata; selectors compute progress correctly.
- View model helpers return stable references unless underlying state changes (memoization).

### Integration Tests
- Parity suites invoking `DialogueSystem` with fixture trees, asserting store + system agree on active node and history.
- Tutorial parity test simulating tutorial progression ensuring overlay state matches `TutorialSystem` context.
- SaveManager hydration test verifying snapshot restores active tutorial step and paused dialogue (if any).

### Performance Tests
- Extend `benchmarks/state-store-prototype.js` to cover dialogue/tutorial event bursts; assert dispatch under threshold.
- Optional CI guard (skipped locally) measuring selector hot-path allocations with `--runInBand`.

## Rollout Plan
1. Implement dialogue slice + unit tests behind feature flag (store registers slice but overlays still event-driven).
2. Enhance tutorial slice, update parity tests, verify SaveManager snapshot integrity.
3. Introduce helpers and refactor overlays with dual wiring (EventBus for inputs, store for display).
4. Remove legacy EventBus subscriptions once store-driven rendering verified via manual smoke and Jest harness.
5. Update benchmarks, documentation, backlog; prepare Playwright scenario using new selectors.

## Risk Assessment
1. **Risk**: Dialogue payload variance (missing metadata) breaks reducers.  
   - Mitigation: Centralized payload validation + dev-mode warnings; add contract tests with DialogueSystem fixtures.  
   - Likelihood: Medium | Impact: High
2. **Risk**: Store-driven overlays introduce latency if selectors heavy.  
   - Mitigation: Memoization + caching; cap history lengths; profile in dev build.  
   - Likelihood: Low | Impact: Medium
3. **Risk**: SaveManager snapshots grow due to transcript history.  
   - Mitigation: Serialize only bounded history, compress to primitives, allow config to disable transcript persistence.  
   - Likelihood: Low | Impact: Medium

## Success Metrics
- Dialogue overlays render exclusively from `WorldStateStore` selectors; no direct event-driven UI state.
- Tutorial overlay persists correct prompt after reload; parity tests for tutorial/dialogue pass.
- Benchmark dispatch time for combined slices remains <0.3 ms; quest parity tests continue to pass.
- PO-003 dialogue/tutorial migration acceptance criteria met; Playwright scenario can assert against selectors.
