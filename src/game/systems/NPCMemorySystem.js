/**
 * NPCMemorySystem
 *
 * Manages NPC memory, recognition, and witnessed events.
 * NPCs remember player actions, witnessed crimes, and interactions.
 *
 * Features:
 * - Player recognition (distance and line-of-sight based)
 * - Crime witnessing and reporting
 * - Attitude changes based on actions
 * - Memory persistence across district changes
 * - Faction information sharing
 *
 * @class NPCMemorySystem
 */

import { System } from '../../engine/ecs/System.js';

export class NPCMemorySystem extends System {
  constructor(componentRegistry, eventBus, factionManager) {
    super(componentRegistry);
    this.events = eventBus;
    this.factionManager = factionManager;

    // Configuration
    this.config = {
      recognitionDistance: 100, // Distance at which NPCs recognize player
      crimeReportDelay: 3000, // Time before reporting crime (ms)
      factionShareRadius: 200, // Distance faction members share info
      forgetThreshold: 24 * 60 * 60 * 1000, // 24 hours
    };

    // Pending crime reports
    this.pendingReports = [];
  }

  /**
   * Initialize system
   */
  init() {
    console.log('[NPCMemorySystem] Initializing...');

    // Listen for crimes
    this.events.on('crime:committed', (data) => {
      this.onCrimeCommitted(data);
    });

    // Listen for player actions
    this.events.on('player:helped_npc', (data) => {
      this.onPlayerHelpedNPC(data);
    });

    // Listen for dialogue completion
    this.events.on('dialogue:completed', (data) => {
      this.onDialogueCompleted(data);
    });

    console.log('[NPCMemorySystem] Initialized');
  }

  /**
   * Update system each frame
   * @param {number} deltaTime - Time since last frame (seconds)
   */
  update(deltaTime) {
    // Get player position
    const playerEntities = this.componentRegistry.queryEntities(['Transform', 'PlayerController']);
    if (playerEntities.length === 0) return;

    const playerEntity = playerEntities[0];
    const playerTransform = this.componentRegistry.getComponent(playerEntity, 'Transform');
    const playerFaction = this.componentRegistry.getComponent(playerEntity, 'FactionMember');

    // Get all NPCs with NPC component
    const npcEntities = this.componentRegistry.queryEntities(['Transform', 'NPC']);

    for (const npcEntity of npcEntities) {
      const npcTransform = this.componentRegistry.getComponent(npcEntity, 'Transform');
      const npc = this.componentRegistry.getComponent(npcEntity, 'NPC');

      // Calculate distance to player
      const distance = Math.sqrt(
        Math.pow(playerTransform.x - npcTransform.x, 2) +
        Math.pow(playerTransform.y - npcTransform.y, 2)
      );

      // Recognition check
      if (distance <= this.config.recognitionDistance) {
        this.checkRecognition(npcEntity, npc, playerEntity, playerFaction, distance);
      }

      // Check if NPC should forget player (long time since last interaction)
      if (npc.shouldForgetPlayer(this.config.forgetThreshold)) {
        npc.knownPlayer = false;
        console.log(`[NPCMemorySystem] ${npc.name} forgot about the player`);
      }
    }

    // Process pending crime reports
    this.processPendingReports(deltaTime);
  }

  /**
   * Check if NPC recognizes player
   * @param {string} npcEntity - NPC entity ID
   * @param {NPC} npc - NPC component
   * @param {string} playerEntity - Player entity ID
   * @param {FactionMember} playerFaction - Player faction component
   * @param {number} distance - Distance to player
   */
  checkRecognition(npcEntity, npc, playerEntity, playerFaction, distance) {
    // If already known, update interaction time
    if (npc.knownPlayer) {
      return; // Already recognized
    }

    // Check if player is disguised
    const isDisguised = playerFaction && playerFaction.currentDisguise !== null;

    if (isDisguised) {
      // Disguised players are only recognized if previously known
      return; // NPC doesn't recognize disguised player
    }

    // Player is not disguised - recognize them
    npc.recognizePlayer();

    // Mark player as known by this NPC
    if (playerFaction) {
      playerFaction.markKnownBy(npc.npcId);
    }

    // Emit recognition event
    this.events.emit('npc:recognized_player', {
      npcId: npc.npcId,
      npcName: npc.name,
      npcFaction: npc.faction,
      playerKnown: true,
    });
  }

