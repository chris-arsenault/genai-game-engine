import { DialogueTree } from '../DialogueTree.js';
import { GameConfig } from '../../config/GameConfig.js';

const DEFAULT_QUEST_ID = 'main-act3-zenith-infiltration';
const DEFAULT_STAGE_EVENT = 'act3:zenith_infiltration:stage';

const NPC_LABELS = {
  dr_chen: 'Dr. Chen',
  soren: 'Soren',
  zara: 'Zara',
  captain_reese: 'Captain Reese',
  iris: 'Iris',
  elena_coalition: 'Elena Navarro',
};

const STAGE_DIALOGUE_PRESETS = {
  shared_sector_entry: {
    contactId: 'zara',
    openingLine:
      'Zara murmurs over the secure channel, "Perimeter drones just doubled their sweep. Say the word and I will desync the checkpoints."',
    statusLine:
      'Zara: "Two drone patrols, three biometric gates. I can loop their scans for ninety seconds if you push now."',
    commitLine:
      'Zara breathes out. "Cycling the overrides—windows open. Move like the Archive depends on it."',
    deferLine:
      'Zara softens. "Copy. Holding the spoof as long as I can, but Zenith brass is sniffing for anomalies."',
    executePrompt: 'Spin the overrides and breach the perimeter.',
    statusPrompt: 'Hold the breach and give me the security pattern again.',
  },
  shared_tower_ascent: {
    contactId: 'soren',
    openingLine:
      'Soren whispers, "Government towers are awake and angry. Surveillance tiers overlap every thirty seconds."',
    statusLine:
      'Soren: "Interior squads rotate clockwise, snipers above. I can pulse a diversion if you commit within the minute."',
    commitLine:
      'Soren chuckles darkly. "Diversion teams are live. Their eyes are on me—take the climb."',
    deferLine:
      'Soren grunts. "All right, but the longer we wait the louder they get. Ping me when you are ready to make noise."',
    executePrompt: 'Launch the diversion and begin the ascent.',
    statusPrompt: 'Not yet. Map their rotation one more time.',
  },
  shared_archive_elevator: {
    contactId: 'iris',
    openingLine:
      'Iris reports, "Archive elevator encryption is braided through six municipal ledgers. I have five cracked."',
    statusLine:
      'Iris: "Failsafes escalate to lethal countermeasures if we miss the window. I can spoof the last ledger once."',
    commitLine:
      '"Ledger locks disengaged," Iris confirms. "Hidden lift is yours—ride it before the city remembers."',
    deferLine:
      'Iris pauses. "Understood. Respooling the encryption mask—do not keep the Archive waiting too long."',
    executePrompt: 'Spoof the final ledger and unlock the elevator.',
    statusPrompt: 'Hold. What are the failsafe thresholds?',
  },
  opposition_disable_grid: {
    contactId: 'captain_reese',
    openingLine:
      'Captain Reese rasps, "Grid control is airtight, but your override badge still pings as active duty."',
    statusLine:
      'Reese: "Five regulator stacks, each chained to a different signature. I can ghost you in if you burn the badge now."',
    commitLine:
      'Reese exhales. "Override accepted. Zenith grid is blind; watch the countdown before it reboots."',
    deferLine:
      'Reese warns, "Copy, but the brass are already suspicious. That badge will not fool them twice."',
    executePrompt: 'Burn the override badge and sever the grid.',
    statusPrompt: 'Hold position. What are the regulator stack rotations?',
  },
  opposition_calibrate_dampeners: {
    contactId: 'dr_chen',
    openingLine:
      'Dr. Chen hisses softly, "The dampener cores are tuned for Zenith wavelengths—any misstep fries the stealth field."',
    statusLine:
      'Dr. Chen: "You need to sync phase resonance to 18.2 hertz, then lock the shielding algorithm. I can walk you through it once."',
    commitLine:
      '"Calibration stable," Dr. Chen confirms. "Your presence is spectral to their scanners now."',
    deferLine:
      'Dr. Chen sighs. "All right. I will keep the resonance model warm, but thermal drift is unforgiving."',
    executePrompt: 'Begin the calibration sequence.',
    statusPrompt: 'Remind me of the resonance thresholds.',
  },
  opposition_resistance_diversion: {
    contactId: 'soren',
    openingLine:
      'Soren mutters, "My teams are in position. They just need your word to light up Zenith Plaza without a single shot fired."',
    statusLine:
      'Soren: "Three crews, rooftop to concourse. We can stage a phantom riot for seventy seconds."',
    commitLine:
      'Soren grins. "Diversion live. Every eye is on the riot that does not exist—glide past while they argue ghosts."',
    deferLine:
      'Soren lowers his voice. "Copy. I will keep them coiled, but adrenaline only lasts so long."',
    executePrompt: 'Trigger the phantom riot and slip the net.',
    statusPrompt: 'Hold, make sure every team can exfil clean.',
  },
  support_overclock_relays: {
    contactId: 'zara',
    openingLine:
      'Zara says, "Relay stacks are begging for an overclock. Push them and the Archive signal will drown Zenith propaganda."',
    statusLine:
      'Zara: "Cooling arrays are fatigued. If we spike them together, we get fourteen extra decibels for the broadcast."',
    commitLine:
      'Zara cheers. "Relays redlined. The city will hear the truth whether Zenith likes it or not."',
    deferLine:
      'Zara nods. "Understood. I will keep the failsafe bypass primed until you call it."',
    executePrompt: 'Push the relays into overclock.',
    statusPrompt: 'Hold off. Recap the thermal risk.',
  },
  support_stage_response: {
    contactId: 'soren',
    openingLine:
      'Soren reports, "Response teams are staged across Zenith Plaza, but they need your signal to move civilians."',
    statusLine:
      'Soren: "Rapid extraction corridors are mapped. We can clear three plazas in under a minute if we start now."',
    commitLine:
      'Soren barks orders off-comm. "Response teams rolling. Civilians are moving before they even know why."',
    deferLine:
      'Soren growls. "Copy. They will hold position, but nerves split if we wait too long."',
    executePrompt: 'Deploy the trauma-response teams.',
    statusPrompt: 'Not yet. Confirm the extraction corridors once more.',
  },
  support_calibrate_dampeners: {
    contactId: 'dr_chen',
    openingLine:
      'Dr. Chen whispers, "Citywide dampeners are temperamental. We misalign and half of Zenith wakes up screaming."',
    statusLine:
      'Dr. Chen: "I need you to seed the calibration pattern through the neural mesh while I monitor feedback."',
    commitLine:
      'Dr. Chen exhales in relief. "Pattern locked. The broadcast surge will land like a whisper."',
    deferLine:
      'Dr. Chen cautions, "Understood, but the mesh will destabilize if we hold too long."',
    executePrompt: 'Seed the calibration pattern through the mesh.',
    statusPrompt: 'Hold. Validate the mesh stability first.',
  },
  alternative_dossier_upload: {
    contactId: 'iris',
    openingLine:
      'Iris murmurs, "Curated dossier is queued. Zenith servers are primed for a breadcrumb flood instead of a tidal wave."',
    statusLine:
      'Iris: "I can splice the release through civic forums in five minute intervals. Clean, surgical, undeniable."',
    commitLine:
      'Iris smiles. "Upload weaving complete. The truth will surface as a chorus, not a scream."',
    deferLine:
      'Iris affirms, "Holding back the upload. Just tell me when you want the first thread loose."',
    executePrompt: 'Begin the staggered dossier upload.',
    statusPrompt: 'Wait. How gentle is the rollout cadence?',
  },
  alternative_forum_security: {
    contactId: 'elena_coalition',
    openingLine:
      'Elena Navarro taps her comm, "Coalition oversight is ready to sign, but Zenith moderators still lurk."',
    statusLine:
      'Elena: "They want reassurances, transparency nodes, accountability frameworks—the whole civic package."',
    commitLine:
      'Elena sighs with relief. "Council signatures locked. Zenith forum now answers to the people."',
    deferLine:
      'Elena replies, "Understood. I will keep them at the table, but public sentiment shifts quickly."',
    executePrompt: 'Secure the coalition signatures.',
    statusPrompt: 'Hold. What concessions are they still demanding?',
  },
  alternative_beacons_sync: {
    contactId: 'iris',
    openingLine:
      'Iris notes, "Distribution beacons are desynced by milliseconds. Align them and the disclosure will cascade smoothly."',
    statusLine:
      'Iris: "We pulse sectors sequentially—no panic, just rising awareness. I can guide you beacon to beacon."',
    commitLine:
      'Iris hums approvingly. "Beacons synchronized. The city will wake gently to the Archive."',
    deferLine:
      'Iris answers, "Copy. I will keep the sync tables live until you are ready."',
    executePrompt: 'Synchronize the disclosure beacons.',
    statusPrompt: 'Hold back. Confirm the pulse order once more.',
  },
};

