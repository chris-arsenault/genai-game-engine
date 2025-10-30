/**
 * Instance of a RoomTemplate placed in the world.
 * Represents a concrete room with position, rotation, and connections.
 *
 * @class
 * @example
 * const instance = new RoomInstance({
 *   id: 'room_001',
 *   templateId: 'apartment_1br',
 *   x: 100,
 *   y: 200,
 *   rotation: 0
 * });
 */
export class RoomInstance {
  /**
   * Creates a new room instance.
   *
   * @param {object} config - Instance configuration
   * @param {string} config.id - Unique instance identifier
   * @param {string} config.templateId - ID of the template this is based on
   * @param {number} config.x - World X position (top-left corner)
   * @param {number} config.y - World Y position (top-left corner)
   * @param {number} [config.rotation=0] - Rotation in degrees (0, 90, 180, 270)
   */
  constructor(config) {
    this.id = config.id;
    this.templateId = config.templateId;
    this.x = config.x;
    this.y = config.y;
    this.rotation = config.rotation || 0;
    this.width = typeof config.width === 'number' ? config.width : null;
    this.height = typeof config.height === 'number' ? config.height : null;
    this.templateWidth = typeof config.templateWidth === 'number' ? config.templateWidth : null;
    this.templateHeight = typeof config.templateHeight === 'number' ? config.templateHeight : null;
    this.layoutWidth = typeof config.layoutWidth === 'number' ? config.layoutWidth : null;
    this.layoutHeight = typeof config.layoutHeight === 'number' ? config.layoutHeight : null;

    /** @type {Map<string, string>} Door ID -> connected room ID */
    this.doors = new Map();

    /** @type {Map<string, {roomId: string, doorId: string}>} Door ID -> connection info */
    this.connections = new Map();

    /** @type {Array<object>} Entities spawned in this room */
    this.entities = [];

    /** @type {object} Room-specific state */
    this.state = {};
  }

  /**
   * Gets the world position of the room's top-left corner.
   *
   * @returns {{x: number, y: number}} World position
   */
  getWorldPosition() {
    return {
      x: this.x,
      y: this.y
    };
  }

  /**
   * Converts a local room coordinate to world coordinates.
   *
   * @param {number} localX - Local X coordinate
   * @param {number} localY - Local Y coordinate
   * @returns {{x: number, y: number}} World coordinates
   */
  localToWorld(localX, localY, options = {}) {
    const width = resolveDimension(options.width, this.width);
    const height = resolveDimension(options.height, this.height);
    const rotation = normalizeRotation(this.rotation);

    if (width === null || height === null) {
      return {
        x: this.x + localX,
        y: this.y + localY
      };
    }

    const metadata = getRotationMetadata(width, height, rotation);
    const raw = rotatePoint(localX, localY, rotation);
    const adjustedX = raw.x - metadata.minX;
    const adjustedY = raw.y - metadata.minY;

    return {
      x: this.x + adjustedX,
      y: this.y + adjustedY
    };
  }

  /**
   * Converts world coordinates to local room coordinates.
   *
   * @param {number} worldX - World X coordinate
   * @param {number} worldY - World Y coordinate
   * @returns {{x: number, y: number}} Local coordinates
   */
  worldToLocal(worldX, worldY, options = {}) {
    const width = resolveDimension(options.width, this.width);
    const height = resolveDimension(options.height, this.height);
    const rotation = normalizeRotation(this.rotation);

    if (width === null || height === null) {
      return {
        x: worldX - this.x,
        y: worldY - this.y
      };
    }

    const metadata = getRotationMetadata(width, height, rotation);
    const dx = worldX - this.x;
    const dy = worldY - this.y;
    const rawX = dx + metadata.minX;
    const rawY = dy + metadata.minY;
    const original = rotatePoint(rawX, rawY, (360 - rotation) % 360);

    return {
      x: original.x,
      y: original.y
    };
  }

  /**
   * Gets the bounding box of the room in world coordinates.
   * Note: Width and height need to be provided from the template.
   *
   * @param {number} width - Room width in tiles
   * @param {number} height - Room height in tiles
   * @returns {{x: number, y: number, width: number, height: number}} Bounding box
   */
  getBounds(width, height) {
    const resolvedWidth = resolveDimension(width, this.width) ?? 0;
    const resolvedHeight = resolveDimension(height, this.height) ?? 0;
    const rotation = normalizeRotation(this.rotation);
    const metadata = getRotationMetadata(resolvedWidth, resolvedHeight, rotation);

    return {
      x: this.x,
      y: this.y,
      width: metadata.width,
      height: metadata.height
    };
  }

  /**
   * Checks if a world point is inside this room.
   *
   * @param {number} worldX - World X coordinate
   * @param {number} worldY - World Y coordinate
   * @param {number} width - Room width in tiles
   * @param {number} height - Room height in tiles
   * @returns {boolean} True if point is inside room
   */
  containsPoint(worldX, worldY, width, height) {
    const resolvedWidth = resolveDimension(width, this.width);
    const resolvedHeight = resolveDimension(height, this.height);
    if (resolvedWidth == null || resolvedHeight == null) {
      return false;
    }

    const local = this.worldToLocal(worldX, worldY, {
      width: resolvedWidth,
      height: resolvedHeight
    });

    return (
      local.x >= 0 &&
      local.x < resolvedWidth &&
      local.y >= 0 &&
      local.y < resolvedHeight
    );
  }

