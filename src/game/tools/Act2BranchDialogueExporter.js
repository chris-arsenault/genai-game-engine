import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import {
  ACT2_BRANCH_DIALOGUE_IDS,
  registerAct2BranchObjectiveDialogues,
} from '../data/dialogues/Act2BranchObjectiveDialogues.js';
import { ACT2_CORPORATE_TRIGGER_DEFINITIONS } from '../scenes/Act2CorporateInfiltrationScene.js';
import { ACT2_RESISTANCE_TRIGGER_DEFINITIONS } from '../scenes/Act2ResistanceHideoutScene.js';
import { ACT2_PERSONAL_TRIGGER_DEFINITIONS } from '../scenes/Act2PersonalInvestigationScene.js';

/**
 * Build a narrative review summary for all Act 2 branch objective dialogues.
 * Aligns dialogue text with quest trigger metadata (quest/objective/telemetry).
 *
 * @param {{ includeChoices?: boolean }} [options]
 * @returns {{ generatedAt: string, version: string, stats: object, dialogues: Array<object> }}
 */
export function buildAct2BranchDialogueSummary(options = {}) {
  const includeChoices = options.includeChoices !== false;
  const definitionIndex = buildDialogueDefinitionIndex();
  const dialogueTrees = collectDialogueTrees();

  const dialogues = Array.from(dialogueTrees.values()).map((tree) => {
    const metaFromTriggers = definitionIndex.get(tree.id) ?? {};
    const branchId = metaFromTriggers.branchId ?? resolveBranchFromId(tree.id);
    const sequence = extractDialogueSequence(tree, { includeChoices });

    return {
      dialogueId: tree.id,
      branchId,
      title: tree.title,
      npcId: tree.npcId ?? metaFromTriggers.npcId ?? null,
      questId: metaFromTriggers.questId ?? null,
      objectiveId: metaFromTriggers.objectiveId ?? null,
      telemetryTag: metaFromTriggers.telemetryTag ?? null,
      triggerId: metaFromTriggers.triggerId ?? null,
      areaId: metaFromTriggers.areaId ?? null,
      scene: metaFromTriggers.sceneId ?? null,
      lineCount: sequence.lines.length,
      nodeCount: sequence.nodeCount,
      lines: sequence.lines,
    };
  });

  dialogues.sort((a, b) => a.dialogueId.localeCompare(b.dialogueId));

  const stats = {
    totalDialogues: dialogues.length,
    branches: dialogues.reduce((acc, entry) => {
      const bucket = entry.branchId ?? 'unknown';
      acc[bucket] = (acc[bucket] ?? 0) + 1;
      return acc;
    }, {}),
  };

  return {
    generatedAt: new Date().toISOString(),
    version: '1.0.0',
    stats,
    dialogues,
  };
}

/**
 * Write the Act 2 branch dialogue summary to disk.
 *
 * @param {string} outputPath
 * @param {{ pretty?: boolean, includeChoices?: boolean }} [options]
 * @returns {Promise<{ outputPath: string, dialogueCount: number }>}
 */
export async function writeAct2BranchDialogueSummary(outputPath, options = {}) {
  if (typeof outputPath !== 'string' || outputPath.length === 0) {
    throw new Error('[writeAct2BranchDialogueSummary] outputPath is required');
  }

  const summary =
    options.summary && isDialogueSummary(options.summary)
      ? options.summary
      : buildAct2BranchDialogueSummary(options);
  const payload = options.pretty === false ? JSON.stringify(summary) : JSON.stringify(summary, null, 2);

  const targetDir = path.dirname(outputPath);
  await mkdir(targetDir, { recursive: true });
  await writeFile(outputPath, `${payload}\n`, 'utf8');

  return {
    outputPath,
    dialogueCount: summary.dialogues.length,
  };
}

/**
 * Render the Act 2 branch dialogue summary as Markdown for narrative review.
 *
 * @param {object} summary
 * @param {{ headingLevel?: number }} [options]
 * @returns {string}
 */
