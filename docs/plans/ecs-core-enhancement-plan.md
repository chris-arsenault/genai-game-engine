# ECS Core Enhancement Implementation Plan

## Context
- Research consulted: Existing ECS architecture decisions (`Entity-Component-System (ECS) Architecture`, `ECS Architecture for The Memory Syndicate`).
- Current system state: `EntityManager`/`ComponentRegistry` provide basic lifecycle management and component queries, but lack pooled metadata, lifecycle hooks for clean component teardown, and direct component query APIs; `SpatialHash` supports insert/query only.
- Problem being solved: Achieve backlog acceptance criteria for `M1-002` (EntityManager) and `M1-012` (SpatialHash) by adding high-volume lifecycle performance safeguards, removal/update APIs, and system-facing hooks that keep component, physics, and narrative state in sync.

## Architecture Overview
Entity creation → `EntityManager` (pooled metadata, tag + component bitset cache)  
EntityManager ↔ `ComponentRegistry` (lifecycle hooks, query bridging)  
Entity positions → `SpatialHash` (insert/update/remove)  
Spatial queries → Movement/Collision Systems (receives nearby IDs)  
Destroy entity → EntityManager → ComponentRegistry.removeAll + SpatialHash.remove  
Clear world → EntityManager.clearPool + ComponentRegistry.clear + SpatialHash.clear

### Component Breakdown
**Component 1: EntityManager (Enhanced)**
- Purpose: Manage pooled entity metadata, lifecycle, tags, narrative hooks.
- Responsibilities: Allocate IDs via pool, track active/inactive states, maintain tag + component signature indices, expose query API bridging to `ComponentRegistry`, notify listeners on destroy/clear.
- Dependencies: `ComponentRegistry` (for lifecycle notifications), optional `EventBus`.
- Interface:
```javascript
class EntityManager {
  constructor({ maxEntities, onEntityDestroyed } = {}) {}
  createEntity(tag) {}
  destroyEntity(entityId, { removeComponents } = {}) {}
  queryByComponents(...componentTypes) {}
  forEachEntity(callback, { includeInactive } = {}) {}
}
```
- Events: Emits `entityDestroyed`, `entityCleared`; listens for `componentAttached` via registry injection.
- Testing: Lifecycle, pooling, queries, performance (10k entities <100ms).

**Component 2: EntityMetadataPool**
- Purpose: Object pool ensuring zero-GC churn during heavy spawn/despawn waves.
- Responsibilities: Provide reusable metadata records (id, active, tag, component signature bitset, narrative flags).
- Dependencies: Managed internally by EntityManager.
- Interface:
```javascript
class EntityMetadataPool {
  acquire(id) {}
  release(metadata) {}
}
```
- Events: None (internal helper).
- Testing: Covered via EntityManager tests (pool retains <5% surplus after churn).

**Component 3: ComponentRegistry (Augmented)**
- Purpose: Synchronize component lifecycle with EntityManager, maintain query caches.
- Responsibilities: Accept explicit `removeAllComponents`, surface `getComponentsForEntity`, expose `getEntitiesMatchingSignature` for bitset compatibility.
- Dependencies: EntityManager injection.
- Interface:
```javascript
class ComponentRegistry {
  getComponentsForEntity(entityId) {}
  getComponentSignature(entityId) {}
}
```
- Events: Invalidates cache on component change; listens to EntityManager clear/destroy.
- Testing: Existing suite + new coverage for `getComponentsForEntity`.

**Component 4: SpatialHash (Complete)**
- Purpose: Broad-phase collision accelerator with insert/update/remove lifecycle.
- Responsibilities: Track axis-aligned bounds per entity, support updates after movement, allow bulk rebuilds, and expose instrumentation metrics.
- Dependencies: None (pure data structure).
- Interface:
```javascript
class SpatialHash {
  insert(entityId, bounds) {}
  update(entityId, bounds) {}
  remove(entityId) {}
  query(bounds) {}
  stats() {}
}
```
- Events: Optional debug metrics pass to profiler.
- Testing: Insert/update/remove flows, rebuild vs incremental, performance budget (<1ms rebuild for 1000 entities).

### Data Flow
Player input → Movement System updates Position component → ComponentRegistry marks component dirty → SpatialHash.update(entityId, bounds) updates cell occupancy → Collision system queries SpatialHash for nearby entities → Results drive detection + narrative triggers (e.g., faction suspicion) → Quest/Narrative managers listen for `entityDestroyed` to resolve objectives → EntityManager.destroyEntity removes components + evicts from SpatialHash → Renderer/UI refresh based on entity active list.  
Procedural spawn (level load) → EntityManager.createEntity (pooled) → Components attached → ComponentRegistry updates signatures → SpatialHash.insert with spawn bounds.

## Implementation Order
**Phase 1: EntityManager lifecycle/pooling (Est: 3h)**
- Files: `src/engine/ecs/EntityManager.js`, `tests/engine/ecs/EntityManager.test.js`, `src/engine/ecs/index.js`
- Tasks: Add metadata pool, component signature bitset, destroy hooks, component query API, bulk iteration helpers, recycling metrics.
- Success: 10k create/destroy cycles <150ms, zero leaked tags/components, tests cover pooling + queries.

