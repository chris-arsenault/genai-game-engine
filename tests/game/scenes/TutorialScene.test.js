import { TutorialScene } from '../../../src/game/scenes/TutorialScene.js';
import { EventBus } from '../../../src/engine/events/EventBus.js';
import { EntityManager } from '../../../src/engine/ecs/EntityManager.js';
import { ComponentRegistry } from '../../../src/engine/ecs/ComponentRegistry.js';
import { CaseManager } from '../../../src/game/managers/CaseManager.js';
import { InvestigationSystem } from '../../../src/game/systems/InvestigationSystem.js';

describe('TutorialScene integration', () => {
  it('spawns evidence compatible with investigation detection radius', async () => {
    const eventBus = new EventBus();
    const entityManager = new EntityManager();
    const componentRegistry = new ComponentRegistry(entityManager);
    const caseManager = new CaseManager(eventBus);

    const game = {
      entityManager,
      componentRegistry,
      caseManager,
      eventBus,
    };

    const tutorialScene = new TutorialScene(game);
    await tutorialScene.load();

    expect(tutorialScene.evidenceEntities.size).toBeGreaterThan(0);
    expect(tutorialScene.playerEntityId).not.toBeNull();

    const [firstEvidenceId] = tutorialScene.evidenceEntities.values();
    const evidenceTransform = componentRegistry.getComponent(firstEvidenceId, 'Transform');
    const evidenceComponent = componentRegistry.getComponent(firstEvidenceId, 'Evidence');

    expect(evidenceTransform).toBeDefined();
    expect(evidenceComponent).toBeDefined();

    const playerTransform = componentRegistry.getComponent(tutorialScene.playerEntityId, 'Transform');
    expect(playerTransform).toBeDefined();

    // Move player into evidence radius to trigger detection
    playerTransform.x = evidenceTransform.x;
    playerTransform.y = evidenceTransform.y;

    const investigationSystem = new InvestigationSystem(componentRegistry, eventBus);
    investigationSystem.init();

    let detected = 0;
    eventBus.on('evidence:detected', () => {
      detected += 1;
    });

    const entityIds = entityManager.getAllEntities();
    investigationSystem.scanForEvidence(playerTransform, entityIds);

    expect(detected).toBeGreaterThan(0);

    tutorialScene.unload();
  });
});
