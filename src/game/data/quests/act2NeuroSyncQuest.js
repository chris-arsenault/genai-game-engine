/**
 * Act 2 Thread A: NeuroSync Corporate Infiltration
 *
 * Quest scaffolding for the first Act 2 branch interior. Tracks the player's
 * progress from lobby infiltration through to securing access to the server
 * hall so downstream objectives can build atop the investigation thread.
 */

export const QUEST_ACT2_NEUROSYNC = {
  id: 'main-act2-neurosync-infiltration',
  title: 'Inside NeuroSync',
  type: 'main',
  act: 'act2',
  description: 'Slip past NeuroSync security to uncover how the corporation is tied to Project Archive.',
  autoStart: false,
  prerequisites: {
    storyFlags: ['act2_branch_corporate_selected'],
  },
  objectives: [
    {
      id: 'obj_infiltrate_lobby',
      description: 'Blend into the NeuroSync lobby without triggering alarms.',
      trigger: {
        event: 'area:entered',
        areaId: 'corporate_lobby',
      },
      optional: false,
    },
    {
      id: 'obj_bypass_security_floor',
      description: 'Bypass the security floor patrolling drones to reach internal elevators.',
      trigger: {
        event: 'area:entered',
        areaId: 'corporate_security_floor',
      },
      optional: false,
    },
    {
      id: 'obj_locate_server_room',
      description: 'Secure a path to the server access hall deep within NeuroSync HQ.',
      trigger: {
        event: 'area:entered',
        areaId: 'corporate_server_access',
      },
      optional: false,
    },
  ],
  rewards: {
    storyFlags: ['act2_neurosync_interior_explored'],
    knowledgeIds: ['neurosync_security_layout'],
  },
  branches: [
    {
      condition: {
        storyFlags: ['act2_neurosync_interior_explored'],
      },
      nextQuest: 'main-act2-dr-chen',
    },
  ],
};

/**
 * Register the NeuroSync infiltration quest with the QuestManager.
 * @param {import('../../game/managers/QuestManager.js').QuestManager} questManager
 */
export function registerAct2NeuroSyncQuest(questManager) {
  if (!questManager || typeof questManager.registerQuest !== 'function') {
    throw new Error('[Act2NeuroSyncQuest] QuestManager instance required');
  }
  questManager.registerQuest(QUEST_ACT2_NEUROSYNC);
  return QUEST_ACT2_NEUROSYNC;
}
