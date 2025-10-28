# Centralized Game State Management — Comparative Analysis

**Author**: Codex Autonomous Agent  
**Date**: 2025-10-28  
**Related Sessions**: #15 (ECS inheritance fix), #16 (state management research)  
**Problem Owner**: Architecture & Save/Quest feature teams  

---

## Context
- Session #15 revealed that the current event-only architecture provides no single source of truth for quest, dialogue, faction, or progression state. Silent failures resurfaced because there is no authoritative store to interrogate.
- Save/load relies on scraping disparate managers, complicating serialization and regression testing.
- We target 60 FPS with dense narrative branching. Any solution must answer `what is the current game state?` in <1 ms, integrate with the existing ECS/EventBus, and support long-term observability plus tooling (quest debugger, narrative replay, QA automation).

---

## Requirements Snapshot
1. **State Authority** — deterministic answers for quests, story flags, faction reputation, active dialogue, player build, procedural seeds.
2. **Observability** — inspect last event, applied reducers, current subscribers, and pending reactions.
3. **Deterministic Save/Load** — single structure to serialize/restore; incremental autosave support.
4. **Tooling Hooks** — expose query API for playtest dashboards and designer tooling.
5. **Performance** — <1 ms state queries, <0.25 ms per write on average, zero GC spikes in hot loops.
6. **Progressive Adoption** — no Big Bang rewrite; systems migrate incrementally.

---

## Option A — Redux-Style Immutable Store

**Concept**: Introduce a single `GameStore` (Redux-like) holding normalized state slices. Systems dispatch actions; reducers apply immutable updates, enabling time-travel debugging and deterministic snapshots.

**Integration Points**
- `GameStore` instantiated in `Game.js`, shared across systems, managers, and UI overlays.
- Systems dispatch actions inside `update` or event handlers.
- Selectors feed UI overlays, SaveManager, analytics instrumentation.

**Strengths**
- Built-in audit trail (`action -> state diff`).
- Excellent fit for narrative tooling: time travelling, diffing branches, deterministic replay.
- Natural home for derived selectors (quest summaries, branching checkpoints).
- Easy serialization (`JSON.stringify(store.getState())`).

**Weaknesses**
- Immutable updates allocate frequently; careful slice-level reducers needed to avoid large copies.
- ECS systems must remain stateless; reducers add indirect indirection (action -> reducer -> ECS).
- Without memoized selectors, UI components could re-render too often.
- Requires discipline to avoid dispatches during deep render loops (otherwise GC churn).

**Bench Prototype (Node v20.11, macOS M2)**  
Baseline data: 120 quests, 240 flags, 12 factions.

| Operation | Mean Time | Min | Max | Notes |
|-----------|-----------|-----|-----|-------|
| `dispatch` ×500 | **0.0036 ms** | 0.0005 ms | 0.4554 ms | Immutable copy per action |
| selector query ×200 | 0.0231 ms | 0.0134 ms | 0.2997 ms | Derived quest/flag/faction view |
| snapshot ×50 | 0.0968 ms | 0.0832 ms | 0.2255 ms | JSON serialization |
| serialized size | 48.8 KB | — | — | Normalized structure |

**Testing Hooks**
- Jest-friendly: reducers are pure functions.
- Easy to add story regression snapshots (`expect(store.getState()).toMatchObject(...)`).

---

## Option B — ECS-Integrated World State

**Concept**: Extend existing ECS/manager layer. World state lives in components/managers; `WorldStateFacade` gathers a read model on demand. Updates mutate components directly (no extra dispatch layer).

**Integration Points**
- `WorldStateFacade` sits next to `SystemManager`; queries the `ComponentRegistry`, managers, and systems.
- EventBus remains primary trigger; facade rebuilds derived view when requested or on schedule.
- SaveManager pulls from facade instead of contacting each manager separately.

**Strengths**
- Minimal disruption to current systems; they already mutate components.
- Mutations are in-place → low GC overhead and fast writes.
- Keeps ECS as single abstraction: entity data continues to be canonical.
- Lower learning curve for current contributors.

