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
  constructor(entityManager, componentRegistry, eventBus, options = {}) {
    this.entityManager = entityManager;
    this.componentRegistry = componentRegistry;
    this.eventBus = eventBus;
    this.systems = [];
    this.systemsByName = new Map();
    this.systemMetadata = new Map();

    this.profileSystems = options.profileSystems !== false;
    this.metricsHistorySize = Math.max(
      1,
      Number.isInteger(options.metricsHistorySize)
        ? options.metricsHistorySize
        : 120
    );
    this.metricsHistory = [];
    this.metricsRunningTotal = 0;
    this.averageFrameTime = 0;
    this.lastFrameMetrics = this._createFrameMetrics(
      0,
      0,
      [],
      typeof performance !== 'undefined' ? performance.now() : 0
    );
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

    this.systemMetadata.set(system, { name: systemLabel });

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
    this.systemMetadata.delete(system);

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
    const profilingEnabled = this.profileSystems && typeof performance !== 'undefined';
    const frameStart = profilingEnabled ? performance.now() : 0;
    const systemMetrics = profilingEnabled ? [] : null;

    let executedCount = 0;

    for (let i = 0; i < this.systems.length; i++) {
      const system = this.systems[i];

      // Skip disabled systems
      if (!system.enabled) {
        continue;
      }

      // Query entities that match system's required components
      const queryStart = profilingEnabled ? performance.now() : 0;
      const entities = this.componentRegistry.queryEntities(...system.requiredComponents);
      const queryDuration = profilingEnabled ? performance.now() - queryStart : 0;

      // Update system with matching entities
      const updateStart = profilingEnabled ? performance.now() : 0;
      system.update(deltaTime, entities);
      const updateDuration = profilingEnabled ? performance.now() - updateStart : 0;

      executedCount++;

      if (profilingEnabled && systemMetrics) {
        const metadata = this.systemMetadata.get(system);
        systemMetrics.push({
          name: metadata?.name || system.constructor.name,
          priority: system.priority,
          entityCount: entities.length,
          queryTime: queryDuration,
          updateTime: updateDuration,
          totalTime: queryDuration + updateDuration,
        });
      }
    }

    if (profilingEnabled) {
      const totalTime = performance.now() - frameStart;
      const frameMetrics = this._createFrameMetrics(
        totalTime,
        deltaTime,
        systemMetrics || [],
        frameStart
      );
      frameMetrics.systemCount = executedCount;
      this._recordFrameMetrics(frameMetrics);
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

  /**
   * Returns metrics for the most recent update frame.
   * @returns {{totalTime:number, deltaTime:number, systemCount:number, systems:Array, timestamp:number}}
   */
  getLastFrameMetrics() {
    return {
      ...this.lastFrameMetrics,
      systems: this.lastFrameMetrics.systems.map((entry) => ({ ...entry })),
    };
  }

  /**
   * Returns the moving average total frame time (ms) for profiled updates.
   * @returns {number} Average frame time in milliseconds
   */
  getAverageFrameTime() {
    return this.averageFrameTime;
  }

  /**
   * Returns a shallow copy of the recent frame metrics history.
   * @returns {Array} Array of frame metrics
   */
  getFrameHistory() {
    return this.metricsHistory.map((frame) => ({
      ...frame,
      systems: frame.systems.map((entry) => ({ ...entry })),
    }));
  }

  /**
   * Creates a frame metrics object.
   * @param {number} totalTime
   * @param {number} deltaTime
   * @param {Array} systems
   * @param {number} timestamp
   * @returns {{totalTime:number, deltaTime:number, systemCount:number, systems:Array, timestamp:number}}
   * @private
   */
  _createFrameMetrics(totalTime, deltaTime, systems, timestamp) {
    return {
      totalTime,
      deltaTime,
      systemCount: systems.length,
      systems,
      timestamp,
    };
  }

  /**
   * Records frame metrics into history and updates averages.
   * @param {Object} metrics
   * @private
   */
  _recordFrameMetrics(metrics) {
    this.lastFrameMetrics = metrics;
    this.metricsHistory.push(metrics);
    this.metricsRunningTotal += metrics.totalTime;

    if (this.metricsHistory.length > this.metricsHistorySize) {
      const removed = this.metricsHistory.shift();
      this.metricsRunningTotal -= removed.totalTime;
    }

    this.averageFrameTime =
      this.metricsHistory.length > 0
        ? this.metricsRunningTotal / this.metricsHistory.length
        : 0;
  }
}
