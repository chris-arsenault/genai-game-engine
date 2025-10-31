/**
 * @fileoverview EntityPopulator - Converts procedural generation data into entity spawn data
 * Takes district layout and case data and produces arrays of spawn data for NPCs, evidence, and objects.
 * Runs in Web Worker as part of generation pipeline.
 */

import { SeededRandom } from '../../engine/procedural/SeededRandom.js';
import { RevealType } from './EvidenceGraph.js';

const DEFAULT_DETECTIVE_VISION_ABILITY = 'detective_vision';
const DEFAULT_FORENSIC_ANALYSIS_ABILITY = 'forensic_analysis';

/**
 * Converts district and case data into spawn data for entities.
 * Populates district with NPCs, evidence items, and interactive objects based on case requirements.
 *
 * @class
 * @example
 * const populator = new EntityPopulator({ npcDensity: 1.5 });
 * const district = { rooms: [...] };
 * const caseData = { npcs: [...], evidencePlacements: [...] };
 * const spawnData = populator.populate(district, caseData, 12345);
 * console.log(spawnData.npcs.length); // NPCs to spawn
 */
export class EntityPopulator {
  /**
   * Creates a new entity populator
   * @param {object} [config={}] - Configuration options
   * @param {number} [config.npcDensity=1.0] - NPCs per room (0.5-3.0)
   * @param {number} [config.enemyDensity=0.5] - Enemies per hostile district (0.2-1.0)
   * @param {boolean} [config.backgroundNPCs=true] - Add non-case NPCs
   * @param {string} [config.evidencePlacement='normal'] - 'sparse', 'normal', 'dense'
   */
  constructor(config = {}) {
    this.npcDensity = config.npcDensity || 1.0;
    this.enemyDensity = config.enemyDensity || 0.5;
    this.backgroundNPCs = config.backgroundNPCs !== false;
    this.evidencePlacement = config.evidencePlacement || 'normal';
  }

  /**
   * Main entry point - generates all spawn data
   * @param {object} district - District layout from DistrictGenerator
   * @param {object} caseData - Case data from CaseGenerator
   * @param {number} seed - Random seed for deterministic population
   * @returns {{npcs: Array, evidence: Array, objects: Array}} Spawn data arrays
   */
  populate(district, caseData, seed) {
    const rng = new SeededRandom(seed);

    // Initialize spawn data arrays
    const spawnData = {
      npcs: [],
      evidence: [],
      objects: [],
    };

    // Phase 1: Place case NPCs (victim, killer, witnesses)
    const caseNPCs = this._placeNPCs(district, caseData, rng);
    spawnData.npcs.push(...caseNPCs);

    // Phase 2: Place evidence from case
    const evidence = this._placeEvidence(district, caseData, rng);
    spawnData.evidence.push(...evidence);

    // Phase 3: Place interactive objects
    const objects = this._placeObjects(district, rng);
    spawnData.objects.push(...objects);

    console.log(`[EntityPopulator] Generated spawn data: ${spawnData.npcs.length} NPCs, ${spawnData.evidence.length} evidence, ${spawnData.objects.length} objects`);

    return spawnData;
  }

