# Sprint 4: Procedural Generation System - Architecture Plan

**Date**: 2025-10-27
**Architect**: Senior Systems Architect
**Sprint**: Sprint 4 - Procedural Generation
**Target**: Detective Metroidvania hybrid gameplay
**Estimated Effort**: 12-14 hours implementation

---

## Executive Summary

This plan defines the architecture for Sprint 4's procedural generation system, implementing district layouts, case generation, and narrative anchor integration for The Memory Syndicate detective metroidvania. The system uses a **hybrid graph-based + BSP approach** with Web Worker background generation to maintain 60 FPS during generation.

### Key Architectural Decisions

1. **Graph-based district layout** with BSP subdivision for building interiors
2. **Reverse case construction** (solution-first) with evidence graph validation
3. **Hybrid fixed-procedural** with narrative anchors and selective regeneration
4. **Web Worker async generation** with incremental progress reporting
5. **Seeded Mulberry32 RNG** for deterministic, reproducible generation
6. **Spatial hash grid** for entity placement and proximity queries

### Performance Targets

| System | Budget | Approach |
|--------|--------|----------|
| District Generation | <50ms | Web Worker (0ms main thread impact) |
| Case Generation | <30ms | Web Worker (0ms main thread impact) |
| Evidence Placement | <10ms | Constraint satisfaction |
| Navigation Mesh | <15ms | Post-generation pathfinding graph |
| Entity Spawning | <10ms | Object pooling, spatial hash |
| **Total Generation** | **<115ms** | **Loading screen, no frame drops** |

---

## Context

### Research Reports Consulted

1. **Procedural Generation - Gameplay** (`docs/research/gameplay/procedural-generation-detective-metroidvania-2025-10-27.md`)
   - Graph-based room placement for metroidvania connectivity
   - Reverse case construction for guaranteed solvability
   - Hybrid fixed-procedural narrative integration
   - BSP for building interiors, cellular automata for organic spaces

2. **Procedural Generation - Engine** (`docs/research/engine/procedural-generation-architecture-2025-10-27.md`)
   - Multi-stage generation pipeline (layout → decoration → population)
   - Mulberry32 seeded RNG (95M ops/sec, deterministic)
   - Spatial hash grid vs quadtree (hash wins for uniform distribution)
   - Web Workers + OffscreenCanvas for non-blocking generation
   - Object pooling reduces GC pauses by 40-60%

### Current System State

**Existing Architecture:**
- ECS with ComponentRegistry, EntityManager, SystemManager
- EventBus for system communication
- FactionManager for reputation tracking
- NPCMemorySystem for witness/crime tracking
- Existing game systems: Investigation, Dialogue, Knowledge Progression
- 96.75% test pass rate (1,162/1,201 tests)

**Integration Points:**
- FactionManager: District control mapping, reputation-based case generation
- NPCMemorySystem: NPC witness placement, attitude-based evidence access
- Investigation system: Evidence collection, deduction board integration
- Knowledge progression: Case solutions unlock areas and abilities

### Problem Being Solved

**Core Challenge**: Generate solvable detective cases within explorable metroidvania districts while maintaining:
1. **Narrative coherence** - Fixed story anchors blend with procedural content
2. **Guaranteed solvability** - All cases must be completable with available evidence
3. **Metroidvania connectivity** - Interconnected loops, ability-gated shortcuts
4. **Performance** - 60 FPS maintained, <115ms total generation time
5. **Replayability** - Seeded variation without breaking narrative flow

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                   PROCEDURAL GENERATION PIPELINE                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────┐   │
│  │   Seeded    │───▶│   District   │───▶│  Case Generation│   │
│  │  RNG Setup  │    │   Layout     │    │   (Evidence)    │   │
│  └─────────────┘    └──────────────┘    └─────────────────┘   │
│                            │                       │             │
│                            ▼                       ▼             │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────┐   │
│  │  Narrative  │◀───│   Populate   │◀───│    Narrative    │   │
│  │   Anchors   │    │   Entities   │    │  Anchor Blend   │   │
│  └─────────────┘    └──────────────┘    └─────────────────┘   │
│         │                   │                       │           │
│         └───────────────────┴───────────────────────┘           │
│                             ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Quality Validation & Export                  │  │
│  │  • Solvability check  • Connectivity test  • Balance     │  │
│  └──────────────────────────────────────────────────────────┘  │
│                             │                                   │
└─────────────────────────────┼───────────────────────────────────┘
                              ▼
                    ┌─────────────────────┐
                    │   ECS Entity        │
                    │   Spawning          │
                    │  (Main Thread)      │
                    └─────────────────────┘
```

### Generation Flow Detail

**Phase 1: Initialization (Web Worker)**
- Parse seed (numeric or string via cyrb128 hash)
- Initialize Mulberry32 RNG with seed
- Load narrative anchor definitions from story system
- Load case templates and faction data

**Phase 2: District Layout (Graph-Based + BSP)**
1. Create high-level district graph (nodes = major locations, edges = connections)
2. Place narrative anchor rooms at fixed positions
3. Generate remaining rooms using graph placement algorithm
4. For large rooms (buildings), apply BSP subdivision for interiors
5. Create corridors and connections (L-shaped, ensure walkability)
6. Add metroidvania shortcuts and ability-gated paths
7. Validate connectivity via BFS from player start

**Phase 3: Case Generation (Reverse Construction)**
1. Select victim and killer from NPC pool (based on relationships)
2. Determine motive (financial, passionate, psychological)
3. Generate evidence graph with epistemic dependencies
4. Place evidence in district rooms (spatial + narrative constraints)
5. Add red herrings based on difficulty level
6. Validate solvability via graph traversal (all solution info reachable)

**Phase 4: Narrative Integration**
1. Place quest triggers from active quests in suitable rooms
2. Blend procedural NPCs with fixed story NPCs
3. Assign faction control to districts (affects NPC attitudes)
4. Place disguises and ability upgrades in appropriate locations

**Phase 5: Entity Population**
1. Spawn NPCs (witnesses, suspects, background characters)
2. Place evidence items at marked locations
3. Spawn enemies in appropriate districts (based on faction hostility)
4. Place interactive objects (doors, containers, terminals)

**Phase 6: Validation & Export**
1. Run solvability test on case evidence graph
2. Validate pathfinding (all required areas reachable)
3. Check performance constraints (polygon count, entity count)
4. Export serialized data to main thread
5. Main thread spawns ECS entities from data

---

## Component Breakdown

### Component 1: SeededRandom Utility

**Purpose**: Deterministic pseudo-random number generation for reproducible districts

**Responsibilities**:
- Generate float values [0, 1) from seed
- Generate integers in range [min, max)
- Select random element from array
- Shuffle arrays (Fisher-Yates)
- Probability checks (random boolean with threshold)
- State serialization for save/load

**Dependencies**: None (pure algorithm)

**Interface**:
```javascript
class SeededRandom {
  constructor(seed: number);

  // Core generation
  random(): number;                    // [0, 1)
  randomInt(min: number, max: number): number;

  // Utilities
  choice<T>(array: T[]): T;
  shuffle<T>(array: T[]): T[];
  probability(chance: number): boolean;

  // Serialization
  getState(): number;
  setState(seed: number): void;
}
```

**Implementation**: Mulberry32 algorithm (95M ops/sec, 32-bit state)

**Events**: None (stateless utility)

**Testing**:
- Determinism: Same seed produces identical sequence
- Distribution: Statistical tests (chi-square) for uniformness
- Performance: >50M random calls per second
- Edge cases: seed=0, seed=MAX_INT, negative seeds

---

### Component 2: LayoutGraph

**Purpose**: High-level graph representation of district structure

**Responsibilities**:
- Store nodes (rooms) with semantic types and constraints
- Store edges (connections) with door types and requirements
- Validate graph connectivity (all nodes reachable)
- Provide topological sort for placement order
- Calculate shortest paths for metroidvania loops
- Serialize/deserialize for save system

**Dependencies**: SeededRandom

**Interface**:
```javascript
class LayoutGraph {
  nodes: Map<string, GraphNode>;
  edges: Map<string, GraphEdge[]>;

  addNode(id: string, type: string, constraints: object): GraphNode;
  addEdge(fromId: string, toId: string, doorType: string, required: boolean): void;

  // Placement
  topologicalSort(): string[];
  findNearbyNodes(nodeId: string, maxDistance: number): GraphNode[];

