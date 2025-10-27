/**
 * @fileoverview TileMap - Efficient 2D tile grid using Uint8Array for procedural generation
 * Provides 1 byte per tile storage for memory efficiency and fast access.
 */

/**
 * Tile type enumeration
 * @readonly
 * @enum {number}
 */
export const TileType = {
  EMPTY: 0,
  FLOOR: 1,
  WALL: 2,
  DOOR: 3,
  WINDOW: 4,
  STAIRS_UP: 5,
  STAIRS_DOWN: 6,
  DEBRIS: 7,
  BLOOD: 8,
  EVIDENCE: 9,
};

/**
 * Efficient 2D tile grid using Uint8Array for memory-efficient storage
 * @class TileMap
 */
export default class TileMap {
  /**
   * Create a new TileMap
   * @param {number} width - Width in tiles
   * @param {number} height - Height in tiles
   * @param {number} [tileSize=32] - Size of each tile in pixels
   */
  constructor(width, height, tileSize = 32) {
    if (!Number.isInteger(width) || width <= 0) {
      throw new Error('Width must be a positive integer');
    }
    if (!Number.isInteger(height) || height <= 0) {
      throw new Error('Height must be a positive integer');
    }
    if (!Number.isInteger(tileSize) || tileSize <= 0) {
      throw new Error('TileSize must be a positive integer');
    }

    /**
     * Width of the tile map
     * @type {number}
     */
    this.width = width;

    /**
     * Height of the tile map
     * @type {number}
     */
    this.height = height;

    /**
     * Size of each tile in pixels
     * @type {number}
     */
    this.tileSize = tileSize;

    /**
     * Flat array storing tile types (1 byte per tile)
     * Index calculation: y * width + x
     * @type {Uint8Array}
     */
    this.tiles = new Uint8Array(width * height);
  }

  /**
   * Get tile type at position with bounds checking
   * @param {number} x - X coordinate (tile index)
   * @param {number} y - Y coordinate (tile index)
   * @returns {number} Tile type (TileType enum value), EMPTY if out of bounds
   */
  getTile(x, y) {
    if (!this._isInBounds(x, y)) {
      return TileType.EMPTY;
    }
    return this.tiles[y * this.width + x];
  }

  /**
   * Set tile type at position with bounds checking
   * @param {number} x - X coordinate (tile index)
   * @param {number} y - Y coordinate (tile index)
   * @param {number} type - Tile type (TileType enum value)
   * @returns {boolean} True if set successfully, false if out of bounds
   */
  setTile(x, y, type) {
    if (!this._isInBounds(x, y)) {
      return false;
    }
    this.tiles[y * this.width + x] = type;
    return true;
  }

  /**
   * Check if tile is walkable (FLOOR, DOOR, STAIRS)
   * @param {number} x - X coordinate (tile index)
   * @param {number} y - Y coordinate (tile index)
   * @returns {boolean} True if walkable
   */
  isWalkable(x, y) {
    const tile = this.getTile(x, y);
    return (
      tile === TileType.FLOOR ||
      tile === TileType.DOOR ||
      tile === TileType.STAIRS_UP ||
      tile === TileType.STAIRS_DOWN
    );
  }

  /**
   * Check if tile is solid (blocks movement)
   * @param {number} x - X coordinate (tile index)
   * @param {number} y - Y coordinate (tile index)
   * @returns {boolean} True if solid
   */
  isSolid(x, y) {
    const tile = this.getTile(x, y);
    return tile === TileType.WALL;
  }

  /**
   * Convert world coordinates to tile indices
   * @param {number} worldX - World X coordinate in pixels
   * @param {number} worldY - World Y coordinate in pixels
   * @returns {{x: number, y: number}} Tile indices
   */
  worldToTile(worldX, worldY) {
    return {
      x: Math.floor(worldX / this.tileSize),
      y: Math.floor(worldY / this.tileSize),
    };
  }

  /**
   * Convert tile indices to world coordinates (top-left corner of tile)
   * @param {number} tileX - Tile X index
   * @param {number} tileY - Tile Y index
   * @returns {{x: number, y: number}} World coordinates in pixels
   */
  tileToWorld(tileX, tileY) {
    return {
      x: tileX * this.tileSize,
      y: tileY * this.tileSize,
    };
  }

  /**
   * Fill entire map with tile type
   * @param {number} type - Tile type (TileType enum value)
   */
  fill(type) {
    this.tiles.fill(type);
  }

