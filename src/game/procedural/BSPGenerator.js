/**
 * @fileoverview BSPGenerator - Binary Space Partitioning for building interior layouts
 * Generates rectangular room layouts by recursively subdividing space.
 * Used for creating apartments, offices, warehouses, and other structured interiors.
 */

import { SeededRandom } from '../../engine/procedural/SeededRandom.js';
import TileMap, { TileType } from './TileMap.js';

/**
 * Configuration for BSP generation
 * @typedef {Object} BSPConfig
 * @property {number} minRoomSize - Minimum room dimension (default: 8)
 * @property {number} maxRoomSize - Maximum room dimension (default: 20)
 * @property {number} corridorWidth - Corridor width in tiles (default: 2)
 * @property {number} marginSize - Space between room and container bounds (default: 1)
 * @property {number[]} splitRatio - [min, max] split position ratios (default: [0.35, 0.65])
 * @property {number} maxDepth - Maximum tree depth (default: 5)
 */

/**
 * BSP tree node representing a space subdivision
 * @typedef {Object} BSPNode
 * @property {number} x - Rectangle X position
 * @property {number} y - Rectangle Y position
 * @property {number} w - Rectangle width
 * @property {number} h - Rectangle height
 * @property {boolean} isLeaf - True if this is a room (no children)
 * @property {BSPNode[]} children - Child nodes [left, right]
 * @property {RoomData|null} room - Final room rectangle (for leaf nodes)
 * @property {CorridorData|null} corridor - Corridor connecting children
 */

/**
 * Room data structure
 * @typedef {Object} RoomData
 * @property {number} x - Room X position
 * @property {number} y - Room Y position
 * @property {number} w - Room width
 * @property {number} h - Room height
 * @property {number} centerX - Room center X
 * @property {number} centerY - Room center Y
 */

/**
 * Corridor data structure
 * @typedef {Object} CorridorData
 * @property {{x: number, y: number}} start - Start position
 * @property {{x: number, y: number}} end - End position
 * @property {number} width - Corridor width
 * @property {{x: number, y: number}[]} tiles - All corridor tiles
 */

/**
 * Binary Space Partitioning generator for structured interior layouts.
 * Creates interconnected rooms with corridors using recursive subdivision.
 *
 * @class
 * @example
 * const generator = new BSPGenerator({ minRoomSize: 8, corridorWidth: 2 });
 * const result = generator.generate(50, 40, 12345);
 * console.log(result.rooms.length); // Number of rooms created
 */
export class BSPGenerator {
  /**
   * Creates a new BSP generator
   * @param {BSPConfig} config - Configuration options
   */
  constructor(config = {}) {
    /**
     * @type {BSPConfig}
     */
    this.config = {
      minRoomSize: config.minRoomSize !== undefined ? config.minRoomSize : 8,
      maxRoomSize: config.maxRoomSize !== undefined ? config.maxRoomSize : 20,
      corridorWidth: config.corridorWidth !== undefined ? config.corridorWidth : 2,
      marginSize: config.marginSize !== undefined ? config.marginSize : 1,
      splitRatio: config.splitRatio || [0.35, 0.65],
      maxDepth: config.maxDepth !== undefined ? config.maxDepth : 5,
    };

    // Validate config
    if (this.config.minRoomSize < 4) {
      throw new Error('minRoomSize must be at least 4');
    }
    if (!Number.isInteger(this.config.corridorWidth) || this.config.corridorWidth < 1 || this.config.corridorWidth > 3) {
      throw new Error('corridorWidth must be between 1 and 3');
    }
    if (this.config.splitRatio[0] < 0.1 || this.config.splitRatio[1] > 0.9) {
      throw new Error('splitRatio must be within [0.1, 0.9]');
    }
  }

  /**
   * Generates a BSP layout with rooms and corridors
   * @param {number} width - Total width in tiles
   * @param {number} height - Total height in tiles
   * @param {number} seed - Random seed for deterministic generation
   * @returns {{tilemap: TileMap, rooms: RoomData[], corridors: CorridorData[], tree: BSPNode}}
   */
  generate(width, height, seed) {
    // Validate dimensions
    if (width < this.config.minRoomSize * 2 || height < this.config.minRoomSize * 2) {
      throw new Error(`Map too small: ${width}x${height} (minimum: ${this.config.minRoomSize * 2}x${this.config.minRoomSize * 2})`);
    }

    // Initialize RNG
    this.rng = new SeededRandom(seed);

    // Create root node spanning entire space
    const root = {
      x: 0,
      y: 0,
      w: width,
      h: height,
      isLeaf: true,
      children: [],
      room: null,
      corridor: null,
    };

    // Recursively split space
    this._splitNode(root, 0);

    // Create rooms in leaf nodes
    this._createRooms(root);

    // Create corridors connecting rooms
    this._createCorridors(root);

    // Collect all rooms and corridors
    const rooms = [];
    const corridors = [];
    this._collectRooms(root, rooms, corridors);

    // Generate tilemap
    const tilemap = new TileMap(width, height);
    this._applyToTilemap(tilemap, root);

    return {
      tilemap,
      rooms,
      corridors,
      tree: root,
    };
  }

