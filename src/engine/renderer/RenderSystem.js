/**
 * RenderSystem - ECS system for rendering entities with Transform and Sprite components.
 *
 * Responsibilities:
 * - Query entities with Transform + Sprite components
 * - Sort entities by layer and z-index
 * - Perform viewport culling (skip off-screen entities)
 * - Render sprites to appropriate canvas layers
 * - Mark layers dirty when entities change
 *
 * Performance target: <8ms per frame with 1000 visible sprites.
 *
 * @class RenderSystem
 */
export class RenderSystem {
  /**
   * Creates a new render system.
   * @param {ComponentRegistry} componentRegistry - Component registry
   * @param {EventBus} eventBus - Event bus
   * @param {LayeredRenderer} layeredRenderer - Layered renderer instance
   * @param {Camera} camera - Camera instance
   */
  constructor(componentRegistry, eventBus, layeredRenderer, camera) {
    this.componentRegistry = componentRegistry;
    this.eventBus = eventBus;
    this.layeredRenderer = layeredRenderer;
    this.camera = camera;

    this.requiredComponents = ['Transform', 'Sprite'];
    this.enabled = true;
    this.priority = 100; // Render last (after all logic updates)

    // Performance tracking
    this.renderTime = 0;
    this.renderedCount = 0;
    this.culledCount = 0;
  }

  /**
   * Initializes the render system.
   * Subscribes to component change events to mark layers dirty.
   */
  init() {
    // Subscribe to component changes
    this.eventBus.on('component:added', () => this._markLayersDirty());
    this.eventBus.on('component:removed', () => this._markLayersDirty());
    this.eventBus.on('camera:moved', () => this._markTilesLayerDirty());
  }

  /**
   * Marks all dynamic layers as dirty.
   * @private
   */
  _markLayersDirty() {
    this.layeredRenderer.markLayerDirty('entities');
    this.layeredRenderer.markLayerDirty('effects');
  }

  /**
   * Marks tiles layer as dirty (for camera movement).
   * @private
   */
  _markTilesLayerDirty() {
    this.layeredRenderer.markLayerDirty('tiles');
  }

  /**
   * Updates the render system.
   * Renders all entities to their respective layers.
   *
   * @param {number} deltaTime - Time since last frame in seconds
   * @param {number[]} entities - Entity IDs matching required components
   */
  update(deltaTime, entities) {
    const startTime = performance.now();
    this.renderedCount = 0;
    this.culledCount = 0;

    // Group entities by layer
    const entitiesByLayer = this._groupEntitiesByLayer(entities);

    // Render each layer
    for (const [layerName, layerEntities] of entitiesByLayer) {
      this._renderLayer(layerName, layerEntities);
    }

    // Mark all layers as clean (they've been rendered)
    this._markLayersClean();

    this.renderTime = performance.now() - startTime;
  }

  /**
   * Groups entities by their sprite layer.
   * @param {number[]} entities - Entity IDs
   * @returns {Map<string, Array<{entityId, transform, sprite}>>} Entities grouped by layer
   * @private
   */
  _groupEntitiesByLayer(entities) {
    const groups = new Map();

    for (const entityId of entities) {
      const transform = this.componentRegistry.getComponent(entityId, 'Transform');
      const sprite = this.componentRegistry.getComponent(entityId, 'Sprite');

      if (!transform || !sprite || !sprite.visible) {
        continue;
      }

      // Viewport culling: skip entities outside camera view
      if (!this._isInView(transform, sprite)) {
        this.culledCount++;
        continue;
      }

      const layerName = sprite.layer || 'entities';
      if (!groups.has(layerName)) {
        groups.set(layerName, []);
      }

      groups.get(layerName).push({ entityId, transform, sprite });
    }

    return groups;
  }

  /**
   * Checks if an entity is visible in the camera viewport.
   * @param {Transform} transform - Entity transform
   * @param {Sprite} sprite - Entity sprite
   * @returns {boolean} True if visible
   * @private
   */
  _isInView(transform, sprite) {
    const margin = 100; // Extra margin for partial visibility
    return this.camera.containsRect(
      transform.x - sprite.width / 2,
      transform.y - sprite.height / 2,
      sprite.width,
      sprite.height
    );
  }

  /**
   * Renders entities to a specific layer.
   * Sorts entities by z-index before rendering.
   *
   * @param {string} layerName - Layer name
   * @param {Array<{entityId, transform, sprite}>} entities - Entities to render
   * @private
   */
  _renderLayer(layerName, entities) {
    const layer = this.layeredRenderer.getLayer(layerName);
    if (!layer || !layer.dirty) {
      return;
    }

    // Sort by z-index (lower = drawn first = behind)
    entities.sort((a, b) => a.sprite.zIndex - b.sprite.zIndex);

    // Clear layer
    layer.clear();

    // Render each entity
    for (const { transform, sprite } of entities) {
      this._renderSprite(layer.ctx, transform, sprite);
      this.renderedCount++;
    }

    // Mark layer as clean
    layer.markClean();
  }

  /**
   * Renders a single sprite to a canvas context.
   * Applies world-to-screen transformation and rotation.
   *
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {Transform} transform - Entity transform
   * @param {Sprite} sprite - Entity sprite
   * @private
   */
  _renderSprite(ctx, transform, sprite) {
    // Convert world to screen coordinates
    const screenPos = this.camera.worldToScreen(transform.x, transform.y);

    // Apply alpha
    ctx.globalAlpha = sprite.alpha;

    // Save context state
    ctx.save();

    // Translate to sprite position
    ctx.translate(screenPos.x, screenPos.y);

    // Apply rotation
    if (transform.rotation !== 0) {
      ctx.rotate(transform.rotation);
    }

    // Apply scale
    if (transform.scaleX !== 1 || transform.scaleY !== 1) {
      ctx.scale(transform.scaleX, transform.scaleY);
    }

    // Calculate draw position (centered on transform position)
    const drawX = -sprite.width / 2;
    const drawY = -sprite.height / 2;

    // Draw image or color rectangle
    if (sprite.image && sprite.image instanceof HTMLImageElement && sprite.image.complete) {
      ctx.drawImage(sprite.image, drawX, drawY, sprite.width, sprite.height);
    } else {
      // Fallback to colored rectangle
      ctx.fillStyle = sprite.color;
      ctx.fillRect(drawX, drawY, sprite.width, sprite.height);
    }

    // Restore context
    ctx.restore();
    ctx.globalAlpha = 1.0;
  }

  /**
   * Marks all layers as clean.
   * @private
   */
  _markLayersClean() {
    for (const layer of this.layeredRenderer.getSortedLayers()) {
      if (layer.dirty) {
        layer.markClean();
      }
    }
  }

  /**
   * Cleanup resources and unsubscribe from events.
   */
  cleanup() {
    // EventBus doesn't have off method that works with lambdas, so we rely on clear
  }

  /**
   * Enables the render system.
   */
  enable() {
    this.enabled = true;
  }

  /**
   * Disables the render system.
   */
  disable() {
    this.enabled = false;
  }

  /**
   * Gets render performance metrics.
   * @returns {{renderTime: number, renderedCount: number, culledCount: number}} Metrics
   */
  getMetrics() {
    return {
      renderTime: this.renderTime,
      renderedCount: this.renderedCount,
      culledCount: this.culledCount,
    };
  }
}
