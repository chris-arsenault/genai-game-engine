import { mkdtemp, readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {
  buildAct3EpilogueSummary,
  writeAct3EpilogueSummary,
  renderAct3EpilogueMarkdown,
  writeAct3EpilogueMarkdown,
} from '../../../src/game/tools/Act3EpilogueExporter.js';

describe('Act3EpilogueExporter', () => {
  test('builds summary with stance metadata', () => {
    const summary = buildAct3EpilogueSummary();

    expect(summary.stances).toHaveLength(3);
    expect(summary.stats.totalBeats).toBeGreaterThanOrEqual(9);

    const opposition = summary.stances.find((entry) => entry.stanceId === 'opposition');
    expect(opposition).toBeDefined();
    expect(opposition.summary).toMatch(/disables the Archive/);
    expect(opposition.beats[0]).toEqual(
      expect.objectContaining({
        title: expect.any(String),
        description: expect.any(String),
        order: 1,
      })
    );
  });

  test('writes summary to disk', async () => {
    const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'act3-epilogues-'));
    const outPath = path.join(tmpDir, 'summary.json');
    const result = await writeAct3EpilogueSummary(outPath);

    expect(result).toEqual(
      expect.objectContaining({
        stanceCount: 3,
      })
    );

    const contents = await readFile(outPath, 'utf8');
    const parsed = JSON.parse(contents);
    expect(parsed.stances).toHaveLength(3);
  });

  test('renders markdown packet for review', async () => {
    const summary = buildAct3EpilogueSummary();
    const markdown = renderAct3EpilogueMarkdown(summary);

    expect(markdown).toContain('# Act 3 Epilogue Review Packet');
    expect(markdown).toContain('Ending A — Sever the Broadcast');
    expect(markdown).toContain('Narrative Beat: act3_epilogue_opposition_city');

    const tmpDir = await mkdtemp(path.join(os.tmpdir(), 'act3-epilogues-md-'));
    const outPath = path.join(tmpDir, 'epilogues.md');
    await writeAct3EpilogueMarkdown(outPath, { summary });
    const written = await readFile(outPath, 'utf8');
    expect(written).toContain('Ending C — Amplify the Truth');
  });
});
