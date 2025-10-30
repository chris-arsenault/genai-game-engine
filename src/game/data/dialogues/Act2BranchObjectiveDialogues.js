import { DialogueTree } from '../DialogueTree.js';

export const ACT2_BRANCH_DIALOGUE_IDS = Object.freeze({
  personal: Object.freeze({
    projectionAnalysis: 'dialogue_act2_personal_projection_analysis',
    broadcastCommit: 'dialogue_act2_personal_shadow_broadcast',
  }),
  corporate: Object.freeze({
    encryptionClone: 'dialogue_act2_corporate_encryption_clone',
    exfiltrationRoute: 'dialogue_act2_corporate_exfiltration',
  }),
  resistance: Object.freeze({
    coordinationCouncil: 'dialogue_act2_resistance_coordination',
    signalArray: 'dialogue_act2_resistance_signal_array',
  }),
});

function createPersonalProjectionDialogue() {
  return new DialogueTree({
    id: ACT2_BRANCH_DIALOGUE_IDS.personal.projectionAnalysis,
    npcId: 'act2_personal_ops',
    title: 'Projection Analysis Brief',
    nodes: {
      start: {
        speaker: 'Kira',
        text: 'Projection lab is still powered. The vault kept every reconstruction looping like nothing happened.',
        nextNode: 'zara_sync',
      },
      zara_sync: {
        speaker: 'Zara',
        text: "Routing the feed to Dmitri. Keep the focus steady and flag any frames where IA tampered with your testimony.",
        nextNode: 'dmitri_tag',
      },
      dmitri_tag: {
        speaker: 'Dmitri',
        text: 'Scrubbing artefacts now. I will stamp each divergence and drop the clean timeline into the ledger.',
        nextNode: 'kira_closure',
      },
      kira_closure: {
        speaker: 'Kira',
        text: "Archive the hits that mention missing partners. Those projections are how we break the gag order.",
        nextNode: null,
      },
    },
  });
}

function createPersonalBroadcastDialogue() {
  return new DialogueTree({
    id: ACT2_BRANCH_DIALOGUE_IDS.personal.broadcastCommit,
    npcId: 'act2_personal_ops',
    title: 'Shadow Broadcast Prep',
    nodes: {
      start: {
        speaker: 'Kira',
        text: 'Broadcast terminal is online. One confirmation and the precinct hears everything we pulled.',
        nextNode: 'zara_warning',
      },
      zara_warning: {
        speaker: 'Zara',
        text: 'Once you schedule the drop, there is no revision cycle. Lock the slot you trust and annotate the case IDs.',
        nextNode: 'dmitri_scheduling',
      },
      dmitri_scheduling: {
        speaker: 'Dmitri',
        text: 'Routing through three burner uplinks. Midnight cycle will hit every whistleblower inbox we seeded.',
        nextNode: 'kira_commit',
      },
      kira_commit: {
        speaker: 'Kira',
        text: 'Do it. If Internal Affairs wants silence, they can argue with the whole city.',
        nextNode: null,
      },
    },
  });
}

function createCorporateEncryptionDialogue() {
  return new DialogueTree({
    id: ACT2_BRANCH_DIALOGUE_IDS.corporate.encryptionClone,
    npcId: 'act2_corporate_ops',
    title: 'Encryption Core Clone',
    nodes: {
      start: {
        speaker: 'Kira',
        text: 'Encryption lattice is humming. NeuroSync left the core unlocked for diagnostics.',
        nextNode: 'dmitri_clone',
      },
      dmitri_clone: {
        speaker: 'Dmitri',
        text: 'Shadow clone handshake engaged. Keep telemetry under the noise floor or the lattice will self-scrub.',
        nextNode: 'zara_cover',
      },
      zara_cover: {
        speaker: 'Zara',
        text: 'I am bleeding bogus maintenance logs into their SIEM. Thirty seconds before they notice the checksum drift.',
        nextNode: 'kira_confirm',
      },
      kira_confirm: {
        speaker: 'Kira',
        text: 'Clone secured. Purging fingerprints and moving before the sensors reboot.',
        nextNode: null,
      },
    },
  });
}

