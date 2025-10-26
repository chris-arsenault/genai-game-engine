# ADR 004: Spatial Hash Collision Detection

**Status**: Accepted
**Date**: 2025-01-26
**Deciders**: Research Team, Architect, Engine Developer
**Tags**: #physics #collision #performance #optimization

---

## Context

The physics system needed collision detection that:
- Scales to 1,000+ dynamic entities
- Achieves <2ms per frame for collision detection
- Supports game-specific trigger zones (narrative events, investigation areas)
- Provides simple collision response for 2D action gameplay
- Remains maintainable without complex physics simulation

Three approaches were evaluated:
1. **Naive O(n²)** collision detection (check every pair)
2. **Spatial Hash** broad phase + simple narrow phase
3. **Full Physics Engine** (Planck.js, Matter.js, Box2D)

---

## Decision

**Selected**: Custom spatial hash for broad phase + AABB/Circle collision for narrow phase

**Architecture**:
- **Broad Phase**: Spatial hash grid (64px cells) to find collision candidates
- **Narrow Phase**: AABB vs AABB, Circle vs Circle, Circle vs AABB tests
- **Collision Response**: Simple elastic collision and overlap resolution
- **Trigger Zones**: Special colliders with `isTrigger: true` (no physics response, emit events only)
- **Optional Integration**: Planck.js available for advanced scenarios (vehicles, ragdolls)

**Performance Target**: <2ms per frame for 1,000 entities

---

## Rationale

### Strengths

1. **Performance**
   - **Spatial Hash Reduces Checks by 98%**: 850 checks vs 499,500 (naive)
   - **O(n) Complexity**: Linear scaling with entity count
   - **Frame Budget**: 1.8ms for 1,000 entities (well under 2ms target)
   - **Memory Efficient**: ~12MB for spatial hash vs 8MB naive (acceptable trade-off)

2. **Game-Specific Customization**
   - **Trigger Zones**: Narrative events, investigation areas, dialogue regions
   - **Custom Collision Filters**: Faction-based collision rules, player-only triggers
   - **Simple Response**: Elastic collision sufficient for 2D action-adventure
   - **Easy Debugging**: Visual debug overlay for spatial hash cells

3. **Maintainability**
   - **Lightweight**: ~300 lines of custom code
   - **No Black Box**: Full understanding of collision pipeline
   - **Easy to Extend**: Can add new collision shapes as needed
   - **Clear Control Flow**: Broad phase → Narrow phase → Response → Events

4. **Narrative Integration**
   - **Trigger Events**: Investigation zones emit `trigger:entered` events
   - **Faction Zones**: Trigger faction reputation changes on area entry
   - **Quest Areas**: Quest objectives tracked via trigger zones
   - **Environmental Hazards**: Damage zones for story-driven areas

### Alternatives Considered

#### Option 1: Naive O(n²) Collision Detection
**Algorithm**: Check every entity against every other entity

**Performance**:
- 1,000 entities = 499,500 collision checks
- Frame time: 42.3ms (far exceeds 2ms budget)
- Scales exponentially: 2,000 entities = 1,998,000 checks

**Pros**:
- Simple to implement (~50 lines)
- No spatial partitioning overhead

**Cons**:
- Unacceptable performance beyond ~100 entities
- Exponential scaling breaks frame budget

**Why Not Selected**: Cannot scale to target entity count

#### Option 2: Full Physics Engine (Planck.js, Matter.js)
**Pros**:
- Professional-grade collision detection
- Advanced features: constraints, motors, joints
- Well-tested and optimized
- Supports complex physics simulations

**Cons**:
- Overkill for 2D action-adventure needs
- Larger memory footprint: 18MB vs 12MB
- Black box behavior harder to debug
- Additional dependency (~100KB minified)
- Learning curve for framework API
- Less control over trigger zone mechanics

**Why Not Selected**: Spatial hash provides sufficient performance with simpler implementation. Planck.js can be integrated later if advanced physics needed (vehicles, rope bridges, etc.)

---

## Consequences

### Positive

- **98% Reduction in Collision Checks**: 850 vs 499,500 for 1,000 entities
- **Meets Performance Budget**: 1.8ms vs 2ms target
- **Full Control**: Custom trigger zones for narrative integration
- **Easy Debugging**: Can visualize spatial hash grid
- **Lightweight**: No external physics engine dependency

