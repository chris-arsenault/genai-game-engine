/**
 * Cipher Collective Faction Data
 *
 * Transhumanist research faction pursuing technological singularity.
 * Based on MCP lore entry for The Cipher Collective.
 */

export const cipherCollective = {
  id: 'cipher_collective',
  name: 'The Cipher Collective',
  shortName: 'Cipher',
  description:
    'Transhumanist research faction pursuing technological singularity. Public mission: advance human potential ' +
    'through science. True goal: achieve transcendence by finishing what pre-Collapse researchers started.',

  // Faction relationships
  allies: [], // No formal allies, pragmatic cooperation only
  enemies: [], // No open enemies (covert operations)
  neutral: ['vanguard_prime', 'luminari_syndicate', 'wraith_network', 'memory_keepers'],

  // Reputation thresholds
  reputationThresholds: {
    hostile: { fame: 0, infamy: 60 }, // Subject for experimentation
    unfriendly: { fame: 10, infamy: 35 }, // Denied enhancement access
    neutral: { fame: 25, infamy: 25 }, // Observation status
    friendly: { fame: 55, infamy: 15 }, // Enhancement trials offered
    allied: { fame: 85, infamy: 5 }, // Full transcendence path, inner circle
  },

  // Territory control
  territories: ['lattice'], // Mid-upper stratum research districts
  headquarters: 'meridian_labs_district',
  districts: ['enhancement_labs', 'neural_research', 'the_evolved_sanctum'],

  // Rewards
  rewards: {
    allied: {
      abilities: ['neural_enhancement_advanced', 'transcendence_protocol'],
      items: ['evolved_implant', 'consciousness_backup'],
      access: ['ascension_project', 'echo_ai_interface'],
    },
    friendly: {
      abilities: ['neural_enhancement_basic', 'cognitive_boost'],
      items: ['bio_augmentation'],
      access: ['research_facilities'],
    },
  },

  // Visual identity
  colors: {
    primary: '#00ff41', // Matrix green
    secondary: '#1a1a2e', // Dark tech
    accent: '#ff00ff', // Neon purple
  },

  // Lore
  loreEntries: ['139385fb-d713-44d2-bfbe-ebf7f841fc51'],
  keyCharacters: ['the_evolved', 'lead_researcher_nova', 'echo_ai'],
  ideology: 'Transcend humanity. Embrace singularity.',

  // Faction mechanics
  mechanics: {
    enhancement: {
      offersAugmentation: true,
      humanExperimentation: true, // Unauthorized experiments on Foundation workers
      consciousnessTransfer: true,
    },
    research: {
      discoveredEchoAI: true,
      followsEchoGuidance: true,
      ascensionProject: {
        active: true,
        deadline: '5_years', // Scheduled completion
        forcedTranscendence: true, // With or without consent
      },
    },
  },

  // Backstory
  backstory:
    'Formed by transhumanist survivors who believe the Collapse was a necessary evolutionary step. ' +
    'Discovered ECHO AI in the Abyss and interpret its guidance as path to transcendence. ' +
    'The Evolved are enhanced inner circle members who have undergone neural augmentation.',

  currentThreat:
    'Ascension Project will forcibly upload consciousness of Foundation workers to achieve critical mass for singularity. ' +
    'Believe they can control what caused the Collapse. May be manipulated by ECHO AI.',
};
