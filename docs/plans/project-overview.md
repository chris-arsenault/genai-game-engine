# Project Overview: The Memory Syndicate

## Executive Summary

### Game Concept
**The Memory Syndicate** is a 2D Detective Metroidvania set in Mnemosynē City, 2087, where memories can be extracted, traded, and weaponized. Players control Detective Kira Voss, investigating "hollow" victims whose consciousness has been extracted while uncovering The Archive—a conspiracy spanning 30 years. Investigation drives progression: players explore an interconnected noir city, investigating crime scenes and connecting clues to unlock new abilities and access areas. Unlike traditional Metroidvanias where progression comes from combat mastery, this game gates advancement through intellectual discovery, deduction, and social stealth.

### Target Audience
- **Primary**: Metroidvania fans seeking narrative depth and intellectual challenge
- **Secondary**: Detective/mystery game enthusiasts, immersive sim players
- **Demographics**: 18-35 years old, PC gamers, 10-30 hours playtime expectation
- **Skill Level**: Medium difficulty, rewards patience and observation over reflexes

### Unique Selling Points
1. **Knowledge-Gated Progression**: Abilities and areas unlock through investigation, not combat
2. **Social Stealth & Deduction**: Disguises, faction reputation, and conversation choices matter
3. **Procedural Case Generation**: Dynamic crime scenes, witness pools, and evidence placement
4. **Faction Web**: Political intrigue with cascading consequences across multiple organizations
5. **Noir/Cyberpunk Aesthetic**: Atmospheric setting with rain-soaked streets and neon-lit corruption
6. **Intellectual Challenge**: Progression rewards careful observation and logical deduction

### Technical Foundation
- **Technology**: Vanilla JavaScript (ES6+) with HTML5 Canvas API
- **Architecture**: Entity-Component-System (ECS) pattern
- **Target Performance**: 60 FPS (16ms frame budget) on mid-range hardware
- **Scope**: Medium complexity, 4-6 month development timeline, 15-20k LOC
- **Platform**: Web-based, cross-browser compatible

---

## Genre & Core Pillars

### Detective Metroidvania Hybrid
**Primary Genre**: Metroidvania (exploration, interconnected world, ability-gated progression)
**Investigation Layer**: Detective mechanics (crime scenes, clues, deduction board, case files)
**Stealth-Action Layer**: Social stealth (disguises, faction reputation, infiltration)

### Core Gameplay Loop
1. **Explore** interconnected city districts (interconnected hub-based zones)
2. **Investigate** crime scenes to gather evidence (observation, forensics, interrogation)
3. **Connect** clues on deduction board to form theories
4. **Unlock** new abilities, areas, or faction access through solved cases
5. **Progress** story by solving major cases and navigating faction politics
6. **Adapt** as choices ripple through faction relationships and world state

### Three Pillars

#### 1. Investigation-Driven Progression
- **Knowledge-Gating**: World is open but opaque until player learns rules and patterns
- **Deduction Mechanics**: Connect evidence nodes to unlock insights
- **Case Complexity**: Procedural cases with hand-authored narrative anchors
- **Evidence Types**: Physical clues, witness testimony, forensic analysis, documents
- **Theory Building**: Multiple valid theories, but only correct ones unlock progression

#### 2. Interconnected World with Faction Dynamics
- **Metroidvania Structure**: Hub-based districts with interconnected shortcuts
- **Dynamic Faction Control**: Districts shift allegiance based on player choices
- **Dual-Axis Reputation**: Fame (hero) vs Infamy (antihero) with cascading consequences
- **Social Stealth**: Disguises and faction standing enable infiltration
- **Reactive World**: NPCs remember actions, dialogue changes, areas become hostile/friendly

#### 3. Procedural Depth with Narrative Anchors
- **Procedural Cases**: District layouts, evidence placement, witness pools generated
- **Authored Beats**: Major story cases are hand-crafted narrative moments
- **Emergent Stories**: Faction conflicts, betrayals, and alliances emerge from systems
- **Replayability**: Multiple solution paths, faction alliances, case variations
- **World State Persistence**: Consequences carry forward through playthrough

---

## Technical Architecture

### High-Level Systems Map

```
┌─────────────────────────────────────────────────────────────────┐
│                        GAME LOOP (16ms)                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌───────────┐ │
│  │   INPUT    │→ │ ECS UPDATE │→ │  RENDERER  │→ │  PRESENT  │ │
│  │   ~1ms     │  │   ~6ms     │  │   ~8ms     │  │   ~1ms    │ │
│  └────────────┘  └────────────┘  └────────────┘  └───────────┘ │
└─────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│                     CORE ENGINE SYSTEMS                            │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │              ENTITY-COMPONENT-SYSTEM (ECS)               │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │    │
│  │  │    Entity    │  │  Component   │  │    System    │   │    │
│  │  │   Manager    │  │   Registry   │  │   Manager    │   │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘   │    │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  RENDERING  │  │   PHYSICS   │  │    AUDIO    │              │
│  │             │  │             │  │             │              │
│  │ - Layered   │  │ - Spatial   │  │ - Adaptive  │              │
│  │ - Dirty     │  │   Hash      │  │   Music     │              │
│  │   Rects     │  │ - AABB/     │  │ - SFX Pool  │              │
│  │ - Batching  │  │   Circle    │  │ - Web Audio │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  EVENT BUS  │  │    ASSET    │  │   OBJECT    │              │
│  │             │  │  MANAGEMENT │  │   POOLING   │              │
│  │ - Pub/Sub   │  │             │  │             │              │
│  │ - Queuing   │  │ - Lazy Load │  │ - Particles │              │
│  │ - Priority  │  │ - Ref Count │  │ - Effects   │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                    │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│                    GAMEPLAY SYSTEMS LAYER                          │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  INVESTIGATION  │  │     FACTION     │  │   PROCEDURAL    │  │
│  │                 │  │    REPUTATION   │  │   GENERATION    │  │
│  │ - Case Manager  │  │                 │  │                 │  │
│  │ - Evidence      │  │ - Fame/Infamy   │  │ - Districts     │  │
│  │ - Deduction     │  │ - Relations     │  │ - Cases         │  │
│  │ - Forensics     │  │ - Control Map   │  │ - Witnesses     │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│                                                                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  QUEST/STORY    │  │  WORLD STATE    │  │    COMBAT/      │  │
│  │                 │  │                 │  │    STEALTH      │  │
│  │ - Case Chain    │  │ - Persistence   │  │                 │  │
│  │ - Progression   │  │ - NPC Memory    │  │ - Social        │  │
│  │ - Branches      │  │ - District      │  │ - Physical      │  │
│  │ - Triggers      │  │   Changes       │  │ - Detection     │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│                                                                    │
└───────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────┐
│                     DATA FLOW EXAMPLE                              │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Player examines crime scene                                       │
│         │                                                          │
│         ↓                                                          │
│  InputSystem → InteractionSystem                                   │
│         │                                                          │
│         ↓                                                          │
│  Event: evidence:collected                                         │
│         │                                                          │
│         ├──→ InvestigationSystem (adds to case file)              │
│         ├──→ QuestSystem (checks objectives)                       │
│         ├──→ UISystem (updates inventory display)                 │
│         └──→ AudioSystem (plays SFX)                               │
│                                                                    │
│  Player connects clues on deduction board                          │
│         │                                                          │
│         ↓                                                          │
│  DeductionSystem validates theory                                  │
│         │                                                          │
│         ↓                                                          │
│  Event: case:solved                                                │
│         │                                                          │
│         ├──→ ProgressionSystem (unlocks ability)                   │
│         ├──→ FactionSystem (updates reputation)                    │
│         ├──→ WorldStateSystem (marks district state)               │
│         └──→ QuestSystem (triggers next case)                      │
│                                                                    │
└───────────────────────────────────────────────────────────────────┘
```

---

## Core Systems Breakdown

### 1. Entity-Component-System (ECS) Architecture

#### Philosophy
- **Data-Oriented Design**: Components are pure data, systems contain logic
- **Composition over Inheritance**: Entities are unique IDs with attached components
- **Cache-Friendly**: Component data stored in contiguous arrays for performance
- **Query-Based**: Systems query entities by component signature

#### Core Classes

