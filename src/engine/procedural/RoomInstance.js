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
  localToWorld(localX, localY) {
    // TODO: Apply rotation transformation
    // For now, simple translation
    return {
      x: this.x + localX,
      y: this.y + localY
    };
  }

  /**
   * Converts world coordinates to local room coordinates.
   *
   * @param {number} worldX - World X coordinate
   * @param {number} worldY - World Y coordinate
   * @returns {{x: number, y: number}} Local coordinates
   */
  worldToLocal(worldX, worldY) {
    // TODO: Apply rotation transformation
    // For now, simple translation
    return {
      x: worldX - this.x,
      y: worldY - this.y
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
    // TODO: Account for rotation changing bounds
    return {
      x: this.x,
      y: this.y,
      width: width,
      height: height
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
    return worldX >= this.x &&
           worldX < this.x + width &&
           worldY >= this.y &&
           worldY < this.y + height;
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
      rotation: data.rotation
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