  /**
   * Places NPCs from case data and ambient NPCs
   * @private
   * @param {object} district - District layout
   * @param {object} caseData - Case data
   * @param {SeededRandom} rng - Random number generator
   * @returns {Array<object>} NPC spawn data
   */
  _placeNPCs(district, caseData, rng) {
    const npcSpawnData = [];

    if (!district.rooms || district.rooms.length === 0) {
      console.warn('[EntityPopulator] No rooms in district, cannot place NPCs');
      return npcSpawnData;
    }

    // Get case NPCs (victim, killer, witnesses)
    const caseNPCs = caseData.npcs || [];

    for (const npc of caseNPCs) {
      // Assign home room based on NPC role
      const homeRoom = this._selectNPCHomeRoom(npc, district, rng);

      // Determine NPC position within room
      const position = this._getRoomCenterPosition(homeRoom, rng);

      // Determine patrol route (optional - between rooms)
      const patrolRoute = this._generatePatrolRoute(homeRoom, district, rng);

      // Determine faction based on district or NPC data
      const faction = npc.faction || this._determineFaction(homeRoom, district, rng);

      // Determine attitude based on NPC role
      const attitude = this._determineAttitude(npc, faction);

      npcSpawnData.push({
        type: 'npc',
        npcId: npc.id,
        name: npc.name || `NPC_${npc.id}`,
        position,
        roomId: homeRoom.id,
        faction,
        role: npc.role || 'civilian', // 'victim', 'killer', 'witness', 'civilian'
        attitude,
        patrolRoute,
        knownInfo: npc.knownInfo || [],
        hasDialogue: true,
        dialogueId: npc.dialogueId || `dialogue_${npc.id}`,
      });
    }

    // Add background NPCs if enabled
    if (this.backgroundNPCs) {
      const ambientNPCs = this._placeAmbientNPCs(district, rng);
      npcSpawnData.push(...ambientNPCs);
    }

    return npcSpawnData;
  }

  /**
   * Places ambient (non-case) NPCs in rooms
   * @private
   * @param {object} district - District layout
   * @param {SeededRandom} rng - Random number generator
   * @returns {Array<object>} Ambient NPC spawn data
   */
  _placeAmbientNPCs(district, rng) {
    const ambientNPCs = [];

    for (const room of district.rooms) {
      // Determine how many NPCs to place based on room type and density
      const npcCount = this._calculateRoomNPCCount(room, rng);

      for (let i = 0; i < npcCount; i++) {
        const position = this._getRoomCenterPosition(room, rng);
        const faction = this._determineFaction(room, district, rng);

        ambientNPCs.push({
          type: 'npc',
          npcId: `ambient_${room.id}_${i}`,
          name: this._generateAmbientNPCName(room, rng),
          position,
          roomId: room.id,
          faction,
          role: 'civilian',
          attitude: 'neutral',
          patrolRoute: [],
          knownInfo: [],
          hasDialogue: true,
          dialogueId: 'dialogue_ambient_civilian',
        });
      }
    }

    return ambientNPCs;
  }

  /**
   * Places evidence items from case data
   * @private
   * @param {object} district - District layout
   * @param {object} caseData - Case data with evidence placements
   * @param {SeededRandom} rng - Random number generator
   * @returns {Array<object>} Evidence spawn data
   */
  _placeEvidence(district, caseData, rng) {
    const evidenceSpawnData = [];

    if (!caseData.evidencePlacements || caseData.evidencePlacements.length === 0) {
      console.warn('[EntityPopulator] No evidence placements in case data');
      return evidenceSpawnData;
    }

    for (const placement of caseData.evidencePlacements) {
      const evidenceData = caseData.evidenceGraph.evidenceData.get(placement.evidenceId);

      if (!evidenceData) {
        console.warn(`[EntityPopulator] Evidence not found in graph: ${placement.evidenceId}`);
        continue;
      }

      // Convert room coordinates to world coordinates
      const room = district.rooms.find(r => r.id === placement.roomId);
      if (!room) {
        console.warn(`[EntityPopulator] Room not found for evidence: ${placement.roomId}`);
        continue;
      }

      const position = placement.position || this._getRoomCenterPosition(room, rng);

      const dependencies = typeof caseData.evidenceGraph?.getDependenciesFor === 'function'
        ? caseData.evidenceGraph.getDependenciesFor(placement.evidenceId)
        : [];

      const gating = this._deriveEvidenceGating(evidenceData, dependencies);
      const derivedClues = this._resolveDerivedClues(placement.evidenceId, evidenceData, caseData);

      evidenceSpawnData.push({
        type: 'evidence',
        evidenceId: placement.evidenceId,
        position,
        roomId: placement.roomId,
        evidenceType: evidenceData.type,
        caseId: caseData.id,
        title: evidenceData.description,
        description: evidenceData.description,
        hidden: gating.hidden,
        requires: gating.requires,
        derivedClues,
        isSolutionFact: evidenceData.isSolutionFact || false,
      });
    }

    return evidenceSpawnData;
  }

