/**
 * @fileoverview DistrictGenerator - High-level city district generation using graph-based room placement
 * Generates complete districts with semantic room types (detective office, crime scenes, apartments, streets)
 * Uses graph structure for metroidvania connectivity and BSP for building interiors.
 */

import { SeededRandom } from '../../engine/procedural/SeededRandom.js';
import { LayoutGraph } from '../../engine/procedural/LayoutGraph.js';
import { RoomInstance } from '../../engine/procedural/RoomInstance.js';
import { TileRotationMatrix } from '../../engine/procedural/TileRotationMatrix.js';
import TileMap, { TileType } from './TileMap.js';
import { BSPGenerator } from './BSPGenerator.js';
import { TemplateVariantResolver } from './TemplateVariantResolver.js';
import { TilemapTransformer } from './TilemapTransformer.js';
import { CorridorSeamPainter } from './CorridorSeamPainter.js';

/**
 * Room type constants for semantic district generation
 * @readonly
 * @enum {string}
 */
export const RoomTypes = {
  DETECTIVE_OFFICE: 'detective_office',
  CRIME_SCENE: 'crime_scene',
  APARTMENT: 'apartment',
  OFFICE: 'office',
  STREET: 'street',
  ALLEY: 'alley',
  WAREHOUSE: 'warehouse',
  SHOP: 'shop',
  RESTAURANT: 'restaurant',
  ROOFTOP: 'rooftop',
};

/**
 * District type configurations
 * @readonly
 * @enum {string}
 */
export const DistrictTypes = {
  RESIDENTIAL: 'residential',
  COMMERCIAL: 'commercial',
  INDUSTRIAL: 'industrial',
  MIXED: 'mixed',
};

/**
 * Default room count distributions by district type
 */
const DEFAULT_ROOM_COUNTS = {
  residential: {
    detective_office: 1,
    crime_scene: 2,
    apartment: 20,
    office: 3,
    street: 8,
    alley: 6,
    warehouse: 1,
    shop: 4,
    restaurant: 2,
    rooftop: 3,
  },
  commercial: {
    detective_office: 1,
    crime_scene: 3,
    apartment: 5,
    office: 15,
    street: 10,
    alley: 4,
    warehouse: 2,
    shop: 10,
    restaurant: 5,
    rooftop: 2,
  },
  industrial: {
    detective_office: 1,
    crime_scene: 3,
    apartment: 3,
    office: 8,
    street: 7,
    alley: 8,
    warehouse: 12,
    shop: 3,
    restaurant: 1,
    rooftop: 4,
  },
  mixed: {
    detective_office: 1,
    crime_scene: 3,
    apartment: 15,
    office: 10,
    street: 8,
    alley: 5,
    warehouse: 4,
    shop: 6,
    restaurant: 3,
    rooftop: 2,
  },
};

/**
 * District generator using graph-based room placement and BSP for interiors.
 * Generates complete city districts with semantic room types and connectivity.
 *
 * @class
 * @example
 * const generator = new DistrictGenerator({
 *   districtSize: { width: 200, height: 200 },
 *   minRoomSpacing: 3
 * });
 * const result = generator.generate(12345, 'mixed');
 * console.log(result.rooms.length); // 50-60 rooms
 */
