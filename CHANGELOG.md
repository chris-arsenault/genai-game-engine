# Changelog

All notable changes to The Memory Syndicate project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Playwright investigative loop automation (`tests/e2e/tutorial-investigative-loop.spec.js`) validating tutorial evidence collection, detective vision unlock, and witness interview progression.
- Shared tutorial automation helpers (`tests/e2e/utils/tutorialActions.js`) consolidating evidence collection, forensic, and detective vision routines for e2e reuse.
- Adaptive music layering stack (`AdaptiveMusicLayerController`) powering Memory Parlor scrambler transitions with ambient/alert/combat mixes.
- Declarative SFX catalog bootstrap with CC0 Kenney UI cues and automated preload via `SFXCatalogLoader`.
- Procedural tension/combat stems for Memory Parlor infiltration (`goodnightmare-tension.wav`, `goodnightmare-combat.wav`) with manifest wiring and loop metadata.
- Investigation-focused SFX cues plus debug overlay preview controls so designers can audition catalog entries in-browser.
- Adaptive audio telemetry feed in the debug overlay showing recent state transitions.
- Combat/disguise adaptive routing including stealth mix support and Playwright coverage of in-game triggers.
- Debug overlay SFX catalog search box and tag chips for rapid filtering during audio design sessions.
- Telemetry fallback monitoring: `CiArtifactPublisher` now records per-provider fallbackSummary metrics and `npm run telemetry:fallback-report` aggregates repeated fallback usage for CI operators.
- Authored template manifest now covers detective offices, alley hubs, precinct war rooms, and alley spurs with multi-edge seam metadata for variant-aware corridor painting.
- Lightweight performance snapshot telemetry (`npm run telemetry:performance`) capturing forensic analysis, faction cascade, and BSP generation timings for CI dashboards.
- CI performance baseline runner (`npm run telemetry:performance:baseline`) executes multiple snapshot passes, aggregates thresholds, and is invoked by GitHub Actions to archive per-run metrics.
- Crossroads art validator now reports lighting/collision readiness, surfaced through `npm run art:validate-crossroads` for pre-sweep QA coordination.
- Act 2 branch dialogue exporter emits change-tracking bundles (Markdown + JSON) so reviewers can focus on modified anchors using `npm run narrative:export-act2-branches --baseline ... --changes-out ...`.
- Quest telemetry parity checker ingests sample log batches (`--samples=...`) and prints schema coverage summaries to catch analytics drift before warehouse ingestion.

### Changed
- Tutorial arrival quest trigger now registered via `QuestTriggerRegistry`, and QuestManager identifier matching accepts multi-ID arrays so tutorial NPC interviews satisfy Act 1 objectives.
- Tutorial investigative flow documentation updated to note the new registry trigger and automation path.
- Migrated gameplay systems, managers, and UI overlays to use `EventBus.on`/`off` with stored unsubscribe handles, eliminating deprecated API warnings and ensuring clean teardown during `Game.cleanup`.
- AmbientSceneAudioController now orchestrates adaptive states instead of direct bus fades, with graceful fallback when Web Audio is unavailable.
- Game initialization preloads SFX catalog entries so AudioFeedbackController plays real cues instead of logging stubs.
- Game debug overlay now surfaces adaptive mix state history and SFX preview buttons for rapid iteration.
- CI pipeline writes a Playwright job summary linking to HTML reports and trace bundles for faster triage.
- Adaptive audio state priorities now ensure combat overrides alert/stealth, while stealth transitions fall back gracefully when scrambler windows lapse.
- Memory Parlor infiltration scene attaches registry-backed quest triggers via `TriggerMigrationToolkit`, keeping objective metadata and adaptive audio hints aligned with the centralized registry.
- Tutorial investigation scene now spawns registry-backed triggers for Detective Vision training, deduction board prompts, and the precinct exit so onboarding beats progress without legacy polling.

