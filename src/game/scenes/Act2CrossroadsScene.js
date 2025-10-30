/**
 * Act2CrossroadsScene - Hub space for Act 2 branching investigation threads.
 *
 * Provides placeholder trigger zones driven by registry-backed definitions so
 * the TriggerMigrationToolkit can attach quest metadata and analytics hooks.
 */
import { Transform } from '../components/Transform.js';
import { Sprite } from '../components/Sprite.js';
import { TriggerMigrationToolkit } from '../quests/TriggerMigrationToolkit.js';
import { QuestTriggerRegistry } from '../quests/QuestTriggerRegistry.js';
import { seedAct2CrossroadsTriggers } from '../data/quests/act2TriggerDefinitions.js';

export const ACT2_CROSSROADS_TRIGGER_IDS = Object.freeze({
  CHECKPOINT: 'act2_crossroads_checkpoint',
  BRIEFING: 'act2_crossroads_briefing',
  THREAD_SELECT: 'act2_crossroads_thread_select',
});

const TRIGGER_LAYOUT = Object.freeze({
  [ACT2_CROSSROADS_TRIGGER_IDS.CHECKPOINT]: {
    x: 720,
    y: 280,
    radius: 128,
    color: '#2d9cec',
    alpha: 0.24,
    layer: 'ground_fx',
    zIndex: 2,
  },
  [ACT2_CROSSROADS_TRIGGER_IDS.BRIEFING]: {
    x: 480,
    y: 360,
    radius: 110,
    color: '#7b5be6',
    alpha: 0.28,
    layer: 'ground_fx',
    zIndex: 2,
  },
  [ACT2_CROSSROADS_TRIGGER_IDS.THREAD_SELECT]: {
    x: 560,
    y: 180,
    radius: 96,
    color: '#f7705c',
    alpha: 0.22,
    layer: 'ground_fx',
    zIndex: 2,
  },
});

function ensureAct2TriggerDefinitions() {
  seedAct2CrossroadsTriggers(QuestTriggerRegistry);
}

export class Act2CrossroadsScene {
  /**
   * @param {object} deps
   * @param {import('../../engine/ecs/EntityManager.js').EntityManager} deps.entityManager
   * @param {import('../../engine/ecs/ComponentRegistry.js').ComponentRegistry} deps.componentRegistry
   * @param {import('../../engine/events/EventBus.js').EventBus} deps.eventBus
   */
  constructor({ entityManager, componentRegistry, eventBus }) {
    this.entityManager = entityManager;
    this.componentRegistry = componentRegistry;
    this.eventBus = eventBus;
    this.loaded = false;
    this.sceneEntities = new Set();
    this._questTriggerToolkit = null;
  }

  /**
   * Load the Act 2 Crossroads hub and attach registry-backed triggers.
   */
  async load() {
    if (this.loaded) {
      console.warn('[Act2CrossroadsScene] Already loaded');
      return;
    }

    ensureAct2TriggerDefinitions();

    this._questTriggerToolkit = new TriggerMigrationToolkit(this.componentRegistry, this.eventBus);

    for (const [triggerId, layout] of Object.entries(TRIGGER_LAYOUT)) {
      const definition = QuestTriggerRegistry.getTriggerDefinition(triggerId);
      if (!definition) {
        console.warn(
          `[Act2CrossroadsScene] Missing registry definition for trigger "${triggerId}". Skipping.`
        );
        continue;
      }
      const entityId = this._createTriggerEntity(triggerId, layout, definition.radius);
      this._questTriggerToolkit.createQuestTrigger(entityId, definition);
      this.sceneEntities.add(entityId);
    }

    this.loaded = true;

    this.eventBus?.emit?.('scene:loaded', {
      sceneId: 'act2_crossroads',
      triggers: Array.from(this.sceneEntities),
    });
  }

  /**
   * Unload the scene and dispose of temporary entities.
   */
  unload() {
    for (const entityId of this.sceneEntities) {
      if (this.componentRegistry?.removeAllComponents) {
        this.componentRegistry.removeAllComponents(entityId);
      }
      if (this.entityManager?.hasEntity(entityId)) {
        this.entityManager.destroyEntity(entityId);
      }
    }
    this.sceneEntities.clear();
    this.loaded = false;
    this._questTriggerToolkit = null;
  }

  _createTriggerEntity(triggerId, layout, fallbackRadius) {
    const entityId = this.entityManager.createEntity(triggerId);
    const radius = layout.radius ?? fallbackRadius ?? 96;
    const diameter = radius * 2;

    this.componentRegistry.addComponent(
      entityId,
      'Transform',
      new Transform(layout.x ?? 0, layout.y ?? 0, 0, 1, 1)
    );

    this.componentRegistry.addComponent(
      entityId,
      'Sprite',
      new Sprite({
        image: null,
        width: diameter,
        height: diameter,
        color: layout.color ?? '#53d6a2',
        alpha: layout.alpha ?? 0.3,
        layer: layout.layer ?? 'ground_fx',
        zIndex: layout.zIndex ?? 1,
        visible: true,
      })
    );

    return entityId;
  }
}