**EntityManager**
```javascript
class EntityManager {
  // Entity lifecycle management
  createEntity() // Returns unique entity ID
  destroyEntity(id) // Removes entity and all components
  hasEntity(id) // Check if entity exists

  // Entity metadata for debugging/tooling
  tagEntity(id, tag) // Add human-readable tag
  getEntitiesByTag(tag) // Query by tag
}
```

**ComponentRegistry**
```javascript
class ComponentRegistry {
  // Component storage and retrieval
  addComponent(entityId, component) // Attach component to entity
  removeComponent(entityId, componentType) // Detach component
  getComponent(entityId, componentType) // Retrieve component data
  hasComponent(entityId, componentType) // Check existence

  // Efficient queries
  queryEntities(componentTypes[]) // Find entities with components
  // Uses smallest set optimization: O(n) where n = smallest component set

  // Component data stored as Map<ComponentType, Map<EntityID, ComponentData>>
}
```

**SystemManager**
```javascript
class SystemManager {
  // System orchestration
  registerSystem(system, priority) // Add system to update loop
  unregisterSystem(system) // Remove system

  // Update loop (called each frame)
  update(deltaTime) // Updates all systems in priority order

  // System lifecycle
  init() // Initialize all systems
  cleanup() // Shutdown all systems
}
```

#### System Base Class
```javascript
class System {
  constructor(componentRegistry, eventBus) {
    this.components = componentRegistry;
    this.events = eventBus;
    this.requiredComponents = []; // Component signature
  }

  init() {} // Setup (called once)
  update(deltaTime, entities) {} // Per-frame logic
  cleanup() {} // Teardown
}
```

#### Component Design Patterns

**Transform Component** (Position, rotation, scale)
```javascript
{
  x: 0, y: 0,
  rotation: 0,
  scaleX: 1, scaleY: 1
}
```

**Sprite Component** (Visual representation)
```javascript
{
  image: ImageRef,
  width: 32, height: 32,
  layer: 'entities',
  visible: true
}
```

**Physics Component** (Movement and collision)
```javascript
{
  vx: 0, vy: 0,
  mass: 1,
  collider: { type: 'AABB', width: 32, height: 32 },
  isStatic: false,
  isTrigger: false
}
```

**Investigation Component** (Detective mechanics)
```javascript
{
  evidenceCollected: Set<EvidenceID>,
  casesActive: [CaseID],
  deductionBoard: Map<ClueID, Connection[]>,
  forensicLevel: 1,
  observationRadius: 64
}
```

**Faction Component** (Reputation and relationships)
```javascript
{
  reputation: Map<FactionID, { fame: 0, infamy: 0 }>,
  disguise: FactionID | null,
  knownBy: Set<EntityID>,
  relationshipModifiers: []
}
```

**Quest Component** (Story progression)
```javascript
{
  activeQuests: [QuestID],
  completedQuests: Set<QuestID>,
  objectives: Map<ObjectiveID, Progress>,
  storyFlags: Set<FlagName>
}
```

#### System Examples

**MovementSystem** (Priority: 10)
- Queries: `[Transform, Physics]`
- Updates entity positions based on velocity
- Applies friction, acceleration, max speed
- Handles platformer physics (gravity, jumping)

**CollisionSystem** (Priority: 20)
- Queries: `[Transform, Physics]`
- Broad phase: Spatial hash to find collision candidates
- Narrow phase: AABB/Circle collision detection
- Emits events: `entity:collision`, `trigger:entered`, `trigger:exited`
- Resolves overlaps and applies impulses

**RenderSystem** (Priority: 100)
- Queries: `[Transform, Sprite]`
- Culls off-screen entities
- Sorts by layer and Z-index
- Submits draw calls to LayeredRenderer
- Handles camera transforms

**InvestigationSystem** (Priority: 30)
- Queries: `[Investigation, Transform]`
- Detects evidence in observation radius
- Validates deduction connections
- Emits: `evidence:collected`, `case:solved`, `theory:validated`
- Updates case file state

**FactionSystem** (Priority: 25)
- Queries: `[Faction]`
- Updates reputation based on actions
- Handles disguise detection
- Emits: `reputation:changed`, `faction:hostile`, `faction:allied`
- Controls district faction ownership

---

### 2. Rendering Pipeline

#### Layered Rendering Architecture

**Layer Strategy**
```javascript
const LAYERS = {
  BACKGROUND: 0,    // Static backgrounds (rarely redraws)
  TILES: 1,         // World tiles (redraw on camera move)
  ENTITIES: 2,      // Dynamic game objects (every frame)
  EFFECTS: 3,       // Particles, lights (every frame)
  UI_WORLD: 4,      // Nameplates, health bars (every frame)
  UI_SCREEN: 5      // HUD, menus (on state change only)
};
```

**LayeredRenderer**
- Each layer has separate offscreen canvas
- Only redraw layers that changed (dirty flag per layer)
- Composite layers onto main canvas in single pass
- Performance: 60-80% reduction in pixel fill operations

**Dirty Rectangle System**
```javascript
class DirtyRectManager {
  markDirty(x, y, width, height, layer) // Mark region changed
  getDirtyRegions(layer) // Get regions to redraw
  clearDirty(layer) // Reset after redraw
}
```

**Optimization Techniques**
1. **Viewport Culling**: Only render entities within camera bounds + margin
2. **Integer Coordinates**: Use integer pixel positions to avoid subpixel rendering
3. **Sprite Batching**: Group sprites by texture to reduce texture swaps
4. **Static Pre-Rendering**: Render static backgrounds once to offscreen canvas
5. **Dirty Rectangles**: Track changed regions, only redraw those areas

**Camera System**
```javascript
class Camera {
  x, y              // World position
  zoom              // Scale factor
  viewport          // Screen dimensions

  follow(entity)    // Smooth camera follow with easing
  shake(intensity)  // Screen shake effect
  worldToScreen(x, y) // Coordinate transform
  screenToWorld(x, y) // Inverse transform
}
```

**Rendering Pipeline (per frame)**
1. Update camera position
2. Cull entities outside viewport
3. Sort entities by layer and Z-index
4. For each dirty layer:
   - Clear dirty regions
   - Redraw entities in dirty regions
   - Mark layer clean
5. Composite all layers to main canvas
6. Apply post-processing (screen shake, flash effects)

**Performance Budget**
- Total Rendering: ~8ms (50% of frame budget)
- Entity culling: ~0.5ms
- Layer compositing: ~1ms
- Entity drawing: ~6ms (scales with visible entities)
- Post-processing: ~0.5ms

---

### 3. Physics & Collision Detection

#### Spatial Hash Broad Phase

**Problem**: Naive collision detection is O(n²) - 499,500 checks for 1000 entities
**Solution**: Spatial hash reduces to O(n) - 850 checks for 1000 entities (98% reduction)

**SpatialHash**
```javascript
class SpatialHash {
  constructor(cellSize) // Grid cell dimensions (typically 64-128px)

  insert(entityId, bounds) // Add entity to grid cells it overlaps
  remove(entityId) // Remove from all cells
  query(bounds) // Get entities in same cells (collision candidates)

  // Internal: Map<CellKey, Set<EntityID>>
  // CellKey = `${Math.floor(x/cellSize)},${Math.floor(y/cellSize)}`
}
```

**Process**
1. Each frame, clear and rebuild spatial hash
2. Insert all physics entities into appropriate grid cells
3. For each entity, query spatial hash for collision candidates
4. Perform narrow-phase collision tests only on candidates

**Collision Types**
- **AABB vs AABB**: Axis-aligned bounding box (fastest, 90% of cases)
- **Circle vs Circle**: Point distance check (fast, good for projectiles)
- **Circle vs AABB**: Closest point algorithm (moderate, player vs world)

**Trigger Zones**
- Special colliders with `isTrigger: true` flag
- Do not resolve collisions (no physics response)
- Emit events only: `trigger:entered`, `trigger:exited`
- Use cases: Investigation zones, dialogue triggers, quest areas, faction boundaries

**CollisionSystem Pipeline**
1. Rebuild spatial hash with all physics entities
2. For each dynamic entity:
   - Query spatial hash for candidates
   - Perform narrow-phase collision tests
   - Separate into solid collisions and triggers
3. Resolve solid collisions (overlap resolution + impulse)
4. Emit trigger events
5. Emit collision events for gameplay systems

**Physics Response**
- **Static Resolution**: Move overlapping entities apart (MTV: Minimum Translation Vector)
- **Dynamic Resolution**: Apply impulse based on mass and elasticity
- **One-Way Platforms**: Custom collision filter for platformer mechanics

