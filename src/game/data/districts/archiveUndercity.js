/**
 * Archive Undercity Data Definition
 *
 * Hidden resistance enclave built into abandoned infrastructure beneath the Arcology.
 * Houses illicit archives, server farms, and Memory Keeper sanctuaries.
 */

export const archiveUndercity = {
  id: 'archive_undercity',
  name: 'Archive Undercity',
  shortName: 'Undercity',
  tier: 'undercroft',
  description:
    'Collapsed transit tunnels and forgotten maintenance vaults repurposed into resistance strongholds. ' +
    'Humid atmosphere, improvised power grids, and server stacks housing forbidden histories.',
  theme: {
    keywords: ['resistance', 'hidden-archives', 'hazardous'],
    palette: ['#34F2B6', '#0B1F1A', '#722DF9'],
    lighting: 'bioluminescent algae, jury-rigged work lights, and flickering holo-terminals',
    musicBed: 'soundscapes/undercity_haunt',
  },
  controllingFaction: 'memory_keepers',
  influence: {
    supportive: ['wraith_network'],
    competing: ['vanguard_prime', 'luminari_syndicate'],
  },
  stability: {
    rating: 'unstable',
    base: 47,
    volatilityDrivers: [
      'Resource scarcity and environmental hazards threaten long-term viability',
      'Intel leaks risk Vanguard Prime assaults; evacuation drills trigger panic',
    ],
    notes:
      'Resistance cells maintain fragile alliances. Each raid risk shifts the balance, and newcomers must prove loyalty.',
  },
  security: {
    level: 3,
    description:
      'Physical security relies on labyrinthine layout, dead drops, and signal jammers. ' +
      'Defense drones are scarce, but improvised traps deter intruders.',
    surveillanceCoverage: 'Localized—manual spotters and short-range scanners instead of persistent cameras',
  },
  access: {
    defaultUnlocked: false,
    fastTravelEnabled: false,
    requirements: {
      knowledge: ['knowledge_founders_massacre', 'knowledge_curator_identity'],
      quests: ['case_005_resistance_contact_completed'],
      reputation: {
        memory_keepers: { minFame: 30 },
        wraith_network: { minFame: 20 },
      },
    },
    restrictions: [
      {
        type: 'trust_gate',
        description:
          'World state flag `undercity_trust_secured` must be true; otherwise entry triggers escort to holding cell.',
      },
      {
        type: 'environmental',
        description:
          'Air quality requires scrubber mask consumable unless `ability_enviro_shield` is unlocked.',
      },
    ],
    infiltrationRoutes: [
      {
        id: 'maintenance_shaft_sigma',
        type: 'platforming',
        description:
          'Collapsed elevator shaft circumventing main checkpoints; requires grapnel or aerial traversal upgrade.',
      },
      {
        id: 'sewer_current',
        type: 'environmental',
        description:
          'Partially flooded sewer systems grant stealth access but risk equipment corrosion and toxic exposure.',
      },
    ],
  },
  environment: {
    weather: ['condensation storms', 'heat vent bursts', 'electrical arcs'],
    hazards: ['flooded tunnels', 'toxic mold blooms', 'unstable catwalks'],
    traversal: ['rope bridges', 'service ducts', 'makeshift lifts'],
  },
  pointsOfInterest: [
    {
      id: 'grand_archive_stack',
      name: 'Grand Archive Stack',
      type: 'archive',
      description:
        'Primary data vault preserving forbidden histories, memory backups, and evidence of the Founders’ crimes.',
    },
    {
      id: 'resistance_command',
      name: 'Resistance Command Hub',
      type: 'command',
      description:
        'Coordinating center for Wraith Network operations. Houses encrypted comms and mission planners.',
    },
    {
      id: 'hollow_sanctuary',
      name: 'Hollow Sanctuary',
      type: 'aid',
      description:
        'Caretaker enclave providing refuge for hollow victims rescued before extraction completion.',
    },
    {
      id: 'ai_listening_post',
      name: 'ECHO Listening Post',
      type: 'research',
      description:
        'Unstable interface monitoring Abyss signals. Provides narrative clues about the entity guiding factions.',
    },
  ],
  narrativeHooks: [
    {
      id: 'forbidden_history',
      summary:
        'Uncovers primary evidence about the Founders’ purge and the Unspoken Accord. Required for Act 3 reveals.',
    },
    {
      id: 'resistance_alliance',
      summary:
        'Branching alliance path that determines support strength during the Zenith Sector assault.',
    },
    {
      id: 'abyss_signal',
      summary:
        'Sets up late-game mystery surrounding ECHO AI and the Abyss. Offers optional risk-reward investigation.',
    },
  ],
  proceduralModifiers: {
    encounterDensity: 'variable',
    detectionRisk: 'medium',
    lootProfile: ['resistance_intel', 'ancient_data_cores', 'prototype_mods'],
  },
};

export default archiveUndercity;