  /**
   * Handle crime committed event
   * @param {Object} data - Crime data
   */
  onCrimeCommitted(data) {
    const { crimeType, location, severity, perpetrator } = data;

    // Find NPCs who witnessed the crime (nearby NPCs)
    const playerEntities = this.componentRegistry.queryEntities(['Transform', 'PlayerController']);
    if (playerEntities.length === 0) return;

    const playerTransform = this.componentRegistry.getComponent(playerEntities[0], 'Transform');

    const npcEntities = this.componentRegistry.queryEntities(['Transform', 'NPC']);

    for (const npcEntity of npcEntities) {
      const npcTransform = this.componentRegistry.getComponent(npcEntity, 'Transform');
      const npc = this.componentRegistry.getComponent(npcEntity, 'NPC');

      // Calculate distance to crime scene
      const distance = Math.sqrt(
        Math.pow(playerTransform.x - npcTransform.x, 2) +
        Math.pow(playerTransform.y - npcTransform.y, 2)
      );

      // NPCs within recognition distance witness the crime
      if (distance <= this.config.recognitionDistance) {
        npc.witnessCrime({
          type: crimeType,
          location: location || 'unknown',
          severity: severity || 1,
          timestamp: Date.now()
        });

        // Schedule crime report
        this.scheduleCrimeReport(npc, crimeType, severity);

        // Emit witness event
        this.events.emit('npc:witnessed_crime', {
          npcId: npc.npcId,
          npcName: npc.name,
          crimeType,
          severity
        });
      }
    }
  }

  /**
   * Schedule a crime report
   * @param {NPC} npc - NPC component
   * @param {string} crimeType - Type of crime
   * @param {number} severity - Crime severity
   */
  scheduleCrimeReport(npc, crimeType, severity) {
    this.pendingReports.push({
      npcId: npc.npcId,
      npcFaction: npc.faction,
      crimeType,
      severity,
      reportAt: Date.now() + this.config.crimeReportDelay
    });
  }

  /**
   * Process pending crime reports
   * @param {number} deltaTime - Time since last frame
   */
  processPendingReports(deltaTime) {
    const now = Date.now();

    // Process reports that are ready
    this.pendingReports = this.pendingReports.filter(report => {
      if (now >= report.reportAt) {
        // Report crime to faction
        this.reportCrimeToFaction(report);
        return false; // Remove from pending
      }
      return true; // Keep in pending
    });
  }

  /**
   * Report crime to faction (affects reputation)
   * @param {Object} report - Crime report
   */
  reportCrimeToFaction(report) {
    const { npcFaction, crimeType, severity } = report;

    // Modify player reputation with the faction
    const infamyIncrease = severity * 5; // Each severity level = +5 infamy
    this.factionManager.modifyReputation(
      npcFaction,
      0, // No fame change
      infamyIncrease,
      `Crime reported: ${crimeType}`
    );

    // Emit report event
    this.events.emit('crime:reported', {
      faction: npcFaction,
      crimeType,
      severity,
      infamyIncrease
    });

    console.log(`[NPCMemorySystem] Crime reported to ${npcFaction}: ${crimeType} (Infamy +${infamyIncrease})`);
  }

  /**
   * Handle player helping NPC event
   * @param {Object} data - Help data
   */
  onPlayerHelpedNPC(data) {
    const { npcId, helpType } = data;

    // Find NPC
    const npcEntities = this.componentRegistry.queryEntities(['NPC']);
    const npcEntity = npcEntities.find(e => {
      const npc = this.componentRegistry.getComponent(e, 'NPC');
      return npc.npcId === npcId;
    });

    if (!npcEntity) return;

    const npc = this.componentRegistry.getComponent(npcEntity, 'NPC');

    // Improve attitude
    if (npc.attitude === 'hostile') {
      npc.setAttitude('neutral');
    } else if (npc.attitude === 'neutral') {
      npc.setAttitude('friendly');
    }

    // Remember the help
    npc.rememberEvent(`helped_${helpType}`, Date.now());

    console.log(`[NPCMemorySystem] ${npc.name} remembers player helped with ${helpType}`);
  }

  /**
   * Handle dialogue completion
   * @param {Object} data - Dialogue data
   */
  onDialogueCompleted(data) {
    const { npcId } = data;

    // Find NPC
    const npcEntities = this.componentRegistry.queryEntities(['NPC']);
    const npcEntity = npcEntities.find(e => {
      const npc = this.componentRegistry.getComponent(e, 'NPC');
      return npc.npcId === npcId;
    });

    if (!npcEntity) return;

    const npc = this.componentRegistry.getComponent(npcEntity, 'NPC');

    // Update interaction timestamp
    npc.updateInteraction();
  }

  /**
   * Cleanup system
   */
  cleanup() {
    console.log('[NPCMemorySystem] Cleaning up...');
    this.pendingReports = [];
  }
}