  /**
   * Connects this room's door to another room's door.
   *
   * @param {string} doorId - This room's door ID
   * @param {string} targetRoomId - Target room's ID
   * @param {string} targetDoorId - Target room's door ID
   */
  connectTo(doorId, targetRoomId, targetDoorId) {
    this.doors.set(doorId, targetRoomId);
    this.connections.set(doorId, {
      roomId: targetRoomId,
      doorId: targetDoorId
    });
  }

  /**
   * Gets the connection info for a door.
   *
   * @param {string} doorId - Door ID
   * @returns {{roomId: string, doorId: string}|undefined} Connection info
   */
  getConnection(doorId) {
    return this.connections.get(doorId);
  }

  /**
   * Checks if a door is connected.
   *
   * @param {string} doorId - Door ID
   * @returns {boolean} True if door has a connection
   */
  isConnected(doorId) {
    return this.connections.has(doorId);
  }

  /**
   * Gets all connected room IDs.
   *
   * @returns {string[]} Array of connected room IDs
   */
  getConnectedRoomIds() {
    return Array.from(this.doors.values());
  }

  /**
   * Adds an entity to this room.
   *
   * @param {object} entity - Entity data
   */
  addEntity(entity) {
    this.entities.push(entity);
  }

  /**
   * Removes an entity from this room.
   *
   * @param {string} entityId - Entity ID to remove
   * @returns {boolean} True if entity was removed
   */
  removeEntity(entityId) {
    const initialLength = this.entities.length;
    this.entities = this.entities.filter(e => e.id !== entityId);
    return this.entities.length !== initialLength;
  }

  /**
   * Gets all entities in this room.
   *
   * @returns {object[]} Array of entities
   */
  getEntities() {
    return this.entities;
  }

  /**
   * Sets a state value.
   *
   * @param {string} key - State key
   * @param {*} value - State value
   */
  setState(key, value) {
    this.state[key] = value;
  }

  /**
   * Gets a state value.
   *
   * @param {string} key - State key
   * @returns {*} State value
   */
  getState(key) {
    return this.state[key];
  }

  /**
   * Serializes the room instance to a plain object.
   *
   * @returns {object} Serialized instance
   */
  serialize() {
    return {
      id: this.id,
      templateId: this.templateId,
      x: this.x,
      y: this.y,
      rotation: this.rotation,
      width: this.width,
      height: this.height,
      doors: Array.from(this.doors.entries()),
      connections: Array.from(this.connections.entries()),
      entities: this.entities,
      state: this.state
    };
  }

  /**
   * Deserializes a room instance from a plain object.
   *
   * @param {object} data - Serialized instance data
   * @returns {RoomInstance} New instance
   */
  static deserialize(data) {
    const instance = new RoomInstance({
      id: data.id,
      templateId: data.templateId,
      x: data.x,
      y: data.y,
      rotation: data.rotation,
      width: data.width,
      height: data.height
    });

    // Restore doors and connections
    if (data.doors) {
      instance.doors = new Map(data.doors);
    }
    if (data.connections) {
      instance.connections = new Map(data.connections);
    }

    // Restore entities and state
    instance.entities = data.entities || [];
    instance.state = data.state || {};

    return instance;
  }
}

function resolveDimension(value, fallback) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof fallback === 'number' && Number.isFinite(fallback)) {
    return fallback;
  }
  return null;
}

function normalizeRotation(rotation) {
  const normalized = ((rotation % 360) + 360) % 360;
  if (normalized === 0 || normalized === 90 || normalized === 180 || normalized === 270) {
    return normalized;
  }
  return normalized;
}

function rotatePoint(x, y, rotation) {
  const normalized = normalizeRotation(rotation);
  switch (normalized) {
    case 0:
      return { x, y };
    case 90:
      return { x: y, y: -x };
    case 180:
      return { x: -x, y: -y };
    case 270:
      return { x: -y, y: x };
    default: {
      const rad = (normalized * Math.PI) / 180;
      return {
        x: x * Math.cos(rad) - y * Math.sin(rad),
        y: x * Math.sin(rad) + y * Math.cos(rad)
      };
    }
  }
}

function getRotationMetadata(width, height, rotation) {
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    return {
      minX: 0,
      minY: 0,
      width: width || 0,
      height: height || 0
    };
  }

  const corners = [
    rotatePoint(0, 0, rotation),
    rotatePoint(width, 0, rotation),
    rotatePoint(0, height, rotation),
    rotatePoint(width, height, rotation)
  ];

  const minX = Math.min(...corners.map((p) => p.x));
  const maxX = Math.max(...corners.map((p) => p.x));
  const minY = Math.min(...corners.map((p) => p.y));
  const maxY = Math.max(...corners.map((p) => p.y));

  return {
    minX,
    minY,
    width: maxX - minX,
    height: maxY - minY
  };
}
