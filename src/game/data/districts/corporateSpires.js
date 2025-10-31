/**
 * Corporate Spires Data Definition
 *
 * Mid-city towers controlled by corporate memory conglomerates.
 * High-surveillance environment with social engineering barriers.
 */

export const corporateSpires = {
  id: 'corporate_spires',
  name: 'Corporate Spires',
  shortName: 'Spires',
  tier: 'lattice',
  description:
    'Sterile glass towers house memory technology corporations and executive enclaves. Access is ' +
    'controlled by layered credential checks, biometric scanners, and reputation verification.',
  theme: {
    keywords: ['corporate', 'sterile-surveillance', 'verticality'],
    palette: ['#8FE3FF', '#F4F6F8', '#1B2954'],
    lighting: 'cool interior luminescence contrasted with harsh exterior spotlights',
    musicBed: 'soundscapes/mid_city_synthesis',
  },
  controllingFaction: 'luminari_syndicate',
  influence: {
    supportive: ['cipher_collective'],
    competing: ['vanguard_prime', 'wraith_network'],
  },
  stability: {
    rating: 'tense',
    base: 62,
    volatilityDrivers: [
      'Corporate espionage between Luminari-aligned divisions and Cipher Collective research cells',
      'Labor unrest from Foundation contractors imported for maintenance shifts',
    ],
    notes:
      'Economic power maintains order, but leaks about illicit experiments can shift public opinion quickly. ' +
      'The district’s security budget spikes whenever investigations near executive suites.',
  },
  security: {
    level: 4,
    description:
      'Layered biometric checkpoints, patrol drones, and adaptive firewall gates enforce corporate secrecy.',
    surveillanceCoverage: '360° camera coverage with AI anomaly detection across every lobby and elevator',
  },
  access: {
    defaultUnlocked: false,
    fastTravelEnabled: false,
    requirements: {
      knowledge: ['knowledge_neurosync_connection'],
      faction: {
        luminari_syndicate: { minFame: 25 },
      },
      quests: ['case_002_exec_blackmail_completed'],
      abilities: ['ability_social_engineering_protocol'],
    },
    restrictions: [
      {
        type: 'credential',
        id: 'spires_security_badge',
        description:
          'Corporate security requires rotating clearance badges. Counterfeit badges decay after 3 uses.',
      },
      {
        type: 'surveillance',
        description:
          'Drones flag unauthorized investigative devices; requires stealth loadout or jammer consumables.',
      },
    ],
    infiltrationRoutes: [
      {
        id: 'maintenance_winches',
        type: 'vertical',
        description:
          'Service winches inside elevator shafts allow physical infiltration if power is diverted.',
      },
      {
        id: 'skybridge_delivery',
        type: 'disguise',
        description:
          'Disguise as corporate logistics to piggyback on skybridge deliveries during shift change.',
      },
    ],
  },
  environment: {
    weather: ['controlled climate', 'atmospheric scrubbers vent cold mist at night'],
    hazards: ['active laser grids', 'pressure-sealed doors', 'counterintelligence agents'],
    traversal: ['mag-lift elevators', 'skybridges', 'executive helipad platforms'],
  },
  pointsOfInterest: [
    {
      id: 'neurosync_research_core',
      name: 'NeuroSync Research Core',
      type: 'research',
      description:
        'Flagship laboratory where experimental memory grafts are developed under tight secrecy.',
    },
    {
      id: 'executive_conclave',
      name: 'Executive Conclave Atrium',
      type: 'political',
      description:
        'Shared boardroom complex used by Luminari-aligned executives to coordinate policy with the Crest.',
    },
    {
      id: 'data_arbitrage_exchange',
      name: 'Data Arbitrage Exchange',
      type: 'commerce',
      description:
        'Encrypted marketplace where corporations trade anonymized memory datasets and behavioral predictions.',
    },
    {
      id: 'security_overwatch',
      name: 'Security Overwatch Hub',
      type: 'security',
      description:
        'Central command for drone fleets and biometric audit trails. Holds evidence of unlawful surveillance.',
    },
  ],
  narrativeHooks: [
    {
      id: 'corporate_conspiracy',
      summary:
        'Exposes how Luminari Syndicate suppresses whistleblowers and manipulates investigations.',
    },
    {
      id: 'cipher_collaboration',
      summary:
        'Optional alliance with Cipher Collective yields advanced investigative tech at the cost of trust.',
    },
    {
      id: 'executive_heist',
      summary:
        'Multi-stage heist mission steals sealed minutes from clandestine executive meetings about the Archive.',
    },
  ],
  proceduralModifiers: {
    encounterDensity: 'medium',
    detectionRisk: 'high',
    lootProfile: ['clearance_tokens', 'research_dossiers', 'executive_blackmail'],
  },
};

export default corporateSpires;