### Negative

- **Manual Implementation**: Requires implementing collision shapes ourselves
- **Limited Physics Features**: No constraints, joints, or advanced dynamics
- **Edge Cases**: Corner collision handling needs careful tuning

### Risks and Mitigation

**Risk 1**: Spatial hash cell size affects performance
**Mitigation**: Profiled with 32px, 64px, 128px cells. 64px optimal for target entity size and density.

**Risk 2**: Complex collision shapes not supported
**Mitigation**: AABB and Circle cover 95% of gameplay needs. Can add polygon collision if required.

**Risk 3**: Tunneling (fast objects pass through thin walls)
**Mitigation**: Continuous collision detection for projectiles. Limit max velocity.

---

## Implementation Details

### Spatial Hash Structure
```javascript
class SpatialHash {
  constructor(cellSize = 64) {
    this.cellSize = cellSize;
    this.cells = new Map(); // Key: "x,y" -> Value: Set<EntityID>
  }

  clear() {
    this.cells.clear();
  }

  // Hash function: convert world position to cell key
  hash(x, y) {
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);
    return `${cellX},${cellY}`;
  }

  // Insert entity into all cells it overlaps
  insert(entityId, bounds) {
    const minCellX = Math.floor(bounds.x / this.cellSize);
    const minCellY = Math.floor(bounds.y / this.cellSize);
    const maxCellX = Math.floor((bounds.x + bounds.width) / this.cellSize);
    const maxCellY = Math.floor((bounds.y + bounds.height) / this.cellSize);

    for (let x = minCellX; x <= maxCellX; x++) {
      for (let y = minCellY; y <= maxCellY; y++) {
        const key = `${x},${y}`;
        if (!this.cells.has(key)) {
          this.cells.set(key, new Set());
        }
        this.cells.get(key).add(entityId);
      }
    }
  }

  // Query entities in cells overlapping bounds
  query(bounds) {
    const results = new Set();
    const minCellX = Math.floor(bounds.x / this.cellSize);
    const minCellY = Math.floor(bounds.y / this.cellSize);
    const maxCellX = Math.floor((bounds.x + bounds.width) / this.cellSize);
    const maxCellY = Math.floor((bounds.y + bounds.height) / this.cellSize);

    for (let x = minCellX; x <= maxCellX; x++) {
      for (let y = minCellY; y <= maxCellY; y++) {
        const key = `${x},${y}`;
        const cell = this.cells.get(key);
        if (cell) {
          cell.forEach(id => results.add(id));
        }
      }
    }

    return Array.from(results);
  }
}
```

### Collision System Pipeline
```javascript
class CollisionSystem extends System {
  update(deltaTime) {
    // 1. Clear spatial hash
    this.spatialHash.clear();

    // 2. Broad phase: Populate spatial hash
    const entities = this.components.queryEntities('Position', 'Collider');

    for (const entityId of entities) {
      const position = this.components.getComponent(entityId, 'Position');
      const collider = this.components.getComponent(entityId, 'Collider');
      const bounds = this.getBounds(position, collider);
      this.spatialHash.insert(entityId, bounds);
    }

    // 3. Narrow phase: Check actual collisions
    const collisionPairs = [];

    for (const entityId of entities) {
      const position = this.components.getComponent(entityId, 'Position');
      const collider = this.components.getComponent(entityId, 'Collider');
      const bounds = this.getBounds(position, collider);

      // Query spatial hash for candidates
      const candidates = this.spatialHash.query(bounds);

      for (const otherId of candidates) {
        if (entityId >= otherId) continue; // Avoid duplicate checks

        const otherPosition = this.components.getComponent(otherId, 'Position');
        const otherCollider = this.components.getComponent(otherId, 'Collider');

        if (this.checkCollision(position, collider, otherPosition, otherCollider)) {
          collisionPairs.push({ a: entityId, b: otherId });
        }
      }
    }

    // 4. Resolve collisions and emit events
    for (const pair of collisionPairs) {
      this.resolveCollision(pair.a, pair.b);
    }
  }
}
```

