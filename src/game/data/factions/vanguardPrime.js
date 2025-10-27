/**
 * Vanguard Prime Faction Data
 *
 * Authoritarian security faction controlling law enforcement.
 * Based on MCP lore entry for Vanguard Prime.
 */

export const vanguardPrime = {
  id: 'vanguard_prime',
  name: 'Vanguard Prime',
  shortName: 'Vanguard',
  description:
    'Authoritarian security faction controlling law enforcement and military operations. ' +
    'Public mission: maintain order and protect citizens. True goal: prevent another Collapse through absolute control.',

  // Faction relationships
  allies: ['luminari_syndicate'], // Both favor control and order
  enemies: ['wraith_network'], // Direct opposition to resistance
  neutral: ['cipher_collective', 'memory_keepers'],

  // Reputation thresholds (Fame / Infamy)
  reputationThresholds: {
    hostile: { fame: 0, infamy: 50 }, // Attack on sight
    unfriendly: { fame: 10, infamy: 30 }, // Restricted access, heavy surveillance
    neutral: { fame: 20, infamy: 20 }, // Default state
    friendly: { fame: 50, infamy: 10 }, // Services available, less scrutiny
    allied: { fame: 80, infamy: 0 }, // Full trust, security clearance
  },

  // Territory control (Vesper Arcology strata)
  territories: ['crest', 'lattice'], // Upper stratum and mid-levels
  headquarters: 'spire_court',
  districts: ['security_nexus', 'command_tribunal', 'training_grounds'],

  // Faction-specific rewards by reputation level
  rewards: {
    allied: {
      abilities: ['security_clearance_max', 'military_intel_access'],
      items: ['vanguard_badge', 'combat_training'],
      discounts: { equipment: 0.3, services: 0.5 },
    },
    friendly: {
      abilities: ['safe_passage', 'evidence_access'],
      items: ['basic_clearance'],
      discounts: { equipment: 0.15 },
    },
  },

  // Visual identity
  colors: {
    primary: '#1a4d8f', // Military blue
    secondary: '#8fb4d9', // Light blue
    accent: '#ff6b6b', // Alert red
  },

  // Lore and narrative
  loreEntries: ['d11ddae8-3631-4380-a935-04351a5bdc6c'], // MCP lore ID
  keyCharacters: ['commander_ashford', 'captain_reyes', 'the_cleaners'],
  ideology: 'Order through strength. Security above freedom.',

  // Faction-specific mechanics
  mechanics: {
    surveillance: {
      enabled: true,
      detectionRadius: 150, // Higher surveillance in their territory
      crimePenaltyMultiplier: 2.0, // Crimes against Vanguard are heavily penalized
    },
    military: {
      armedNPCs: true,
      responseTime: 'fast', // Quick response to disturbances
      contingencyProtocol: true, // Will activate purge protocol if threatened
    },
  },

  // Backstory context
  backstory:
    'Formed 127 years ago after the Collapse to maintain order. Originally peacekeepers, ' +
    'increasingly authoritarian. Possess pre-Collapse military technology. Preparing military coup ' +
    'to seize complete control. Command Tribunal leadership enhanced by Cipher Collective (increasing paranoia).',

  currentThreat:
    'Preparing Contingency Protocol to purge Foundation and Undercroft populations if control threatened. ' +
    'Conduct false flag operations to justify expanded authority.',
};
