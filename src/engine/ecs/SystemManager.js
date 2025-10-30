/**
 * SystemManager - orchestrates system lifecycle and update loop.
 * Systems are updated in priority order each frame.
 * Priority values: 0 = highest (runs first), 100 = lowest (runs last).
 *
 * @class SystemManager
 */
export class SystemManager {
  /**
   * Creates a new system manager.
   * @param {EntityManager} entityManager - Entity manager instance
   * @param {ComponentRegistry} componentRegistry - Component registry instance
   * @param {EventBus} eventBus - Event bus instance
   */
  constructor(entityManager, componentRegistry, eventBus) {
    this.entityManager = entityManager;
    this.componentRegistry = componentRegistry;
    this.eventBus = eventBus;
    this.systems = [];
    this.systemsByName = new Map();
  }

  /**
   * Registers a system and initializes it.
   * Systems are automatically sorted by priority after registration.
   *
   * @param {System} system - System instance to register
   * @param {string} name - System name for lookup (optional)
   * @throws {Error} If system with same name already registered
   * @throws {Error} If system is missing required properties
   */
  registerSystem(system, nameOrOptions = null, priorityOverride = null) {
    const defaultOptions = {
      name: null,
      priority: null,
      autoInit: true,
    };

    let options = { ...defaultOptions };

    if (typeof nameOrOptions === 'string') {
      options.name = nameOrOptions;
    } else if (typeof nameOrOptions === 'number') {
      options.priority = nameOrOptions;
    } else if (nameOrOptions && typeof nameOrOptions === 'object') {
      options = {
        ...options,
        ...nameOrOptions,
      };
    }

    if (typeof priorityOverride === 'number') {
      options.priority = priorityOverride;
    }

    if (typeof options.name === 'number') {
      options.priority = options.priority ?? options.name;
      options.name = null;
    }

    if (typeof options.name === 'string') {
      options.name = options.name.trim();
      if (options.name.length === 0) {
        options.name = null;
      }
    }

    // Validate system has required properties
    const systemLabel = options.name || system.constructor.name;

    if (typeof system.priority !== 'number') {
      throw new Error(
        `System ${systemLabel} is missing required 'priority' property. ` +
        `All systems must extend the base System class or define priority as a number.`
      );
    }

    if (typeof system.enabled !== 'boolean') {
      throw new Error(
        `System ${systemLabel} is missing required 'enabled' property. ` +
        `All systems must extend the base System class or define enabled as a boolean.`
      );
    }

    if (!system.requiredComponents || !Array.isArray(system.requiredComponents)) {
      throw new Error(
        `System ${systemLabel} is missing required 'requiredComponents' array. ` +
        `All systems must define which components they operate on.`
      );
    }

    if (typeof system.update !== 'function') {
      throw new Error(
        `System ${systemLabel} is missing required 'update' method.`
      );
    }

    if (options.name && this.systemsByName.has(options.name)) {
      throw new Error(`System with name "${options.name}" already registered`);
    }

    // Inject dependencies
    system.componentRegistry = this.componentRegistry;
    system.eventBus = this.eventBus;
    system.events = this.eventBus; // Legacy alias maintained until all systems migrate

    if (typeof options.priority === 'number') {
      if (typeof system.setPriority === 'function') {
        system.setPriority(options.priority);
      } else {
        system.priority = options.priority;
      }
    }

    // Add to systems list
    this.systems.push(system);

    // Store by name if provided
    if (options.name) {
      this.systemsByName.set(options.name, system);
    }

    // Initialize system (optional)
    if (options.autoInit !== false && typeof system.init === 'function') {
      system.init();
    }

    // Sort by priority (lower priority = runs earlier).
    // Sorting happens after init so systems that adjust priority inside init are respected.
    this.systems.sort((a, b) => a.priority - b.priority);

    return system;
  }

  /**
   * Unregisters a system and cleans it up.
   * @param {string} name - System name
   * @returns {boolean} True if system was unregistered
   */
  unregisterSystem(name) {
    const system = this.systemsByName.get(name);
    if (!system) {
      return false;
    }

    // Cleanup system
    system.cleanup();

    // Remove from systems list
    const index = this.systems.indexOf(system);
    if (index !== -1) {
      this.systems.splice(index, 1);
    }

    // Remove from name map
    this.systemsByName.delete(name);

    return true;
  }

  /**
   * Gets a system by name.
   * @param {string} name - System name
   * @returns {System|undefined} System instance or undefined
   */
  getSystem(name) {
    return this.systemsByName.get(name);
  }

  /**
   * Updates all enabled systems.
   * This is called once per frame by the game loop.
   *
   * Performance target: <6ms for all systems combined.
   *
   * @param {number} deltaTime - Time elapsed since last frame in seconds
   */
  update(deltaTime) {
    for (let i = 0; i < this.systems.length; i++) {
      const system = this.systems[i];

      // Skip disabled systems
      if (!system.enabled) {
        continue;
      }

      // Query entities that match system's required components
      const entities = this.componentRegistry.queryEntities(...system.requiredComponents);

      // Update system with matching entities
      system.update(deltaTime, entities);
    }
  }

  /**
   * Initializes all systems.
   * Call this once on engine startup.
   */
  init() {
    for (const system of this.systems) {
      system.init();
    }
  }

  /**
   * Cleans up all systems.
   * Call this on engine shutdown.
   */
  cleanup() {
    for (const system of this.systems) {
      system.cleanup();
    }
  }

  /**
   * Enables a system.
   * @param {string} name - System name
   * @returns {boolean} True if system was enabled
   */
  enableSystem(name) {
    const system = this.systemsByName.get(name);
    if (system) {
      system.enable();
      return true;
    }
    return false;
  }

  /**
   * Disables a system.
   * @param {string} name - System name
   * @returns {boolean} True if system was disabled
   */
  disableSystem(name) {
    const system = this.systemsByName.get(name);
    if (system) {
      system.disable();
      return true;
    }
    return false;
  }

  /**
   * Gets all registered system names.
   * @returns {string[]} Array of system names
   */
  getSystemNames() {
    return Array.from(this.systemsByName.keys());
  }

  /**
   * Gets count of registered systems.
   * @returns {number} System count
   */
  getSystemCount() {
    return this.systems.length;
  }

  /**
   * Gets count of enabled systems.
   * @returns {number} Enabled system count
   */
  getEnabledSystemCount() {
    let count = 0;
    for (const system of this.systems) {
      if (system.enabled) {
        count++;
      }
    }
    return count;
  }
}
