import { DialogueTree } from '../DialogueTree.js';
import { GameConfig } from '../../config/GameConfig.js';

const DEFAULT_DIALOGUE_ID = 'dialogue_act2_crossroads_briefing';
const DEFAULT_NPC_ID = 'zara_crossroads';

function getCrossroadsConfig() {
  const config = GameConfig?.narrative?.act2?.crossroads;
  if (!config) {
    throw new Error('[Act2CrossroadsDialogue] Missing GameConfig.narrative.act2.crossroads configuration');
  }
  return config;
}

function buildThreadChoice(thread) {
  const threadLabel = thread?.title ?? 'Unlabelled Thread';
  const choiceText = thread?.choiceText || `Commit to ${threadLabel}`;
  const threadId = thread?.id || 'unknown_thread';
  const consequences = {
    events: ['crossroads:thread_selected'],
    data: {
      branchId: threadId,
      branchTitle: threadLabel,
      questId: getCrossroadsConfig().questId || null,
      selectedQuestId: thread?.questId || null,
      telemetryTag: thread?.telemetryTag || null,
      worldFlags: Array.isArray(thread?.worldFlags) ? [...thread.worldFlags] : [],
    },
  };

  if (Array.isArray(thread?.worldFlags) && thread.worldFlags.length > 0) {
    consequences.setFlags = [...thread.worldFlags];
  }

  return {
    text: choiceText,
    nextNode: 'thread_commit_bridge',
    consequences,
    metadata: {
      branchId: threadId,
      questId: thread?.questId || null,
      telemetryTag: thread?.telemetryTag || null,
      summary: thread?.summary || '',
    },
  };
}

function createThreadPreviewNode(thread) {
  const nodeId = `preview_${thread.id}`;
  const summary = thread?.summary || 'No intel available yet.';
  return [
    nodeId,
    {
      speaker: 'Zara',
      text: summary,
      choices: [
        {
          text: 'Commit to this thread',
          nextNode: 'thread_commit_bridge',
          consequences: {
            events: ['crossroads:thread_selected'],
            data: {
              branchId: thread.id,
              branchTitle: thread.title,
              questId: getCrossroadsConfig().questId || null,
              selectedQuestId: thread.questId || null,
              telemetryTag: thread.telemetryTag || null,
              worldFlags: Array.isArray(thread.worldFlags) ? [...thread.worldFlags] : [],
            },
            setFlags: Array.isArray(thread.worldFlags) ? [...thread.worldFlags] : undefined,
          },
          metadata: {
            branchId: thread.id,
            summary,
          },
        },
        {
          text: 'Back to thread list',
          nextNode: 'thread_selection',
        },
      ],
    },
  ];
}

export function createAct2CrossroadsBriefingDialogue(options = {}) {
  const {
    npcId = DEFAULT_NPC_ID,
    dialogueId = DEFAULT_DIALOGUE_ID,
  } = options;

  const config = getCrossroadsConfig();
  const threads = Array.isArray(config.threads) ? config.threads : [];

  const nodes = {
    start: {
      speaker: 'Zara',
      text: 'Okay, detective - three leads, three headaches. Want the quick download or feeling decisive tonight?',
      metadata: {
        useFactionGreeting: true,
        attitudeVariants: {
          hostile: 'Network nodes are closing on you, detective. Say your piece fast or the Wraith Network cuts the channel.',
          unfriendly: 'Signals jitter around your ID. I will brief you, but do not expect favors tonight.',
          neutral: 'Okay, detective - three leads, three headaches. Want the quick download or feeling decisive tonight?',
          friendly: 'Your last pulls kept the network alive. I stacked the intel, ready for whichever thread you want to burn down.',
          allied: 'Shadowspace is yours tonight, partner. Three leads and every node is primed the moment you call it.',
          default: 'Okay, detective - three leads, three headaches. Want the quick download or feeling decisive tonight?'
        },
      },
      choices: [
        {
          text: 'Hit me with the breakdown.',
          nextNode: 'thread_overview',
        },
        {
          text: "I'm ready to pick a thread.",
          nextNode: 'thread_selection',
        },
        {
          text: 'Later. I need a second.',
          nextNode: 'wrap_up',
        },
      ],
    },
    thread_overview: {
      speaker: 'Zara',
      text: 'Corporate, resistance, or personal - each opens a different door and a different can of worms. Want me to expand on one?',
      choices: [
        ...threads.map((thread) => ({
          text: thread.title || 'Unknown lead',
          nextNode: `preview_${thread.id}`,
        })),
        {
          text: 'Go back.',
          nextNode: 'start',
        },
      ],
    },
    thread_selection: {
      speaker: 'Zara',
      text: 'Call the shot and I will lock in logistics. Once we move, all our tracking pivots to that lead.',
      choices: threads.map((thread) => buildThreadChoice(thread)),
    },
    thread_commit_bridge: {
      speaker: 'Zara',
      text: 'Logged. I will ping Dmitri and start preloading the intel packages. No second-guessing mid-run, alright?',
      nextNode: 'thread_commit_confirmation',
    },
    thread_commit_confirmation: {
      speaker: 'Zara',
      text: 'I will flag the telemetry so the analysts know which branch you are burning through. Let me know when you want to launch.',
      nextNode: null,
    },
    wrap_up: {
      speaker: 'Zara',
      text: 'Fine by me. The threads are not going anywhere - but neither are the corps breathing down our necks.',
      nextNode: null,
    },
  };

  for (const thread of threads) {
    const [nodeId, nodeData] = createThreadPreviewNode(thread);
    nodes[nodeId] = nodeData;
  }

  return new DialogueTree({
    id: dialogueId,
    npcId,
    title: 'Act 2 Crossroads Briefing',
    nodes,
    metadata: {
      factionId: 'wraith_network',
    },
  });
}

export function registerAct2CrossroadsDialogues(dialogueSystem, options = {}) {
  if (!dialogueSystem || typeof dialogueSystem.registerDialogueTree !== 'function') {
    throw new Error('[Act2CrossroadsDialogue] DialogueSystem instance required');
  }

  const briefingDialogue = createAct2CrossroadsBriefingDialogue(options);
  dialogueSystem.registerDialogueTree(briefingDialogue);
  return briefingDialogue;
}