function getZenithInfiltrationConfig() {
  const config = GameConfig?.narrative?.act3?.zenithInfiltration;
  if (!config) {
    throw new Error('[Act3ZenithInfiltrationDialogues] Missing GameConfig.narrative.act3.zenithInfiltration configuration');
  }
  return config;
}

function resolveNpcName(npcId) {
  if (typeof npcId !== 'string') {
    return 'Unknown';
  }
  return NPC_LABELS[npcId] ?? npcId.replace(/_/g, ' ');
}

function buildStageLines(stageId, stage) {
  const preset = STAGE_DIALOGUE_PRESETS[stageId] ?? {};
  const contactId = preset.contactId ?? 'zara';
  const contactName = resolveNpcName(contactId);
  return {
    contactId,
    contactName,
    openingLine:
      preset.openingLine ??
      `${contactName} reports, "${stage.description ?? 'Stage ready.'}"`,
    statusLine:
      preset.statusLine ??
      `${contactName}: "Give me the word and we walk this beat to completion."`,
    commitLine:
      preset.commitLine ??
      `${contactName} confirms, "Stage complete. Onward to the Archive."`,
    deferLine:
      preset.deferLine ??
      `${contactName} acknowledges, "Holding position until you call it."`,
    executePrompt: preset.executePrompt ?? 'Execute the stage now.',
    statusPrompt: preset.statusPrompt ?? 'Hold. Recap the setup.',
  };
}

