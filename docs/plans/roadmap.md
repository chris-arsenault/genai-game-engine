# Development Roadmap: The Memory Syndicate
**4-6 Month Timeline to Vertical Slice**

## Executive Summary

This roadmap charts the development path from completed Phase 0 bootstrap to a compelling vertical slice demonstrating all core systems. The Memory Syndicate is a Detective Metroidvania hybrid requiring careful orchestration of investigation mechanics, faction systems, procedural generation, and narrative integration.

**Timeline**: 20 weeks (4.5 months)
**Milestones**: 7 major milestones
**Current Status**: Milestone 0 (Bootstrap) COMPLETE

---

## Roadmap Visualization

```
Timeline (Weeks)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

M0: Bootstrap                     [✓] Week 0 (COMPLETE)
├─ Research complete
├─ Narrative vision established
├─ Architecture decided
└─ Scaffold created

M1: Core Engine Foundation        [░░░] Weeks 1-3
├─ ECS implementation
├─ Rendering pipeline
├─ Physics & collision
├─ Event bus
└─ Asset management

M2: Investigation Mechanics        [░░░] Weeks 4-6
├─ Evidence system
├─ Deduction board
├─ Forensics
├─ Case management
└─ Detective vision

M3: Faction & World Systems       [░░░] Weeks 7-9
├─ Reputation system
├─ NPC memory
├─ Disguises & infiltration
├─ District control
└─ Social stealth

M4: Procedural Generation         [░░░] Weeks 10-12
├─ District layouts (BSP)
├─ Case generation
├─ Evidence placement
├─ Witness pools
└─ Narrative anchors

M5: Combat & Progression          [░░░] Weeks 13-15
├─ Combat system
├─ Stealth mechanics
├─ Enemy AI
├─ Ability unlocks
└─ Knowledge-gating

M6: Story Integration             [░░░] Weeks 16-18
├─ Quest system
├─ Act 1 implementation
├─ Branching paths
├─ World state persistence
└─ Multiple endings

M7: Vertical Slice Polish         [░░░] Weeks 19-20
├─ Performance optimization
├─ Audio implementation
├─ Visual polish
├─ Bug fixing
└─ Playtesting iteration

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Dependency Chain

```
M0 (Bootstrap)
  │
  └──> M1 (Core Engine) ────┬──> M2 (Investigation) ──┬──> M5 (Combat/Progression) ──┐
                            │                         │                              │
                            └──> M3 (Faction/World) ──┤                              │
                                                      │                              │
                                                      └──> M4 (Procedural Gen) ──────┤
                                                                                     │
                                                                                     └──> M6 (Story) ──> M7 (Polish)