  // Validation
  isFullyConnected(): boolean;
  hasPath(fromId: string, toId: string): boolean;

  // Serialization
  serialize(): object;
  static deserialize(data: object): LayoutGraph;
}

interface GraphNode {
  id: string;
  type: string;                    // 'crime_scene', 'apartment', 'evidence_storage', etc.
  templateGroup: string;           // Pool of compatible room templates
  constraints: {
    fixed?: boolean;               // Narrative anchor, never regenerated
    position?: {x: number, y: number};
    district?: string;             // 'downtown', 'industrial', etc.
    accessibility?: string;        // 'public', 'locked', 'hidden'
    factionControl?: string;
    narrativeTag?: string;         // 'case_location', 'quest_trigger', etc.
  };
  placedRoom?: RoomInstance;       // Set during generation
}

interface GraphEdge {
  to: string;
  doorType: string;                // 'main', 'locked', 'hidden', 'shortcut'
  required: boolean;               // Must exist for completion
  abilityRequired?: string;        // 'lockpick', 'hack', etc.
}
```

**Events**: None (data structure)

**Testing**:
- Graph construction: Add nodes, edges correctly
- Connectivity: BFS traversal finds all nodes
- Topological sort: Valid ordering for placement
- Serialization: Roundtrip preserves data

---

### Component 3: RoomTemplate & RoomInstance

**Purpose**: Reusable room layouts with variation

**Responsibilities**:
- Define tile layout (walls, floors, doors)
- Specify door positions and types
- Mark interaction points (evidence spawn, NPC positions)
- Support multiple variants per room type
- Lightweight serialization
- Provide rotation-aware `localToWorld`/`worldToLocal` conversions for 90° increments (covered by Jest).

**Dependencies**: None (data structure)

**Interface**:
```javascript
class RoomTemplate {
  id: string;
  type: string;                    // 'detective_office', 'crime_scene', etc.
  width: number;
  height: number;
  doors: DoorDefinition[];
  interactionPoints: InteractionPoint[];
  tileLayout: TileType[][];        // 2D array of tile types

  // Metadata
  minDistrictSize?: number;
  factionTheme?: string;
  narrativeRelevance?: string[];

  static loadFromJSON(path: string): RoomTemplate;
}

class RoomInstance {
  templateId: string;
  position: {x: number, y: number};
  rotation: number;                // 0, 90, 180, 270 degrees
  doorConnections: Map<string, string>;  // door ID -> connected room ID
  spawnedEntities: EntityData[];

  getTileAt(x: number, y: number): TileType;
  getWorldPosition(localX: number, localY: number): {x: number, y: number};
}

interface DoorDefinition {
  id: string;
  x: number;
  y: number;
  direction: 'north' | 'south' | 'east' | 'west';
  type: 'main' | 'locked' | 'hidden';
  keyRequired?: string;
}

interface InteractionPoint {
  id: string;
  x: number;
  y: number;
  type: 'evidence_spawn' | 'npc_spawn' | 'quest_trigger' | 'container';
  metadata?: object;
}

enum TileType {
  EMPTY = 0,
  FLOOR = 1,
  WALL = 2,
  DOOR = 3,
  WINDOW = 4,
  FURNITURE = 5,
  CONTAINER = 6
}
```

**Events**: None (data structure)

**Testing**:
- Template loading: Parse JSON correctly
- Door validation: All doors have valid positions
- Rotation: Tile layout transforms correctly
- Collision: Wall tiles block movement

---

### Component 4: BSPGenerator (Binary Space Partitioning)

**Purpose**: Subdivide large rooms into structured interior layouts

**Responsibilities**:
- Recursively split rectangular space into sub-rooms
- Constrain split positions (45-55% for uniform, 10-90% for variety)
- Create room instances in leaf nodes
- Generate corridors connecting sibling rooms (L-shaped or straight)
- Respect minimum room size constraints
- Export to TileMap representation

**Dependencies**: SeededRandom, RoomTemplate

**Interface**:
```javascript
class BSPGenerator {
  constructor(width: number, height: number, seed: number);

  // Configuration
  config: {
    minRoomSize: number;           // Default: 8 tiles
    maxRoomSize: number;           // Default: 16 tiles
    corridorWidth: number;         // Default: 2 tiles
    maxDepth: number;              // Default: 4 levels
  };

  // Generation
  generate(): BSPResult;

  // Conversion
  toTileMap(): TileMap;
  toRoomInstances(): RoomInstance[];
}

interface BSPResult {
  tree: BinaryTree;
  rooms: RoomData[];
  corridors: CorridorData[];
}

class BinaryTree {
  container: {x: number, y: number, width: number, height: number};
  left: BinaryTree | null;
  right: BinaryTree | null;
  room: RoomData | null;          // Populated at leaf nodes
}

interface RoomData {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  doors: DoorDefinition[];
}

interface CorridorData {
  tiles: {x: number, y: number}[];
  start: {x: number, y: number};
  end: {x: number, y: number};
}
```

**Events**: None (synchronous generation)

**Testing**:
- Tree construction: All nodes have valid bounds
- Room creation: Rooms fit within containers
- Corridor connectivity: All rooms have path to start
- Minimum size: No rooms smaller than threshold
- Performance: <15ms for 20-50 rooms

---

### Component 5: CaseGenerator

**Purpose**: Generate solvable murder cases with evidence chains

**Responsibilities**:
- Select victim and killer from NPC pool
- Determine motive based on relationships (financial, passionate, psychological)
- Create evidence graph with dependencies
- Place evidence items in district rooms
- Add red herrings for difficulty scaling
- Validate solvability via graph traversal
- Support multiple case types (murder, theft, conspiracy)

**Dependencies**: SeededRandom, EvidenceGraph, NPCRelationshipData

**Interface**:
```javascript
class CaseGenerator {
  constructor(seed: number, npcPool: NPC[], districtLayout: LayoutGraph);

  generateCase(difficulty: 'easy' | 'medium' | 'hard'): CaseData;

  // Internal stages
  private selectVictimAndKiller(): {victim: NPC, killer: NPC};
  private determineMotive(relationship: Relationship): Motive;
  private selectMethod(motive: Motive, killerTraits: Traits): Method;
  private selectCrimeScene(victim: NPC, killer: NPC): GraphNode;
  private generateTimeline(): Timeline;
}

interface CaseData {
  id: string;
  type: 'murder' | 'theft' | 'conspiracy';
  victim: NPC;
  killer: NPC;
  motive: Motive;
  method: Method;
  location: GraphNode;
  timeline: Timeline;
  evidenceGraph: EvidenceGraph;
  solution: Solution;
}

interface Motive {
  category: 'financial' | 'passionate' | 'psychological';
  description: string;
  supportingEvidence: string[];    // Evidence IDs that prove motive
}

interface Method {
  weapon: string;
  approach: string;                // 'direct', 'staged_accident', 'poisoning'
  evidence: string[];              // Physical evidence IDs
}

interface Timeline {
  murderTime: number;              // Game time (hours)
  events: TimelineEvent[];
  alibis: Map<string, Alibi>;      // NPC ID -> Alibi
}

interface TimelineEvent {
  time: number;
  actorId: string;
  location: string;
  action: string;
  witnesses: string[];
}
```

**Events**:
- `case:generated` - Case data available for spawning

**Testing**:
- Victim selection: Valid from NPC pool
- Killer selection: Has relationship with victim
- Solvability: Evidence graph validates as solvable
- Red herrings: Don't block solution path
- Performance: <30ms per case

---

### Component 6: EvidenceGraph

**Purpose**: Track evidence dependencies and validate case solvability

**Responsibilities**:
- Store evidence nodes with revealed information
- Track dependencies (what knowledge unlocks what)
- Validate solvability via BFS from accessible evidence
- Calculate minimum evidence path to solution
- Support narrative branching (multiple valid paths)
- Serialize for save system

**Dependencies**: None (graph data structure)

**Interface**:
```javascript
class EvidenceGraph {
  nodes: Map<string, EvidenceNode>;
  edges: Map<string, string[]>;    // node ID -> dependency IDs

  addEvidence(
    id: string,
    type: EvidenceType,
    location: string,
    revealedInfo: string[],
    dependencies?: string[]
  ): void;

  // Validation
  validateSolvability(solution: Solution): boolean;
  getAccessibleEvidence(playerKnowledge: Set<string>): Set<string>;
  getMinimumEvidencePath(solution: Solution): string[];

