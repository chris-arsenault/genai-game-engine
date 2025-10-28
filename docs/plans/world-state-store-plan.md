# WorldStateStore Implementation Plan

## Context
- Research reports consulted: `docs/research/engine/game-state-management-comparison.md`
- Architecture decisions: ADR `9896f0eb-a055-436a-b429-84bf76905ae3` (Hybrid Event-Sourced WorldStateStore)
- Current system state: Quest, story flag, faction, and tutorial state live in disparate managers (`QuestManager`, `StoryFlagManager`, `FactionManager`, `TutorialSystem`). Save/load scrapes each manager; UI overlays subscribe directly to events. No shared store for deterministic inspection or tooling.
- Problem being solved: Create a centralized, event-sourced world state layer that mirrors authoritative ECS mutations while exposing memoized selectors for UI, SaveManager, and narrative tooling. Phase 0 focuses on scaffolding the store, reducers, selectors, and SaveManager parity tests.

## Architecture Overview
```
                         ┌──────────────────────────┐
                         │       EventBus           │
                         │ (quest:*, story:*, ...)  │
                         └─────────────┬────────────┘
                                       │
                            subscribe/dispatch actions
                                       │
                ┌──────────────────────▼──────────────────────┐
                │           WorldStateStore                   │
                │  - Action log (dev)                         │
                │  - Reducer registry (quests/story/factions) │
                │  - Memoized selectors                       │
                └─────────────┬──────────────┬──────────────┬─┘
                              │              │              │
                 ┌────────────▼────┐ ┌───────▼────────┐ ┌───▼────────┐
                 │ Quest Slice     │ │ Story Slice    │ │ Faction     │
                 │ (status, obj)   │ │ (flags/meta)   │ │ Slice       │
                 └─────────────────┘ └────────────────┘ └─────────────┘
                              │              │              │
                selectors provide snapshots / derived views in <1 ms
                              │              │              │
     ┌────────────────────────▼──────────────▼──────────────▼──────────────────────┐
     │ Consumers                                                                    │
     │ - SaveManager (serialize via snapshot)                                       │
     │ - UI overlays (QuestLogUI, QuestTrackerHUD, TutorialOverlay)                 │
     │ - Debug HUD + console dump                                                   │
     │ - Narrative tooling/tests (fixture-driven)                                   │
     └──────────────────────────────────────────────────────────────────────────────┘

Component Breakdown

### Component 1: `WorldStateStore`
Purpose: Core store orchestrator subscribed to EventBus; manages reducer registry, dispatch pipeline, action log (dev), selectors exposure.
Responsibilities:
- Register reducers per slice (quests, story, factions, tutorial, player metadata)
- Subscribe to `quest:*`, `story:*`, `faction:*`, `tutorial:*`, and `save:*` events
- Dispatch structured actions to reducers and emit `worldstate:updated`
- Provide `getState()`, `select(selector)`, `snapshot()` APIs
- Expose `debug()` console formatter behind `__DEV__`
Dependencies:
- EventBus for event subscription/dispatch
- Slice reducers + selectors modules
- Memoization utility (`createSelector`)
Interface:
```javascript
class WorldStateStore {
  constructor(eventBus, config = {}) {}
  init() {}
  dispatch(action) {}
  getState() {}
  select(selectorFn, args = {}) {}
  snapshot() {}
  debug() {}
  destroy() {}
}
```
Events:
- Listens: `quest:*`, `story:flag:*`, `reputation:changed`, `tutorial:*`, `game:loaded`
- Emits: `worldstate:action`, `worldstate:updated`, `worldstate:error`
Testing:
- Unit tests for action dispatch path, reducer registration, snapshot determinism.

### Component 2: Quest Slice Reducer (`questSlice`)
Purpose: Normalize quest lifecycle data (status, objectives, progress) for fast UI queries and save serialization.
Responsibilities:
- Track quests by id with status, objectives, timestamps
- Handle actions: `QUEST_REGISTERED`, `QUEST_STARTED`, `QUEST_COMPLETED`, `OBJECTIVE_PROGRESS`, `OBJECTIVE_COMPLETED`
- Provide selectors: `selectActiveQuests`, `selectQuestById`, `selectQuestLogEntries`
Dependencies:
- Payload schema validators from quest manager definitions
Interface:
```javascript
const questSlice = {
  getInitialState() {},
  reducer(state, action) {},
  selectors: { selectActiveQuests(state), selectQuestById(state, questId) }
};
```
Events:
- Maps bus events to actions inside store subscriber.
Testing:
- Reducer unit tests using fixture quests; ensures objective progress updates correctly and invalid payloads throw.

### Component 3: Story Slice Reducer (`storySlice`)
Purpose: Maintain story flags, metadata, and timestamp history for branching narrative checks.
Responsibilities:
- Handle actions: `STORY_FLAG_SET`, `STORY_FLAG_REMOVED`
- Store metadata (value, updatedAt, metadata)
- Provide selectors: `selectFlag`, `selectFlagsByPrefix`, `selectCurrentAct`
Dependencies:
- StoryFlagManager event payloads
Events:
- Reacts to `story:flag:changed`, `story:flag:removed`
Testing:
- Reducer tests verifying flag toggles and prefix lookups; ensures timestamps monotonic.

### Component 4: Faction Slice Reducer (`factionSlice`)
Purpose: Track faction reputation (fame/infamy, attitude) and cascades for UI + narrative gating.
Responsibilities:
- Handle `FACTION_REPUTATION_CHANGED`, `FACTION_ATTITUDE_CHANGED`
- Keep normalized map of faction stats plus history of last delta
- Selectors: `selectFactionOverview`, `selectFactionAttitude`
Dependencies:
- `FactionManager` event schema (`reputation:changed`, `faction:attitude_changed`)
Testing:
- Reducer tests for cascade consistency; ensure values clamp within config.

### Component 5: Tutorial Slice Reducer (`tutorialSlice`)
Purpose: Capture tutorial progression milestones for overlays and SaveManager parity.
Responsibilities:
- Actions: `TUTORIAL_STEP_COMPLETED`, `TUTORIAL_RESET`, `TUTORIAL_SKIPPED`
- Selectors: `selectTutorialProgress`, `isTutorialCompleted`
Dependencies:
- TutorialSystem events (`tutorial:step_completed`, `tutorial:skipped`)
Testing:
- Reducer tests covering step ordering and duplicate suppression.

### Component 6: Selector Utilities (`memoizeSelectors`)
Purpose: Provide lightweight memoization to keep selectors <1 ms without pulling in external libs.
Responsibilities:
- Implement `createSelector` (variadic input selectors + result func)
- Provide `resetMemo()` for tests
Dependencies:
- None
Testing:
- Unit tests for memoization resets, argument-based caching.

Data Flow

Player input/choices → Systems/Managers mutate ECS components and emit events  
Events (`quest:*`, `story:*`, `reputation:*`, `tutorial:*`) → `WorldStateStore` subscribers translate to actions  
Store reducers update normalized slices → `worldstate:updated` event  
Selectors consumed by:  
- Quest UI overlays (log/tracker) → renders narrative beats  
- SaveManager → serializes snapshot + metadata  
- Debug tooling → logs latest action/state delta  
State change → Renderer/UI updates via existing UI systems; SaveManager writes to disk; Lore docs can read derived state for narrative continuity.

Implementation Order

Phase 0: Core abstractions (Est: 2.5 hours)
- Files: `src/game/state/WorldStateStore.js`, `src/game/state/slices/*.js`, `src/game/state/selectors.js`, `src/game/state/utils/memoize.js`
- Tests: `tests/game/state/worldStateStore.test.js`, `tests/game/state/slices/*.test.js`
- Success criteria: Store initializes, handles sample actions, selectors memoize, debug gated by `__DEV__`

Phase 1: Event wiring + SaveManager integration (Est: 2 hours)
- Files: `src/game/Game.js`, `src/game/managers/SaveManager.js`, `src/game/systems/*.js` (event dispatch mapping)
- Tests: Extend store tests with event-driven fixtures; add SaveManager parity test comparing legacy scrape vs store snapshot
- Success criteria: `saveGame` uses `WorldStateStore.snapshot()`; tests confirm parity; event handlers produce actions

Phase 2: UI consumers + benchmarking (Est: 1.5 hours)
- Files: `src/game/ui/QuestLogUI.js`, `src/game/ui/QuestTrackerHUD.js`, `benchmarks/state-store-prototype.js`
- Tests: UI integration harness + snapshot tests, benchmark updated for real reducers
- Success criteria: UI selectors used; benchmark asserts <0.5 ms per action.

File Changes

New Files
- `src/game/state/WorldStateStore.js` — Store orchestrator bridging EventBus with reducers/selectors.
- `src/game/state/slices/questSlice.js` — Quest reducer + selectors.
- `src/game/state/slices/storySlice.js` — Story flag reducer + selectors.
- `src/game/state/slices/factionSlice.js` — Faction reducer + selectors.
- `src/game/state/slices/tutorialSlice.js` — Tutorial reducer + selectors.
- `src/game/state/utils/memoize.js` — Lightweight memoization helpers.
- `tests/game/state/worldStateStore.test.js` — Store lifecycle tests.
- `tests/game/state/slices/*.test.js` — Slice reducer/selector unit tests.

Modified Files
- `src/game/Game.js` — Instantiate `WorldStateStore`, wire into dependency container.
- `src/game/managers/SaveManager.js` — Switch to `WorldStateStore.snapshot()` for serialization, retain legacy fallback for parity tests.
- `benchmarks/state-store-prototype.js` — Swap prototype reducers with production store.
- `docs/plans/backlog.md` — Mark PO-002 Phase 0 once delivered; reference plan.

Interface Definitions
```javascript
// Action shape
/**
 * @typedef {Object} WorldStateAction
 * @property {string} type
 * @property {string} domain - 'quest' | 'story' | 'faction' | 'tutorial'
 * @property {Object} payload
 * @property {number} timestamp
 */

