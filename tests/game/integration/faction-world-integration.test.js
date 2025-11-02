/**
 * Faction and World Integration Test - M3-018
 *
 * Validates cross-system behaviour for faction reputation cascades,
 * disguise-based infiltration, NPC dialogue reactions, and world state
 * persistence that informs save/load flows.
 */

import { EventBus } from '../../../src/engine/events/EventBus.js';
import { EntityManager } from '../../../src/engine/ecs/EntityManager.js';
import { ComponentRegistry } from '../../../src/engine/ecs/ComponentRegistry.js';
import { FactionManager } from '../../../src/game/managers/FactionManager.js';
import { FactionSystem } from '../../../src/game/systems/FactionSystem.js';
import { DisguiseSystem } from '../../../src/game/systems/DisguiseSystem.js';
import { SocialStealthSystem } from '../../../src/game/systems/SocialStealthSystem.js';
import { WorldStateStore } from '../../../src/game/state/WorldStateStore.js';
import { archiveUndercity } from '../../../src/game/data/districts/archiveUndercity.js';
import { PlayerController } from '../../../src/game/components/PlayerController.js';
import { NavigationAgent } from '../../../src/game/components/NavigationAgent.js';
import { Disguise } from '../../../src/game/components/Disguise.js';
import { FactionMember } from '../../../src/game/components/FactionMember.js';
import { Transform } from '../../../src/game/components/Transform.js';
import { NPC } from '../../../src/game/components/NPC.js';
import { Faction } from '../../../src/game/components/Faction.js';
import { factionSlice } from '../../../src/game/state/slices/factionSlice.js';
import { districtSlice } from '../../../src/game/state/slices/districtSlice.js';

function createFactionIntegrationHarness() {
  const eventBus = new EventBus();
  const entityManager = new EntityManager();
  const componentRegistry = new ComponentRegistry(entityManager);
  const factionManager = new FactionManager(eventBus);
  const worldStateStore = new WorldStateStore(eventBus, { enableDebug: false });
  worldStateStore.init();

  const factionSystem = new FactionSystem(componentRegistry, eventBus, factionManager);
  factionSystem.init();

  const socialStealthSystem = new SocialStealthSystem(componentRegistry, eventBus, factionManager);
  socialStealthSystem.init();

  const disguiseSystem = new DisguiseSystem(componentRegistry, eventBus, factionManager);
  disguiseSystem.init();

  return {
    eventBus,
    entityManager,
    componentRegistry,
    factionManager,
    worldStateStore,
    factionSystem,
    socialStealthSystem,
    disguiseSystem,
  };
}

