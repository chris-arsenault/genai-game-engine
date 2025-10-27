/**
 * Template definition for reusable room layouts.
 * Defines tile layout, door positions, and interaction points.
 *
 * @class
 * @example
 * const template = new RoomTemplate({
 *   id: 'apartment_1br',
 *   type: 'apartment',
 *   width: 10,
 *   height: 8,
 *   tiles: [[...], [...]],
 *   doors: [{ id: 'main', x: 5, y: 0, direction: 'north', type: 'main' }],
 *   interactionPoints: [{ id: 'spawn1', x: 3, y: 4, type: 'npc_spawn' }]
 * });
 */

/**
 * Tile types for room layouts.
 * @enum {number}
 */
export const TileType = {
  EMPTY: 0,
  FLOOR: 1,
  WALL: 2,
  DOOR: 3,
  WINDOW: 4,
  FURNITURE: 5,
  CONTAINER: 6
};

/**
 * Room template class.
 */
export class RoomTemplate {
  /**
   * Creates a new room template.
   *
   * @param {object} config - Template configuration
   * @param {string} config.id - Unique template identifier
   * @param {string} config.type - Room type (e.g., 'apartment', 'crime_scene')
   * @param {number} config.width - Width in tiles
   * @param {number} config.height - Height in tiles
   * @param {number[][]} config.tiles - 2D array of tile types
   * @param {DoorDefinition[]} config.doors - Door definitions
   * @param {InteractionPoint[]} [config.interactionPoints=[]] - Interaction points
   * @param {string[]} [config.requiredTags=[]] - Required tags for placement
   * @param {string[]} [config.excludedTags=[]] - Tags that prevent placement
   */
  constructor(config) {
    this.id = config.id;
    this.type = config.type;
    this.width = config.width;
    this.height = config.height;
    this.tiles = config.tiles || [];
    this.doors = config.doors || [];
    this.interactionPoints = config.interactionPoints || [];
    this.requiredTags = config.requiredTags || [];
    this.excludedTags = config.excludedTags || [];
    this.metadata = config.metadata || {};
  }

  /**
   * Validates the template structure.
   *
   * @returns {{valid: boolean, errors: string[]}} Validation result
   */
  validate() {
    const errors = [];

    // Check required fields
    if (!this.id) {
      errors.push('Template must have an id');
    }
    if (!this.type) {
      errors.push('Template must have a type');
    }
    if (this.width <= 0) {
      errors.push('Width must be positive');
    }
    if (this.height <= 0) {
      errors.push('Height must be positive');
    }

    // Validate tiles array dimensions
    if (this.tiles.length !== this.height) {
      errors.push(`Tiles array height (${this.tiles.length}) does not match template height (${this.height})`);
    } else {
      for (let y = 0; y < this.tiles.length; y++) {
        if (this.tiles[y].length !== this.width) {
          errors.push(`Tiles row ${y} width (${this.tiles[y].length}) does not match template width (${this.width})`);
        }
      }
    }

    // Validate doors
    for (const door of this.doors) {
      if (!door.id) {
        errors.push('All doors must have an id');
      }
      if (door.x < 0 || door.x >= this.width) {
        errors.push(`Door ${door.id} x position (${door.x}) is out of bounds`);
      }
      if (door.y < 0 || door.y >= this.height) {
        errors.push(`Door ${door.id} y position (${door.y}) is out of bounds`);
      }
      if (!['north', 'south', 'east', 'west'].includes(door.direction)) {
        errors.push(`Door ${door.id} has invalid direction: ${door.direction}`);
      }
    }

    // Validate interaction points
    for (const point of this.interactionPoints) {
      if (!point.id) {
        errors.push('All interaction points must have an id');
      }
      if (point.x < 0 || point.x >= this.width) {
        errors.push(`Interaction point ${point.id} x position (${point.x}) is out of bounds`);
      }
      if (point.y < 0 || point.y >= this.height) {
        errors.push(`Interaction point ${point.id} y position (${point.y}) is out of bounds`);
      }
      if (!point.type) {
        errors.push(`Interaction point ${point.id} must have a type`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Gets all door positions.
   *
   * @returns {Array<{x: number, y: number, id: string, direction: string, type: string}>} Door positions
   */
  getDoorPositions() {
    return this.doors.map(door => ({
      x: door.x,
      y: door.y,
      id: door.id,
      direction: door.direction,
      type: door.type || 'main'
    }));
  }

  /**
   * Gets a random spawn point from interaction points of type 'npc_spawn' or 'evidence_spawn'.
   *
   * @param {object} rng - SeededRandom instance
   * @param {string} [type] - Filter by interaction point type
   * @returns {{x: number, y: number, id: string}|null} Random spawn point or null if none available
   */
  getRandomSpawnPoint(rng, type) {
    let points = this.interactionPoints;

    if (type) {
      points = points.filter(p => p.type === type);
    }

    if (points.length === 0) {
      return null;
    }

    const point = rng.choice(points);
    return {
      x: point.x,
      y: point.y,
      id: point.id
    };
  }

  /**
   * Gets tile type at a specific position.
   *
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {number} Tile type
   */
  getTileAt(x, y) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return TileType.EMPTY;
    }
    return this.tiles[y][x];
  }

  /**
   * Checks if a tile is walkable.
   *
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {boolean} True if tile is walkable
   */
  isWalkable(x, y) {
    const tile = this.getTileAt(x, y);
    return tile === TileType.FLOOR || tile === TileType.DOOR;
  }

  /**
   * Serializes the template to a plain object.
   *
   * @returns {object} Serialized template
   */
  serialize() {
    return {
      id: this.id,
      type: this.type,
      width: this.width,
      height: this.height,
      tiles: this.tiles,
      doors: this.doors,
      interactionPoints: this.interactionPoints,
      requiredTags: this.requiredTags,
      excludedTags: this.excludedTags,
      metadata: this.metadata
    };
  }

  /**
   * Deserializes a template from a plain object.
   *
   * @param {object} data - Serialized template data
   * @returns {RoomTemplate} New template instance
   */
  static deserialize(data) {
    return new RoomTemplate(data);
  }

  /**
   * Creates a template from JSON data.
   *
   * @param {object} json - JSON data
   * @returns {RoomTemplate} New template instance
   */
  static fromJSON(json) {
    return new RoomTemplate(json);
  }
}

/**
 * @typedef {object} DoorDefinition
 * @property {string} id - Door identifier
 * @property {number} x - X coordinate
 * @property {number} y - Y coordinate
 * @property {'north'|'south'|'east'|'west'} direction - Door direction
 * @property {'main'|'locked'|'hidden'} [type='main'] - Door type
 * @property {string} [keyRequired] - Key ID required to open (if locked)
 */

/**
 * @typedef {object} InteractionPoint
 * @property {string} id - Point identifier
 * @property {number} x - X coordinate
 * @property {number} y - Y coordinate
 * @property {'evidence_spawn'|'npc_spawn'|'quest_trigger'|'container'} type - Point type
 * @property {object} [metadata] - Additional metadata
 */
