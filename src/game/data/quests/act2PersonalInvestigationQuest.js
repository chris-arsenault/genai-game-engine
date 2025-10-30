/**
 * Act 2 Thread C: Personal Investigation
 *
 * Quest scaffolding for Kira's personal archive branch. Tracks the player's
 * effort to uncover suppressed case files and access the precinct memory vault
 * so downstream narrative beats can build on consistent trigger metadata.
 */

export const QUEST_ACT2_PERSONAL = {
  id: 'main-act2-personal-investigation',
  title: 'Personal Reckoning',
  type: 'main',
  act: 'act2',
  description:
    "Return to the sealed Mid-City precinct archives, reconstruct disputed cases, and unlock testimony that exposes the conspiracy around Kira's missing allies.",
  autoStart: false,
  prerequisites: {
    storyFlags: ['act2_branch_personal_selected'],
  },
  objectives: [
    {
      id: 'obj_access_personal_archive',
      description: 'Unlock the precinct archive without alerting Internal Affairs monitoring.',
      trigger: {
        event: 'area:entered',
        areaId: 'personal_archive_entry',
      },
      optional: false,
    },
    {
      id: 'obj_reconstruct_cold_cases',
      description: 'Review the sealed case files to recover suppressed evidence chains.',
      trigger: {
        event: 'area:entered',
        areaId: 'personal_casefile_review',
      },
      optional: false,
    },
    {
      id: 'obj_unlock_memory_vault',
      description: 'Collect the final testimony by accessing the secure memory vault.',
      trigger: {
        event: 'area:entered',
        areaId: 'personal_memory_vault',
      },
      optional: false,
    },
  ],
  rewards: {
    storyFlags: ['act2_personal_archive_uncovered'],
    knowledgeIds: ['personal_memory_threads'],
    factionReputation: {
      independents: 5,
    },
  },
  branches: [
    {
      condition: {
        storyFlags: ['act2_personal_archive_uncovered'],
      },
      nextQuest: 'main-act2-conspiracy-web',
    },
  ],
};

/**
 * Register the personal investigation quest with the QuestManager.
 * @param {import('../../game/managers/QuestManager.js').QuestManager} questManager
 */
export function registerAct2PersonalInvestigationQuest(questManager) {
  if (!questManager || typeof questManager.registerQuest !== 'function') {
    throw new Error('[Act2PersonalInvestigationQuest] QuestManager instance required');
  }
  questManager.registerQuest(QUEST_ACT2_PERSONAL);
  return QUEST_ACT2_PERSONAL;
}