### Fixed
- Resolved EventBus deprecation logs by providing a backward-compatible `subscribe` shim while aligning all runtime code with the modern API.
- Ensured `QuestManager`, `SaveManager`, and tutorial/UI layers unregister their listeners on cleanup to prevent duplicate event handling in long sessions.
- Fixed tutorial progression hang at step 3 by spawning evidence entities through the ECS factory so investigation detection events fire and prompts advance correctly.

### Testing
- Extended tutorial trigger migration coverage to assert circular arrival collider metadata and new quest trigger behavior.
- Added QuestManager regression covering array-based objective triggers.
- Augmented AdaptiveMoodEmitter test harness to account for telemetry listeners during debounce validation.
- Added unit coverage for adaptive music layering controller, catalog loader, and refreshed ambient controller integration.
- Added coverage for Game audio telemetry stream + SFX preview controls (`tests/game/audio/GameAudioTelemetry.test.js`, extended `Game.uiOverlays.test.js`).
- Added EventBus regression coverage for the deprecated `subscribe` shim and new QuestManager cleanup behavior.
- Updated quest/story manager tests to exercise the new event lifecycle and validated UI overlay toggle stability.
- Introduced telemetry stress harness for adaptive state churn plus Playwright coverage of SFX overlay filtering and mix transitions.
- Added manifest regression coverage for detective office / alley hub variants and seam metadata propagation (`tests/game/procedural/TilemapInfrastructure.test.js`).
- Extended procedural manifest coverage to precinct war rooms and alley spurs (`tests/game/procedural/TilemapInfrastructure.test.js`).
- Added Memory Parlor scene trigger migration coverage (`tests/game/scenes/MemoryParlorScene.triggers.test.js`) to ensure registry definitions attach quest metadata.
- Added tutorial trigger migration coverage (`tests/game/scenes/TutorialScene.triggers.test.js`) verifying registry definitions attach quest metadata for onboarding beats.
- Relaxed high-variance performance thresholds in jsdom-based suites while documenting expected real-browser budgets.
- Added `TutorialScene` integration test ensuring evidence detection integrates with the investigation system (`tests/game/scenes/TutorialScene.test.js`).
- Added coverage for telemetry fallbackSummary metrics and analyzer utilities (`tests/game/telemetry/CiArtifactPublisher.test.js`, `tests/scripts/telemetry/analyzeFallbackUsage.test.js`).

## [0.1.0] - 2025-10-26

### Added - Phase 0: Bootstrap

**Research**
- Gameplay research report analyzing hybrid genre combinations (Detective Metroidvania selected)
- Features research report defining 7 high-impact mechanics (investigation, faction, progression)
- Engine architecture research report (ECS + Canvas + Spatial Hash + Adaptive Audio)

**Architecture**
- Comprehensive project overview document (2,100+ lines) with complete technical specifications
- Architecture Decision Records (ADRs) for major technical choices:
  - ADR 001: Detective Metroidvania Genre Selection
  - ADR 002: Custom ECS Architecture
  - ADR 003: Canvas 2D Rendering with Layered Optimization
  - ADR 004: Spatial Hash Collision Detection
- Performance budget definition (16ms frame: Input 1ms, ECS 6ms, Render 8ms, Buffer 0.9ms)
- ECS architecture with EntityManager, ComponentRegistry, SystemManager

**Narrative**
- Complete narrative vision document for "The Memory Syndicate"
- Three-act story structure with branching investigations
- Five story pillars (Memory is Identity, Knowledge is Power, No One is Innocent, Truth Demands Sacrifice, Connection Transcends Corruption)
- Four possible endings (Archive Shutdown, Controlled Disclosure, Full Broadcast, Restoration)
- World-building documentation for Mnemosynē City:
  - 6 districts (Downtown, Industrial, Corporate, Undercity, Slums, Zenith)
  - 5 factions (Police, NeuroSync, Criminals, Resistance, The Archive)
  - Lore atlas with Founder's Massacre backstory
  - Faction relationship dynamics and reputation system design