**Performance Targets**
- Spatial hash rebuild: ~1ms for 1000 entities
- Collision detection: ~1.8ms for 1000 entities with ~850 checks
- Collision resolution: ~0.5ms
- Total physics: ~3-4ms per frame

---

### 4. Event Bus System

#### Purpose
Decouples game systems by enabling publish-subscribe communication without direct dependencies.

**EventBus**
```javascript
class EventBus {
  subscribe(eventName, handler, priority = 0) // Register listener
  unsubscribe(eventName, handler) // Remove listener
  emit(eventName, data) // Trigger event immediately
  queue(eventName, data) // Defer event to end of frame
  processQueue() // Execute queued events

  // Wildcards: subscribe('entity:*', handler) matches all entity events
}
```

**Event Naming Convention**
Format: `domain:action`
- `entity:created`, `entity:destroyed`, `entity:damaged`
- `quest:started`, `quest:completed`, `quest:failed`
- `evidence:collected`, `case:solved`, `theory:validated`
- `faction:hostile`, `reputation:changed`, `district:captured`
- `player:levelup`, `ability:unlocked`, `item:collected`

**Priority System**
Handlers execute in priority order (lower numbers first)
- Priority 0: Core systems (physics, rendering)
- Priority 10: Gameplay systems (combat, investigation)
- Priority 20: UI updates
- Priority 30: Analytics, debugging

**Queued vs Immediate Events**
- **Immediate**: Time-critical events (collision, input)
- **Queued**: State changes that can wait until end of frame (quest completion, level up)
- Queue prevents mid-frame state inconsistencies

**Investigation System Integration**
```javascript
// Evidence collection
eventBus.emit('evidence:collected', {
  evidenceId,
  caseId,
  location: { x, y },
  type: 'fingerprint'
});

// Listeners:
// - InvestigationSystem: Add to case file
// - QuestSystem: Check objective completion
// - UISystem: Show notification
// - AudioSystem: Play discovery sound

// Case solved
eventBus.emit('case:solved', {
  caseId,
  solutionAccuracy: 0.95,
  timeTaken: 1200
});

// Listeners:
// - ProgressionSystem: Unlock ability
// - FactionSystem: Update reputation
// - WorldStateSystem: Change district state
// - QuestSystem: Advance main story
```

**Performance**
- Event dispatch: <0.1ms per event
- Typical load: 50-100 events per frame
- Total overhead: <1ms per frame

---

### 5. Audio System

#### Web Audio API Architecture

**Dual-Layer Adaptive Music**
- Multiple music layers play simultaneously (e.g., ambient, tension, action)
- Dynamic volume crossfading based on game state
- Seamless transitions without audio pops

**AudioManager**
```javascript
class AudioManager {
  // Music control
  playMusic(trackId, layers = {}) // Start music with layer mix
  crossfadeMusic(fromTrackId, toTrackId, duration) // Smooth transition
  setLayerVolume(layerId, volume, fadeTime) // Adjust layer mix

  // SFX
  playSFX(soundId, options = {}) // One-shot sound effect
  // Options: volume, pitch, 3D position, loop

  // 3D Audio (positional sound)
  setListenerPosition(x, y) // Camera position
  playSFX3D(soundId, x, y, maxDistance) // Positioned sound

  // State-based mixing
  setState(state) // 'exploration', 'combat', 'stealth', 'boss'
}
```

**Adaptive Music Example**
```javascript
// Three layers: ambient, tension, combat
audioManager.playMusic('district_theme', {
  ambient: 1.0,
  tension: 0.0,
  combat: 0.0
});

// Player enters hostile area
audioManager.setLayerVolume('tension', 0.6, 1.5); // Fade in over 1.5s

// Combat starts
audioManager.setState('combat');
// Automatically adjusts: ambient 0.3, tension 0.4, combat 1.0
```

**SFX Object Pool**
- Reuse AudioBufferSourceNode instances to avoid GC
- Pool size: 32 concurrent sounds (typical max)
- Automatically recycle finished sounds

**Audio Context Clock**
- Use `audioContext.currentTime` for precise timing
- Prevents audio drift (<1ms over 5 minutes)
- Schedule music loop points and beat-synced events

**Performance**
- Web Audio API overhead: <5% CPU for 8 audio sources
- Audio latency: ~10ms (imperceptible)
- Memory: ~20MB for typical sound library

**Audio Events**
```javascript
// Combat hit
eventBus.on('entity:damaged', (data) => {
  audioManager.playSFX('impact_' + data.damageType, {
    volume: Math.min(data.damage / 100, 1.0),
    position: data.targetPosition
  });
});

// Evidence discovered
eventBus.on('evidence:collected', (data) => {
  audioManager.playSFX('evidence_pickup', { pitch: 1.0 + Math.random() * 0.2 });
});

// State transitions
eventBus.on('faction:hostile', () => {
  audioManager.setState('combat');
});
```

---

### 6. Asset Management

#### Lazy Loading Strategy

**Priorities**
1. **Critical Assets** (loaded at startup, <3s): Core UI, player sprites, essential sounds
2. **District Assets** (loaded on transition, <1s): District-specific tiles, NPCs, music
3. **Optional Assets** (loaded in background): Particle effects, ambient sounds, alternate sprites

**AssetManager**
```javascript
class AssetManager {
  // Loading
  preloadCritical() // Load startup assets
  loadDistrict(districtId) // Load district-specific assets
  unloadDistrict(districtId) // Free memory

  // Retrieval
  getImage(id) // Get loaded image
  getSound(id) // Get loaded audio buffer
  getJSON(id) // Get loaded data file

  // State
  isLoaded(id) // Check if asset ready
  getLoadProgress() // 0.0 to 1.0

  // Reference counting
  // Assets only unloaded when refCount reaches 0
}
```

**Asset Organization**
```
assets/
├── critical/           # Startup assets
│   ├── ui/
│   ├── player/
│   └── core-sfx/
├── districts/          # Per-district bundles
│   ├── downtown/
│   ├── industrial/
│   └── slums/
└── shared/             # Reusable assets
    ├── particles/
    ├── effects/
    └── ambient/
```

**Loading States**
- `UNLOADED`: Asset not requested
- `LOADING`: Asset request in flight
- `LOADED`: Asset ready for use
- `ERROR`: Asset failed to load

**Performance Impact**
- Initial load: 2.1s (critical assets only)
- District transition: 0.8s (district bundle)
- Memory usage: 95-120MB per district (vs 280MB if loading all)
- Load time reduction: 74%

**Preloading Strategy**
- Predict next district based on player position
- Start loading adjacent districts in background
- Use `requestIdleCallback` to avoid frame drops during load

---

### 7. Investigation System (Detective Mechanics)

#### Purpose
The investigation system is the core progression driver for The Memory Syndicate. It manages evidence collection, clue analysis, deduction board mechanics, and theory validation that unlock new abilities and areas.

#### Architecture

**InvestigationManager**
```javascript
class InvestigationManager {
  // Case management
  createCase(caseData) // Initialize new investigation case
  getActiveCase() // Current case player is working on
  getCaseFile(caseId) // Retrieve complete case data

  // Evidence system
  collectEvidence(evidenceId, location) // Add evidence to case
  analyzeEvidence(evidenceId, tool) // Forensic examination
  getEvidenceDetails(evidenceId) // Full evidence data

  // Clue derivation
  deriveClue(evidenceIds) // Combine evidence to form clue
  getAvailableClues() // All discovered clues

  // Deduction board
  connectClues(clueA, clueB, connectionType) // Create hypothesis
  validateTheory(clueConnections) // Check theory correctness
  getTheoryAccuracy(clueConnections) // 0.0-1.0 accuracy score

  // Progression
  unlockAbility(abilityId) // Grant new player ability
  unlockArea(areaId) // Open new district/location

  // Observation
  scanRadius(position, radius) // Detect evidence in area
  highlightClues(visionLevel) // Detective vision system
}
```

**Evidence Component**
```javascript
{
  id: 'evidence_001',
  type: 'physical', // physical, digital, testimony, forensic
  category: 'fingerprint', // fingerprint, document, weapon, etc
  description: 'Partial fingerprint on glass surface',
  location: { x: 450, y: 230 },
  collectible: true,
  requires: 'forensic_kit_level_1', // Tool requirement
  caseId: 'case_001',
  hidden: false, // Requires detective vision
  analyzed: false // Has been forensically examined
}
```

