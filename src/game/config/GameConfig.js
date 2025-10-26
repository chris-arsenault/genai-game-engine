/**
 * GameConfig
 *
 * Tunable gameplay parameters for The Memory Syndicate.
 * Adjust these values to tune gameplay feel.
 */
export const GameConfig = {
  player: {
    // Movement
    moveSpeed: 200, // pixels/second
    acceleration: 1200, // pixels/second²
    friction: 0.85, // deceleration multiplier (0.0-1.0)

    // Investigation
    observationRadius: 96, // evidence detection radius
    interactionRadius: 64, // interaction zone radius
    detectiveVisionDuration: 5000, // milliseconds
    detectiveVisionCooldown: 10000, // milliseconds
    detectiveVisionEnergyCost: 1, // energy per second

    // Combat (future implementation)
    maxHealth: 100,
    baseAttackDamage: 10,
    attackSpeed: 0.5, // seconds between attacks
  },

  investigation: {
    // Evidence collection
    evidenceCollectionTime: 500, // milliseconds to collect
    forensicAnalysisTime: 2000, // milliseconds to analyze
    clueRevealDelay: 300, // milliseconds between clue reveals

    // Deduction board
    theoryValidationTime: 1000, // milliseconds to validate theory
    minConnectionsForTheory: 3, // minimum clue connections needed
    accuracyThresholdForUnlock: 0.7, // 70% accuracy needed for progression

    // Detective vision
    visionHighlightColor: '#00FFFF',
    visionPulseSpeed: 2.0, // pulses per second
  },

  faction: {
    // Reputation
    fameMax: 100,
    infamyMax: 100,
    cascadeMultiplier: 0.5, // reputation cascade to allies/enemies
    disguiseBaseEffectiveness: 0.8, // 80% chance to fool NPCs
    disguiseDetectionInterval: 1000, // check every second
    recognitionMemoryDuration: 300000, // 5 minutes

    // Attitude thresholds (default for most factions)
    attitudeThresholds: {
      allied: { fame: 80, infamy: 0 },
      friendly: { fame: 40, infamy: 0 },
      neutral: { fame: 0, infamy: 0 },
      hostile: { fame: 0, infamy: 30 }
    }
  },

  knowledge: {
    // Progression gates
    gateCheckInterval: 500, // check gates every 500ms
    abilityUnlockDelay: 1000, // delay before showing unlock notification

    // Knowledge categories and their progression
    forensicSkillMax: 3,
    technicalSkillMax: 3,
    socialSkillMax: 3
  },

  npc: {
    // AI behavior
    chaseRange: 300,
    attackRange: 50,
    moveSpeed: 100,
    aggroTime: 2000, // milliseconds before attacking
    patrolSpeed: 60,
    sightRange: 200,
    sightAngle: Math.PI / 2, // 90 degree cone

    // Dialogue
    dialogueRange: 80,
    dialogueTimeout: 30000 // auto-close after 30 seconds
  },

  camera: {
    // Follow behavior
    followSpeed: 0.1, // lerp factor (0.0-1.0), lower = smoother
    lookAheadDistance: 100, // pixels ahead of player movement
    deadzone: 32, // pixels player can move before camera follows

    // Screen shake
    shakeDecay: 0.8, // decay per frame
    minShakeThreshold: 0.1 // stop shaking below this intensity
  },

  world: {
    // Physics
    gravity: 0, // top-down game, no gravity
    maxVelocity: 500, // pixels/second

    // Spatial partitioning
    spatialHashCellSize: 128, // pixels per grid cell

    // Performance
    maxEntitiesPerFrame: 1000,
    cullMargin: 100 // pixels outside viewport to still render
  },

  ui: {
    // HUD
    hudFadeTime: 300, // milliseconds
    notificationDuration: 3000, // milliseconds
    tooltipDelay: 500, // milliseconds before showing tooltip

    // Menus
    menuTransitionTime: 200, // milliseconds
    pauseBlurAmount: 5 // pixels
  },

  audio: {
    // Volume (0.0 to 1.0)
    masterVolume: 0.8,
    musicVolume: 0.7,
    sfxVolume: 0.9,
    ambienceVolume: 0.5,

    // Adaptive music
    layerTransitionTime: 1.5, // seconds
    musicStates: {
      exploration: { ambient: 1.0, tension: 0.0, combat: 0.0 },
      investigation: { ambient: 0.6, tension: 0.4, combat: 0.0 },
      stealth: { ambient: 0.3, tension: 0.7, combat: 0.0 },
      combat: { ambient: 0.2, tension: 0.3, combat: 1.0 }
    }
  },

  debug: {
    showColliders: false,
    showSpatialHash: false,
    showFPS: true,
    showEntityCount: true,
    godMode: false
  }
};

/**
 * Get faction-specific attitude thresholds
 * @param {string} factionId - Faction identifier
 * @returns {Object} Attitude thresholds
 */
export function getFactionAttitudeThresholds(factionId) {
  // Override thresholds for specific factions
  const overrides = {
    police: {
      allied: { fame: 75, infamy: 0 },
      friendly: { fame: 35, infamy: 5 },
      neutral: { fame: 0, infamy: 0 },
      hostile: { fame: 0, infamy: 25 }
    },
    criminals: {
      allied: { fame: 80, infamy: 20 },
      friendly: { fame: 40, infamy: 0 },
      neutral: { fame: 0, infamy: 0 },
      hostile: { fame: 0, infamy: 40 }
    }
  };

  return overrides[factionId] || GameConfig.faction.attitudeThresholds;
}
