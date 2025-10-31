import { EventBus } from '../../../src/engine/events/EventBus';
import { WorldStateStore } from '../../../src/game/state/WorldStateStore';
import {
  evaluateDistrictAccess,
  isDistrictAccessible,
  describeDistrictBlockers,
} from '../../../src/game/progression/DistrictAccessEvaluator';

describe('DistrictAccessEvaluator', () => {
  let eventBus;
  let store;

  beforeEach(() => {
    eventBus = new EventBus();
    store = new WorldStateStore(eventBus, { enableDebug: false });
    store.init();
  });

  function setStoryFlag(flagId, value = true) {
    eventBus.emit('story:flag:changed', {
      flagId,
      newValue: value,
      timestamp: Date.now(),
    });
  }

  function completeQuest(questId) {
    eventBus.emit('quest:registered', {
      questId,
      title: questId,
      type: 'main',
    });
    eventBus.emit('quest:started', {
      questId,
      title: questId,
      type: 'main',
    });
    eventBus.emit('quest:completed', {
      questId,
      title: questId,
      type: 'main',
      rewards: [],
    });
  }

  function setFactionReputation(factionId, fame, infamy = 0) {
    eventBus.emit('reputation:changed', {
      factionId,
      factionName: factionId,
      deltaFame: fame,
      deltaInfamy: infamy,
      newFame: fame,
      newInfamy: infamy,
      reason: 'unit-test',
    });
  }

  function addInventoryItem(itemId) {
    eventBus.emit('inventory:item_added', {
      id: itemId,
      name: itemId,
      quantity: 1,
    });
  }

  it('reports Neon Districts as unlocked by default', () => {
    const report = evaluateDistrictAccess(store, 'neon_districts');
    expect(report.baseUnlocked).toBe(true);
    expect(report.isUnlocked).toBe(true);
    expect(report.unmetRequirements).toHaveLength(0);
    expect(isDistrictAccessible(store, 'neon_districts')).toBe(true);
  });

  it('identifies missing requirements for Corporate Spires and unlocks after progression', () => {
    let report = evaluateDistrictAccess(store, 'corporate_spires');
    const missingTypes = report.unmetRequirements.map((entry) => entry.type);
    expect(report.isUnlocked).toBe(false);
    expect(missingTypes).toEqual(
      expect.arrayContaining(['knowledge', 'quest', 'ability', 'faction'])
    );

    // Satisfy requirements
    setStoryFlag('knowledge_neurosync_connection');
    completeQuest('case_002_exec_blackmail_completed');
    setStoryFlag('ability_social_engineering_protocol');
    setFactionReputation('luminari_syndicate', 40, 0);

    report = evaluateDistrictAccess(store, 'corporate_spires');
    expect(report.unmetRequirements).toHaveLength(0);
    expect(report.baseUnlocked).toBe(true);
    expect(report.isUnlocked).toBe(true);
  });

  it('respects active district restrictions and describes blockers', () => {
    // Trigger restriction
    eventBus.emit('district:restriction_set', {
      districtId: 'neon_districts',
      restrictionId: 'test_lockdown',
      active: true,
      metadata: { type: 'lockdown', description: 'Lockdown in effect' },
    });

    const report = evaluateDistrictAccess(store, 'neon_districts');
    expect(report.activeRestrictions).toHaveLength(1);
    expect(report.isUnlocked).toBe(false);

    const blockers = describeDistrictBlockers(store, 'neon_districts');
    expect(blockers.some((line) => line.includes('Lockdown in effect'))).toBe(true);

    // Clear restriction
    eventBus.emit('district:restriction_set', {
      districtId: 'neon_districts',
      restrictionId: 'test_lockdown',
      active: false,
    });

    const cleared = evaluateDistrictAccess(store, 'neon_districts');
    expect(cleared.isUnlocked).toBe(true);
  });

  it('evaluates complex requirements for Archive Undercity', () => {
    let report = evaluateDistrictAccess(store, 'archive_undercity');
    expect(report.isUnlocked).toBe(false);
    expect(report.unmetRequirements.length).toBeGreaterThan(0);

    setStoryFlag('knowledge_founders_massacre');
    setStoryFlag('knowledge_curator_identity');
    completeQuest('case_005_resistance_contact_completed');
    setStoryFlag('undercity_trust_secured');
    setFactionReputation('memory_keepers', 40, 0);
    setFactionReputation('wraith_network', 25, 0);

    report = evaluateDistrictAccess(store, 'archive_undercity');
    expect(report.unmetRequirements).toHaveLength(0);
    expect(report.baseUnlocked).toBe(true);
    expect(report.isUnlocked).toBe(true);
  });

  it('accepts contextual overrides for equipment requirements', () => {
    let report = evaluateDistrictAccess(store, 'zenith_sector');
    expect(report.unmetRequirements.some((req) => req.type === 'equipment')).toBe(true);

    // Provide contextual overrides for final act progression
    const context = {
      knowledge: new Set(['knowledge_curator_plan', 'knowledge_unspoken_accord']),
      storyFlags: {
        act3_unlocked: true,
        conspiracy_manifest_compiled: true,
        disrupt_scan_grid: true,
      },
      abilities: ['ability_forge_access_codes'],
      items: ['item_vanguard_disguise_plate'],
      factionReputation: {
        vanguard_prime: { fame: 45, infamy: 0 },
      },
    };

    report = evaluateDistrictAccess(store, 'zenith_sector', context);
    expect(report.unmetRequirements).toHaveLength(0);
    expect(report.baseUnlocked).toBe(true);
    expect(report.isUnlocked).toBe(true);
  });
});