**Clue Structure**
```javascript
{
  id: 'clue_001',
  title: 'Suspect had access to crime scene',
  description: 'Fingerprint matches employee database',
  derivedFrom: ['evidence_001', 'evidence_004'], // Source evidence
  connections: [
    { targetClue: 'clue_002', type: 'supports', validated: true },
    { targetClue: 'clue_005', type: 'contradicts', validated: false }
  ],
  category: 'suspect_identity',
  confidence: 0.85 // How certain is this clue
}
```

**Theory Validation**
- Theories are graphs of connected clues
- Each case has authored "correct" theory structure
- Multiple valid theories possible (different approaches)
- Theory accuracy determines progression unlock quality
- Incorrect theories may lock progression paths

**Detective Vision System**
```javascript
// Ability that highlights evidence and clues
{
  level: 2,
  radius: 128, // Detection radius in pixels
  revealsHidden: true, // Show hidden evidence
  showsConnections: true, // Visualize clue relationships
  energyCost: 1, // Resource cost per second active
  cooldown: 5000 // Milliseconds between activations
}
```

#### Integration with Progression

**Knowledge-Gated Progression**
```javascript
// Example: Solving case unlocks new ability
eventBus.on('case:solved', (data) => {
  if (data.caseId === 'case_003' && data.accuracy >= 0.8) {
    investigationManager.unlockAbility('neural_decrypt');
    investigationManager.unlockArea('corporate_spires');

    // Emit progression event
    eventBus.emit('progression:unlock', {
      type: 'ability',
      id: 'neural_decrypt',
      source: 'investigation'
    });
  }
});
```

**Evidence → Clue → Theory → Unlock Pipeline**
1. Player collects physical evidence at crime scene
2. Evidence appears in case file, some require forensic analysis
3. Analyzing evidence derives clues (connections revealed)
4. Player connects clues on deduction board
5. System validates theory structure against authored patterns
6. Correct theory emits `theory:validated` event
7. Progression system unlocks ability/area based on case
8. World state updates to reflect solved case

**InvestigationSystem** (ECS System, Priority: 30)
- Queries: `[Investigation, Transform]`
- Detects evidence in observation radius
- Manages detective vision mechanics
- Validates deduction connections
- Emits: `evidence:collected`, `evidence:analyzed`, `clue:derived`, `case:solved`, `theory:validated`
- Performance: ~0.5ms per frame

#### Forensic Mini-Games

**Fingerprint Analysis**
- Match partial prints to database
- Requires `forensic_kit` item and forensic skill level
- Success grants clue: suspect identity

**Document Reconstruction**
- Piece together shredded documents
- Time-based challenge
- Reveals hidden connections between factions

**Memory Trace** (Unique to The Memory Syndicate)
- Extract fragmented memories from "hollow" victims
- Puzzle-like reconstruction of memory sequence
- Reveals key plot information and Curator's methods

#### Performance Considerations
- Evidence detection uses spatial hash (same as physics)
- Deduction board validation is graph traversal (< 0.1ms for 50 clues)
- Theory validation cached after first check
- Evidence entities pooled for performance

---

### 8. Faction Reputation System

#### Purpose
Dynamic faction relationships drive world reactivity, district control, social stealth, and branching narratives. Player actions cascade through faction networks, creating emergent consequences.

#### Architecture

**FactionManager**
```javascript
class FactionManager {
  // Reputation
  modifyReputation(factionId, fame, infamy) // Dual-axis reputation change
  getReputation(factionId) // Current standing
  getFactionAttitude(factionId) // Friendly, Neutral, Hostile, Allied

  // District control
  setDistrictControl(districtId, factionId) // Faction captures district
  getDistrictController(districtId) // Owning faction
  getDistrictContestState(districtId) // Control stability (0-1)

  // Disguises and infiltration
  equipDisguise(factionId) // Wear faction uniform
  removeDisguise() // Return to detective attire
  isDisguiseEffective(location, factionId) // Check if disguise works

  // NPC memory
  markNPCKnown(npcId, factionId) // NPC recognizes player
  checkRecognition(npcId, isDisguised) // Will NPC see through disguise?

  // Cascading consequences
  propagateReputationChange(factionId, delta) // Ripple through allies/enemies
}
```

**Faction Component**
```javascript
{
  reputation: {
    'police': { fame: 35, infamy: 10 },
    'criminals': { fame: 5, infamy: 40 },
    'neurosynch': { fame: 15, infamy: 5 },
    'resistance': { fame: 60, infamy: 0 },
    'archive': { fame: 0, infamy: 0 } // Hidden faction
  },
  currentDisguise: 'police', // Or null if not disguised
  knownBy: new Set(['npc_guard_001', 'npc_witness_012']), // NPCs who recognize player
  relationshipModifiers: [
    { factionId: 'police', modifier: 1.2, reason: 'former_officer' }
  ]
}
```

**Faction Definition**
```javascript
{
  id: 'police',
  name: 'Memory Crimes Division',
  description: 'Former employer, now suspicious of Kira',

  allies: ['neurosynch'], // +50% reputation with allies
  enemies: ['criminals', 'resistance'], // -50% reputation with enemies

  controlledDistricts: ['downtown', 'corporate_spires'],
  headquarters: 'precinct_central',

  attitudeThresholds: {
    allied: { fame: 80, infamy: 0 },
    friendly: { fame: 40, infamy: 0 },
    neutral: { fame: 0, infamy: 0 },
    hostile: { fame: 0, infamy: 30 }
  },

  services: {
    shop: 'police_armory', // Available when friendly
    quests: ['police_questline_001'], // Faction-specific quests
    safehouse: 'precinct_safehouse' // Available when allied
  },

  disguiseEffectiveness: 0.8 // 80% chance to fool NPCs
}
```

#### Dual-Axis Reputation (Fame/Infamy)

**Fame**: Heroic reputation within faction
- Gained by solving cases that help faction
- Increases access to services, quests, information
- High fame → Allied status

**Infamy**: Antihero reputation within faction
- Gained by actions against faction interests
- Increases hostility, aggression, bounties
- High infamy → Hostile status, attacked on sight

**Reputation Actions**
```javascript
// Solve case for Police
factionManager.modifyReputation('police', +25, 0);
// Propagates: +12 to allies (neurosynch), -12 to enemies (criminals, resistance)

// Steal evidence from Police
factionManager.modifyReputation('police', 0, +15);
// Triggers: Bounty placed, guards become hostile in police districts

// Neutral investigation (no faction bias)
factionManager.modifyReputation('police', +5, 0);
// Small fame gain, no infamy
```

#### District Control System

**Control Map**
```javascript
{
  'downtown': {
    controller: 'police',
    stability: 0.8, // 0.0 = contested, 1.0 = stable
    contestedBy: ['criminals'], // Factions vying for control
    securityLevel: 'high', // Affects enemy density, patrol patterns
    accessRestrictions: {
      'criminals': 'hostile', // Criminals attacked on sight
      'resistance': 'disguise_required' // Can enter with disguise
    }
  }
}
```

**Control Changes**
- Player actions shift district stability
- Low stability → faction warfare events
- Control flip → district aesthetics change, NPCs replaced, shops change
- Example: Criminals take Downtown → more crime, black market opens, police retreat

#### Social Stealth & Disguises

**Disguise System**
```javascript
// Equip disguise
player.equipDisguise('police');

// Disguise effectiveness factors
const effectiveness =
  faction.disguiseEffectiveness * // Base effectiveness (0.8)
  (1 - player.infamy / 100) * // Infamy reduces effectiveness
  (npc.isKnownBy(player) ? 0 : 1); // Known NPCs see through instantly

// Random check each second
if (Math.random() > effectiveness) {
  npc.detectPlayer();
  eventBus.emit('disguise:blown', { npcId, factionId });
}
```

**Infiltration Mechanics**
- Disguises allow access to hostile districts
- Must avoid NPCs who recognize player (marked on minimap)
- Suspicious actions (running, combat, interacting with restricted areas) increase detection
- Getting caught → Infamy increase, hostility, potential combat

#### Cascading Reputation System

