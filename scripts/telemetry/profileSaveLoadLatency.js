#!/usr/bin/env node

/**
 * Profiles SaveManager save/load latency using representative world state snapshots.
 * Produces JSON containing summary metrics plus raw samples so QA and telemetry teams
 * can validate the <2s load-time acceptance criterion.
 */

import { profileSaveLoadLatency, summarizeProfile } from '../../src/game/managers/saveLoadProfiling.js';
import { buildProfilingSaveManager } from './lib/saveManagerFixtures.js';

function main() {
  const iterations = Number.parseInt(process.argv[2] ?? '5', 10);
  const saveManager = buildProfilingSaveManager();
  const profile = profileSaveLoadLatency(saveManager, {
    iterations: Number.isFinite(iterations) && iterations > 0 ? iterations : 5,
    slotName: 'profiling-latency',
  });

  const output = {
    summary: summarizeProfile(profile),
    samples: profile.samples,
  };

  saveManager.cleanup();

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(output, null, 2));
}

main();