```

**Critical Path**: M0 → M1 → M2 → M6 → M7
**Parallel Development**: M3, M4, M5 can overlap with careful coordination

---

## Milestone 0: Bootstrap (COMPLETE)

**Duration**: Phase 0 (Pre-development)
**Status**: ✅ COMPLETE

### Deliverables Completed
- ✅ Research reports on hybrid genre, mechanics, and architecture
- ✅ Complete narrative vision (Acts 1-3, characters, themes)
- ✅ World-building (5 factions, 4 districts, lore database)
- ✅ Architecture decisions (ECS, rendering, physics)
- ✅ Project overview and technical specifications
- ✅ File scaffold (engine and gameplay directories)

### MCP State Captured
- 13 narrative elements stored (acts, characters, themes)
- 7 faction lore entries
- 4 location lore entries
- 2 core architecture decisions documented
- 0 patterns stored (awaiting implementation)

### Success Metrics
- ✅ Complete vision document
- ✅ Architectural decisions documented
- ✅ Narrative arc with branching established
- ✅ Team alignment on scope and timeline

---

## Milestone 1: Core Engine Foundation

**Duration**: Weeks 1-3 (3 weeks)
**Goal**: Implement robust ECS foundation supporting all gameplay systems

### Technical Requirements

#### 1.1 Entity-Component-System (Week 1)
**Deliverables**:
- `src/engine/ecs/EntityManager.js` - Entity lifecycle management
- `src/engine/ecs/ComponentRegistry.js` - Component storage and queries
- `src/engine/ecs/SystemManager.js` - System orchestration
- `src/engine/ecs/System.js` - Base system class
- `tests/engine/ecs/*.test.js` - Unit tests (>80% coverage)

**Success Criteria**:
- Create/destroy 10,000 entities in <100ms
- Component queries execute in <1ms for 1000 entities
- System updates maintain 60 FPS with 500 entities
- Zero memory leaks after 1000 entity create/destroy cycles

**Technical Validation**:
```javascript
// Benchmark test
const entities = [];
for (let i = 0; i < 1000; i++) {
  const e = entityManager.createEntity();
  componentRegistry.addComponent(e, 'Transform', { x: 0, y: 0 });
  componentRegistry.addComponent(e, 'Physics', { vx: 0, vy: 0 });
  entities.push(e);
}
// Query test: should complete in <1ms
const results = componentRegistry.queryEntities(['Transform', 'Physics']);
```

#### 1.2 Rendering Pipeline (Week 2)
**Deliverables**:
- `src/engine/renderer/LayeredRenderer.js` - Multi-layer canvas rendering
- `src/engine/renderer/Camera.js` - Viewport and camera controls
- `src/engine/renderer/DirtyRectManager.js` - Dirty rectangle optimization
- `src/engine/renderer/RenderSystem.js` - ECS system for rendering
- `tests/engine/renderer/*.test.js` - Rendering tests

**Success Criteria**:
- 60 FPS with 1000 sprites visible
- Dirty rectangle system reduces redraws by >60%
- Viewport culling excludes off-screen entities
- Layer compositing completes in <1ms

**Performance Budget**:
- Culling: 0.5ms
- Sorting: 0.5ms
- Drawing: 6ms
- Compositing: 1ms
- **Total: 8ms (50% of frame budget)**

#### 1.3 Physics & Collision (Week 2-3)
**Deliverables**:
- `src/engine/physics/SpatialHash.js` - Spatial partitioning
- `src/engine/physics/CollisionSystem.js` - Collision detection and resolution
- `src/engine/physics/MovementSystem.js` - Entity movement
- `src/engine/physics/collisionDetectors.js` - AABB, Circle collision algorithms
- `tests/engine/physics/*.test.js` - Physics tests

**Success Criteria**:
- O(n) collision detection (spatial hash)
- 1000 entities with <1000 collision checks per frame
- Collision resolution stable (no jitter or tunneling)
- 60 FPS maintained with 500 dynamic entities

**Spatial Hash Validation**:
```javascript
// Naive: O(n²) = 499,500 checks for 1000 entities
// Spatial Hash: O(n) ≈ 850 checks (98% reduction)
```

#### 1.4 Event Bus System (Week 3)
**Deliverables**:
- `src/engine/events/EventBus.js` - Pub/sub event system
- `src/engine/events/EventQueue.js` - Deferred event processing
- `tests/engine/events/*.test.js` - Event system tests

**Success Criteria**:
- Event dispatch <0.1ms per event
- Priority-based handler execution
- Wildcard subscriptions supported
- No memory leaks with subscribe/unsubscribe

**Event Patterns Established**:
```javascript
// Naming convention: domain:action
'entity:created', 'entity:destroyed'
'evidence:collected', 'case:solved'
'faction:hostile', 'reputation:changed'
'quest:started', 'quest:completed'
```

#### 1.5 Asset Management (Week 3)
**Deliverables**:
- `src/engine/assets/AssetManager.js` - Asset loading and caching
- `src/engine/assets/AssetLoader.js` - File loading utilities
- `tests/engine/assets/*.test.js` - Asset system tests

**Success Criteria**:
- Critical assets load in <3s
- District assets load in <1s
- Reference counting prevents premature unloading
- Lazy loading reduces initial memory by >60%

**Asset Priority Tiers**:
1. **Critical** (<3s): Core UI, player sprites, essential SFX
2. **District** (<1s): District-specific tiles, NPCs, music
3. **Optional** (background): Particles, ambient sounds

### Narrative Dependencies
**None** - Pure engine work, no story integration yet

### Testing Requirements
- Unit tests for all engine systems (>80% coverage)
- Integration tests for ECS + Rendering + Physics
- Performance benchmarks for all systems
- Memory leak detection tests

### Risk Assessment

**Risk 1: ECS Performance**
- **Likelihood**: Low
- **Impact**: High
- **Mitigation**: Early profiling, smallest-set query optimization, TypedArrays for numeric data
- **Fallback**: Cache query results, reduce entity count, simplify component structure

**Risk 2: Canvas Rendering Bottleneck**
- **Likelihood**: Medium
- **Impact**: High
- **Mitigation**: Dirty rectangles, viewport culling, sprite batching, integer coordinates
- **Fallback**: Reduce visual complexity, dynamic quality scaling, consider WebGL

**Risk 3: Physics Tunneling at High Velocities**
- **Likelihood**: Low
- **Impact**: Medium
- **Mitigation**: Swept collision detection, velocity clamping, continuous collision detection
- **Fallback**: Reduce max velocities, increase physics tick rate

### Success Metrics
- ✅ All engine tests pass (>80% coverage)
- ✅ 60 FPS with 500 entities (3 components each)
- ✅ Memory usage <100MB baseline
- ✅ Zero memory leaks
- ✅ No GC pauses >10ms
- ✅ Load time <3s for critical assets

### Rollout Plan
1. **Week 1**: ECS core implementation + tests
2. **Week 2**: Rendering + Physics (parallel development)
3. **Week 3**: Event bus + Asset management + Integration testing
4. **End of M1**: Performance profiling and optimization pass

---

## Milestone 2: Investigation Mechanics

**Duration**: Weeks 4-6 (3 weeks)
**Goal**: Implement core detective gameplay loop

### Technical Requirements

#### 2.1 Evidence Collection System (Week 4)
**Deliverables**:
- `src/game/systems/InvestigationSystem.js` - Evidence detection and collection
- `src/game/components/Investigation.js` - Investigation component
- `src/game/components/Evidence.js` - Evidence component
- `src/game/entities/Evidence.js` - Evidence entity factory
- `tests/game/systems/InvestigationSystem.test.js`

**Success Criteria**:
- Evidence appears on screen with visual indicators
- Player can interact to collect evidence
- Evidence added to case file with metadata
- Detective vision highlights hidden evidence

**Evidence Types**:
- Physical (fingerprints, objects, weapons)
- Digital (files, logs, memory extracts)
- Testimony (NPC statements, recorded memories)
- Forensic (analysis results, lab reports)

#### 2.2 Deduction Board (Week 4-5)
**Deliverables**:
- `src/game/ui/DeductionBoard.js` - Interactive clue connection UI
- `src/game/systems/DeductionSystem.js` - Theory validation logic
- `src/game/data/TheoryValidator.js` - Graph-based theory checking
- `tests/game/systems/DeductionSystem.test.js`

**Success Criteria**:
- Player can drag-and-drop clues to connect them
- Valid connections highlighted, invalid rejected
- Theory accuracy calculated (0.0-1.0)
- Correct theories trigger progression unlocks

**Deduction Graph Structure**:
```javascript
{
  nodes: [
    { id: 'clue_001', title: 'Fingerprint matches suspect', confidence: 0.9 }
  ],
  edges: [
    { from: 'clue_001', to: 'clue_002', type: 'supports' },
    { from: 'clue_003', to: 'clue_001', type: 'contradicts' }
  ]
}
```

#### 2.3 Forensic Analysis (Week 5)
**Deliverables**:
- `src/game/systems/ForensicSystem.js` - Forensic examination mechanics
- `src/game/ui/ForensicMinigame.js` - Interactive forensic minigames
- Forensic tools: Fingerprint analysis, document reconstruction, memory trace
- `tests/game/systems/ForensicSystem.test.js`

**Success Criteria**:
- Players can analyze evidence with forensic tools
- Analysis reveals hidden clues
- Minigames are engaging and intuitive
- Success grants progression advantages

**Minigame Types**:
1. **Fingerprint Matching**: Match partial prints to database
2. **Document Reconstruction**: Piece together shredded documents
3. **Memory Trace**: Extract fragmented memories from hollow victims

#### 2.4 Case Management (Week 6)
**Deliverables**:
- `src/game/managers/CaseManager.js` - Case lifecycle management
- `src/game/ui/CaseFileUI.js` - Case file interface
- `src/game/data/cases/tutorialCase.js` - First tutorial case
- `tests/game/managers/CaseManager.test.js`

**Success Criteria**:
- Players can view active case details
- Case objectives tracked and updated
- Evidence organized by case
- Case completion triggers rewards and story progression

**Tutorial Case**: "The Hollow Case" (Act 1 opening)
- 3-5 pieces of evidence
- 5-7 clues derivable
- 1 correct theory structure
- Introduces Memory Trace ability

#### 2.5 Detective Vision (Week 6)
**Deliverables**:
- `src/game/abilities/DetectiveVision.js` - Detective vision ability
- Visual highlighting system for evidence
- Energy cost and cooldown mechanics
- Integration with rendering system (overlay effects)

**Success Criteria**:
- Detective vision reveals hidden evidence
- Visual effects clearly communicate interactive objects
- Energy drain balanced and intuitive
- Performance impact <1ms per frame

### Narrative Dependencies

**Required from Narrative Team**:
- Tutorial case structure ("The Hollow Case")
  - Crime scene description
  - Evidence list with descriptions
  - Clue connections (theory graph)
  - Narrative outcome
- Evidence description templates
- Forensic analysis flavor text
- Detective vision UI lore integration

**MCP Integration**:
- Store tutorial case as narrative element
- Link to Act 1 narrative arc
- Tag with investigation mechanics

### Testing Requirements
- Unit tests for investigation system (>80% coverage)
- Integration tests for evidence → clue → theory pipeline
- Usability tests for deduction board UI
- Balance tests for forensic minigames
- Tutorial case completion (alpha playtesters)

### Risk Assessment

**Risk 1: Deduction Board Too Complex**
- **Likelihood**: High
- **Impact**: High (Core mechanic must be intuitive)
- **Mitigation**: Extensive UI iteration, visual feedback, tutorial scaffolding, hint system
- **Fallback**: Simplify connection types, reduce clue count, add auto-solve option

**Risk 2: Forensic Minigames Tedious**
- **Likelihood**: Medium
- **Impact**: Medium (Can break pacing)
- **Mitigation**: Short minigame duration (<2 min), skippable after first attempt, reward meaningful
- **Fallback**: Auto-complete option, reduce frequency, simplify mechanics

**Risk 3: Theory Validation Too Strict**
- **Likelihood**: Medium
- **Impact**: High (Player frustration)
- **Mitigation**: Multiple valid theory structures, partial credit, hint system, error feedback
- **Fallback**: Reduce required accuracy, accept approximate solutions

### Success Metrics
- ✅ Tutorial case completable by >80% of playtesters
- ✅ Deduction board usable without external tutorial
- ✅ Forensic minigames rated "engaging" by >60% of players
- ✅ Detective vision used strategically (not spammed)
- ✅ Evidence → theory pipeline understandable
- ✅ Performance maintained (60 FPS)

### Rollout Plan
1. **Week 4**: Evidence system + basic deduction board
2. **Week 5**: Forensic minigames + theory validation
3. **Week 6**: Case management + detective vision + tutorial case
4. **End of M2**: Playtesting tutorial case, iteration on feedback

---

## Milestone 3: Faction & World Systems

**Duration**: Weeks 7-9 (3 weeks)
**Goal**: Implement dynamic faction relationships and reactive world

### Technical Requirements

#### 3.1 Reputation System (Week 7)
**Deliverables**:
- `src/game/managers/FactionManager.js` - Faction reputation management
- `src/game/systems/FactionSystem.js` - ECS system for faction logic
- `src/game/components/Faction.js` - Faction component
- `src/game/data/factions/*.js` - Faction definitions (5 factions)
- `tests/game/managers/FactionManager.test.js`

**Success Criteria**:
- Dual-axis reputation (Fame/Infamy) tracked per faction
- Reputation changes cascade to allies/enemies
- Faction attitudes calculated correctly (Allied, Friendly, Neutral, Hostile)
- UI displays faction standings clearly

**Faction Definitions** (from narrative):
1. **NeuroSync Corporation** - Corporate antagonists
2. **The Archivists (Resistance)** - Underground allies
3. **Memory Crimes Division (Police)** - Former employer
4. **The Curator's Network** - Hidden antagonist faction
5. **Independent Informants** - Neutral faction

**Reputation Formula**:
```javascript
// Base reputation change
modifyReputation(factionId, fame, infamy);

// Cascade to allies (+50% fame to allies, -50% to enemies)
for (const ally of faction.allies) {
  modifyReputation(ally, fame * 0.5, 0);
}
for (const enemy of faction.enemies) {
  modifyReputation(enemy, -fame * 0.5, 0);
}
```

#### 3.2 NPC Memory & Attitudes (Week 7-8)
**Deliverables**:
- `src/game/systems/NPCMemorySystem.js` - NPC recognition and memory
- `src/game/components/NPC.js` - NPC component with memory
- `src/game/entities/NPCFactory.js` - NPC entity creation
- `tests/game/systems/NPCMemorySystem.test.js`

**Success Criteria**:
- NPCs remember player actions within district
- "Known By" list persists across sessions
- NPC dialogue changes based on reputation
- Witnessed crimes propagate to faction reputation

**NPC Memory Structure**:
```javascript
{
  id: 'npc_guard_001',
  faction: 'police',
  knownPlayer: false, // Has met player before
  lastInteraction: null, // Timestamp
  witnessedCrimes: [], // List of crimes witnessed
  attitude: 'neutral', // friendly, neutral, hostile
  dialogue: {
    greeting: 'default_greeting',
    hostile: 'police_hostile_01'
  }
}
```

#### 3.3 Disguise & Infiltration (Week 8)
**Deliverables**:
- `src/game/systems/DisguiseSystem.js` - Disguise mechanics
- `src/game/ui/DisguiseUI.js` - Disguise selection interface
- `src/game/abilities/SocialStealth.js` - Social stealth abilities
- Detection roll system (probability-based)
- `tests/game/systems/DisguiseSystem.test.js`

**Success Criteria**:
- Player can equip faction disguises
- Disguises enable access to hostile districts
- NPCs perform detection rolls based on effectiveness
- Known NPCs see through disguises immediately
- Suspicious actions increase detection chance

**Disguise Effectiveness Formula**:
```javascript
const effectiveness =
  faction.disguiseEffectiveness * // Base (0.6-0.9)
  (1 - player.infamy / 100) * // Infamy penalty
  (npc.knownPlayer ? 0 : 1) * // Known NPCs always detect
  suspicionMultiplier; // Actions increase suspicion

// Detection roll every 1-2 seconds
if (Math.random() > effectiveness) {
  npc.detectPlayer(); // Blow cover
  eventBus.emit('disguise:blown', { npcId, factionId });
}
```

#### 3.4 District Control & State (Week 9)
**Deliverables**:
- `src/game/managers/WorldStateManager.js` - World state persistence
- `src/game/systems/DistrictControlSystem.js` - District ownership logic
- `src/game/data/districts/*.js` - District definitions
- `tests/game/managers/WorldStateManager.test.js`

**Success Criteria**:
- Districts have controlling factions
- Control changes based on player actions
- District aesthetics reflect controlling faction
- State persists across sessions

**District Control Map**:
```javascript
{
  'downtown': {
    controller: 'police',
    stability: 0.8, // 0.0 = contested, 1.0 = stable
    contestedBy: ['criminals'],
    securityLevel: 'high',
    accessRestrictions: {
      'criminals': 'hostile',
      'resistance': 'disguise_required'
    }
  }
}
```

#### 3.5 Social Stealth Mechanics (Week 9)
**Deliverables**:
- `src/game/systems/SocialStealthSystem.js` - Social stealth logic
- Suspicion meter and detection states
- Restricted area mechanics
- Integration with faction system

**Success Criteria**:
- Players can navigate hostile areas with disguises
- Suspicious actions (running, combat, trespassing) raise suspicion
- Detection has meaningful consequences (combat, reputation loss, arrest)
- Stealth provides viable alternative to combat

**Suspicious Actions**:
- Running in restricted areas (+20% suspicion/sec)
- Interacting with restricted terminals (+40% instant)
- Combat (+100% instant detection)
- Lockpicking (+60% instant if seen)

### Narrative Dependencies

**Required from Narrative Team**:
- Faction relationship map (allies/enemies)
- NPC dialogue variations (friendly/neutral/hostile)
- District control narratives (who owns what initially)
- Disguise acquisition story beats
- Faction questline hooks

**MCP Integration**:
- Link faction lore to reputation system
- Store district control states as world-building
- Tag NPC dialogue with faction affiliations

### Testing Requirements
- Unit tests for faction system (>80% coverage)
- Integration tests for reputation cascades
- Playtesting for disguise balancing
- Save/load persistence tests for world state
- NPC memory persistence tests

### Risk Assessment

**Risk 1: Faction Complexity Overwhelming**
- **Likelihood**: High
- **Impact**: Medium
- **Mitigation**: Clear UI, predictable consequences, tutorial guidance, rollback mechanics
- **Fallback**: Reduce faction count, simplify relationships, add safe neutral zones

**Risk 2: Disguise Detection Frustrating**
- **Likelihood**: Medium
- **Impact**: Medium
- **Mitigation**: Generous effectiveness values, clear feedback, known NPC indicators
- **Fallback**: Increase effectiveness, reduce detection frequency, add grace period

**Risk 3: World State Bloat**
- **Likelihood**: Low
- **Impact**: Low
- **Mitigation**: Efficient state serialization, only persist meaningful changes
- **Fallback**: Simplify state tracking, reset non-critical state

### Success Metrics
- ✅ Reputation changes predictable and understandable
- ✅ NPCs react differently based on reputation
- ✅ Disguises enable infiltration (>70% success rate for careful players)
- ✅ District control changes feel impactful
- ✅ World state persists correctly across sessions
- ✅ Performance maintained (60 FPS)

### Rollout Plan
1. **Week 7**: Reputation system + faction definitions
2. **Week 8**: NPC memory + disguise mechanics
3. **Week 9**: District control + social stealth + integration testing
4. **End of M3**: Playtesting faction interactions, balance iteration

---

## Milestone 4: Procedural Generation

**Duration**: Weeks 10-12 (3 weeks)
**Goal**: Implement procedural district and case generation with narrative anchors

### Technical Requirements

#### 4.1 District Layout Generation (Week 10)
**Deliverables**:
- `src/game/procedural/DistrictGenerator.js` - BSP-based district generation
- `src/game/procedural/RoomGenerator.js` - Room layout algorithms
- `src/game/procedural/PathGenerator.js` - Corridor and connection generation
- `tests/game/procedural/DistrictGenerator.test.js`

**Success Criteria**:
- Districts generated in <1s
- Layouts feel coherent and navigable
- No unreachable areas
- Aesthetic variety (industrial, corporate, residential)
- Seeded generation (deterministic for testing)

**BSP Algorithm**:
```javascript
// Binary Space Partitioning for room generation
function generateDistrict(width, height, seed) {
  const root = new BSPNode(0, 0, width, height);
  root.split(MIN_ROOM_SIZE, MAX_ROOM_SIZE, rng(seed));
  const rooms = root.getRooms();
  const corridors = connectRooms(rooms, rng(seed));
  return { rooms, corridors };
}
```

**District Themes**:
- Downtown (Neon Districts): Vertical, neon-lit, rain-soaked
- Industrial: Horizontal, grimy, machinery-filled
- Corporate Spires: Clean, sterile, high-tech
- Archive Undercity: Dark, labyrinthine, ancient tech

#### 4.2 Case Generation System (Week 10-11)
**Deliverables**:
- `src/game/procedural/CaseGenerator.js` - Procedural case creation
- `src/game/procedural/EvidenceGenerator.js` - Evidence placement algorithms
- `src/game/procedural/WitnessGenerator.js` - Witness and suspect pools
- `src/game/data/narrativeAnchors/*.js` - Hand-authored case templates
- `tests/game/procedural/CaseGenerator.test.js`

**Success Criteria**:
- Cases feel logically consistent
- Evidence chains lead to correct conclusions
- Multiple solution paths possible
- Narrative anchors integrate seamlessly
- Quality scoring rejects illogical cases

**Case Generation Process**:
1. **Select Template**: Choose from authored case templates (murder, theft, conspiracy)
2. **Generate Actors**: Create suspect/victim/witness pool with relationships
3. **Place Evidence**: Scatter evidence at crime scene with logical connections
4. **Build Theory Graph**: Create valid clue connections
5. **Quality Check**: Validate case solvability and coherence
6. **Inject Narrative**: Add faction-specific flavor and story hooks

**Case Templates**:
- Hollow Victim Case (memory extraction)
- Corporate Espionage (data theft)
- Witness Intimidation (silencing)
- Black Market Memory Trade
- Missing Person (suspect is hollow)

#### 4.3 Evidence Placement Algorithm (Week 11)
**Deliverables**:
- Logical evidence placement based on case structure
- Difficulty tuning (evidence density, hidden vs. visible)
- Forensic requirement gating
- Integration with investigation system

**Success Criteria**:
- Evidence locations make logical sense
- Density balanced (not too sparse/cluttered)
- Hidden evidence requires detective vision
- Forensic gating provides progression

**Placement Rules**:
- Primary evidence: Crime scene center (80% visible)
- Secondary evidence: Crime scene periphery (50% hidden)
- Tertiary evidence: Connected locations (70% hidden)
- Red herrings: Scattered (confuse but don't block progress)

#### 4.4 Witness & Suspect Pools (Week 11-12)
**Deliverables**:
- `src/game/procedural/CharacterGenerator.js` - Procedural NPC generation
- Witness testimony generation
- Suspect motivation and alibis
- Relationship web generation
- Integration with NPC system

**Success Criteria**:
- Witnesses provide useful but incomplete information
- Suspects have plausible motives and alibis
- Relationship webs create interesting dynamics
- Testimony connects to evidence

**Character Generation**:
```javascript
{
  role: 'witness', // witness, suspect, victim, informant
  faction: 'neurosynch',
  relationship: {
    victim: 'coworker',
    suspect: 'rival'
  },
  testimony: {
    truthful: 0.7, // 70% truthful, 30% lies/mistakes
    knowledge: ['saw_suspect', 'knows_motive']
  },
  alibi: {
    location: 'office',
    corroborated: false
  }
}
```

#### 4.5 Narrative Anchor Integration (Week 12)
**Deliverables**:
- System to inject hand-authored story beats into procedural content
- Quest chain integration
- Faction story arcs
- Main story case markers

**Success Criteria**:
- Authored cases seamlessly blend with procedural
- Main story progression clear and compelling
- Faction quests tie into procedural world
- No tonal dissonance between authored/procedural

**Anchor Types**:
1. **Main Story Cases**: Key cases advancing Acts 1-3
2. **Faction Anchors**: Cases tied to faction storylines
3. **Character Anchors**: Cases developing key NPCs
4. **Lore Anchors**: Cases revealing world history

### Narrative Dependencies

**Required from Narrative Team**:
- 5-7 case templates with evidence structures
- Main story case specifications (Act 1)
- Faction quest case outlines
- Character relationship templates
- Testimony dialogue templates

**MCP Integration**:
- Store case templates as narrative elements
- Tag procedural content for consistency checking
- Link to faction lore and character arcs

### Testing Requirements
- Unit tests for generation algorithms (>70% coverage)
- Determinism tests (seeded generation)
- Quality tests (case solvability validation)
- Performance tests (generation time <1s)
- Playtesting for coherence and fun

### Risk Assessment

**Risk 1: Procedural Cases Feel Repetitive**
- **Likelihood**: High
- **Impact**: High (Core replayability concern)
- **Mitigation**: Large template pool, quality scoring, narrative anchor variety, extensive tuning
- **Fallback**: Increase authored content ratio, simplify case structures, reduce procedural scope

**Risk 2: Generation Time Exceeds Budget**
- **Likelihood**: Medium
- **Impact**: Medium (Loading times)
- **Mitigation**: Algorithm optimization, caching, background generation, profiling
- **Fallback**: Pre-generate during load screens, simplify algorithms, reduce complexity

**Risk 3: Illogical Cases Slip Through**
- **Likelihood**: Medium
- **Impact**: High (Player confusion, immersion break)
- **Mitigation**: Rigorous quality validation, solvability tests, playtest feedback loops
- **Fallback**: Reject low-quality cases, increase manual review, tighten validation rules

### Success Metrics
- ✅ District generation completes in <1s
- ✅ Generated cases solvable by >70% of playtesters
- ✅ Cases feel distinct across 10 attempts
- ✅ Narrative anchors integrate seamlessly
- ✅ Quality scoring rejects <10% of generated cases
- ✅ Performance maintained (60 FPS during gameplay)

### Rollout Plan
1. **Week 10**: District layout generation + testing
2. **Week 11**: Case generation + evidence placement
3. **Week 12**: Witness/suspect pools + narrative anchors + quality validation
4. **End of M4**: Extensive playtesting of procedural content, iteration

---

## Milestone 5: Combat & Progression

**Duration**: Weeks 13-15 (3 weeks)
**Goal**: Implement action mechanics and knowledge-gated progression

### Technical Requirements

#### 5.1 Combat System (Week 13)
**Deliverables**:
- `src/game/systems/CombatSystem.js` - Combat logic and damage
- `src/game/systems/HealthSystem.js` - Health and damage tracking
- `src/game/components/Combat.js` - Combat component
- Melee and ranged combat mechanics
- `tests/game/systems/CombatSystem.test.js`

**Success Criteria**:
- Combat feels responsive (<100ms input to action)
- Damage calculations fair and predictable
- Hit detection accurate
- Combat is failure state, not primary mechanic

**Design Philosophy**:
- **Combat as Failure**: Detective game, combat means investigation went wrong
- **Simple but Functional**: Basic attack, dodge, defensive options
- **Escape Priority**: Running away should be viable option
- **Consequence-Heavy**: Combat raises infamy, attracts attention

**Combat Mechanics**:
- Melee: Close-range attack with short cooldown
- Ranged: Limited ammo, loud (attracts guards)
- Dodge: I-frames, stamina cost
- Block: Reduce damage, no stamina cost
- Stealth Takedown: Non-lethal, requires unaware enemy

#### 5.2 Stealth System (Week 13-14)
**Deliverables**:
- `src/game/systems/StealthSystem.js` - Visibility and detection logic
- `src/game/systems/VisionSystem.js` - Enemy sight cones
- `src/game/components/Stealth.js` - Stealth component
- Light/shadow mechanics
- Sound propagation system
- `tests/game/systems/StealthSystem.test.js`

**Success Criteria**:
- Players can avoid detection through stealth
- Sight cones clearly communicated
- Light/shadow affect visibility
- Sound alerts enemies (footsteps, combat, interactions)
- Stealth provides advantage (information gathering, positioning)

**Detection States**:
- **Unaware**: Enemy doesn't know player is present
- **Suspicious**: Investigating noise/sighting
- **Alerted**: Actively searching for player
- **Combat**: Engaged in combat with player

**Stealth Mechanics**:
- Crouch: Reduced visibility, slower movement, quieter footsteps
- Cover: Break line of sight, hide from patrols
- Distractions: Throw objects to divert attention
- Noise: Running, combat, breaking objects alert enemies

#### 5.3 Enemy AI (Week 14)
**Deliverables**:
- `src/game/systems/AISystem.js` - Enemy behavior logic
- `src/game/ai/StateMachine.js` - AI state machine
- `src/game/ai/behaviors/*.js` - Patrol, chase, search, combat behaviors
- `tests/game/systems/AISystem.test.js`

**Success Criteria**:
- Enemies patrol predictably
- Enemies react to player presence (chase, search)
- Enemies call for backup when appropriate
- AI challenging but fair

**AI States**:
1. **Patrol**: Follow waypoints, periodic scans
2. **Investigate**: Move to suspicious location, search area
3. **Chase**: Pursue player at increased speed
4. **Search**: Lost sight, sweeping area
5. **Combat**: Engage player with attacks and positioning
6. **Alert**: Call for reinforcements

**AI Behavior Tree**:
```
Root
├─ Patrol (default state)
├─ Investigate (heard noise)
├─ Chase (spotted player)
├─ Search (lost sight)
└─ Combat (in range)
```

#### 5.4 Knowledge-Gated Progression (Week 14-15)
**Deliverables**:
- `src/game/managers/ProgressionManager.js` - Progression tracking
- `src/game/systems/ProgressionSystem.js` - Unlock logic
- `src/game/data/abilities/*.js` - Ability definitions
- `src/game/data/gates/*.js` - Area gate definitions
- `tests/game/managers/ProgressionManager.test.js`

**Success Criteria**:
- Solving cases unlocks abilities
- Abilities grant access to new areas
- Multiple solution paths available
- Progression feels earned, not arbitrary

**Ability Unlock Pipeline**:
```
Player collects evidence
  → Player solves case
    → Case completion event emitted
      → ProgressionSystem checks case rewards
        → Ability unlocked
          → UI notification
            → World gates re-evaluated
              → New areas accessible
```

**Core Abilities**:
1. **Memory Trace** (Act 1): Extract memories from hollow victims
   - Unlocks: Memory reconstruction minigame, hidden clue access
2. **Neural Decrypt** (Act 2A): Crack NeuroSync encryption
   - Unlocks: Corporate servers, encrypted terminals
3. **Memory Splice** (Act 2B): Combine clues creatively
   - Unlocks: Advanced deduction patterns, hidden theories
4. **Deduction Vision** (Act 2 end): Enhanced perception
   - Unlocks: Enemy weaknesses visible, hidden paths revealed
5. **Archive Interface** (Act 3): Database access
   - Unlocks: Fast travel, secret locations, lore deep dive

#### 5.5 Ability Upgrade System (Week 15)
**Deliverables**:
- Ability leveling system (1-3 levels per ability)
- Upgrade UI and selection
- Integration with case completion
- Balance testing

**Success Criteria**:
- Upgrades feel meaningful
- Choices matter (can't get everything)
- Balanced for main story progression
- Side content provides optional upgrades

**Upgrade Example: Memory Trace**
- **Level 1**: Extract single memory fragment from hollow victim
- **Level 2**: Extract multiple fragments, longer sequences
- **Level 3**: Remote memory access via Archive connection

### Narrative Dependencies

**Required from Narrative Team**:
- Ability unlock narrative justifications
- Area gate story reasons (why is this locked?)
- Enemy faction behaviors (who attacks on sight?)
- Combat consequence narratives (infamy impacts)

**MCP Integration**:
- Link abilities to narrative progression
- Store gate requirements as quest prerequisites
- Tag combat encounters with faction affiliations

### Testing Requirements
- Unit tests for combat and stealth systems (>70% coverage)
- AI behavior validation tests
- Progression unlock integration tests
- Balance testing (combat difficulty, stealth viability)
- Playtesting for progression pacing

### Risk Assessment

**Risk 1: Combat Feels Tacked On**
- **Likelihood**: Medium
- **Impact**: Medium (Game identity confusion)
- **Mitigation**: Keep combat simple, emphasize failure state, incentivize stealth/avoidance
- **Fallback**: Further simplify combat, make enemies very threatening, increase escape options

**Risk 2: Stealth Too Difficult**
- **Likelihood**: Medium
- **Impact**: Medium (Frustration)
- **Mitigation**: Generous sight cones, clear feedback, predictable patrols, save-scumming allowed
- **Fallback**: Increase player stealth effectiveness, reduce enemy perception, add more cover

**Risk 3: Progression Gates Confusing**
- **Likelihood**: Medium
- **Impact**: High (Player stuck, frustrated)
- **Mitigation**: Clear gate messages ("Need Neural Decrypt ability"), quest markers, hint system
- **Fallback**: Reduce gate requirements, add alternative paths, provide explicit guidance

### Success Metrics
- ✅ Combat functional but not primary playstyle
- ✅ Stealth viable for >80% of encounters
- ✅ AI challenging but predictable
- ✅ Progression gates clear and fair
- ✅ Abilities feel impactful
- ✅ Performance maintained (60 FPS with 10 enemies)

### Rollout Plan
1. **Week 13**: Combat system + basic stealth
2. **Week 14**: Enemy AI + knowledge-gated progression
3. **Week 15**: Ability upgrade system + integration testing + balance
4. **End of M5**: Playtesting combat/stealth balance, AI tuning

---

## Milestone 6: Story Integration

**Duration**: Weeks 16-18 (3 weeks)
**Goal**: Implement quest system and Act 1 main story arc

### Technical Requirements

#### 6.1 Quest System (Week 16)
**Deliverables**:
- `src/game/managers/QuestManager.js` - Quest lifecycle management
- `src/game/systems/QuestSystem.js` - Objective tracking
- `src/game/components/Quest.js` - Quest component
- `src/game/data/quests/*.js` - Quest definitions
- `src/game/ui/QuestLogUI.js` - Quest journal interface
- `tests/game/managers/QuestManager.test.js`

**Success Criteria**:
- Quests start/complete correctly
- Objectives update based on game events
- Branching quests supported
- UI clearly shows active/completed quests

**Quest Structure**:
```javascript
{
  id: 'case_001_hollow_case',
  title: 'The Hollow Case',
  type: 'main', // main, side, faction
  act: 'act1',

  prerequisites: {
    storyFlags: ['downtown_unlocked'],
    faction: { 'police': { minFame: 0 } }
  },

  objectives: [
    {
      id: 'obj_examine_scene',
      description: 'Examine the crime scene',
      trigger: { event: 'evidence:collected', count: 3 },
      optional: false
    },
    {
      id: 'obj_connect_clues',
      description: 'Connect the clues',
      trigger: { event: 'theory:validated', theoryId: 'theory_hollow' },
      optional: false
    }
  ],

  rewards: {
    abilityUnlock: 'memory_trace',
    storyFlags: ['case_001_solved', 'act1_progress_1'],
    factionReputation: { 'police': 20, 'criminals': -10 }
  },

  branches: [
    { condition: { obj_optional_complete: true }, nextQuest: 'case_002_alt' },
    { condition: { obj_optional_failed: true }, nextQuest: 'case_002_main' }
  ]
}
```

**Event-Driven Objectives**:
```javascript
// Quest system listens for game events
eventBus.on('evidence:collected', (data) => {
  questManager.updateObjectives('evidence:collected', data);
});

eventBus.on('dialogue:completed', (data) => {
  questManager.updateObjectives('dialogue:completed', data);
});

eventBus.on('case:solved', (data) => {
  questManager.updateObjectives('case:solved', data);
  questManager.completeQuest(data.questId);
});
```

#### 6.2 Story Flag System (Week 16)
**Deliverables**:
- `src/game/managers/StoryFlagManager.js` - Flag persistence
- Story flag evaluation in quest prerequisites
- Integration with world state
- Save/load for story flags

**Success Criteria**:
- Flags persist across sessions
- Branching quests evaluate flags correctly
- Flags control dialogue options
- Clear debugging tools for flag states

**Story Flags**:
```javascript
// Act progression
'act1_started', 'act1_complete', 'act2_started', ...

// Case progress
'case_001_solved', 'case_002_started', ...

// Key revelations
'knows_curator_identity', 'knows_founders_massacre', ...

// Player choices
'helped_resistance', 'betrayed_neurosynch', 'restored_memories', ...

// Faction states
'police_hostile', 'resistance_allied', ...
```

#### 6.3 Act 1 Implementation (Week 16-17)
**Deliverables**:
- Complete Act 1 quest chain (5-7 cases)
- All Act 1 locations implemented
- Act 1 NPCs and dialogue
- Act 1 evidence and clues
- Tutorial integration

**Act 1 Structure** (from narrative):
- **Duration**: 25% of game (2-3 hours)
- **Setting**: Neon Districts (lower city)
- **Mystery**: Who is extracting memories and why?

**Key Beats**:
1. **Inciting Incident**: Former partner becomes hollow victim
2. **Tutorial Case**: Learn investigation mechanics
3. **Pattern Discovery**: Multiple hollow victims with NeuroSync connection
4. **Memory Parlor Infiltration**: First encounter with Eraser agents
5. **Climax**: Recover memory drive showing Kira destroying evidence
6. **Resolution**: Gain credentials to Mid-City, unlock Memory Trace ability

**Act 1 Cases**:
- **Case 001**: "The Hollow Case" (Tutorial)
- **Case 002**: "Following the Pattern" (Procedural)
- **Case 003**: "Memory Parlor" (Hand-authored, infiltration)
- **Case 004**: "Informant Network" (Procedural, NPC focus)
- **Case 005**: "The Memory Drive" (Hand-authored, climax)

#### 6.4 Branching Path Implementation (Week 17-18)
**Deliverables**:
- Act 2 branching structure (Corporate/Resistance/Personal threads)
- Player choice mechanics (decision points)
- Consequence tracking
- Multiple path validation

**Act 2 Branching** (from narrative):
- **Duration**: 45% of game (4-5 hours)
- **Settings**: Corporate Spires, Archive Undercity
- **Mystery**: What is The Archive and what is being hidden?

**Three Parallel Threads** (player chooses order):
- **Thread A - Corporate Infiltration**: NeuroSync infiltration, meet Dr. Chen, gain Neural Decrypt
- **Thread B - Resistance Contact**: Meet Soren, gain Memory Splice
- **Thread C - Personal Investigation**: Captain Reese, access old case files

**Convergence Point**: All threads reveal Founder's Massacre coverup

**Major Choice**: Restore memories (narrative clarity + mechanical debuff) OR stay fragmented (harder deductions + maintains agency)

#### 6.5 World State Persistence (Week 18)
**Deliverables**:
- Complete save/load system
- World state serialization
- NPC memory persistence
- Faction reputation persistence
- Case progress persistence

**Success Criteria**:
- All game state saves/loads correctly
- No data loss or corruption
- Load time <2s
- Multiple save slots supported
- Autosave every 5 minutes

**Save Data Structure**:
```javascript
{
  version: '1.0',
  timestamp: 1234567890,

  player: {
    position: { x, y, district },
    abilities: ['memory_trace', 'neural_decrypt'],
    inventory: [],
    health: 100
  },

  quests: {
    active: ['case_003'],
    completed: ['case_001', 'case_002'],
    objectives: { ... }
  },

  factions: {
    reputation: { 'police': { fame: 50, infamy: 10 }, ... },
    knownBy: ['npc_001', 'npc_005']
  },

  worldState: {
    districts: { 'downtown': { controller: 'police', stability: 0.8 } },
    storyFlags: ['act1_complete', 'knows_curator_identity'],
    npcStates: { ... }
  }
}
```

### Narrative Dependencies

**Required from Narrative Team**:
- Complete Act 1 quest scripts
- All Act 1 dialogue (Kira, NPCs, witnesses)
- Act 1 case structures (evidence, clues, theories)
- Act 2 branching path outlines
- Key decision point narratives
- Ending variations (4 endings)

**MCP Integration**:
- Store all Act 1 cases as narrative elements
- Link branching paths to player choice system
- Tag endings with prerequisite flags

### Testing Requirements
- Unit tests for quest system (>80% coverage)
- Integration tests for quest → progression pipeline
- Narrative flow tests (all branches reachable)
- Save/load stress tests (no data loss)
- Full Act 1 playthrough (QA team)

### Risk Assessment

**Risk 1: Branching Creates Exponential Content**
- **Likelihood**: High
- **Impact**: High (Scope explosion)
- **Mitigation**: Convergent branching (threads rejoin), shared assets, procedural variation
- **Fallback**: Reduce branch count, simplify choices, linear narrative with flavor choices

**Risk 2: Save/Load Corruption**
- **Likelihood**: Low
- **Impact**: High (Player frustration)
- **Mitigation**: Versioned saves, validation, multiple slots, cloud backup
- **Fallback**: New game if unrecoverable, graceful degradation, debug tools

**Risk 3: Act 1 Pacing Issues**
- **Likelihood**: Medium
- **Impact**: Medium (Player engagement)
- **Mitigation**: Playtesting, pacing iteration, skip tutorials option, dynamic difficulty
- **Fallback**: Shorten Act 1, streamline cases, faster progression

### Success Metrics
- ✅ Act 1 completable start-to-finish
- ✅ Quest objectives clear and trackable
- ✅ Branching paths all reachable and functional
- ✅ Save/load works flawlessly (0% corruption rate)
- ✅ Main story compelling (>70% completion rate)
- ✅ Performance maintained (60 FPS)

### Rollout Plan
1. **Week 16**: Quest system + story flags + Case 001-002
2. **Week 17**: Act 1 completion (Cases 003-005) + branching structure
3. **Week 18**: World state persistence + save/load + full integration
4. **End of M6**: Full Act 1 QA pass, narrative coherence check, balance iteration

---

## Milestone 7: Vertical Slice Polish

**Duration**: Weeks 19-20 (2 weeks)
**Goal**: Polish vertical slice to demo-ready quality

### Technical Requirements

#### 7.1 Performance Optimization (Week 19)
**Deliverables**:
- Complete performance profiling
- Optimization pass on hotspots
- GC optimization (object pooling refinement)
- Memory leak detection and fixes
- Frame time analysis and optimization

**Success Criteria**:
- 60 FPS maintained in all scenarios
- No frame drops during gameplay
- Memory usage stable (<150MB)
- GC pauses <10ms, <3 per minute
- Load times meet targets (<3s critical, <1s district)

**Optimization Targets**:
- ECS queries: Cache component lookups
- Rendering: Sprite batching, dirty rect optimization
- Physics: Spatial hash tuning, early collision exits
- Event bus: Reduce event frequency, batch updates
- Procedural generation: Pre-generate during load screens

**Profiling Checklist**:
- [ ] Chrome DevTools Performance profiling
- [ ] Memory profiling (heap snapshots)
- [ ] Frame time breakdown analysis
- [ ] Network profiling (asset loading)
- [ ] GC pause identification

#### 7.2 Audio Implementation (Week 19)
**Deliverables**:
- `src/engine/audio/AudioManager.js` - Web Audio API integration
- Adaptive music system (layered tracks)
- SFX system with 3D positioning
- Audio pooling for performance
- Integration with game events

**Success Criteria**:
- Music layers crossfade smoothly
- SFX positioned correctly (3D audio)
- No audio pops or clicks
- Performance impact <5% CPU
- Audio enhances atmosphere

**Audio Systems**:
- **Adaptive Music**: Background ambience + tension + action layers
  - Downtown: Noir jazz + synth tension + combat drums
  - Corporate: Clean electronica + corporate tension + alarm
- **SFX**: Footsteps, evidence pickup, deduction success, combat, UI
- **3D Positioning**: Sound volume/pan based on distance/direction

**Music State Transitions**:
```javascript
// Exploration → Suspicious → Combat
audioManager.setState('exploration'); // ambient 1.0, tension 0.0, combat 0.0
// Player spotted
audioManager.setState('suspicious'); // ambient 0.6, tension 0.8, combat 0.0
// Combat starts
audioManager.setState('combat'); // ambient 0.3, tension 0.4, combat 1.0
```

#### 7.3 Visual Polish (Week 19-20)
**Deliverables**:
- Particle effects (rain, neon glow, memory fragments)
- Screen effects (flash, screen shake, transitions)
- UI polish (animations, transitions, feedback)
- Environmental effects (lighting, shadows)
- Post-processing (CRT scan lines, chromatic aberration)

**Success Criteria**:
- Visual effects enhance atmosphere
- Particle systems performant (60 FPS with 500 particles)
- UI feels responsive and polished
- Environmental effects don't tank performance

**Visual Effects List**:
- **Rain**: Constant downpour in outdoor areas (noir atmosphere)
- **Neon Glow**: Signs, terminals, evidence highlights
- **Memory Fragments**: Ethereal particles during Memory Trace
- **Screen Shake**: Impact, explosions, detective vision activation
- **Transitions**: Smooth fade between districts, time skip effects
- **Evidence Highlight**: Pulsing glow for interactive objects

#### 7.4 Bug Fixing & Stabilization (Week 20)
**Deliverables**:
- Critical bug fixes (crashes, soft locks)
- High-priority bug fixes (gameplay blockers)
- Medium-priority bug fixes (quality issues)
- Low-priority bug tracking (post-vertical slice)

**Success Criteria**:
- Zero critical bugs
- Zero high-priority bugs
- <5 medium-priority bugs
- All systems stable and functional

**Bug Triage Process**:
- **Critical**: Crashes, data loss, progression blocks → Fix immediately
- **High**: Major gameplay issues, visual glitches, performance problems → Fix this milestone
- **Medium**: Minor issues, edge cases, polish items → Fix if time permits
- **Low**: Rare issues, cosmetic problems → Defer to post-vertical slice

#### 7.5 Playtesting & Iteration (Week 20)
**Deliverables**:
- Internal playtesting sessions (5-10 players)
- Feedback collection and analysis
- Iteration on major pain points
- Balance adjustments (difficulty, pacing, progression)
- Final polish pass

**Success Criteria**:
- >80% of playtesters complete Act 1
- >70% understand core mechanics without external help
- Average session length >30 minutes
- Positive feedback on investigation mechanics
- Identified issues addressed or documented

**Playtesting Focus Areas**:
- Tutorial effectiveness (do players understand deduction board?)
- Investigation pacing (too slow? too fast?)
- Faction system clarity (reputation cascades confusing?)
- Difficulty balance (too easy? too hard?)
- Performance on target hardware
- Bug discovery (edge cases, soft locks)

### Narrative Dependencies

**Required from Narrative Team**:
- Final dialogue polish
- Typo fixes and grammar check
- Pacing feedback (story beats feel right?)
- Tonal consistency check
- Ending satisfaction validation

**MCP Integration**:
- Final narrative consistency check against stored elements
- Ensure all quest branches properly linked
- Validate faction relationships align with lore

### Testing Requirements
- Full QA pass on entire vertical slice
- Performance testing on target hardware
- Browser compatibility testing (Chrome, Firefox, Safari, Edge)
- Save/load stress testing
- Regression testing (ensure fixes don't break other systems)

### Risk Assessment

**Risk 1: Performance Targets Not Met**
- **Likelihood**: Medium
- **Impact**: High (Core quality metric)
- **Mitigation**: Early profiling, aggressive optimization, dynamic quality scaling
- **Fallback**: Reduce entity counts, simplify effects, lower visual complexity

**Risk 2: Critical Bugs Discovered Late**
- **Likelihood**: Medium
- **Impact**: High (Release delay)
- **Mitigation**: Continuous testing, automated regression tests, code review
- **Fallback**: Extend timeline, reduce scope, patch post-release

**Risk 3: Playtesting Reveals Major Issues**
- **Likelihood**: Medium
- **Impact**: Medium (Requires iteration)
- **Mitigation**: Regular internal testing, diverse tester pool, rapid iteration
- **Fallback**: Document for post-vertical slice, simplify problematic systems

### Success Metrics
- ✅ 60 FPS maintained (avg >58, 1% low >50)
- ✅ Zero critical/high bugs
- ✅ Audio enhances atmosphere
- ✅ Visual effects polished and performant
- ✅ Playtester completion rate >80%
- ✅ Playtester satisfaction >70%
- ✅ Vertical slice feels complete and compelling

### Rollout Plan
1. **Week 19 (Days 1-3)**: Performance profiling and optimization
2. **Week 19 (Days 4-5)**: Audio implementation
3. **Week 19 (Days 6-7)**: Visual polish start
4. **Week 20 (Days 1-2)**: Visual polish completion
5. **Week 20 (Days 3-4)**: Bug fixing sprint
6. **Week 20 (Days 5-7)**: Playtesting and final iteration
7. **End of M7**: Vertical slice complete and demo-ready

---

## Feature Pillars: Cross-Cutting Concerns

These pillars span multiple milestones and must be maintained throughout development.

### Pillar 1: Investigation System Evolution

**Milestone 2**: Foundation (evidence, deduction board, forensics)
**Milestone 4**: Procedural cases integrated
**Milestone 5**: Abilities unlock investigation depth
**Milestone 6**: Investigation drives story progression

**Progression Arc**:
- Act 1: Learn investigation basics, simple cases
- Act 2: Complex cases with branching theories, multiple solution paths
- Act 3: Master-level deductions, synthesis of all evidence

**Quality Metrics**:
- Case completion rate >70%
- Deduction board usability (no external tutorial needed)
- Theory validation feels fair (not too strict)
- Forensic minigames engaging (not tedious)

### Pillar 2: Faction Reputation Progression

**Milestone 3**: Foundation (reputation, disguises, NPC memory)
**Milestone 5**: Faction-gated progression
**Milestone 6**: Faction questlines and endings

**Progression Arc**:
- Act 1: Neutral starting point, learn faction dynamics
- Act 2: Choose alignment, commit to faction threads
- Act 3: Faction standings determine ending options

**Quality Metrics**:
- Reputation changes predictable (>80% player understanding)
- Cascading consequences feel logical
- Disguises enable meaningful infiltration
- Faction choices impact story meaningfully

### Pillar 3: Knowledge-Gated Metroidvania

**Milestone 2**: First ability (Memory Trace)
**Milestone 5**: Full ability suite and gating
**Milestone 6**: Story integration with knowledge gates

**Progression Arc**:
- Act 1: Linear progression, introduce gating concept
- Act 2: Multiple paths, player chooses order
- Act 3: All abilities available, full world access

**Quality Metrics**:
- Gates communicate requirements clearly
- Multiple solution paths available
- Abilities feel earned (not arbitrary)
- Backtracking encouraged (secrets in early areas)

### Pillar 4: Procedural Generation Integration

**Milestone 4**: Foundation (districts, cases, witnesses)
**Milestone 5**: Integration with progression
**Milestone 6**: Narrative anchors blend seamlessly

**Quality Metrics**:
- Procedural content indistinguishable from authored
- Cases feel distinct across 10+ attempts
- Generation time <1s
- Quality scoring rejects illogical content
- Replayability enhanced (not just repetition)

---

## Act-Based Narrative Milestones

### Act 1: The Hollow Case (Milestone 6, Week 16-17)

**Technical Milestones Required**:
- ✅ M1: Core engine
- ✅ M2: Investigation mechanics
- ✅ M3: Faction basics (police reputation)
- ✅ M5: Basic abilities (Memory Trace)

**Narrative Checkpoints**:
1. **Opening**: Kira receives anonymous tip about hollow victim
   - **Tech**: Tutorial UI, dialogue system, quest start
2. **Investigation**: Crime scene examination in Neon Districts
   - **Tech**: Evidence collection, detective vision, forensic minigame
3. **Pattern Discovery**: Multiple victims with NeuroSync connection
   - **Tech**: Deduction board, clue connections, theory validation
4. **Infiltration**: Memory parlor infiltration, Eraser encounter
   - **Tech**: Stealth mechanics, combat as failure state, chase sequence
5. **Climax**: Recover memory drive, see Kira destroying evidence
   - **Tech**: Memory Trace ability unlock, cutscene system
6. **Resolution**: Gain Mid-City credentials, Act 1 complete
   - **Tech**: Quest completion, story flag set, district unlock

**Dependencies**:
- Investigation system fully functional
- Tutorial case authored and tested
- Memory Trace ability implemented
- Neon Districts district fully built
- Act 1 NPCs and dialogue complete

**Success Criteria**:
- ✅ Act 1 completable in 2-3 hours
- ✅ Tutorial effective (>80% completion)
- ✅ Story hooks compelling (players want to continue)
- ✅ Mechanics taught through gameplay (not text dumps)

### Act 2: Fracture Points (Post-Vertical Slice)

**Technical Milestones Required**:
- ✅ M6: Branching quest system
- ✅ M5: All Act 2 abilities (Neural Decrypt, Memory Splice, Deduction Vision)
- ✅ M3: Full faction system (reputation, disguises, district control)
- ✅ M4: Procedural content blending with authored

**Narrative Checkpoints**:
1. **Branching**: Player chooses thread order (Corporate/Resistance/Personal)
   - **Tech**: Choice UI, branch tracking, independent quest chains
2. **Corporate Thread**: NeuroSync infiltration, meet Dr. Chen
   - **Tech**: Disguise system, hacking minigame, Neural Decrypt unlock
3. **Resistance Thread**: Meet Soren, explore Archive Undercity
   - **Tech**: New district, Memory Splice unlock, faction questline
4. **Personal Thread**: Captain Reese, access old case files
   - **Tech**: Dialogue system, evidence linking, lore reveals
5. **Convergence**: All threads reveal Founder's Massacre
   - **Tech**: Deduction synthesis, major story reveal cutscene
6. **Crisis Choice**: Restore memories or stay fragmented
   - **Tech**: Major choice mechanic, stat modifier system, branch point
7. **Archive Depths**: First Curator confrontation
   - **Tech**: Deduction Vision unlock, undercity access, Act 2 climax

**Dependencies** (Not in Vertical Slice):
- Corporate Spires district complete
- Archive Undercity district complete
- Dr. Chen, Soren, Captain Reese NPCs authored
- Founder's Massacre lore documents
- Memory restoration choice system
- Act 2 abilities fully implemented

### Act 3: The Archive Protocol (Post-Vertical Slice)

**Technical Milestones Required**:
- ✅ M6: Multiple endings system
- ✅ M5: Archive Interface ability
- ✅ M3: Faction endings (Allied/Hostile states matter)
- ✅ M4: Final areas procedurally enhanced

**Narrative Checkpoints**:
1. **Synthesis**: Interactive deduction board reveals Curator identity
   - **Tech**: Complex deduction puzzle, all clues available
2. **Infiltration**: Zenith Sector stealth/action climax
   - **Tech**: Combat + stealth finale, heightened difficulty
3. **Confrontation**: Face Dr. Elias Morrow, learn full truth
   - **Tech**: Dialogue system, choice mechanics, faction checks
4. **Final Choice**: Four endings based on player decisions
   - **Tech**: Ending system, save data analysis, epilogue generation

**Four Endings**:
1. **Shutdown**: Destroy Archive (mercy for victims, no justice)
2. **Controlled Disclosure**: Balanced approach (gradual truth)
3. **Full Broadcast**: Public reveal (justice but mass trauma)
4. **Restoration**: Absorb Archive (secret ending, requires side quests)

**Dependencies** (Not in Vertical Slice):
- Zenith Sector district complete
- Final boss area (if combat-focused ending)
- All ending cutscenes authored
- Epilogue system (shows consequences)
- Final deduction puzzle designed

---

## Risk Mitigation Strategy

### Technical Risks

**Performance Degradation**
- **Mitigation Timeline**:
  - M1 (Week 3): Baseline performance established, profiling tools set up
  - M5 (Week 15): Performance check with full combat/stealth load
  - M7 (Week 19): Final optimization pass
- **Fallback Triggers**: FPS drops below 55 avg, memory exceeds 180MB
- **Fallback Plan**: Dynamic quality scaling, entity count reduction, effect simplification

**Procedural Quality**
- **Mitigation Timeline**:
  - M4 (Week 12): Quality validation system complete, reject <90% cases
  - M6 (Week 18): Narrative anchor integration tested
  - M7 (Week 20): Playtesting validates procedural content feels authored
- **Fallback Triggers**: >20% case rejection rate, playtest feedback negative
- **Fallback Plan**: Increase authored content ratio, simplify case templates, tighter validation

**Investigation Mechanics Obscurity**
- **Mitigation Timeline**:
  - M2 (Week 6): Tutorial case tested, >80% completion rate
  - M6 (Week 17): Full Act 1 tested, progression clear
  - M7 (Week 20): Playtesting validates understanding
- **Fallback Triggers**: <60% tutorial completion, players report confusion
- **Fallback Plan**: Enhanced tutorials, hint system, simplified deduction board, skip options

### Scope Risks

**Feature Creep**
- **Mitigation**: Strict feature lockdown after M4 (Week 12)
- **Review Points**: End of each milestone, architect reviews scope
- **Fallback**: Cut non-critical features, defer to post-vertical slice
- **Protected Features** (cannot cut): Investigation, faction, Act 1 story, procedural cases

**Timeline Overrun**
- **Mitigation**: 2-week buffer built into 20-week timeline
- **Checkpoint Reviews**: Every 2 weeks, assess progress vs. plan
- **Fallback**: Reduce procedural scope, simplify Act 2/3 (post-vertical slice anyway), extend timeline by max 2 weeks

**Coordination Failures**
- **Mitigation**: Daily async standup, MCP state sharing, clear interface contracts
- **Review Points**: End of each week, sync meeting for blockers
- **Fallback**: Architect intervenes, reprioritizes work, adjusts dependencies

### Narrative Risks

**Branching Scope Explosion**
- **Mitigation**: Convergent branching (threads rejoin), shared assets
- **Review Points**: M6 (Week 16) branching complexity review
- **Fallback**: Reduce branches, linear narrative with flavor choices

**Pacing Issues**
- **Mitigation**: Internal playtesting at M6 (Week 18)
- **Review Points**: Act 1 completion time, player engagement metrics
- **Fallback**: Shorten Act 1, streamline cases, adjust progression curve

**Tonal Inconsistency**
- **Mitigation**: Narrative team reviews all dialogue, lore consistency checks via MCP
- **Review Points**: M6 (Week 18) full narrative pass
- **Fallback**: Dialogue polish pass, tone guide document

---

## Success Criteria by Milestone

### Milestone 1: Core Engine (Week 3)
- [ ] ECS creates 10,000 entities in <100ms
- [ ] Component queries <1ms for 1000 entities
- [ ] 60 FPS with 500 sprites
- [ ] Spatial hash reduces collision checks by >90%
- [ ] Event dispatch <0.1ms per event
- [ ] Assets load in <3s (critical)
- [ ] Zero memory leaks
- [ ] Test coverage >80%

### Milestone 2: Investigation (Week 6)
- [ ] Evidence collection functional
- [ ] Deduction board usable without tutorial
- [ ] Tutorial case completable by >80% of testers
- [ ] Forensic minigames engaging
- [ ] Detective vision reveals hidden evidence
- [ ] Theory validation feels fair
- [ ] 60 FPS maintained

### Milestone 3: Faction (Week 9)
- [ ] Reputation changes predictable
- [ ] NPCs react to reputation
- [ ] Disguises enable infiltration (>70% success for careful players)
- [ ] District control changes visible
- [ ] World state persists correctly
- [ ] 60 FPS maintained

### Milestone 4: Procedural (Week 12)
- [ ] Districts generate in <1s
- [ ] Cases solvable by >70% of testers
- [ ] Cases feel distinct (10+ attempts)
- [ ] Narrative anchors integrate seamlessly
- [ ] Quality scoring rejects <10% of cases
- [ ] 60 FPS maintained

### Milestone 5: Combat (Week 15)
- [ ] Combat functional but not primary
- [ ] Stealth viable for >80% of encounters
- [ ] AI challenging but predictable
- [ ] Progression gates clear
- [ ] Abilities feel impactful
- [ ] 60 FPS with 10 enemies

### Milestone 6: Story (Week 18)
- [ ] Act 1 completable start-to-finish
- [ ] Quest objectives clear
- [ ] Branching paths functional
- [ ] Save/load flawless (0% corruption)
- [ ] Main story compelling (>70% completion)
- [ ] 60 FPS maintained

### Milestone 7: Polish (Week 20)
- [ ] 60 FPS maintained (avg >58, 1% low >50)
- [ ] Zero critical/high bugs
- [ ] Audio enhances atmosphere
- [ ] Visual effects polished
- [ ] Playtester completion >80%
- [ ] Playtester satisfaction >70%

---

## MCP Integration Requirements

### Throughout Development

**Architecture Decisions** (store after each milestone):
- M1: Core engine architecture decisions (ECS, rendering, physics)
- M2: Investigation system design patterns
- M3: Faction system architecture
- M4: Procedural generation algorithms
- M5: Combat/progression design
- M6: Quest system architecture
- M7: Performance optimization strategies

**Pattern Storage** (as implemented):
- ECS component patterns
- System update patterns
- Event-driven quest patterns
- Procedural generation templates
- UI/UX patterns

**Narrative Integration** (continuous):
- Store all cases as narrative elements
- Link abilities to narrative progression
- Tag factions with world-building lore
- Store dialogue with character/faction tags
- Track story flags in narrative outline

**Consistency Checking** (before each milestone):
- Validate new systems against existing patterns
- Check faction relationships against lore
- Ensure quest prerequisites align with progression
- Verify procedural content matches narrative tone

---

## Resource Allocation

### Development Agents

**Engine Developer** (M1-M7):
- M1 (100%): Core engine implementation
- M2-M6 (30%): Bug fixes, performance monitoring
- M7 (100%): Performance optimization, bug fixes

**Gameplay Developer** (M2-M7):
- M2 (100%): Investigation mechanics
- M3 (100%): Faction systems
- M4 (100%): Procedural generation
- M5 (100%): Combat and progression
- M6 (50%): Quest system integration
- M7 (30%): Bug fixes, balance

**Narrative Writer** (M0-M7):
- M0 (100%): Narrative vision (COMPLETE)
- M2 (50%): Tutorial case
- M6 (100%): Act 1 implementation
- M7 (30%): Dialogue polish

**World-Building Agent** (M0-M7):
- M0 (100%): Faction and location lore (COMPLETE)
- M3 (30%): Faction content
- M4 (50%): District themes
- M6 (20%): Lore consistency

**Dialogue Agent** (M2-M7):
- M2 (30%): Tutorial dialogue
- M3 (50%): NPC dialogue variations
- M6 (80%): Act 1 dialogue
- M7 (40%): Dialogue polish

**Test Engineer** (M1-M7):
- M1-M6 (50%): Unit tests, integration tests
- M7 (100%): QA pass, bug fixing

**Playtester** (M2-M7):
- M2 (20%): Tutorial testing
- M4 (30%): Procedural content testing
- M6 (50%): Act 1 playtesting
- M7 (100%): Full vertical slice playtesting

**Optimizer** (M1-M7):
- M1 (30%): Initial profiling setup
- M5 (40%): Mid-development optimization
- M7 (100%): Final optimization pass

**Documenter** (M1-M7):
- M1-M6 (20%): Living documentation
- M7 (40%): Final documentation pass

### External Assets

**Asset Requests** (logged in `assets/*/requests.json`):
- M1: UI placeholders, basic sprites
- M2: Evidence sprites, UI elements
- M3: NPC sprites, faction icons
- M4: District tilesets (4 themes)
- M5: Combat effects, ability visuals
- M6: Cutscene assets, quest UI
- M7: Audio tracks, SFX, polish effects

**Note**: All asset requests logged but not generated by Claude. Human asset creation or external sourcing required.

---

## Next Steps (Immediate Actions)

### Week 1 Kickoff

1. **Store Roadmap Decisions** (Architect):
   - Store roadmap strategy as architecture decision in MCP
   - Document milestone dependencies
   - Establish success criteria validation process

2. **Create M1 Implementation Plans** (Architect):
   - ECS core implementation plan (`docs/plans/ecs-core-plan.md`)
   - Rendering pipeline plan (`docs/plans/rendering-plan.md`)
   - Physics system plan (`docs/plans/physics-plan.md`)
   - Event bus plan (`docs/plans/event-bus-plan.md`)
   - Asset manager plan (`docs/plans/asset-manager-plan.md`)

3. **Set Up Development Environment** (Engine Developer):
   - Initialize Vite build pipeline
   - Configure ESLint and Prettier
   - Set up Jest testing framework
   - Create initial file structure

4. **Begin ECS Implementation** (Engine Developer):
   - `src/engine/ecs/EntityManager.js`
   - `src/engine/ecs/ComponentRegistry.js`
   - `src/engine/ecs/SystemManager.js`
   - `tests/engine/ecs/*.test.js`

5. **Prepare Narrative Content** (Narrative Team):
   - Finalize tutorial case structure
   - Begin Act 1 case outlines
   - Draft evidence and clue descriptions

---

## Document Metadata

**Version**: 1.0
**Author**: Lead Architect
**Date**: 2025-10-26
**Status**: Final
**Next Review**: End of Milestone 1 (Week 3)

**Related Documents**:
- `docs/plans/project-overview.md` - Complete project specification
- `docs/plans/*-plan.md` - Individual system implementation plans (to be created)

**MCP References**:
- Architecture decisions: ECS, rendering, physics (stored)
- Narrative elements: Acts 1-3, characters, factions (stored)
- Lore database: 7 factions, 4 locations (stored)

---

## Appendix: Timeline Summary Table

| Milestone | Duration | Weeks | Focus | Key Deliverables | Dependencies |
|-----------|----------|-------|-------|------------------|--------------|
| **M0: Bootstrap** | Complete | 0 | Research & Planning | Narrative vision, architecture | None |
| **M1: Core Engine** | 3 weeks | 1-3 | ECS, Rendering, Physics | Functional game engine | M0 |
| **M2: Investigation** | 3 weeks | 4-6 | Detective mechanics | Evidence, deduction, forensics | M1 |
| **M3: Faction** | 3 weeks | 7-9 | Reputation, disguises | Faction system, NPC memory | M1 |
| **M4: Procedural** | 3 weeks | 10-12 | Generation systems | Districts, cases, witnesses | M1 |
| **M5: Combat** | 3 weeks | 13-15 | Action mechanics | Combat, stealth, progression | M1, M2 |
| **M6: Story** | 3 weeks | 16-18 | Quest system, Act 1 | Complete Act 1, branching | M2, M3, M5 |
| **M7: Polish** | 2 weeks | 19-20 | Optimization, audio | Vertical slice complete | M1-M6 |

**Total Timeline**: 20 weeks (4.5 months)
**Buffer**: 2 weeks built into estimates
**Critical Path**: M0 → M1 → M2 → M6 → M7