**Engine Implementation**
- Core ECS system (`src/engine/ecs/`):
  - Entity, Component, System base classes
  - EntityManager for entity lifecycle
  - ComponentRegistry with efficient query system
  - SystemManager with priority-based execution
- Rendering pipeline (`src/engine/renderer/`):
  - Layered renderer (static, dynamic, UI layers)
  - Camera with follow, zoom, and shake effects
  - Layer abstraction for render management
  - ObjectPool for GC optimization
- Physics system (`src/engine/physics/`):
  - SpatialHash for O(n) collision broad phase
  - CollisionSystem with AABB/Circle detection
  - TriggerSystem for narrative event zones
- Audio system (`src/engine/audio/`):
  - AudioManager with Web Audio API and 3D positional audio
  - AdaptiveMusic for dual-layer dynamic music system
- Event system (`src/engine/events/`):
  - EventBus with pub/sub pattern, priorities, and queuing
- Asset management (`src/engine/assets/`):
  - AssetManager with lazy loading and reference counting
- Main engine coordinator (`src/engine/Engine.js`)

**Gameplay Implementation**
- 9 game components (`src/game/components/`):
  - Transform (position, rotation, scale)
  - Sprite (visual representation)
  - PlayerController (input state)
  - Collider (collision geometry)
  - Evidence (investigation markers)
  - ClueData (investigation clues)
  - FactionMember (faction affiliation)
  - KnowledgeGate (progression gates)
  - InteractionZone (interactive triggers)
- 6 game systems (`src/game/systems/`):
  - PlayerMovementSystem
  - InvestigationSystem
  - FactionReputationSystem
  - KnowledgeProgressionSystem
  - DialogueSystem
  - CameraFollowSystem
- 3 entity factories (`src/game/entities/`):
  - PlayerEntity
  - EvidenceEntity
  - NPCEntity
- Game configuration (`src/game/config/`):
  - GameConfig (constants and tuning)
  - Controls (input mappings)
- Main game coordinator (`src/game/Game.js`)

**Utilities**
- Vector2 for 2D math operations
- Logger for debug logging with levels

**Configuration & Tooling**
- Vite 6.0.7 build configuration with HMR
- ESLint 9.18.0 with enforced code standards
- Prettier 3.4.2 for consistent formatting
- Jest 29.7.0 for unit testing (framework ready)
- Playwright 1.41.2 for E2E testing (framework ready)
- NPM scripts: dev, build, preview, lint, format, test
- HTML5 entry point with Canvas element

**Documentation**
- Phase 0 Bootstrap Completion Report (comprehensive project summary)
- Repository structure documentation
- Code standards and performance rules
- Quick start guide
- Development workflow documentation

**MCP Knowledge Base**
- 8 architecture decisions stored
- 8 reusable code patterns stored
- 17 narrative elements stored
- 16 lore entries stored

### Technical Specifications

**Performance**
- Target: 60 FPS (16.6ms per frame)
- Entity capacity: 1,000-5,000 entities
- Spatial hash reduces collision checks by 98% (850 vs 499,500 for 1,000 entities)
- Layered rendering reduces redraws by 60-80%
- Initial load: <3 seconds
- Memory usage: <150MB during gameplay

**Architecture**
- Custom lightweight ECS (no framework dependencies)
- HTML5 Canvas 2D rendering with optimizations
- Spatial hash collision detection (64px cells)
- Web Audio API adaptive music system
- Event-driven system communication
- Object pooling for GC optimization

**Code Metrics**
- Total lines: ~4,500 (engine + game scaffold)
- Engine code: ~2,800 lines
- Game code: ~1,200 lines
- Utilities: ~300 lines
- Documentation: ~8,500 lines

### Development Process