describe('Faction and World Integration - M3-018', () => {
  const alliedThresholds = {
    socialStealth: { suspicious: 32, alerted: 67, combat: 100 },
    disguise: { alert: 43, calm: 9 },
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('chains reputation cascades through disguise, stealth, dialogue, and persistence', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      const harness = createFactionIntegrationHarness();
      const {
        eventBus,
        entityManager,
        componentRegistry,
        factionManager,
        worldStateStore,
        factionSystem,
        socialStealthSystem,
        disguiseSystem,
      } = harness;

      const recordedEvents = [];
      const originalEmit = eventBus.emit.bind(eventBus);
      eventBus.emit = (eventType, payload) => {
        recordedEvents.push({ event: eventType, payload });
        return originalEmit(eventType, payload);
      };

      // Seed district metadata so infiltration state changes persist.
      eventBus.emit('district:registered', {
        districtId: archiveUndercity.id,
        definition: archiveUndercity,
      });

      // Create player entity wired for disguise/stealth systems.
      const playerId = entityManager.createEntity('player', { active: true });
      componentRegistry.addComponent(playerId, 'PlayerController', new PlayerController());
      componentRegistry.addComponent(playerId, 'Transform', new Transform(0, 0));
      componentRegistry.addComponent(
        playerId,
        'NavigationAgent',
        new NavigationAgent({
          lockedSurfaceTags: ['restricted', 'restricted:luminari_syndicate'],
          lockedSurfaceIds: ['security_walkway', 'encryption_lab_floor'],
        })
      );
      const playerDisguise = new Disguise({
        disguiseId: 'luminari_field_agent',
        factionId: 'luminari_syndicate',
        baseEffectiveness: 0.82,
        equipped: true,
        suspicionLevel: 30,
      });
      componentRegistry.addComponent(playerId, 'Disguise', playerDisguise);
      const playerFactionMember = new FactionMember({ primaryFaction: 'civilian' });
      playerFactionMember.equipDisguise('luminari_syndicate');
      componentRegistry.addComponent(playerId, 'FactionMember', playerFactionMember);

      disguiseSystem._playerEntityId = playerId;
      playerDisguise.lastDetectionRoll = Date.now();

      // Create NPC aligned with the Luminari Syndicate to observe reputation shift.
      const npcId = entityManager.createEntity('npc', { active: true });
      componentRegistry.addComponent(npcId, 'Transform', new Transform(10, 0));
      componentRegistry.addComponent(
        npcId,
        'NPC',
        new NPC({
          npcId: 'luminari_guard_alpha',
          name: 'Luminari Archivist',
          faction: 'luminari_syndicate',
          dialogue: {
            friendly: 'dialogue_luminari_friendly',
            neutral: 'dialogue_luminari_neutral',
            hostile: 'dialogue_luminari_hostile',
            default: 'dialogue_luminari_neutral',
          },
        })
      );
      componentRegistry.addComponent(
        npcId,
        'FactionMember',
        new FactionMember({ primaryFaction: 'luminari_syndicate' })
      );
      componentRegistry.addComponent(npcId, 'Faction', new Faction({ factionId: 'luminari_syndicate' }));

      const factionEntities = componentRegistry.queryEntities('Faction');
      factionSystem.update(0, factionEntities);

      const baselineReputation = {
        vanguard: { ...factionManager.getReputation('vanguard_prime') },
        wraith: { ...factionManager.getReputation('wraith_network') },
      };

      // Equip disguise unlocks infiltration routes through navigation events.
      eventBus.emit('disguise:equipped', {
        entityId: playerId,
        factionId: 'luminari_syndicate',
      });

      // Successful stealth operation boosts reputation and triggers cascades.
      factionManager.modifyReputation('luminari_syndicate', 60, -20, 'quest:stealth_success');
      factionSystem.update(0, factionEntities);

      // Run per-frame hooks once so downstream systems consume new state.
      disguiseSystem.update(0.016);
      socialStealthSystem.update(0.016);

      // District control shifts as the stealth op succeeds.
      eventBus.emit('district:route_unlocked', {
        districtId: archiveUndercity.id,
        routeId: 'maintenance_shaft_sigma',
        source: 'stealth_infiltration',
      });
      eventBus.emit('district:control_changed', {
        districtId: archiveUndercity.id,
        controllingFaction: 'luminari_syndicate',
        source: 'stealth_infiltration',
      });

      // --- Navigation unlocks ---
      const unlockedTags = recordedEvents
        .filter((entry) => entry.event === 'navigation:unlockSurfaceTag')
        .map((entry) => entry.payload?.tag)
        .filter(Boolean);
      expect(unlockedTags).toEqual(
        expect.arrayContaining(['restricted', 'restricted:luminari_syndicate'])
      );

      const unlockedIds = recordedEvents
        .filter((entry) => entry.event === 'navigation:unlockSurfaceId')
        .map((entry) => entry.payload?.surfaceId)
        .filter(Boolean);
      expect(unlockedIds).toEqual(
        expect.arrayContaining(['security_walkway', 'encryption_lab_floor'])
      );

      // --- NPC attitude + dialogue ---
      const npcAttitudeEvents = recordedEvents.filter(
        (entry) =>
          entry.event === 'npc:attitude_changed' &&
          entry.payload?.npcId === 'luminari_guard_alpha'
      );
      expect(npcAttitudeEvents.length).toBeGreaterThan(0);
      const alliedNpcEvent = npcAttitudeEvents.find(
        (entry) => entry.payload?.newAttitude === 'allied'
      );
      expect(alliedNpcEvent?.payload).toMatchObject({
        factionId: 'luminari_syndicate',
        newAttitude: 'allied',
        dialogueVariant: 'friendly',
        npcAttitude: 'friendly',
      });

      const npcComponent = componentRegistry.getComponent(npcId, 'NPC');
      expect(npcComponent.dialogueVariant).toBe('friendly');
      expect(npcComponent.activeDialogueId).toBe('dialogue_luminari_friendly');

      // --- Social stealth adjustments ---
      expect(socialStealthSystem.state.currentAttitude).toBe('allied');
      expect(socialStealthSystem.state.attitudeMultiplier).toBeCloseTo(0.55);
      expect(socialStealthSystem.state.thresholds).toEqual(alliedThresholds.socialStealth);
      expect(playerDisguise.suspicionLevel).toBeLessThan(30);
      expect(socialStealthSystem.state.suspicion).toBeCloseTo(
        playerDisguise.suspicionLevel,
        5
      );

      const stealthProfileEvent = [...recordedEvents]
        .reverse()
        .find(
          (entry) =>
            entry.event === 'socialStealth:attitude_profile_updated' &&
            entry.payload?.attitude === 'allied'
        );
      expect(stealthProfileEvent?.payload).toMatchObject({
        factionId: 'luminari_syndicate',
        attitude: 'allied',
        thresholds: alliedThresholds.socialStealth,
      });

      // --- Disguise reactivity ---
      expect(disguiseSystem.attitudeState).toMatchObject({
        factionId: 'luminari_syndicate',
        attitude: 'allied',
        detectionMultiplier: 0.65,
        suspiciousActionModifier: -8,
        suspicionDecayBonus: 1.5,
        alertThreshold: alliedThresholds.disguise.alert,
        calmThreshold: alliedThresholds.disguise.calm,
      });

      const disguiseProfileEvent = [...recordedEvents]
        .reverse()
        .find(
          (entry) =>
            entry.event === 'disguise:attitude_reaction_updated' &&
            entry.payload?.attitude === 'allied'
        );
      expect(disguiseProfileEvent?.payload).toMatchObject({
        factionId: 'luminari_syndicate',
        attitude: 'allied',
        detectionMultiplier: 0.65,
        alertThreshold: alliedThresholds.disguise.alert,
        calmThreshold: alliedThresholds.disguise.calm,
      });

      // --- Faction cascades in world state ---
      const luminariSnapshot = worldStateStore.select(
        factionSlice.selectors.selectFactionById,
        'luminari_syndicate'
      );
      expect(luminariSnapshot).toMatchObject({
        attitude: 'allied',
        fame: expect.any(Number),
        infamy: 0,
        lastDelta: { fame: 60, infamy: -20 },
      });

      const updatedVanguard = factionManager.getReputation('vanguard_prime');
      const updatedWraith = factionManager.getReputation('wraith_network');
      expect(updatedVanguard.fame).toBeGreaterThan(baselineReputation.vanguard.fame);
      expect(updatedVanguard.infamy).toBeGreaterThan(baselineReputation.vanguard.infamy);
      expect(updatedWraith.fame).toBeLessThan(baselineReputation.wraith.fame);
      expect(updatedWraith.infamy).toBeLessThan(baselineReputation.wraith.infamy);

      // --- District persistence ---
      const districtRecord = worldStateStore.select(
        districtSlice.selectors.selectDistrictById,
        archiveUndercity.id
      );
      expect(districtRecord?.controllingFaction?.current).toBe('luminari_syndicate');
      expect(districtRecord?.access?.unlockedRoutes).toContain('maintenance_shaft_sigma');

      // --- Snapshot hydration ---
      const snapshot = worldStateStore.snapshot();
      const rehydratedStore = new WorldStateStore(new EventBus(), { enableDebug: false });
      rehydratedStore.init();
      rehydratedStore.hydrate(snapshot);

      const hydratedFaction = rehydratedStore.select(
        factionSlice.selectors.selectFactionById,
        'luminari_syndicate'
      );
      expect(hydratedFaction?.attitude).toBe('allied');

      const hydratedDistrict = rehydratedStore.select(
        districtSlice.selectors.selectDistrictById,
        archiveUndercity.id
      );
      expect(hydratedDistrict?.controllingFaction?.current).toBe('luminari_syndicate');
      expect(hydratedDistrict?.access?.unlockedRoutes).toContain('maintenance_shaft_sigma');
    } finally {
      logSpy.mockRestore();
      warnSpy.mockRestore();
    }
  });
});
