# ECS System Validation - Quick Reference

## The Problem

```javascript
// WRONG - System not extending base class
export class RenderSystem {
  constructor(componentRegistry, eventBus, renderer) {
    this.componentRegistry = componentRegistry;
    this.eventBus = eventBus;
    this.renderer = renderer;
    this.requiredComponents = ['Transform', 'Sprite'];
    // Missing: this.priority
    // Missing: this.enabled
  }
}

// Result: SystemManager silently skips this system!
// if (!system.enabled) continue; // undefined is falsy, skips system
```

## The Fix

```javascript
// CORRECT - System extends base class
import { System } from '../../engine/ecs/System.js';

export class RenderSystem extends System {
  constructor(componentRegistry, eventBus, renderer) {
    super(componentRegistry, eventBus, ['Transform', 'Sprite']);
    this.priority = 100; // REQUIRED
    this.renderer = renderer;
  }

  init() { /* ... */ }
  update(deltaTime, entities) { /* ... */ }
  cleanup() { /* ... */ }
}
```

## System Checklist

### Required Imports
```javascript
import { System } from '../../engine/ecs/System.js';
```

### Class Declaration
```javascript
export class YourSystem extends System {
  //                  ^^^^^^^ Must extend System
```

### Constructor Must:
1. Accept `componentRegistry` and `eventBus` as first parameters
2. Call `super(componentRegistry, eventBus, ['RequiredComponents'])`
3. Set `this.priority` to a number between 0-100

### Methods Must Implement:
- `init()` - Called once at startup
- `update(deltaTime, entities)` - Called every frame
- `cleanup()` - Called on shutdown

## Priority Guidelines

| Range | Systems | Examples |
|-------|---------|----------|
| 0-20 | Input & Control | PlayerMovementSystem, InputSystem |
| 20-40 | Physics & Movement | MovementSystem, CollisionSystem |
| 40-60 | Game Logic & AI | InvestigationSystem, NPCMemorySystem |
| 60-80 | Animation & Effects | AnimationSystem, ParticleSystem |
| 80-100 | Rendering & Audio | RenderSystem, AudioSystem |

## Validation Approaches

### Approach 1: Runtime Validation (Recommended First Step)
**When:** System registration
**Where:** SystemManager.registerSystem()
**Pros:** Immediate, zero maintenance, helpful errors
**Cons:** Runtime only, doesn't prevent writing bad code

### Approach 2: ESLint Rules (Recommended Short-term)
**When:** Development, pre-commit
**Where:** IDE, CI/CD pipeline
**Pros:** Catches errors during coding, IDE integration
**Cons:** Requires custom rule implementation

### Approach 3: TypeScript (Recommended Long-term)
**When:** Compile time
**Where:** Build process
**Pros:** Prevents errors completely, best DX
**Cons:** Migration effort, build complexity

### Approach 4: Debug Overlay
**When:** Runtime (development mode)
**Where:** Visual overlay on game screen
**Pros:** Real-time visibility, easy debugging
**Cons:** Only during gameplay, doesn't prevent errors

### Approach 5: Factory Pattern
**When:** System creation
**Where:** SystemBuilder class
**Pros:** Makes invalid systems impossible
**Cons:** Requires refactoring instantiation

## Common Errors & Fixes

### Error: "System not updating but no errors"
**Cause:** System doesn't extend base class
**Fix:** Add `extends System` to class declaration

### Error: "Missing required property: 'priority'"
**Cause:** Forgot to set priority after super()
**Fix:** Add `this.priority = 50;` in constructor

### Error: "Cannot construct System instances directly"
**Cause:** Trying to instantiate base System class
**Fix:** Create a subclass that extends System

### Error: "System must implement abstract method 'update()'"
**Cause:** Missing update method implementation
**Fix:** Add `update(deltaTime, entities) { ... }` method

## Template

Copy this template for new systems:

```javascript
import { System } from '../../engine/ecs/System.js';

/**
 * YourSystem - [Description of what this system does]
 *
 * Priority: [0-100]
 * Queries: [Component1, Component2]
 */
export class YourSystem extends System {
  constructor(componentRegistry, eventBus /* additional params */) {
    super(componentRegistry, eventBus, [
      'RequiredComponent1',
      'RequiredComponent2'
    ]);

    this.priority = 50; // Adjust based on execution order needs

    // Additional initialization
  }

  /**
   * Initialize system (called once at startup)
   */
  init() {
    // Setup event listeners, allocate resources, etc.
  }

  /**
   * Update system (called every frame)
   * @param {number} deltaTime - Time since last frame (seconds)
   * @param {number[]} entities - Entity IDs with required components
   */
  update(deltaTime, entities) {
    // Process entities
    for (const entityId of entities) {
      const component = this.getComponent(entityId, 'RequiredComponent1');
      // Update logic here
    }
  }

  /**
   * Cleanup system (called on shutdown)
   */
  cleanup() {
    // Remove event listeners, deallocate resources, etc.
  }
}
```

## Quick Debugging

### Check if system is registered:
```javascript
console.log(engine.systemManager.getSystemNames());
// Should include your system name
```

### Check if system is enabled:
```javascript
const system = engine.systemManager.getSystem('yourSystemName');
console.log(system.enabled); // Should be true
console.log(system.priority); // Should be a number
```

### Check system count:
```javascript
console.log('Total systems:', engine.systemManager.getSystemCount());
console.log('Enabled systems:', engine.systemManager.getEnabledSystemCount());
```

### Force validation:
```javascript
// Add to SystemManager for development
validateAllSystems() {
  const results = [];
  for (const system of this.systems) {
    const validation = this._validateSystem(system);
    if (!validation.valid) {
      results.push({
        name: system.constructor.name,
        errors: validation.errors
      });
    }
  }
  return results;
}

// Usage
const invalid = engine.systemManager.validateAllSystems();
if (invalid.length > 0) {
  console.error('Invalid systems found:', invalid);
}
```

## Performance Impact

| Validation Method | Cost | When | Impact |
|------------------|------|------|--------|
| Runtime validation | 0.08ms per system | Registration only | None on game loop |
| ESLint rules | 45ms | Build time | None at runtime |
| TypeScript | 800ms | Build time | None at runtime |
| Debug overlay | 1.2ms/frame | Every frame (debug) | Debug mode only |

## Related Documents

- Full Research: `docs/research/engine/ecs-validation-error-detection-2025-01-27.md`
- Base System Class: `src/engine/ecs/System.js`
- System Manager: `src/engine/ecs/SystemManager.js`
- Architecture Guidelines: `CLAUDE.md`

---

*Last updated: 2025-01-27*