  /**
   * Recursively splits a node into two children
   * @private
   * @param {BSPNode} node - Node to split
   * @param {number} depth - Current tree depth
   */
  _splitNode(node, depth) {
    // Stop if reached max depth
    if (depth >= this.config.maxDepth) {
      return;
    }

    // Stop if space too small to split
    const minSplitSize = this.config.minRoomSize * 2 + this.config.corridorWidth;
    if (node.w < minSplitSize && node.h < minSplitSize) {
      return;
    }

    // Decide split direction
    // Prefer horizontal splits for wide rectangles, vertical for tall
    const splitHorizontally = this._chooseSplitDirection(node);

    // Check if split is possible in chosen direction
    const canSplit = splitHorizontally
      ? node.h >= minSplitSize
      : node.w >= minSplitSize;

    if (!canSplit) {
      return;
    }

    // Find split position (between splitRatio[0] and splitRatio[1] of dimension)
    const dimension = splitHorizontally ? node.h : node.w;
    const minSplit = Math.floor(dimension * this.config.splitRatio[0]);
    const maxSplit = Math.floor(dimension * this.config.splitRatio[1]);

    // Ensure split creates valid rooms
    const actualMin = Math.max(minSplit, this.config.minRoomSize);
    const actualMax = Math.min(maxSplit, dimension - this.config.minRoomSize);

    if (actualMin >= actualMax) {
      return; // Cannot split while maintaining minimum room size
    }

    const splitPos = this.rng.nextInt(actualMin, actualMax);

    // Create child nodes
    node.isLeaf = false;

    if (splitHorizontally) {
      // Split horizontally (top/bottom)
      node.children = [
        {
          x: node.x,
          y: node.y,
          w: node.w,
          h: splitPos,
          isLeaf: true,
          children: [],
          room: null,
          corridor: null,
        },
        {
          x: node.x,
          y: node.y + splitPos,
          w: node.w,
          h: node.h - splitPos,
          isLeaf: true,
          children: [],
          room: null,
          corridor: null,
        },
      ];
    } else {
      // Split vertically (left/right)
      node.children = [
        {
          x: node.x,
          y: node.y,
          w: splitPos,
          h: node.h,
          isLeaf: true,
          children: [],
          room: null,
          corridor: null,
        },
        {
          x: node.x + splitPos,
          y: node.y,
          w: node.w - splitPos,
          h: node.h,
          isLeaf: true,
          children: [],
          room: null,
          corridor: null,
        },
      ];
    }

    // Recursively split children
    this._splitNode(node.children[0], depth + 1);
    this._splitNode(node.children[1], depth + 1);
  }

  /**
   * Decides whether to split horizontally or vertically
   * @private
   * @param {BSPNode} node - Node to split
   * @returns {boolean} True for horizontal split, false for vertical
   */
  _chooseSplitDirection(node) {
    const aspectRatio = node.w / node.h;

    // Strong preference for splitting along longer dimension
    if (aspectRatio > 1.5) {
      return false; // Wide rectangle, split vertically
    } else if (aspectRatio < 0.66) {
      return true; // Tall rectangle, split horizontally
    }

    // Square-ish, random choice
    return this.rng.nextBool();
  }

  /**
   * Creates rooms in all leaf nodes
   * @private
   * @param {BSPNode} node - Current node
   */
  _createRooms(node) {
    if (node.isLeaf) {
      // Create room within node bounds, leaving margin
      const margin = this.config.marginSize;
      const minMargin = margin;
      const maxMargin = margin * 2;

      // Random margins for variation
      const marginLeft = this.rng.nextInt(minMargin, Math.min(maxMargin, Math.floor(node.w * 0.2)));
      const marginRight = this.rng.nextInt(minMargin, Math.min(maxMargin, Math.floor(node.w * 0.2)));
      const marginTop = this.rng.nextInt(minMargin, Math.min(maxMargin, Math.floor(node.h * 0.2)));
      const marginBottom = this.rng.nextInt(minMargin, Math.min(maxMargin, Math.floor(node.h * 0.2)));

      const roomX = node.x + marginLeft;
      const roomY = node.y + marginTop;
      const roomW = node.w - marginLeft - marginRight;
      const roomH = node.h - marginTop - marginBottom;

      // Enforce minimum room size
      if (roomW >= this.config.minRoomSize && roomH >= this.config.minRoomSize) {
        node.room = {
          x: roomX,
          y: roomY,
          w: roomW,
          h: roomH,
          centerX: roomX + Math.floor(roomW / 2),
          centerY: roomY + Math.floor(roomH / 2),
        };
      }
    } else {
      // Recursively create rooms in children
      for (const child of node.children) {
        this._createRooms(child);
      }
    }
  }