export class DistrictGenerator {
  /**
   * Creates a new district generator
   * @param {object} [config={}] - Configuration options
   * @param {{width: number, height: number}} [config.districtSize] - Total district size in tiles
   * @param {object} [config.roomCounts] - Custom room counts by type
   * @param {number} [config.minRoomSpacing] - Minimum spacing between rooms in tiles
   * @param {number} [config.corridorWidth] - Width of streets/corridors
   * @param {number} [config.forceIterations] - Iterations for force-directed layout
   * @param {number} [config.buildingMinSize] - Minimum size for BSP buildings
   * @param {number} [config.buildingMaxSize] - Maximum size for BSP buildings
   */
  constructor(config = {}) {
    this.config = {
      districtSize: config.districtSize || { width: 200, height: 200 },
      roomCounts: config.roomCounts || null,
      minRoomSpacing: config.minRoomSpacing || 3,
      corridorWidth: config.corridorWidth || 3,
      forceIterations: config.forceIterations || 100,
      buildingMinSize: config.buildingMinSize || 12,
      buildingMaxSize: config.buildingMaxSize || 30,
      repulsionForce: config.repulsionForce || 50,
      attractionForce: config.attractionForce || 0.05,
      centeringForce: config.centeringForce || 0.01,
      rotationAngles: Array.isArray(config.rotationAngles) && config.rotationAngles.length
        ? config.rotationAngles
        : [0, 90, 180, 270],
    };

    this.templateVariantResolver =
      config.templateVariantResolver instanceof TemplateVariantResolver
        ? config.templateVariantResolver
        : new TemplateVariantResolver(config.templateVariantManifest || null);

    this.tilemapTransformer =
      config.tilemapTransformer instanceof TilemapTransformer
        ? config.tilemapTransformer
        : new TilemapTransformer();

    this.corridorSeamPainter =
      config.corridorSeamPainter instanceof CorridorSeamPainter
        ? config.corridorSeamPainter
        : new CorridorSeamPainter();
  }

  /**
   * Generates a complete district with semantic room types
   * @param {number} seed - Random seed for deterministic generation
   * @param {string} [districtType='mixed'] - District type (residential, commercial, industrial, mixed)
   * @returns {{graph: LayoutGraph, rooms: RoomInstance[], tilemap: TileMap, metadata: object}}
   */
  generate(seed, districtType = 'mixed') {
    const startTime = performance.now();

    // Initialize RNG
    this.rng = new SeededRandom(seed);

    // Build district graph with semantic room types
    const graph = this._buildDistrictGraph(this.rng, districtType);

    // Generate room interiors (BSP for buildings, simple for outdoor)
    const roomData = this._generateRoomInteriors(graph, this.rng);

    // Place rooms spatially using force-directed layout
    const positions = this._placeRooms(graph, roomData, this.rng);

    // Create room instances with positions
    const rooms = this._createRoomInstances(graph, roomData, positions);

    // Create connecting corridors/streets
    const corridors = this._createConnections(graph, rooms, this.rng);

    // Build final tilemap
    const tilemap = this._buildFinalTilemap(rooms, roomData, corridors);

    // Validate district
    const validation = this._validateDistrict(graph, tilemap);

    const endTime = performance.now();

    return {
      graph,
      rooms,
      tilemap,
      corridors,
      metadata: {
        seed,
        districtType,
        generationTime: endTime - startTime,
        roomCount: rooms.length,
        corridorCount: corridors.length,
        validation,
      },
    };
  }

  /**
   * Builds district graph with semantic room types based on district type
   * @private
   * @param {SeededRandom} rng - Random number generator
   * @param {string} districtType - Type of district
   * @returns {LayoutGraph} District layout graph
   */
  _buildDistrictGraph(rng, districtType) {
    const graph = new LayoutGraph();
    const roomCounts = this.config.roomCounts || DEFAULT_ROOM_COUNTS[districtType];

    let nodeId = 0;

    // Add nodes for each room type
    for (const [roomType, count] of Object.entries(roomCounts)) {
      for (let i = 0; i < count; i++) {
        const id = `${roomType}_${nodeId++}`;
        graph.addNode(id, {
          type: roomType,
          roomType: roomType,
          index: i,
        });
      }
    }

    // Create logical connections (ensure fully connected graph)
    this._createGraphConnections(graph, rng);

    return graph;
  }