function createCorporateExfilDialogue() {
  return new DialogueTree({
    id: ACT2_BRANCH_DIALOGUE_IDS.corporate.exfiltrationRoute,
    npcId: 'act2_corporate_ops',
    title: 'Exfiltration Brief',
    nodes: {
      start: {
        speaker: 'Kira',
        text: 'Data caches staged. I am at the extraction gantry.',
        nextNode: 'zara_path',
      },
      zara_path: {
        speaker: 'Zara',
        text: 'Service lift is unlocked and looped to show an empty car. Follow the strobe markers and stay dark.',
        nextNode: 'dmitri_timer',
      },
      dmitri_timer: {
        speaker: 'Dmitri',
        text: 'Countermeasure sweep in ninety seconds. If you see blue arcs, break line of sight and I will flood the sensors.',
        nextNode: 'kira_exit',
      },
      kira_exit: {
        speaker: 'Kira',
        text: 'Copy. Leaving no traces. Meet you on the roofline.',
        nextNode: null,
      },
    },
  });
}

function createResistanceCoordinationDialogue() {
  return new DialogueTree({
    id: ACT2_BRANCH_DIALOGUE_IDS.resistance.coordinationCouncil,
    npcId: 'act2_resistance_ops',
    title: 'Coordination Council',
    nodes: {
      start: {
        speaker: 'Archivist Liaison',
        text: 'Our strike teams are ready, detective. We need your intel to prioritise which vaults go first.',
        nextNode: 'kira_plan',
      },
      kira_plan: {
        speaker: 'Kira',
        text: 'Start with the memory auditors. They are backing NeuroSync. I will divert patrol paths once we step off.',
        nextNode: 'zara_sync',
      },
      zara_sync: {
        speaker: 'Zara',
        text: 'Uploading heat-map overlays to your team tablets. Keep comms tight; corporate drones are already sniffing the sector.',
        nextNode: 'liaison_closure',
      },
      liaison_closure: {
        speaker: 'Archivist Liaison',
        text: 'Then we strike together. The tunnels are yours the second you give the word.',
        nextNode: null,
      },
    },
  });
}

function createResistanceSignalDialogue() {
  return new DialogueTree({
    id: ACT2_BRANCH_DIALOGUE_IDS.resistance.signalArray,
    npcId: 'act2_resistance_ops',
    title: 'Signal Array Calibration',
    nodes: {
      start: {
        speaker: 'Archivist Engineer',
        text: 'Array capacitors are primed. One misstep and the Corps triangulate our uplinks.',
        nextNode: 'kira_assurance',
      },
      kira_assurance: {
        speaker: 'Kira',
        text: 'Cycle the encrypted burst on my mark. Zara will mirror the packet from the Crossroads relay.',
        nextNode: 'zara_grid',
      },
      zara_grid: {
        speaker: 'Zara',
        text: 'Signal mesh ready. When you fire the array, I will overlay the broadcast through three shell corporations.',
        nextNode: 'engineer_finish',
      },
      engineer_finish: {
        speaker: 'Archivist Engineer',
        text: 'Firing now. Alliance comms are invisible and the corps are none the wiser.',
        nextNode: null,
      },
    },
  });
}

export function registerAct2BranchObjectiveDialogues(dialogueSystem) {
  if (!dialogueSystem || typeof dialogueSystem.registerDialogueTree !== 'function') {
    throw new Error('[Act2BranchObjectiveDialogues] DialogueSystem instance required');
  }

  const trees = [
    createPersonalProjectionDialogue(),
    createPersonalBroadcastDialogue(),
    createCorporateEncryptionDialogue(),
    createCorporateExfilDialogue(),
    createResistanceCoordinationDialogue(),
    createResistanceSignalDialogue(),
  ];

  for (const tree of trees) {
    dialogueSystem.registerDialogueTree(tree);
  }

  return trees;
}
