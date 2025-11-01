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

function distanceBetween(a, b) {
  if (!a || !b) {
    return Number.POSITIVE_INFINITY;
  }
  const dx = (a.x ?? 0) - (b.x ?? 0);
  const dy = (a.y ?? 0) - (b.y ?? 0);
  return Math.sqrt(dx * dx + dy * dy);
}

function cloneCrimeData(crime) {
  return {
    type: crime?.type ?? 'unknown',
    location: crime?.location ?? 'unknown',
    severity: crime?.severity ?? 1,
    timestamp: crime?.timestamp ?? Date.now(),
    reported: Boolean(crime?.reported ?? false),
    shared: Boolean(crime?.shared ?? false),
    sourceNpcId: crime?.sourceNpcId ?? null,
  };
}

export class NPCMemorySystem extends System {
  constructor(componentRegistry, eventBus, factionManager) {
    super(componentRegistry, eventBus);
    this.events = this.eventBus; // Legacy alias maintained for compatibility
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
    this.eventBus.on('crime:committed', (data) => {
      this.onCrimeCommitted(data);
    });

    // Listen for player actions
    this.eventBus.on('player:helped_npc', (data) => {
      this.onPlayerHelpedNPC(data);
    });

    // Listen for dialogue completion
    this.eventBus.on('dialogue:completed', (data) => {
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
    this.eventBus.emit('npc:recognized_player', {
      npcId: npc.npcId,
      npcName: npc.name,
      npcFaction: npc.faction,
      playerKnown: true,
    });

    // Share recognition intel with nearby faction members
    this.shareRecognitionWithFaction(npcEntity, npc, playerEntity, playerFaction);
  }

  /**
   * Share recognition intel with nearby faction members so they also
   * remember the player through faction chatter.
   * @param {string} sourceEntityId
   * @param {NPC} sourceNpc
   * @param {string} playerEntityId
   * @param {FactionMember|null} playerFaction
   */
  shareRecognitionWithFaction(sourceEntityId, sourceNpc, playerEntityId, playerFaction) {
    if (!sourceNpc?.faction) {
      return;
    }

    const sourceTransform = this.componentRegistry.getComponent(sourceEntityId, 'Transform');
    const npcEntities = this.componentRegistry.queryEntities(['Transform', 'NPC']);
    const affectedNpcIds = [];

    for (const targetEntityId of npcEntities) {
      if (targetEntityId === sourceEntityId) {
        continue;
      }

      const targetNpc = this.componentRegistry.getComponent(targetEntityId, 'NPC');
      if (!targetNpc || targetNpc.faction !== sourceNpc.faction || targetNpc.knownPlayer) {
        continue;
      }

      const targetTransform = this.componentRegistry.getComponent(targetEntityId, 'Transform');
      const dist = distanceBetween(targetTransform, sourceTransform);
      if (dist > this.config.factionShareRadius) {
        continue;
      }

      targetNpc.recognizePlayer();
      targetNpc.memory.sharedIntel = targetNpc.memory.sharedIntel || [];
      targetNpc.memory.sharedIntel.push({
        type: 'recognition',
        sourceNpcId: sourceNpc.npcId,
        playerEntityId,
        distance: dist,
        timestamp: Date.now(),
      });

      if (playerFaction) {
        playerFaction.markKnownBy(targetNpc.npcId);
      }

      affectedNpcIds.push(targetNpc.npcId);
    }

    if (affectedNpcIds.length > 0) {
      this.eventBus.emit('npc:intel_shared', {
        sourceNpcId: sourceNpc.npcId,
        faction: sourceNpc.faction,
        intelType: 'recognition',
        affectedNpcIds,
      });
    }
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
        const recordedCrime = npc.witnessedCrimes[npc.witnessedCrimes.length - 1];

        // Schedule crime report
        this.scheduleCrimeReport(npc, crimeType, severity);

        // Emit witness event
        this.eventBus.emit('npc:witnessed_crime', {
          npcId: npc.npcId,
          npcName: npc.name,
          crimeType,
          severity
        });

        this.shareCrimeIntel(npcEntity, npc, recordedCrime);
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
   * Share crime intel with nearby faction members so they retain memory of player actions.
   * @param {string} sourceEntityId
   * @param {NPC} sourceNpc
   * @param {Object} crimeRecord
   */
  shareCrimeIntel(sourceEntityId, sourceNpc, crimeRecord) {
    if (!sourceNpc?.faction || !crimeRecord) {
      return;
    }

    const sourceTransform = this.componentRegistry.getComponent(sourceEntityId, 'Transform');
    const npcEntities = this.componentRegistry.queryEntities(['Transform', 'NPC']);
    const affectedNpcIds = [];

    for (const targetEntityId of npcEntities) {
      if (targetEntityId === sourceEntityId) {
        continue;
      }

      const targetNpc = this.componentRegistry.getComponent(targetEntityId, 'NPC');
      if (!targetNpc || targetNpc.faction !== sourceNpc.faction) {
        continue;
      }

      const targetTransform = this.componentRegistry.getComponent(targetEntityId, 'Transform');
      const dist = distanceBetween(targetTransform, sourceTransform);
      if (dist > this.config.factionShareRadius) {
        continue;
      }

      const alreadyHasIntel = targetNpc.witnessedCrimes.some(
        (entry) =>
          entry.shared === true &&
          entry.sourceNpcId === sourceNpc.npcId &&
          entry.timestamp === crimeRecord.timestamp &&
          entry.type === crimeRecord.type
      );
      if (alreadyHasIntel) {
        continue;
      }

      const sharedCrime = cloneCrimeData(crimeRecord);
      sharedCrime.shared = true;
      sharedCrime.sourceNpcId = sourceNpc.npcId;
      sharedCrime.reported = false;

      targetNpc.witnessedCrimes.push(sharedCrime);
      targetNpc.memory.sharedIntel = targetNpc.memory.sharedIntel || [];
      targetNpc.memory.sharedIntel.push({
        type: 'crime',
        sourceNpcId: sourceNpc.npcId,
        crimeType: sharedCrime.type,
        severity: sharedCrime.severity,
        timestamp: Date.now(),
        originalTimestamp: crimeRecord.timestamp,
      });

      affectedNpcIds.push(targetNpc.npcId);
    }

    if (affectedNpcIds.length > 0) {
      this.eventBus.emit('npc:intel_shared', {
        sourceNpcId: sourceNpc.npcId,
        faction: sourceNpc.faction,
        intelType: 'crime',
        affectedNpcIds,
        crimeType: crimeRecord.type,
        severity: crimeRecord.severity,
      });
    }
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
    this.eventBus.emit('crime:reported', {
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

  /**
   * Serialize NPC memory state for persistence.
   * @returns {Object}
   */
  serialize() {
    const npcEntities = this.componentRegistry.queryEntities(['NPC']);
    const npcSnapshots = [];

    for (const entityId of npcEntities) {
      const npc = this.componentRegistry.getComponent(entityId, 'NPC');
      if (!npc) {
        continue;
      }

      npcSnapshots.push({
        entityId,
        npcId: npc.npcId,
        faction: npc.faction,
        knownPlayer: Boolean(npc.knownPlayer),
        lastInteraction: npc.lastInteraction ?? null,
        attitude: npc.attitude,
        witnessedCrimes: Array.isArray(npc.witnessedCrimes)
          ? npc.witnessedCrimes.map(cloneCrimeData)
          : [],
        memory: JSON.parse(JSON.stringify(npc.memory || {})),
      });
    }

    const playerFaction = this._getPlayerFactionComponent();

    return {
      npcs: npcSnapshots,
      pendingReports: this.pendingReports.map((report) => ({
        npcId: report.npcId,
        npcFaction: report.npcFaction,
        crimeType: report.crimeType,
        severity: report.severity,
        reportAt: report.reportAt,
      })),
      playerKnownBy: playerFaction ? Array.from(playerFaction.knownBy) : [],
    };
  }

  /**
   * Restore NPC memory state from persisted snapshot.
   * @param {Object} data
   */
  deserialize(data = {}) {
    if (!data || typeof data !== 'object') {
      return;
    }

    const npcEntities = this.componentRegistry.queryEntities(['NPC']);
    const npcById = new Map();

    for (const entityId of npcEntities) {
      const npc = this.componentRegistry.getComponent(entityId, 'NPC');
      if (npc) {
        // Prefer mapping by npcId because entity ids can shift between loads
        npcById.set(npc.npcId, { npc, entityId });
      }
    }

    if (Array.isArray(data.npcs)) {
      for (const snapshot of data.npcs) {
        if (!snapshot || typeof snapshot !== 'object') {
          continue;
        }

        const idKey = snapshot.npcId;
        const mapped = idKey ? npcById.get(idKey) : null;
        const npc = mapped?.npc;
        if (!npc) {
          continue;
        }

        npc.knownPlayer = Boolean(snapshot.knownPlayer);
        npc.lastInteraction = snapshot.lastInteraction ?? npc.lastInteraction ?? null;
        npc.attitude = snapshot.attitude ?? npc.attitude;
        npc.witnessedCrimes = Array.isArray(snapshot.witnessedCrimes)
          ? snapshot.witnessedCrimes.map(cloneCrimeData)
          : [];
        npc.memory = snapshot.memory ? JSON.parse(JSON.stringify(snapshot.memory)) : {};
      }
    }

    if (Array.isArray(data.pendingReports)) {
      this.pendingReports = data.pendingReports
        .map((report) => ({
          npcId: report.npcId,
          npcFaction: report.npcFaction,
          crimeType: report.crimeType,
          severity: report.severity ?? 1,
          reportAt: report.reportAt ?? Date.now(),
        }))
        .filter((report) => typeof report.npcId === 'string');
    } else {
      this.pendingReports = [];
    }

    if (Array.isArray(data.playerKnownBy)) {
      const playerFaction = this._getPlayerFactionComponent();
      if (playerFaction?.setKnownBy) {
        playerFaction.setKnownBy(data.playerKnownBy);
      }
    }
  }

  _getPlayerFactionComponent() {
    const playerEntities = this.componentRegistry.queryEntities(['FactionMember', 'PlayerController']);
    if (!Array.isArray(playerEntities) || playerEntities.length === 0) {
      return null;
    }
    return this.componentRegistry.getComponent(playerEntities[0], 'FactionMember') || null;
  }
}