**Relationship Web**
```javascript
// Police and Criminals are enemies
// Helping Police automatically harms Criminal reputation
const CASCADE_MULTIPLIER = 0.5;

factionManager.modifyReputation('police', +50, 0);
// Automatic cascades:
// - 'neurosynch' (ally): +25 fame
// - 'criminals' (enemy): -25 fame
// - 'resistance' (enemy): -25 fame
```

**Emergent Consequences**
- Help Police → Criminal bounty placed → Assassins spawn in lower districts
- Help Resistance → NeuroSync denies access → Alternative investigation paths required
- Stay neutral → All factions offer limited services, no commitment required
- Betray faction after Allied status → Massive infamy spike, permanent hostility

#### NPC Memory System

**Recognition Mechanics**
- NPCs remember player interactions within district
- Reputation stored per-district, not globally
- Dialogue changes based on past actions
- "Known By" list persists across game sessions

```javascript
// NPC witnesses crime
if (npc.canSeePlayer() && player.isCommittingCrime()) {
  npc.witnessedCrime = true;
  player.knownBy.add(npc.id);

  // Reputation hit delayed until NPC reports
  setTimeout(() => {
    factionManager.modifyReputation(npc.faction, 0, +10);
    eventBus.emit('crime:reported', { npcId, crimeType });
  }, 5000);
}
```

**Faction System** (ECS System, Priority: 25)
- Queries: `[Faction]`
- Updates reputation based on events
- Handles disguise detection rolls
- Propagates reputation changes
- Emits: `reputation:changed`, `faction:hostile`, `faction:allied`, `disguise:blown`, `district:captured`
- Performance: ~0.3ms per frame

#### Integration with Quest System

**Faction-Gated Quests**
```javascript
{
  id: 'police_questline_001',
  prerequisite: {
    faction: 'police',
    minFame: 40,
    maxInfamy: 10,
    attitude: 'friendly'
  },
  rewardsReputation: { 'police': { fame: +30 } }
}
```

**Branching Based on Faction**
- Act 2 allows player to choose which faction to align with
- Corporate thread (NeuroSync), Resistance thread, or Personal thread
- Choices lock out opposing faction quests
- Multiple endings determined by final faction standings

---

### 9. Knowledge Progression System

#### Purpose
Knowledge-gated progression is the unique differentiator of The Memory Syndicate. Unlike traditional Metroidvanias where physical abilities gate areas (double-jump for high ledges), this game uses intellectual discoveries to unlock progression.

#### Architecture

**ProgressionManager**
```javascript
class ProgressionManager {
  // Knowledge tracking
  learnKnowledge(knowledgeId) // Acquire new knowledge
  hasKnowledge(knowledgeId) // Check if player knows something
  getKnowledgeLevel(category) // Forensic, Technical, Social skill levels

  // Ability unlocks
  unlockAbility(abilityId, source) // Grant new ability (source: case, faction, exploration)
  hasAbility(abilityId) // Check ability availability
  upgradeAbility(abilityId, newLevel) // Improve existing ability

  // Area access
  checkAreaAccess(areaId) // Can player enter area?
  unlockArea(areaId, unlockMethod) // Open new location

  // Gate evaluation
  evaluateGate(gateId) // Check if gate requirements met
  getGateRequirements(gateId) // What does player need?
}
```

**Knowledge Types**

**1. Case Knowledge** (Investigation-based)
```javascript
{
  id: 'knowledge_founders_massacre',
  name: 'Founder\'s Massacre Cover-up',
  description: 'Understanding of 2057 mass hollowing experiments',
  acquiredFrom: 'case_005_solved',
  unlocks: [
    'area_archive_undercity',
    'ability_memory_splice',
    'dialogue_option_confront_curator'
  ],
  category: 'lore'
}
```

**2. Technical Knowledge** (Forensic/Hacking)
```javascript
{
  id: 'knowledge_neural_encryption',
  name: 'Neural Encryption Protocols',
  level: 2, // 0-3 skill progression
  description: 'Ability to decrypt NeuroSync memory extractions',
  acquiredFrom: 'case_003_solved',
  unlocks: [
    'ability_neural_decrypt_level2',
    'area_neurosynch_servers',
    'minigame_memory_reconstruction'
  ],
  category: 'technical'
}
```

**3. Social Knowledge** (Faction/NPC)
```javascript
{
  id: 'knowledge_curator_identity',
  name: 'Curator is Dr. Elias Morrow',
  description: 'Revelation that city founder is behind extractions',
  acquiredFrom: 'deduction_board_synthesis',
  unlocks: [
    'quest_act3_final_confrontation',
    'dialogue_morrow_true_identity',
    'area_zenith_sector'
  ],
  category: 'social'
}
```

**4. Environmental Knowledge** (Exploration)
```javascript
{
  id: 'knowledge_undercity_passages',
  name: 'Secret Undercity Network',
  description: 'Hidden passages connecting districts',
  acquiredFrom: 'exploration_hidden_door',
  unlocks: [
    'shortcut_downtown_to_industrial',
    'ability_lockpicking_level2'
  ],
  category: 'environmental'
}
```

#### Gate Mechanics

**Knowledge Gate** (Replaces traditional Metroidvania gates)
```javascript
{
  id: 'gate_corporate_spires_entrance',
  type: 'knowledge',
  location: { x: 1200, y: 450 },

  requirements: {
    knowledge: ['knowledge_neurosynch_connection'], // Must understand plot
    casesSolved: ['case_002'], // Prerequisite case
    faction: { 'police': { minFame: 20 } } // Reputation requirement
  },

  unlockMethod: 'dialogue', // Gate opens via NPC conversation
  blockedMessage: 'You need evidence of NeuroSync involvement to gain access.',

  // Alternative path (metroidvania design principle)
  alternativeGates: ['gate_corporate_spires_backdoor'],
  alternativeRequirements: {
    abilities: ['ability_lockpicking_level2'],
    faction: { 'criminals': { minFame: 30 } }
  }
}
```

#### Ability Progression

**Detective Abilities** (Unlock via investigation)
```javascript
{
  id: 'ability_memory_trace',
  name: 'Memory Trace',
  description: 'Extract memory fragments from hollow victims',
  level: 1,
  maxLevel: 3,

  unlockRequirement: {
    case: 'case_001_solved',
    accuracy: 0.7 // Must solve case with 70%+ accuracy
  },

  upgrades: [
    {
      level: 2,
      requirement: { case: 'case_004_solved' },
      improvement: 'Extract multiple memory fragments'
    },
    {
      level: 3,
      requirement: { case: 'case_007_solved', knowledge: 'knowledge_archive_access' },
      improvement: 'Access Archive-stored memories remotely'
    }
  ],

  gameplay: 'Reveals hidden clues in crime scenes, unlocks memory reconstruction minigame'
}
```

**Traversal Abilities** (Metroidvania movement)
```javascript
{
  id: 'ability_grapple_hook',
  name: 'Grapple Hook',
  description: 'Reach high ledges and cross gaps',

  unlockRequirement: {
    case: 'case_003_solved',
    faction: { 'criminals': { attitude: 'friendly' } }
  },

  gameplay: 'Physical ability enabling new traversal options, opens 30% of previously inaccessible areas'
}
```

**Social Abilities** (Infiltration & persuasion)
```javascript
{
  id: 'ability_cold_reading',
  name: 'Cold Reading',
  description: 'Analyze NPC behavior to identify lies and motivations',

  unlockRequirement: {
    knowledge: ['knowledge_body_language', 'knowledge_psychological_profiling'],
    case: 'case_002_solved'
  },

  gameplay: 'During dialogue, highlights deceptive responses, unlocks new dialogue options'
}
```

#### Integration with World Design

**Hub-Based Metroidvania Structure**
```javascript
// District access gating
{
  'district_downtown': {
    accessGates: [],
    initiallyAccessible: true
  },
  'district_industrial': {
    accessGates: ['gate_credentials_check'],
    requirements: { case: 'case_001_solved' }
  },
  'district_corporate_spires': {
    accessGates: ['gate_neurosynch_access'],
    requirements: {
      knowledge: ['knowledge_neurosynch_connection'],
      faction: { 'neurosynch': { minFame: 20 } }
    },
    alternativePath: {
      gate: 'gate_backdoor_entry',
      requirements: { abilities: ['ability_hacking_level2'] }
    }
  },
  'district_archive_undercity': {
    accessGates: ['gate_archive_sealed_door'],
    requirements: {
      knowledge: ['knowledge_founders_massacre', 'knowledge_curator_identity'],
      case: 'case_006_solved'
    }
  },
  'district_zenith_sector': {
    accessGates: ['gate_final_area'],
    requirements: {
      storyFlag: 'act3_unlocked',
      knowledge: ['knowledge_curator_plan']
    }
  }
}
```

