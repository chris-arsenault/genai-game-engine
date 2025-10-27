# Procedural Generation API Reference

**Sprint 4 - The Memory Syndicate**
**Version**: 1.0
**Date**: 2025-10-27

---

## Table of Contents

1. [SeededRandom](#seededrandom)
2. [LayoutGraph](#layoutgraph)
3. [RoomTemplate & RoomInstance](#roomtemplate--roominstance)
4. [TileMap](#tilemap)
5. [BSPGenerator](#bspgenerator)
6. [DistrictGenerator](#districtgenerator)
7. [CaseGenerator](#casegenerator)
8. [EvidenceGraph](#evidencegraph)
9. [EntityPopulator](#entitypopulator)
10. [LevelSpawnSystem](#levelspawnsystem)
11. [NarrativeAnchorManager](#narrativeanchormanager)

---

## SeededRandom

**File**: `src/engine/procedural/SeededRandom.js`

Deterministic pseudo-random number generator using Mulberry32 algorithm.

### Constructor

```javascript
new SeededRandom(seed: number): SeededRandom
```

**Parameters**:
- `seed` (number): Initial seed value (converted to 32-bit unsigned integer)

**Example**:
```javascript
const rng = new SeededRandom(12345);
```

---

### Methods

#### `next(): number`

Generates the next random number in the sequence.

**Returns**: Random number in range `[0, 1)` (inclusive 0, exclusive 1)

**Example**:
```javascript
const value = rng.next(); // 0.7234123
```

---

#### `nextInt(min: number, max: number): number`

Generates a random integer in the range `[min, max]` (both inclusive).

**Parameters**:
- `min` (number): Minimum value (inclusive)
- `max` (number): Maximum value (inclusive)

**Returns**: Random integer in range `[min, max]`

**Throws**: Error if `min > max`

**Example**:
```javascript
const roll = rng.nextInt(1, 6); // 1, 2, 3, 4, 5, or 6
```

---

#### `nextFloat(min: number, max: number): number`

Generates a random floating-point number in the range `[min, max)` (min inclusive, max exclusive).

**Parameters**:
- `min` (number): Minimum value (inclusive)
- `max` (number): Maximum value (exclusive)

**Returns**: Random float in range `[min, max)`

**Throws**: Error if `min > max`

**Example**:
```javascript
const temperature = rng.nextFloat(-10, 40); // -5.234, 23.891, etc.
```

---

#### `nextBool(chance: number = 0.5): boolean`

Generates a random boolean with the given probability of being `true`.

**Parameters**:
- `chance` (number, optional): Probability of returning `true` (0.0 to 1.0). Default: `0.5`

**Returns**: Random boolean

**Throws**: Error if `chance` not in range `[0, 1]`

**Example**:
```javascript
const coinFlip = rng.nextBool();        // 50% true, 50% false
const biasedCoin = rng.nextBool(0.7);   // 70% true, 30% false
```

---

#### `choice<T>(array: T[]): T`

Selects a random element from an array.

**Parameters**:
- `array` (T[]): Array to choose from

**Returns**: Random element from array

**Throws**: Error if array is empty

**Example**:
```javascript
const items = ['apple', 'banana', 'cherry'];
const fruit = rng.choice(items); // 'banana'
```

---

#### `shuffle<T>(array: T[]): T[]`

Shuffles an array in place using Fisher-Yates algorithm.

**Parameters**:
- `array` (T[]): Array to shuffle

**Returns**: Shuffled array (same reference as input)

**Example**:
```javascript
const deck = [1, 2, 3, 4, 5];
rng.shuffle(deck);
console.log(deck); // [3, 1, 5, 2, 4]
```

---

#### `getState(): number`

Gets the current internal state of the RNG.

**Returns**: Current state value (32-bit unsigned integer)

**Example**:
```javascript
const state = rng.getState(); // 2847563829
```

---

#### `setState(state: number): void`

Sets the internal state of the RNG.

**Parameters**:
- `state` (number): State value to restore (converted to 32-bit unsigned integer)

**Example**:
```javascript
rng.setState(2847563829);
```

---

#### `clone(): SeededRandom`

Creates a new SeededRandom instance with the same current state.

**Returns**: New RNG with identical state

**Example**:
```javascript
const rng2 = rng.clone();
rng2.next() === rng.next(); // false (different instances)
```

---

#### `serialize(): object`

Serializes the RNG state to a plain object.

**Returns**: Object with `seed` and `state` properties

**Example**:
```javascript
const data = rng.serialize(); // { seed: 12345, state: 2847563829 }
```

---

#### `static deserialize(data: object): SeededRandom`

Deserializes RNG state from a plain object.

**Parameters**:
- `data` (object): Serialized state with `seed` and `state` properties

**Returns**: New RNG with restored state

**Example**:
```javascript
const rng2 = SeededRandom.deserialize(data);
```

---

## LayoutGraph

**File**: `src/engine/procedural/LayoutGraph.js`

Graph data structure for district layout planning. Nodes represent rooms, edges represent connections.

### Constructor

```javascript
new LayoutGraph(): LayoutGraph
```

**Example**:
```javascript
const graph = new LayoutGraph();
```

---

### Methods

#### `addNode(id: string, data: object = {}): GraphNode`

Adds a node to the graph.

**Parameters**:
- `id` (string): Unique node identifier
- `data` (object, optional): Node data (type, constraints, etc.)

**Returns**: The created node

**Throws**: Error if node with this ID already exists

**Example**:
```javascript
const node = graph.addNode('detective_office', {
  type: 'detective_office',
  roomType: 'detective_office',
});
```

---

#### `addEdge(from: string, to: string, data: object = {}): void`

Adds a directed edge from one node to another.

**Parameters**:
- `from` (string): Source node ID
- `to` (string): Target node ID
- `data` (object, optional): Edge data (doorType, required, etc.)

**Throws**: Error if either node doesn't exist

**Example**:
```javascript
graph.addEdge('detective_office', 'crime_scene', {
  doorType: 'main',
});
```

---

#### `removeNode(id: string): boolean`

Removes a node and all its edges from the graph.

**Parameters**:
- `id` (string): Node ID to remove

**Returns**: `true` if node was removed, `false` if it didn't exist

**Example**:
```javascript
const removed = graph.removeNode('unused_room'); // true
```

---

#### `removeEdge(from: string, to: string): boolean`

Removes an edge between two nodes.

**Parameters**:
- `from` (string): Source node ID
- `to` (string): Target node ID

**Returns**: `true` if edge was removed, `false` if it didn't exist

**Example**:
```javascript
const removed = graph.removeEdge('room1', 'room2'); // true
```

---

#### `getNode(id: string): GraphNode | undefined`

Gets a node by ID.

**Parameters**:
- `id` (string): Node ID

**Returns**: The node, or `undefined` if not found

**Example**:
```javascript
const node = graph.getNode('detective_office');
console.log(node.type); // 'detective_office'
```

---

#### `getEdges(id: string): GraphEdge[]`

Gets all edges from a node.

**Parameters**:
- `id` (string): Node ID

**Returns**: Array of edges (empty if node doesn't exist)

**Example**:
```javascript
const edges = graph.getEdges('detective_office');
console.log(edges.length); // 3
```

---

#### `getNeighbors(id: string): string[]`

Gets all neighbor node IDs for a given node.

**Parameters**:
- `id` (string): Node ID

**Returns**: Array of neighbor node IDs

**Example**:
```javascript
const neighbors = graph.getNeighbors('detective_office');
// ['crime_scene', 'apartment_1', 'street_1']
```

---

#### `hasPath(from: string, to: string): boolean`

Checks if there is a path from one node to another using BFS.

**Parameters**:
- `from` (string): Source node ID
- `to` (string): Target node ID

**Returns**: `true` if a path exists

**Example**:
```javascript
const connected = graph.hasPath('detective_office', 'crime_scene'); // true
```

---

#### `getShortestPath(from: string, to: string): string[] | null`

Finds the shortest path from one node to another using BFS.

**Parameters**:
- `from` (string): Source node ID
- `to` (string): Target node ID

**Returns**: Array of node IDs representing the path, or `null` if no path exists

**Example**:
```javascript
const path = graph.getShortestPath('detective_office', 'crime_scene');
// ['detective_office', 'street_1', 'crime_scene']
```

---

#### `getAllPaths(from: string, to: string, maxPaths: number = 100): string[][]`

Finds all paths from one node to another using DFS.

**Parameters**:
- `from` (string): Source node ID
- `to` (string): Target node ID
- `maxPaths` (number, optional): Maximum number of paths to find. Default: `100`

**Returns**: Array of paths (each path is an array of node IDs)

**Example**:
```javascript
const paths = graph.getAllPaths('detective_office', 'crime_scene', 10);
console.log(paths.length); // 3
```

---

#### `isFullyConnected(startNode?: string): boolean`

Checks if the graph is fully connected (all nodes reachable from any starting node).

**Parameters**:
- `startNode` (string, optional): Node to start from (defaults to first node)

**Returns**: `true` if all nodes are reachable from the start node

**Example**:
```javascript
const connected = graph.isFullyConnected(); // true
```

---

#### `getReachableNodes(startNode: string): Set<string>`

Gets all nodes that are reachable from a given node.

**Parameters**:
- `startNode` (string): Node to start from

**Returns**: Set of reachable node IDs

**Example**:
```javascript
const reachable = graph.getReachableNodes('detective_office');
console.log(reachable.size); // 50
```

---

#### `getNodesByType(type: string): GraphNode[]`

Gets nodes by type.

**Parameters**:
- `type` (string): Node type to filter by

**Returns**: Array of nodes with matching type

**Example**:
```javascript
const offices = graph.getNodesByType('office');
console.log(offices.length); // 10
```

---

#### `getNodeCount(): number`

Gets the total number of nodes in the graph.

**Returns**: Node count

**Example**:
```javascript
const count = graph.getNodeCount(); // 50
```

---

#### `getEdgeCount(): number`

Gets the total number of edges in the graph.

**Returns**: Edge count

**Example**:
```javascript
const count = graph.getEdgeCount(); // 75
```

---

#### `serialize(): object`

Serializes the graph to a plain object.

**Returns**: Serialized graph data with `nodes` and `edges` arrays

**Example**:
```javascript
const data = graph.serialize();
localStorage.setItem('district_graph', JSON.stringify(data));
```

---

#### `static deserialize(data: object): LayoutGraph`

Deserializes a graph from a plain object.

**Parameters**:
- `data` (object): Serialized graph data

**Returns**: New graph instance

**Example**:
```javascript
const data = JSON.parse(localStorage.getItem('district_graph'));
const graph = LayoutGraph.deserialize(data);
```

---

#### `clear(): void`

Clears all nodes and edges from the graph.

**Example**:
```javascript
graph.clear();
console.log(graph.getNodeCount()); // 0
```

---

### Types

#### GraphNode

```typescript
interface GraphNode {
  id: string;              // Unique node identifier
  type: string;            // Node type (e.g., 'crime_scene', 'apartment')
  data: object;            // Node-specific data
}
```

#### GraphEdge

```typescript
interface GraphEdge {
  from: string;            // Source node ID
  to: string;              // Target node ID
  data: object;            // Edge-specific data
}
```

---

## RoomTemplate & RoomInstance

**File**: `src/engine/procedural/RoomTemplate.js`, `src/engine/procedural/RoomInstance.js`

Reusable room layouts and placed room instances.

### RoomTemplate Constructor

```javascript
new RoomTemplate(config: object): RoomTemplate
```

**Parameters**:
- `config` (object): Room configuration
  - `id` (string): Unique template identifier
  - `type` (string): Room type
  - `width` (number): Room width in tiles
  - `height` (number): Room height in tiles
  - `tiles` (number[][]): 2D array of tile types
  - `doors` (DoorDefinition[]): Door positions
  - `interactionPoints` (InteractionPoint[]): Interaction positions
  - `metadata` (object, optional): Additional metadata

**Example**:
```javascript
const template = new RoomTemplate({
  id: 'apartment_1br',
  type: 'apartment',
  width: 15,
  height: 12,
  tiles: [/* 2D array */],
  doors: [
    { id: 'main', x: 7, y: 0, direction: 'north', type: 'main' }
  ],
  interactionPoints: [
    { id: 'bed', x: 3, y: 3, type: 'npc_spawn' }
  ],
});
```

---

### RoomInstance Constructor

```javascript
new RoomInstance(config: object): RoomInstance
```

**Parameters**:
- `config` (object): Room instance configuration
  - `id` (string): Unique instance identifier
  - `templateId` (string): Template ID this instance uses
  - `x` (number): World X position
  - `y` (number): World Y position
  - `rotation` (number): Rotation in degrees (0, 90, 180, 270)

**Example**:
```javascript
const instance = new RoomInstance({
  id: 'apartment_1',
  templateId: 'apartment_1br',
  x: 50,
  y: 60,
  rotation: 0,
});
```

---

### Types

#### DoorDefinition

```typescript
interface DoorDefinition {
  id: string;              // Door identifier
  x: number;               // Local X position in room
  y: number;               // Local Y position in room
  direction: 'north' | 'south' | 'east' | 'west';
  type: 'main' | 'locked' | 'hidden';
  keyRequired?: string;    // Key ID if locked
}
```

#### InteractionPoint

```typescript
interface InteractionPoint {
  id: string;              // Interaction identifier
  x: number;               // Local X position in room
  y: number;               // Local Y position in room
  type: 'evidence_spawn' | 'npc_spawn' | 'quest_trigger' | 'container';
  metadata?: object;       // Additional data
}
```

#### TileType

```typescript
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

---

## TileMap

**File**: `src/game/procedural/TileMap.js`

Efficient tile storage and queries using Uint8Array.

### Constructor

```javascript
new TileMap(width: number, height: number): TileMap
```

**Parameters**:
- `width` (number): Map width in tiles
- `height` (number): Map height in tiles

**Example**:
```javascript
const tilemap = new TileMap(100, 80);
```

---

### Methods

#### `getTile(x: number, y: number): TileType`

Gets tile type at position.

**Parameters**:
- `x` (number): X coordinate
- `y` (number): Y coordinate

**Returns**: Tile type (TileType enum value)

**Example**:
```javascript
const tile = tilemap.getTile(5, 10); // TileType.FLOOR
```

---

#### `setTile(x: number, y: number, type: TileType): void`

Sets tile type at position.

**Parameters**:
- `x` (number): X coordinate
- `y` (number): Y coordinate
- `type` (TileType): Tile type to set

**Example**:
```javascript
tilemap.setTile(5, 10, TileType.WALL);
```

---

#### `fill(type: TileType): void`

Fills entire map with tile type.

**Parameters**:
- `type` (TileType): Tile type to fill with

**Example**:
```javascript
tilemap.fill(TileType.EMPTY);
```

---

#### `fillRect(x: number, y: number, w: number, h: number, type: TileType): void`

Fills rectangular region with tile type.

**Parameters**:
- `x` (number): Rectangle X position
- `y` (number): Rectangle Y position
- `w` (number): Rectangle width
- `h` (number): Rectangle height
- `type` (TileType): Tile type to fill with

**Example**:
```javascript
tilemap.fillRect(10, 10, 20, 15, TileType.FLOOR);
```

---

#### `isWalkable(x: number, y: number): boolean`

Checks if tile is walkable.

**Parameters**:
- `x` (number): X coordinate
- `y` (number): Y coordinate

**Returns**: `true` if tile is walkable (FLOOR, DOOR)

**Example**:
```javascript
const canWalk = tilemap.isWalkable(5, 10); // true
```

---

#### `findConnectedRegions(): object[]`

Finds all connected walkable regions using flood fill.

**Returns**: Array of region objects with `tiles` array

**Example**:
```javascript
const regions = tilemap.findConnectedRegions();
console.log(regions.length); // 1 (fully connected)
```

---

## BSPGenerator

**File**: `src/game/procedural/BSPGenerator.js`

Binary Space Partitioning for building interior layouts.

### Constructor

```javascript
new BSPGenerator(config: BSPConfig = {}): BSPGenerator
```

**Parameters**:
- `config` (BSPConfig, optional): Configuration options
  - `minRoomSize` (number, optional): Minimum room dimension. Default: `8`
  - `maxRoomSize` (number, optional): Maximum room dimension. Default: `20`
  - `corridorWidth` (number, optional): Corridor width in tiles. Default: `2`
  - `marginSize` (number, optional): Space between room and container. Default: `1`
  - `splitRatio` (number[], optional): [min, max] split position ratios. Default: `[0.35, 0.65]`
  - `maxDepth` (number, optional): Maximum tree depth. Default: `5`

**Example**:
```javascript
const bsp = new BSPGenerator({
  minRoomSize: 8,
  corridorWidth: 2,
  maxDepth: 4,
});
```

---

### Methods

#### `generate(width: number, height: number, seed: number): BSPResult`

Generates a BSP layout with rooms and corridors.

**Parameters**:
- `width` (number): Total width in tiles
- `height` (number): Total height in tiles
- `seed` (number): Random seed for deterministic generation

**Returns**: Object with `tilemap`, `rooms`, `corridors`, and `tree`

**Throws**: Error if dimensions too small

**Example**:
```javascript
const result = bsp.generate(50, 40, 12345);
console.log(result.rooms.length); // 8-15 rooms
```

---

### Types

#### BSPResult

```typescript
interface BSPResult {
  tilemap: TileMap;        // Complete tilemap with rooms and corridors
  rooms: RoomData[];       // Array of room rectangles
  corridors: CorridorData[]; // Array of corridor paths
  tree: BSPNode;           // Root of BSP tree
}
```

#### RoomData

```typescript
interface RoomData {
  x: number;               // Room X position
  y: number;               // Room Y position
  w: number;               // Room width
  h: number;               // Room height
  centerX: number;         // Room center X
  centerY: number;         // Room center Y
}
```

#### CorridorData

```typescript
interface CorridorData {
  start: {x: number, y: number}; // Start position
  end: {x: number, y: number};   // End position
  width: number;                 // Corridor width
  tiles: {x: number, y: number}[]; // All corridor tiles
}
```

---

## DistrictGenerator

**File**: `src/game/procedural/DistrictGenerator.js`

High-level city district generation using graph-based room placement and BSP for interiors.

### Constructor

```javascript
new DistrictGenerator(config: object = {}): DistrictGenerator
```

**Parameters**:
- `config` (object, optional): Configuration options
  - `districtSize` (object, optional): Total district size `{ width, height }`. Default: `{ width: 200, height: 200 }`
  - `roomCounts` (object, optional): Custom room counts by type
  - `minRoomSpacing` (number, optional): Minimum spacing between rooms. Default: `3`
  - `corridorWidth` (number, optional): Width of streets/corridors. Default: `3`
  - `forceIterations` (number, optional): Iterations for force-directed layout. Default: `100`
  - `buildingMinSize` (number, optional): Minimum size for BSP buildings. Default: `12`
  - `buildingMaxSize` (number, optional): Maximum size for BSP buildings. Default: `30`

**Example**:
```javascript
const generator = new DistrictGenerator({
  districtSize: { width: 200, height: 200 },
  minRoomSpacing: 3,
  forceIterations: 100,
});
```

---

### Methods

#### `generate(seed: number, districtType: string = 'mixed'): DistrictResult`

Generates a complete district with semantic room types.

**Parameters**:
- `seed` (number): Random seed for deterministic generation
- `districtType` (string, optional): District type. Options: `'residential'`, `'commercial'`, `'industrial'`, `'mixed'`. Default: `'mixed'`

**Returns**: Object with `graph`, `rooms`, `tilemap`, and `metadata`

**Example**:
```javascript
const district = generator.generate(12345, 'mixed');
console.log(district.rooms.length); // 50-60 rooms
console.log(district.metadata.generationTime); // ~40-80ms
```

---

### Types

#### DistrictResult

```typescript
interface DistrictResult {
  graph: LayoutGraph;      // District topology
  rooms: RoomInstance[];   // Placed room instances
  tilemap: TileMap;        // Complete district tilemap
  metadata: {
    seed: number;
    districtType: string;
    generationTime: number;
    roomCount: number;
    corridorCount: number;
    validation: object;
  };
}
```

#### RoomTypes

```typescript
enum RoomTypes {
  DETECTIVE_OFFICE = 'detective_office',
  CRIME_SCENE = 'crime_scene',
  APARTMENT = 'apartment',
  OFFICE = 'office',
  STREET = 'street',
  ALLEY = 'alley',
  WAREHOUSE = 'warehouse',
  SHOP = 'shop',
  RESTAURANT = 'restaurant',
  ROOFTOP = 'rooftop',
}
```

---

## CaseGenerator

**File**: `src/game/procedural/CaseGenerator.js`

Generates murder mystery cases with guaranteed solvability using reverse construction.

### Constructor

```javascript
new CaseGenerator(config: object = {}): CaseGenerator
```

**Parameters**:
- `config` (object, optional): Configuration options
  - `difficulty` (string, optional): Case difficulty. Options: `'easy'`, `'medium'`, `'hard'`. Default: `'medium'`
  - `redHerringCount` (number, optional): Override red herring count
  - `evidenceChainLength` (number, optional): Override evidence chain length

**Example**:
```javascript
const generator = new CaseGenerator({ difficulty: 'medium' });
```

---

### Methods

#### `generate(district: object, seed: number): CaseData`

Generates a complete murder mystery case.

**Parameters**:
- `district` (object): District data from DistrictGenerator
- `seed` (number): Random seed for deterministic generation

**Returns**: Complete case with solution and evidence

**Example**:
```javascript
const caseData = generator.generate(district, 12345);
console.log(caseData.solution.victimId); // 'npc_0'
console.log(caseData.metrics.chainLength); // 5
```

---

#### `static validate(caseData: CaseData): ValidationResult`

Validates the case structure.

**Parameters**:
- `caseData` (CaseData): Case to validate

**Returns**: Validation result with `valid` boolean and `issues` array

**Example**:
```javascript
const validation = CaseGenerator.validate(caseData);
console.log(validation.valid); // true
```

---

#### `static serialize(caseData: CaseData): object`

Serializes case data.

**Parameters**:
- `caseData` (CaseData): Case to serialize

**Returns**: Serialized case

**Example**:
```javascript
const data = CaseGenerator.serialize(caseData);
localStorage.setItem('current_case', JSON.stringify(data));
```

---

#### `static deserialize(data: object): CaseData`

Deserializes case data.

**Parameters**:
- `data` (object): Serialized case

**Returns**: Reconstructed case

**Example**:
```javascript
const data = JSON.parse(localStorage.getItem('current_case'));
const caseData = CaseGenerator.deserialize(data);
```

---

### Types

#### CaseData

```typescript
interface CaseData {
  id: string;              // Case identifier
  difficulty: string;      // Difficulty level
  solution: {
    victimId: string;
    killerId: string;
    motive: string;
    method: string;
    timeline: object;
  };
  npcs: object[];          // All NPCs involved
  evidenceGraph: EvidenceGraph; // Evidence dependency graph
  evidencePlacements: object[]; // Evidence positions
  metrics: {
    evidenceCount: number;
    redHerringCount: number;
    chainLength: number;
    estimatedSolveTime: number;
    difficultyRating: string;
  };
}
```

#### MotiveType

```typescript
enum MotiveType {
  REVENGE = 'revenge',
  GREED = 'greed',
  JEALOUSY = 'jealousy',
  BLACKMAIL = 'blackmail',
  POWER = 'power',
  MADNESS = 'madness',
}
```

#### MethodType

```typescript
enum MethodType {
  STABBING = 'stabbing',
  SHOOTING = 'shooting',
  POISONING = 'poisoning',
  STRANGULATION = 'strangulation',
  BLUNT_FORCE = 'blunt_force',
  EXPLOSION = 'explosion',
}
```

---

## EvidenceGraph

**File**: `src/game/procedural/EvidenceGraph.js`

Track evidence dependencies and validate case solvability using epistemic logic.

### Constructor

```javascript
new EvidenceGraph(): EvidenceGraph
```

**Example**:
```javascript
const graph = new EvidenceGraph();
```

---

### Methods

#### `addEvidence(id: string, data: object): object`

Adds evidence node with metadata.

**Parameters**:
- `id` (string): Unique evidence identifier
- `data` (object): Evidence data
  - `type` (EvidenceType): Evidence type
  - `location` (string): Room ID where evidence is placed
  - `description` (string): Description of the evidence
  - `accessCondition` (string, optional): Condition to access
  - `isSolutionFact` (boolean, optional): True for solution facts. Default: `false`

**Returns**: The evidence node

**Throws**: Error if evidence with this ID already exists

**Example**:
```javascript
graph.addEvidence('crime_scene_body', {
  type: EvidenceType.BODY,
  location: 'crime_scene_1',
  description: 'Victim found with blunt trauma',
  isSolutionFact: false,
});
```

---

#### `addDependency(fromId: string, toId: string, metadata: object = {}): object`

Creates a directed edge: collecting fromId unlocks access to toId.

**Parameters**:
- `fromId` (string): Source evidence ID
- `toId` (string): Target evidence ID
- `metadata` (object, optional): Edge metadata
  - `revealType` (RevealType, optional): How evidence is revealed. Default: `'direct'`

**Returns**: The edge data

**Throws**: Error if either evidence doesn't exist

**Example**:
```javascript
graph.addDependency('crime_scene_body', 'autopsy_report');
```

---

#### `isSolvable(startEvidenceIds: string[]): object`

Checks if all solution facts are reachable from starting evidence.

**Parameters**:
- `startEvidenceIds` (string[]): Evidence accessible at case start

**Returns**: Object with `solvable` boolean and `unreachableFactIds` array

**Example**:
```javascript
const result = graph.isSolvable(['crime_scene_body', 'crime_scene_observation']);
console.log(result.solvable); // true
console.log(result.unreachableFactIds); // []
```

---

#### `getSolutionPath(startEvidenceIds: string[], targetFactIds: string[]): object | null`

Finds shortest path from start to all target facts.

**Parameters**:
- `startEvidenceIds` (string[]): Starting evidence IDs
- `targetFactIds` (string[]): Target solution fact IDs

**Returns**: Object with `path` array and `steps` number, or `null` if no path exists

**Example**:
```javascript
const pathResult = graph.getSolutionPath(
  ['crime_scene_body'],
  ['solution_killer_identity', 'solution_motive']
);
console.log(pathResult.steps); // 5
```

---

#### `getAccessibleEvidence(collectedIds: string[]): object`

Returns all evidence now accessible given what player has collected.

**Parameters**:
- `collectedIds` (string[]): Evidence IDs already collected

**Returns**: Object with `accessible` and `newly_unlocked` arrays

**Example**:
```javascript
const result = graph.getAccessibleEvidence(['crime_scene_body']);
console.log(result.newly_unlocked); // ['autopsy_report', 'victim_phone']
```

---

#### `validate(): ValidationResult`

Validates graph structure for common issues.

**Returns**: Validation result with `valid` boolean and `issues` array

**Example**:
```javascript
const validation = graph.validate();
console.log(validation.valid); // true
console.log(validation.issues); // []
```

---

#### `getStartingEvidence(): string[]`

Gets all starting evidence (evidence with no dependencies).

**Returns**: Array of starting evidence IDs

**Example**:
```javascript
const starting = graph.getStartingEvidence();
// ['crime_scene_body', 'crime_scene_observation']
```

---

#### `getEvidence(id: string): object | undefined`

Gets evidence by ID.

**Parameters**:
- `id` (string): Evidence ID

**Returns**: Evidence data, or `undefined` if not found

**Example**:
```javascript
const evidence = graph.getEvidence('crime_scene_body');
console.log(evidence.type); // EvidenceType.BODY
```

---

#### `getEvidenceByType(type: EvidenceType): object[]`

Gets all evidence of a specific type.

**Parameters**:
- `type` (EvidenceType): Evidence type

**Returns**: Array of evidence matching type

**Example**:
```javascript
const documents = graph.getEvidenceByType(EvidenceType.DOCUMENT);
```

---

#### `getEvidenceByLocation(location: string): object[]`

Gets all evidence in a specific location.

**Parameters**:
- `location` (string): Room ID

**Returns**: Array of evidence in location

**Example**:
```javascript
const sceneEvidence = graph.getEvidenceByLocation('crime_scene_1');
```

---

#### `getSolutionFacts(): object[]`

Gets all solution facts.

**Returns**: Array of solution fact evidence

**Example**:
```javascript
const solutionFacts = graph.getSolutionFacts();
console.log(solutionFacts.length); // 3
```

---

#### `getEvidenceCount(): number`

Gets the total number of evidence nodes.

**Returns**: Evidence count

**Example**:
```javascript
const count = graph.getEvidenceCount(); // 25
```

---

#### `getDependencyCount(): number`

Gets the total number of dependencies.

**Returns**: Dependency count

**Example**:
```javascript
const count = graph.getDependencyCount(); // 30
```

---

#### `serialize(): object`

Serializes the evidence graph to JSON.

**Returns**: Serialized graph data

**Example**:
```javascript
const data = graph.serialize();
```

---

#### `static deserialize(data: object): EvidenceGraph`

Deserializes an evidence graph from JSON.

**Parameters**:
- `data` (object): Serialized graph data

**Returns**: New evidence graph instance

**Example**:
```javascript
const graph = EvidenceGraph.deserialize(data);
```

---

#### `clear(): void`

Clears all evidence and dependencies.

**Example**:
```javascript
graph.clear();
```

---

### Types

#### EvidenceType

```typescript
enum EvidenceType {
  // Crime scene evidence
  BODY = 'body',
  WEAPON = 'weapon',
  BLOOD = 'blood',
  FINGERPRINTS = 'fingerprints',

  // Documents
  LETTER = 'letter',
  CONTRACT = 'contract',
  DIARY = 'diary',
  RECEIPT = 'receipt',

  // Testimony
  WITNESS_STATEMENT = 'witness_statement',
  ALIBI = 'alibi',

  // Forensics
  DNA = 'dna',
  TOXICOLOGY = 'toxicology',
  BALLISTICS = 'ballistics',

  // Solution facts
  KILLER_IDENTITY = 'killer_identity',
  MOTIVE = 'motive',
  METHOD = 'method',
  TIMELINE = 'timeline'
}
```

#### RevealType

```typescript
enum RevealType {
  DIRECT = 'direct',       // Evidence directly reveals next evidence
  CLUE = 'clue',           // Evidence provides a clue to find next
  ANALYSIS = 'analysis'    // Evidence requires analysis to reveal next
}
```

---

## EntityPopulator

**File**: `src/game/procedural/EntityPopulator.js`

Converts district and case data into entity spawn data.

### Constructor

```javascript
new EntityPopulator(config: object = {}): EntityPopulator
```

**Parameters**:
- `config` (object, optional): Configuration options
  - `npcDensity` (number, optional): NPCs per room. Default: `1.0`
  - `enemyDensity` (number, optional): Enemies per hostile district. Default: `0.5`
  - `backgroundNPCs` (boolean, optional): Add non-case NPCs. Default: `true`
  - `evidencePlacement` (string, optional): `'sparse'`, `'normal'`, or `'dense'`. Default: `'normal'`

**Example**:
```javascript
const populator = new EntityPopulator({
  npcDensity: 1.0,
  backgroundNPCs: true,
});
```

---

### Methods

#### `populate(district: object, caseData: object, seed: number): object`

Main entry point - generates all spawn data.

**Parameters**:
- `district` (object): District layout from DistrictGenerator
- `caseData` (object): Case data from CaseGenerator
- `seed` (number): Random seed for deterministic population

**Returns**: Object with `npcs`, `evidence`, and `objects` arrays

**Example**:
```javascript
const spawnData = populator.populate(district, caseData, 12345);
console.log(spawnData.npcs.length); // 50-80
console.log(spawnData.evidence.length); // 25
console.log(spawnData.objects.length); // 100-200
```

---

### Types

#### EntitySpawnData

```typescript
interface EntitySpawnData {
  type: 'npc' | 'evidence' | 'enemy' | 'interactable';
  position: {x: number, y: number};
  components: ComponentData[];
  metadata: object;
}
```

#### NPCSpawnData

```typescript
interface NPCSpawnData extends EntitySpawnData {
  npcId: string;
  name: string;
  position: {x: number, y: number};
  roomId: string;
  faction: string;
  role: 'victim' | 'killer' | 'witness' | 'civilian';
  attitude: 'friendly' | 'neutral' | 'hostile';
  patrolRoute: string[];
  knownInfo: string[];
  hasDialogue: boolean;
  dialogueId: string;
}
```

#### EvidenceSpawnData

```typescript
interface EvidenceSpawnData extends EntitySpawnData {
  evidenceId: string;
  position: {x: number, y: number};
  roomId: string;
  evidenceType: EvidenceType;
  caseId: string;
  title: string;
  description: string;
  hidden: boolean;
  requires: string | null;
  derivedClues: string[];
  isSolutionFact: boolean;
}
```

---

## LevelSpawnSystem

**File**: `src/game/systems/LevelSpawnSystem.js`

ECS System that spawns entities from generation result data.

### Constructor

```javascript
new LevelSpawnSystem(
  componentRegistry: ComponentRegistry,
  eventBus: EventBus,
  entityManager: EntityManager,
  spatialHash: SpatialHash = null
): LevelSpawnSystem
```

**Parameters**:
- `componentRegistry` (ComponentRegistry): Component registry
- `eventBus` (EventBus): Event bus
- `entityManager` (EntityManager): Entity manager
- `spatialHash` (SpatialHash, optional): Optional spatial hash for indexing

**Example**:
```javascript
const spawnSystem = new LevelSpawnSystem(
  componentRegistry,
  eventBus,
  entityManager,
  spatialHash
);
```

---

### Methods

#### `spawnFromGeneration(spawnData: object): number`

Main entry point - spawns all entities from generation result.

**Parameters**:
- `spawnData` (object): Spawn data with `npcs`, `evidence`, `objects` arrays

**Returns**: Total entities spawned

**Example**:
```javascript
const count = spawnSystem.spawnFromGeneration(spawnData);
console.log(`Spawned ${count} entities`);
```

---

#### `spawnNPC(npcData: NPCSpawnData): number | null`

Spawns an NPC entity from spawn data.

**Parameters**:
- `npcData` (NPCSpawnData): NPC spawn data

**Returns**: Entity ID or `null` if failed

**Example**:
```javascript
const entityId = spawnSystem.spawnNPC(npcData);
```

---

#### `spawnEvidence(evidenceData: EvidenceSpawnData): number | null`

Spawns an evidence entity from spawn data.

**Parameters**:
- `evidenceData` (EvidenceSpawnData): Evidence spawn data

**Returns**: Entity ID or `null` if failed

**Example**:
```javascript
const entityId = spawnSystem.spawnEvidence(evidenceData);
```

---

#### `spawnObject(objectData: object): number | null`

Spawns an interactive object entity from spawn data.

**Parameters**:
- `objectData` (object): Object spawn data

**Returns**: Entity ID or `null` if failed

**Example**:
```javascript
const entityId = spawnSystem.spawnObject(objectData);
```

---

#### `clearLevel(): void`

Clears all level entities (keeps player and persistent entities).

**Example**:
```javascript
spawnSystem.clearLevel();
```

---

### Events

**Listens**:
- `level:load` - Triggers spawning from spawn data
- `level:clear` - Clears all level entities

**Emits**:
- `level:loaded` - Emitted after all entities spawned

---

## NarrativeAnchorManager

**File**: `src/game/managers/NarrativeAnchorManager.js`

Manages fixed story locations that persist across district regenerations.

### Constructor

```javascript
new NarrativeAnchorManager(): NarrativeAnchorManager
```

**Example**:
```javascript
const anchorManager = new NarrativeAnchorManager();
```

---

### Methods

#### `registerAnchor(anchorData: object): string`

Registers a narrative anchor.

**Parameters**:
- `anchorData` (object): Anchor configuration
  - `id` (string): Unique anchor identifier
  - `type` (string): Anchor type (from AnchorType enum)
  - `isPermanent` (boolean, optional): Never regenerates if true. Default: `false`
  - `roomTemplate` (RoomTemplate): Fixed room layout
  - `position` (object, optional): Fixed position `{ x, y }`
  - `metadata` (object, optional): Additional metadata

**Returns**: The anchor ID

**Throws**: Error if missing required fields or invalid template

**Example**:
```javascript
const id = anchorManager.registerAnchor({
  id: 'safe_house_downtown',
  type: 'safe_house',
  isPermanent: true,
  roomTemplate: template,
  position: { x: 25, y: 25 },
});
```

---

#### `getAnchors(filter: object = {}): object[]`

Gets all anchors matching optional filter.

**Parameters**:
- `filter` (object, optional): Filter criteria
  - `type` (string, optional): Filter by anchor type
  - `isPermanent` (boolean, optional): Filter by permanence
  - `factionId` (string, optional): Filter by faction ID

**Returns**: Array of anchor data

**Example**:
```javascript
const permanentAnchors = anchorManager.getAnchors({ isPermanent: true });
console.log(permanentAnchors.length); // 6
```

---

#### `getAnchorById(id: string): object | null`

Gets a specific anchor by ID.

**Parameters**:
- `id` (string): Anchor ID

**Returns**: Anchor data or `null` if not found

**Example**:
```javascript
const detectiveOffice = anchorManager.getAnchorById('detective_office');
console.log(detectiveOffice.position); // { x: 0, y: 0 }
```

---

#### `applyAnchorsToDistrict(district: object, caseData: object = null): object`

Applies anchors to a district, replacing procedural rooms with fixed anchors.

**Parameters**:
- `district` (object): District object with rooms array and graph
- `caseData` (object, optional): Optional case data for context

**Returns**: Modified district

**Throws**: Error if district missing rooms array

**Example**:
```javascript
anchorManager.applyAnchorsToDistrict(district);
// Detective office now at (0, 0), faction HQs at fixed positions
```

---

#### `createDefaultAnchors(): object[]`

Creates default narrative anchors (detective office + faction HQs).

**Returns**: Array of default anchor data

**Example**:
```javascript
const defaults = anchorManager.createDefaultAnchors();
console.log(defaults.length); // 6
```

---

#### `serialize(): object`

Serializes anchor data for save/load.

**Returns**: Serialized data with `version` and `anchors` array

**Example**:
```javascript
const data = anchorManager.serialize();
localStorage.setItem('narrative_anchors', JSON.stringify(data));
```

---

#### `deserialize(data: object): boolean`

Deserializes anchor data from save.

**Parameters**:
- `data` (object): Serialized data

**Returns**: `true` if successful

**Example**:
```javascript
const data = JSON.parse(localStorage.getItem('narrative_anchors'));
anchorManager.deserialize(data);
```

---

### Types

#### AnchorType

```typescript
enum AnchorType {
  DETECTIVE_OFFICE = 'detective_office',
  FACTION_HEADQUARTERS = 'faction_headquarters',
  QUEST_LOCATION = 'quest_location',
  SAFE_HOUSE = 'safe_house',
}
```

---

**Document Version**: 1.0
**Last Updated**: 2025-10-27
**Author**: Documentation Specialist
**Sprint**: Sprint 4 - Procedural Generation System