  /**
   * Fill rectangle with tile type
   * @param {number} x - Start X coordinate
   * @param {number} y - Start Y coordinate
   * @param {number} w - Width in tiles
   * @param {number} h - Height in tiles
   * @param {number} type - Tile type (TileType enum value)
   */
  fillRect(x, y, w, h, type) {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        this.setTile(x + dx, y + dy, type);
      }
    }
  }

  /**
   * Flood fill from position using stack-based iterative approach
   * @param {number} x - Start X coordinate
   * @param {number} y - Start Y coordinate
   * @param {number} type - New tile type
   * @returns {number} Number of tiles filled
   */
  floodFill(x, y, type) {
    if (!this._isInBounds(x, y)) {
      return 0;
    }

    const targetType = this.getTile(x, y);
    if (targetType === type) {
      return 0; // Already the target type
    }

    let fillCount = 0;
    const stack = [{ x, y }];

    while (stack.length > 0) {
      const pos = stack.pop();
      const { x: px, y: py } = pos;

      if (!this._isInBounds(px, py)) {
        continue;
      }

      if (this.getTile(px, py) !== targetType) {
        continue;
      }

      this.setTile(px, py, type);
      fillCount++;

      // Add 4-connected neighbors
      stack.push({ x: px + 1, y: py });
      stack.push({ x: px - 1, y: py });
      stack.push({ x: px, y: py + 1 });
      stack.push({ x: px, y: py - 1 });
    }

    return fillCount;
  }

  /**
   * Find connected walkable regions (for validation)
   * @returns {Array<Array<{x: number, y: number}>>} Array of regions, each containing tile positions
   */
  findConnectedRegions() {
    const visited = new Uint8Array(this.width * this.height);
    const regions = [];

    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const index = y * this.width + x;
        if (visited[index] || !this.isWalkable(x, y)) {
          continue;
        }

        // Start new region with BFS
        const region = [];
        const queue = [{ x, y }];
        visited[index] = 1;

        while (queue.length > 0) {
          const pos = queue.shift();
          region.push(pos);

          // Check 4-connected neighbors
          const neighbors = [
            { x: pos.x + 1, y: pos.y },
            { x: pos.x - 1, y: pos.y },
            { x: pos.x, y: pos.y + 1 },
            { x: pos.x, y: pos.y - 1 },
          ];

          for (const neighbor of neighbors) {
            const nx = neighbor.x;
            const ny = neighbor.y;
            const nIndex = ny * this.width + nx;

            if (
              this._isInBounds(nx, ny) &&
              !visited[nIndex] &&
              this.isWalkable(nx, ny)
            ) {
              visited[nIndex] = 1;
              queue.push({ x: nx, y: ny });
            }
          }
        }

        regions.push(region);
      }
    }

    return regions;
  }

  /**
   * Serialize to minimal JSON format
   * @returns {{width: number, height: number, tileSize: number, tiles: string}} Serialized data
   */
  serialize() {
    // Convert Uint8Array to base64 for efficient storage
    const base64 = this._arrayToBase64(this.tiles);
    return {
      width: this.width,
      height: this.height,
      tileSize: this.tileSize,
      tiles: base64,
    };
  }

  /**
   * Deserialize from JSON
   * @param {{width: number, height: number, tileSize: number, tiles: string}} data - Serialized data
   * @returns {TileMap} Restored TileMap instance
   */
  static deserialize(data) {
    if (!data || !data.width || !data.height || !data.tiles) {
      throw new Error('Invalid serialized data');
    }

    const tileMap = new TileMap(data.width, data.height, data.tileSize || 32);
    const tiles = TileMap._base64ToArray(data.tiles);

    if (tiles.length !== tileMap.tiles.length) {
      throw new Error('Serialized tiles length mismatch');
    }

    tileMap.tiles.set(tiles);
    return tileMap;
  }

  /**
   * Create a deep copy of this TileMap
   * @returns {TileMap} Cloned TileMap
   */
  clone() {
    const cloned = new TileMap(this.width, this.height, this.tileSize);
    cloned.tiles.set(this.tiles);
    return cloned;
  }

  /**
   * Check if coordinates are within bounds
   * @private
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {boolean} True if in bounds
   */
  _isInBounds(x, y) {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  /**
   * Convert Uint8Array to base64 string
   * @private
   * @param {Uint8Array} array - Array to convert
   * @returns {string} Base64 encoded string
   */
  _arrayToBase64(array) {
    // Convert to binary string
    let binary = '';
    for (let i = 0; i < array.length; i++) {
      binary += String.fromCharCode(array[i]);
    }
    // Use btoa for base64 encoding (available in Node.js and browsers)
    return typeof btoa !== 'undefined'
      ? btoa(binary)
      : Buffer.from(binary, 'binary').toString('base64');
  }

  /**
   * Convert base64 string to Uint8Array
   * @private
   * @param {string} base64 - Base64 encoded string
   * @returns {Uint8Array} Decoded array
   */
  static _base64ToArray(base64) {
    // Decode base64 to binary string
    const binary =
      typeof atob !== 'undefined'
        ? atob(base64)
        : Buffer.from(base64, 'base64').toString('binary');

    // Convert to Uint8Array
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      array[i] = binary.charCodeAt(i);
    }
    return array;
  }
}