**Weaknesses**
- Read-model reconstruction cost grows with entity count; repeated queries risk >1 ms budgets.
- Harder to audit causality (need manual instrumentation to tie events to state mutations).
- Tooling must traverse component graphs manually; debugging cross-system flows remains complex.
- Snapshot diffing requires component ordering discipline for deterministic outputs.

**Bench Prototype**  
Same data volume as Option A.

| Operation | Mean Time | Min | Max | Notes |
|-----------|-----------|-----|-----|-------|
| component mutation ×500 | **0.0011 ms** | 0.0002 ms | 0.2620 ms | In-place update |
| facade query ×200 | 0.0244 ms | 0.0118 ms | 0.3565 ms | Iterates component maps |
| snapshot ×50 | 0.0997 ms | 0.0856 ms | 0.2153 ms | JSON of component arrays |
| serialized size | 52.2 KB | — | — | Includes component metadata |

**Testing Hooks**
- Requires harness to seed component registry before assertions.
- Harder to diff due to Map ordering; needs deterministic serialization helper.

---

## Option C — Recommended Hybrid: Event-Sourced World State Store

**Premise**: Combine deterministic store semantics with ECS-native data. Introduce a lightweight `WorldStateStore` that:
1. **Subscribes to EventBus** (event-sourced log).
2. **Mirrors authoritative snapshots** in normalized slices (quests, flags, factions, player build, procedural seeds, UI overlays).
3. **Provides selectors + time-travel** while keeping ECS components as source of truth for simulation.
4. **Persists action log & snapshots** for save/load and debugging.

### Architecture Overview
```
┌──────────┐      emits       ┌────────────────┐     reduces      ┌────────────────┐
│  Systems │ ───────────────▶ │ EventBus        │ ───────────────▶ │ WorldStateStore│
│ (ECS)    │                  │ (pub/sub)       │                 │ (event sourced)│
└──────────┘                  └────────────────┘                 └────────────────┘
      │                               │                                   │
      │ mutates components            │ snapshots actions                 │ selectors
      ▼                               ▼                                   ▼
┌────────────┐     query      ┌────────────────┐       feeds        ┌──────────────────┐
│ Components │──────────────▶ │ WorldStateFacade│ ────────────────▶ │ SaveManager / UI │
└────────────┘                └────────────────┘                    └──────────────────┘
                                        │
                                        ▼
                               ┌────────────────┐
                               │ Observability  │
                               │ (dev console,  │
                               │  debug tools)  │
                               └────────────────┘
```

### Key Traits
- **Dual-write**: systems continue mutating components; they also dispatch succinct events (`quest:state_changed`, `faction:reputation_delta`). Store reducers transform event payloads into normalized snapshots.
- **Deterministic selectors**: UI, SaveManager, narrative tools consume selectors (memoized via Reselect-like helpers).
- **Action log**: store keeps rolling window (configurable) for debugging/time travel; SaveManager can persist both the snapshot and tail of log for replays.
- **Observability bridge**: developer console overlay can query `WorldStateStore.inspect()` to review last N actions, ensure events were processed.

### Performance Outlook
- Writes cost ~0.004 ms (immutable operations) + event dispatch overhead already paid today.
- Reads remain <0.03 ms using memoized selectors.
- Snapshot cost on par with current SaveManager routine (<0.1 ms, 50 KB). Meets <1 ms requirement.

---

## Migration Strategy
1. **Phase 0 — Foundation (Est. 4h)**
   - Scaffold `WorldStateStore` with event subscription hooks.
   - Implement slices for quests, story flags, factions, tutorial, player build metadata.
   - Create selector library + memoization helpers.
   - Provide `worldStateStore.debug()` console output behind `__DEV__`.
2. **Phase 1 — High-Value Systems (Est. 6h)**
   - QuestSystem, DialogueSystem, TutorialSystem emit structured events.
   - SaveManager consumes store snapshot exclusively (stop direct manager scraping).
   - Add Jest tests covering reducers and selectors (fixture-based).