export function renderAct2BranchDialogueMarkdown(summary, options = {}) {
  const headingLevel = Number.isInteger(options.headingLevel) && options.headingLevel > 0
    ? options.headingLevel
    : 2;
  const summaryData = isDialogueSummary(summary)
    ? summary
    : buildAct2BranchDialogueSummary(options);

  const heading = (depth) => '#'.repeat(Math.max(1, headingLevel + depth - 1));

  const lines = [];
  lines.push('# Act 2 Branch Dialogue Review Packet');
  lines.push('');
  lines.push(`Generated: ${summaryData.generatedAt}`);
  lines.push(`Version: ${summaryData.version}`);
  lines.push('');
  lines.push('## Overview');
  lines.push('');
  lines.push('| Dialogue ID | Branch | NPC | Quest | Objective | Lines | Telemetry Tag |');
  lines.push('| --- | --- | --- | --- | --- | ---: | --- |');

  for (const entry of summaryData.dialogues) {
    lines.push(
      `| ${entry.dialogueId} | ${entry.branchId ?? ''} | ${entry.npcId ?? ''} | ${entry.questId ?? ''} | ${entry.objectiveId ?? ''} | ${entry.lineCount} | ${entry.telemetryTag ?? ''} |`
    );
  }

  lines.push('');

  for (const entry of summaryData.dialogues) {
    lines.push(`${heading(1)} ${entry.dialogueId}`);
    lines.push('');
    lines.push(`- **Branch:** ${entry.branchId ?? 'unknown'}`);
    lines.push(`- **NPC:** ${entry.npcId ?? 'unknown'}`);
    lines.push(`- **Quest Objective:** ${entry.questId ?? '—'}${entry.objectiveId ? ` / ${entry.objectiveId}` : ''}`);
    lines.push(`- **Telemetry:** ${entry.telemetryTag ?? '—'}`);
    lines.push(`- **Trigger:** ${entry.triggerId ?? '—'}`);
    lines.push('');
    lines.push(`${heading(2)} Script`);

    for (const line of entry.lines) {
      const speaker = line.speaker ? `**${line.speaker}:**` : '**Narration:**';
      const text = line.text ?? '';
      lines.push(`- ${speaker} ${text}`);
      if (Array.isArray(line.choices) && line.choices.length > 0) {
        for (const choice of line.choices) {
          lines.push(
            `  - Choice: ${choice.text ?? ''} → ${choice.nextNode ?? 'END'}`
          );
        }
      }
    }

    lines.push('');
  }

  return lines.join('\n').trim();
}

/**
 * Write the Act 2 branch dialogue Markdown review to disk.
 *
 * @param {string} outputPath
 * @param {{ summary?: object }} [options]
 * @returns {Promise<{ outputPath: string, dialogueCount: number }>}
 */
export async function writeAct2BranchDialogueMarkdown(outputPath, options = {}) {
  if (typeof outputPath !== 'string' || outputPath.length === 0) {
    throw new Error('[writeAct2BranchDialogueMarkdown] outputPath is required');
  }

  const summary =
    options.summary && isDialogueSummary(options.summary)
      ? options.summary
      : buildAct2BranchDialogueSummary(options);
  const markdown = renderAct2BranchDialogueMarkdown(summary, options);

  const targetDir = path.dirname(outputPath);
  await mkdir(targetDir, { recursive: true });
  await writeFile(outputPath, `${markdown}\n`, 'utf8');

  return {
    outputPath,
    dialogueCount: summary.dialogues.length,
  };
}

function collectDialogueTrees() {
  const collector = {
    trees: new Map(),
    registerDialogueTree(tree) {
      this.trees.set(tree.id, tree);
    },
  };
  registerAct2BranchObjectiveDialogues(collector);
  return collector.trees;
}

function buildDialogueDefinitionIndex() {
  const index = new Map();

  const sources = [
    { branchId: 'corporate', sceneId: 'act2_corporate_infiltration', definitions: ACT2_CORPORATE_TRIGGER_DEFINITIONS },
    { branchId: 'resistance', sceneId: 'act2_resistance_hideout', definitions: ACT2_RESISTANCE_TRIGGER_DEFINITIONS },
    { branchId: 'personal', sceneId: 'act2_personal_archive', definitions: ACT2_PERSONAL_TRIGGER_DEFINITIONS },
  ];

  for (const source of sources) {
    if (!Array.isArray(source.definitions)) {
      continue;
    }
    for (const definition of source.definitions) {
      const metadata = definition?.metadata ?? {};
      const dialogueId = metadata.dialogueId;
      if (!dialogueId) {
        continue;
      }
      index.set(dialogueId, {
        branchId: source.branchId,
        sceneId: source.sceneId,
        triggerId: definition.id ?? null,
        questId: definition.questId ?? null,
        objectiveId: definition.objectiveId ?? null,
        areaId: definition.areaId ?? null,
        telemetryTag: metadata.telemetryTag ?? null,
        npcId: metadata.dialogueNpcId ?? null,
      });
    }
  }

  return index;
}

function resolveBranchFromId(dialogueId) {
  for (const [branchId, values] of Object.entries(ACT2_BRANCH_DIALOGUE_IDS)) {
    for (const value of Object.values(values)) {
      if (value === dialogueId) {
        return branchId;
      }
    }
  }
  return null;
}

function extractDialogueSequence(tree, options = {}) {
  const includeChoices = options.includeChoices !== false;
  const visited = new Set();
  const lines = [];
  let node = tree.getStartNode();

  while (node && !visited.has(node.id)) {
    visited.add(node.id);
    const entry = {
      nodeId: node.id,
      speaker: node.speaker ?? null,
      text: node.text ?? '',
    };
    if (includeChoices && Array.isArray(node.choices) && node.choices.length > 0) {
      entry.choices = node.choices.map((choice) => ({
        text: choice.text ?? '',
        nextNode: choice.nextNode ?? null,
      }));
    }
    lines.push(entry);
    node = typeof node.nextNode === 'string' ? tree.getNode(node.nextNode) : null;
  }

  return {
    nodeCount: visited.size,
    lines,
  };
}

function isDialogueSummary(candidate) {
  return (
    candidate &&
    typeof candidate === 'object' &&
    Array.isArray(candidate.dialogues) &&
    typeof candidate.generatedAt === 'string'
  );
}