  /**
   * Creates edges in the graph to ensure connectivity
   * @private
   * @param {LayoutGraph} graph - Graph to connect
   * @param {SeededRandom} rng - Random number generator
   */
  _createGraphConnections(graph, rng) {
    const nodes = Array.from(graph.nodes.values());

    if (nodes.length === 0) return;

    // Start with detective office as hub if it exists
    const detectiveOffice = nodes.find(n => n.type === RoomTypes.DETECTIVE_OFFICE);
    const startNode = detectiveOffice || nodes[0];

    // Use modified Prim's algorithm for connected graph
    const connected = new Set([startNode.id]);
    const remaining = nodes.filter(n => n.id !== startNode.id);

    while (remaining.length > 0) {
      // Pick random connected node
      const connectedArray = Array.from(connected);
      const fromId = rng.choice(connectedArray);

      // Pick random remaining node
      const toNode = rng.choice(remaining);
      const toId = toNode.id;

      // Add edge
      graph.addEdge(fromId, toId, {
        doorType: this._getDoorType(graph.getNode(fromId), toNode, rng),
      });

      // Make bidirectional for easier navigation
      graph.addEdge(toId, fromId, {
        doorType: this._getDoorType(toNode, graph.getNode(fromId), rng),
      });

      // Move to connected set
      connected.add(toId);
      remaining.splice(remaining.indexOf(toNode), 1);
    }

    // Add extra connections for loops (metroidvania connectivity)
    const extraConnections = Math.floor(nodes.length * 0.15); // 15% extra edges
    for (let i = 0; i < extraConnections; i++) {
      const from = rng.choice(nodes);
      const to = rng.choice(nodes);

      if (from.id !== to.id && !graph.hasPath(from.id, to.id)) {
        graph.addEdge(from.id, to.id, { doorType: 'main' });
      }
    }
  }

  /**
   * Determines door type based on room types
   * @private
   * @param {object} fromNode - Source node
   * @param {object} toNode - Target node
   * @param {SeededRandom} rng - Random number generator
   * @returns {string} Door type
   */
  _getDoorType(fromNode, toNode, rng) {
    const fromType = fromNode.data.roomType || fromNode.type;
    const toType = toNode.data.roomType || toNode.type;

    // Streets and alleys always have open connections
    if (fromType === RoomTypes.STREET || fromType === RoomTypes.ALLEY ||
        toType === RoomTypes.STREET || toType === RoomTypes.ALLEY) {
      return 'main';
    }

    // Some connections are locked
    if (rng.nextBool(0.2)) {
      return 'locked';
    }

    return 'main';
  }

  _selectRotation(rng) {
    const angles = this.config.rotationAngles || [0];
    if (!Array.isArray(angles) || angles.length === 0) {
      return 0;
    }
    return rng.choice(angles);
  }

  _computeLayoutDimensions(width, height, rotation) {
    const normalized = ((rotation % 360) + 360) % 360;
    if (normalized === 90 || normalized === 270) {
      return { width: height, height: width };
    }
    if (normalized === 0 || normalized === 180) {
      return { width, height };
    }

    const rad = (normalized * Math.PI) / 180;
    const sin = Math.abs(Math.sin(rad));
    const cos = Math.abs(Math.cos(rad));
    const rotatedWidth = Math.round(width * cos + height * sin);
    const rotatedHeight = Math.round(width * sin + height * cos);
    return { width: rotatedWidth, height: rotatedHeight };
  }

