# Quest Trigger Migration Plan

## Context
- Research reports consulted: _None available for trigger migration; will note gap._
- Architecture decisions consulted: Trigger schema documentation (`docs/tech/trigger-authoring.md`) and Session 77 implementation of `TriggerSystem`.
- Current system state:
  - Memory Parlor scenes use the standardized `Trigger` component with structured `area:entered`/`area:exited` events and quest metadata.
  - Act 1 crime scene and vendor interactions still rely on legacy `InteractionZone` flows that emit custom events without schema alignment.
  - `QuestSystem` now consumes trigger payloads but still contains compatibility paths for legacy events.
- Problem being solved: Migrate remaining Act 1 triggers to the new schema, ensuring consistent quest progression, telemetry, and documentation for designers.

## Architecture Overview
```
Legacy InteractionZone Events ──┐
                                ├─> TriggerMigrationToolkit → Trigger authoring helpers
Quest Metadata Registry ────────┘                 │
                                                  ▼
Standard Trigger Components → TriggerSystem → QuestSystem / Audio / UI
```

### Component Breakdown
Component 1: `TriggerMigrationToolkit`

- **Purpose**: Provide utilities to convert legacy trigger definitions into the standardized schema.
- **Responsibilities**:
  - Map legacy interaction metadata (prompt text, quest ids) to `Trigger` component configuration.
  - Offer helper `createQuestTriggerZone(entityId, config)` for consistent authoring across scenes.
  - Track migration coverage for reporting (e.g., debug flag listing unmigrated triggers).
- **Dependencies**:
  - `ComponentRegistry` to attach `Trigger` components.
  - `QuestSystem` for metadata validation.
  - Optional `GameConfig.triggers` overrides.
- **Interface**:
  ```javascript
  class TriggerMigrationToolkit {
    constructor(componentRegistry, eventBus);
    migrateInteractionZone(entityId, legacyConfig);
    createQuestTrigger(entityId, options);
    listOutstandingMigrations();
  }
  ```
- **Events**: None; works through component registration.
- **Testing**: Unit tests verifying mapping correctness and outstanding migration tracking.

Component 2: `QuestTriggerRegistry`

- **Purpose**: Centralised metadata store describing quest/objective trigger requirements.
- **Responsibilities**:
  - Maintain definitions for Act 1 triggers (crime scene, vendor interactions) with area IDs and objective IDs.
  - Provide queries for designers/tests to ensure metadata remains consistent.
- **Dependencies**:
  - Narrative quest data (`src/game/data/quests/act1Quests.js`).
  - Trigger toolkit for application.
- **Interface**:
  ```javascript
  export const QuestTriggerRegistry = {
    getTriggerDefinition(triggerId) {},
    listByQuest(questId) {},
    markMigrated(triggerId) {},
  };
  ```
- **Events**: None; static data structure.
- **Testing**: Snapshot tests verifying registry completeness and schema.

Component 3: `QuestTriggerValidator` (test harness)

- **Purpose**: Validate migrated triggers emit correct events and quest progression updates accordingly.
- **Responsibilities**:
  - Provide utilities for Jest tests to simulate `area:entered` events and assert quest state.
  - Ensure once-only triggers disable correctly and vendor triggers reset on exit.
- **Dependencies**:
  - `QuestSystem`.
  - `EventBus`.
- **Interface**:
  ```javascript
  function createQuestTriggerTestHarness();
  ```
- **Events**: Consumes `area:entered`, `area:exited`.
- **Testing**: Integration tests built on the harness (self-validated).

### Data Flow
- Designer registers quest trigger definition in `QuestTriggerRegistry`.
- Scene loader uses `TriggerMigrationToolkit.createQuestTrigger()` to attach standardized `Trigger` component alongside prompts.
- Player enters trigger volume → `TriggerSystem` emits `area:entered` with metadata → `QuestSystem` updates objectives and optionally instructs audio/UI systems.
- On exit, `TriggerSystem` emits `area:exited` → `QuestSystem` resets state if trigger marked reusable.

## Implementation Order

Phase 1: Registry & toolkit scaffolding (Est: 2 hours)
- Files: `src/game/quests/QuestTriggerRegistry.js`, `src/game/quests/TriggerMigrationToolkit.js`, unit tests.
- Success criteria: Toolkit converts legacy config to new schema; registry lists outstanding triggers.