3. **Phase 2 — Full Coverage + Tooling (Est. 8h)**
   - Instrument InvestigationSystem, FactionReputationSystem, KnowledgeProgressionSystem.
   - Build developer HUD overlay (Quest/Story inspector).
   - Add Playwright scenario verifying quest log UI reflects store state.
4. **Phase 3 — Advanced Features (Est. 6h)**
   - Implement action replay & rollback (for QA).
   - Introduce analytics hooks (`worldStateStore.onAction`).
   - Integrate performance counters & alerting (detect stalled reducers).

---

## Testing Strategy
- **Unit**: Reducers/Selectors, action schema validators (ensure payload completeness).
- **Integration**: Simulated event flows verifying ECS mutation + store update remain consistent (use fixtures).
- **Performance**: Reuse `benchmarks/state-store-prototype.js` with live reducers to guard <0.5 ms action budget.
- **Tooling**: Snapshot tests for debug inspector; Playwright to ensure UI reflects store during quest progression.

---

## Risk & Mitigation
| Risk | Impact | Mitigation |
|------|--------|------------|
| Dual-write inconsistencies (component vs store) | Divergent state, bugs | Create invariant tests comparing selectors vs component queries; add lint rule for reducer payload schema |
| Reducer GC churn | Frame drops | Enforce slice-level updates + object pooling for large arrays; measure via benchmark suite per release |
| Tooling adoption lag | Observability gap persists | Prioritize dev HUD + console inspector in Phase 2; partner with narrative designers for feedback |
| Save/load regression | Corrupted saves | Run regression harness comparing new snapshot vs legacy SaveManager output before switching |

---

## Recommendation
Adopt the **Event-Sourced World State Store (Hybrid)**. It balances ECS familiarity with deterministic tooling, covers success criteria (sub-millisecond queries, auditable actions), and aligns with long-term narrative goals (branch replay, quest debugger). Implement in phased rollout beginning with quest + narrative systems to maximize immediate observability gains.

---

## Next Actions
1. **Architecture Decision Record** — formalize hybrid store approach, capture reasoning vs pure Redux/ECS models.
2. **Implementation Plan** — update `docs/plans/roadmap.md` with Phase 0/1 tasks and estimates.
3. **Task Tickets** — add backlog items for scaffolding `WorldStateStore`, migrating Quest/Tutorial/Dialogue systems, and building debug inspector.
4. **Benchmark Integration** — wire `benchmarks/state-store-prototype.js` into CI perf suite to guard action/selector budgets.
5. **SaveManager Alignment** — prototype store-powered save serialization before deprecating manager scraping.

---

## Appendix — Prototype Benchmark Summary JSON

Results produced via `node benchmarks/state-store-prototype.js`:

```json
{
  "timestamp": "2025-10-28T07:23:30.397Z",
  "iterations": {
    "updates": 500,
    "queries": 200,
    "snapshots": 50
  },
  "results": [
    {
      "approach": "Redux-style immutable store",
      "updateTiming": {
        "total": 1.790570999999975,
        "mean": 0.00358114199999995,
        "min": 0.0004770000000000607,
        "max": 0.4554329999999993
      },
      "queryTiming": {
        "total": 4.611613000000009,
        "mean": 0.023058065000000044,
        "min": 0.013439000000001755,
        "max": 0.2997300000000003
      },
      "snapshotTiming": {
        "total": 4.840008000000022,
        "mean": 0.09680016000000044,
        "min": 0.08315900000000198,
        "max": 0.22545499999999663
      },
      "stateBytes": 49958
    },
    {
      "approach": "ECS-integrated world state",
      "updateTiming": {
        "total": 0.5633410000000012,
        "mean": 0.0011266820000000023,
        "min": 0.00021399999999971442,
        "max": 0.26204800000000006
      },
      "queryTiming": {
        "total": 4.883164000000026,
        "mean": 0.02441582000000013,
        "min": 0.011801999999995871,
        "max": 0.35649700000000095
      },
      "snapshotTiming": {
        "total": 4.985488999999987,
        "mean": 0.09970977999999973,
        "min": 0.08559599999999534,
        "max": 0.21526999999999674
      },
      "stateBytes": 53452
    }
  ]
}
```