  // Queries
  isEvidenceAccessible(evidenceId: string, knowledge: Set<string>): boolean;
  getNextAvailableEvidence(knowledge: Set<string>): EvidenceNode[];
}

interface EvidenceNode {
  id: string;
  type: EvidenceType;
  location: string;                // Room ID where evidence is placed
  revealedInfo: string[];          // Knowledge tokens this evidence provides
  dependencies: string[];          // Knowledge tokens required to access
  accessible: boolean;             // Computed during validation
  description: string;
  visualData?: object;             // Sprite, icon, etc.
}

enum EvidenceType {
  PHYSICAL = 'physical',           // Items at crime scene
  TESTIMONY = 'testimony',         // NPC dialogue
  DOCUMENT = 'document',           // Files, notes, records
  FORENSIC = 'forensic',           // Analysis results (fingerprints, DNA)
  DIGITAL = 'digital',             // Computer logs, emails
  ENVIRONMENTAL = 'environmental'  // Scene observations
}

interface Solution {
  killerId: string;
  motive: string;
  method: string;
  timeline: string;
  requiredInfo: string[];          // Knowledge tokens proving solution
}
```

**Events**: None (data structure)

**Testing**:
- Graph construction: Add nodes, edges correctly
- Solvability: BFS finds all solution info
- Dependencies: Evidence locked until prereqs met
- Branching: Multiple paths to solution work
- Performance: <5ms validation for 50 evidence nodes

---

### Component 7: ProceduralGenerationCoordinator (Web Worker)

**Purpose**: Orchestrate full generation pipeline in background thread

**Responsibilities**:
- Coordinate all generation stages
- Report progress to main thread (loading bar)
- Handle errors and retry logic
- Serialize results for message passing
- Support incremental generation (yield between stages)
- Respect time budgets (<50ms per stage)

**Dependencies**: All generator classes

**Interface**:
```javascript
// Worker message protocol
interface GenerationRequest {
  command: 'generate';
  params: {
    seed: number | string;
    difficulty: 'easy' | 'medium' | 'hard';
    narrativeAnchors: NarrativeAnchorDef[];
    activeQuests: QuestDef[];
    playerKnowledge: string[];
    factionStandings: Map<string, FactionStanding>;
  };
}

interface GenerationResponse {
  success: boolean;
  progress: number;                // 0.0 - 1.0
  stage: string;                   // 'layout', 'case', 'population', etc.
  result?: GenerationResult;
  error?: string;
}

interface GenerationResult {
  seed: number;
  districtLayout: SerializedLayoutGraph;
  caseData: SerializedCaseData;
  entities: EntitySpawnData[];
  navigationMesh: SerializedNavMesh;
  metadata: {
    generationTime: number;
    roomCount: number;
    entityCount: number;
    validationPassed: boolean;
  };
}
```

**Worker Code**:
```javascript
// generation-worker.js
import { SeededRandom } from './SeededRandom.js';
import { DistrictGenerator } from './DistrictGenerator.js';
import { CaseGenerator } from './CaseGenerator.js';
import { EntityPopulator } from './EntityPopulator.js';

self.onmessage = async function(e) {
  const { command, params } = e.data;

  if (command === 'generate') {
    try {
      const result = await generateDistrict(params);
      self.postMessage({ success: true, result });
    } catch (error) {
      self.postMessage({ success: false, error: error.message });
    }
  }
};

async function generateDistrict(params) {
  // Stage 1: Layout (20%)
  self.postMessage({ progress: 0.0, stage: 'layout' });
  const districtGen = new DistrictGenerator(params.seed);
  const layout = districtGen.generate(params.narrativeAnchors);
  self.postMessage({ progress: 0.2, stage: 'layout' });

  // Stage 2: Case (40%)
  self.postMessage({ progress: 0.2, stage: 'case' });
  const caseGen = new CaseGenerator(params.seed, layout);
  const caseData = caseGen.generateCase(params.difficulty);
  self.postMessage({ progress: 0.4, stage: 'case' });

  // Stage 3: Population (70%)
  self.postMessage({ progress: 0.4, stage: 'population' });
  const populator = new EntityPopulator(params.seed);
  const entities = populator.populate(layout, caseData);
  self.postMessage({ progress: 0.7, stage: 'population' });

  // Stage 4: Validation (90%)
  self.postMessage({ progress: 0.7, stage: 'validation' });
  const valid = validateGeneration(layout, caseData);
  if (!valid) throw new Error('Generation validation failed');
  self.postMessage({ progress: 0.9, stage: 'validation' });

  // Stage 5: Serialization (100%)
  self.postMessage({ progress: 0.9, stage: 'serialization' });
  const result = serializeResult(layout, caseData, entities);
  self.postMessage({ progress: 1.0, stage: 'complete' });

  return result;
}
```

**Events**:
- `generation:progress` - Progress update (0-100%)
- `generation:complete` - Generation finished
- `generation:error` - Generation failed

**Testing**:
- Message passing: Serialization roundtrip works
- Progress reporting: Updates sent at each stage
- Error handling: Failed generation reports error
- Performance: Total time <115ms
- Determinism: Same seed produces identical result

---

### Component 8: LevelSpawnSystem (ECS System)

**Purpose**: Convert generated data into ECS entities

**Responsibilities**:
- Receive generation result from worker
- Spawn entities from EntitySpawnData
- Create TileMap from layout data
- Register entities with spatial hash grid
- Initialize NPC relationships and memory
- Place evidence items in scene
- Emit `level:loaded` event when complete

**Dependencies**: EntityManager, ComponentRegistry, EventBus, SpatialHashGrid

**Interface**:
```javascript
class LevelSpawnSystem extends System {
  constructor(componentRegistry, eventBus, entityManager, spatialHash);

  // Main API
  spawnFromGeneration(result: GenerationResult): void;

  // Internal spawning
  private spawnRoom(roomData: RoomInstanceData): void;
  private spawnNPC(npcData: NPCSpawnData): Entity;
  private spawnEvidence(evidenceData: EvidenceSpawnData): Entity;
  private spawnInteractable(interactableData: InteractableData): Entity;

  // Cleanup
  despawnCurrentLevel(): void;
}

interface EntitySpawnData {
  type: 'npc' | 'evidence' | 'enemy' | 'interactable';
  position: {x: number, y: number};
  components: ComponentData[];
  metadata: object;
}

interface NPCSpawnData extends EntitySpawnData {
  npcId: string;
  factionId: string;
  relationship?: string;           // Relationship to victim/killer
  attitude: 'friendly' | 'neutral' | 'hostile';
  dialogue: string[];              // Dialogue tree IDs
  knownInfo: string[];             // Knowledge this NPC has
}

interface EvidenceSpawnData extends EntitySpawnData {
  evidenceId: string;
  evidenceType: EvidenceType;
  caseId: string;
  revealedInfo: string[];
  requiredKnowledge?: string[];    // To access this evidence
}
```

**Priority**: 10 (early, after engine systems but before gameplay)

**Queries**: None (spawns entities, doesn't update them)

**Events**:
- Listens: `generation:complete`
- Emits: `level:loaded`, `entity:spawned`

**Testing**:
- Spawning: All entities created with correct components
- Spatial indexing: Entities registered in spatial hash
- NPC memory: NPCs initialized with correct attitudes
- Evidence placement: Evidence items at correct locations
- Performance: <10ms to spawn 200 entities

---

### Component 9: GenerationValidationSystem

**Purpose**: Quality assurance for generated content

**Responsibilities**:
- Validate case solvability
- Check district connectivity (all rooms reachable)
- Verify narrative coherence (anchors present, quest targets exist)
- Enforce performance constraints (entity count, polygon count)
- Calculate quality score (shortcuts, complexity, variety)
- Report validation failures for regeneration

**Dependencies**: LayoutGraph, EvidenceGraph, QualityMetrics

**Interface**:
```javascript
class GenerationValidationSystem {
  validateDistrict(district: LayoutGraph): ValidationResult;
  validateCase(caseData: CaseData): ValidationResult;
  validateNarrativeCoherence(
    district: LayoutGraph,
    narrativeAnchors: NarrativeAnchorDef[]
  ): ValidationResult;
  validatePerformance(district: LayoutGraph): ValidationResult;
  calculateQualityScore(district: LayoutGraph, caseData: CaseData): number;
}

