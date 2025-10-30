# Procedural Generation Integration Guide

**Sprint 4 - The Memory Syndicate**
**Version**: 1.0
**Date**: 2025-10-27

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Quick Start](#quick-start)
4. [Core Components](#core-components)
5. [Generation Workflow](#generation-workflow)
6. [Integration Points](#integration-points)
7. [Performance Considerations](#performance-considerations)
8. [Common Patterns](#common-patterns)
9. [Troubleshooting](#troubleshooting)

---

## Overview

The procedural generation system creates **solvable detective cases within explorable metroidvania districts**. It combines graph-based spatial layout with reverse case construction to guarantee playability while maintaining narrative coherence.

### Key Features

- **Deterministic Generation**: Same seed always produces identical districts
- **Guaranteed Solvability**: All cases proven solvable by construction
- **Hybrid Fixed-Procedural**: Narrative anchors blend with procedural variety
- **Performance Optimized**: <120ms total generation time
- **ECS Integration**: Clean spawn data conversion to entities

### Generation Layers

```
┌─────────────────────────────────────────────────────┐
│  LAYER 1: District Layout (Graph + BSP)            │
│  - Semantic room types (apartments, offices, etc.)  │
│  - Metroidvania connectivity (loops, shortcuts)     │
│  - Force-directed placement                         │
├─────────────────────────────────────────────────────┤
│  LAYER 2: Case Generation (Reverse Construction)   │
│  - Solution defined first (victim, killer, motive)  │
│  - Evidence graph built backward                    │
│  - Solvability validated via BFS                    │
├─────────────────────────────────────────────────────┤
│  LAYER 3: Narrative Integration                     │
│  - Fixed anchors (detective office, faction HQs)    │
│  - Procedural content blends around anchors         │
│  - Quest triggers placed in suitable rooms          │
├─────────────────────────────────────────────────────┤
│  LAYER 4: Entity Population                         │
│  - NPCs placed (witnesses, suspects, ambient)       │
│  - Evidence items spawned at marked locations       │
│  - Interactive objects (containers, furniture)      │
└─────────────────────────────────────────────────────┘
```

---

## System Architecture

### Component Hierarchy

```
SeededRandom ←─────────────┐
                           │
LayoutGraph ←──────────────┼───── DistrictGenerator
                           │              │
RoomTemplate/Instance      │              ▼
                           │      TileMap (spatial data)
                           │              │
BSPGenerator ──────────────┘              │
                                          ▼
EvidenceGraph ←─── CaseGenerator ─────────┤
                           │              │
                           ▼              ▼
                   EntityPopulator ◄──────┘
                           │
                           ▼
                   LevelSpawnSystem ───► ECS Entities
                           │
                           ▼
               NarrativeAnchorManager
```

### Data Flow

```
1. SEED INPUT (number or string)
   ↓
2. DistrictGenerator.generate(seed, districtType)
   → Creates: { graph, rooms, tilemap, metadata }
   ↓
3. CaseGenerator.generate(district, seed)
   → Creates: { solution, evidenceGraph, placements, npcs }
   ↓
4. EntityPopulator.populate(district, caseData, seed)
   → Creates: { npcs: [], evidence: [], objects: [] }
   ↓
5. LevelSpawnSystem.spawnFromGeneration(spawnData)
   → Creates: ECS entities with components
   ↓
6. EventBus.emit('level:loaded')
   → Systems respond (Investigation, Dialogue, Faction, etc.)
```

---

## Quick Start

### Basic Usage

```javascript
import { SeededRandom } from './engine/procedural/SeededRandom.js';
import { DistrictGenerator } from './game/procedural/DistrictGenerator.js';
import { CaseGenerator } from './game/procedural/CaseGenerator.js';
import { EntityPopulator } from './game/procedural/EntityPopulator.js';
import { LevelSpawnSystem } from './game/systems/LevelSpawnSystem.js';

// 1. Generate district
const districtGen = new DistrictGenerator({
  districtSize: { width: 200, height: 200 },
  minRoomSpacing: 3,
});

const district = districtGen.generate(12345, 'mixed');
console.log(`Generated ${district.rooms.length} rooms`);

// 2. Generate case
const caseGen = new CaseGenerator({ difficulty: 'medium' });
const caseData = caseGen.generate(district, 54321);
console.log(`Case: ${caseData.solution.victimId} killed by ${caseData.solution.killerId}`);

// 3. Populate entities
const populator = new EntityPopulator({ npcDensity: 1.0 });
const spawnData = populator.populate(district, caseData, 99999);
console.log(`Spawning ${spawnData.npcs.length} NPCs, ${spawnData.evidence.length} evidence`);

// 4. Spawn in ECS
const spawnSystem = new LevelSpawnSystem(
  componentRegistry,
  eventBus,
  entityManager,
  spatialHash
);

spawnSystem.spawnFromGeneration(spawnData);
// → Entities created, level:loaded event emitted
```

### Complete Example with Narrative Anchors

```javascript
import { NarrativeAnchorManager } from './game/managers/NarrativeAnchorManager.js';

// 1. Setup narrative anchors
const anchorManager = new NarrativeAnchorManager();
const permanentAnchors = anchorManager.getAnchors({ isPermanent: true });

// 2. Generate district with anchors
const district = districtGen.generate(12345, 'mixed');
anchorManager.applyAnchorsToDistrict(district);

// 3. Detective office now at (0, 0), faction HQs at fixed positions
const detectiveOffice = district.rooms.find(r => r.id === 'detective_office');
console.log(detectiveOffice.position); // { x: 0, y: 0 }

// 4. Generate case and populate
const caseData = caseGen.generate(district, 54321);
const spawnData = populator.populate(district, caseData, 99999);
spawnSystem.spawnFromGeneration(spawnData);
```

---

## Core Components

### 1. SeededRandom

**Purpose**: Deterministic pseudo-random number generation using Mulberry32 algorithm.

**Performance**: ~95M operations/second, 32-bit state, passes statistical tests.

```javascript
const rng = new SeededRandom(12345);

// Generate values
const value = rng.next();           // [0, 1)
const roll = rng.nextInt(1, 6);     // [1, 6]
const coin = rng.nextBool(0.7);     // 70% chance true
const item = rng.choice(['a', 'b', 'c']);

// Shuffle array (in-place Fisher-Yates)
const deck = [1, 2, 3, 4, 5];
rng.shuffle(deck);

// Save/restore state
const state = rng.getState();
rng.setState(state);
```

**Use Cases**:
- District generation (room placement, connections)
- Case generation (victim/killer selection, evidence placement)
- Entity population (NPC positions, patrol routes)

---

### 2. LayoutGraph

**Purpose**: High-level graph representation of district structure.

**Structure**: Nodes (rooms) + Edges (connections) with semantic types.

```javascript
const graph = new LayoutGraph();

// Add nodes (rooms)
graph.addNode('detective_office', {
  type: 'detective_office',
  roomType: 'detective_office',
});

graph.addNode('crime_scene_1', {
  type: 'crime_scene',
  roomType: 'crime_scene',
});

// Add edges (connections)
graph.addEdge('detective_office', 'crime_scene_1', {
  doorType: 'main',
});

// Query connectivity
const connected = graph.isFullyConnected(); // true/false
const path = graph.getShortestPath('detective_office', 'crime_scene_1');
console.log(path); // ['detective_office', 'crime_scene_1']

// Query by type
const offices = graph.getNodesByType('office');
const reachable = graph.getReachableNodes('detective_office');
```

**Use Cases**:
- Define district topology before spatial placement
- Validate connectivity (all rooms reachable)
- Find shortest paths for NPC patrol routes
- Query room types for case/quest placement

---

### 3. BSPGenerator

**Purpose**: Binary Space Partitioning for structured building interiors.

**Output**: Hierarchical room layout with corridors.

```javascript
const bsp = new BSPGenerator({
  minRoomSize: 8,
  maxRoomSize: 20,
  corridorWidth: 2,
  maxDepth: 4,
});

const result = bsp.generate(50, 40, 12345);

console.log(result.rooms.length); // 8-15 rooms
console.log(result.corridors.length); // 7-14 corridors
console.log(result.tilemap.width); // 50
console.log(result.tilemap.height); // 40

// Access tiles
for (let y = 0; y < result.tilemap.height; y++) {
  for (let x = 0; x < result.tilemap.width; x++) {
    const tile = result.tilemap.getTile(x, y);
    // TileType.FLOOR, TileType.WALL, TileType.DOOR, etc.
  }
}
```

**Use Cases**:
- Apartment interiors (bedrooms, kitchen, living room)
- Office buildings (cubicles, conference rooms, hallways)
- Warehouses (storage areas, loading dock)
- Any structured indoor space

---

### 4. DistrictGenerator

**Purpose**: High-level city district generation using graph + BSP hybrid.

**Algorithm**: Graph placement → BSP interiors → Force-directed layout → Corridor creation.

```javascript
const generator = new DistrictGenerator({
  districtSize: { width: 200, height: 200 },
  minRoomSpacing: 3,
  corridorWidth: 3,
  forceIterations: 100,
});

const district = generator.generate(12345, 'residential');

console.log(district.graph.getNodeCount()); // 40-60 rooms
console.log(district.rooms.length); // Same as node count
console.log(district.tilemap.width); // 200
console.log(district.metadata.generationTime); // ~40-80ms
console.log(district.metadata.validation.valid); // true

// Inspect rooms
for (const room of district.rooms) {
  console.log(`${room.id}: ${room.roomType} at (${room.x}, ${room.y})`);
}
```

**District Types**:
- `'residential'`: More apartments (20), fewer offices (3), moderate streets (8)
- `'commercial'`: More offices (15), shops (10), streets (10)
- `'industrial'`: More warehouses (12), fewer apartments (3), alleys (8)
- `'mixed'`: Balanced distribution (default)

---

### 5. CaseGenerator

**Purpose**: Generate solvable murder mystery cases using **reverse construction**.

**Algorithm**: Solution first → Evidence graph backward → Validate solvability.

```javascript
const caseGen = new CaseGenerator({ difficulty: 'medium' });
const caseData = caseGen.generate(district, 12345);

// Access solution
console.log(caseData.solution.victimId); // 'npc_0'
console.log(caseData.solution.killerId); // 'npc_1'
console.log(caseData.solution.motive); // 'revenge'
console.log(caseData.solution.method); // 'stabbing'

// Access evidence graph
const evidenceGraph = caseData.evidenceGraph;
const startingEvidence = evidenceGraph.getStartingEvidence();
console.log(startingEvidence); // ['crime_scene_body', 'crime_scene_observation']

const solvable = evidenceGraph.isSolvable(startingEvidence);
console.log(solvable); // { solvable: true, unreachableFactIds: [] }

// Access metrics
console.log(caseData.metrics.evidenceCount); // 25
console.log(caseData.metrics.chainLength); // 5
console.log(caseData.metrics.estimatedSolveTime); // 20 minutes
```

**Difficulty Levels**:
- `'easy'`: 15 evidence, 2 red herrings, chain length 3
- `'medium'`: 25 evidence, 4 red herrings, chain length 5
- `'hard'`: 35 evidence, 6 red herrings, chain length 7

---

### 6. EvidenceGraph

**Purpose**: Track evidence dependencies and validate case solvability using epistemic logic.

**Model**: Directed graph where edges represent "knowledge unlocks knowledge".

```javascript
const graph = new EvidenceGraph();

// Add evidence
graph.addEvidence('crime_scene_body', {
  type: EvidenceType.BODY,
  location: 'crime_scene_1',
  description: 'Victim found with blunt trauma',
  isSolutionFact: false,
});

graph.addEvidence('autopsy_report', {
  type: EvidenceType.DOCUMENT,
  location: 'medical_examiner',
  description: 'Time of death: 10:00 PM',
  isSolutionFact: false,
});

// Add dependency (collecting body unlocks autopsy)
graph.addDependency('crime_scene_body', 'autopsy_report');

// Validate solvability
const startingEvidence = graph.getStartingEvidence();
const result = graph.isSolvable(startingEvidence);
console.log(result.solvable); // true/false
console.log(result.unreachableFactIds); // []

// Query accessible evidence
const collected = ['crime_scene_body'];
const accessible = graph.getAccessibleEvidence(collected);
console.log(accessible.newly_unlocked); // ['autopsy_report']
```

**Evidence Types**:
- `BODY`, `WEAPON`, `BLOOD`, `FINGERPRINTS` (crime scene)
- `LETTER`, `CONTRACT`, `DIARY`, `RECEIPT` (documents)
- `WITNESS_STATEMENT`, `ALIBI` (testimony)
- `DNA`, `TOXICOLOGY`, `BALLISTICS` (forensics)
- `KILLER_IDENTITY`, `MOTIVE`, `METHOD` (solution facts)

---

### 7. EntityPopulator

**Purpose**: Convert generation data into ECS spawn data.

**Output**: Arrays of spawn data for NPCs, evidence, and objects.

```javascript
const populator = new EntityPopulator({
  npcDensity: 1.0,
  enemyDensity: 0.5,
  backgroundNPCs: true,
});

const spawnData = populator.populate(district, caseData, 12345);

// Inspect spawn data
console.log(spawnData.npcs.length); // 50-80 NPCs
console.log(spawnData.evidence.length); // 25 evidence items
console.log(spawnData.objects.length); // 100-200 objects

// Access NPC data
const npc = spawnData.npcs[0];
console.log(npc.npcId); // 'npc_0'
console.log(npc.name); // 'John Doe'
console.log(npc.position); // { x: 50, y: 60 }
console.log(npc.roomId); // 'apartment_5'
console.log(npc.role); // 'victim'
console.log(npc.attitude); // 'neutral'

// Access evidence data
const evidence = spawnData.evidence[0];
console.log(evidence.evidenceId); // 'crime_scene_body'
console.log(evidence.position); // { x: 30, y: 40 }
console.log(evidence.evidenceType); // 'body'
console.log(evidence.isSolutionFact); // false
```

---

### 8. LevelSpawnSystem

**Purpose**: Convert spawn data into ECS entities with components.

**Integration**: Listens to `level:load` event, spawns entities, emits `level:loaded`.

```javascript
const spawnSystem = new LevelSpawnSystem(
  componentRegistry,
  eventBus,
  entityManager,
  spatialHash
);

// Method 1: Direct call
spawnSystem.spawnFromGeneration(spawnData);

// Method 2: Via event
eventBus.emit('level:load', { spawnData });

// Listen for completion
eventBus.on('level:loaded', (data) => {
  console.log(`Spawned ${data.entityCount} entities in ${data.spawnTime}ms`);
});

// Clean up current level
eventBus.emit('level:clear');
```

**Entity Creation**:
- NPCs: `createNPCEntity()` → Transform + Sprite + Collider + NPC + Dialogue
- Evidence: `createEvidenceEntity()` → Transform + Sprite + Evidence + InteractionZone
- Objects: Manual creation → Transform + Sprite + Collider + InteractionZone

---

### 9. NarrativeAnchorManager

**Purpose**: Manage fixed story locations that persist across regenerations.

**Anchors**: Detective office (0, 0), faction HQs, quest locations, safe houses.

```javascript
const anchorManager = new NarrativeAnchorManager();

// Get all permanent anchors
const anchors = anchorManager.getAnchors({ isPermanent: true });
console.log(anchors.length); // 6 (detective office + 5 faction HQs)

// Get specific anchor
const detectiveOffice = anchorManager.getAnchorById('detective_office');
console.log(detectiveOffice.position); // { x: 0, y: 0 }
console.log(detectiveOffice.metadata.name); // 'Detective Office'

// Apply anchors to district
anchorManager.applyAnchorsToDistrict(district);

// Detective office is now fixed at (0, 0)
const office = district.rooms.find(r => r.id === 'detective_office');
console.log(office.isAnchor); // true
console.log(office.position); // { x: 0, y: 0 }
```

**Custom Anchors**:
```javascript
import { RoomTemplate } from './engine/procedural/RoomTemplate.js';

const template = new RoomTemplate({
  id: 'safe_house_default',
  type: 'safe_house',
  width: 15,
  height: 15,
  tiles: /* ... */,
  doors: [/* ... */],
  interactionPoints: [/* ... */],
});

anchorManager.registerAnchor({
  id: 'safe_house_downtown',
  type: 'safe_house',
  isPermanent: true,
  roomTemplate: template,
  position: { x: 25, y: 25 },
  metadata: {
    name: 'Downtown Safe House',
    description: 'A hidden refuge in the city.',
    questTriggers: ['safe_house_discovered'],
  },
});
```

---

## Generation Workflow

### Full Generation Cycle (Client-Side)

```javascript
async function generateLevel(seed, difficulty = 'medium') {
  const startTime = performance.now();

  // Step 1: Generate district (40-80ms)
  const districtGen = new DistrictGenerator({
    districtSize: { width: 200, height: 200 },
  });
  const district = districtGen.generate(seed, 'mixed');

  // Step 2: Apply narrative anchors (1-5ms)
  const anchorManager = new NarrativeAnchorManager();
  anchorManager.applyAnchorsToDistrict(district);

  // Step 3: Generate case (30-80ms)
  const caseGen = new CaseGenerator({ difficulty });
  const caseData = caseGen.generate(district, seed + 1);

  // Step 4: Populate entities (10-30ms)
  const populator = new EntityPopulator({
    npcDensity: 1.0,
    backgroundNPCs: true,
  });
  const spawnData = populator.populate(district, caseData, seed + 2);

  // Step 5: Spawn in ECS (<10ms)
  eventBus.emit('level:load', { spawnData, district, caseData });

  const elapsed = performance.now() - startTime;
  console.log(`Level generated in ${elapsed.toFixed(2)}ms`);

  return { district, caseData, spawnData };
}

// Usage
const result = await generateLevel(12345, 'medium');
// Total time: ~80-200ms (acceptable during loading screen)
```

### Event Flow

```
User clicks "New Game" or "Load Case"
         ↓
Game.js calls generateLevel(seed, difficulty)
         ↓
District generated → Case generated → Entities populated
         ↓
EventBus.emit('level:load', { spawnData, district, caseData })
         ↓
LevelSpawnSystem spawns entities
         ↓
EventBus.emit('level:loaded', { entityCount, spawnTime })
         ↓
InvestigationSystem.registerCase(caseData)
DialogueSystem.loadNPCDialogue()
FactionSystem.setDistrictControl()
NPCMemorySystem.initializeKnowledge()
         ↓
Player spawned at detective office (0, 0)
         ↓
Gameplay begins
```

---

## Integration Points

### 1. Investigation System

**Purpose**: Register case data for evidence collection and deduction.

```javascript
// In InvestigationSystem
eventBus.on('level:loaded', (data) => {
  if (data.caseData) {
    this.registerCase(data.caseData);
  }
});

registerCase(caseData) {
  this.currentCase = caseData;
  this.evidenceGraph = caseData.evidenceGraph;
  this.collectedEvidence = new Set();

  // Populate deduction board
  this.updateDeductionBoard();
}

onEvidenceCollected(evidenceId) {
  this.collectedEvidence.add(evidenceId);

  // Check for newly unlocked evidence
  const accessible = this.evidenceGraph.getAccessibleEvidence(
    Array.from(this.collectedEvidence)
  );

  for (const newId of accessible.newly_unlocked) {
    this.eventBus.emit('evidence:unlocked', { evidenceId: newId });
  }
}
```

---

### 2. Dialogue System

**Purpose**: Load NPC dialogue trees based on case roles.

```javascript
// In DialogueSystem
eventBus.on('level:loaded', (data) => {
  if (data.spawnData && data.spawnData.npcs) {
    this.loadNPCDialogue(data.spawnData.npcs, data.caseData);
  }
});

loadNPCDialogue(npcs, caseData) {
  for (const npc of npcs) {
    let dialogueTree;

    if (npc.role === 'victim') {
      dialogueTree = this.loadVictimDialogue(npc, caseData);
    } else if (npc.role === 'killer') {
      dialogueTree = this.loadKillerDialogue(npc, caseData);
    } else if (npc.role === 'witness') {
      dialogueTree = this.loadWitnessDialogue(npc, caseData);
    } else {
      dialogueTree = this.loadAmbientDialogue(npc);
    }

    this.dialogueTrees.set(npc.npcId, dialogueTree);
  }
}
```

---

### 3. Faction System

**Purpose**: Set district control and reputation modifiers.

```javascript
// In FactionReputationSystem
eventBus.on('level:loaded', (data) => {
  if (data.district && data.district.metadata) {
    this.setDistrictControl(data.district.rooms);
  }
});

setDistrictControl(rooms) {
  for (const room of rooms) {
    if (room.anchorMetadata && room.anchorMetadata.factionId) {
      this.districtControl.set(room.id, room.anchorMetadata.factionId);
    } else if (room.zone) {
      // Use zone faction
      const zoneFaction = this.getZoneFaction(room.zone);
      this.districtControl.set(room.id, zoneFaction);
    }
  }

  // Emit faction control updated
  this.eventBus.emit('faction:control_updated', {
    districtControl: this.districtControl,
  });
}
```

---

### 4. NPC Memory System

**Purpose**: Initialize NPC knowledge from case data.

```javascript
// In NPCMemorySystem
eventBus.on('level:loaded', (data) => {
  if (data.spawnData && data.caseData) {
    this.initializeNPCKnowledge(data.spawnData.npcs, data.caseData);
  }
});

initializeNPCKnowledge(npcs, caseData) {
  for (const npc of npcs) {
    // Get evidence this NPC knows about
    const knownEvidence = this.determineNPCKnowledge(npc, caseData);

    // Initialize memory
    this.npcMemories.set(npc.npcId, {
      knownEvidence,
      attitude: npc.attitude,
      willingnessToTalk: this.calculateWillingness(npc, caseData),
      lastInteraction: null,
    });
  }
}

determineNPCKnowledge(npc, caseData) {
  const knownEvidence = [];

  if (npc.role === 'witness') {
    // Witnesses know about evidence at crime scene
    const crimeSceneEvidence = caseData.evidenceGraph
      .getEvidenceByLocation(caseData.solution.location);
    knownEvidence.push(...crimeSceneEvidence.map(e => e.id));
  }

  if (npc.role === 'killer') {
    // Killer knows all evidence (but won't reveal)
    knownEvidence.push(...Array.from(caseData.evidenceGraph.evidenceData.keys()));
  }

  return knownEvidence;
}
```

---

## Performance Considerations

### Generation Performance Budget

| Stage | Target Time | Actual (Measured) |
|-------|-------------|-------------------|
| District Layout | <50ms | 40-80ms |
| Case Generation | <30ms | 30-80ms |
| Entity Population | <20ms | 10-30ms |
| ECS Spawning | <10ms | 5-10ms |
| **Total** | **<110ms** | **85-200ms** ✅ |

### Optimization Techniques

#### 1. Object Pooling

```javascript
class RNGPool {
  constructor() {
    this.pool = [];
  }

  acquire(seed) {
    if (this.pool.length > 0) {
      const rng = this.pool.pop();
      rng.setState(seed);
      return rng;
    }
    return new SeededRandom(seed);
  }

  release(rng) {
    this.pool.push(rng);
  }
}

// Usage
const rngPool = new RNGPool();
const rng = rngPool.acquire(12345);
// ... use rng
rngPool.release(rng);
```

#### 2. Lazy Room Loading

```javascript
class LazyRoomLoader {
  constructor(district, loadRadius = 2) {
    this.district = district;
    this.loadRadius = loadRadius;
    this.loadedRooms = new Set();
  }

  updateLoadedRooms(playerRoomId) {
    // Find rooms within loadRadius connections
    const nearbyRooms = this.district.graph.getReachableNodes(
      playerRoomId,
      this.loadRadius
    );

    // Load new rooms
    for (const roomId of nearbyRooms) {
      if (!this.loadedRooms.has(roomId)) {
        this.loadRoomDetails(roomId);
        this.loadedRooms.add(roomId);
      }
    }

    // Unload distant rooms
    for (const roomId of this.loadedRooms) {
      if (!nearbyRooms.has(roomId)) {
        this.unloadRoomDetails(roomId);
        this.loadedRooms.delete(roomId);
      }
    }
  }

  loadRoomDetails(roomId) {
    // Load detailed tile data, spawn entities
    console.log(`Loading room: ${roomId}`);
  }

  unloadRoomDetails(roomId) {
    // Unload tile data, despawn non-critical entities
    console.log(`Unloading room: ${roomId}`);
  }
}
```

#### 3. Spatial Hash Optimization

```javascript
// In LevelSpawnSystem
spawnFromGeneration(spawnData) {
  // Batch insert entities into spatial hash
  const entitiesToIndex = [];

  for (const npcData of spawnData.npcs) {
    const entityId = this.spawnNPC(npcData);
    if (entityId !== null) {
      entitiesToIndex.push({ entityId, x: npcData.position.x, y: npcData.position.y });
    }
  }

  // Bulk insert (more efficient than individual inserts)
  if (this.spatialHash && entitiesToIndex.length > 0) {
    this.spatialHash.bulkInsert(entitiesToIndex);
  }
}
```

### Memory Management

**Estimated Memory Usage**:
- District (200x200): ~400KB (tilemap + graph + rooms)
- Case Data: ~100KB (evidence graph + placements + NPCs)
- Spawn Data: ~200KB (50 NPCs + 25 evidence + 200 objects)
- **Total**: ~700KB per level ✅ Well within budget

**GC Optimization**:
- Reuse arrays and objects where possible
- Avoid creating temporary objects in hot paths
- Use object pools for frequently created objects
- Clear large data structures explicitly when done

---

## Common Patterns

### Pattern 1: Regenerate District, Keep Case

**Use Case**: New Game+ with same narrative but different layout.

```javascript
function regenerateDistrict(originalCaseData, newSeed) {
  // Generate new district with different layout
  const districtGen = new DistrictGenerator();
  const newDistrict = districtGen.generate(newSeed, 'mixed');

  // Apply same narrative anchors
  const anchorManager = new NarrativeAnchorManager();
  anchorManager.applyAnchorsToDistrict(newDistrict);

  // Reuse original case data, but update evidence placements
  const updatedCaseData = {
    ...originalCaseData,
    evidencePlacements: updateEvidencePlacements(
      originalCaseData.evidenceGraph,
      newDistrict
    ),
  };

  // Populate and spawn
  const populator = new EntityPopulator();
  const spawnData = populator.populate(newDistrict, updatedCaseData, newSeed);
  eventBus.emit('level:load', { spawnData, district: newDistrict, caseData: updatedCaseData });
}
```

---

### Pattern 2: Multiple Cases in Same District

**Use Case**: Sequential cases in the same city district.

```javascript
function loadNewCase(existingDistrict, caseSeed) {
  // Generate new case in existing district
  const caseGen = new CaseGenerator({ difficulty: 'medium' });
  const newCaseData = caseGen.generate(existingDistrict, caseSeed);

  // Clear old case entities
  eventBus.emit('level:clear');

  // Populate new case
  const populator = new EntityPopulator();
  const spawnData = populator.populate(existingDistrict, newCaseData, caseSeed);

  // Spawn new entities
  eventBus.emit('level:load', {
    spawnData,
    district: existingDistrict,
    caseData: newCaseData,
  });
}
```

---

### Pattern 3: Save/Load with Seed

**Use Case**: Persist procedurally generated levels.

```javascript
function saveLevel() {
  const saveData = {
    seed: currentSeed,
    difficulty: currentDifficulty,
    districtType: currentDistrictType,
    playerProgress: {
      collectedEvidence: Array.from(investigationSystem.collectedEvidence),
      playerPosition: playerTransform.position,
      questsCompleted: questSystem.completedQuests,
    },
  };

  localStorage.setItem('save_slot_1', JSON.stringify(saveData));
}

function loadLevel() {
  const saveData = JSON.parse(localStorage.getItem('save_slot_1'));

  // Regenerate level from seed (identical result)
  const result = generateLevel(saveData.seed, saveData.difficulty);

  // Restore player progress
  investigationSystem.collectedEvidence = new Set(saveData.playerProgress.collectedEvidence);
  playerTransform.position = saveData.playerProgress.playerPosition;
  questSystem.completedQuests = saveData.playerProgress.questsCompleted;
}
```

---

### Pattern 4: Debug Visualization

**Use Case**: Visualize generation for debugging.

```javascript
function visualizeDistrict(district) {
  const canvas = document.createElement('canvas');
  canvas.width = district.tilemap.width * 4;
  canvas.height = district.tilemap.height * 4;
  const ctx = canvas.getContext('2d');

  // Draw tilemap
  for (let y = 0; y < district.tilemap.height; y++) {
    for (let x = 0; x < district.tilemap.width; x++) {
      const tile = district.tilemap.getTile(x, y);

      ctx.fillStyle = {
        0: '#000000', // EMPTY
        1: '#FFFFFF', // FLOOR
        2: '#888888', // WALL
        3: '#00FF00', // DOOR
        4: '#0000FF', // WINDOW
        5: '#FF0000', // FURNITURE
        6: '#FFFF00', // CONTAINER
      }[tile] || '#000000';

      ctx.fillRect(x * 4, y * 4, 4, 4);
    }
  }

  // Draw room boundaries
  ctx.strokeStyle = '#FF00FF';
  ctx.lineWidth = 2;
  for (const room of district.rooms) {
    ctx.strokeRect(room.x * 4, room.y * 4, room.width * 4, room.height * 4);
  }

  document.body.appendChild(canvas);
}
```

---

## Rotation Support (Session 77, updated Session 82)

Procedurally generated rooms now rotate cleanly across the pipeline.

- `DistrictGenerator` selects from `config.rotationAngles` (default `[0, 90, 180, 270]`). Template dimensions stay intact while `layoutWidth` / `layoutHeight` track the rotated bounding box used for force-directed placement and spacing.
- `RoomInstance` keeps both template dimensions and the assigned `rotation`. Use `room.getBounds(room.width, room.height)` to obtain rotation-aware world bounds—corridor generation, containment checks, and placement heuristics now rely on these helpers.
- Corridor endpoints are derived from the rotated bounds so hallway tiles always begin and end inside the source/target room. See `tests/game/procedural/DistrictGenerator.test.js` for regression coverage.
- Disable rotation by configuring `rotationAngles: [0]`, or limit to `[0, 180]` for templates that only support horizontal flips.
- `TemplateVariantResolver` consults the variant manifest (pass via `new DistrictGenerator({ templateVariantManifest })`) to swap orientation-specific tilemaps or fall back to rotation with seam metadata. The default manifest (`src/game/procedural/templates/authoredTemplates.js`) now ships bespoke variants for the Act 1 crime scene and vendor stalls so rotated rooms pick art-aligned seams.
- `tests/game/procedural/TilemapInfrastructure.test.js` includes assertions for the crime-scene and vendor manifests plus a DistrictGenerator integration check to make sure variant metadata propagates into corridor seam painting.
- `CorridorSeamPainter` now applies seam descriptors emitted by the resolver, placing door tiles at the rotated endpoints so corridor joins remain clean.
- Benchmark rotation impact periodically—Session 83 measured an average **28.86 ms** over three mixed-district samples (`rotationAngles: [0, 90, 180, 270]`) with manifest variants enabled. Use `node -e "import { DistrictGenerator } ..."` (see session handoff) to reproduce the telemetry locally.

**Integration Tips**
- Keep tilemaps authored in their default orientation; the generator handles rotation during placement.
- When placing quest triggers or other gameplay probes, convert coordinates via `RoomInstance.localToWorld()` / `worldToLocal()` instead of assuming axis-aligned rectangles.

---

## Troubleshooting

### Issue 1: Case Not Solvable

**Symptoms**: `evidenceGraph.isSolvable()` returns `false`, case generation fails.

**Causes**:
- Missing dependencies in evidence chain
- Circular dependencies
- Solution facts unreachable from starting evidence

**Solutions**:
```javascript
// Debug evidence graph
const validation = evidenceGraph.validate();
console.log(validation); // { valid: false, issues: [...] }

// Check specific path
const startingEvidence = evidenceGraph.getStartingEvidence();
const solutionFactIds = ['solution_killer_identity', 'solution_motive', 'solution_method'];
const pathResult = evidenceGraph.getSolutionPath(startingEvidence, solutionFactIds);
console.log(pathResult); // { path: [...], steps: 5 } or null

// Visualize evidence graph
function visualizeEvidenceGraph(evidenceGraph) {
  const nodes = Array.from(evidenceGraph.evidenceData.values());
  console.log('Evidence Nodes:');
  for (const node of nodes) {
    const deps = evidenceGraph.graph.getNeighbors(node.id);
    console.log(`  ${node.id} → [${deps.join(', ')}]`);
  }
}
```

---

### Issue 2: District Not Connected

**Symptoms**: Some rooms unreachable, `graph.isFullyConnected()` returns `false`.

**Causes**:
- Graph generation didn't add enough edges
- Room placement failed
- Corridors didn't connect

**Solutions**:
```javascript
// Check connectivity
const connected = graph.isFullyConnected();
console.log(`Connected: ${connected}`);

// Find unreachable nodes
const detectiveOffice = 'detective_office';
const reachable = graph.getReachableNodes(detectiveOffice);
const all = new Set(graph.nodes.keys());
const unreachable = [...all].filter(id => !reachable.has(id));
console.log(`Unreachable rooms: ${unreachable.join(', ')}`);

// Manually add connections
for (const roomId of unreachable) {
  // Connect to nearest reachable room
  const nearestRoom = findNearestReachableRoom(roomId, reachable, district);
  graph.addEdge(nearestRoom, roomId, { doorType: 'main' });
  graph.addEdge(roomId, nearestRoom, { doorType: 'main' });
}
```

---

### Issue 3: Performance Too Slow

**Symptoms**: Generation takes >200ms, causes frame drops.

**Causes**:
- Too many rooms (>100)
- Too many force-directed layout iterations
- Large tilemap dimensions
- BSP too deep

**Solutions**:
```javascript
// Reduce room count
const districtGen = new DistrictGenerator({
  roomCounts: {
    detective_office: 1,
    crime_scene: 2,
    apartment: 15, // Reduced from 20
    office: 8,     // Reduced from 10
    street: 6,     // Reduced from 8
    // ...
  },
});

// Reduce force iterations
const districtGen = new DistrictGenerator({
  forceIterations: 50, // Reduced from 100
});

// Reduce BSP depth
const bsp = new BSPGenerator({
  maxDepth: 3, // Reduced from 4-5
});

// Profile generation
function profileGeneration(seed) {
  const stages = {};

  let start = performance.now();
  const district = districtGen.generate(seed, 'mixed');
  stages.district = performance.now() - start;

  start = performance.now();
  const caseData = caseGen.generate(district, seed);
  stages.case = performance.now() - start;

  start = performance.now();
  const spawnData = populator.populate(district, caseData, seed);
  stages.population = performance.now() - start;

  console.table(stages);
}
```

---

### Issue 4: Evidence Placement Fails

**Symptoms**: Evidence not spawned, warnings about missing rooms.

**Causes**:
- Evidence placement references non-existent room IDs
- Room not found in district
- Position calculation error

**Solutions**:
```javascript
// Validate evidence placements
function validateEvidencePlacements(caseData, district) {
  const issues = [];

  for (const placement of caseData.evidencePlacements) {
    const room = district.rooms.find(r => r.id === placement.roomId);
    if (!room) {
      issues.push(`Evidence ${placement.evidenceId} references missing room ${placement.roomId}`);
    } else {
      // Check position within room bounds
      const inBounds =
        placement.position.x >= room.x &&
        placement.position.x < room.x + room.width &&
        placement.position.y >= room.y &&
        placement.position.y < room.y + room.height;

      if (!inBounds) {
        issues.push(`Evidence ${placement.evidenceId} position out of room bounds`);
      }
    }
  }

  return issues;
}

// Fix placements
function fixEvidencePlacements(caseData, district) {
  for (const placement of caseData.evidencePlacements) {
    const room = district.rooms.find(r => r.id === placement.roomId);
    if (!room) {
      // Fallback to random room of same type
      const evidence = caseData.evidenceGraph.getEvidence(placement.evidenceId);
      const suitableRooms = district.rooms.filter(r =>
        r.roomType === 'apartment' || r.roomType === 'office'
      );

      if (suitableRooms.length > 0) {
        const newRoom = suitableRooms[0];
        placement.roomId = newRoom.id;
        placement.position = {
          x: newRoom.x + Math.floor(newRoom.width / 2),
          y: newRoom.y + Math.floor(newRoom.height / 2),
        };
      }
    }
  }
}
```

---

## Next Steps

1. **Read API Documentation**: `/docs/api/procedural-generation-api.md` for detailed method signatures
2. **Review Sprint 4 Report**: `/docs/reports/sprint-4-procedural-generation.md` for architecture decisions
3. **Explore Examples**: `/examples/procedural/` for complete usage examples
4. **Run Tests**: `npm test -- --testPathPattern=procedural` to see test cases

---

**Document Version**: 1.0
**Last Updated**: 2025-10-27
**Author**: Documentation Specialist
**Sprint**: Sprint 4 - Procedural Generation System
