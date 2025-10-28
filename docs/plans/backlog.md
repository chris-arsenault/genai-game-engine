# Development Backlog: The Memory Syndicate
**Prioritized Implementation Tasks**

---

## Document Overview

**Version**: 1.0
**Last Updated**: 2025-10-26
**Status**: Active Development
**Current Sprint**: Sprint 1 (Milestone 1: Core Engine)

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

### PO-001: Fix Game Loading - Unable to Run Locally ⚠️
- **Priority**: **P0 - CRITICAL BLOCKER**
- **Tags**: `engine`, `critical`, `blocker`, `integration`
- **Effort**: 2-4 hours
- **Dependencies**: None (blocks all manual testing)
- **Status**: **BLOCKING** - Game will not load
- **Reported**: 2025-10-26 (Autonomous Session #3)

**Problem**:
Game fails to load in browser with console error:
```
this.events.subscribe is not a function
  at PlayerMovementSystem.init (PlayerMovementSystem.js:26:17)
```

**Root Cause**:
Unimplemented engine functions near the top of `game.ts` (or `src/game/Game.js`). The EventBus subscription API is not properly wired to systems.

**Impact**:
- **Cannot validate any work in browser** ❌
- Product owner cannot review implementation ❌
- Manual testing blocked ❌
- Demo preparation blocked ❌

**Acceptance Criteria**:
- [x] Game loads without console errors
- [x] PlayerMovementSystem.init() successfully subscribes to events
- [x] All systems can access EventBus via `this.events`
- [x] Basic game loop runs without crashes
- [x] Product owner can see the game running in browser
- [x] Create smoke test: Load game, verify no console errors for 10 seconds

**Investigation Steps**:
1. Check `src/game/Game.js` for incomplete EventBus wiring
2. Verify SystemManager passes EventBus to all systems correctly
3. Check PlayerMovementSystem.init() expects `this.events` but receives undefined
4. Ensure Engine.js properly initializes EventBus before systems
5. Validate all systems have access to EventBus in constructor or init

**Files to Check**:
- `src/game/Game.js` - Main game entry point
- `src/engine/Engine.js` - Engine initialization
- `src/engine/ecs/SystemManager.js` - System registration and EventBus passing
- `src/game/systems/PlayerMovementSystem.js:26` - Error location
- `src/engine/ecs/System.js` - Base system class

**Expected Fix**:
Ensure all systems receive EventBus reference either:
- Via constructor: `constructor(componentRegistry, eventBus)`
- Via property: `this.eventBus = eventBus` in SystemManager.registerSystem()

**Testing After Fix**:
1. Run `npm run dev`
2. Open browser to localhost
3. Check console for zero errors
4. Verify PlayerMovementSystem initializes without errors
5. Confirm game loop runs for at least 10 seconds
6. Test basic player movement (if applicable)

**Next Session**: This MUST be the first task addressed to unblock product owner validation.

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

---

### PO-003: Migrate Quest/Tutorial/Dialogue Systems to WorldStateStore
- **Priority**: **P1 - HIGH**
- **Tags**: `gameplay`, `narrative`, `ecs`, `ux`
- **Effort**: 6-8 hours
- **Dependencies**: PO-002
- **Status**: In Progress — Quest log & tracker HUD now consume WorldStateStore selectors; tutorial/dialogue migration pending
- **Reported**: 2025-10-28 (Autonomous Session #16)

**Problem**:
High-touch narrative systems (QuestSystem, DialogueSystem, TutorialSystem) currently emit events without verified state ingestion, leading to UI desync (Quest log overlay) and opaque branching logic.

**Solution Outline**:
1. Dispatch structured events (`quest:state_changed`, `dialogue:node_changed`, `tutorial:step_completed`) with full payload schema.
2. Reducers normalize data (quest objectives, dialogue options, tutorial milestones).
3. Quest/Tutorial UI overlays consume selectors, replacing manual event subscriptions.
4. Add invariant tests ensuring component-level state matches store-derived views.

_Progress 2025-10-28 (Session #18): Quest log UI + tracker HUD migrated to store selectors; quest/state parity tests added. Dialogue debug and tutorial overlays remain outstanding._

**Acceptance Criteria**:
- Quest log + tracker HUD read from selectors and stay in sync during quest progression playtest.
- Dialogue debug overlay can display active node/path using store data.
- Tutorial completion stored once; SaveManager load restores state via store snapshot.
- Playwright scenario covering Quest 001 validates UI state after each milestone.
- Added regression tests guard against missing reducer payload fields (throws descriptive error).

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