  /**
   * Generates interior layouts for each room using BSP or templates
   * @private
   * @param {LayoutGraph} graph - District graph
   * @param {SeededRandom} rng - Random number generator
   * @returns {Map<string, object>} Map of node ID to room data
   */
  _generateRoomInteriors(graph, rng) {
    const roomData = new Map();

    for (const node of graph.nodes.values()) {
      const roomType = node.data.roomType || node.type;
      const isBuilding = this._isBuilding(roomType);

      if (isBuilding) {
        // Use BSP for building interiors
        const size = rng.nextInt(this.config.buildingMinSize, this.config.buildingMaxSize);
        const width = size;
        const height = size;

        const bsp = new BSPGenerator({
          minRoomSize: 6,
          maxRoomSize: 12,
          corridorWidth: 2,
          maxDepth: 3,
        });

        const result = bsp.generate(width, height, rng.next() * 999999);

        const rotation = this._selectRotation(rng);
        const bounds = this._computeLayoutDimensions(width, height, rotation);

        roomData.set(node.id, {
          width,
          height,
          rotation,
          layoutWidth: bounds.width,
          layoutHeight: bounds.height,
          tilemap: result.tilemap,
          rooms: result.rooms,
          type: 'bsp',
        });
      } else {
        // Simple rectangular layout for outdoor areas
        const width = rng.nextInt(8, 16);
        const height = rng.nextInt(8, 16);
        const tilemap = new TileMap(width, height);

        // Fill with floor tiles for streets/alleys
        tilemap.fill(TileType.FLOOR);

        // Add some walls for boundaries
        for (let x = 0; x < width; x++) {
          tilemap.setTile(x, 0, TileType.WALL);
          tilemap.setTile(x, height - 1, TileType.WALL);
        }
        for (let y = 0; y < height; y++) {
          tilemap.setTile(0, y, TileType.WALL);
          tilemap.setTile(width - 1, y, TileType.WALL);
        }

        const rotation = this._selectRotation(rng);
        const bounds = this._computeLayoutDimensions(width, height, rotation);

        roomData.set(node.id, {
          width,
          height,
          rotation,
          layoutWidth: bounds.width,
          layoutHeight: bounds.height,
          tilemap,
          type: 'outdoor',
        });
      }
    }

    return roomData;
  }

  /**
   * Checks if a room type should use BSP generation
   * @private
   * @param {string} roomType - Room type
   * @returns {boolean} True if building type
   */
  _isBuilding(roomType) {
    return [
      RoomTypes.DETECTIVE_OFFICE,
      RoomTypes.APARTMENT,
      RoomTypes.OFFICE,
      RoomTypes.WAREHOUSE,
      RoomTypes.SHOP,
      RoomTypes.RESTAURANT,
    ].includes(roomType);
  }

  /**
   * Places rooms spatially using force-directed layout algorithm
   * @private
   * @param {LayoutGraph} graph - District graph
   * @param {Map<string, object>} roomData - Room interior data
   * @param {SeededRandom} rng - Random number generator
   * @returns {Map<string, {x: number, y: number}>} Map of node ID to position
   */
  _placeRooms(graph, roomData, rng) {
    const positions = new Map();
    const velocities = new Map();

    // Initialize random positions
    const centerX = this.config.districtSize.width / 2;
    const centerY = this.config.districtSize.height / 2;

    for (const nodeId of graph.nodes.keys()) {
      positions.set(nodeId, {
        x: centerX + rng.nextFloat(-30, 30),
        y: centerY + rng.nextFloat(-30, 30),
      });
      velocities.set(nodeId, { x: 0, y: 0 });
    }

    // Force-directed layout iterations
    for (let iter = 0; iter < this.config.forceIterations; iter++) {
      const forces = new Map();

      // Initialize forces
      for (const nodeId of graph.nodes.keys()) {
        forces.set(nodeId, { x: 0, y: 0 });
      }

      // Apply repulsion forces (all pairs)
      const nodes = Array.from(graph.nodes.keys());
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const node1 = nodes[i];
          const node2 = nodes[j];

          const pos1 = positions.get(node1);
          const pos2 = positions.get(node2);

          const dx = pos2.x - pos1.x;
          const dy = pos2.y - pos1.y;
          const dist = Math.sqrt(dx * dx + dy * dy) + 0.01; // Avoid division by zero

          const room1 = roomData.get(node1);
          const room2 = roomData.get(node2);
          const minDist = Math.max(
            room1.layoutWidth ?? room1.width,
            room1.layoutHeight ?? room1.height,
            room2.layoutWidth ?? room2.width,
            room2.layoutHeight ?? room2.height
          ) + this.config.minRoomSpacing;

          // Repulsion force
          if (dist < minDist) {
            const force = this.config.repulsionForce / (dist * dist);
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            const f1 = forces.get(node1);
            const f2 = forces.get(node2);
            f1.x -= fx;
            f1.y -= fy;
            f2.x += fx;
            f2.y += fy;
          }
        }
      }