  /**
   * Places interactive objects (furniture, containers, doors)
   * @private
   * @param {object} district - District layout
   * @param {SeededRandom} rng - Random number generator
   * @returns {Array<object>} Object spawn data
   */
  _placeObjects(district, rng) {
    const objectSpawnData = [];

    for (const room of district.rooms) {
      // Place containers based on room type
      if (this._shouldPlaceContainer(room, rng)) {
        const containerPosition = this._getRoomCornerPosition(room, rng);

        objectSpawnData.push({
          type: 'container',
          objectId: `container_${room.id}_${objectSpawnData.length}`,
          position: containerPosition,
          roomId: room.id,
          interactable: true,
          locked: rng.nextBool(0.3), // 30% chance locked
          contents: [], // Can contain evidence or items
        });
      }

      // Place furniture (decorative)
      const furnitureCount = this._calculateFurnitureCount(room, rng);
      for (let i = 0; i < furnitureCount; i++) {
        const furniturePosition = this._getRoomCenterPosition(room, rng);

        objectSpawnData.push({
          type: 'furniture',
          objectId: `furniture_${room.id}_${i}`,
          position: furniturePosition,
          roomId: room.id,
          interactable: false,
          furnitureType: this._selectFurnitureType(room, rng),
        });
      }
    }

    return objectSpawnData;
  }

  /**
   * Determine gating configuration for evidence based on dependencies and metadata.
   * @private
   * @param {object} evidenceData
   * @param {Array<{from: string, metadata: object}>} dependencies
   * @returns {{hidden: boolean, requires: (string|null)}}
   */
  _deriveEvidenceGating(evidenceData, dependencies) {
    const baseHidden = Boolean(evidenceData.hidden);
    const baseRequires = this._normalizeAbilityRequirement(evidenceData.requires);

    if (!Array.isArray(dependencies) || dependencies.length === 0) {
      return {
        hidden: baseHidden,
        requires: baseRequires,
      };
    }

    const explicitAbility = dependencies
      .map(({ metadata }) => this._normalizeAbilityRequirement(metadata?.requiresAbility))
      .find((ability) => ability !== null);

    const hasAnalysisDependency = dependencies.some(({ metadata }) => (metadata?.revealType ?? RevealType.DIRECT) === RevealType.ANALYSIS);
    const hasClueDependency = dependencies.some(({ metadata }) => (metadata?.revealType ?? RevealType.DIRECT) === RevealType.CLUE);

    const hidden = baseHidden || hasAnalysisDependency || hasClueDependency;

    if (explicitAbility) {
      return { hidden, requires: explicitAbility };
    }

    if (hasAnalysisDependency) {
      return { hidden, requires: DEFAULT_FORENSIC_ANALYSIS_ABILITY };
    }

    if (hasClueDependency) {
      return { hidden, requires: DEFAULT_DETECTIVE_VISION_ABILITY };
    }

    return {
      hidden,
      requires: baseRequires,
    };
  }

  /**
   * Resolve derived clue IDs for evidence placement.
   * @private
   * @param {string} evidenceId
   * @param {object} evidenceData
   * @param {object} caseData
   * @returns {Array<string>}
   */
  _resolveDerivedClues(evidenceId, evidenceData, caseData) {
    const clues = new Set();

    if (Array.isArray(evidenceData?.derivedClues)) {
      for (const clueId of evidenceData.derivedClues) {
        if (typeof clueId === 'string' && clueId.length > 0) {
          clues.add(clueId);
        }
      }
    }

    if (clues.size === 0 && Array.isArray(caseData?.evidence)) {
      const definition = caseData.evidence.find((entry) => entry?.id === evidenceId);
      if (definition && Array.isArray(definition.derivedClues)) {
        for (const clueId of definition.derivedClues) {
          if (typeof clueId === 'string' && clueId.length > 0) {
            clues.add(clueId);
          }
        }
      }
    }

    return Array.from(clues);
  }

