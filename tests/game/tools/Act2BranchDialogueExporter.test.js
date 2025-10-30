import { mkdtemp, readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {
  buildAct2BranchDialogueSummary,
  renderAct2BranchDialogueMarkdown,
  compareAct2BranchDialogueSummaries,
  writeAct2BranchDialogueSummary,
  writeAct2BranchDialogueMarkdown,
  writeAct2BranchDialogueChangeReport,
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
    expect(corporateEncryption.lines[0]).toEqual(
      expect.objectContaining({
        lineNumber: 1,
        anchorId: 'dialogue_act2_corporate_encryption_clone-L01',
      })
    );
    const lineWithChoice = corporateEncryption.lines.find(
      (line) => Array.isArray(line.choices) && line.choices.length > 0
    );
    if (lineWithChoice) {
      expect(lineWithChoice.choices[0]).toEqual(
        expect.objectContaining({
          choiceId: expect.stringMatching(/-C01$/),
        })
      );
    }
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

    const summary = buildAct2BranchDialogueSummary();
    const result = await writeAct2BranchDialogueSummary(outputPath, {
      pretty: false,
      summary,
    });

    expect(result).toEqual({
      outputPath,
      dialogueCount: 6,
    });

    const contents = await readFile(outputPath, 'utf8');
    const parsed = JSON.parse(contents);
    expect(parsed.dialogues).toHaveLength(6);
  });

  it('renders a markdown packet for narrative review', () => {
    const summary = buildAct2BranchDialogueSummary();
    const markdown = renderAct2BranchDialogueMarkdown(summary);

    expect(markdown).toContain('# Act 2 Branch Dialogue Review Packet');
    expect(markdown).toContain('| Dialogue ID | Branch | NPC | Quest | Objective | Lines | Telemetry Tag |');
    expect(markdown).toContain('dialogue_act2_corporate_encryption_clone');
    expect(markdown).toContain('## dialogue_act2_corporate_encryption_clone');
    expect(markdown).toContain('**Telemetry:** act2_corporate_encryption_lab');
    expect(markdown).toContain('`L01` **Kira:**');
    expect(markdown).toContain('(anchor: dialogue_act2_corporate_encryption_clone-L01)');
  });

  it('writes the markdown packet to disk', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'act2-dialogue-markdown-'));
    const outputPath = path.join(tempDir, 'summary.md');
    const summary = buildAct2BranchDialogueSummary();

    const result = await writeAct2BranchDialogueMarkdown(outputPath, { summary });

    expect(result).toEqual({
      outputPath,
      dialogueCount: 6,
    });

    const markdown = await readFile(outputPath, 'utf8');
    expect(markdown).toContain('## dialogue_act2_resistance_signal_array');
    expect(markdown).toContain('**Kira:** Cycle the encrypted burst on my mark. Zara will mirror the packet from the Crossroads relay.');
  });

  it('surfaces dialogue and line changes when comparing summaries', () => {
    const baseline = buildAct2BranchDialogueSummary();
    const current = JSON.parse(JSON.stringify(baseline));
    const editedDialogue = current.dialogues.find(
      (entry) => entry.dialogueId === 'dialogue_act2_corporate_encryption_clone'
    );
    expect(editedDialogue).toBeDefined();
    if (editedDialogue) {
      editedDialogue.lines[0].text = 'Kira recalibrates the encryption core while Zara watches the telemetry feed.';
      editedDialogue.telemetryTag = 'act2_corporate_encryption_recalibrated';
    }

    const report = compareAct2BranchDialogueSummaries(current, baseline);

    expect(report.changedDialogues).toHaveLength(1);
    const change = report.changedDialogues[0];
    expect(change.dialogueId).toBe('dialogue_act2_corporate_encryption_clone');
    expect(change.metadataChanges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: 'telemetryTag',
          current: 'act2_corporate_encryption_recalibrated',
        }),
      ])
    );
    expect(change.lineChanges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'modified',
          changes: expect.objectContaining({
            text: expect.objectContaining({
              current: 'Kira recalibrates the encryption core while Zara watches the telemetry feed.',
            }),
          }),
        }),
      ])
    );
  });

  it('records added dialogues when no baseline is supplied', () => {
    const current = buildAct2BranchDialogueSummary();
    const report = compareAct2BranchDialogueSummaries(current, null);

    expect(report.baselineAvailable).toBe(false);
    expect(report.addedDialogues).toHaveLength(current.dialogues.length);
    expect(report.changedDialogues).toHaveLength(0);
  });

  it('writes change reports to disk', async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), 'act2-dialogue-changes-'));
    const outputPath = path.join(tempDir, 'changes.json');
    const baseline = buildAct2BranchDialogueSummary();
    const current = JSON.parse(JSON.stringify(baseline));
    current.dialogues[0].lines[0].text = 'Updated opening line for QA review.';

    const report = compareAct2BranchDialogueSummaries(current, baseline);
    const result = await writeAct2BranchDialogueChangeReport(outputPath, { report });

    expect(result).toEqual({
      outputPath,
      changedDialogues: 1,
    });

    const written = JSON.parse(await readFile(outputPath, 'utf8'));
    expect(written.changedDialogues).toHaveLength(1);
  });
});