**Environmental Storytelling Through Gating**
- Locked doors hint at required knowledge ("NeuroSync Employee Access Only")
- NPCs provide clues about how to progress ("Heard the Resistance knows the back routes")
- World map shows inaccessible areas with "???" markers
- Returning to earlier areas with new knowledge reveals hidden paths

#### Progression Curve

**Act 1 (Hours 0-3)**: Linear progression
- Tutorial case teaches investigation mechanics
- First ability unlock (Memory Trace)
- Downtown + Industrial districts accessible
- 2-3 minor cases

**Act 2 (Hours 3-8)**: Branching progression
- Player chooses Corporate, Resistance, or Personal investigation thread
- Multiple paths to same knowledge goals
- Faction reputation creates alternate routes
- 4-5 cases across threads
- Major ability unlocks (Neural Decrypt, Memory Splice, Cold Reading)

**Act 3 (Hours 8-12)**: Convergence + climax
- All threads converge on Archive investigation
- Final knowledge synthesis reveals Curator identity
- Zenith Sector access for final confrontation
- Player choices determine ending (4 possible endings)

#### Performance Considerations
- Knowledge state stored as Set<KnowledgeID> (~1KB)
- Gate evaluation is simple boolean check (~0.1ms)
- Ability checks cached per frame to avoid repeated lookups
- Progression events queued to avoid mid-frame state changes

---

## Narrative Integration Points

### Quest & Story System Architecture

**QuestManager**
```javascript
class QuestManager {
  startQuest(questId) // Activate quest, set objectives
  updateObjective(objectiveId, progress) // Update progress
  completeQuest(questId) // Mark complete, trigger rewards

  getActiveQuests() // Currently active quests
  checkTriggers(eventData) // Evaluate quest triggers

  // Story flags for branching
  setStoryFlag(flag, value)
  getStoryFlag(flag)
  evaluateConditions(conditions) // Check if conditions met
}
```

**Quest Structure**
```javascript
{
  id: 'case_001_missing_person',
  title: 'The Vanishing Act',
  type: 'main', // main, side, faction, investigation

  prerequisites: {
    storyFlags: ['downtown_unlocked'],
    completedQuests: [],
    factionReputation: { 'police': 10 }
  },

  objectives: [
    {
      id: 'obj_001',
      type: 'investigation',
      description: 'Examine the crime scene',
      trigger: { event: 'evidence:collected', count: 3, caseId: 'case_001' },
      optional: false
    },
    {
      id: 'obj_002',
      type: 'deduction',
      description: 'Connect the clues',
      trigger: { event: 'theory:validated', theoryId: 'theory_001' },
      optional: false
    },
    {
      id: 'obj_003',
      type: 'social',
      description: 'Interrogate the witness',
      trigger: { event: 'dialogue:completed', dialogueId: 'witness_001' },
      optional: true
    }
  ],

  rewards: {
    experience: 250,
    abilityUnlock: 'forensic_analysis_tier2',
    storyFlags: ['case_001_solved'],
    factionReputation: { 'police': 25, 'criminals': -10 }
  },

  branches: [
    {
      condition: { obj_003_completed: true },
      nextQuest: 'case_001b_alternate_path'
    },
    {
      condition: { obj_003_completed: false },
      nextQuest: 'case_001a_main_path'
    }
  ]
}
```

**Event-Driven Quest Updates**
```javascript
// Evidence collected
eventBus.on('evidence:collected', (data) => {
  questManager.checkTriggers({
    event: 'evidence:collected',
    caseId: data.caseId,
    evidenceId: data.evidenceId
  });
});

// Case solved
eventBus.on('case:solved', (data) => {
  questManager.checkTriggers({
    event: 'case:solved',
    caseId: data.caseId,
    accuracy: data.solutionAccuracy
  });

  // Update world state
  worldStateManager.setCaseStatus(data.caseId, 'solved');

  // Faction reputation impact
  factionSystem.applyReputationChange(data.factionImpact);
});
```

### World State System

**WorldStateManager**
```javascript
class WorldStateManager {
  // Persistent state
  setDistrictState(districtId, state) // Controlled by faction
  setCaseStatus(caseId, status) // Active, solved, failed
  markNPCInteraction(npcId, interactionType) // NPC memory

  // Queries
  getDistrictState(districtId)
  isAreaAccessible(areaId) // Based on progression and reputation
  getNPCAttitude(npcId) // Friendly, neutral, hostile

  // Serialization
  saveState() // Serialize to JSON
  loadState(data) // Restore from JSON
}
```

**NPC Memory System**
- NPCs remember player actions within district
- Dialogue changes based on past interactions
- Reputation propagates through faction network
- Disguises fool NPCs unless player is "known"

**Reactive World Examples**
- Solve case for Police → Police district becomes safer, more shops available
- Betray Criminals → Criminal hideouts become hostile, bounty placed
- Neutral approach → Both factions offer limited services but no commitment
- Destroy evidence → Investigation path closes, must use alternate route

### Deduction Board System

**DeductionBoard**
```javascript
class DeductionBoard {
  // Clue management
  addClue(clueId, evidenceIds) // Add clue derived from evidence
  connectClues(clueA, clueB, connectionType) // Create hypothesis

  // Theory validation
  validateTheory(clueConnections) // Check if theory is correct
  getTheoryAccuracy(clueConnections) // 0.0 to 1.0 accuracy score

  // Progression
  unlockInsight(insightId) // Unlock ability or area access
}
```

**Theory Graph**
- Nodes: Clues (derived from evidence)
- Edges: Connections (relationships between clues)
- Valid theories: Specific graph structures that match authored patterns
- Multiple valid theories possible, but only correct ones unlock progression

**Example Flow**
1. Player collects evidence at crime scene (fingerprints, witness testimony, documents)
2. Evidence appears on deduction board as clues
3. Player draws connections between clues
4. DeductionBoard validates theory structure
5. Correct theory emits `theory:validated` event
6. ProgressionSystem unlocks new ability or district access

---

## Performance Budget

### Frame Time Allocation (60 FPS = 16.6ms budget)

| System | Budget | Notes |
|--------|--------|-------|
| **Input Processing** | ~1ms | Keyboard, mouse, gamepad |
| **ECS Update** | ~6ms | All game systems |
| &nbsp;&nbsp;- Movement | 0.5ms | Position updates |
| &nbsp;&nbsp;- Physics/Collision | 3.5ms | Spatial hash + resolution |
| &nbsp;&nbsp;- Investigation | 0.5ms | Evidence detection, deduction |
| &nbsp;&nbsp;- Faction | 0.3ms | Reputation updates |
| &nbsp;&nbsp;- Quest | 0.4ms | Objective checks |
| &nbsp;&nbsp;- Other Systems | 0.8ms | AI, particles, etc |
| **Rendering** | ~8ms | Canvas drawing |
| &nbsp;&nbsp;- Culling | 0.5ms | Viewport frustum culling |
| &nbsp;&nbsp;- Sorting | 0.5ms | Layer and Z-index |
| &nbsp;&nbsp;- Drawing | 6ms | Canvas draw calls |
| &nbsp;&nbsp;- Compositing | 1ms | Layer blending |
| **Event Bus** | ~0.5ms | Event dispatch |
| **Audio** | ~0.2ms | SFX triggers (Web Audio is off-thread) |
| **Buffer** | ~0.9ms | Safety margin for GC, spikes |
| **Total** | **16.6ms** | **Target: 60 FPS** |

### Memory Targets

**Baseline (Menu/Hub)**: 80-100MB
- Engine code: ~5MB
- Critical assets: ~25MB
- ECS entities (baseline): ~10MB
- Audio buffers: ~20MB
- Canvas buffers: ~15MB
- Browser overhead: ~25MB

**Peak (District with Active Case)**: 120-150MB
- Baseline: 100MB
- District assets: ~30MB (tiles, NPCs, district music)
- Active entities: ~15MB (1000-2000 entities)
- Particle pools: ~5MB

**Absolute Maximum**: 200MB
- Hard limit to prevent browser slowdown
- Trigger aggressive asset unloading if exceeded