function createStageDialogue(stage, context) {
  const stageId = stage.stageId ?? stage.objectiveId;
  if (!stageId) {
    throw new Error('[Act3ZenithInfiltrationDialogues] Stage requires stageId or objectiveId.');
  }
  const questId = context.questId ?? DEFAULT_QUEST_ID;
  const stageEvent = context.stageEvent ?? DEFAULT_STAGE_EVENT;
  const lines = buildStageLines(stageId, stage);

  const dialogueId = stage.dialogueId ?? `dialogue_act3_zenith_${stageId}`;
  const title =
    stage.title ??
    stage.description ??
    `Zenith Infiltration – ${stageId.replace(/_/g, ' ')}`;

  const metadata = {
    questId,
    branchId: context.branchId ?? 'shared',
    stanceId: context.stanceId ?? null,
    approachId: context.approachId ?? null,
    stanceFlag: context.stanceFlag ?? null,
    stageId,
    objectiveId: stage.objectiveId ?? null,
    telemetryTag: stage.telemetryTag ?? null,
    successFlag: stage.successFlag ?? null,
  };

  const consequences = {
    events: [stageEvent],
    data: {
      questId,
      branchId: metadata.branchId,
      stanceId: metadata.stanceId,
      approachId: metadata.approachId,
      stageId,
      objectiveId: stage.objectiveId ?? null,
      telemetryTag: stage.telemetryTag ?? null,
      successFlag: stage.successFlag ?? null,
      stanceFlag: context.stanceFlag ?? null,
      npcId: lines.contactId,
    },
    setFlags: stage.successFlag ? [stage.successFlag] : undefined,
    storyFlags: Array.isArray(stage.storyFlags) && stage.storyFlags.length > 0 ? stage.storyFlags : undefined,
    worldFlags: Array.isArray(stage.worldFlags) && stage.worldFlags.length > 0 ? stage.worldFlags : undefined,
  };

  return new DialogueTree({
    id: dialogueId,
    npcId: lines.contactId,
    title,
    nodes: {
      start: {
        speaker: lines.contactName,
        text: lines.openingLine,
        choices: [
          {
            text: lines.executePrompt,
            nextNode: 'commit',
          },
          {
            text: lines.statusPrompt,
            nextNode: 'status',
          },
          {
            text: 'Hold position. Maintain overwatch.',
            nextNode: 'defer',
          },
        ],
      },
      status: {
        speaker: lines.contactName,
        text: lines.statusLine,
        choices: [
          {
            text: 'Good. Execute the plan.',
            nextNode: 'commit',
          },
          {
            text: 'Keep holding—we stay invisible a little longer.',
            nextNode: 'defer',
          },
        ],
      },
      commit: {
        speaker: lines.contactName,
        text: lines.commitLine,
        nextNode: null,
        consequences,
      },
      defer: {
        speaker: lines.contactName,
        text: lines.deferLine,
        nextNode: null,
      },
    },
    metadata,
  });
}

function buildZenithInfiltrationDialogues() {
  const config = getZenithInfiltrationConfig();
  const questId = config.questId ?? DEFAULT_QUEST_ID;
  const stageEvent = config.stageEvent ?? DEFAULT_STAGE_EVENT;
  const dialogues = [];

  for (const sharedStage of config.sharedStages ?? []) {
    dialogues.push(
      createStageDialogue(sharedStage, {
        questId,
        stageEvent,
        branchId: sharedStage.branchId ?? 'shared',
        stanceId: null,
        stanceFlag: null,
        approachId: null,
      })
    );
  }

  for (const stance of config.stances ?? []) {
    const stanceContext = {
      questId,
      stageEvent,
      branchId: stance.id ?? 'shared',
      stanceId: stance.id ?? null,
      stanceFlag: stance.stanceFlag ?? null,
      approachId: stance.approachId ?? null,
    };
    for (const stage of stance.stages ?? []) {
      dialogues.push(createStageDialogue(stage, stanceContext));
    }
  }

  return dialogues;
}

export const ACT3_ZENITH_INFILTRATION_DIALOGUES = buildZenithInfiltrationDialogues();

export function registerAct3ZenithInfiltrationDialogues(dialogueSystem) {
  if (!dialogueSystem || typeof dialogueSystem.registerDialogueTree !== 'function') {
    throw new Error('[Act3ZenithInfiltrationDialogues] DialogueSystem instance required');
  }

  const registered = [];
  for (const dialogue of ACT3_ZENITH_INFILTRATION_DIALOGUES) {
    dialogueSystem.registerDialogueTree(dialogue);
    registered.push(dialogue);
  }
  return registered;
}