interface ValidationResult {
  valid: boolean;
  issues: string[];
  warnings: string[];
  score: number;                   // 0-100, higher is better
  metadata: {
    roomCount: number;
    entityCount: number;
    evidenceCount: number;
    shortcutCount: number;
    deadEndCount: number;
  };
}
```

**Validation Checks**:

1. **Connectivity**:
   - BFS from start room reaches all required rooms
   - All case evidence rooms are accessible
   - Narrative anchors are connected

2. **Solvability**:
   - Evidence graph validates (solution info reachable)
   - No circular dependencies in evidence chain
   - Red herrings don't block solution

3. **Narrative Coherence**:
   - All required narrative anchors present
   - Case locations within 5 rooms of anchors
   - Quest triggers placed in suitable rooms

4. **Performance**:
   - Room count ≤ 100
   - Entity count ≤ 500
   - Polygon count ≤ 10,000
   - No overlapping entities

5. **Quality Scoring**:
   - +2 points per shortcut (metroidvania loops)
   - +1.5 points per evidence node (case complexity)
   - -3 points per dead end
   - -10 points per missing required element

**Events**: None (synchronous validation)

**Testing**:
- Connectivity: Disconnected graph fails validation
- Solvability: Unsolvable case fails validation
- Performance: Oversized district fails validation
- Score calculation: Known-good districts score 80+

---

## Data Flow

### Full Generation Cycle

```
1. MAIN THREAD: Player triggers level load
   ↓
2. MAIN THREAD: Game.loadLevel(seed, config)
   ↓
3. MAIN THREAD: Send message to Web Worker
   Message: { command: 'generate', params: {...} }
   ↓
4. WEB WORKER: Receive message, start generation
   ├─ Stage 1: District Layout (LayoutGraph + BSP)
   │  - Create graph nodes (narrative anchors + procedural rooms)
   │  - Place rooms using topological sort
   │  - Generate corridors and connections
   │  - Apply BSP subdivision to large buildings
   │  Progress: 0% → 20%
   │
   ├─ Stage 2: Case Generation (CaseGenerator)
   │  - Select victim and killer
   │  - Generate evidence graph
   │  - Place evidence in rooms
   │  - Add red herrings
   │  - Validate solvability
   │  Progress: 20% → 40%
   │
   ├─ Stage 3: Narrative Integration
   │  - Place quest triggers
   │  - Blend fixed and procedural NPCs
   │  - Assign faction control to districts
   │  Progress: 40% → 60%
   │
   ├─ Stage 4: Entity Population
   │  - Spawn NPCs (witnesses, suspects, background)
   │  - Place evidence items
   │  - Spawn enemies based on faction hostility
   │  - Place interactables
   │  Progress: 60% → 80%
   │
   ├─ Stage 5: Validation
   │  - Check connectivity
   │  - Validate solvability
   │  - Verify performance constraints
   │  - Calculate quality score
   │  Progress: 80% → 90%
   │
   └─ Stage 6: Serialization
      - Convert LayoutGraph to JSON
      - Convert CaseData to JSON
      - Package EntitySpawnData array
      - Send result message to main thread
      Progress: 90% → 100%
   ↓
5. MAIN THREAD: Receive generation result
   ↓
6. MAIN THREAD: LevelSpawnSystem.spawnFromGeneration(result)
   ├─ Create TileMap from layout data
   ├─ Spawn entities from EntitySpawnData
   ├─ Register entities with SpatialHashGrid
   ├─ Initialize NPC memory and attitudes
   └─ Place evidence items
   ↓
7. MAIN THREAD: Emit 'level:loaded' event
   ↓
8. MAIN THREAD: Investigation, Dialogue, Faction systems respond
   ├─ InvestigationSystem: Register case data
   ├─ DialogueSystem: Load NPC dialogue trees
   ├─ FactionReputationSystem: Set district control
   └─ NPCMemorySystem: Initialize NPC knowledge
   ↓
9. MAIN THREAD: Player spawned, camera focused, gameplay begins
```

### Player Actions Triggering Generation Events

**Evidence Collection**:
```
Player collects evidence entity
  ↓
InvestigationSystem.onEvidenceCollected(evidenceId)
  ↓
Evidence.revealedInfo added to player knowledge
  ↓
EvidenceGraph.getAccessibleEvidence(playerKnowledge)
  ↓
New evidence items become accessible
  ↓
Emit 'evidence:revealed' event
  ↓
DialogueSystem updates NPC dialogue options
```

**Case Solution**:
```
Player submits case solution
  ↓
InvestigationSystem.validateSolution(solution)
  ↓
EvidenceGraph.validateSolvability(solution) -> true
  ↓
Emit 'case:solved' event
  ↓
FactionReputationSystem.onCaseSolved(caseData)
  ↓
Reputation changes cascade to allies/enemies
  ↓
KnowledgeProgressionSystem unlocks new areas
```

**District Regeneration** (New Game+):
```
Player starts new playthrough
  ↓
Game.regenerateDistrict(seed, progress)
  ↓
Keep narrative anchors (fixed: true)
  ↓
Regenerate procedural rooms with new seed
  ↓
Generate new case with different victim/killer
  ↓
