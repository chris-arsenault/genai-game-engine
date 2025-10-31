#!/usr/bin/env node

/**
 * Exports a condensed save payload schema summary for QA and telemetry review.
 * Accepts an optional output path; defaults to stdout.
 */

import { SaveManager } from '../../src/game/managers/SaveManager.js';
import { EventBus } from '../../src/engine/events/EventBus.js';
import { buildSavePayloadSummary } from '../../src/game/managers/savePayloadSummary.js';

class MemoryStorage {
  constructor() {
    this.store = new Map();
  }

  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }

  setItem(key, value) {
    this.store.set(key, String(value));
  }

  removeItem(key) {
    this.store.delete(key);
  }
}

function buildManager() {
  const eventBus = new EventBus();
  const storage = new MemoryStorage();

  const worldStateSnapshot = {
    storyFlags: { investigation_started: true },
    quests: { active: [{ id: 'q_root' }], completed: [{ id: 'q_tutorial' }] },
    factions: {
      reputation: {
        kestrel_alliance: { fame: 40, infamy: 5 },
        wraith_network: { fame: 20, infamy: 55 },
      },
      timestamp: Date.now(),
    },
    tutorialComplete: true,
    tutorial: {
      completed: true,
      totalSteps: 12,
      currentStep: null,
      skipped: false,
    },
    inventory: {
      items: [
        { id: 'item_core', quantity: 1, rarity: 'legendary' },
        { id: 'item_datapad', quantity: 1, rarity: 'story' },
      ],
      equipped: { primaryWeapon: 'item_core', tool: 'item_datapad' },
      lastUpdatedAt: Date.now(),
    },
    dialogue: {
      transcriptEnabled: true,
      historyByNpc: { npc_echo: [{ line: 'We have a situation.' }] },
      completedByNpc: { npc_echo: ['intro'] },
    },
    district: {
      byId: {
        neon_crossroads: { id: 'neon_crossroads', tier: 'critical' },
        undercity_sewage: { id: 'undercity_sewage', tier: 'support' },
      },
    },
    npc: {
      byId: {
        npc_echo: { id: 'npc_echo', factionId: 'wraith_network' },
        npc_brackish: { id: 'npc_brackish', factionId: 'kestrel_alliance' },
      },
    },
  };

  const saveManager = new SaveManager(eventBus, {
    storyFlagManager: {
      serialize: () => ({ flags: { investigation_started: true } }),
      deserialize: () => {},
    },
    questManager: {
      serialize: () => ({ quests: { active: ['q_root'] } }),
      deserialize: () => {},
    },
    factionManager: {
      reputation: {
        kestrel_alliance: { fame: 40, infamy: 5 },
        wraith_network: { fame: 20, infamy: 55 },
      },
    },
    tutorialSystem: {
      getProgress: () => ({ totalSteps: 12, currentStep: null }),
      isComplete: () => true,
      completeTutorial: () => {},
    },
    worldStateStore: {
      snapshot: () => ({ ...worldStateSnapshot }),
      hydrate: () => {},
    },
    storage,
  });

  saveManager.init();
  return saveManager;
}

async function main() {
  const saveManager = buildManager();
  const summary = buildSavePayloadSummary(saveManager, { slotName: 'payload-summary' });
  const output = JSON.stringify(summary, null, 2);

  const outputPath = process.argv[2];
  if (outputPath) {
    const fs = await import('node:fs/promises');
    await fs.writeFile(outputPath, `${output}\n`, 'utf8');
  } else {
    // eslint-disable-next-line no-console
    console.log(output);
  }
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('[exportSavePayloadSummary] Failed to build summary', error);
  process.exitCode = 1;
});
