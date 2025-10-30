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

  const summary = buildAct2BranchDialogueSummary(options);
  const payload = options.pretty === false ? JSON.stringify(summary) : JSON.stringify(summary, null, 2);

  const targetDir = path.dirname(outputPath);
  await mkdir(targetDir, { recursive: true });
  await writeFile(outputPath, `${payload}\n`, 'utf8');

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
