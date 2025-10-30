import { mkdtemp, readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {
  buildAct2BranchDialogueSummary,
  writeAct2BranchDialogueSummary,
} from '../../../src/game/tools/Act2BranchDialogueExporter.js';

describe('Act2BranchDialogueExporter', () => {
  it('builds a summary that links dialogues to quest metadata', () => {
    const summary = buildAct2BranchDialogueSummary();

    expect(summary.generatedAt).toEqual(expect.any(String));
    expect(summary.stats.totalDialogues).toBe(summary.dialogues.length);

    const corporateEncryption = summary.dialogues.find(
      (entry) => entry.dialogueId === 'dialogue_act2_corporate_encryption_clone'
    );
    expect(corporateEncryption).toBeDefined();
    expect(corporateEncryption.branchId).toBe('corporate');
    expect(corporateEncryption.telemetryTag).toBe('act2_corporate_encryption_lab');
    expect(corporateEncryption.questId).toBe('main-act2-neurosync-infiltration');
    expect(corporateEncryption.objectiveId).toBe('obj_clone_encryption_core');
    expect(corporateEncryption.lines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ speaker: 'Kira' }),
        expect.objectContaining({ speaker: 'Zara' }),
        expect.objectContaining({ speaker: 'Dmitri' }),
      ])
    );
  });

  it('writes the summary to disk', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'act2-dialogue-export-'));
    const outputPath = path.join(tempDir, 'summary.json');

    const result = await writeAct2BranchDialogueSummary(outputPath, { pretty: false });

    expect(result).toEqual({
      outputPath,
      dialogueCount: 6,
    });

    const contents = await readFile(outputPath, 'utf8');
    const parsed = JSON.parse(contents);
    expect(parsed.dialogues).toHaveLength(6);
  });
});