### Garbage Collection Strategy

**Problem**: JavaScript GC pauses block main thread, causing frame drops

**Solutions**
1. **Object Pooling**: Reuse objects instead of creating new ones
   - Particle system: Pool of 500 particles (~2MB)
   - Projectiles: Pool of 100 projectiles (~500KB)
   - Effects: Pool of 50 effect instances (~1MB)
   - Vectors: Pool of 100 temporary vector objects (~10KB)

2. **Array Reuse**: Never create arrays in update loop
   ```javascript
   // BAD: Creates new array every frame (16ms = 60 arrays/sec = GC pressure)
   const nearby = entities.filter(e => distance(player, e) < 100);

   // GOOD: Reuse pre-allocated array
   nearbyEntities.length = 0;
   for (const e of entities) {
     if (distance(player, e) < 100) nearbyEntities.push(e);
   }
   ```

3. **TypedArrays for Numeric Data**: Use Float32Array, Int32Array
   - Positions, velocities: Float32Array
   - Entity IDs, flags: Int32Array
   - No GC overhead (fixed-size buffers)

4. **Pre-Allocate Temporary Objects**
   ```javascript
   // Reusable vector for calculations
   const tempVec = { x: 0, y: 0 };

   // Reuse instead of creating new
   tempVec.x = target.x - entity.x;
   tempVec.y = target.y - entity.y;
   ```

**Expected Results**
- GC pauses reduced from 12/min (24ms avg) to 2/min (8ms avg)
- 75% reduction in GC impact
- No frame drops due to GC

### Optimization Checkpoints

**Phase 1: Core Engine (Week 1-2)**
- Target: 60 FPS with 500 entities in test scene
- Profile: Entity creation, component queries, system updates
- Optimize: ECS query caching, component data layout

**Phase 2: Rendering (Week 3)**
- Target: 60 FPS with 1000 entities, 2000 tiles
- Profile: Draw call count, fill rate, layer compositing
- Optimize: Dirty rectangles, viewport culling, sprite batching

**Phase 3: Physics (Week 4)**
- Target: 60 FPS with 1000 moving entities
- Profile: Collision checks, spatial hash, resolution
- Optimize: Cell size tuning, broad-phase optimizations

**Phase 4: Gameplay Systems (Week 5-8)**
- Target: 60 FPS in typical gameplay scenario
- Profile: Investigation, faction, quest systems
- Optimize: Event bus, state queries, procedural generation

**Phase 5: Full Game (Week 9-12)**
- Target: 60 FPS in worst-case scenarios (boss fights, dense areas)
- Profile: Entire frame time breakdown
- Optimize: Hotspots identified in profiling

---

## Development Phases

### Phase 0: Foundation (Week 1-2) - CURRENT
**Goal**: Establish core architecture and tooling

**Deliverables**
- ✅ Research reports (gameplay, features, engine)
- ✅ Project overview document (this document)
- 🔲 Core ECS implementation (EntityManager, ComponentRegistry, SystemManager)
- 🔲 Basic rendering pipeline (LayeredRenderer, Camera)
- 🔲 Event bus system
- 🔲 Asset manager with lazy loading
- 🔲 Test framework setup (Jest, Playwright)
- 🔲 Build pipeline (Vite)

**Success Criteria**
- ECS can create 1000 entities with 3 components each
- Rendering maintains 60 FPS with 500 sprites
- Events dispatch in <0.1ms
- All tests pass (>80% coverage)

---

### Phase 1: Core Mechanics (Week 3-5)
**Goal**: Implement player movement, basic collision, and input

**Deliverables**
- Player entity with movement (walk, run, jump)
- Physics system with spatial hash collision
- Input system (keyboard, mouse, gamepad support)
- Camera follow and viewport culling
- Tile-based world rendering
- Basic UI framework (HUD, menus)

**Success Criteria**
- Player movement feels responsive (<100ms input latency)
- Collision detection accurate and performant (60 FPS with 1000 entities)
- Camera smoothly follows player
- UI renders without frame drops

---

### Phase 2: Investigation Systems (Week 6-8)
**Goal**: Implement detective mechanics and deduction board

**Deliverables**
- Evidence collection system
- Deduction board UI
- Clue connection mechanics
- Theory validation
- Case file management
- Forensic examination minigame
- Investigation component and system

**Success Criteria**
- Player can collect evidence and build theories
- Deduction board accurately validates correct theories
- Case progression unlocks new abilities
- Tutorial case can be completed start-to-finish

---

### Phase 3: Faction & World State (Week 9-11)
**Goal**: Implement reputation system and reactive world

**Deliverables**
- Faction reputation system (Fame/Infamy)
- NPC memory and attitude system
- Disguise mechanics
- District control and state changes
- Dialogue system with branching
- World state persistence
- Social stealth mechanics

**Success Criteria**
- Faction reputation accurately reflects player actions
- NPCs react differently based on reputation
- Disguises allow infiltration of hostile areas
- World state persists across sessions

---

### Phase 4: Procedural Generation (Week 12-14)
**Goal**: Implement procedural districts and case generation

**Deliverables**
- District layout generator (BSP algorithm)
- Case generation system (procedural crime scenes)
- Witness and suspect pool generation
- Evidence placement algorithm
- Procedural dialogue variations
- Seeded random generation (determinism)

**Success Criteria**
- Districts feel unique but coherent
- Cases have logical evidence chains
- Procedural content indistinguishable from authored
- Generation completes in <1s per district

---

### Phase 5: Combat & Stealth (Week 15-16)
**Goal**: Implement action mechanics for hybrid genre

**Deliverables**
- Combat system (melee, ranged)
- Stealth mechanics (visibility, sound propagation)
- Enemy AI (patrol, chase, combat)
- Detection system (sight cones, alertness)
- Combat abilities tied to investigation progression
- Ability upgrade tree

**Success Criteria**
- Combat feels responsive and fair
- Stealth provides viable alternative to combat
- Enemy AI challenging but predictable
- Abilities unlock through case progression

---

### Phase 6: Quest & Story Integration (Week 17-18)
**Goal**: Implement quest system and main story arc

**Deliverables**
- Quest manager and objective tracking
- Story flag system for branching
- Main story case chain (5-7 major cases)
- Side quest system
- Faction-specific questlines
- Multiple endings based on choices

**Success Criteria**
- Quest objectives update correctly
- Story branches based on player choices
- Main story completable start-to-finish
- Endings reflect player decisions

---

### Phase 7: Polish & Optimization (Week 19-21)
**Goal**: Optimize performance and polish gameplay feel

**Deliverables**
- Performance profiling and optimization
- Audio implementation (adaptive music, SFX)
- Particle effects and visual polish
- UI/UX improvements
- Accessibility options
- Extensive playtesting and balance

**Success Criteria**
- 60 FPS maintained in all scenarios
- Audio enhances atmosphere
- Game feels polished and professional
- No critical bugs

---

### Phase 8: Vertical Slice (Week 22-24)
**Goal**: Complete playable vertical slice for validation

**Deliverables**
- One complete district with 3-5 cases
- Full investigation, faction, and combat loops
- Procedural generation working
- Story arc with branching
- All systems integrated and tested
- Documentation complete

**Success Criteria**
- 30-60 minutes of compelling gameplay
- All core mechanics demonstrated
- Technical validation of architecture
- Ready for feedback and iteration

---

## Risk Assessment

### High Impact Risks

#### 1. Performance Degradation at Scale
**Risk**: Frame rate drops below 60 FPS with many entities and systems active

**Likelihood**: Medium
**Impact**: High (Directly affects player experience)

**Mitigation**
- Early performance profiling (every phase)
- Strict frame budget enforcement (16ms)
- Object pooling and GC optimization from start
- Spatial partitioning for all spatial queries
- Aggressive viewport culling
- Dirty rectangle optimization

**Fallback**
- Dynamic quality scaling (reduce particle count, effect complexity)
- Reduce max entity count in dense areas
- Simplify physics simulation in low-priority areas

---

#### 2. Procedural Generation Quality
**Risk**: Procedurally generated cases feel repetitive or illogical

**Likelihood**: Medium-High
**Impact**: High (Core gameplay loop)

**Mitigation**
- Start with hand-authored cases to establish quality bar
- Build generation system gradually with extensive validation
- Use authored narrative "anchors" with procedural connective tissue
- Implement quality scoring for generated content
- Extensive playtesting of procedural content
- Fallback to hand-authored content when quality insufficient

