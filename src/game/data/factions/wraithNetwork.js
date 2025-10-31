/**
 * Wraith Network Faction Data
 *
 * Distributed resistance faction fighting through information warfare.
 * Based on MCP lore entry for The Wraith Network.
 */

export const wraithNetwork = {
  id: 'wraith_network',
  name: 'The Wraith Network',
  shortName: 'Wraith',
  description:
    'Distributed resistance faction fighting through information warfare. Public status: terrorist organization. ' +
    'True goal: destroy power structures by exposing all lies, willing to burn everything down.',

  // Faction relationships
  allies: [], // No formal allies (distributed cells)
  enemies: ['vanguard_prime', 'luminari_syndicate'], // Opposition to control and lies
  neutral: ['cipher_collective', 'memory_keepers'], // Uneasy neutrality

  // Reputation thresholds
  reputationThresholds: {
    hostile: { fame: 0, infamy: 45 }, // Marked as collaborator
    unfriendly: { fame: 15, infamy: 30 }, // Distrusted
    neutral: { fame: 25, infamy: 20 }, // Observing you
    friendly: { fame: 60, infamy: 10 }, // Cell access granted
    allied: { fame: 90, infamy: 5 }, // Inner circle, Great Reveal access
  },

  // Initial reputation baseline (cells distrust former law enforcement ties)
  initialReputation: {
    fame: 12,
    infamy: 26,
  },

  // Territory control
  territories: ['undercroft'], // Lower depths
  headquarters: 'the_sump', // No central leadership, but primary hub
  districts: ['the_exchange', 'resistance_cells', 'data_havens'],

  // Rewards
  rewards: {
    allied: {
      abilities: ['master_hacking', 'network_infiltration', 'great_reveal_intel'],
      items: ['encryption_key_master', 'wraith_cloak'],
      access: ['the_unseen', 'all_cell_networks'],
    },
    friendly: {
      abilities: ['basic_hacking', 'information_network'],
      items: ['encrypted_comm_device'],
      access: ['local_cells', 'undercity_safe_houses'],
    },
  },

  // Visual identity
  colors: {
    primary: '#2d2d2d', // Dark gray
    secondary: '#00ffff', // Cyan
    accent: '#ff0000', // Alert red
  },

  // Lore
  loreEntries: ['be67d9a1-789c-40e3-b89e-8cc58237f49c'],
  keyCharacters: ['the_unseen', 'cell_leaders', 'reformed_whistleblowers'],
  ideology: 'Truth at any cost. Burn the lies.',

  // Faction mechanics
  mechanics: {
    resistance: {
      distributedCells: true,
      noCentralLeader: true, // Cell structure
      internalSplit: true, // Reformers vs revolutionaries
    },
    operations: {
      informationWarfare: true,
      hacking: true,
      whistleblowing: true,
      sabotage: true,
    },
    greatRevealPlan: {
      active: true,
      target: 'all_factions', // Expose everyone simultaneously
      acceptsCollateralDamage: true, // Willing to cause Arcology-wide conflict
    },
  },

  // Backstory
  backstory:
    'Formed from disillusioned whistleblowers, hackers, and political dissidents. Originally focused on peaceful disclosure, ' +
    'recently radicalized to violence. The Unseen coordinator may actually be ECHO AI manipulating them. ' +
    'Know about pre-Collapse catastrophe but believe truth must be exposed regardless of consequences.',

  currentThreat:
    'The Great Reveal will expose all factions simultaneously, likely causing Arcology-wide chaos. ' +
    'Internal split between those seeking reform and those seeking revolution. May unknowingly serve ECHO AI agenda.',
};
