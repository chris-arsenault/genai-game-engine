/**
 * Component base class - represents pure data attached to entities.
 * Components should contain NO logic, only data.
 * Systems operate on entities with specific component combinations.
 *
 * @class Component
 * @example
 * class PositionComponent extends Component {
 *   constructor(x = 0, y = 0) {
 *     super('Position');
 *     this.x = x;
 *     this.y = y;
 *   }
 * }
 */
export class Component {
  /**
   * Creates a new component.
   * @param {string} type - Component type identifier (e.g., 'Position', 'Velocity')
   */
  constructor(type) {
    this.type = type;
  }

  /**
   * Gets the component type.
   * @returns {string} Component type identifier
   */
  getType() {
    return this.type;
  }
}

/**
 * Built-in component types for common game objects.
 * Components are pure data containers - no methods beyond initialization.
 */

/**
 * Position component - stores 2D position and rotation.
 */
export class PositionComponent extends Component {
  constructor(x = 0, y = 0, rotation = 0) {
    super('Position');
    this.x = x;
    this.y = y;
    this.rotation = rotation;
  }
}

/**
 * Velocity component - stores 2D velocity vector.
 */
export class VelocityComponent extends Component {
  constructor(vx = 0, vy = 0) {
    super('Velocity');
    this.vx = vx;
    this.vy = vy;
  }
}

/**
 * Sprite component - stores visual representation data.
 */
export class SpriteComponent extends Component {
  constructor(imageSrc, width, height, layer = 'entities') {
    super('Sprite');
    this.imageSrc = imageSrc;
    this.width = width;
    this.height = height;
    this.layer = layer;
    this.visible = true;
    this.opacity = 1.0;
    this.offsetX = 0;
    this.offsetY = 0;
  }
}

/**
 * Collider component - stores collision shape data.
 */
export class ColliderComponent extends Component {
  constructor(type = 'aabb', width = 32, height = 32, radius = 16) {
    super('Collider');
    this.type = type; // 'aabb' or 'circle'
    this.width = width;
    this.height = height;
    this.radius = radius;
    this.isTrigger = false;
    this.isStatic = false;
  }
}

/**
 * Physics component - stores physics properties.
 */
export class PhysicsComponent extends Component {
  constructor(mass = 1.0, restitution = 0.5) {
    super('Physics');
    this.mass = mass;
    this.restitution = restitution; // Bounciness (0 = no bounce, 1 = perfect bounce)
    this.friction = 0.1;
  }
}

/**
 * Health component - stores health/damage data.
 */
export class HealthComponent extends Component {
  constructor(max = 100, current = 100) {
    super('Health');
    this.max = max;
    this.current = current;
  }
}

/**
 * TODO: Add components for narrative/investigation mechanics:
 * - InvestigationComponent (evidence collected, case files, deduction board)
 * - FactionComponent (reputation, disguise, known NPCs)
 * - QuestComponent (active quests, completed quests, story flags)
 */