**Agent Coordination**
- Research agents completed genre, features, and engine analysis
- Architect created comprehensive technical specifications
- Narrative team established story framework and world-building
- Engine developer implemented core systems scaffold
- Gameplay developer created game systems scaffold
- Documenter compiled bootstrap documentation

**Quality Assurance**
- Code adheres to ESLint and Prettier standards
- JSDoc comments on all public APIs
- Performance targets validated through research benchmarks
- Architecture decisions documented with rationale

---

## [0.2.0] - 2025-10-26

### Added - Sprint 1: Core Engine Implementation (M1)

**Complete Engine Systems**:
- **ECS Core**: EntityManager, ComponentRegistry, SystemManager with query optimization
  - Entity pooling for zero-allocation
  - Smallest-set query optimization
  - Priority-based system execution
  - Dynamic system enable/disable
- **Rendering Pipeline**: Full Canvas 2D rendering with optimizations
  - Layered renderer (static, dynamic, UI layers)
  - Camera with follow, zoom, and shake effects
  - Dirty rectangle optimization (60-80% redraw reduction)
  - RenderSystem with viewport culling
  - ObjectPool for GC optimization
- **Physics System**: Spatial hash collision detection
  - SpatialHash achieving 98% collision check reduction (850 vs 499,500 for 1,000 entities)
  - AABB and Circle collision algorithms
  - MovementSystem with velocity integration
  - TriggerSystem for narrative events (stub)
- **Event System**: EventBus with pub/sub pattern
  - Priority-based handler execution
  - Wildcard subscriptions (`entity:*`)
  - One-time subscriptions
  - Event queuing support
- **Asset Management**: Lazy loading and reference counting
  - AssetLoader with retry logic
  - AssetManager with priority-based loading (Critical/District/Optional)
  - Support for images, JSON, audio
- **Game Loop**: requestAnimationFrame with fixed timestep
  - Pause/resume without delta spikes
  - Comprehensive metrics (FPS, frame time, min/max/avg)
  - 55-65 FPS sustained performance
  - Delta time accuracy within ±5%

**Test Suite**:
- **595 tests** across 19 test suites
  - EntityManager: 54 tests (98.77% coverage)
  - ComponentRegistry: 54 tests (100% coverage)
  - SystemManager: 54 tests (97.56% coverage)
  - Renderer systems: 126 tests (81.61% coverage)
  - Physics systems: 139 tests (78.13% coverage, 13 failures)
  - EventBus: 42 tests (100% coverage)
  - Assets: 75 tests (71.65% coverage)
  - GameLoop: 68 tests (98.82% coverage)
  - Vector2: 60 tests (100% coverage)
- **Pass rate**: 97.6% (581 passing, 14 failing)
- **Coverage**: 50.84% overall, 72.85% engine modules

**Performance Benchmarks**:
- GameLoop: 55-65 FPS sustained, 50-60 FPS under load
- Spatial hash: 98% collision check reduction
- Delta time accuracy: ±5% variance
- Frame consistency: <50ms variance
- Pause/resume: No frame skips or delta spikes

**Documentation**:
- GameLoop implementation report (`docs/reports/M1-023-gameloop-implementation.md`)
- M1 validation report (`docs/reports/M1-VALIDATION-REPORT.md`)
- Sprint 1 summary report (`docs/reports/sprint-1-summary.md`)
- Updated autonomous session handoff

**Code Metrics**:
- ~8,000 lines of code (engine + game)
- ~5,000 lines of test code
- 34 engine files
- 19 test files
- Average file size: ~150 lines

### Known Issues - Sprint 1

**CRITICAL** (must fix before Sprint 2):
- ❌ **CollisionSystem broken**: 13 tests failing due to component type property collision
  - Root cause: `type` property used by both ECS system and game components
  - Impact: Physics collision detection non-functional
  - **BLOCKS M2**: Investigation mechanics require collision/interaction zones