Preserve player unlocks (abilities, knowledge gates)
```

---

## Implementation Order

### Phase 1: Core Abstractions (Est: 3-4 hours)

**Files Created**:
```
src/engine/procedural/SeededRandom.js         (150 lines)
src/engine/procedural/LayoutGraph.js          (250 lines)
src/engine/procedural/RoomTemplate.js         (200 lines)
tests/engine/procedural/SeededRandom.test.js  (100 lines)
tests/engine/procedural/LayoutGraph.test.js   (150 lines)
```

**Tasks**:
1. Implement Mulberry32 RNG in SeededRandom
   - Core random() method
   - Utilities (randomInt, choice, shuffle, probability)
   - State serialization
   - Tests for determinism and distribution

2. Implement LayoutGraph data structure
   - Add/remove nodes and edges
   - Topological sort
   - Connectivity validation via BFS
   - Serialization/deserialization
   - Tests for graph operations

3. Define RoomTemplate and RoomInstance
   - JSON schema for room templates
   - Tile layout storage (Uint8Array for efficiency)
   - Door and interaction point definitions
   - Rotation/transformation utilities
   - Tests for template loading and transformation

**Success Criteria**:
- ✅ SeededRandom produces identical sequences for same seed
- ✅ LayoutGraph passes connectivity tests (BFS finds all nodes)
- ✅ RoomTemplate loads from JSON and supports rotation
- ✅ All tests pass (100% for core abstractions)

---

### Phase 2: District Generation (Est: 4-5 hours)

**Files Created**:
```
src/game/procedural/BSPGenerator.js           (350 lines)
src/game/procedural/DistrictGenerator.js      (400 lines)
src/game/procedural/TileMap.js                (250 lines)
tests/game/procedural/BSPGenerator.test.js    (150 lines)
tests/game/procedural/DistrictGenerator.test.js (200 lines)
```

**Tasks**:
1. Implement BSPGenerator
   - Recursive space partitioning
   - Room creation in leaf nodes
   - Corridor generation (L-shaped, straight)
   - Minimum room size enforcement
   - Conversion to TileMap
   - Tests for tree structure and connectivity

2. Implement DistrictGenerator
   - High-level graph creation (nodes for major locations)
   - Narrative anchor placement (fixed positions)
   - Graph-based room placement algorithm
   - BSP integration for large buildings
   - Metroidvania shortcut generation
   - Tests for complete district generation

3. Implement TileMap
   - Uint8Array storage for tiles (memory efficient)
   - Get/set tile operations
   - Walkability checks
   - Neighbor queries for pathfinding
   - Flood fill for region detection
   - Serialization
   - Tests for tile operations and queries

**Success Criteria**:
- ✅ BSP produces connected room layouts
- ✅ DistrictGenerator places narrative anchors correctly
- ✅ All rooms reachable via pathfinding
- ✅ Generation completes in <50ms for 30-50 rooms
- ✅ Tests validate connectivity and performance

---

### Phase 3: Case Generation (Est: 3-4 hours)

**Files Created**:
```
src/game/procedural/CaseGenerator.js          (350 lines)
src/game/procedural/EvidenceGraph.js          (300 lines)
src/game/data/caseTemplates.js                (200 lines)
tests/game/procedural/CaseGenerator.test.js   (150 lines)
tests/game/procedural/EvidenceGraph.test.js   (150 lines)
```

**Tasks**:
1. Implement EvidenceGraph
   - Add evidence nodes with dependencies
   - BFS solvability validation
   - Accessible evidence queries
   - Minimum evidence path calculation
   - Serialization
   - Tests for solvability validation

2. Implement CaseGenerator
   - Victim and killer selection from NPC pool
   - Motive determination (financial, passionate, psychological)
   - Method selection (weapon, approach)
   - Timeline generation
   - Evidence graph construction
   - Evidence placement in district rooms
   - Red herring generation
   - Tests for case generation and solvability

3. Create case templates
   - Murder case template
   - Theft case template
   - Conspiracy case template
   - Motive and method combinations
   - Evidence type distributions

**Success Criteria**:
- ✅ EvidenceGraph validates solvability correctly
- ✅ CaseGenerator produces solvable cases 100% of time
- ✅ Red herrings don't block solution path
- ✅ Evidence placed in accessible rooms
- ✅ Generation completes in <30ms per case
- ✅ Tests validate solvability and performance

---

### Phase 4: Web Worker Integration (Est: 2-3 hours)

**Files Created**:
```
src/game/procedural/generation-worker.js      (250 lines)
src/game/procedural/WorkerCoordinator.js      (200 lines)
tests/game/procedural/WorkerCoordinator.test.js (100 lines)
```

**Tasks**:
1. Implement generation-worker.js
   - Message handler for generation requests
   - Coordinate all generation stages
   - Progress reporting to main thread
   - Error handling and retry logic
   - Result serialization
   - Import all generator classes

2. Implement WorkerCoordinator (main thread)
   - Worker lifecycle management (create, terminate)
   - Promise-based API for generation
   - Progress callback support
   - Error propagation
   - Tests for message passing

3. Integration with Game.js
   - Call WorkerCoordinator from Game.loadLevel()
   - Display loading screen with progress bar
   - Handle generation errors gracefully

**Success Criteria**:
- ✅ Worker generates districts without blocking main thread
- ✅ Progress updates received and displayed
- ✅ Generation result serializes/deserializes correctly
- ✅ Error handling works (worker crashes, validation failures)
- ✅ Main thread maintains 60 FPS during generation

---

### Phase 5: ECS Integration & Spawning (Est: 3-4 hours)

**Files Created**:
```
src/game/systems/LevelSpawnSystem.js          (400 lines)
src/game/systems/GenerationValidationSystem.js (250 lines)
src/game/procedural/EntityPopulator.js        (300 lines)
tests/game/systems/LevelSpawnSystem.test.js   (200 lines)
```

**Tasks**:
1. Implement EntityPopulator (runs in worker)
   - Spawn NPC data from case (witnesses, suspects)
   - Place evidence items at marked locations
   - Spawn enemies based on faction hostility
   - Place interactables (doors, containers)
   - Serialize EntitySpawnData array

2. Implement LevelSpawnSystem
   - Receive generation result from worker
   - Create TileMap entities
   - Spawn entities from EntitySpawnData
   - Register with SpatialHashGrid
   - Initialize NPC memory and attitudes
   - Place evidence items
   - Emit level:loaded event
   - Tests for spawning and initialization

3. Implement GenerationValidationSystem
   - Connectivity validation
   - Solvability validation
   - Narrative coherence validation
   - Performance constraint checks
   - Quality score calculation
   - Tests for all validation rules

4. Integration with existing systems
   - InvestigationSystem: Register case data
   - DialogueSystem: Load NPC dialogue trees
   - FactionReputationSystem: Set district control
   - NPCMemorySystem: Initialize NPC knowledge

**Success Criteria**:
- ✅ All entities spawn with correct components
- ✅ NPCs initialized with correct attitudes
- ✅ Evidence items placed at correct locations
- ✅ Spatial hash grid populated
- ✅ Existing systems respond to level:loaded event
- ✅ Spawning completes in <10ms for 200 entities
- ✅ Tests validate spawning and integration

---

### Phase 6: Narrative Integration (Est: 2-3 hours)

**Files Created**:
```
src/game/procedural/NarrativeAnchorManager.js (250 lines)
src/game/procedural/QuestTriggerPlacer.js     (200 lines)
tests/game/procedural/NarrativeAnchorManager.test.js (100 lines)
```

**Tasks**:
1. Implement NarrativeAnchorManager
   - Register fixed narrative locations
   - Determine anchor relevance based on story progress
   - Blend fixed and procedural content
   - Selective regeneration (preserve anchors, regenerate rest)
   - Tests for anchor management

2. Implement QuestTriggerPlacer
   - Place quest triggers in suitable rooms
   - Match room requirements (type, accessibility, faction)
   - Assign safe spawn points within rooms
   - Tests for trigger placement

3. Integration with story system
   - Load narrative anchors from story definitions
   - Pass to generation worker
   - Validate anchors present after generation

**Success Criteria**:
- ✅ Narrative anchors always placed at fixed positions
- ✅ Quest triggers placed in suitable rooms
- ✅ Procedural content blends seamlessly with fixed content
- ✅ Regeneration preserves anchors
- ✅ Tests validate anchor placement and blending

---

### Phase 7: Room Templates & Content (Est: 2-3 hours)

**Files Created**:
```
src/game/data/roomTemplates/detective_office.json
src/game/data/roomTemplates/crime_scene_*.json (3 variants)
src/game/data/roomTemplates/apartment_*.json (5 variants)
src/game/data/roomTemplates/alley_*.json (3 variants)
src/game/data/roomTemplates/evidence_storage.json
src/game/procedural/RoomTemplateLibrary.js    (200 lines)
```

**Tasks**:
1. Create room template JSON files
   - Detective office (narrative anchor)
   - Crime scenes (3 variants: indoor, outdoor, vehicle)
   - Apartments (5 variants: studio, 1BR, 2BR, loft, penthouse)
   - Alleys (3 variants: narrow, wide, dead-end)
   - Evidence storage (police precinct, warehouse)

2. Implement RoomTemplateLibrary
   - Load templates from JSON
   - Group templates by type
   - Random selection from group
   - Template validation (doors, interaction points)
   - Caching for performance

3. Asset requests
   - Log tile sprite requests in assets/images/requests.json
   - Log door/furniture sprite requests

**Success Criteria**:
- ✅ 15+ room templates created
- ✅ Templates load from JSON correctly
- ✅ All templates have valid doors and interaction points
- ✅ Templates grouped by type for selection
- ✅ Asset requests logged for art creation

---

### Phase 8: Testing & Polish (Est: 2-3 hours)

**Tasks**:
1. Integration testing
   - Full generation cycle (worker → spawning → gameplay)
   - Save/load with procedural districts
   - Regeneration with same seed produces identical result
   - Multiple cases in same district

2. Performance profiling
   - Measure generation time breakdown (layout, case, population)
   - Optimize bottlenecks (if any exceed budget)
   - Profile memory usage (ensure no leaks)
   - Verify 60 FPS maintained during gameplay

3. Balance tuning
   - Adjust case difficulty parameters
   - Tune red herring counts
   - Balance district sizes
   - Test solvability with playtesting

4. Documentation
   - Update CHANGELOG.md
   - Document generation API
   - Write usage examples
   - Update architecture docs

**Success Criteria**:
- ✅ Integration tests pass
- ✅ Performance budgets met (<115ms total generation)
- ✅ Save/load works correctly
- ✅ Determinism verified (same seed = same result)
- ✅ Documentation complete
- ✅ >80% test coverage for procedural systems

---

## File Changes

### New Files (Core Abstractions)

```
src/engine/procedural/
  SeededRandom.js              # Mulberry32 RNG utility
  LayoutGraph.js               # District graph structure
  RoomTemplate.js              # Room layout definitions
  RoomInstance.js              # Placed room instances

tests/engine/procedural/
  SeededRandom.test.js         # RNG tests (determinism, distribution)
  LayoutGraph.test.js          # Graph tests (connectivity, serialization)
  RoomTemplate.test.js         # Template tests (loading, rotation)
```

### New Files (Generation Systems)

```
src/game/procedural/
  BSPGenerator.js              # Binary space partitioning
  DistrictGenerator.js         # High-level district generation
  CaseGenerator.js             # Murder case generation
  EvidenceGraph.js             # Evidence dependency tracking
  EntityPopulator.js           # Entity spawn data creation
  TileMap.js                   # Tile storage and queries
  NarrativeAnchorManager.js    # Fixed story location management
  QuestTriggerPlacer.js        # Quest objective placement
  RoomTemplateLibrary.js       # Template loading and caching
  generation-worker.js         # Web Worker generation script
  WorkerCoordinator.js         # Main thread worker interface

