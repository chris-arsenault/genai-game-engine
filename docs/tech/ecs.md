# Entity Component System Enhancements

## Overview
- **Scope**: Core ECS lifecycle (EntityManager + ComponentRegistry) and physics broad-phase (`SpatialHash`)
- **Sprint**: 8 – Final Polish & Production
- **Related backlog items**: `M1-002` EntityManager Implementation, `M1-012` Spatial Hash Implementation
- **Context**: Enhancements align with `docs/plans/ecs-core-enhancement-plan.md` and architecture decision `ECS Core Enhancement (EntityManager + SpatialHash)`

## Entity Lifecycle
- Pooled entity metadata eliminates GC churn during spawn/despawn waves (10k create/destroy <200 ms on CI hardware)
- Tag index tracks faction/story states for quick lookup
- Destroy pipeline notifies listeners (quest triggers, analytics) and forwards cleanup to `ComponentRegistry.removeAllComponents`
- `queryByComponents(...types)` bridges to `ComponentRegistry` for optimized AND queries; falls back to local component sets when registry unavailable
- `forEachEntity` helper iterates active/inactive entities for scenario scripting and profiling
- `getStats()` exposes instrumentation (`created`, `recycled`, `pooledReused`, `poolSize`, `active`) for debugging leaks or narrative wave pacing

### Usage
```javascript
const entityManager = new EntityManager();
const componentRegistry = new ComponentRegistry(entityManager);

const guard = entityManager.createEntity('security');
componentRegistry.addComponent(guard, new PositionComponent({ x: 10, y: 20 }));
componentRegistry.addComponent(guard, new FactionComponent({ factionId: 'wraith-network' }));

const stealthTargets = entityManager.queryByComponents('PositionComponent', 'FactionComponent');
```

## Component Registry Touchpoints
- Constructor auto-binds supplied `EntityManager` via `setComponentRegistry`
- `getComponentsForEntity(entityId)` returns a `Map` of component instances for serialization / debugging overlays
- `getComponentSignature(entityId)` provides a canonical `Set` for bitset derivation or inspector UIs
- `clear()` now purges entity component signatures to keep metadata and query caches aligned during scene transitions

## Spatial Hash Upgrades
- Stores per-entity cell occupancy for fast `update`/`remove` without full rebuilds
- `insert` replaces prior occupancy to prevent phantom collisions; `update` diffs old/new cells for minimal churn
- `rebuild(entityIds, getBounds)` supports full scene regeneration (e.g., procedural dungeon reload)
- `getMetrics()` surfaces `cellCount`, `maxBucketSize`, `trackedEntities`, and cumulative operation counters for profiling stealth density and crowd scenes

### Usage
```javascript
const spatialHash = new SpatialHash(64);
spatialHash.insert(entityId, bounds.x, bounds.y, bounds.width, bounds.height);

// During movement
spatialHash.update(entityId, nextBounds.x, nextBounds.y, nextBounds.width, nextBounds.height);

const nearby = spatialHash.query(playerBounds.x - 32, playerBounds.y - 32, 64, 64);
```

## Narrative Hook Integration
- Destroy listeners can emit quest/NPC state changes (e.g., inform `QuestManager` when key witness despawns)
- Component signatures track narrative traits (`Investigation`, `Disguise`, `FactionStanding`) so systems can quickly target relevant entities during branching beats
- Spatial hash metrics feed adaptive pacing (crowd density, stealth detection windows) while maintaining 60 FPS targets

## Verification
- `npm test` (Jest) validates new ECS + SpatialHash functionality and regression suites
- Performance assertions enforce 10k entity churn <200 ms and 1000 entity spatial queries <10 ms
- Integration suites (Engine + Quest/Movement) passed after upgrade; no regressions observed

## Next Steps
1. Wire destroy listeners to quest/faction analytics hooks (`QuestManager`, `FactionManager`) for automatic book-keeping.
2. Extend inspector tooling to surface `entityManager.getStats()` and `spatialHash.getMetrics()` for live debugging.
3. Profile stealth-heavy scenes using new metrics to confirm bucket load stays below 16 entities.