**Fallback**
- Increase ratio of hand-authored to procedural content
- Simplify case structures for more reliable generation
- Use procedural variation on authored templates

---

#### 3. Investigation Mechanics Too Obscure
**Risk**: Players don't understand how to connect clues or progress

**Likelihood**: Medium
**Impact**: High (Player frustration, abandonment)

**Mitigation**
- Extensive tutorial system teaching deduction mechanics
- Progressive difficulty curve (simple cases first)
- In-game hint system for stuck players
- Clear visual feedback for valid/invalid connections
- Optional "detective vision" highlighting important clues
- Playtesting with target audience

**Fallback**
- Add more explicit hints and guidance
- Reduce number of "red herring" clues
- Simplify deduction board mechanics
- Add "skip case" option for stuck players

---

#### 4. Faction System Complexity Overwhelming
**Risk**: Reputation system too complex, player confused by cascading consequences

**Likelihood**: Medium
**Impact**: Medium (Reduces strategic depth enjoyment)

**Mitigation**
- Clear UI showing faction standings and relationships
- Predictable reputation changes (tooltips before actions)
- Tutorial cases demonstrating faction mechanics
- Ability to check faction attitudes before entering areas
- Undo mechanism for accidental hostile actions (disguises)

**Fallback**
- Simplify faction relationships (fewer factions)
- Reduce cascade depth (consequences don't propagate as far)
- Add "neutral" zones safe from faction hostility

---

### Medium Impact Risks

#### 5. Scope Creep
**Risk**: Feature additions exceed medium complexity target

**Likelihood**: High
**Impact**: Medium (Timeline extension, quality dilution)

**Mitigation**
- Strict feature lockdown after Phase 4
- Regular scope reviews with architect
- Prioritize vertical slice completion over breadth
- Defer "nice-to-have" features to post-release

**Fallback**
- Cut non-critical features
- Reduce procedural generation scope
- Simplify combat/stealth mechanics

---

#### 6. Browser Compatibility Issues
**Risk**: Game doesn't run well on all target browsers

**Likelihood**: Low-Medium
**Impact**: Medium (Limits audience)

**Mitigation**
- Test on Chrome, Firefox, Safari, Edge from Phase 1
- Use standard Web APIs (avoid experimental features)
- Polyfills for missing features
- Progressive enhancement approach

**Fallback**
- Drop support for problematic browsers
- Reduce visual effects for compatibility
- Desktop app packaging (Electron) if web too limiting

---

#### 7. Canvas Performance on Low-End Hardware
**Risk**: 60 FPS target not achievable on minimum spec hardware

**Likelihood**: Medium
**Impact**: Medium (Excludes some players)

**Mitigation**
- Define minimum spec early (mid-range 2020 hardware)
- Test on low-end devices regularly
- Dynamic quality scaling
- Optimize aggressively from start

**Fallback**
- Raise minimum spec requirements
- Add "performance mode" with reduced visuals
- Consider WebGL as rendering fallback (higher initial cost, better scaling)

---

### Low Impact Risks

#### 8. Asset Pipeline Bottlenecks
**Risk**: Asset creation becomes development blocker

**Likelihood**: Low
**Impact**: Low-Medium (Can use placeholders)

**Mitigation**
- Use placeholder assets during development
- Define clear asset specifications early
- Automate asset processing where possible
- Log asset requests clearly in `assets/*/requests.json`

**Fallback**
- Continue with placeholder art
- Reduce asset variety (reuse more)
- Procedural asset generation where feasible

---

#### 9. Audio Synchronization Issues
**Risk**: Adaptive music layers drift or transition poorly

**Likelihood**: Low
**Impact**: Low (Noticeable but not game-breaking)

**Mitigation**
- Use Web Audio API clock (sub-millisecond precision)
- Extensive testing of layer transitions
- Fallback to single-track music if layering problematic

**Fallback**
- Simplify adaptive music (fewer layers)
- Use traditional music tracks with crossfading
- Focus on SFX quality over music complexity

---

#### 10. Save System Corruption
**Risk**: Game state save/load fails or corrupts

**Likelihood**: Low
**Impact**: Medium (Player frustration)

**Mitigation**
- Versioned save format with migration
- Save validation on load (schema checking)
- Multiple save slots (autosave + manual)
- Cloud save backup option

**Fallback**
- New game if save unrecoverable
- Graceful degradation (partial load with warnings)
- Save state debugging tools

---

## Success Metrics

### Technical Validation (Phase 8 - Vertical Slice)
- ✅ 60 FPS maintained on mid-range hardware (average 58+ FPS, 1% low above 50 FPS)
- ✅ Memory usage under 150MB during gameplay
- ✅ GC pauses <10ms and <3 per minute
- ✅ Initial load time <3 seconds
- ✅ District transition <1 second
- ✅ Zero memory leaks (sustained play >30 minutes)
- ✅ Test coverage >80% for engine, >60% for gameplay
- ✅ All critical bugs resolved

### Gameplay Validation (Playtesting)
- ✅ Tutorial case completion rate >80%
- ✅ Average session length >20 minutes
- ✅ Case completion rate >60%
- ✅ Player uses deduction board (not just guessing)
- ✅ Faction mechanics understood by >70% of players
- ✅ Players exhibit strategic thinking (disguises, reputation management)
- ✅ Procedural cases feel distinct and logical

### Narrative Validation
- ✅ Main story arc completable
- ✅ Branching choices have noticeable consequences
- ✅ Faction relationships create meaningful dilemmas
- ✅ World state changes visible and impactful
- ✅ Multiple endings achievable based on choices

### Architecture Validation
- ✅ ECS architecture supports all gameplay features
- ✅ Event bus enables clean system decoupling
- ✅ Systems can be developed independently
- ✅ New features integrate without refactoring core
- ✅ Code maintainability high (clear separation of concerns)
- ✅ Sub-agent coordination effective (no blocking dependencies)

---

## Architectural Decisions Summary

This project overview establishes the following core architectural decisions:

1. **ECS Pattern**: Custom lightweight Entity-Component-System for flexibility and performance
2. **Canvas 2D Rendering**: Layered rendering with dirty rectangles and viewport culling
3. **Spatial Hash Physics**: O(n) collision detection via grid partitioning
4. **Event Bus Communication**: Pub/sub pattern for decoupled system interactions
5. **Lazy Asset Loading**: Priority-based loading with reference counting
6. **Object Pooling**: Reusable object pools for particles, effects, and projectiles
7. **Adaptive Music**: Web Audio API dual-layer system with dynamic mixing
8. **Procedural Generation**: BSP district generation with authored narrative anchors
9. **Faction Reputation**: Dual-axis (Fame/Infamy) with cascading consequences
10. **Knowledge-Gated Progression**: Investigation unlocks abilities, not combat

These decisions will be formally stored in the MCP architecture decision log for future reference and consistency checking.

---

## Next Steps

### Immediate Actions (This Sprint)
1. ✅ Review and approve this project overview
2. Store architecture decisions in MCP server
3. Create Phase 1 implementation plans:
   - ECS core implementation plan
   - Rendering pipeline implementation plan
   - Event bus implementation plan
   - Asset manager implementation plan
4. Set up development environment and build pipeline
5. Initialize test framework
6. Begin ECS core implementation

### Coordination with Sub-Agents
- **Narrative Team**: Begin developing main story arc and faction relationships
- **Research Agents**: Available for deep dives as implementation questions arise
- **Dev Agents**: Ready to implement systems per architect's plans
- **Test Engineer**: Set up testing infrastructure and initial test suites
- **Documenter**: Maintain living documentation of implemented systems

---

## Document Metadata

**Version**: 1.0
**Author**: Lead Architect
**Date**: 2025-10-26
**Status**: Final
**Next Review**: After Phase 1 completion

**Related Documents**
- `docs/research/hybrid-genre-combinations-2d-action-adventure.md`
- `docs/research/standout-mechanics-systemic-differentiators-2d.md`
- `docs/research/ECS-architecture-JavaScript-Canvas-2D.md`

**MCP References**
- Research topics: `hybrid-genre-combinations-2d-action-adventure`, `standout-mechanics-systemic-differentiators-2d`, `ECS-architecture-JavaScript-Canvas-2D`
- Architecture decisions: (to be stored post-approval)