// Selector signature
/**
 * @callback WorldStateSelector
 * @param {WorldStateSnapshot} state
 * @param {Object} [params]
 * @returns {*}
 */
```

## Performance Considerations
- Reducers operate on plain objects/maps; avoid deep cloning by copying only mutated branches.
- Memoized selectors cache last args/result to keep UI queries <1 ms.
- Action log limited to `config.maxActionHistory` (default 50) to avoid memory creep; disabled in production builds.
- Benchmark harness reuses preallocated arrays to prevent GC spikes.
- Stress scenario: 200 quests, 20 concurrent updates per frame; ensure dispatch ≤0.25 ms in benchmark.

## Testing Strategy
### Unit Tests
- Reducer behavior per slice (quest activation, objective progress, story flag toggles, faction cascades, tutorial completion)
- Selector memoization correctness and parameterized queries
- WorldStateStore action dispatch, snapshot determinism, debug gating

### Integration Tests
- Simulated event bus pipeline verifying `quest:*` and `story:*` events update store, emit `worldstate:updated`
- SaveManager parity test comparing legacy scrape output vs store snapshot
- Quest/Tutorial overlay harness (Phase 2)

### Performance Tests
- `benchmarks/state-store-prototype.js` updated with production reducers; fail if mean dispatch >0.25 ms.

## Rollout Plan
1. Implement Phase 0 scaffolding + unit tests.
2. Integrate event subscriptions and SaveManager serialization.
3. Update benchmarks and UI overlays to consume selectors.
4. Run Jest + benchmark suite; profile if dispatch exceeds threshold.
5. Document store usage in developer guide; ensure backlog updated.
6. Schedule Playwright quest regression once UI integration lands.

## Risk Assessment
1. **Risk**: Event payload mismatch causing reducer failures  
   - Mitigation: Schema validation + descriptive errors in store dispatch  
   - Likelihood: Medium, Impact: High
2. **Risk**: Dual data sources (managers + store) desync during transition  
   - Mitigation: Invariant tests comparing manager output to selectors; log discrepancies in dev  
   - Likelihood: Medium, Impact: Medium
3. **Risk**: Selector performance regressions under heavy narrative load  
   - Mitigation: Memoization + benchmark guardrails  
   - Likelihood: Low, Impact: Medium

## Success Metrics
- Store dispatch & selector unit tests pass (≥90% coverage for state modules)
- `node benchmarks/state-store-prototype.js` reports <0.25 ms mean dispatch
- SaveManager parity test verifies serialized snapshot matches legacy scrape
- Store exposes deterministic snapshot consumed by SaveManager without runtime errors
- Narrative systems gain observable state for branching QA tooling
