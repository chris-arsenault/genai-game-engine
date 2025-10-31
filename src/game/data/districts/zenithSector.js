/**
 * Zenith Sector Data Definition
 *
 * Upper city seat of power where the Arcology's architects and enforcers reside.
 * Final act area featuring maximum security and political intrigue.
 */

export const zenithSector = {
  id: 'zenith_sector',
  name: 'Zenith Sector',
  shortName: 'Zenith',
  tier: 'crest',
  description:
    'Pristine terraces, governmental citadels, and elite residences crown the Arcology. ' +
    'Every movement is monitored, and access is restricted to the most trusted citizens.',
  theme: {
    keywords: ['elite', 'authoritarian', 'storm-lit'],
    palette: ['#F5F7FF', '#C2D1FF', '#2A2E73'],
    lighting: 'atmospheric stormfronts broken by towering spotlights and aurora-class shields',
    musicBed: 'soundscapes/zenith_omni_pressure',
  },
  controllingFaction: 'vanguard_prime',
  influence: {
    supportive: ['luminari_syndicate'],
    competing: ['cipher_collective', 'memory_keepers'],
  },
  stability: {
    rating: 'locked',
    base: 82,
    volatilityDrivers: [
      'Public unrest spikes if conspiracy evidence leaks to mid-city broadcasts',
      'Internal conflicts between Vanguard hawks and Luminari archivists',
    ],
    notes:
      'The sector projects absolute control, but the alliance between Vanguard Prime and Luminari Syndicate is fragile. ' +
      'Any blow to legitimacy rapidly escalates to martial law.',
  },
  security: {
    level: 5,
    description:
      'Adaptive defense grid with kinetic barriers, predictive patrols, and biometric mesh verifying every inhabitant.',
    surveillanceCoverage: 'Total—quantum-locked archival feeds, drone swarms, and telemetry-linked citizen IDs',
  },
  access: {
    defaultUnlocked: false,
    fastTravelEnabled: false,
    requirements: {
      storyFlags: ['act3_unlocked', 'conspiracy_manifest_compiled'],
      knowledge: ['knowledge_curator_plan', 'knowledge_unspoken_accord'],
      reputation: {
        vanguard_prime: { minFame: 40, maxInfamy: 10 },
      },
      abilities: ['ability_forge_access_codes'],
      equipment: ['item_vanguard_disguise_plate'],
    },
    restrictions: [
      {
        type: 'time_window',
        description:
          'Entry only possible during scheduled civic ceremonies unless stealth infiltration route is unlocked.',
      },
      {
        type: 'scan_gate',
        description:
          'Quantum scan gates flag forged identities unless the player completes the `disrupt_scan_grid` mission.',
      },
    ],
    infiltrationRoutes: [
      {
        id: 'storm_drain_orbit',
        type: 'environmental',
        description:
          'Cyclone vents along the outer shield allow insertion during electrical storms with precise timing.',
      },
      {
        id: 'archives_monorail',
        type: 'heist',
        description:
          'Hijack an archival monorail capsule using seized curator credentials to bypass surface checkpoints.',
      },
      {
        id: 'executive_cover',
        type: 'social',
        description:
          'Disguise as executive entourage after securing forged summit invitation via corporate espionage.',
      },
    ],
  },
  environment: {
    weather: ['ion storms', 'controlled rainfall', 'shield auroras'],
    hazards: ['plasma barricades', 'security mechs', 'sensor-saturated plazas'],
    traversal: ['grav-lifts', 'ornamental skyways', 'government atrium labyrinths'],
  },
  pointsOfInterest: [
    {
      id: 'founders_forum',
      name: 'Founders’ Forum',
      type: 'political',
      description:
        'Grand amphitheatre where the Arcology leadership stages carefully scripted assemblies.',
    },
    {
      id: 'vanguard_command_spire',
      name: 'Vanguard Command Spire',
      type: 'military',
      description:
        'Command center directing sector security, drone deployments, and emergency response protocols.',
    },
    {
      id: 'curator_archive_vault',
      name: "Curator's Archive Vault",
      type: 'archive',
      description:
        'Sealed repository containing master control over memory censorship protocols and the Archive failsafe.',
    },
    {
      id: 'summit_promenade',
      name: 'Summit Promenade',
      type: 'social',
      description:
        'Opulent walkway overlooking the Arcology. High-profile NPC encounters and branching ending triggers occur here.',
    },
  ],
  narrativeHooks: [
    {
      id: 'final_confrontation',
      summary:
        'Stage for confrontation with the Curator and decision points that determine the game’s ending.',
    },
    {
      id: 'vanguard_coup',
      summary:
        'Optional path reveals Vanguard Prime coup plans, allowing player to sabotage or exploit them.',
    },
    {
      id: 'public_broadcast',
      summary:
        'Infrastructure houses the citywide broadcast array needed for the “Full Broadcast” ending.',
    },
  ],
  proceduralModifiers: {
    encounterDensity: 'scripted',
    detectionRisk: 'very_high',
    lootProfile: ['government_credentials', 'classified_evidence', 'curator_encryption_keys'],
  },
};

export default zenithSector;
