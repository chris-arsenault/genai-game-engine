import { System } from '../ecs/System.js';

/**
 * TriggerSystem - monitors trigger components and emits enter/exit events.
 */
export class TriggerSystem extends System {
  constructor(componentRegistry, eventBus) {
    super(componentRegistry, eventBus, ['Transform', 'Trigger']);
    this.priority = 25;
  }

  /**
   * Update trigger states based on entity positions.
   * @param {number} deltaTime
   * @param {number[]} triggerEntities
   */
  update(deltaTime, triggerEntities) {
    if (!this.enabled) {
      return;
    }

    const entityManager = this.componentRegistry.entityManager;

    for (const triggerId of triggerEntities) {
      const trigger = this.getComponent(triggerId, 'Trigger');
      if (!trigger || !trigger.active) {
        continue;
      }

      if (!(trigger.entitiesInside instanceof Set)) {
        trigger.entitiesInside = new Set(trigger.entitiesInside || []);
      }

      const triggerTransform = this.getComponent(triggerId, 'Transform');
      if (!triggerTransform) {
        continue;
      }

      const candidates = this._resolveCandidateEntities(trigger, triggerId);
      if (candidates.size === 0) {
        continue;
      }

      for (const targetId of candidates) {
        if (targetId === triggerId) {
          continue;
        }
        if (!entityManager.hasEntity(targetId) || !entityManager.isActive(targetId)) {
          continue;
        }
        if (!this.componentRegistry.hasComponent(targetId, 'Transform')) {
          continue;
        }
        if (!this._matchesRequirements(trigger, targetId)) {
          continue;
        }

        const targetTransform = this.getComponent(targetId, 'Transform');
        if (!targetTransform) {
          continue;
        }

        const distance = typeof triggerTransform.distanceTo === 'function'
          ? triggerTransform.distanceTo(targetTransform)
          : Math.hypot(targetTransform.x - triggerTransform.x, targetTransform.y - triggerTransform.y);

        const isInside = distance <= trigger.radius;
        const wasInside = trigger.entitiesInside.has(targetId);

        if (isInside && !wasInside) {
          trigger.entitiesInside.add(targetId);
          this._emit(trigger.eventOnEnter ?? 'trigger:entered', {
            triggerId,
            trigger,
            targetId,
            radius: trigger.radius,
            data: trigger.data,
            triggerPosition: { x: triggerTransform.x, y: triggerTransform.y },
            targetPosition: { x: targetTransform.x, y: targetTransform.y },
          });

          if (trigger.once) {
            trigger.active = false;
            trigger.entitiesInside.clear();
            break;
          }
        } else if (!isInside && wasInside) {
          trigger.entitiesInside.delete(targetId);
          if (trigger.eventOnExit) {
            this._emit(trigger.eventOnExit, {
              triggerId,
              trigger,
              targetId,
              radius: trigger.radius,
              data: trigger.data,
              triggerPosition: { x: triggerTransform.x, y: triggerTransform.y },
              targetPosition: { x: targetTransform.x, y: targetTransform.y },
            });
          }
        }
      }

      // Clean up stale tracked entities that no longer meet requirements
      if (trigger.entitiesInside.size > 0) {
        for (const trackedId of Array.from(trigger.entitiesInside)) {
          if (
            !entityManager.hasEntity(trackedId) ||
            !entityManager.isActive(trackedId) ||
            !this.componentRegistry.hasComponent(trackedId, 'Transform') ||
            !this._matchesRequirements(trigger, trackedId)
          ) {
            trigger.entitiesInside.delete(trackedId);
            if (trigger.eventOnExit) {
              this._emit(trigger.eventOnExit, {
                triggerId,
                trigger,
                targetId: trackedId,
                radius: trigger.radius,
                data: trigger.data,
                triggerPosition: { x: triggerTransform.x, y: triggerTransform.y },
              });
            }
          }
        }
      }
    }
  }

  _resolveCandidateEntities(trigger, triggerId) {
    const entityManager = this.componentRegistry.entityManager;

    if (trigger.targets && trigger.targets.size > 0) {
      return new Set(trigger.targets);
    }

    if (trigger.targetTags && trigger.targetTags.size > 0) {
      const ids = new Set();
      for (const tag of trigger.targetTags) {
        const taggedEntities = entityManager.getEntitiesByTag(tag);
        for (const id of taggedEntities) {
          ids.add(id);
        }
      }
      return ids;
    }

    if (trigger.requiredComponents && trigger.requiredComponents.length > 0) {
      const uniqueComponents = Array.from(
        new Set(['Transform', ...trigger.requiredComponents.filter((type) => type !== 'Transform')])
      );
      return new Set(this.componentRegistry.queryEntities(...uniqueComponents));
    }

    return new Set(this.componentRegistry.queryEntities('Transform'));
  }

  _matchesRequirements(trigger, entityId) {
    const entityManager = this.componentRegistry.entityManager;
    const entityTag = entityManager.getTag(entityId) || null;

    if (typeof trigger.matchesTarget === 'function') {
      if (!trigger.matchesTarget(entityId, entityTag)) {
        return false;
      }
    } else {
      if (trigger.targets && trigger.targets.size > 0 && !trigger.targets.has(entityId)) {
        return false;
      }
      if (
        trigger.targetTags &&
        trigger.targetTags.size > 0 &&
        (!entityTag || !trigger.targetTags.has(entityTag))
      ) {
        return false;
      }
    }

    if (trigger.requiredComponents && trigger.requiredComponents.length > 0) {
      for (const type of trigger.requiredComponents) {
        if (!this.componentRegistry.hasComponent(entityId, type)) {
          return false;
        }
      }
    }

    return true;
  }

  _emit(eventName, payload) {
    if (!eventName || !this.eventBus || typeof this.eventBus.emit !== 'function') {
      return;
    }
    this.eventBus.emit(eventName, payload);
  }
}
