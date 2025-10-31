/**
 * Neon Districts Data Definition
 *
 * Lower-city hub filled with memory parlors, illicit clinics, and street-level informants.
 * Serves as the player's starting territory and the beating heart of the memory black market.
 */

export const neonDistricts = {
  id: 'neon_districts',
  name: 'Neon Districts',
  shortName: 'Neon',
  tier: 'foundation',
  description:
    'Rain-slick streets glow with flickering holo billboards while memory parlors and black-market clinics ' +
    'cater to desperate residents. Kira knows every back alley and whispered contact in this district.',
  theme: {
    keywords: ['neon-noir', 'street-level', 'memory-commerce'],
    palette: ['#0FF3FF', '#F55BFF', '#10131A'],
    lighting: 'perpetual drizzle with reflected neon wash',
    musicBed: 'soundscapes/lower_city_bass',
  },
  controllingFaction: 'wraith_network',
  influence: {
    supportive: ['memory_keepers'],
    competing: ['luminari_syndicate', 'cipher_collective'],
  },
  stability: {
    rating: 'volatile',
    base: 38,
    volatilityDrivers: [
      'territorial disputes between syndicate brokers',
      'Foundation unrest amplified by extractive labor quotas',
    ],
    notes:
      'Street-level conflicts constantly reshape allegiances. Resistance cells operate in the shadows while ' +
      'corporate fixers buy influence through memory debt.',
  },
  security: {
    level: 2,
    description:
      'Patchwork enforcement by overworked Foundation security, community patrols, and covert corporate spotters. ' +
      'Camera coverage is inconsistent and riddled with blind spots.',
    surveillanceCoverage: 'clustered around transit hubs; alleys largely unmonitored',
  },
  access: {
    defaultUnlocked: true,
    fastTravelEnabled: true,
    requirements: {},
    restrictions: [
      {
        type: 'curfew',
        trigger: 'district_lockdown_story_flag',
        description:
          'Heightened patrols after major story beats impose curfews; traversal requires stealth or disguise.',
      },
    ],
    infiltrationRoutes: [
      {
        id: 'maintenance_catwalks',
        type: 'parkour',
        description:
          'Stacked catwalks over the mag-line create rooftop access that bypasses street-level checkpoints.',
      },
      {
        id: 'market_tunnels',
        type: 'smuggling',
        description:
          'Contraband runners maintain hidden service corridors behind memory parlors for rapid escapes.',
      },
    ],
  },
  environment: {
    weather: ['acidic drizzle', 'dense neon fog', 'periodic electrical surges'],
    hazards: ['slick walkways', 'crowded vendor plazas', 'illegal clinic radiation bleed'],
    traversal: ['tiered skybridges', 'maintenance ladders', 'narrow alleys'],
  },
  pointsOfInterest: [
    {
      id: 'memory_parlor_row',
      name: 'Memory Parlor Row',
      type: 'commerce',
      description:
        'Cluster of sanctioned and unsanctioned parlors where memories are traded, altered, or erased.',
    },
    {
      id: 'kira_apartment',
      name: "Kira's Apartment",
      type: 'safehouse',
      description:
        'Home base with investigation board, contact network, and access to personal memory archives.',
    },
    {
      id: 'transit_substation',
      name: 'Transit Substation K7',
      type: 'transit',
      description:
        'Multi-line mag-lev station acting as gateway to higher tiers; heavily monitored by corporate scouts.',
    },
    {
      id: 'hollow_care_clinic',
      name: 'Hollow Care Clinic',
      type: 'aid',
      description:
        'Makeshift care facility for hollow victims. Staff quietly help the Resistance and Memory Keepers.',
    },
  ],
  narrativeHooks: [
    {
      id: 'starting_case_network',
      summary:
        'Introduces Kira’s informant web and the economic desperation that fuels memory commerce.',
    },
    {
      id: 'memory_debt_arc',
      summary:
        'Side cases explore the predatory memory debt system and hint at the larger conspiracy.',
    },
    {
      id: 'resistance_contacts',
      summary:
        'Provides first contact with Wraith Network liaisons and seeds trust for Archive Undercity access.',
    },
  ],
  proceduralModifiers: {
    encounterDensity: 'high',
    detectionRisk: 'low',
    lootProfile: ['memory_fragments', 'street_intel', 'black_market_credentials'],
  },
};

export default neonDistricts;
