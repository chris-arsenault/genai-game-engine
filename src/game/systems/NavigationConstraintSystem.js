import { System } from '../../engine/ecs/System.js';
import {
  buildSurfaceCache,
  findSurfaceForPoint,
  isSurfaceLockedForAgent,
} from '../navigation/navigationUtils.js';

/**
 * NavigationConstraintSystem
 *
 * Ensures entities with NavigationAgent components remain within allowed
 * surfaces for the active navigation mesh, applying tag/id locks used for
 * branch staging at the Act 2 crossroads hub.
 */
export class NavigationConstraintSystem extends System {
  constructor(componentRegistry, eventBus, options = {}) {
    super(componentRegistry, eventBus, ['Transform', 'NavigationAgent']);
    this.priority = options.priority ?? 12;
    this.entityManager = options.entityManager ?? null;
    this.worldStateStore = options.worldStateStore ?? null;

    this.navigationMesh = null;
    this._surfaceCache = [];
    this._activeSceneId = null;

    this.globalUnlockedTags = new Set();
    this.globalLockedTags = new Set();
    this._unsubscribes = [];
  }

  init() {
    this._unsubscribes.push(
      this.eventBus.on(
        'navigation:unlockSurfaceTag',
        (payload) => this.handleUnlockTag(payload),
        this,
        25
      )
    );

    this._unsubscribes.push(
      this.eventBus.on(
        'navigation:lockSurfaceTag',
        (payload) => this.handleLockTag(payload),
        this,
        25
      )
    );

    this._unsubscribes.push(
      this.eventBus.on(
        'navigation:unlockSurfaceId',
        (payload) => this.handleUnlockId(payload),
        this,
        25
      )
    );

    this._unsubscribes.push(
      this.eventBus.on(
        'navigation:lockSurfaceId',
        (payload) => this.handleLockId(payload),
        this,
        25
      )
    );
  }

  cleanup() {
    for (const off of this._unsubscribes) {
      if (typeof off === 'function') {
        off();
      }
    }
    this._unsubscribes.length = 0;
    this.navigationMesh = null;
    this._surfaceCache = [];
    this._activeSceneId = null;
  }

  setNavigationMesh(mesh, info = {}) {
    this.navigationMesh = mesh;
    this._activeSceneId = info.sceneId || null;
    this._surfaceCache = buildSurfaceCache(mesh);
  }

  handleUnlockTag(payload = {}) {
    const tag = payload?.tag;
    if (!tag) {
      return;
    }

    const entityId = typeof payload.entityId === 'number' ? payload.entityId : null;
    if (entityId !== null) {
      const agent = this.getComponent(entityId, 'NavigationAgent');
      if (agent && agent.unlockedSurfaceTags) {
        agent.unlockedSurfaceTags.add(tag);
      }
      return;
    }

    this.globalUnlockedTags.add(tag);
    this.applyTagToAllAgents(tag, true);
  }

  handleLockTag(payload = {}) {
    const tag = payload?.tag;
    if (!tag) {
      return;
    }

    const entityId = typeof payload.entityId === 'number' ? payload.entityId : null;
    if (entityId !== null) {
      const agent = this.getComponent(entityId, 'NavigationAgent');
      if (agent && agent.unlockedSurfaceTags) {
        agent.unlockedSurfaceTags.delete(tag);
      }
      return;
    }

    this.globalUnlockedTags.delete(tag);
    this.globalLockedTags.add(tag);
    this.applyTagToAllAgents(tag, false);
  }

  handleUnlockId(payload = {}) {
    const surfaceId = payload?.surfaceId;
    if (!surfaceId) {
      return;
    }

    const entityId = typeof payload.entityId === 'number' ? payload.entityId : null;
    if (entityId !== null) {
      const agent = this.getComponent(entityId, 'NavigationAgent');
      if (agent && agent.unlockedSurfaceIds) {
        agent.unlockedSurfaceIds.add(surfaceId);
      }
      return;
    }

    const agents = this.componentRegistry.getComponentsOfType('NavigationAgent');
    for (const agent of agents.values()) {
      if (agent && agent.unlockedSurfaceIds) {
        agent.unlockedSurfaceIds.add(surfaceId);
      }
    }
  }

  handleLockId(payload = {}) {
    const surfaceId = payload?.surfaceId;
    if (!surfaceId) {
      return;
    }

    const entityId = typeof payload.entityId === 'number' ? payload.entityId : null;
    if (entityId !== null) {
      const agent = this.getComponent(entityId, 'NavigationAgent');
      if (agent && agent.unlockedSurfaceIds) {
        agent.unlockedSurfaceIds.delete(surfaceId);
      }
      return;
    }

    const agents = this.componentRegistry.getComponentsOfType('NavigationAgent');
    for (const agent of agents.values()) {
      if (agent && agent.unlockedSurfaceIds) {
        agent.unlockedSurfaceIds.delete(surfaceId);
      }
    }
  }

  applyTagToAllAgents(tag, unlock) {
    const agents = this.componentRegistry.getComponentsOfType('NavigationAgent');
    for (const agent of agents.values()) {
      if (!agent || !agent.unlockedSurfaceTags) {
        continue;
      }
      if (unlock) {
        agent.unlockedSurfaceTags.add(tag);
      } else {
        agent.unlockedSurfaceTags.delete(tag);
      }
    }
  }

  update(deltaTime, entities) {
    if (!this.navigationMesh || !this._surfaceCache.length || !Array.isArray(entities)) {
      return;
    }

    for (const entityId of entities) {
      const agent = this.getComponent(entityId, 'NavigationAgent');
      const transform = this.getComponent(entityId, 'Transform');

      if (!agent || !transform) {
        continue;
      }

      if (agent.sceneId && this._activeSceneId && agent.sceneId !== this._activeSceneId) {
        continue;
      }

      const currentPosition = { x: transform.x, y: transform.y };
      const match = findSurfaceForPoint(currentPosition, this._surfaceCache, agent);

      if (!match) {
        if (agent.lastValidPosition) {
          transform.x = agent.lastValidPosition.x;
          transform.y = agent.lastValidPosition.y;
        } else if (!agent.allowFallbackToAny) {
          this.eventBus.emit('navigation:movement_blocked', {
            entityId,
            reason: 'outside_nav_mesh',
            sceneId: this._activeSceneId,
          });
        }
        continue;
      }

      if (isSurfaceLockedForAgent(agent, match.surface, this.globalUnlockedTags, this.globalLockedTags)) {
        if (agent.lastValidPosition) {
          transform.x = agent.lastValidPosition.x;
          transform.y = agent.lastValidPosition.y;
        }

        this.eventBus.emit('navigation:movement_blocked', {
          entityId,
          reason: 'locked_surface',
          surfaceId: match.surface.id || null,
          surfaceTags: Array.isArray(match.surface.tags) ? match.surface.tags.slice() : [],
          sceneId: this._activeSceneId,
        });
        continue;
      }

      agent.currentSurfaceId = match.surface.id || null;
      agent.lastValidPosition = { x: transform.x, y: transform.y };
    }
  }
}

