/**
 * NavigationAgent Component
 *
 * Describes how an entity interacts with navigation meshes, including which
 * surface tags/ids are considered valid, which are initially locked, and
 * bookkeeping for the last valid position seen on the active scene mesh.
 */
export class NavigationAgent {
  /**
   * @param {Object} options
   * @param {string[]} [options.allowedSurfaceTags] - Tags that are permitted for traversal. Empty = allow all.
   * @param {string[]} [options.allowedSurfaceIds] - Explicit surface IDs this agent may occupy.
   * @param {string[]} [options.lockedSurfaceTags] - Tags that start locked until explicitly unlocked.
   * @param {string[]} [options.lockedSurfaceIds] - Surface IDs that start locked until explicitly unlocked.
   * @param {{x:number,y:number}|null} [options.initialPosition] - Seed last valid position.
   * @param {string|null} [options.sceneId] - Scene this agent cares about (null = any scene).
   * @param {boolean} [options.allowFallbackToAny] - Allow movement when no surfaces match.
   * @param {Object} [options.metadata] - Additional metadata for downstream systems.
   */
  constructor({
    allowedSurfaceTags = [],
    allowedSurfaceIds = [],
    lockedSurfaceTags = [],
    lockedSurfaceIds = [],
    initialPosition = null,
    sceneId = null,
    allowFallbackToAny = false,
    metadata = {}
  } = {}) {
    this.type = 'NavigationAgent';

    this.allowedSurfaceTags = Array.from(new Set(allowedSurfaceTags));
    this.allowedSurfaceIds = new Set(allowedSurfaceIds);

    this.lockedSurfaceTags = Array.from(new Set(lockedSurfaceTags));
    this.lockedSurfaceIds = new Set(lockedSurfaceIds);

    this.unlockedSurfaceTags = new Set();
    this.unlockedSurfaceIds = new Set();

    this.sceneId = sceneId;
    this.allowFallbackToAny = Boolean(allowFallbackToAny);

    this.currentSurfaceId = null;
    this.lastValidPosition = initialPosition
      ? { x: initialPosition.x, y: initialPosition.y }
      : null;

    this.metadata = { ...metadata };
  }
}

