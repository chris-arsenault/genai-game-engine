import { EntityManager } from '../../../src/engine/ecs/EntityManager.js';
import { ComponentRegistry } from '../../../src/engine/ecs/ComponentRegistry.js';
import { EventBus } from '../../../src/engine/events/EventBus.js';
import {
  loadMemoryParlorScene,
  unloadMemoryParlorScene,
} from '../../../src/game/scenes/MemoryParlorScene.js';
import { GameConfig } from '../../../src/game/config/GameConfig.js';

const DETECTION_VISUALS = GameConfig.stealth.visuals.memoryParlor;
const HIGHLIGHT_DURATION_MS = 1600;

describe('MemoryParlorScene readability enhancements', () => {
  let entityManager;
  let componentRegistry;
  let eventBus;
  let sceneData;
  let promptEvents;
  let offPrompt;

  beforeEach(async () => {
    jest.useFakeTimers();
    entityManager = new EntityManager();
    componentRegistry = new ComponentRegistry(entityManager);
    eventBus = new EventBus();
    promptEvents = [];
    offPrompt = eventBus.on('ui:show_prompt', (payload) => {
      promptEvents.push(payload);
    });
    sceneData = await loadMemoryParlorScene(entityManager, componentRegistry, eventBus);
  });

  afterEach(() => {
    if (typeof offPrompt === 'function') {
      offPrompt();
    }
    if (sceneData) {
      unloadMemoryParlorScene(entityManager, componentRegistry, sceneData.sceneEntities);
      if (typeof sceneData.cleanup === 'function') {
        sceneData.cleanup();
      }
    }
    jest.useRealTimers();
  });

  function getDetectionSprite(zoneId) {
    for (const entityId of sceneData.sceneEntities) {
      const zone = componentRegistry.getComponent(entityId, 'InteractionZone');
      if (zone && zone.id === zoneId) {
        return {
          sprite: componentRegistry.getComponent(entityId, 'Sprite'),
          zone,
        };
      }
    }
    return { sprite: null, zone: null };
  }

  it('highlights guard detection halos and emits prompts when sweep zones trigger', () => {
    const { sprite } = getDetectionSprite('memory_parlor_detection_guard_a');
    expect(sprite).toBeTruthy();
    const baseAlpha = DETECTION_VISUALS.baseAlpha;
    expect(sprite.alpha).toBeCloseTo(baseAlpha, 2);

    eventBus.emit('area:entered', {
      areaId: 'memory_parlor_detection_guard_a',
      position: { x: 700, y: 280 },
    });

    expect(promptEvents.length).toBe(1);
    expect(promptEvents[0].text).toMatch(/guard/i);
    expect(sprite.alpha).toBeGreaterThan(baseAlpha);

    jest.advanceTimersByTime(HIGHLIGHT_DURATION_MS + 25);
    expect(sprite.alpha).toBeCloseTo(baseAlpha, 2);
  });

  it('switches detection halo palette to safe mode while scrambler is active', () => {
    const { sprite } = getDetectionSprite('memory_parlor_detection_guard_b');
    expect(sprite).toBeTruthy();
    const safeColor = DETECTION_VISUALS.safeColor;

    eventBus.emit('firewall:scrambler_activated', { areaId: 'memory_parlor_firewall' });

    expect(sprite.color).toBe(safeColor);
    expect(sprite.alpha).toBeCloseTo(
      DETECTION_VISUALS.safeBaseAlpha ?? DETECTION_VISUALS.baseAlpha,
      2
    );

    eventBus.emit('area:entered', { areaId: 'memory_parlor_detection_guard_b' });
    expect(sprite.alpha).toBeGreaterThan(
      DETECTION_VISUALS.safeBaseAlpha ?? DETECTION_VISUALS.baseAlpha
    );

    jest.advanceTimersByTime(HIGHLIGHT_DURATION_MS + 25);
    expect(sprite.alpha).toBeCloseTo(
      DETECTION_VISUALS.safeBaseAlpha ?? DETECTION_VISUALS.baseAlpha,
      2
    );

    eventBus.emit('firewall:scrambler_expired');
    expect(sprite.color).toBe(DETECTION_VISUALS.dangerColor);
    expect(sprite.alpha).toBeCloseTo(DETECTION_VISUALS.baseAlpha, 2);
  });
});