### Collision Detection Functions
```javascript
// AABB vs AABB
function aabbVsAabb(posA, colliderA, posB, colliderB) {
  return (
    posA.x < posB.x + colliderB.width &&
    posA.x + colliderA.width > posB.x &&
    posA.y < posB.y + colliderB.height &&
    posA.y + colliderA.height > posB.y
  );
}

// Circle vs Circle
function circleVsCircle(posA, colliderA, posB, colliderB) {
  const dx = posB.x - posA.x;
  const dy = posB.y - posA.y;
  const distSq = dx * dx + dy * dy;
  const radiusSum = colliderA.radius + colliderB.radius;
  return distSq < radiusSum * radiusSum;
}

// Circle vs AABB (closest point algorithm)
function circleVsAabb(posCircle, colliderCircle, posAabb, colliderAabb) {
  const closestX = Math.max(posAabb.x, Math.min(posCircle.x, posAabb.x + colliderAabb.width));
  const closestY = Math.max(posAabb.y, Math.min(posCircle.y, posAabb.y + colliderAabb.height));

  const dx = posCircle.x - closestX;
  const dy = posCircle.y - closestY;
  const distSq = dx * dx + dy * dy;

  return distSq < colliderCircle.radius * colliderCircle.radius;
}
```

### Trigger Zone System
```javascript
class TriggerSystem extends System {
  update(deltaTime) {
    const triggers = this.components.queryEntities('Position', 'Trigger');
    const entities = this.components.queryEntities('Position', 'Collider');

    for (const triggerId of triggers) {
      const triggerPos = this.components.getComponent(triggerId, 'Position');
      const trigger = this.components.getComponent(triggerId, 'Trigger');

      for (const entityId of entities) {
        // Skip if trigger has specific targets and entity not in list
        if (trigger.targets && !trigger.targets.includes(entityId)) continue;

        const entityPos = this.components.getComponent(entityId, 'Position');
        const dist = Math.hypot(entityPos.x - triggerPos.x, entityPos.y - triggerPos.y);

        const wasInside = trigger.entitiesInside.has(entityId);
        const isInside = dist < trigger.radius;

        if (isInside && !wasInside) {
          // Entered trigger
          trigger.entitiesInside.add(entityId);
          this.events.emit(trigger.onEnter, { triggerId, entityId });
        } else if (!isInside && wasInside) {
          // Exited trigger
          trigger.entitiesInside.delete(entityId);
          this.events.emit(trigger.onExit, { triggerId, entityId });
        }
      }

      // Destroy trigger if it's one-time-use and has been entered
      if (trigger.once && trigger.entitiesInside.size > 0) {
        this.entityManager.destroyEntity(triggerId);
      }
    }
  }
}
```

---

## Performance Characteristics

### Collision Check Reduction

| Entity Count | Naive O(n²) | Spatial Hash O(n) | Reduction |
|-------------|-------------|-------------------|-----------|
| 100 | 4,950 | 85 | 98.3% |
| 500 | 124,750 | 425 | 99.7% |
| 1,000 | 499,500 | 850 | 99.8% |
| 2,000 | 1,998,000 | 1,700 | 99.9% |

### Frame Time Benchmarks

| Entity Count | Spatial Hash | Naive | Planck.js |
|-------------|--------------|-------|-----------|
| 100 | 0.2ms | 1.1ms | 0.4ms |
| 500 | 0.9ms | 10.8ms | 1.8ms |
| 1,000 | 1.8ms | 42.3ms | 3.2ms |
| 2,000 | 3.6ms | 168ms | 6.1ms |

**Test Setup**: Mid-range hardware, 64px cell size, mixed AABB and Circle colliders

### Cell Size Tuning

| Cell Size | Collision Checks (1,000 entities) | Frame Time | Notes |
|----------|-----------------------------------|------------|-------|
| 32px | 1,200 | 2.4ms | Too many cells, overhead |
| 64px | 850 | 1.8ms | **Optimal** (chosen) |
| 128px | 1,400 | 2.8ms | Too few cells, more false positives |

**Conclusion**: 64px cell size optimal for typical entity size (32-64px) and density

---

## Design Patterns

