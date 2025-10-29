/**
 * Trigger Component
 *
 * Represents an area trigger that emits enter/exit events when matching entities
 * move inside/outside a radius. Supports restricting targets by entity IDs,
 * tags, or required components, and can act as a one-shot trigger.
 */
export class Trigger {
  constructor({
    id = null,
    radius = 64,
    eventOnEnter = 'trigger:entered',
    eventOnExit = 'trigger:exited',
    once = false,
    active = true,
    targets = null,
    targetTags = null,
    requiredComponents = [],
    data = {},
  } = {}) {
    this.id = id;
    this.radius = radius;
    this.eventOnEnter = eventOnEnter;
    this.eventOnExit = eventOnExit;
    this.once = once;
    this.active = active;
    this.data = data || {};

    this.targets = targets
      ? new Set(Array.isArray(targets) ? targets : [targets])
      : null;
    this.targetTags = targetTags
      ? new Set(Array.isArray(targetTags) ? targetTags : [targetTags])
      : null;
    this.requiredComponents = Array.isArray(requiredComponents)
      ? Array.from(new Set(requiredComponents))
      : [];

    this.entitiesInside = new Set();
  }

  /**
   * Check if an entity by ID/tag is allowed to trigger.
   * @param {number} entityId
   * @param {string|null} tag
   * @returns {boolean}
   */
  matchesTarget(entityId, tag) {
    if (this.targets && this.targets.size > 0 && !this.targets.has(entityId)) {
      return false;
    }

    if (this.targetTags && this.targetTags.size > 0 && (!tag || !this.targetTags.has(tag))) {
      return false;
    }

    return true;
  }

  /**
   * Clear runtime tracking data.
   */
  reset() {
    this.entitiesInside.clear();
    this.active = true;
  }
}