**Phase 2: ComponentRegistry integration (Est: 1h)**
- Files: `src/engine/ecs/ComponentRegistry.js`, tests.
- Tasks: Provide `getComponentsForEntity`, `getComponentSignature`, register destroy listener to purge components, ensure query cache resets on entity clear.
- Success: Destroying entity removes all components, query caches remain consistent.

**Phase 3: SpatialHash update/remove (Est: 2h)**
- Files: `src/engine/physics/SpatialHash.js`, `tests/engine/physics/SpatialHash.test.js`.
- Tasks: Track per-entity cell occupancy, implement update/remove, add stats + bulk rebuild, tighten performance tests (1000 entities <5ms query).
- Success: Remove/update keep hash consistent, query performance meets acceptance criteria.

**Phase 4: Documentation & profiling hooks (Est: 1h)**
- Files: `docs/tech/ecs.md` (new/updated), `docs/plans/backlog.md` sync, backlog items `M1-002`, `M1-012` updates.
- Tasks: Document new APIs, profile instructions, note narrative hooks.
- Success: Docs reflect lifecycle + SpatialHash usage; backlog statuses moved to `in-review` or `done`.

## File Changes
**New Files**
- `src/engine/ecs/EntityMetadataPool.js` – pooled metadata helper (optional if embedded).

**Modified Files**
- `src/engine/ecs/EntityManager.js` – add pooling, component query bridging, destroy hooks.
- `src/engine/ecs/ComponentRegistry.js` – expose entity component retrieval + signature, listen to entity lifecycle.
- `src/engine/ecs/index.js` – export helpers if added.
- `src/engine/physics/SpatialHash.js` – add update/remove/stats.
- `tests/engine/ecs/EntityManager.test.js` – extend coverage to 10k performance + pooling invariants.
- `tests/engine/physics/SpatialHash.test.js` – add update/remove cases + performance assertions.
- `docs/tech/ecs.md` – technical overview (new or updated).
- `docs/plans/backlog.md` – reflect completion.

## Interface Definitions
```javascript
class EntityManager {
  createEntity(tag, options = {}) {}
  destroyEntity(entityId, options = {}) {}
  setTag(entityId, tag) {}
  getTag(entityId) {}
  activate(entityId) {}
  deactivate(entityId) {}
  queryByComponents(...componentTypes) {}
  getEntitySignature(entityId) {}
  clear({ keepPool } = {}) {}
}

class SpatialHash {
  insert(entityId, bounds) {}
  update(entityId, bounds) {}
  remove(entityId) {}
  query(bounds) {}
  rebuild(entities, boundsResolver) {}
  clear() {}
}
```

## Performance Considerations
- Entity metadata pooling avoids per-frame object allocation; pool capacity auto-grows but shrinks on long idle to cap memory.
- Component signature stored as `BigInt` bitset for up to 64 component families; fallback to Set when exceeding.
- SpatialHash update uses diffed cell occupancy to minimize churn; optional instrumentation to check bucket load factors (<16 entities per cell ideal).
- Profiling points: spawn bursts (10k entities), destruction waves, spatial hash rebuild vs incremental updates.
- Stress scenarios: quest scenes spawning many NPCs, stealth infiltration with high collision checks, narrative branches toggling entity activation repeatedly.

## Testing Strategy
### Unit Tests
- EntityManager: pooling reuse after 10k churn, queryByComponents accuracy, destroy clears components, performance timers (guarded).
- ComponentRegistry: `getComponentsForEntity`, signature generation, cache invalidation on destroy/clear.
- SpatialHash: update/remove behaviour, stats output, rebuild parity with incremental insert.

### Integration Tests
- Game loop integration: spawn/destroy waves across Movement + Collision systems verifying SpatialHash consistency.
- Quest trigger tests ensuring entity destroy events propagate narrative hooks.

### Performance Tests
- Benchmarks for 10k create/destroy cycles (<150ms) and 1000 entity spatial queries (<5ms).
- Memory snapshots to confirm pool reuse (no >10% growth after clear).

## Rollout Plan
1. Implement EntityManager pooling/query features.
2. Update ComponentRegistry + tests.
3. Expand SpatialHash lifecycle functionality.
4. Run `npm test` + targeted benchmarks (optional script).
5. Update docs/backlog, capture profiling metrics.
6. Store architecture decision referencing ECS enhancement.
7. Prepare handoff with performance data and outstanding art/telemetry reminders.

## Risk Assessment
1. **Risk**: Pooling bugs causing stale metadata references.
   - Mitigation: Comprehensive tests, ensure pool resets on clear, guard reentrancy.
   - Likelihood: Medium, Impact: High.
2. **Risk**: SpatialHash update/remove drift leading to phantom collisions.
   - Mitigation: Maintain per-entity cell index map, cross-validate with rebuild in tests.
   - Likelihood: Medium, Impact: High.
3. **Risk**: Performance tests flaky under CI variance.
   - Mitigation: Use generous thresholds + skip timers under CI flag if needed.

## Success Metrics
- Entity lifecycle tests pass with 10k create/destroy meeting time budget.
- SpatialHash maintains <1000 collision checks for 1000 entities with query windows (98%+ reduction vs naive).
- Coverage >80% for ECS core modules.
- Narrative/quest tests unaffected (no regressions).
- Documentation and backlog updated; architecture decision stored referencing enhancements.