  /**
   * Normalize ability requirement strings.
   * @private
   * @param {string|Array<string>|undefined|null} raw
   * @returns {string|null}
   */
  _normalizeAbilityRequirement(raw) {
    if (Array.isArray(raw)) {
      for (const entry of raw) {
        if (typeof entry === 'string' && entry.trim().length > 0) {
          return entry.trim();
        }
      }
      return null;
    }

    if (typeof raw === 'string' && raw.trim().length > 0) {
      return raw.trim();
    }

    return null;
  }

  // Helper methods

  /**
   * Selects appropriate home room for NPC based on role
   * @private
   */
  _selectNPCHomeRoom(npc, district, rng) {
    const { role } = npc;

    // Prefer specific room types based on role
    let preferredTypes = ['apartment'];
    if (role === 'victim' || role === 'killer') {
      preferredTypes = ['apartment', 'office'];
    } else if (role === 'witness') {
      preferredTypes = ['apartment', 'alley', 'street'];
    }

    // Find matching rooms
    const matchingRooms = district.rooms.filter(r =>
      preferredTypes.includes(r.roomType || r.type || 'generic')
    );

    if (matchingRooms.length > 0) {
      return rng.choice(matchingRooms);
    }

    // Fallback to any room
    return rng.choice(district.rooms);
  }

  /**
   * Gets position near room center with some variation
   * @private
  */
  _getRoomCenterPosition(room, rng) {
    const width = room.layoutWidth ?? room.width ?? 10;
    const height = room.layoutHeight ?? room.height ?? 10;
    const centerX = room.x + width / 2;
    const centerY = room.y + height / 2;

    // Add random offset within room bounds
    const offsetX = rng.nextInt(-2, 3);
    const offsetY = rng.nextInt(-2, 3);

    return {
      x: centerX + offsetX,
      y: centerY + offsetY,
    };
  }

  /**
   * Gets position in room corner
   * @private
   */
  _getRoomCornerPosition(room, rng) {
    const margin = 2;
    const width = room.layoutWidth ?? room.width ?? 10;
    const height = room.layoutHeight ?? room.height ?? 10;
    const corner = rng.choice(['top-left', 'top-right', 'bottom-left', 'bottom-right']);

    let x, y;
    switch (corner) {
      case 'top-left':
        x = room.x + margin;
        y = room.y + margin;
        break;
      case 'top-right':
        x = room.x + width - margin;
        y = room.y + margin;
        break;
      case 'bottom-left':
        x = room.x + margin;
        y = room.y + height - margin;
        break;
      case 'bottom-right':
        x = room.x + width - margin;
        y = room.y + height - margin;
        break;
    }

    return { x, y };
  }

  /**
   * Generates patrol route for NPC
   * @private
   */
  _generatePatrolRoute(homeRoom, district, rng) {
    // Simple patrol: stay in home room or visit 1-2 nearby rooms
    if (rng.nextBool(0.7)) {
      return []; // 70% NPCs don't patrol
    }

    // Find nearby rooms (within 3 rooms distance)
    const nearbyRooms = district.rooms.filter(r =>
      r.id !== homeRoom.id && this._getRoomDistance(homeRoom, r) <= 3
    );

    if (nearbyRooms.length === 0) {
      return [];
    }

    const patrolCount = rng.nextInt(1, Math.min(3, nearbyRooms.length + 1));
    const patrolRooms = [];

    for (let i = 0; i < patrolCount; i++) {
      const room = rng.choice(nearbyRooms);
      if (!patrolRooms.includes(room.id)) {
        patrolRooms.push(room.id);
      }
    }

    return [homeRoom.id, ...patrolRooms];
  }

