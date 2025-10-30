import { GameConfig } from '../../config/GameConfig.js';

function getCrossroadsThreads() {
  const threads = GameConfig?.narrative?.act2?.crossroads?.threads;
  return Array.isArray(threads) ? threads : [];
}

export const QUEST_ACT2_CROSSROADS = {
  id: 'main-act2-crossroads',
  title: 'Crossroads Hub',
  type: 'main',
  act: 'act2',
  description: 'Commit to an investigative thread for Act 2 by clearing the checkpoint, syncing with Zara, and choosing the first lead to pursue.',
  autoStart: false,
  prerequisites: {
    storyFlags: ['act1_complete'],
  },
  objectives: [
    {
      id: 'obj_enter_corporate_spires',
      description: 'Present forged credentials at the corporate spires checkpoint.',
      trigger: {
        event: 'area:entered',
        areaId: 'corporate_spires_checkpoint',
      },
      optional: false,
    },
    {
      id: 'obj_attend_zara_briefing',
      description: "Review Zara's dossier on the three investigation threads.",
      trigger: {
        event: 'narrative:crossroads_prompt',
        areaId: 'safehouse_briefing_table',
      },
      optional: false,
    },
    {
      id: 'obj_choose_investigation_thread',
      description: 'Commit to a thread to pursue first.',
      trigger: {
        event: 'crossroads:thread_selected',
        questId: 'main-act2-crossroads',
      },
      optional: false,
      metadata: {
        branchingChoice: true,
      },
    },
  ],
  branches: getCrossroadsThreads().map((thread) => ({
    condition: {
      storyFlags: Array.isArray(thread.worldFlags) && thread.worldFlags.length > 0
        ? [thread.worldFlags[0]]
        : [],
    },
    nextQuest: thread.questId || null,
  })),
};

/**
 * Register the Act 2 Crossroads quest and ensure branch metadata lines up with config.
 * @param {import('../../managers/QuestManager.js').QuestManager} questManager
 */
export function registerAct2CrossroadsQuest(questManager) {
  if (!questManager || typeof questManager.registerQuest !== 'function') {
    throw new Error('[Act2CrossroadsQuest] QuestManager instance required');
  }

  // Refresh branch definitions from config at registration time
  const questDefinition = {
    ...QUEST_ACT2_CROSSROADS,
    branches: getCrossroadsThreads()
      .filter((thread) => thread.questId)
      .map((thread) => {
        const nextQuestId =
          questManager?.quests?.has(thread.questId) === true ? thread.questId : null;
        return {
          condition: {
            storyFlags: Array.isArray(thread.worldFlags) && thread.worldFlags.length > 0
              ? [thread.worldFlags[0]]
              : [],
          },
          nextQuest: nextQuestId,
        };
      })
      .filter((branch) => Boolean(branch.nextQuest)),
  };

  questManager.registerQuest(questDefinition);
  return questDefinition;
}