Phase 2: Scene migration (Est: 3 hours)
- Modified files: `src/game/scenes/Act1Scene.js`, `src/game/entities/vendors/*.js`, `src/game/entities/CrimeSceneEvidence.js`.
- Success criteria: Act 1 crime scene and vendor triggers use toolkit; prompts intact; metadata matches registry.

Phase 3: QuestSystem cleanup & tests (Est: 2 hours)
- Files: `src/game/systems/QuestSystem.js`, `tests/game/systems/QuestSystem.trigger.test.js`, new suite `tests/game/scenes/Act1Scene.triggers.test.js`.
- Success criteria: Legacy event paths removed; tests assert quest progression and vendor reset flows.

Phase 4: Documentation & telemetry updates (Est: 1 hour)
- Files: `docs/tech/trigger-authoring.md`, `docs/guides/act1-authoring.md` (new).
- Success criteria: Docs show Act 1 examples; outstanding migration list empty.

## File Changes

### New Files
- `src/game/quests/QuestTriggerRegistry.js` – Structured definitions for quest trigger metadata.
- `src/game/quests/TriggerMigrationToolkit.js` – Helper utilities for standard trigger creation.
- `tests/game/quests/TriggerMigrationToolkit.test.js` – Coverage for migration helpers.
- `tests/game/scenes/Act1Scene.triggers.test.js` – Scene-level regression tests.
- `docs/guides/act1-authoring.md` – Designer guide summarising migrated triggers.

### Modified Files
- `src/game/scenes/Act1Scene.js` – Use toolkit for crime scene triggers, remove legacy interaction listeners.
- `src/game/entities/VendorEntity.js` (and vendor-specific factories) – Attach `Trigger` components via toolkit.
- `src/game/systems/QuestSystem.js` – Remove legacy compatibility code, rely on schema.
- `tests/game/systems/QuestSystem.trigger.test.js` – Extend coverage for vendor/crime scene flows.
- `docs/tech/trigger-authoring.md` – Append migration checklist and examples.

### Interface Definitions
```javascript
export function registerQuestTrigger(entityId, definition) {
  return new Trigger({
    id: definition.areaId,
    radius: definition.radius,
    once: definition.once,
    eventOnEnter: definition.eventOnEnter ?? 'area:entered',
    eventOnExit: definition.eventOnExit ?? 'area:exited',
    data: {
      areaId: definition.areaId,
      triggerType: definition.triggerType,
      questTrigger: true,
      questId: definition.questId,
      objectiveId: definition.objectiveId,
      prompt: definition.prompt,
    },
  });
}
```

## Performance Considerations
- Migration should not introduce per-frame overhead; toolkit operates during scene setup.
- Ensure registry lookups O(1) using maps keyed by trigger ID.
- Keep trigger metadata lightweight to avoid bloating event payloads (<1 KB recommended).

## Testing Strategy

### Unit Tests
- Toolkit mapping from legacy config to new schema.
- Registry lookups and outstanding migration tracking.

### Integration Tests
- Act 1 scene load followed by simulated player entry ensures quests advance correctly.
- Vendor interaction: enter → purchase → exit resets trigger and allows re-entry when expected.
- Ensure QuestSystem unsubscribes from legacy events without regressions.

### Performance Tests
- Spot-check trigger setup time (target <2 ms per trigger during scene load).

## Rollout Plan
1. Implement registry/toolkit and migrate one trigger as pilot (crime scene barricade).
2. Run Jest suites to confirm quest progression.
3. Migrate remaining Act 1 triggers; update docs concurrently.
4. Remove legacy compatibility paths from QuestSystem.
5. Update backlog (close QUEST-442) and note telemetry readiness.

## Risk Assessment
1. **Risk**: Quest regressions if metadata mismatched.
   - Mitigation: Registry centralizes definitions with tests; integration smoke before rollout.
   - Likelihood: Medium
   - Impact: High
2. **Risk**: Designers confused during transition.
   - Mitigation: Provide `docs/guides/act1-authoring.md` with side-by-side before/after examples.
   - Likelihood: Medium
   - Impact: Medium
3. **Risk**: Vendor triggers require bespoke behaviour (e.g., currency checks).
   - Mitigation: Toolkit supports `onEnter` callbacks or event chaining for vendor-specific logic.
   - Likelihood: Low
   - Impact: Medium

## Success Metrics
- All Act 1 triggers registered in `QuestTriggerRegistry` and flagged as migrated.
- Jest integration suites confirm quest progression and vendor resets without failures.
- Designers report consistent authoring experience using the standardized schema.
- Telemetry for trigger events aligns with Memory Parlor schema (area IDs, quest metadata present).