  /**
   * Calculates distance between rooms (Manhattan distance)
   * @private
   */
  _getRoomDistance(roomA, roomB) {
    const dx = Math.abs(roomA.x - roomB.x);
    const dy = Math.abs(roomA.y - roomB.y);
    return Math.floor((dx + dy) / 10); // Normalize to room units
  }

  /**
   * Determines faction for room or NPC
   * @private
   */
  _determineFaction(room, district, rng) {
    // Use district faction control if available
    if (district.factionControl && room.id in district.factionControl) {
      return district.factionControl[room.id];
    }

    // Use room zone faction if available
    if (room.zone && district.zones && district.zones[room.zone]) {
      return district.zones[room.zone].faction;
    }

    // Default to civilian with some variation
    const factions = ['civilian', 'civilian', 'civilian', 'police', 'criminals'];
    return rng.choice(factions);
  }

  /**
   * Determines NPC attitude based on role and faction
   * @private
   */
  _determineAttitude(npc, faction) {
    if (npc.role === 'killer') {
      return 'hostile';
    }

    if (npc.role === 'victim') {
      return 'neutral'; // Victim may be dead or injured
    }

    if (npc.role === 'witness') {
      return 'neutral'; // Witnesses can be convinced to talk
    }

    return 'neutral';
  }

  /**
   * Calculates number of NPCs to place in room
   * @private
   */
  _calculateRoomNPCCount(room, rng) {
    const baseCount = Math.floor(this.npcDensity);
    const extra = rng.nextBool(this.npcDensity - baseCount) ? 1 : 0;

    // Adjust based on room type
    const roomType = room.roomType || room.type || 'generic';
    const multiplier = {
      'apartment': 0.5,
      'office': 0.7,
      'street': 1.5,
      'alley': 0.3,
      'crime_scene': 0,
    }[roomType] || 1.0;

    return Math.floor((baseCount + extra) * multiplier);
  }

  /**
   * Generates ambient NPC name based on room
   * @private
   */
  _generateAmbientNPCName(room, rng) {
    const roomType = room.roomType || room.type || 'generic';

    const names = {
      'apartment': ['Resident', 'Tenant', 'Neighbor'],
      'office': ['Worker', 'Employee', 'Manager'],
      'street': ['Pedestrian', 'Passerby', 'Citizen'],
      'alley': ['Vagrant', 'Dealer', 'Lookout'],
      'shop': ['Shopkeeper', 'Clerk', 'Customer'],
    };

    const typeNames = names[roomType] || ['Person', 'Civilian', 'Bystander'];
    return rng.choice(typeNames);
  }

  /**
   * Determines if container should be placed in room
   * @private
   */
  _shouldPlaceContainer(room, rng) {
    const roomType = room.roomType || room.type || 'generic';

    const probability = {
      'apartment': 0.8,
      'office': 0.6,
      'warehouse': 0.9,
      'evidence_storage': 1.0,
      'crime_scene': 0.5,
    }[roomType] || 0.3;

    return rng.nextBool(probability);
  }

  /**
   * Calculates furniture count for room
   * @private
   */
  _calculateFurnitureCount(room, rng) {
    const roomType = room.roomType || room.type || 'generic';

    const baseCounts = {
      'apartment': 3,
      'office': 2,
      'alley': 0,
      'crime_scene': 2,
      'warehouse': 1,
    };

    const baseCount = baseCounts[roomType] || 1;
    return rng.nextInt(baseCount, baseCount + 2);
  }

  /**
   * Selects furniture type for room
   * @private
   */
  _selectFurnitureType(room, rng) {
    const roomType = room.roomType || room.type || 'generic';

    const types = {
      'apartment': ['chair', 'table', 'bed', 'couch'],
      'office': ['desk', 'chair', 'filing_cabinet', 'computer'],
      'crime_scene': ['table', 'chair', 'debris'],
      'warehouse': ['crate', 'barrel', 'shelves'],
    };

    const typeList = types[roomType] || ['chair', 'table', 'crate'];
    return rng.choice(typeList);
  }
}