tests/game/procedural/
  BSPGenerator.test.js
  DistrictGenerator.test.js
  CaseGenerator.test.js
  EvidenceGraph.test.js
  EntityPopulator.test.js
  TileMap.test.js
  WorkerCoordinator.test.js
```

### New Files (ECS Systems)

```
src/game/systems/
  LevelSpawnSystem.js          # Spawns entities from generation data
  GenerationValidationSystem.js # Quality validation

tests/game/systems/
  LevelSpawnSystem.test.js
  GenerationValidationSystem.test.js
```

### New Files (Room Templates)

```
src/game/data/roomTemplates/
  detective_office.json        # Fixed narrative anchor
  crime_scene_indoor_1.json    # Indoor murder scene
  crime_scene_indoor_2.json    # Indoor murder scene (variant)
  crime_scene_outdoor.json     # Outdoor murder scene
  apartment_studio.json        # Studio apartment
  apartment_1br.json           # 1-bedroom apartment
  apartment_2br.json           # 2-bedroom apartment
  apartment_loft.json          # Loft apartment
  apartment_penthouse.json     # Penthouse apartment
  alley_narrow.json            # Narrow alley
  alley_wide.json              # Wide alley
  alley_dead_end.json          # Dead-end alley
  evidence_storage_police.json # Police evidence room
  evidence_storage_warehouse.json # Warehouse storage
```

### New Files (Case Data)

```
src/game/data/
  caseTemplates.js             # Murder case templates
  motiveDefinitions.js         # Motive types and descriptions
  methodDefinitions.js         # Murder methods and evidence
```

### Modified Files

```
src/game/Game.js
  - Add LevelSpawnSystem to game systems
  - Add WorkerCoordinator initialization
  - Add loadLevel(seed, config) method
  - Integrate with loading screen

src/game/systems/InvestigationSystem.js
  - Add registerCase(caseData) method
  - Listen to level:loaded event
  - Populate evidence board from case

src/game/systems/FactionReputationSystem.js
  - Listen to level:loaded event
  - Set district control from generation data

src/game/systems/NPCMemorySystem.js
  - Listen to level:loaded event
  - Initialize NPC knowledge from case data

src/game/managers/FactionManager.js
  - Add setDistrictControl(districtId, factionId) method

src/engine/physics/SpatialHash.js
  - Ensure compatible with entity spawning
  - Add bulkInsert(entities) for efficiency
```

---

## Interface Definitions

### TileMap Interface

```javascript
class TileMap {
  constructor(width: number, height: number);

  // Tile operations
  getTile(x: number, y: number): TileType;
  setTile(x: number, y: number, type: TileType): void;

  // Queries
  isWalkable(x: number, y: number): boolean;
  getNeighbors(x: number, y: number): {x: number, y: number}[];

  // Algorithms
  floodFill(startX: number, startY: number, targetType: TileType, replaceType: TileType): number;
  findWalkableTiles(): {x: number, y: number}[];

  // Serialization
  serialize(): object;
  static deserialize(data: object): TileMap;

  // Storage
  tiles: Uint8Array;               // Flat array: index = y * width + x
  width: number;
  height: number;

  enum TileType {
    EMPTY = 0,
    FLOOR = 1,
    WALL = 2,
    DOOR = 3,
    WINDOW = 4,
    FURNITURE = 5,
    CONTAINER = 6
  }
}
```

### DistrictGenerator Interface

```javascript
class DistrictGenerator {
  constructor(seed: number);

  generate(narrativeAnchors: NarrativeAnchorDef[]): DistrictLayout;

  config: {
    width: number;               // Default: 100 tiles
    height: number;              // Default: 80 tiles
    roomCount: number;           // Default: 30-50
    minRoomSize: number;         // Default: 8 tiles
    maxRoomSize: number;         // Default: 20 tiles
    shortcutProbability: number; // Default: 0.3 (30% chance per room pair)
    bspDepth: number;            // Default: 4 levels
  };
}

interface DistrictLayout {
  graph: LayoutGraph;
  rooms: RoomInstance[];
  tilemap: TileMap;
  navigationMesh: NavigationMesh;
  metadata: {
    seed: number;
    roomCount: number;
    shortcutCount: number;
    generationTime: number;
  };
}

interface NarrativeAnchorDef {
  id: string;
  templateId: string;
  position: {x: number, y: number};
  storyBeat: string;
  locked: boolean;               // If true, never regenerate
}
```

### EntityPopulator Interface

```javascript
class EntityPopulator {
  constructor(seed: number);

  populate(
    district: DistrictLayout,
    caseData: CaseData,
    config: PopulationConfig
  ): EntitySpawnData[];

  // Spawning stages
  private spawnWitnesses(caseData: CaseData, district: DistrictLayout): NPCSpawnData[];
  private spawnSuspects(caseData: CaseData, district: DistrictLayout): NPCSpawnData[];
  private spawnEnemies(district: DistrictLayout, factionStandings: Map): EnemySpawnData[];
  private spawnEvidence(caseData: CaseData, district: DistrictLayout): EvidenceSpawnData[];
  private spawnInteractables(district: DistrictLayout): InteractableSpawnData[];
}

interface PopulationConfig {
  npcDensity: number;            // NPCs per room (0.5 - 3.0)
  enemyDensity: number;          // Enemies per hostile district (0.2 - 1.0)
  evidencePlacement: 'sparse' | 'normal' | 'dense';
  backgroundNPCs: boolean;       // Add non-case NPCs
}

interface EntitySpawnData {
  type: 'npc' | 'evidence' | 'enemy' | 'interactable';
  position: {x: number, y: number};
  components: ComponentData[];
  metadata: object;
}
```

---

## Performance Considerations

### Memory Usage

| System | Size | Optimization |
|--------|------|--------------|
| TileMap (100×100) | 10KB | Uint8Array (1 byte per tile) |
| LayoutGraph (50 nodes) | 24KB | Sparse representation |
| RoomTemplates (15 cached) | 180KB | Lazy loading, only active templates |
| EntitySpawnData (200) | 80KB | Lightweight serialization |
| Navigation Mesh | 15KB | Adjacency list, not full graph |
| **Total** | **~310KB** | **Well within budget** |

### CPU Budgets (60 FPS = 16.67ms per frame)

**Generation (Web Worker - 0ms main thread impact)**:
| Stage | Target | Strategy |
|-------|--------|----------|
| District Layout | <50ms | Graph placement + BSP is O(n log n) |
| Case Generation | <30ms | Linear evidence placement |
| Entity Population | <15ms | Simple iteration over rooms |
| Validation | <10ms | BFS connectivity check |
| Serialization | <10ms | JSON.stringify with optimized objects |
| **Total** | **<115ms** | **Acceptable for loading screen** |

**Main Thread (per frame)**:
| System | Budget | Optimization |
|--------|--------|--------------|
| LevelSpawnSystem | 2ms | Only runs once at level load |
| Spatial Hash Updates | 0.5ms | O(1) insertion, updates only moved entities |
| TileMap Queries | 0.2ms | O(1) tile access via flat array |
| Navigation Queries | 0.3ms | Pre-computed adjacency list |
| **Total Overhead** | **<3ms** | **18% of frame budget, acceptable** |

### Optimization Strategies

**1. Object Pooling for Generation**:
```javascript
class GeneratorPool {
  gridPool: Array[];
  nodePool: GraphNode[];

  acquireGrid(width, height): Uint8Array;
  releaseGrid(grid: Uint8Array): void;
}
```
- Pre-allocate Uint8Arrays for tile grids
- Reuse graph nodes across generations
- Reduces GC pauses by 40-60%

**2. Incremental Loading**:
```javascript
// Load room templates on-demand
class RoomTemplateLibrary {
  cache: Map<string, RoomTemplate>;

  getTemplate(id: string): RoomTemplate {
    if (!this.cache.has(id)) {
      this.cache.set(id, this.loadTemplate(id));
    }
    return this.cache.get(id);
  }
}
```

**3. Spatial Hash Grid for Entity Spawning**:
```javascript
// O(1) insertion, O(k) query where k = nearby entities
class SpatialHashGrid {
  cellSize: number = 64;           // 64 pixels per cell

