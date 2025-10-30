/**
 * Act 2 Thread B: Archivist Resistance Alliance
 *
 * Quest scaffolding for the resistance contact interior. Tracks the player's
 * negotiation with the Archivists so faction alignment hooks and future branch
 * objectives can build on consistent trigger metadata.
 */

export const QUEST_ACT2_RESISTANCE = {
  id: 'main-act2-archivist-alliance',
  title: 'Archivist Alliance',
  type: 'main',
  act: 'act2',
  description: 'Secure the Archivists as allies by meeting in their under-city hideout and opening the tunnel network.',
  autoStart: false,
  prerequisites: {
    storyFlags: ['act2_branch_resistance_selected'],
  },
  objectives: [
    {
      id: 'obj_locate_resistance_contact',
      description: 'Reach the Archivist hideout without leading corporate surveillance.',
      trigger: {
        event: 'area:entered',
        areaId: 'resistance_contact_entry',
      },
      optional: false,
    },
    {
      id: 'obj_negotiate_alliance_terms',
      description: 'Negotiate terms with the resistance council at the strategy table.',
      trigger: {
        event: 'area:entered',
        areaId: 'resistance_strategy_table',
      },
      optional: false,
    },
    {
      id: 'obj_secure_escape_routes',
      description: 'Map the tunnel network to unlock shared extraction routes.',
      trigger: {
        event: 'area:entered',
        areaId: 'resistance_escape_tunnel',
      },
      optional: false,
    },
    {
      id: 'obj_coordinate_joint_ops',
      description: 'Coordinate joint operations with the Archivist strike teams.',
      trigger: {
        event: 'area:entered',
        areaId: 'resistance_coordination_chamber',
      },
      optional: false,
    },
    {
      id: 'obj_prime_signal_array',
      description: 'Prime the encrypted signal array to keep the alliance hidden.',
      trigger: {
        event: 'area:entered',
        areaId: 'resistance_signal_array',
      },
      optional: false,
    },
  ],
  rewards: {
    storyFlags: [
      'act2_resistance_alliance_secured',
      'act2_resistance_joint_ops_prepared',
      'act2_resistance_signal_ready',
    ],
    knowledgeIds: ['resistance_tunnel_network', 'resistance_signal_routes'],
    factionReputation: {
      archivists: 10,
    },
  },
  branches: [],
};

/**
 * Register the Archivist resistance quest with the QuestManager.
 * @param {import('../../game/managers/QuestManager.js').QuestManager} questManager
 */
export function registerAct2ResistanceQuest(questManager) {
  if (!questManager || typeof questManager.registerQuest !== 'function') {
    throw new Error('[Act2ResistanceQuest] QuestManager instance required');
  }
  questManager.registerQuest(QUEST_ACT2_RESISTANCE);
  return QUEST_ACT2_RESISTANCE;
}
