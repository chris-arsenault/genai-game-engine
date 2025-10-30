function deepClone(data) {
  if (data == null) {
    return null;
  }
  return JSON.parse(JSON.stringify(data));
}

/**
 * NavigationMeshService
 *
 * Tracks scene navigation meshes and provides updates to interested systems.
 */
export class NavigationMeshService {
  constructor(eventBus, options = {}) {
    this.eventBus = eventBus;
    this.options = {
      sceneEvent: options.sceneEvent || 'scene:loaded',
    };

    this._activeSceneId = null;
    this._activeMesh = null;
    this._meshes = new Map();
    this._consumers = new Set();
    this._unsubscribe = null;
  }

  init() {
    if (!this.eventBus || typeof this.eventBus.on !== 'function') {
      throw new Error('[NavigationMeshService] EventBus instance required');
    }
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }
    this._unsubscribe = this.eventBus.on(
      this.options.sceneEvent,
      (payload) => this.handleSceneLoaded(payload),
      this,
      40
    );
  }

  dispose() {
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }
    this._consumers.clear();
    this._meshes.clear();
    this._activeMesh = null;
    this._activeSceneId = null;
  }

  handleSceneLoaded(payload = {}) {
    if (!payload || typeof payload.navigationMesh === 'undefined') {
      return;
    }

    const sceneId = payload.sceneId || 'unknown_scene';
    this.setNavigationMesh(sceneId, payload.navigationMesh, payload);
  }

  setNavigationMesh(sceneId, mesh, context = {}) {
    if (!sceneId) {
      return;
    }

    const cloned = deepClone(mesh);
    this._meshes.set(sceneId, cloned);
    this._activeSceneId = sceneId;
    this._activeMesh = cloned;

    this.notifyConsumers(cloned, { sceneId, context: deepClone(context) });
  }

  addConsumer(consumer) {
    if (!consumer) return;
    this._consumers.add(consumer);

    if (this._activeMesh) {
      this.notifyConsumer(consumer, deepClone(this._activeMesh), {
        sceneId: this._activeSceneId,
        context: null,
      });
    }
  }

  removeConsumer(consumer) {
    this._consumers.delete(consumer);
  }

  notifyConsumers(mesh, info) {
    for (const consumer of this._consumers) {
      this.notifyConsumer(consumer, deepClone(mesh), info);
    }
  }

  notifyConsumer(consumer, mesh, info) {
    if (!consumer) {
      return;
    }
    if (typeof consumer === 'function') {
      consumer(mesh, info);
      return;
    }
    if (typeof consumer.setNavigationMesh === 'function') {
      consumer.setNavigationMesh(mesh, info);
    }
  }

  getActiveNavigationMesh() {
    return deepClone(this._activeMesh);
  }

  getNavigationMesh(sceneId) {
    if (!sceneId) {
      return null;
    }
    return deepClone(this._meshes.get(sceneId) || null);
  }

  hasNavigationMesh(sceneId) {
    if (sceneId) {
      return this._meshes.has(sceneId);
    }
    return Boolean(this._activeMesh);
  }
}
