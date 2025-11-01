import { DialogueTree } from '../DialogueTree.js';
import { GameConfig } from '../../config/GameConfig.js';

const DEFAULT_QUEST_ID = 'main-act3-gathering-support';

const NPC_LABELS = {
  dr_chen: 'Dr. Chen',
  soren: 'Soren',
  zara: 'Zara',
  captain_reese: 'Captain Reese',
  iris: 'Iris',
  elena_coalition: 'Elena Navarro',
};

function getGatheringSupportConfig() {
  const config = GameConfig?.narrative?.act3?.gatheringSupport;
  if (!config) {
    throw new Error('[Act3GatheringSupportDialogues] Missing GameConfig.narrative.act3.gatheringSupport configuration');
  }
  return config;
}

function resolveNpcName(npcId) {
  if (typeof npcId !== 'string') {
    return 'Unknown';
  }
  return NPC_LABELS[npcId] ?? npcId.replace(/_/g, ' ');
}

function buildDialogueScript({ stanceId, stanceTitle, milestone, branchId }) {
  const npcName = resolveNpcName(milestone.npcId);
  const playerPrompt = `We committed to ${stanceTitle.toLowerCase()}. I need you with me.`;
  const acknowledgement = (() => {
    switch (branchId) {
      case 'opposition':
        return `${npcName} weighs the cost before nodding—saving the city demands precision, not spectacle.`;
      case 'support':
        return `${npcName} accepts the tidal wave to come, promising to brace those it overwhelms.`;
      case 'alternative':
        return `${npcName} agrees to the slower burn, lending their influence to a controlled truth cascade.`;
      case 'shared':
        return `${npcName} double-checks the gear readouts and locks in the Archive breach loadout.`;
      default:
        return `${npcName} meets your stare and commits to the path ahead.`;
    }
  })();

  return {
    start: {
      speaker: 'Kira',
      text: milestone.openingLine ?? playerPrompt,
      choices: [
        {
          text: milestone.prompt ?? 'Lay out what this asks of you.',
          nextNode: 'debate',
        },
        {
          text: 'Not yet. I need to regroup.',
          nextNode: 'defer',
        },
      ],
    },
    debate: {
      speaker: npcName,
      text: milestone.responseLine ?? milestone.description,
      choices: [
        {
          text: milestone.commitChoiceText ?? 'We move now.',
          nextNode: 'commit',
        },
        {
          text: 'Hold that thought. I have more variables to check.',
          nextNode: 'defer',
        },
      ],
    },
    commit: {
      speaker: npcName,
      text: milestone.closingLine ?? acknowledgement,
      nextNode: null,
      consequences: {
        events: ['act3:gathering_support:milestone'],
        data: {
          questId: DEFAULT_QUEST_ID,
          branchId,
          stanceId,
          milestoneId: milestone.milestoneId,
          objectiveId: milestone.objectiveId,
          npcId: milestone.npcId ?? null,
          successFlag: milestone.successFlag ?? null,
          telemetryTag: milestone.telemetryTag ?? null,
        },
        setFlags: milestone.successFlag ? [milestone.successFlag] : undefined,
        storyFlags: milestone.storyFlags ?? undefined,
        worldFlags: milestone.worldFlags ?? undefined,
      },
    },
    defer: {
      speaker: npcName,
      text: milestone.deferLine ?? 'All right. But the window is shrinking. Ping me when you are truly ready.',
      nextNode: null,
    },
  };
}

function createMilestoneDialogue({ stance, milestone, branchId }) {
  const stanceTitle = stance.title || 'Chosen Path';
  const dialogueId =
    milestone.dialogueId ??
    `dialogue_act3_${branchId}_${milestone.milestoneId}`;

  const nodes = buildDialogueScript({
    stanceId: stance.id,
    stanceTitle,
    milestone,
    branchId,
  });

  return new DialogueTree({
    id: dialogueId,
    npcId: milestone.npcId ?? null,
    title: milestone.title ?? `${stanceTitle} Milestone`,
    nodes,
    metadata: {
      questId: DEFAULT_QUEST_ID,
      branchId,
      stanceId: stance.id,
      milestoneId: milestone.milestoneId,
      objectiveId: milestone.objectiveId,
      telemetryTag: milestone.telemetryTag ?? null,
    },
  });
}

function buildGatheringSupportDialogues() {
  const config = getGatheringSupportConfig();
  const dialogues = [];

  for (const stance of config.stances ?? []) {
    const milestones = Array.isArray(stance.milestones) ? stance.milestones : [];
    for (const milestone of milestones) {
      dialogues.push(createMilestoneDialogue({
        stance,
        milestone,
        branchId: stance.id,
      }));
    }
  }

  const shared = config.shared?.prepareLoadout;
  if (shared && shared.objectiveId && shared.milestoneId) {
    const stance = {
      id: 'shared',
      title: 'Shared Preparations',
    };
    const milestone = {
      ...shared,
      npcId: shared.npcId ?? 'zara',
      title: shared.title ?? 'Finalize the Archive Loadout',
      dialogueId: shared.dialogueId ?? 'dialogue_act3_shared_loadout',
      description: shared.description,
      responseLine:
        shared.responseLine ??
        'Zara scrolls through the gear manifest, highlighting every tamper-evident seal.',
      closingLine:
        shared.closingLine ??
        'Zara secures the cases. “Telemetry failsafes synced. No one walks into the Archive unprepared on my watch.”',
    };
    dialogues.push(createMilestoneDialogue({
      stance,
      milestone,
      branchId: shared.branchId ?? 'shared',
    }));
  }

  return dialogues;
}

export const ACT3_GATHERING_SUPPORT_DIALOGUES = buildGatheringSupportDialogues();

export function registerAct3GatheringSupportDialogues(dialogueSystem) {
  if (!dialogueSystem || typeof dialogueSystem.registerDialogueTree !== 'function') {
    throw new Error('[Act3GatheringSupportDialogues] DialogueSystem instance required');
  }

  const registered = [];
  for (const dialogue of ACT3_GATHERING_SUPPORT_DIALOGUES) {
    dialogueSystem.registerDialogueTree(dialogue);
    registered.push(dialogue);
  }
  return registered;
}
