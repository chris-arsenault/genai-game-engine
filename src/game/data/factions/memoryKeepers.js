/**
 * Memory Keepers Faction Data
 *
 * Passive preservation faction protecting uncensored history.
 * Based on MCP lore entry for The Memory Keepers.
 */

export const memoryKeepers = {
  id: 'memory_keepers',
  name: 'The Memory Keepers',
  shortName: 'Keepers',
  description:
    'Passive preservation faction protecting uncensored history. Public status: harmless philosophical movement. ' +
    'True goal: preserve truth until humanity is ready to learn from it.',

  // Faction relationships
  allies: [], // Neutral observers, allies to none
  enemies: [], // No enemies (passive resistance)
  neutral: ['vanguard_prime', 'luminari_syndicate', 'cipher_collective', 'wraith_network'],

  // Reputation thresholds
  reputationThresholds: {
    hostile: { fame: 0, infamy: 70 }, // Rare, requires betrayal of truth
    unfriendly: { fame: 20, infamy: 40 }, // Doubted
    neutral: { fame: 30, infamy: 20 }, // Observed
    friendly: { fame: 65, infamy: 10 }, // Trusted with partial truth
    allied: { fame: 95, infamy: 0 }, // The One We've Waited For (complete truth)
  },

  // Initial reputation baseline (Keepers quietly support the detective's mission)
  initialReputation: {
    fame: 30,
    infamy: 6,
  },

  // Territory control
  territories: ['undercroft'], // Hidden sanctuaries
  headquarters: 'archive_reliquary',
  districts: ['memory_sanctuaries', 'witness_havens', 'truth_chambers'],

  // Rewards
  rewards: {
    allied: {
      abilities: ['complete_history_access', 'abyss_map', 'synthesis_vision'],
      items: ['keeper_robes', 'truth_seal'],
      knowledge: ['complete_collapse_truth', 'arcology_purpose', 'earth_recovery_timeline'],
    },
    friendly: {
      abilities: ['partial_history_access', 'witness_testimony'],
      items: ['preservation_token'],
      knowledge: ['selected_truths', 'faction_secrets'],
    },
  },

  // Visual identity
  colors: {
    primary: '#8b7355', // Ancient brown
    secondary: '#d4d4aa', // Parchment
    accent: '#4a4a4a', // Ink black
  },

  // Lore
  loreEntries: ['4d4fd575-5c53-42cb-85e8-8928c1412956'],
  keyCharacters: ['elder_keepers', 'witness_protectors', 'the_synthesizer'],
  ideology: 'Preserve truth. Wait for the one who can bear it.',

  // Faction mechanics
  mechanics: {
    preservation: {
      maintainsCompleteHistory: true,
      protectsWitnesses: true,
      abyssMapKeepers: true, // Only complete map of the Abyss
    },
    philosophy: {
      passiveResistance: true,
      noViolence: true,
      waitingForInvestigator: true, // Waiting for player character
      guidedEventsFor127Years: true,
    },
    knowledge: {
      knowsArcologyPurpose: true, // Temporary preservation until Earth recovers
      knowsCollapseWasNecessary: true, // Deliberately didn't prevent it
      knowsRecoveryTimeline: true,
    },
  },

  // Backstory
  backstory:
    'Descended from pre-Collapse historians who saw the catastrophe coming and chose not to prevent it - believed it was ' +
    'a necessary reset for humanity. Have been guiding events for 127 years toward the moment when an investigator capable ' +
    'of synthesizing scattered truth would emerge. Use witness testimony and moral authority as their only weapons.',

  currentThreat:
    'No direct threat. Their patient strategy may backfire if truth is revealed before humanity is ready. ' +
    'Possess dangerous knowledge about the Arcology being temporary and Earth\'s recovery.',
};
