/**
 * Luminari Syndicate Faction Data
 *
 * Information control faction managing historical archives.
 * Based on MCP lore entry for The Luminari Syndicate.
 */

export const luminariSyndicate = {
  id: 'luminari_syndicate',
  name: 'The Luminari Syndicate',
  shortName: 'Luminari',
  description:
    'Faction controlling information and historical archives. Public mission: preserve knowledge and guide society. ' +
    'True goal: absolute information control through historical revisionism.',

  // Faction relationships
  allies: ['vanguard_prime'], // Both favor control (security vs information)
  enemies: ['wraith_network'], // Opposition to information freedom
  neutral: ['cipher_collective', 'memory_keepers'],

  // Reputation thresholds
  reputationThresholds: {
    hostile: { fame: 0, infamy: 50 }, // Information lockout, active suppression
    unfriendly: { fame: 10, infamy: 30 }, // Limited archive access
    neutral: { fame: 20, infamy: 20 }, // Standard access
    friendly: { fame: 50, infamy: 10 }, // Extended archive access
    allied: { fame: 80, infamy: 0 }, // Full archive access, classified records
  },

  // Initial reputation baseline (player retains cautious academic ties)
  initialReputation: {
    fame: 28,
    infamy: 12,
  },

  // Territory control
  territories: ['crest'], // Upper stratum
  headquarters: 'the_observatory',
  districts: ['historical_archives', 'propaganda_center', 'shadow_network_hub'],

  // Rewards
  rewards: {
    allied: {
      abilities: ['archive_access_classified', 'historical_insight'],
      items: ['luminari_signet', 'ancient_texts'],
      information: ['pre_collapse_records', 'collapse_truth'],
    },
    friendly: {
      abilities: ['archive_access_extended', 'research_privileges'],
      items: ['scholar_badge'],
      information: ['selected_histories'],
    },
  },

  // Visual identity
  colors: {
    primary: '#d4af37', // Gold
    secondary: '#f5f5dc', // Beige/cream
    accent: '#8b4513', // Brown
  },

  // Lore
  loreEntries: ['7fb96eca-380b-4815-96b8-efdf8fb6e23f'],
  keyCharacters: ['the_shadows', 'archivist_prime', 'elder_council'],
  ideology: 'Knowledge is power. Truth is dangerous.',

  // Faction mechanics
  mechanics: {
    information: {
      controlsMedia: true,
      propagandaActive: true,
      witnessInfiltration: true, // Can tamper with witnesses
    },
    archives: {
      accessLevels: 5,
      suppressedRecords: true,
      historicalRevision: true,
    },
  },

  // Backstory
  backstory:
    'Descended from pre-Collapse Preservationists. Possess complete pre-Collapse archives but deliberately suppress them. ' +
    'Leadership includes impossibly old individuals using lifespan extension. Know what caused the Collapse and believe ' +
    'humanity would repeat it if informed.',

  currentThreat:
    'Maintaining massive historical coverup. Using soft power, propaganda, and legal pressure to control narrative. ' +
    'Will sacrifice individuals to protect the greater secret.',
};