  /**
   * Creates corridors connecting sibling rooms
   * @private
   * @param {BSPNode} node - Current node
   */
  _createCorridors(node) {
    if (node.isLeaf) {
      return; // Leaf nodes don't have corridors
    }

    // Recursively create corridors in children first
    for (const child of node.children) {
      this._createCorridors(child);
    }

    // Connect rooms in left and right children
    const leftRooms = [];
    const rightRooms = [];
    this._collectLeafRooms(node.children[0], leftRooms);
    this._collectLeafRooms(node.children[1], rightRooms);

    if (leftRooms.length === 0 || rightRooms.length === 0) {
      return; // No rooms to connect
    }

    // Pick random rooms from each side
    const leftRoom = this.rng.choice(leftRooms);
    const rightRoom = this.rng.choice(rightRooms);

    // Create L-shaped corridor
    node.corridor = this._createLShapedCorridor(leftRoom, rightRoom);
  }

  /**
   * Creates an L-shaped corridor between two rooms
   * @private
   * @param {RoomData} room1 - First room
   * @param {RoomData} room2 - Second room
   * @returns {CorridorData} Corridor data
   */
  _createLShapedCorridor(room1, room2) {
    const start = { x: room1.centerX, y: room1.centerY };
    const end = { x: room2.centerX, y: room2.centerY };
    const width = this.config.corridorWidth;

    const tiles = [];

    // Randomly choose L-shape direction (horizontal-then-vertical or vertical-then-horizontal)
    if (this.rng.nextBool()) {
      // Horizontal then vertical
      this._createHorizontalCorridor(start.x, end.x, start.y, width, tiles);
      this._createVerticalCorridor(start.y, end.y, end.x, width, tiles);
    } else {
      // Vertical then horizontal
      this._createVerticalCorridor(start.y, end.y, start.x, width, tiles);
      this._createHorizontalCorridor(start.x, end.x, end.y, width, tiles);
    }

    return {
      start,
      end,
      width,
      tiles,
    };
  }

  /**
   * Adds horizontal corridor tiles
   * @private
   * @param {number} x1 - Start X
   * @param {number} x2 - End X
   * @param {number} y - Y position
   * @param {number} width - Corridor width
   * @param {{x: number, y: number}[]} tiles - Tile array to append to
   */
  _createHorizontalCorridor(x1, x2, y, width, tiles) {
    const startX = Math.min(x1, x2);
    const endX = Math.max(x1, x2);
    const halfWidth = Math.floor(width / 2);

    for (let x = startX; x <= endX; x++) {
      for (let dy = -halfWidth; dy <= halfWidth; dy++) {
        tiles.push({ x, y: y + dy });
      }
    }
  }

  /**
   * Adds vertical corridor tiles
   * @private
   * @param {number} y1 - Start Y
   * @param {number} y2 - End Y
   * @param {number} x - X position
   * @param {number} width - Corridor width
   * @param {{x: number, y: number}[]} tiles - Tile array to append to
   */
  _createVerticalCorridor(y1, y2, x, width, tiles) {
    const startY = Math.min(y1, y2);
    const endY = Math.max(y1, y2);
    const halfWidth = Math.floor(width / 2);

    for (let y = startY; y <= endY; y++) {
      for (let dx = -halfWidth; dx <= halfWidth; dx++) {
        tiles.push({ x: x + dx, y });
      }
    }
  }

  /**
   * Collects all leaf rooms from a subtree
   * @private
   * @param {BSPNode} node - Root of subtree
   * @param {RoomData[]} rooms - Array to collect rooms into
   */
  _collectLeafRooms(node, rooms) {
    if (node.isLeaf && node.room) {
      rooms.push(node.room);
    } else {
      for (const child of node.children) {
        this._collectLeafRooms(child, rooms);
      }
    }
  }