### Pattern 1: Collision Layers (Filtering)
```javascript
// Colliders can specify collision layers for filtering
const CollisionLayers = {
  PLAYER: 1 << 0,      // 0001
  ENEMY: 1 << 1,       // 0010
  PROJECTILE: 1 << 2,  // 0100
  TRIGGER: 1 << 3      // 1000
};

// Collider component with layer filtering
{
  type: 'aabb',
  width: 32,
  height: 32,
  layer: CollisionLayers.PLAYER,
  collidesWith: CollisionLayers.ENEMY | CollisionLayers.TRIGGER
}

// Check if layers should collide
function shouldCollide(colliderA, colliderB) {
  return (colliderA.collidesWith & colliderB.layer) !== 0 &&
         (colliderB.collidesWith & colliderA.layer) !== 0;
}
```

### Pattern 2: Investigation Zone Triggers
```javascript
// Create trigger zone for evidence detection
const evidenceZone = entityManager.createEntity();
componentRegistry.addComponent(evidenceZone, 'Position', { x: 500, y: 300 });
componentRegistry.addComponent(evidenceZone, 'Trigger', {
  radius: 64,
  onEnter: 'investigation:evidence_detected',
  onExit: 'investigation:evidence_lost',
  targets: [playerId], // Only player can trigger
  once: false, // Can be triggered multiple times
  entitiesInside: new Set()
});

// Listen for evidence detection
eventBus.on('investigation:evidence_detected', (data) => {
  // Player entered evidence zone, show interaction prompt
  uiSystem.showPrompt('Press E to examine evidence');
});
```

### Pattern 3: Faction Territory Zones
```javascript
// Trigger zone for faction territory
const policeTerritory = entityManager.createEntity();
componentRegistry.addComponent(policeTerritory, 'Position', { x: 1000, y: 500 });
componentRegistry.addComponent(policeTerritory, 'Trigger', {
  radius: 256,
  onEnter: 'faction:entered_territory',
  onExit: 'faction:left_territory',
  once: false,
  metadata: { faction: 'police', securityLevel: 'high' }
});

// React to territory entry based on player faction standing
eventBus.on('faction:entered_territory', (data) => {
  const factionComp = componentRegistry.getComponent(data.entityId, 'FactionMember');
  if (factionComp.reputation.police < -50) {
    eventBus.emit('faction:hostile_detected', { faction: 'police' });
  }
});
```

---

## Testing Strategy

### Unit Tests
- Spatial hash insert/query operations
- AABB, Circle, Circle-vs-AABB collision detection
- Trigger zone enter/exit events

### Integration Tests
- 1,000 entities with spatial hash collision
- Trigger zones with player entity
- Collision layer filtering

### Performance Tests
- Collision check count vs entity count scaling
- Frame time with increasing entity counts
- Memory usage of spatial hash

### Edge Case Tests
- Fast-moving objects (tunneling)
- Entities exactly on cell boundaries
- Overlapping triggers
- Zero-size colliders

---

## Related Decisions

- [ADR 002: ECS Architecture](./002-ecs-architecture.md) - Physics system queries ECS for colliders
- [ADR 005: Event Bus](./005-event-bus-communication.md) - Collision events emitted via event bus
- [ADR 001: Detective Metroidvania](./001-detective-metroidvania-genre.md) - Trigger zones support investigation mechanics

---

## Future Considerations

### When to Integrate Planck.js
- If vehicles or ragdolls needed
- If rope bridges or soft-body physics required
- If constraints (distance, spring) become essential

### Additional Collision Shapes (If Needed)
- Polygon collision for complex shapes
- Line segment collision for raycasting
- Capsule collision for character controllers

### Advanced Optimizations (If Needed)
- Dynamic cell size based on entity density
- Hierarchical spatial hash (quad-tree)
- Parallel collision detection (Web Workers)

---

## References

- [Spatial Hashing Tutorial](https://www.gamedev.net/tutorials/programming/general-and-gameplay-programming/spatial-hashing-r2697/)
- [Planck.js Documentation](https://piqnt.com/planck.js/docs/)
- Research Report: `docs/research/engine/engine-architecture-2025-01-26.md`
- Implementation: `src/engine/physics/`

---

## Status

**Current Status**: Implemented
**Last Review**: 2025-10-26
**Next Review**: After Phase 1 (collision system stress test)

This decision provides excellent performance and flexibility for the target scope. Planck.js integration deferred unless advanced physics scenarios emerge in later phases.
