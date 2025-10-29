import { Trigger } from '../../engine/physics/Trigger.js';
import { QuestTriggerRegistry } from './QuestTriggerRegistry.js';

/**
 * TriggerMigrationToolkit
 *
 * Utility facade used when migrating legacy Act 1 trigger logic onto the
 * standardized Trigger component schema.
 */
export class TriggerMigrationToolkit {
  /**
   * @param {object} componentRegistry
   * @param {import('../../engine/events/EventBus.js').EventBus|null} eventBus
   * @param {{ registry?: typeof QuestTriggerRegistry, eventOnEnter?: string, eventOnExit?: string }} [options]
   */
  constructor(componentRegistry, eventBus, options = {}) {
    this.componentRegistry = componentRegistry;
    this.eventBus = eventBus || null;
    this.registry = options.registry || QuestTriggerRegistry;
    this.eventOnEnter = options.eventOnEnter || 'area:entered';
    this.eventOnExit = options.eventOnExit || 'area:exited';
  }

  /**
   * Convert a legacy InteractionZone config to Trigger schema and attach components.
   * @param {number} entityId
   * @param {object} legacyConfig
   * @returns {Trigger}
   */
  migrateInteractionZone(entityId, legacyConfig = {}) {
    const definition = normaliseLegacyConfig(legacyConfig);
    let registryDefinition = this.registry.getTriggerDefinition(definition.id);
    if (!registryDefinition) {
      registryDefinition = this.registry.registerDefinition(definition);
    }
    return this.createQuestTrigger(entityId, registryDefinition);
  }

  /**
   * Create a quest trigger using registry definition or explicit config.
   * @param {number} entityId
   * @param {string|object} source
   * @returns {Trigger}
   */
  createQuestTrigger(entityId, source) {
    let definition;
    if (typeof source === 'string') {
      definition = this.registry.getTriggerDefinition(source);
      if (!definition) {
        throw new Error(`[TriggerMigrationToolkit] Unknown trigger id "${source}"`);
      }
    } else if (source && typeof source === 'object') {
      definition = normaliseLegacyConfig(source);
      if (!this.registry.getTriggerDefinition(definition.id)) {
        this.registry.registerDefinition(definition);
      }
    } else {
      throw new Error('[TriggerMigrationToolkit] Source definition is required');
    }

    const areaId = definition.areaId || definition.id;
    const triggerComponent = new Trigger({
      id: areaId,
      radius: definition.radius,
      once: definition.once,
      eventOnEnter: this.eventOnEnter,
      eventOnExit: this.eventOnExit,
      targetTags: ['player'],
      requiredComponents: ['Transform'],
      data: {
        areaId,
        questTrigger: true,
        questId: definition.questId,
        objectiveId: definition.objectiveId,
        triggerType: definition.triggerType,
        prompt: definition.prompt,
        metadata: {
          ...(definition.metadata || {}),
        },
      },
    });

    if (this.componentRegistry && typeof this.componentRegistry.addComponent === 'function') {
      this.componentRegistry.addComponent(entityId, 'Trigger', triggerComponent);
    }
    this.registry.markMigrated(definition.id);
    return triggerComponent;
  }

  /**
   * List trigger definitions that still require migration work.
   * @returns {Array<object>}
   */
  listOutstandingMigrations() {
    return this.registry.listOutstandingMigrations();
  }
}

function normaliseLegacyConfig(config = {}) {
  const id = sanitise(config.triggerId || config.id || config.areaId);
  if (!id) {
    throw new Error('[TriggerMigrationToolkit] Legacy config missing id/triggerId');
  }

  const questId = sanitise(config.questId || config.quest?.id);
  if (!questId) {
    throw new Error('[TriggerMigrationToolkit] Legacy config missing questId');
  }

  const objectiveId = sanitise(config.objectiveId || config.objective?.id);
  if (!objectiveId) {
    throw new Error('[TriggerMigrationToolkit] Legacy config missing objectiveId');
  }

  const areaId = sanitise(config.areaId) || `${id}_area`;

  return {
    id,
    questId,
    objectiveId,
    areaId,
    radius: normaliseNumber(config.radius ?? config.triggerRadius, 96),
    once: config.once ?? config.oneShot ?? true,
    prompt: typeof config.prompt === 'string' ? config.prompt : null,
    triggerType: config.triggerType || 'quest_area',
    metadata: {
      ...(config.metadata || {}),
      legacySource: config.legacySource || null,
    },
    migrated: Boolean(config.migrated),
  };
}

function sanitise(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normaliseNumber(value, fallback) {
  if (Number.isFinite(value)) {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