      // Apply attraction forces (edges)
      for (const [fromId, edges] of graph.edges.entries()) {
        for (const edge of edges) {
          const toId = edge.to;

          const pos1 = positions.get(fromId);
          const pos2 = positions.get(toId);

          const dx = pos2.x - pos1.x;
          const dy = pos2.y - pos1.y;
          const dist = Math.sqrt(dx * dx + dy * dy) + 0.01;

          // Spring attraction
          const force = dist * this.config.attractionForce;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          const f1 = forces.get(fromId);
          const f2 = forces.get(toId);
          f1.x += fx;
          f1.y += fy;
          f2.x -= fx;
          f2.y -= fy;
        }
      }

      // Apply centering force
      for (const [nodeId, pos] of positions.entries()) {
        const dx = centerX - pos.x;
        const dy = centerY - pos.y;

        const f = forces.get(nodeId);
        f.x += dx * this.config.centeringForce;
        f.y += dy * this.config.centeringForce;
      }

      // Update positions with damping
      const damping = 0.85;
      for (const nodeId of graph.nodes.keys()) {
        const vel = velocities.get(nodeId);
        const force = forces.get(nodeId);
        const pos = positions.get(nodeId);

        vel.x = (vel.x + force.x) * damping;
        vel.y = (vel.y + force.y) * damping;

        pos.x += vel.x;
        pos.y += vel.y;

        // Keep within bounds
        const room = roomData.get(nodeId);
        const layoutWidth = room.layoutWidth ?? room.width;
        const layoutHeight = room.layoutHeight ?? room.height;
        pos.x = Math.max(layoutWidth / 2, Math.min(this.config.districtSize.width - layoutWidth / 2, pos.x));
        pos.y = Math.max(layoutHeight / 2, Math.min(this.config.districtSize.height - layoutHeight / 2, pos.y));
      }
    }

    // Convert to integer positions (top-left corner)
    for (const [nodeId, pos] of positions.entries()) {
      const room = roomData.get(nodeId);
      const layoutWidth = room.layoutWidth ?? room.width;
      const layoutHeight = room.layoutHeight ?? room.height;
      pos.x = Math.floor(pos.x - layoutWidth / 2);
      pos.y = Math.floor(pos.y - layoutHeight / 2);
    }

    return positions;
  }

  /**
   * Creates RoomInstance objects with positions
   * @private
   * @param {LayoutGraph} graph - District graph
   * @param {Map<string, object>} roomData - Room interior data
   * @param {Map<string, {x: number, y: number}>} positions - Room positions
   * @returns {RoomInstance[]} Array of room instances
   */
  _createRoomInstances(graph, roomData, positions) {
    const rooms = [];

    for (const node of graph.nodes.values()) {
      const pos = positions.get(node.id);
      const data = roomData.get(node.id);

      const instance = new RoomInstance({
        id: node.id,
        templateId: node.data.roomType || node.type,
        x: pos.x,
        y: pos.y,
        rotation: data.rotation ?? 0,
      });

      // Store room data for later use
      instance.width = data.width;
      instance.height = data.height;
      instance.tilemap = data.tilemap;
      instance.roomType = node.data.roomType || node.type;

      rooms.push(instance);
    }

    return rooms;
  }

  /**
   * Creates corridors connecting rooms based on graph edges
   * @private
   * @param {LayoutGraph} graph - District graph
   * @param {RoomInstance[]} rooms - Array of room instances
   * @param {SeededRandom} rng - Random number generator
   * @returns {Array<object>} Array of corridor data
   */
  _createConnections(graph, rooms, rng) {
    const corridors = [];
    const roomMap = new Map();

    for (const room of rooms) {
      roomMap.set(room.id, room);
    }

    for (const [fromId, edges] of graph.edges.entries()) {
      for (const edge of edges) {
        const toId = edge.to;

        const room1 = roomMap.get(fromId);
        const room2 = roomMap.get(toId);

        if (!room1 || !room2) continue;

        // Find door positions (centers of rooms)
        const bounds1 = room1.getBounds(room1.width, room1.height);
        const bounds2 = room2.getBounds(room2.width, room2.height);

        const door1 = {
          x: bounds1.x + Math.floor(bounds1.width / 2),
          y: bounds1.y + Math.floor(bounds1.height / 2),
        };
        const door2 = {
          x: bounds2.x + Math.floor(bounds2.width / 2),
          y: bounds2.y + Math.floor(bounds2.height / 2),
        };

        // Create L-shaped corridor
        const corridor = this._createLShapedCorridor(door1, door2, rng);
        corridors.push({
          from: fromId,
          to: toId,
          tiles: corridor,
        });
      }
    }

    return corridors;
  }

  /**
   * Creates an L-shaped corridor between two points
   * @private
   * @param {{x: number, y: number}} start - Start position
   * @param {{x: number, y: number}} end - End position
   * @param {SeededRandom} rng - Random number generator
   * @returns {Array<{x: number, y: number}>} Corridor tiles
   */
  _createLShapedCorridor(start, end, rng) {
    const tiles = [];
    const width = this.config.corridorWidth;
    const halfWidth = Math.floor(width / 2);

    // Randomly choose L-shape direction
    if (rng.nextBool()) {
      // Horizontal then vertical
      const minX = Math.min(start.x, end.x);
      const maxX = Math.max(start.x, end.x);
      for (let x = minX; x <= maxX; x++) {
        for (let dy = -halfWidth; dy <= halfWidth; dy++) {
          tiles.push({ x, y: start.y + dy });
        }
      }

      const minY = Math.min(start.y, end.y);
      const maxY = Math.max(start.y, end.y);
      for (let y = minY; y <= maxY; y++) {
        for (let dx = -halfWidth; dx <= halfWidth; dx++) {
          tiles.push({ x: end.x + dx, y });
        }
      }
    } else {
      // Vertical then horizontal
      const minY = Math.min(start.y, end.y);
      const maxY = Math.max(start.y, end.y);
      for (let y = minY; y <= maxY; y++) {
        for (let dx = -halfWidth; dx <= halfWidth; dx++) {
          tiles.push({ x: start.x + dx, y });
        }
      }

      const minX = Math.min(start.x, end.x);
      const maxX = Math.max(start.x, end.x);
      for (let x = minX; x <= maxX; x++) {
        for (let dy = -halfWidth; dy <= halfWidth; dy++) {
          tiles.push({ x, y: end.y + dy });
        }
      }
    }

    return tiles;
  }

  /**
   * Builds final tilemap from rooms and corridors
   * @private
   * @param {RoomInstance[]} rooms - Array of room instances
   * @param {Map<string, object>} roomData - Room interior data
   * @param {Array<object>} corridors - Array of corridor data
   * @returns {TileMap} Complete tilemap
   */
  _buildFinalTilemap(rooms, roomData, corridors) {
    const tilemap = new TileMap(
      this.config.districtSize.width,
      this.config.districtSize.height
    );

    // Fill with empty/wall
    tilemap.fill(TileType.EMPTY);

    const placements = [];

    // Copy each room's tilemap to position
    for (const room of rooms) {
      const data = roomData.get(room.id);
      if (!data || !data.tilemap) continue;

      const baseRotation = TileRotationMatrix.normalizeRotation(room.rotation ?? data.rotation ?? 0);
      let variantSummary = null;

      try {
        variantSummary = this.templateVariantResolver.resolve({
          room,
          template: data,
          rotation: baseRotation,
        });
      } catch (error) {
        console.warn('[DistrictGenerator] Variant resolver failed; falling back to base template', {
          roomId: room.id,
          error,
        });
      }

      const resolvedTilemap = variantSummary?.tilemap || data.tilemap;
      if (!resolvedTilemap) {
        continue;
      }

      const resolvedRotation = TileRotationMatrix.normalizeRotation(
        variantSummary?.rotation ?? baseRotation
      );

      let transformResult = null;
      try {
        transformResult = this.tilemapTransformer.transform(resolvedTilemap, {
          rotation: resolvedRotation,
          metadata: {
            roomId: room.id,
            roomType: room.type,
            variantId: variantSummary?.variantId ?? null,
          },
        });
      } catch (error) {
        console.warn('[DistrictGenerator] Tilemap transformation failed; using original layout', {
          roomId: room.id,
          error,
        });
        transformResult = {
          rotation: baseRotation,
          width: resolvedTilemap.width,
          height: resolvedTilemap.height,
          tiles: this._extractTilemapTiles(resolvedTilemap),
        };
      }

      for (const entry of transformResult.tiles) {
        const worldX = room.x + entry.x;
        const worldY = room.y + entry.y;

        if (worldX >= 0 && worldX < tilemap.width && worldY >= 0 && worldY < tilemap.height) {
          tilemap.setTile(worldX, worldY, entry.tile);
        }
      }

      placements.push({
        roomId: room.id,
        roomType: room.type,
        position: { x: room.x, y: room.y },
        size: {
          width: transformResult.width ?? resolvedTilemap.width,
          height: transformResult.height ?? resolvedTilemap.height,
        },
        rotation: transformResult.rotation ?? resolvedRotation,
        variantId: variantSummary?.variantId ?? null,
        variantStrategy: variantSummary?.strategy ?? 'rotate',
        metadata: variantSummary?.metadata ?? null,
        seams: Array.isArray(variantSummary?.seams)
          ? variantSummary.seams.map((seam) => ({ ...seam }))
          : [],
      });
    }

    // Carve corridors
    for (const corridor of corridors) {
      for (const tile of corridor.tiles) {
        if (tile.x >= 0 && tile.x < tilemap.width && tile.y >= 0 && tile.y < tilemap.height) {
          const currentTile = tilemap.getTile(tile.x, tile.y);
          // Only carve if empty or wall
          if (currentTile === TileType.EMPTY || currentTile === TileType.WALL) {
            tilemap.setTile(tile.x, tile.y, TileType.FLOOR);
          }
        }
      }
    }

    this.corridorSeamPainter.apply(tilemap, {
      rooms,
      corridors,
      placements,
      roomData,
    });

    return tilemap;
  }

  /**
   * Extract tile entries from a TileMap.
   * @private
   * @param {TileMap} tilemap
   * @returns {Array<{x: number, y: number, tile: number}>}
   */
  _extractTilemapTiles(tilemap) {
    const tiles = [];
    if (!tilemap || typeof tilemap.getTile !== 'function') {
      return tiles;
    }
    for (let y = 0; y < tilemap.height; y++) {
      for (let x = 0; x < tilemap.width; x++) {
        tiles.push({
          x,
          y,
          tile: tilemap.getTile(x, y),
        });
      }
    }
    return tiles;
  }

  /**
   * Validates the generated district
   * @private
   * @param {LayoutGraph} graph - District graph
   * @param {TileMap} tilemap - Complete tilemap
   * @returns {{valid: boolean, issues: string[], warnings: string[]}} Validation result
   */
  _validateDistrict(graph, tilemap) {
    const issues = [];
    const warnings = [];

    // Check graph connectivity
    if (!graph.isFullyConnected()) {
      issues.push('Graph is not fully connected');
    }

    // Check room count
    const roomCount = graph.getNodeCount();
    if (roomCount > 100) {
      warnings.push(`Room count (${roomCount}) exceeds recommended limit (100)`);
    }
    if (roomCount < 20) {
      warnings.push(`Room count (${roomCount}) is below recommended minimum (20)`);
    }

    // Check tilemap has walkable tiles
    const regions = tilemap.findConnectedRegions();
    if (regions.length === 0) {
      issues.push('No walkable tiles found');
    } else if (regions.length > 1) {
      warnings.push(`Multiple disconnected regions found: ${regions.length}`);
    }

    // Check room type distribution
    const detectiveOffices = graph.getNodesByType(RoomTypes.DETECTIVE_OFFICE);
    if (detectiveOffices.length === 0) {
      warnings.push('No detective office found');
    }

    return {
      valid: issues.length === 0,
      issues,
      warnings,
    };
  }
}
