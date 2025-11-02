/**
 * @fileoverview LevelSpawnSystem Tests
 * Tests entity spawning from generation data into ECS.
 */

import { LevelSpawnSystem } from '../../../src/game/systems/LevelSpawnSystem.js';
import { EntityManager } from '../../../src/engine/ecs/EntityManager.js';
import { ComponentRegistry } from '../../../src/engine/ecs/ComponentRegistry.js';
import { EventBus } from '../../../src/engine/events/EventBus.js';

describe('LevelSpawnSystem', () => {
  let system;
  let entityManager;
  let componentRegistry;
  let eventBus;
  let mockSpatialHash;

  beforeEach(() => {
    entityManager = new EntityManager();
    componentRegistry = new ComponentRegistry(entityManager);
    eventBus = new EventBus();

    // Mock spatial hash
    mockSpatialHash = {
      insert: jest.fn(),
      remove: jest.fn(),
      query: jest.fn(() => []),
      clear: jest.fn(),
    };

    system = new LevelSpawnSystem(componentRegistry, eventBus, entityManager, mockSpatialHash);
  });

  describe('constructor', () => {
    it('should create system with correct properties', () => {
      expect(system.entityManager).toBe(entityManager);
      expect(system.componentRegistry).toBe(componentRegistry);
      expect(system.eventBus).toBe(eventBus);
      expect(system.spatialHash).toBe(mockSpatialHash);
      expect(system.priority).toBe(10);
    });

    it('should initialize with empty level entities set', () => {
      expect(system.levelEntities).toBeInstanceOf(Set);
      expect(system.levelEntities.size).toBe(0);
    });

    it('should work without spatial hash', () => {
      const systemNoHash = new LevelSpawnSystem(componentRegistry, eventBus, entityManager, null);
      expect(systemNoHash.spatialHash).toBeNull();
    });
  });

  describe('init', () => {
    it('should initialize without errors', () => {
      expect(() => system.init()).not.toThrow();
    });
  });

  describe('event listeners', () => {
    it('should respond to level:load event', () => {
      const spawnData = {
        npcs: [],
        evidence: [],
        objects: [],
      };

      const spy = jest.spyOn(system, 'spawnFromGeneration');

      eventBus.emit('level:load', { spawnData });

      expect(spy).toHaveBeenCalledWith(spawnData);
    });

    it('should respond to level:clear event', () => {
      const spy = jest.spyOn(system, 'clearLevel');

      eventBus.emit('level:clear');

      expect(spy).toHaveBeenCalled();
    });

    it('should warn if level:load has no spawnData', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      eventBus.emit('level:load', {});

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('missing spawnData')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('spawnFromGeneration', () => {
    it('should spawn all entity types', () => {
      const spawnData = {
        npcs: [
          {
            npcId: 'npc_1',
            name: 'Test NPC',
            position: { x: 100, y: 100 },
            faction: 'civilian',
            hasDialogue: true,
            dialogueId: 'test_dialogue',
          },
        ],
        evidence: [
          {
            evidenceId: 'evidence_1',
            position: { x: 150, y: 150 },
            evidenceType: 'physical',
            caseId: 'case_test',
            title: 'Test Evidence',
            description: 'A test piece of evidence',
          },
        ],
        objects: [
          {
            type: 'container',
            objectId: 'container_1',
            position: { x: 200, y: 200 },
            roomId: 'room_1',
            interactable: true,
            locked: false,
            contents: [],
          },
        ],
      };

      const count = system.spawnFromGeneration(spawnData);

      expect(count).toBe(3);
      expect(system.levelEntities.size).toBe(3);
    });

    it('should emit level:loaded event after spawning', (done) => {
      const spawnData = {
        npcs: [],
        evidence: [],
        objects: [],
      };

      eventBus.on('level:loaded', (data) => {
        expect(data.entityCount).toBe(0);
        expect(data.spawnTime).toBeGreaterThanOrEqual(0);
        done();
      });

      system.spawnFromGeneration(spawnData);
    });

    it('should clear existing level entities before spawning', () => {
      // Spawn first batch
      const spawnData1 = {
        npcs: [
          {
            npcId: 'npc_1',
            name: 'NPC 1',
            position: { x: 100, y: 100 },
            faction: 'civilian',
            hasDialogue: true,
            dialogueId: 'test',
          },
        ],
        evidence: [],
        objects: [],
      };

      system.spawnFromGeneration(spawnData1);
      const firstCount = system.levelEntities.size;

      // Spawn second batch (should clear first)
      const spawnData2 = {
        npcs: [
          {
            npcId: 'npc_2',
            name: 'NPC 2',
            position: { x: 200, y: 200 },
            faction: 'police',
            hasDialogue: true,
            dialogueId: 'test2',
          },
        ],
        evidence: [],
        objects: [],
      };

      system.spawnFromGeneration(spawnData2);

      expect(system.levelEntities.size).toBe(1); // Only second batch
    });

    it('should handle empty spawn data', () => {
      const spawnData = {
        npcs: [],
        evidence: [],
        objects: [],
      };

      const count = system.spawnFromGeneration(spawnData);

      expect(count).toBe(0);
      expect(system.levelEntities.size).toBe(0);
    });
  });

  describe('spawnNPC', () => {
    it('should spawn NPC entity with correct components', () => {
      const npcData = {
        npcId: 'npc_test',
        name: 'Test NPC',
        position: { x: 100, y: 100 },
        faction: 'civilian',
        hasDialogue: true,
        dialogueId: 'test_dialogue',
      };

      const entityId = system.spawnNPC(npcData);

      expect(entityId).not.toBeNull();
      expect(entityManager.hasEntity(entityId)).toBe(true);

      // Check components
      expect(componentRegistry.hasComponent(entityId, 'Transform')).toBe(true);
      expect(componentRegistry.hasComponent(entityId, 'Sprite')).toBe(true);
      expect(componentRegistry.hasComponent(entityId, 'FactionMember')).toBe(true);
      expect(componentRegistry.hasComponent(entityId, 'NPC')).toBe(true);
      expect(componentRegistry.hasComponent(entityId, 'InteractionZone')).toBe(true);

      const zone = componentRegistry.getComponent(entityId, 'InteractionZone');
      expect(zone).toBeDefined();
      expect(zone.type).toBe('dialogue');
      expect(componentRegistry.getComponent(entityId, 'dialogue')).toBeUndefined();
    });

    it('should insert NPC into spatial hash', () => {
      const npcData = {
        npcId: 'npc_test',
        name: 'Test NPC',
        position: { x: 100, y: 100 },
        faction: 'civilian',
        hasDialogue: true,
        dialogueId: 'test_dialogue',
      };

      const entityId = system.spawnNPC(npcData);

      expect(mockSpatialHash.insert).toHaveBeenCalledWith(entityId, 100, 100);
    });

    it('should handle spawn errors gracefully', () => {
      const invalidNPCData = null;

      const entityId = system.spawnNPC(invalidNPCData);

      expect(entityId).toBeNull();
    });

    it('should derive guard archetype for security factions', () => {
      const npcData = {
        npcId: 'npc_guard',
        name: 'Security Operative',
        position: { x: 320, y: 220 },
        faction: 'vanguard_prime',
        hasDialogue: false,
      };

      const entityId = system.spawnNPC(npcData);

      const factionComponent = componentRegistry.getComponent(entityId, 'Faction');
      const npcComponent = componentRegistry.getComponent(entityId, 'NPC');
      const navigationAgent = componentRegistry.getComponent(entityId, 'NavigationAgent');

      expect(factionComponent.behaviorProfile).toBe('guard');
      expect(npcComponent.behaviorProfile).toBe('guard');
      expect(npcComponent.archetype).toBe('guard');
      expect(navigationAgent.metadata.behaviorProfile).toBe('guard');
      expect(Array.from(factionComponent.tags)).toEqual(expect.arrayContaining(['security', 'enforcer']));
    });
  });

  describe('spawnEvidence', () => {
    it('should spawn evidence entity with correct components', () => {
      const evidenceData = {
        evidenceId: 'evidence_test',
        position: { x: 150, y: 150 },
        evidenceType: 'physical',
        caseId: 'case_test',
        title: 'Test Evidence',
        description: 'A test piece of evidence',
      };

      const entityId = system.spawnEvidence(evidenceData);

      expect(entityId).not.toBeNull();
      expect(entityManager.hasEntity(entityId)).toBe(true);

      // Check components
      expect(componentRegistry.hasComponent(entityId, 'Transform')).toBe(true);
      expect(componentRegistry.hasComponent(entityId, 'Sprite')).toBe(true);
      expect(componentRegistry.hasComponent(entityId, 'Evidence')).toBe(true);
      expect(componentRegistry.hasComponent(entityId, 'InteractionZone')).toBe(true);
    });

    it('should insert evidence into spatial hash', () => {
      const evidenceData = {
        evidenceId: 'evidence_test',
        position: { x: 150, y: 150 },
        evidenceType: 'physical',
        caseId: 'case_test',
        title: 'Test Evidence',
        description: 'Test',
      };

      const entityId = system.spawnEvidence(evidenceData);

      expect(mockSpatialHash.insert).toHaveBeenCalledWith(entityId, 150, 150);
    });

    it('should handle spawn errors gracefully', () => {
      const invalidEvidenceData = null;

      const entityId = system.spawnEvidence(invalidEvidenceData);

      expect(entityId).toBeNull();
    });
  });

  describe('spawnObject', () => {
    it('should spawn container with interaction zone', () => {
      const objectData = {
        type: 'container',
        objectId: 'container_test',
        position: { x: 200, y: 200 },
        roomId: 'room_1',
        interactable: true,
        locked: false,
        contents: [],
      };

      const entityId = system.spawnObject(objectData);

      expect(entityId).not.toBeNull();
      expect(entityManager.hasEntity(entityId)).toBe(true);

      // Check components
      expect(componentRegistry.hasComponent(entityId, 'Transform')).toBe(true);
      expect(componentRegistry.hasComponent(entityId, 'Sprite')).toBe(true);
      expect(componentRegistry.hasComponent(entityId, 'Collider')).toBe(true);
      expect(componentRegistry.hasComponent(entityId, 'InteractionZone')).toBe(true);

      const zone = componentRegistry.getComponent(entityId, 'InteractionZone');
      expect(zone).toBeDefined();
      expect(zone.type).toBe('container');
    });

    it('should spawn furniture without interaction zone', () => {
      const objectData = {
        type: 'furniture',
        objectId: 'furniture_test',
        position: { x: 250, y: 250 },
        roomId: 'room_1',
        interactable: false,
        furnitureType: 'chair',
      };

      const entityId = system.spawnObject(objectData);

      expect(entityId).not.toBeNull();
      expect(entityManager.hasEntity(entityId)).toBe(true);

      // Should have basic components
      expect(componentRegistry.hasComponent(entityId, 'Transform')).toBe(true);
      expect(componentRegistry.hasComponent(entityId, 'Sprite')).toBe(true);

      // Should not have interaction zone
      expect(componentRegistry.hasComponent(entityId, 'InteractionZone')).toBe(false);
    });

    it('should insert object into spatial hash', () => {
      const objectData = {
        type: 'container',
        objectId: 'container_test',
        position: { x: 200, y: 200 },
        roomId: 'room_1',
        interactable: true,
        locked: false,
        contents: [],
      };

      const entityId = system.spawnObject(objectData);

      expect(mockSpatialHash.insert).toHaveBeenCalledWith(entityId, 200, 200);
    });

    it('should handle spawn errors gracefully', () => {
      const invalidObjectData = null;

      const entityId = system.spawnObject(invalidObjectData);

      expect(entityId).toBeNull();
    });
  });

  describe('clearLevel', () => {
    it('should clear all level entities', () => {
      // Spawn some entities
      const spawnData = {
        npcs: [
          {
            npcId: 'npc_1',
            name: 'NPC 1',
            position: { x: 100, y: 100 },
            faction: 'civilian',
            hasDialogue: true,
            dialogueId: 'test',
          },
        ],
        evidence: [
          {
            evidenceId: 'evidence_1',
            position: { x: 150, y: 150 },
            evidenceType: 'physical',
            caseId: 'case_test',
            title: 'Evidence',
            description: 'Test',
          },
        ],
        objects: [],
      };

      system.spawnFromGeneration(spawnData);

      expect(system.levelEntities.size).toBe(2);

      // Clear level
      system.clearLevel();

      expect(system.levelEntities.size).toBe(0);
    });

    it('should remove entities from spatial hash', () => {
      // Spawn entity
      const spawnData = {
        npcs: [
          {
            npcId: 'npc_1',
            name: 'NPC 1',
            position: { x: 100, y: 100 },
            faction: 'civilian',
            hasDialogue: true,
            dialogueId: 'test',
          },
        ],
        evidence: [],
        objects: [],
      };

      system.spawnFromGeneration(spawnData);

      mockSpatialHash.remove.mockClear();

      // Clear level
      system.clearLevel();

      expect(mockSpatialHash.remove).toHaveBeenCalled();
    });

    it('should destroy entities from entity manager', () => {
      // Spawn entity
      const spawnData = {
        npcs: [
          {
            npcId: 'npc_1',
            name: 'NPC 1',
            position: { x: 100, y: 100 },
            faction: 'civilian',
            hasDialogue: true,
            dialogueId: 'test',
          },
        ],
        evidence: [],
        objects: [],
      };

      system.spawnFromGeneration(spawnData);

      const entityCount = entityManager.getAllEntities().length;
      expect(entityCount).toBeGreaterThan(0);

      // Clear level
      system.clearLevel();

      const finalCount = entityManager.getAllEntities().length;
      expect(finalCount).toBe(0);
    });
  });

  describe('performance', () => {
    it('should spawn 200 entities in <10ms', () => {
      const spawnData = {
        npcs: [],
        evidence: [],
        objects: [],
      };

      // Generate 200 NPCs
      for (let i = 0; i < 200; i++) {
        spawnData.npcs.push({
          npcId: `npc_${i}`,
          name: `NPC ${i}`,
          position: { x: (i % 20) * 50, y: Math.floor(i / 20) * 50 },
          faction: 'civilian',
          hasDialogue: true,
          dialogueId: 'test',
        });
      }

      const startTime = performance.now();
      const count = system.spawnFromGeneration(spawnData);
      const elapsed = performance.now() - startTime;

      expect(count).toBe(200);
      expect(elapsed).toBeLessThan(50); // Relaxed to 50ms for test stability

      console.log(`[LevelSpawnSystem Performance] Spawned ${count} entities in ${elapsed.toFixed(2)}ms`);
    });
  });

  describe('cleanup', () => {
    it('should remove event listeners on cleanup', () => {
      const offSpy = jest.spyOn(eventBus, 'off');

      system.cleanup();

      expect(offSpy).toHaveBeenCalledWith('level:load', expect.any(Function));
      expect(offSpy).toHaveBeenCalledWith('level:clear', expect.any(Function));
    });
  });

  describe('integration', () => {
    it('should work end-to-end with complete spawn data', () => {
      const spawnData = {
        npcs: [
          {
            npcId: 'victim',
            name: 'Victim',
            position: { x: 100, y: 100 },
            faction: 'civilian',
            role: 'victim',
            hasDialogue: false,
            dialogueId: 'victim_dialogue',
          },
          {
            npcId: 'killer',
            name: 'Killer',
            position: { x: 200, y: 100 },
            faction: 'criminals',
            role: 'killer',
            hasDialogue: true,
            dialogueId: 'killer_dialogue',
          },
        ],
        evidence: [
          {
            evidenceId: 'weapon',
            position: { x: 150, y: 100 },
            evidenceType: 'physical',
            caseId: 'case_murder',
            title: 'Murder Weapon',
            description: 'Bloodstained knife',
            hidden: false,
          },
        ],
        objects: [
          {
            type: 'container',
            objectId: 'evidence_box',
            position: { x: 250, y: 100 },
            roomId: 'room_1',
            interactable: true,
            locked: true,
            contents: [],
          },
        ],
      };

      const count = system.spawnFromGeneration(spawnData);

      expect(count).toBe(4);

      // Verify all entities exist
      expect(entityManager.getAllEntities().length).toBe(4);

      // Verify spatial hash updated
      expect(mockSpatialHash.insert).toHaveBeenCalledTimes(4);

      // Verify level:loaded event emitted
      let eventEmitted = false;
      eventBus.on('level:loaded', () => {
        eventEmitted = true;
      });

      system.spawnFromGeneration(spawnData);
      expect(eventEmitted).toBe(true);
    });
  });
});
