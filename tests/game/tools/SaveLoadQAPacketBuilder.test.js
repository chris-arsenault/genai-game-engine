import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildSaveLoadQAPacket } from '../../../src/game/tools/SaveLoadQAPacketBuilder.js';

describe('SaveLoadQAPacketBuilder', () => {
  let tempRoot;

  afterAll(async () => {
    if (tempRoot) {
      await fs.rm(tempRoot, { recursive: true, force: true });
    }
  });

  test('builds packet with metadata and artifacts', async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'save-load-qa-'));

    const profile = {
      summary: {
        iterations: 2,
        thresholdMs: 2000,
        save: { averageMs: 1, maxMs: 2 },
        load: { averageMs: 0, maxMs: 1, underThreshold: true },
      },
      samples: [
        { iteration: 0, saveMs: 1.2, loadMs: 0.4 },
        { iteration: 1, saveMs: 0.8, loadMs: 0.2 },
      ],
    };

    const payloadSummary = {
      slot: 'qa-slot',
      version: 1,
      timestamp: Date.now(),
      sections: {
        storyFlags: { count: 3 },
        quests: { activeCount: 1, completedCount: 2 },
        factions: { factionCount: 2 },
        inventory: { itemCount: 5 },
        district: { count: 4 },
        npc: { count: 7 },
      },
    };

    const result = await buildSaveLoadQAPacket({
      profile,
      payloadSummary,
      outputRoot: tempRoot,
      label: 'qa-builder-test',
      includeSamples: false,
      createArchive: false,
    });

    const metadataRaw = await fs.readFile(result.metadataPath, 'utf8');
    const metadata = JSON.parse(metadataRaw);

    expect(metadata.profile.iterations).toBe(2);
    expect(metadata.payload.sectionCounts.storyFlags).toBe(3);

    const readme = await fs.readFile(path.join(result.packetDir, 'README.md'), 'utf8');
    expect(readme).toContain('Save/Load QA Packet');
  });
});
