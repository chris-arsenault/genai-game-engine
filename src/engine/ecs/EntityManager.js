/**
 * EntityManager - Central registry for all entities
 */
import { Entity } from './Entity.js';

export class EntityManager {
  constructor() {
    this._entities = [];
    this._nextId = 0;
    this._freeIds = [];
  }

  /**
   * Create a new entity
   * @returns {Entity}
   */
  createEntity() {
    const id = this._freeIds.length > 0 ? this._freeIds.pop() : this._nextId++;
    const entity = new Entity(id);
    this._entities[id] = entity;
    return entity;
  }

  /**
   * Destroy an entity
   * @param {Entity} entity
   */
  destroyEntity(entity) {
    if (entity.alive) {
      entity.destroy();
      this._freeIds.push(entity.id);
      delete this._entities[entity.id];
    }
  }

  /**
   * Get all living entities
   * @returns {Entity[]}
   */
  getEntities() {
    return this._entities.filter(e => e && e.alive);
  }

  /**
   * Query entities by component types
   * @param {...string} componentTypes
   * @returns {Entity[]}
   */
  queryEntities(...componentTypes) {
    return this.getEntities().filter(entity =>
      componentTypes.every(type => entity.hasComponent(type))
    );
  }

  /**
   * Get entity by ID
   * @param {number} id
   * @returns {Entity|undefined}
   */
  getEntityById(id) {
    return this._entities[id];
  }

  /**
   * Clear all entities
   */
  clear() {
    this._entities.forEach(e => e && e.destroy());
    this._entities = [];
    this._nextId = 0;
    this._freeIds = [];
  }
}