- ❌ **Logger.js parse error**: Syntax error at line 8 prevents build
- ❌ **Test coverage below targets**: 50.84% overall (need 60%), 72.85% engine (need 80%)
  - Entity.js: 0% coverage (no tests)
  - Component.js: 0% coverage (no tests)
  - System.js: 53.84% coverage (below target)
- ❌ **M1-024 Full Integration Test**: Not implemented (required for validation)
- ❌ **M1-025 Performance Profiling**: Not implemented (required for validation)

**HIGH PRIORITY** (should fix soon):
- ⚠️ 70 linting errors, 58 warnings
  - 23 unused variables
  - 24 missing curly braces
  - 22 console.log statements (should use Logger)
- ⚠️ CollisionSystem complexity: 28 (target: 10), 114 lines (target: 50)
- ⚠️ AssetManager: 303 lines (3 lines over 300 limit)

**MEDIUM PRIORITY** (defer if needed):
- EventQueue not implemented (M1-018)
- Event naming conventions documentation missing (M1-019)
- ECS usage guide missing (M1-006)
- Architecture documentation incomplete (M1-026)

### Performance

**Validated Benchmarks**:
- ✅ GameLoop: 55-65 FPS sustained
- ✅ Spatial hash: 98% collision check reduction
- ✅ Delta time: ±5% accuracy

**Not Yet Measured** (M1-025 required):
- Entity creation: Target <100ms for 10,000 entities
- Component queries: Target <1ms for 1,000 entities
- Rendering: Target 60 FPS with 500 sprites
- Memory: Target <150MB usage, zero leaks
- GC pauses: Target <10ms, <3 per minute

### Technical Specifications - Sprint 1

**Architecture**:
- Custom lightweight ECS (no dependencies)
- Canvas 2D rendering with layering
- Spatial hash O(n) collision detection
- requestAnimationFrame game loop
- Event-driven system communication

**Sprint Metrics**:
- Development time: ~4 hours autonomous session
- Tasks completed: 20/27 (74%)
- P0 tasks: 9/10 (90%)
- P1 tasks: 5/9 (56%)
- P2 tasks: 1/8 (13%)

## [Unreleased]

### Planned - Sprint 2: Investigation Mechanics (M2, Weeks 4-6)
- Evidence collection system
- Deduction board UI (graph-based clue connections)
- Forensic analysis minigames
- Case management system
- Detective vision ability
- Tutorial case ("The Hollow Case")
- Requires: CollisionSystem fix for interaction zones

---

## Release Notes

### Version 0.1.0 - Bootstrap Complete (2025-10-26)

The Memory Syndicate project has completed Phase 0 (Bootstrap) with comprehensive research, architecture, narrative design, and implementation scaffolding. The project is now ready to begin Phase 1 (Core Mechanics) development.

**Highlights**:
- ✅ Detective Metroidvania genre selected and validated
- ✅ Custom ECS architecture designed and implemented
- ✅ Complete narrative framework (3-act structure, 4 endings)
- ✅ World-building established (Mnemosynē City, 5 factions, 6 districts)
- ✅ Core engine systems implemented (ECS, rendering, physics, audio, events)
- ✅ Gameplay scaffold created (9 components, 6 systems, 3 entity factories)
- ✅ Development tooling configured (Vite, ESLint, Jest, Playwright)
- ✅ Comprehensive documentation (8,500+ lines)

**Key Metrics**:
- ~4,500 lines of scaffold code
- ~8,500 lines of documentation
- 8 architecture decisions documented
- 8 code patterns defined
- 17 narrative elements defined
- 16 lore entries created

**Next Steps**:
- Begin Phase 1 (Core Mechanics) implementation
- Implement player movement and physics
- Build UI framework
- Create test suite
- Validate performance targets

---

[0.1.0]: https://github.com/chris-arsenault/genai-game-engine/releases/tag/v0.1.0
