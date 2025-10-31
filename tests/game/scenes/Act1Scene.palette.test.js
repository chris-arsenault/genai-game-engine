import { EventBus } from '../../../src/engine/events/EventBus.js';
import { EntityManager } from '../../../src/engine/ecs/EntityManager.js';
import { ComponentRegistry } from '../../../src/engine/ecs/ComponentRegistry.js';
import { loadAct1Scene, unloadAct1Scene } from '../../../src/game/scenes/Act1Scene.js';

describe('Act1Scene palette metadata', () => {
  it('captures core crime scene palette elements for QA', async () => {
    const eventBus = new EventBus();
    const entityManager = new EntityManager();
    const componentRegistry = new ComponentRegistry(entityManager);

    const sceneData = await loadAct1Scene(entityManager, componentRegistry, eventBus);
    const paletteSummary = sceneData.metadata?.paletteSummary;

    expect(paletteSummary).toBeDefined();
    expect(paletteSummary.groundDecal).toMatchObject({
      color: '#141d2c',
      layer: 'ground',
    });
    expect(paletteSummary.groundDecal.alpha).toBeCloseTo(0.82, 5);

    expect(paletteSummary.crimeSceneArea).toMatchObject({
      color: '#ff6f61',
      layer: 'ground',
    });
    expect(paletteSummary.crimeSceneArea.alpha).toBeCloseTo(0.18, 5);

    expect(paletteSummary.cautionTape).toHaveLength(2);
    expect(paletteSummary.cautionTape.map((entry) => entry.color)).toEqual([
      '#f9c74f',
      '#f9c74f',
    ]);

    expect(paletteSummary.evidenceMarkers).toHaveLength(4);
    expect(paletteSummary.evidenceMarkers.every((entry) => entry.color === '#ffd166')).toBe(true);

    expect(paletteSummary.ambientProps).toHaveLength(4);
    const ambientIds = paletteSummary.ambientProps.map((entry) => entry.id).sort();
    expect(ambientIds).toEqual([
      'ambient_evidence_table',
      'ambient_floodlight_left',
      'ambient_floodlight_right',
      'ambient_holo_screen',
    ]);

    expect(paletteSummary.boundaries).toHaveLength(4);
    expect(paletteSummary.boundaries.every((entry) => entry.color === '#2f3d5c')).toBe(true);

    if (typeof sceneData.cleanup === 'function') {
      sceneData.cleanup();
    }
    unloadAct1Scene(entityManager, sceneData.sceneEntities);
  });
});