  insert(entity, x, y): void;      // <0.01ms
  queryRadius(x, y, radius): Entity[]; // <0.2ms for typical radius
}
```

**4. Web Worker Message Optimization**:
```javascript
// Use Transferable objects for large data
worker.postMessage({
  result: generationResult
}, [tilemap.buffer]); // Transfer ArrayBuffer ownership, zero-copy
```

**5. Lazy Room Detail Loading**:
```javascript
// Only generate detailed tile data for rooms near player
class LazyRoomLoader {
  loadRadius: number = 2;          // Load rooms within 2 connections

  updateLoadedRooms(playerRoom: RoomInstance): void;
  loadRoomDetails(room: RoomInstance): void;
  unloadRoomDetails(roomId: string): void;
}
```

---

## Testing Strategy

### Unit Tests (Target: >80% coverage)

**SeededRandom Tests**:
- Determinism: Same seed produces identical sequence across 1000 calls
- Distribution: Chi-square test for uniformity (p-value > 0.05)
- Edge cases: seed=0, seed=MAX_INT, negative seeds
- Performance: >50M random() calls per second

**LayoutGraph Tests**:
- Node/edge addition and removal
- Topological sort produces valid ordering
- Connectivity: BFS finds all nodes from start
- Serialization: Roundtrip preserves data
- Edge cases: Empty graph, single node, cyclic dependencies

**BSPGenerator Tests**:
- Tree construction: All nodes have valid bounds
- Room creation: Rooms fit within containers
- Corridor connectivity: All rooms connected
- Minimum size: No rooms smaller than threshold
- Performance: <15ms for 20-50 rooms

**EvidenceGraph Tests**:
- Solvability: Valid cases pass, invalid cases fail
- Dependencies: Evidence locked until prereqs met
- Multiple paths: Branching solutions work
- Red herrings: Don't block main path
- Performance: <5ms validation for 50 nodes

**CaseGenerator Tests**:
- Victim selection: Valid from NPC pool
- Killer selection: Has relationship with victim
- Motive assignment: Consistent with relationship
- Solvability: 100% of generated cases solvable
- Performance: <30ms per case

### Integration Tests

**Full Generation Cycle**:
```javascript
test('generates complete district with solvable case', async () => {
  const coordinator = new WorkerCoordinator();
  const result = await coordinator.generate({
    seed: 12345,
    difficulty: 'medium',
    narrativeAnchors: testAnchors,
    activeQuests: testQuests
  });

  expect(result.success).toBe(true);
  expect(result.districtLayout.rooms.length).toBeGreaterThan(20);
  expect(result.caseData.evidenceGraph.validateSolvability()).toBe(true);
  expect(result.entities.length).toBeGreaterThan(50);
});
```

**Spawning Integration**:
```javascript
test('spawns all entities from generation result', () => {
  const spawnSystem = new LevelSpawnSystem(registry, eventBus, entityManager, spatialHash);
  spawnSystem.spawnFromGeneration(generationResult);

  const npcCount = entityManager.getEntitiesWithComponent('NPC').length;
  const evidenceCount = entityManager.getEntitiesWithComponent('Evidence').length;

  expect(npcCount).toBe(generationResult.entities.filter(e => e.type === 'npc').length);
  expect(evidenceCount).toBe(generationResult.entities.filter(e => e.type === 'evidence').length);
});
```

**System Integration**:
```javascript
test('existing systems respond to level:loaded event', () => {
  const investigationSpy = jest.spyOn(investigationSystem, 'registerCase');
  const factionSpy = jest.spyOn(factionSystem, 'setDistrictControl');

  eventBus.emit('level:loaded', { caseData, districtLayout });

  expect(investigationSpy).toHaveBeenCalledWith(caseData);
  expect(factionSpy).toHaveBeenCalled();
});
```

### Performance Tests

**Generation Timing**:
```javascript
test('district generation completes within budget', async () => {
  const start = performance.now();
  const result = await generateDistrict(seed);
  const elapsed = performance.now() - start;

  expect(elapsed).toBeLessThan(115); // 115ms budget
  expect(result.metadata.generationTime).toBeLessThan(100);
});
```

**Memory Profiling**:
```javascript
test('no memory leaks after multiple generations', async () => {
  const initialMemory = performance.memory.usedJSHeapSize;

  for (let i = 0; i < 10; i++) {
    await generateDistrict(i);
    // Force GC if available
    if (global.gc) global.gc();
  }

  const finalMemory = performance.memory.usedJSHeapSize;
  const growth = finalMemory - initialMemory;

  expect(growth).toBeLessThan(5 * 1024 * 1024); // <5MB growth after 10 generations
});
```

**Determinism Test**:
```javascript
test('same seed produces identical districts', async () => {
  const seed = 42;
  const result1 = await generateDistrict(seed);
  const result2 = await generateDistrict(seed);

  expect(result1.districtLayout.serialize()).toEqual(result2.districtLayout.serialize());
  expect(result1.caseData.serialize()).toEqual(result2.caseData.serialize());
});
```

---

## Rollout Plan

### Week 1: Foundation & District Generation

**Days 1-2**: Core abstractions (3-4 hours)
- Implement SeededRandom, LayoutGraph, RoomTemplate
- Write unit tests
- **Deliverable**: Functional RNG and graph structures

**Days 3-4**: District generation (4-5 hours)
- Implement BSPGenerator, DistrictGenerator, TileMap
- Write unit tests
- **Deliverable**: Districts generated successfully

**Day 5**: Testing and integration
- Integration tests for district generation
- Performance profiling
- **Milestone**: M4-001 COMPLETE

### Week 2: Case Generation & Worker Integration

**Days 6-7**: Case generation (3-4 hours)
- Implement EvidenceGraph, CaseGenerator
- Write case templates
- Write unit tests
- **Deliverable**: Solvable cases generated

**Days 8-9**: Web Worker (2-3 hours)
- Implement generation-worker.js, WorkerCoordinator
- Integration with Game.js
- **Deliverable**: Background generation working
- **Milestone**: M4-002 COMPLETE

**Day 10**: Testing and integration
- Worker integration tests
- Verify 0ms main thread impact

### Week 3: ECS Integration & Narrative

**Days 11-12**: ECS spawning (3-4 hours)
- Implement EntityPopulator, LevelSpawnSystem
- Implement GenerationValidationSystem
- Write unit tests
- **Deliverable**: Entities spawn from generation data

**Days 13-14**: Narrative integration (2-3 hours)
- Implement NarrativeAnchorManager, QuestTriggerPlacer
- Integrate with existing systems
- **Deliverable**: Narrative anchors and quest triggers working
- **Milestone**: M4-003 COMPLETE

**Day 15**: Validation testing
- Solvability tests
- Connectivity tests
- Performance validation
- **Milestone**: M4-004 COMPLETE

### Week 4: Content & Polish

**Days 16-17**: Room templates (2-3 hours)
- Create 15+ room template JSON files
- Implement RoomTemplateLibrary
- **Deliverable**: Template library functional

**Days 18-19**: Testing & polish (2-3 hours)
- Integration tests
- Performance profiling
- Balance tuning
- Bug fixes

**Day 20**: Documentation & release
- Update CHANGELOG.md
- Write API documentation
- Create usage examples
- **Milestone**: M4-005 COMPLETE
- **Sprint 4: 100% COMPLETE**

---

## Risk Assessment

### Risk 1: Case Solvability Validation False Negatives

**Description**: Evidence graph validation might incorrectly mark solvable cases as unsolvable due to complex dependency chains.

**Likelihood**: Medium
**Impact**: High (blocks gameplay, forces regeneration)

**Mitigation**:
- Comprehensive unit tests with known-solvable cases
- Log evidence dependency chains for debugging
- Fallback to simpler case templates if validation fails repeatedly
- Manual playtest every case template

**Contingency**: If validation proves unreliable, simplify evidence graphs to 2-3 dependency levels max.

---

### Risk 2: Web Worker Message Passing Overhead

**Description**: Serializing large generation results might exceed time budget or cause main thread stutter.

**Likelihood**: Low
**Impact**: Medium (delays loading, frame drops)

**Mitigation**:
- Use Transferable objects (ArrayBuffer transfer) for large data
- Benchmark message passing with realistic data sizes
- Implement chunked transfer if needed (send in pieces)
- Profile with Chrome DevTools Worker timeline

**Contingency**: Fall back to main thread generation with incremental yielding if worker overhead too high.

---

### Risk 3: Narrative Anchor Placement Conflicts

**Description**: Fixed narrative anchors might conflict with procedural room placement, causing overlaps or blocking paths.

**Likelihood**: Medium
**Impact**: High (breaks narrative flow, unplayable districts)

**Mitigation**:
- Validate anchor positions during graph construction
- Reserve space around anchors (minimum 2-tile buffer)
- Prioritize anchor placement before procedural rooms
- Automatic repositioning if conflicts detected

**Contingency**: Reduce number of narrative anchors, or make anchors smaller to fit more easily.

---

### Risk 4: Performance Degradation on Lower-End Hardware

**Description**: Generation might exceed time budget on slower devices, causing long load times or frame drops.

**Likelihood**: Medium
**Impact**: Medium (poor UX, but not blocking)

**Mitigation**:
- Target mid-range hardware (Intel i5, 16GB RAM) for testing
- Profile on lower-end devices (Intel i3, 8GB RAM)
- Implement quality presets (reduce room count on slower hardware)
- Show generation progress bar so users know it's working

**Contingency**: Add "Generate District" button with warning if hardware slow, or cache pre-generated districts.

---

### Risk 5: Test Coverage Falls Below 80% Target

**Description**: Procedural systems are complex; achieving 80% coverage might require more testing time than estimated.

**Likelihood**: Medium
**Impact**: Low (doesn't block functionality, but reduces confidence)

**Mitigation**:
- Write tests alongside implementation (TDD approach)
- Focus on critical paths first (solvability, connectivity)
- Use integration tests to cover multiple components at once
- Allocate extra time in Phase 8 for test writing

**Contingency**: Accept 70% coverage for Sprint 4, improve in Sprint 5 during stabilization.

---

## Success Metrics

### Functional Requirements

| Metric | Target | Validation Method |
|--------|--------|-------------------|
| Case Solvability | 100% | Unit test with 100 generated cases |
| District Connectivity | 100% | BFS validation on all districts |
| Narrative Anchor Placement | 100% | Integration test with fixed anchors |
| Determinism | 100% | Same seed produces identical result 10/10 times |
| Save/Load Compatibility | 100% | Districts persist and reload correctly |

### Performance Requirements

| Metric | Target | Validation Method |
|--------|--------|-------------------|
| Generation Time | <115ms | Performance.now() measurement |
| Main Thread Impact | 0ms during generation | Chrome DevTools timeline |
| Spawning Time | <10ms for 200 entities | Performance profiling |
| Memory Usage | <5MB growth per generation | Heap snapshots |
| Frame Rate | 60 FPS maintained | Frame time monitoring |

### Quality Requirements

| Metric | Target | Validation Method |
|--------|--------|-------------------|
| Test Coverage | >80% | Jest coverage report |
| Integration Tests | 20+ passing | Test suite execution |
| Code Quality | 0 ESLint errors | Linter output |
| Documentation | 100% public APIs documented | JSDoc coverage |
| Balance | Cases completable in 10-20 minutes | Playtest sessions |

### User Experience Requirements

| Metric | Target | Validation Method |
|--------|--------|-------------------|
| Loading Screen | Progress bar updates smoothly | Visual inspection |
| Variety | No identical districts in 10 playthroughs | Seed variation test |
| Narrative Coherence | Story anchors feel integrated | Playtest feedback |
| Fairness | No unwinnable cases | Solvability validation |
| Replayability | Different cases each playthrough | Case variation test |

---

## Architecture Decision Record (ADR) Summary

### ADR 4-1: Graph-Based District Layout

**Decision**: Use graph-based room placement with BSP subdivision for interiors, rather than pure BSP or cellular automata.

**Rationale**:
- Graph structure naturally supports metroidvania connectivity (explicit loops, shortcuts)
- Semantic room types enable narrative integration (crime scenes, evidence storage)
- BSP subdivision for large buildings provides structured interiors
- Cellular automata too unpredictable for detective gameplay

**Alternatives Considered**:
- Pure BSP: Too rigid, doesn't support loops well
- Pure cellular automata: Too organic, hard to guarantee connectivity
- Wave Function Collapse: Too complex, no semantic meaning

**Implications**:
- Requires room template library (10-20 templates per type)
- Graph validation needed to ensure connectivity
- Slightly slower than pure BSP (~50ms vs ~15ms) but still within budget

---

### ADR 4-2: Reverse Case Construction

**Decision**: Generate the solution first (victim, killer, motive, method), then build evidence graph backward.

**Rationale**:
- Guarantees solvability (all cases proven solvable by construction)
- Avoids generate-and-test (expensive, unreliable)
- Enables controlled difficulty scaling (adjust evidence chain depth)
- Supports narrative branching (multiple valid paths to solution)

**Alternatives Considered**:
- Forward construction (evidence → solution): Can produce unsolvable cases
- Template-based (pre-authored cases): Low variety, not procedural
- Constraint satisfaction: Complex to implement, no better guarantees

**Implications**:
- Evidence placement constrained by graph dependencies
- Requires NPC relationship data (victim-killer connections)
- Solvability validation still needed as sanity check

---

### ADR 4-3: Web Worker Background Generation

**Decision**: Use Web Worker for generation to maintain 60 FPS on main thread.

**Rationale**:
- Generation time ~115ms would cause 7 dropped frames (unacceptable)
- Web Workers enable true parallel execution (no frame drops)
- Message passing overhead <5ms (negligible)
- Loading screen hides generation time (good UX)

**Alternatives Considered**:
- Main thread with requestIdleCallback: Still blocks during generation
- Main thread with chunked yielding: Complex, still visible stutters
- Pre-generated districts: No procedural variety

**Implications**:
- Generator code must be worker-compatible (no DOM access)
- Result must be serializable (JSON or Transferable objects)
- Slightly more complex debugging (worker thread logs)

---

### ADR 4-4: Hybrid Fixed-Procedural Narrative Integration

**Decision**: Blend fixed narrative anchors (detective office, key story locations) with procedural content.

**Rationale**:
- Pure procedural loses narrative coherence
- Pure fixed lacks replayability
- Hybrid approach gets best of both worlds
- Supports selective regeneration (keep anchors, regenerate rest)

**Alternatives Considered**:
- Pure procedural: Story feels disjointed, hard to author
- Pure fixed: No variety, defeats purpose of proc-gen
- Narrative-aware proc-gen (tags only): Not strong enough guarantee

**Implications**:
- Story system must define narrative anchors
- Graph placement must reserve space for anchors
- Regeneration must preserve anchor positions

---

### ADR 4-5: Mulberry32 Seeded RNG

**Decision**: Use Mulberry32 algorithm for deterministic random number generation.

**Rationale**:
- Excellent performance (95M ops/sec, 5x faster than alternatives)
- Good randomness quality (passes statistical tests)
- Small state size (32-bit, easy to serialize)
- Simple implementation (10 lines of code)

**Alternatives Considered**:
- Math.random(): Not seedable, can't reproduce results
- SplitMix32: Slightly better quality, but slower (85M ops/sec)
- SFC32: Best quality, but slower (80M ops/sec) and 128-bit state

**Implications**:
- Same seed always produces identical districts (required for multiplayer, debugging)
- RNG state must be saved with game save
- Multiple systems need separate RNG instances (avoid coupling)

---

## Conclusion

This architecture plan defines a complete procedural generation system for The Memory Syndicate detective metroidvania, balancing:

✅ **Performance** - <115ms generation time, 0ms main thread impact
✅ **Solvability** - 100% of cases guaranteed solvable by construction
✅ **Narrative Coherence** - Fixed story anchors blend with procedural variety
✅ **Metroidvania Connectivity** - Graph structure ensures loops and shortcuts
✅ **Replayability** - Seeded variation produces different cases and layouts
✅ **Maintainability** - Clean separation of concerns, comprehensive tests

**Implementation Estimate**: 12-14 hours across 3 weeks
**Deliverables**: 4 milestones (M4-001 through M4-004)
**Test Target**: >80% coverage for all procedural systems
**Risk Level**: Medium (well-researched approach, proven algorithms)

**Next Steps**:
1. Review and approve architecture plan
2. Assign implementation to appropriate agents (engine-dev, gameplay-dev)
3. Begin Phase 1 (Core Abstractions) immediately
4. Daily check-ins to track progress and resolve blockers

---

**End of Architecture Plan**

**Document**: `docs/plans/sprint-4-architecture.md`
**Created**: 2025-10-27
**Architect**: Senior Systems Architect
**Status**: Ready for Implementation
