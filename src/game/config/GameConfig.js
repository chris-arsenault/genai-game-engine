import {
  Act2CrossroadsArtConfig,
  ACT2_CROSSROADS_ART_MANIFEST_URL,
} from '../data/sceneArt/Act2CrossroadsArtConfig.js';
import { NarrativeBeats } from '../data/narrative/NarrativeBeatCatalog.js';

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
    detectiveVisionEnergyMax: 5, // total energy units (seconds of uptime)
    detectiveVisionEnergyRegen: 0.75, // energy per second while inactive
    detectiveVisionMinEnergyToActivate: 1.5, // minimum energy threshold to toggle on

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
    forensicTuning: {
      difficultyMultipliers: {
        1: 1.0,
        2: 1.35,
        3: 1.75,
      },
      skillAdvantageTimeBonus: 0.15, // each skill tier above difficulty trims 15% of analysis time
      minAdvantageMultiplier: 0.55, // floor when stacking bonuses (prevents instant completion)
    },

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

  stealth: {
    firewallScrambler: {
      knowledgeId: 'cipher_scrambler_access',
      itemId: 'gadget_cipher_scrambler_charge',
      activationAreaId: 'memory_parlor_interior',
      firewallAreaId: 'memory_parlor_firewall',
      durationSeconds: 30,
      detectionMultiplier: 0.35,
      suspicionDecayBonusPerSecond: 12,
      cooldownSeconds: 5
    },
    visuals: {
      memoryParlor: {
        dangerColor: '#ff3f7c',
        safeColor: '#31f5c9',
        baseAlpha: 0.22,
        highlightAlpha: 0.45,
        safeBaseAlpha: 0.28,
        safeHighlightAlpha: 0.5
      }
    }
  },

  /**
   * Camera tuning parameters consumed by CameraFollowSystem and engine Camera.
   *
   * - followSpeed: Normalized interpolation factor applied every frame. Lower values (0.05-0.2)
   *   yield smoother motion because the camera only closes a fraction of the gap each update.
   * - lookAheadDistance: Pixels to lead the player in the direction of current velocity, keeping
   *   traversal destinations inside the viewport before the player arrives.
   * - deadzone: Radius (in pixels) where minor player adjustments do not move the camera, preventing
   *   jitter when interacting with small objects.
   * - shakeDecay/minShakeThreshold: Tune post-impact shake falloff so investigative UI remains readable.
   *   Shake stops once intensity drops below the configured minimum threshold.
   */
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
    enableGameplayEmitters: true,
    detectiveVision: {
      activationVolume: 0.78,
      loopVolume: 0.38,
      deactivateVolume: 0.6,
      insufficientVolume: 0.64,
    },
    gameplayMoodBridge: {
      updateIntervalMs: 250,
      moodHintDurationMs: 6000,
    },

    memoryParlorAmbient: {
      trackId: 'music-memory-parlor-ambient-001',
      trackUrl: '/music/memory-parlor/goodnightmare.mp3',
      baseVolume: 0.55,
      scramblerBoost: 0.25,
      fadeDuration: 1.2,
      scramblerFadeDuration: 0.6,
      loopStart: 0,
      loopEnd: 232, // Goodnightmare loop point (approx 3:52)
      tensionTrackId: 'music-memory-parlor-tension-001',
      tensionTrackUrl: '/music/memory-parlor/goodnightmare-tension.wav',
      tensionBaseVolume: 0.82,
      tensionLoopStart: 0,
      tensionLoopEnd: null,
      combatTrackId: 'music-memory-parlor-combat-001',
      combatTrackUrl: '/music/memory-parlor/goodnightmare-combat.wav',
      combatBaseVolume: 0.95,
      combatLoopStart: 0,
      combatLoopEnd: null,
      defaultAdaptiveState: 'ambient',
      states: {
        ambient: {
          ambient_base: 0.95,
          tension_layer: 0,
          combat_layer: 0,
        },
        stealth: {
          ambient_base: 0.65,
          tension_layer: 0.4,
          combat_layer: 0,
        },
        alert: {
          ambient_base: 0.55,
          tension_layer: 0.9,
          combat_layer: 0.15,
        },
        combat: {
          ambient_base: 0.35,
          tension_layer: 0.75,
          combat_layer: 1,
        },
      },
    },

    act2CrossroadsAmbient: {
      trackId: 'music-downtown-ambient-001',
      trackUrl: '/generated/audio/ar-008/ar-008-downtown-ambient.wav',
      baseVolume: 0.6,
      scramblerBoost: 0.18,
      fadeDuration: 1.6,
      scramblerFadeDuration: 0.6,
      loopStart: 0,
      loopEnd: null,
      tensionTrackId: 'music-downtown-tension-001',
      tensionTrackUrl: '/generated/audio/ar-008/ar-008-downtown-tension.wav',
      tensionBaseVolume: 0.85,
      tensionLoopStart: 0,
      tensionLoopEnd: null,
      combatTrackId: 'music-downtown-combat-001',
      combatTrackUrl: '/generated/audio/ar-008/ar-008-downtown-combat.wav',
      combatBaseVolume: 0.97,
      combatLoopStart: 0,
      combatLoopEnd: null,
      defaultAdaptiveState: 'ambient',
      states: {
        ambient: {
          ambient_base: 0.92,
          tension_layer: 0,
          combat_layer: 0,
        },
        decision: {
          ambient_base: 0.76,
          tension_layer: 0.36,
          combat_layer: 0,
        },
        tension: {
          ambient_base: 0.58,
          tension_layer: 0.82,
          combat_layer: 0.18,
        },
        alert: {
          ambient_base: 0.48,
          tension_layer: 0.78,
          combat_layer: 0.46,
        },
        combat: {
          ambient_base: 0.38,
          tension_layer: 0.6,
          combat_layer: 1,
        },
      },
    },

    // Adaptive music
    layerTransitionTime: 1.5, // seconds
    musicStates: {
      exploration: { ambient_base: 0.95, tension_layer: 0.0, combat_layer: 0.0 },
      stealth: { ambient_base: 0.65, tension_layer: 0.4, combat_layer: 0.0 },
      alert: { ambient_base: 0.55, tension_layer: 0.9, combat_layer: 0.15 },
      combat: { ambient_base: 0.35, tension_layer: 0.75, combat_layer: 1.0 }
    },
  },

  localization: {
    forensic: {
      toolLabels: {},
      skillLabels: {},
      typeLabels: {},
    },
  },

  narrative: {
    act2: {
      crossroads: {
        briefingDialogueId: 'dialogue_act2_crossroads_briefing',
        questId: 'main-act2-crossroads',
        npcId: 'zara_crossroads',
        threads: [
          {
            id: 'act2_thread_corporate_infiltration',
            title: 'Corporate Infiltration',
            summary: "Slip into NeuroSync HQ using Zara's forged credentials to expose what the corporation is hiding.",
            questId: 'main-act2-neurosync-infiltration',
            telemetryTag: 'act2_thread_selection_corporate',
            worldFlags: ['act2_branch_corporate_selected'],
            sceneId: 'act2_corporate_interior',
            defaultUnlocked: true,
          },
          {
            id: 'act2_thread_resistance_contact',
            title: 'Resistance Contact',
            summary: 'Meet the Archivists in the under-city, navigate faction politics, and unlock alternate infiltration routes.',
            questId: 'main-act2-archivist-alliance',
            telemetryTag: 'act2_thread_selection_resistance',
            worldFlags: ['act2_branch_resistance_selected'],
            sceneId: 'act2_resistance_hideout',
            defaultUnlocked: true,
          },
          {
            id: 'act2_thread_personal_investigation',
            title: 'Personal Investigation',
            summary: "Dig into Mid-City archives to uncover what really happened to Kira's old cases and missing allies.",
            questId: 'main-act2-personal-investigation',
            telemetryTag: 'act2_thread_selection_personal',
            worldFlags: ['act2_branch_personal_selected'],
            sceneId: 'act2_personal_archive',
            defaultUnlocked: true,
          },
        ],
      },
    },
    act3: {
      gatheringSupport: {
        questId: 'main-act3-gathering-support',
        stanceEvent: 'act3:stance_committed',
        milestoneEvent: 'act3:gathering_support:milestone',
        stanceFlag: 'act3_plan_committed',
        stances: [
          {
            id: 'opposition',
            title: 'Opposition: Sever the Broadcast',
            summary: 'Stop Dr. Morrow by sabotaging the Archive broadcast before it detonates the city psyche.',
            stanceFlag: 'act3_stance_opposition',
            worldFlags: ['act3_branch_opposition'],
            telemetryTag: 'act3_stance_opposition',
            allies: ['zara', 'dr_chen', 'soren'],
            milestones: [
              {
                milestoneId: 'opposition_recruit_dr_chen',
                objectiveId: 'obj_opposition_recruit_dr_chen',
                dialogueId: 'dialogue_act3_opposition_dr_chen',
                title: 'Convince Dr. Chen',
                description: 'Persuade Dr. Chen to surrender NeuroSync backdoor credentials for a surgical shutdown.',
                npcId: 'dr_chen',
                telemetryTag: 'act3_opposition_dr_chen',
                narrativeBeat: NarrativeBeats.act3.gatheringSupport.OPPOSITION_DR_CHEN,
                successFlag: 'act3_opposition_dr_chen_committed',
              },
              {
                milestoneId: 'opposition_confront_soren',
                objectiveId: 'obj_opposition_confront_soren',
                dialogueId: 'dialogue_act3_opposition_soren',
                title: 'Sway Soren',
                description: 'Win Soren’s begrudging support so the resistance stands down during the op.',
                npcId: 'soren',
                telemetryTag: 'act3_opposition_soren',
                narrativeBeat: NarrativeBeats.act3.gatheringSupport.OPPOSITION_SOREN,
                successFlag: 'act3_opposition_soren_committed',
              },
              {
                milestoneId: 'opposition_secure_mcd_override',
                objectiveId: 'obj_opposition_secure_mcd_override',
                dialogueId: 'dialogue_act3_opposition_captain_reese',
                title: 'Secure MCD Overrides',
                description: 'Acquire Municipal Defense override credentials to bypass Archive security corridors.',
                npcId: 'captain_reese',
                telemetryTag: 'act3_opposition_mcd_override',
                narrativeBeat: NarrativeBeats.act3.gatheringSupport.OPPOSITION_MCD_OVERRIDE,
                successFlag: 'act3_opposition_mcd_override_secured',
              },
            ],
          },
          {
            id: 'support',
            title: 'Support: Amplify the Broadcast',
            summary: 'Help Dr. Morrow deliver the truth, then contain the fallout with resistance triage.',
            stanceFlag: 'act3_stance_support',
            worldFlags: ['act3_branch_support'],
            telemetryTag: 'act3_stance_support',
            allies: ['zara', 'soren', 'dr_chen'],
            milestones: [
              {
                milestoneId: 'support_upgrade_broadcast_grid',
                objectiveId: 'obj_support_upgrade_broadcast_grid',
                dialogueId: 'dialogue_act3_support_zara',
                title: 'Upgrade Broadcast Grid',
                description: 'Work with Zara to amplify Archive signal relays before the citywide reveal.',
                npcId: 'zara',
                telemetryTag: 'act3_support_broadcast_grid',
                narrativeBeat: NarrativeBeats.act3.gatheringSupport.SUPPORT_BROADCAST_GRID,
                successFlag: 'act3_support_broadcast_grid_upgraded',
              },
              {
                milestoneId: 'support_prepare_resistance_response',
                objectiveId: 'obj_support_prepare_resistance_response',
                dialogueId: 'dialogue_act3_support_soren',
                title: 'Prime Resistance Response',
                description: 'Mobilize Soren’s cells to manage trauma relief once memories flood the streets.',
                npcId: 'soren',
                telemetryTag: 'act3_support_resistance_response',
                narrativeBeat: NarrativeBeats.act3.gatheringSupport.SUPPORT_RESISTANCE_RESPONSE,
                successFlag: 'act3_support_resistance_response_ready',
              },
              {
                milestoneId: 'support_dr_chen_ethics',
                objectiveId: 'obj_support_dr_chen_ethics',
                dialogueId: 'dialogue_act3_support_dr_chen',
                title: 'Resolve Dr. Chen’s Ultimatum',
                description: 'Address Dr. Chen’s ethical objections so she calibrates the neural dampeners.',
                npcId: 'dr_chen',
                telemetryTag: 'act3_support_dr_chen_ethics',
                narrativeBeat: NarrativeBeats.act3.gatheringSupport.SUPPORT_DR_CHEN_ETHICS,
                successFlag: 'act3_support_dr_chen_resolved',
              },
            ],
          },
          {
            id: 'alternative',
            title: 'Alternative: Controlled Disclosure',
            summary: 'Build a coalition to leak the Archive in waves without shattering the populace at once.',
            stanceFlag: 'act3_stance_alternative',
            worldFlags: ['act3_branch_alternative'],
            telemetryTag: 'act3_stance_alternative',
            allies: ['zara', 'iris', 'elena_coalition'],
            milestones: [
              {
                milestoneId: 'alternative_collect_dossier',
                objectiveId: 'obj_alternative_collect_dossier',
                dialogueId: 'dialogue_act3_alternative_zara',
                title: 'Compile the Archive Dossier',
                description: 'Coordinate with Zara to extract sanitized evidence slices for the dossier.',
                npcId: 'zara',
                telemetryTag: 'act3_alternative_dossier',
                narrativeBeat: NarrativeBeats.act3.gatheringSupport.ALTERNATIVE_DOSSIER,
                successFlag: 'act3_alternative_dossier_compiled',
              },
              {
                milestoneId: 'alternative_build_coalition',
                objectiveId: 'obj_alternative_build_coalition',
                dialogueId: 'dialogue_act3_alternative_elena_coalition',
                title: 'Secure Coalition Sign-off',
                description: 'Win the support of journalists and community advocates to steward the release.',
                npcId: 'elena_coalition',
                telemetryTag: 'act3_alternative_coalition',
                narrativeBeat: NarrativeBeats.act3.gatheringSupport.ALTERNATIVE_COALITION,
                successFlag: 'act3_alternative_coalition_committed',
              },
              {
                milestoneId: 'alternative_stage_distribution',
                objectiveId: 'obj_alternative_stage_distribution',
                dialogueId: 'dialogue_act3_alternative_iris',
                title: 'Stage Distribution Network',
                description: 'Partner with Iris to deploy the staged release pipeline across city intranets.',
                npcId: 'iris',
                telemetryTag: 'act3_alternative_distribution',
                narrativeBeat: NarrativeBeats.act3.gatheringSupport.ALTERNATIVE_DISTRIBUTION,
                successFlag: 'act3_alternative_distribution_staged',
              },
            ],
          },
        ],
        shared: {
          visitDmitri: {
            objectiveId: 'obj_visit_dmitri',
            areaId: 'archive_care_facility_dmitri',
            description: 'Visit Dmitri’s comatose body in the Archive hospice to anchor the mission stakes.',
            telemetryTag: 'act3_shared_dmitri_visit',
            narrativeBeat: NarrativeBeats.act3.gatheringSupport.SHARED_DMITRI_VISIT,
            storyFlag: 'act3_shared_dmitri_visited',
          },
          prepareLoadout: {
            milestoneId: 'shared_prepare_archive_loadout',
            objectiveId: 'obj_prepare_archive_loadout',
            branchId: 'shared',
            description: 'Finalize gear with Zara for the Archive infiltration and sync telemetry failsafes.',
            telemetryTag: 'act3_shared_loadout',
            narrativeBeat: NarrativeBeats.act3.gatheringSupport.SHARED_PREPARE_LOADOUT,
            successFlag: 'act3_shared_loadout_prepared',
            npcId: 'zara',
          },
        },
      },
      zenithInfiltration: {
        questId: 'main-act3-zenith-infiltration',
        stageEvent: 'act3:zenith_infiltration:stage',
        telemetryTag: 'act3_zenith_infiltration',
        prerequisites: {
          storyFlags: ['act3_gathering_support_complete'],
        },
        sharedStages: [
          {
            stageId: 'shared_sector_entry',
            objectiveId: 'obj_zenith_sector_entry',
            areaId: 'zenith_sector_checkpoint',
            description: 'Breach the Zenith Sector perimeter using your chosen stance assets.',
            telemetryTag: 'act3_zenith_sector_entry',
            narrativeBeat: NarrativeBeats.act3.zenithInfiltration.SECTOR_ENTRY,
            successFlag: 'act3_zenith_sector_perimeter_breached',
            branchId: 'shared',
            requirements: {
              storyFlags: ['act3_plan_committed'],
            },
          },
          {
            stageId: 'shared_tower_ascent',
            objectiveId: 'obj_zenith_tower_ascent',
            areaId: 'zenith_government_towers',
            description: 'Ascend the government towers while evading elite Zenith security.',
            telemetryTag: 'act3_zenith_tower_ascent',
            narrativeBeat: NarrativeBeats.act3.zenithInfiltration.TOWER_ASCENT,
            successFlag: 'act3_zenith_government_towers_secured',
            branchId: 'shared',
            requirements: {
              storyFlags: ['act3_shared_loadout_prepared'],
            },
          },
          {
            stageId: 'shared_archive_elevator',
            objectiveId: 'obj_zenith_archive_elevator',
            areaId: 'zenith_archive_elevator',
            description: 'Reach the concealed Archive elevator beneath Zenith Plaza.',
            telemetryTag: 'act3_zenith_archive_elevator',
            narrativeBeat: NarrativeBeats.act3.zenithInfiltration.ARCHIVE_ELEVATOR,
            successFlag: 'act3_zenith_archive_elevator_secured',
            branchId: 'shared',
            requirements: null,
          },
        ],
        stances: [
          {
            id: 'opposition',
            stanceFlag: 'act3_stance_opposition',
            worldFlags: ['act3_branch_opposition'],
            telemetryTag: 'act3_zenith_opposition_route',
            approachId: 'stealth',
            stages: [
              {
                stageId: 'opposition_disable_grid',
                objectiveId: 'obj_zenith_opposition_disable_grid',
                areaId: 'zenith_security_control',
                description: 'Disable Zenith security grid nodes using municipal override codes.',
                telemetryTag: 'act3_zenith_opposition_grid',
                narrativeBeat: NarrativeBeats.act3.zenithInfiltration.OPPOSITION_DISABLE_GRID,
                successFlag: 'act3_zenith_opposition_grid_disabled',
                requirements: {
                  storyFlags: ['act3_opposition_mcd_override_secured'],
                },
              },
              {
                stageId: 'opposition_calibrate_dampeners',
                objectiveId: 'obj_zenith_opposition_calibrate_dampeners',
                areaId: 'zenith_dampener_labs',
                description: 'Apply Dr. Chen\'s dampener calibrations to mask the infiltration.',
                telemetryTag: 'act3_zenith_opposition_dampeners',
                narrativeBeat: NarrativeBeats.act3.zenithInfiltration.OPPOSITION_CALIBRATE_DAMPENERS,
                successFlag: 'act3_zenith_opposition_dampeners_calibrated',
                requirements: {
                  storyFlags: ['act3_opposition_dr_chen_committed'],
                },
              },
              {
                stageId: 'opposition_resistance_diversion',
                objectiveId: 'obj_zenith_opposition_resistance_diversion',
                areaId: 'zenith_resistance_overwatch',
                description: 'Coordinate Soren\'s resistance teams to create a silent diversion.',
                telemetryTag: 'act3_zenith_opposition_diversion',
                narrativeBeat: NarrativeBeats.act3.zenithInfiltration.OPPOSITION_RESISTANCE_DIVERSION,
                successFlag: 'act3_zenith_opposition_resistance_diverted',
                requirements: {
                  storyFlags: ['act3_opposition_soren_committed'],
                },
              },
            ],
          },
          {
            id: 'support',
            stanceFlag: 'act3_stance_support',
            worldFlags: ['act3_branch_support'],
            telemetryTag: 'act3_zenith_support_route',
            approachId: 'assault',
            stages: [
              {
                stageId: 'support_overclock_relays',
                objectiveId: 'obj_zenith_support_overclock_relays',
                areaId: 'zenith_broadcast_spire',
                description: 'Overclock the broadcast relays to amplify the Archive signal.',
                telemetryTag: 'act3_zenith_support_relays',
                narrativeBeat: NarrativeBeats.act3.zenithInfiltration.SUPPORT_OVERCLOCK_RELAYS,
                successFlag: 'act3_zenith_support_relays_overclocked',
                requirements: {
                  storyFlags: ['act3_support_broadcast_grid_upgraded'],
                },
              },
              {
                stageId: 'support_stage_response',
                objectiveId: 'obj_zenith_support_stage_response',
                areaId: 'zenith_response_staging',
                description: 'Stage resistance trauma-response teams throughout Zenith Plaza.',
                telemetryTag: 'act3_zenith_support_response',
                narrativeBeat: NarrativeBeats.act3.zenithInfiltration.SUPPORT_STAGE_RESPONSE,
                successFlag: 'act3_zenith_support_response_staged',
                requirements: {
                  storyFlags: ['act3_support_resistance_response_ready'],
                },
              },
              {
                stageId: 'support_calibrate_dampeners',
                objectiveId: 'obj_zenith_support_calibrate_dampeners',
                areaId: 'zenith_neural_dampeners',
                description: 'Calibrate citywide neural dampeners with Dr. Chen\'s assistance.',
                telemetryTag: 'act3_zenith_support_dampeners',
                narrativeBeat: NarrativeBeats.act3.zenithInfiltration.SUPPORT_CALIBRATE_DAMPENERS,
                successFlag: 'act3_zenith_support_dampeners_calibrated',
                requirements: {
                  storyFlags: ['act3_support_dr_chen_resolved'],
                },
              },
            ],
          },
          {
            id: 'alternative',
            stanceFlag: 'act3_stance_alternative',
            worldFlags: ['act3_branch_alternative'],
            telemetryTag: 'act3_zenith_alternative_route',
            approachId: 'social',
            stages: [
              {
                stageId: 'alternative_dossier_upload',
                objectiveId: 'obj_zenith_alternative_dossier_upload',
                areaId: 'zenith_dossier_upload',
                description: 'Seed the curated Archive dossier across Zenith\'s secure servers.',
                telemetryTag: 'act3_zenith_alternative_dossier',
                narrativeBeat: NarrativeBeats.act3.zenithInfiltration.ALTERNATIVE_DOSSIER_UPLOAD,
                successFlag: 'act3_zenith_alternative_dossier_uploaded',
                requirements: {
                  storyFlags: ['act3_alternative_dossier_compiled'],
                },
              },
              {
                stageId: 'alternative_forum_security',
                objectiveId: 'obj_zenith_alternative_forum_security',
                areaId: 'zenith_coalition_forum',
                description: 'Secure coalition oversight on the Zenith executive forum.',
                telemetryTag: 'act3_zenith_alternative_forum',
                narrativeBeat: NarrativeBeats.act3.zenithInfiltration.ALTERNATIVE_FORUM_SECURITY,
                successFlag: 'act3_zenith_alternative_forum_secured',
                requirements: {
                  storyFlags: ['act3_alternative_coalition_committed'],
                },
              },
              {
                stageId: 'alternative_beacons_sync',
                objectiveId: 'obj_zenith_alternative_beacons_sync',
                areaId: 'zenith_distribution_beacons',
                description: 'Synchronise distribution beacons for the controlled disclosure plan.',
                telemetryTag: 'act3_zenith_alternative_beacons',
                narrativeBeat: NarrativeBeats.act3.zenithInfiltration.ALTERNATIVE_BEACONS_SYNC,
                successFlag: 'act3_zenith_alternative_beacons_synchronized',
                requirements: {
                  storyFlags: ['act3_alternative_distribution_staged'],
                },
              },
            ],
          },
        ],
        rewards: {
          storyFlags: ['act3_zenith_infiltration_complete'],
          knowledgeIds: ['act3_zenith_sector_mapping'],
        },
      },
    },
  },

  sceneArt: {
    // Override the hybrid geometry sprites for the Act 2 Crossroads hub once bespoke art lands.
    // Each array mirrors the fallback segments defined in Act2CrossroadsScene.
    act2Crossroads: {
      manifestUrl: ACT2_CROSSROADS_ART_MANIFEST_URL,
      overrides: Act2CrossroadsArtConfig,
      variant: 'act2_crossroads_bespoke_bundle_v1',
    },
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