  /**
   * Collects all rooms and corridors from tree
   * @private
   * @param {BSPNode} node - Root node
   * @param {RoomData[]} rooms - Array to collect rooms
   * @param {CorridorData[]} corridors - Array to collect corridors
   */
  _collectRooms(node, rooms, corridors) {
    if (node.isLeaf && node.room) {
      rooms.push(node.room);
    } else {
      if (node.corridor) {
        corridors.push(node.corridor);
      }
      for (const child of node.children) {
        this._collectRooms(child, rooms, corridors);
      }
    }
  }

  /**
   * Applies BSP result to tilemap
   * @private
   * @param {TileMap} tilemap - Tilemap to modify
   * @param {BSPNode} root - BSP tree root
   */
  _applyToTilemap(tilemap, root) {
    // Fill entire map with walls
    tilemap.fill(TileType.WALL);

    // Carve out rooms
    const rooms = [];
    this._collectLeafRooms(root, rooms);
    for (const room of rooms) {
      tilemap.fillRect(room.x, room.y, room.w, room.h, TileType.FLOOR);
    }

    // Carve out corridors
    const corridors = [];
    this._collectCorridors(root, corridors);
    for (const corridor of corridors) {
      for (const tile of corridor.tiles) {
        tilemap.setTile(tile.x, tile.y, TileType.FLOOR);
      }
    }

    // Place doors at room/corridor junctions
    this._placeDoors(tilemap, rooms, corridors);
  }

  /**
   * Collects all corridors from tree
   * @private
   * @param {BSPNode} node - Root node
   * @param {CorridorData[]} corridors - Array to collect corridors
   */
  _collectCorridors(node, corridors) {
    if (!node.isLeaf) {
      if (node.corridor) {
        corridors.push(node.corridor);
      }
      for (const child of node.children) {
        this._collectCorridors(child, corridors);
      }
    }
  }

  /**
   * Places doors at room/corridor junctions
   * @private
   * @param {TileMap} tilemap - Tilemap to modify
   * @param {RoomData[]} rooms - All rooms
   * @param {CorridorData[]} corridors - All corridors
   */
  _placeDoors(tilemap, rooms, corridors) {
    // For each room, check edges for corridor connections
    for (const room of rooms) {
      const edges = this._getRoomEdges(room);

      for (const edge of edges) {
        // Check if this edge position is adjacent to a corridor
        const isJunction = this._isCorridorJunction(edge, corridors, tilemap);

        if (isJunction) {
          // Place door if not already floor (corridor tile)
          const tile = tilemap.getTile(edge.x, edge.y);
          if (tile === TileType.WALL) {
            tilemap.setTile(edge.x, edge.y, TileType.DOOR);
          }
        }
      }
    }
  }

  /**
   * Gets all edge tiles of a room
   * @private
   * @param {RoomData} room - Room to check
   * @returns {{x: number, y: number}[]} Edge positions
   */
  _getRoomEdges(room) {
    const edges = [];

    // Top and bottom edges
    for (let x = room.x; x < room.x + room.w; x++) {
      edges.push({ x, y: room.y - 1 }); // Top edge (outside)
      edges.push({ x, y: room.y + room.h }); // Bottom edge (outside)
    }

    // Left and right edges
    for (let y = room.y; y < room.y + room.h; y++) {
      edges.push({ x: room.x - 1, y }); // Left edge (outside)
      edges.push({ x: room.x + room.w, y }); // Right edge (outside)
    }

    return edges;
  }

  /**
   * Checks if a position is a corridor junction
   * @private
   * @param {{x: number, y: number}} pos - Position to check
   * @param {CorridorData[]} corridors - All corridors
   * @param {TileMap} tilemap - Tilemap
   * @returns {boolean} True if position is adjacent to corridor
   */
  _isCorridorJunction(pos, corridors, tilemap) {
    // Check if any adjacent tile is a corridor (FLOOR)
    const neighbors = [
      { x: pos.x + 1, y: pos.y },
      { x: pos.x - 1, y: pos.y },
      { x: pos.x, y: pos.y + 1 },
      { x: pos.x, y: pos.y - 1 },
    ];

    for (const neighbor of neighbors) {
      const tile = tilemap.getTile(neighbor.x, neighbor.y);
      if (tile === TileType.FLOOR) {
        // Check if this floor tile is part of a corridor
        for (const corridor of corridors) {
          for (const corridorTile of corridor.tiles) {
            if (corridorTile.x === neighbor.x && corridorTile.y === neighbor.y) {
              return true;
            }
          }
        }
      }
    }

    return false;
  }
}
