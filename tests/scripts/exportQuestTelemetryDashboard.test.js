import { mkdtemp, writeFile, readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { runQuestTelemetryDashboardExport } from '../../scripts/telemetry/exportQuestTelemetryDashboard.js';

describe('exportQuestTelemetryDashboard script', () => {
  it('produces analytics dataset with expected schema and issue breakdown', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'telemetry-dashboard-'));
    const inputPath = path.join(tempDir, 'events.json');
    const outputPath = path.join(tempDir, 'dashboard.json');

    const events = [
      {
        type: 'telemetry:trigger_entered',
        timestamp: 1_700_000_000_000,
        payload: {
          telemetryTag: 'act2_test_entry',
          questId: 'quest-alpha',
          objectiveId: 'obj-a',
          triggerId: 'trigger-a',
          sceneId: 'scene-act2',
          source: 'act2_crossroads_manifest',
        },
      },
      {
        type: 'telemetry:trigger_entered',
        timestamp: '2025-11-07T12:00:00Z',
        payload: {
          telemetryTag: 'act2_test_entry',
          questId: 'quest-alpha',
          objectiveId: 'obj-a',
          triggerId: 'trigger-a',
          sceneId: 'scene-act2',
          source: 'act2_crossroads_manifest',
        },
      },
      {
        type: 'telemetry:trigger_exited',
        timestamp: 1_700_000_050_000,
        payload: {
          telemetryTag: 'act2_test_exit',
          questId: 'quest-alpha',
          objectiveId: 'obj-a',
          areaId: 'trigger-a',
        },
      },
    ];

    await writeFile(inputPath, `${JSON.stringify(events, null, 2)}\n`, 'utf8');

    const result = await runQuestTelemetryDashboardExport({
      inputPath,
      outputPath,
      includeRawEvents: true,
    });

    expect(result.totalEvents).toBe(3);
    expect(result.outputPath).toBe(outputPath);
    expect(result.dataset.schemaVersion).toBe('1.0.0');
    expect(result.dataset.uniqueTelemetryTags).toEqual(
      expect.arrayContaining(['act2_test_entry', 'act2_test_exit'])
    );
    expect(result.dataset.events).toHaveLength(3);
    expect(result.dataset.report.issues.details.duplicates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          telemetryTag: 'act2_test_entry',
          triggerId: 'trigger-a',
        }),
      ])
    );
    expect(result.dataset.report.issues.details.missingFields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'source',
          eventType: 'telemetry:trigger_exited',
        }),
      ])
    );

    const stored = JSON.parse(await readFile(outputPath, 'utf8'));
    expect(stored.schemaVersion).toBe('1.0.0');
    expect(stored.events).toHaveLength(3);
    expect(stored.report.totalEvents).toBe(3);
  });
});
