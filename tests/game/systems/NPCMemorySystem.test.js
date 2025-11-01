import { NPCMemorySystem } from '../../../src/game/systems/NPCMemorySystem.js';
import { NPC } from '../../../src/game/components/NPC.js';
import { FactionMember } from '../../../src/game/components/FactionMember.js';
import { Transform } from '../../../src/game/components/Transform.js';
import { EventBus } from '../../../src/engine/events/EventBus.js';

function createMockComponentRegistry(entityMap) {
  return {
    queryEntities: jest.fn((...args) => {
      if (args.length === 0) {
        return [];
      }

      let required = [];
      if (args.length === 1 && Array.isArray(args[0])) {
        required = args[0];
      } else if (args.length === 1 && typeof args[0] === 'string') {
        required = [args[0]];
      } else {
        required = args;
      }

      return Object.keys(entityMap).filter((entityId) =>
        required.every((componentName) => Boolean(entityMap[entityId]?.[componentName]))
      );
    }),
    getComponent: jest.fn((entityId, componentName) => entityMap[entityId]?.[componentName] || null),
  };
}

function createTestHarness(options = {}) {
  const playerId = 'player_entity';
  const sourceNpcId = options.sourceNpcId || 'npc_guard_alpha';
  const allyNpcId = options.allyNpcId || 'npc_guard_beta';

  const playerTransform = new Transform(
    options.playerPosition?.x ?? 0,
    options.playerPosition?.y ?? 0
  );
  const playerFaction = new FactionMember({
    primaryFaction: options.playerFaction ?? 'civilian',
    knownBy: new Set(),
  });

  const sourceNpc = new NPC({
    npcId: sourceNpcId,
    name: 'Source Guard',
    faction: options.faction ?? 'vanguard_prime',
  });

  const allyNpc = new NPC({
    npcId: allyNpcId,
    name: 'Ally Guard',
    faction: options.faction ?? 'vanguard_prime',
  });

  const sourceTransform = new Transform(
    options.sourcePosition?.x ?? 50,
    options.sourcePosition?.y ?? 0
  );

  const allyTransform = new Transform(
    options.allyPosition?.x ?? 150,
    options.allyPosition?.y ?? 0
  );

  const entityMap = {
    [playerId]: {
      Transform: playerTransform,
      PlayerController: {},
      FactionMember: playerFaction,
    },
    [sourceNpcId]: {
      Transform: sourceTransform,
      NPC: sourceNpc,
    },
    [allyNpcId]: {
      Transform: allyTransform,
      NPC: allyNpc,
    },
  };

  if (options.includeOtherFaction) {
    const otherNpcId = 'npc_other_faction';
    entityMap[otherNpcId] = {
      Transform: new Transform(75, 0),
      NPC: new NPC({
        npcId: otherNpcId,
        name: 'Watcher',
        faction: 'wraith_network',
      }),
    };
  }

  const componentRegistry = createMockComponentRegistry(entityMap);
  const eventBus = new EventBus();
  jest.spyOn(eventBus, 'emit');

  const factionManager = {
    modifyReputation: jest.fn(),
  };

  const system = new NPCMemorySystem(componentRegistry, eventBus, factionManager);

  return {
    system,
    componentRegistry,
    eventBus,
    factionManager,
    playerFaction,
    playerId,
    npcIds: {
      source: sourceNpcId,
      ally: allyNpcId,
    },
    npcs: {
      source: sourceNpc,
      ally: allyNpc,
    },
  };
}

describe('NPCMemorySystem', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shares recognition intel with nearby faction members and updates knownBy', () => {
    const harness = createTestHarness();
    const { system, playerFaction, npcIds, npcs, eventBus } = harness;

    system.checkRecognition(
      npcIds.source,
      npcs.source,
      harness.playerId,
      playerFaction,
      50
    );

    expect(npcs.source.knownPlayer).toBe(true);
    expect(npcs.ally.knownPlayer).toBe(true);
    expect(playerFaction.knownBy.has(npcs.source.npcId)).toBe(true);
    expect(playerFaction.knownBy.has(npcs.ally.npcId)).toBe(true);
    expect(Array.isArray(npcs.ally.memory.sharedIntel)).toBe(true);
    expect(npcs.ally.memory.sharedIntel[0]).toMatchObject({
      type: 'recognition',
      sourceNpcId: npcs.source.npcId,
    });

    const intelEvents = eventBus.emit.mock.calls.filter(
      ([event, payload]) =>
        event === 'npc:intel_shared' && payload?.intelType === 'recognition'
    );
    expect(intelEvents.length).toBe(1);
    expect(intelEvents[0][1]).toMatchObject({
      affectedNpcIds: [npcs.ally.npcId],
      faction: npcs.source.faction,
    });
  });

  it('shares crime intel with faction members outside of recognition distance', () => {
    const harness = createTestHarness({
      allyPosition: { x: 190, y: 0 },
    });
    const { system, npcs, eventBus } = harness;

    system.onCrimeCommitted({
      crimeType: 'theft',
      location: 'upper_market',
      severity: 3,
      perpetrator: harness.playerId,
    });

    expect(npcs.source.witnessedCrimes).toHaveLength(1);
    expect(npcs.ally.witnessedCrimes).toHaveLength(1);
    expect(npcs.ally.witnessedCrimes[0]).toMatchObject({
      type: 'theft',
      shared: true,
      sourceNpcId: npcs.source.npcId,
    });

    const intelEvents = eventBus.emit.mock.calls.filter(
      ([event, payload]) =>
        event === 'npc:intel_shared' && payload?.intelType === 'crime'
    );
    expect(intelEvents.length).toBe(1);
    expect(intelEvents[0][1]).toMatchObject({
      faction: npcs.source.faction,
      crimeType: 'theft',
      affectedNpcIds: [npcs.ally.npcId],
    });
  });

  it('serializes and deserializes npc memory state including player knownBy', () => {
    const harness = createTestHarness({
      allyPosition: { x: 190, y: 0 },
    });
    const { system, npcs, playerFaction, npcIds } = harness;

    system.checkRecognition(
      npcIds.source,
      npcs.source,
      harness.playerId,
      playerFaction,
      50
    );

    system.onCrimeCommitted({
      crimeType: 'assault',
      location: 'docks',
      severity: 4,
      perpetrator: harness.playerId,
    });

    expect(system.pendingReports.length).toBeGreaterThan(0);

    const snapshot = system.serialize();

    npcs.source.knownPlayer = false;
    npcs.source.witnessedCrimes = [];
    npcs.ally.knownPlayer = false;
    npcs.ally.witnessedCrimes = [];
    playerFaction.setKnownBy([]);
    system.pendingReports = [];

    system.deserialize(snapshot);

    expect(npcs.source.knownPlayer).toBe(true);
    expect(npcs.ally.knownPlayer).toBe(true);
    expect(playerFaction.knownBy.has(npcs.source.npcId)).toBe(true);
    expect(playerFaction.knownBy.has(npcs.ally.npcId)).toBe(true);
    expect(npcs.source.witnessedCrimes).toHaveLength(1);
    expect(npcs.ally.witnessedCrimes).toHaveLength(1);
    expect(system.pendingReports.length).toBe(snapshot.pendingReports.length);
  });
});
