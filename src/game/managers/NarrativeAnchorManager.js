/**
 * NarrativeAnchorManager
 *
 * Manages fixed story locations (detective office, faction HQs, quest locations)
 * that persist across district regenerations, ensuring narrative continuity
 * while maintaining procedural variety.
 *
 * Hybrid Fixed-Procedural Approach:
 * - Fixed anchors (isPermanent: true) never regenerate, maintaining story coherence
 * - Anchors marked with fixed positions always appear at those coordinates
 * - Detective office always at (0, 0) as the player's base of operations
 * - Faction HQs placed at predetermined positions for consistency
 * - Safe houses can be unlocked by player and persist once discovered
 *
 * @class
 * @example
 * const manager = new NarrativeAnchorManager();
 * const detectiveOffice = manager.getAnchorById('detective_office');
 * const allAnchors = manager.getAnchors({ isPermanent: true });
 * manager.applyAnchorsToDistrict(district, caseData);
 */

import { RoomTemplate, TileType } from '../../engine/procedural/RoomTemplate.js';
import { getFactionIds, getFaction } from '../data/factions/index.js';

/**
 * Anchor types for semantic classification
 * @readonly
 * @enum {string}
 */
export const AnchorType = {
  DETECTIVE_OFFICE: 'detective_office',
  FACTION_HEADQUARTERS: 'faction_headquarters',
  QUEST_LOCATION: 'quest_location',
  SAFE_HOUSE: 'safe_house',
};

/**
 * NarrativeAnchorManager class
 */
export class NarrativeAnchorManager {
  /**
   * Creates a new NarrativeAnchorManager
   */
  constructor() {
    /** @type {Map<string, object>} Map of anchor ID to anchor data */
    this.anchors = new Map();

    // Register default anchors (detective office + faction HQs)
    this._registerDefaultAnchors();
  }

  /**
   * Registers a narrative anchor
   *
   * @param {object} anchorData - Anchor configuration
   * @param {string} anchorData.id - Unique anchor identifier
   * @param {string} anchorData.type - Anchor type (from AnchorType enum)
   * @param {boolean} [anchorData.isPermanent=false] - Never regenerates if true
   * @param {RoomTemplate} anchorData.roomTemplate - Fixed room layout
   * @param {{x: number, y: number}} [anchorData.position] - Fixed position in district
   * @param {object} [anchorData.metadata={}] - Additional metadata
   * @param {string} [anchorData.metadata.name] - Display name
   * @param {string} [anchorData.metadata.description] - Description
   * @param {string[]} [anchorData.metadata.questTriggers] - Quest IDs triggered here
   * @param {string} [anchorData.metadata.factionId] - Associated faction ID
   * @returns {string} The anchor ID
   */
  registerAnchor(anchorData) {
    // Validate required fields
    if (!anchorData.id) {
      throw new Error('Anchor must have an id');
    }
    if (!anchorData.type) {
      throw new Error('Anchor must have a type');
    }
    if (!anchorData.roomTemplate) {
      throw new Error('Anchor must have a roomTemplate');
    }

    // Validate room template
    const validation = anchorData.roomTemplate.validate();
    if (!validation.valid) {
      throw new Error(`Invalid room template: ${validation.errors.join(', ')}`);
    }

    // Build anchor object
    const anchor = {
      id: anchorData.id,
      type: anchorData.type,
      isPermanent: anchorData.isPermanent !== undefined ? anchorData.isPermanent : false,
      roomTemplate: anchorData.roomTemplate,
      position: anchorData.position || null,
      metadata: {
        name: anchorData.metadata?.name || anchorData.id,
        description: anchorData.metadata?.description || '',
        questTriggers: anchorData.metadata?.questTriggers || [],
        factionId: anchorData.metadata?.factionId || null,
        ...anchorData.metadata,
      },
    };

    // Store anchor
    this.anchors.set(anchor.id, anchor);

    return anchor.id;
  }

  /**
   * Gets all anchors matching optional filter
   *
   * @param {object} [filter={}] - Filter criteria
   * @param {string} [filter.type] - Filter by anchor type
   * @param {boolean} [filter.isPermanent] - Filter by permanence
   * @param {string} [filter.factionId] - Filter by faction ID
   * @returns {object[]} Array of anchor data
   */
  getAnchors(filter = {}) {
    let results = Array.from(this.anchors.values());

    // Apply filters
    if (filter.type !== undefined) {
      results = results.filter(anchor => anchor.type === filter.type);
    }

    if (filter.isPermanent !== undefined) {
      results = results.filter(anchor => anchor.isPermanent === filter.isPermanent);
    }

    if (filter.factionId !== undefined) {
      results = results.filter(anchor => anchor.metadata.factionId === filter.factionId);
    }

    return results;
  }

  /**
   * Gets a specific anchor by ID
   *
   * @param {string} id - Anchor ID
   * @returns {object|null} Anchor data or null if not found
   */
  getAnchorById(id) {
    return this.anchors.get(id) || null;
  }

  /**
   * Applies anchors to a district, replacing procedural rooms with fixed anchors
   *
   * @param {object} district - District object with rooms array and graph
   * @param {object} [caseData] - Optional case data for context
   * @returns {object} Modified district
   */
  applyAnchorsToDistrict(district, caseData = null) {
    if (!district || !district.rooms) {
      throw new Error('District must have a rooms array');
    }

    // Get permanent anchors
    const permanentAnchors = this.getAnchors({ isPermanent: true });

    // Track applied anchors
    const appliedAnchors = [];

    for (const anchor of permanentAnchors) {
      // Find existing room at anchor position or create new one
      let targetRoom = null;

      if (anchor.position) {
        // Fixed position: replace any room at that position
        targetRoom = district.rooms.find(
          room =>
            room.x === anchor.position.x &&
            room.y === anchor.position.y
        );

        if (!targetRoom) {
          // Create new room at fixed position
          targetRoom = {
            id: anchor.id,
            x: anchor.position.x,
            y: anchor.position.y,
            width: anchor.roomTemplate.width,
            height: anchor.roomTemplate.height,
            roomType: anchor.type,
          };
          district.rooms.push(targetRoom);
        } else {
          // Replace existing room
          targetRoom.id = anchor.id;
          targetRoom.roomType = anchor.type;
        }
      } else {
        // No fixed position: find compatible room by type
        targetRoom = district.rooms.find(
          room => room.roomType === anchor.type
        );

        if (!targetRoom) {
          // No compatible room found, create at default position
          targetRoom = {
            id: anchor.id,
            x: 0,
            y: 0,
            width: anchor.roomTemplate.width,
            height: anchor.roomTemplate.height,
            roomType: anchor.type,
          };
          district.rooms.push(targetRoom);
        } else {
          targetRoom.id = anchor.id;
        }
      }

      // Apply anchor template to room
      targetRoom.templateId = anchor.roomTemplate.id;
      targetRoom.width = anchor.roomTemplate.width;
      targetRoom.height = anchor.roomTemplate.height;
      targetRoom.tilemap = this._copyRoomTemplate(anchor.roomTemplate);
      targetRoom.isAnchor = true;
      targetRoom.anchorMetadata = anchor.metadata;

      appliedAnchors.push({
        anchorId: anchor.id,
        roomId: targetRoom.id,
        position: { x: targetRoom.x, y: targetRoom.y },
      });
    }

    // Ensure detective office is at (0, 0)
    const detectiveOffice = district.rooms.find(
      room => room.id === 'detective_office' || room.roomType === AnchorType.DETECTIVE_OFFICE
    );
    if (detectiveOffice && (detectiveOffice.x !== 0 || detectiveOffice.y !== 0)) {
      detectiveOffice.x = 0;
      detectiveOffice.y = 0;
    }

    // Store applied anchors in district metadata
    if (!district.metadata) {
      district.metadata = {};
    }
    district.metadata.appliedAnchors = appliedAnchors;

    return district;
  }

  /**
   * Creates default narrative anchors (detective office + faction HQs)
   *
   * @returns {object[]} Array of default anchor data
   */
  createDefaultAnchors() {
    const defaultAnchors = [];

    // 1. Detective Office (always at 0, 0)
    const detectiveOfficeTemplate = this._createDetectiveOfficeTemplate();
    defaultAnchors.push({
      id: 'detective_office',
      type: AnchorType.DETECTIVE_OFFICE,
      isPermanent: true,
      roomTemplate: detectiveOfficeTemplate,
      position: { x: 0, y: 0 },
      metadata: {
        name: 'Detective Office',
        description: 'Your base of operations. The investigation board, evidence locker, and case files are here.',
        questTriggers: ['tutorial_start', 'case_briefing'],
      },
    });

    // 2. Faction HQs (one per faction)
    const factionIds = getFactionIds();
    const factionPositions = [
      { x: 50, y: 50 },   // Vanguard Prime
      { x: -50, y: 50 },  // Luminari Syndicate
      { x: 50, y: -50 },  // Cipher Collective
      { x: -50, y: -50 }, // Wraith Network
      { x: 0, y: 70 },    // Memory Keepers
    ];

    factionIds.forEach((factionId, index) => {
      const faction = getFaction(factionId);
      const template = this._createFactionHQTemplate(faction);
      const position = factionPositions[index] || { x: index * 40, y: 40 };

      defaultAnchors.push({
        id: `faction_hq_${factionId}`,
        type: AnchorType.FACTION_HEADQUARTERS,
        isPermanent: true,
        roomTemplate: template,
        position,
        metadata: {
          name: `${faction.name} Headquarters`,
          description: faction.description || `The central base of ${faction.name}.`,
          factionId,
          questTriggers: [`faction_intro_${factionId}`],
        },
      });
    });

    return defaultAnchors;
  }

  /**
   * Serializes anchor data for save/load
   *
   * @returns {object} Serialized data
   */
  serialize() {
    const anchorsData = [];

    for (const anchor of this.anchors.values()) {
      anchorsData.push({
        id: anchor.id,
        type: anchor.type,
        isPermanent: anchor.isPermanent,
        roomTemplate: anchor.roomTemplate.serialize(),
        position: anchor.position,
        metadata: anchor.metadata,
      });
    }

    return {
      version: 1,
      anchors: anchorsData,
    };
  }

  /**
   * Deserializes anchor data from save
   *
   * @param {object} data - Serialized data
   * @returns {boolean} Success
   */
  deserialize(data) {
    if (!data || data.version !== 1) {
      console.warn('[NarrativeAnchorManager] Incompatible save version');
      return false;
    }

    try {
      // Clear existing anchors
      this.anchors.clear();

      // Restore anchors
      for (const anchorData of data.anchors) {
        // Deserialize room template
        anchorData.roomTemplate = RoomTemplate.deserialize(anchorData.roomTemplate);

        // Register anchor
        this.registerAnchor(anchorData);
      }

      return true;
    } catch (error) {
      console.error('[NarrativeAnchorManager] Failed to deserialize:', error);
      return false;
    }
  }

  /**
   * Registers default anchors (called in constructor)
   * @private
   */
  _registerDefaultAnchors() {
    const defaults = this.createDefaultAnchors();
    for (const anchorData of defaults) {
      this.registerAnchor(anchorData);
    }
  }

  /**
   * Creates a copy of room template tilemap
   * @private
   * @param {RoomTemplate} template - Room template
   * @returns {object} Tilemap copy
   */
  _copyRoomTemplate(template) {
    // Return a deep copy of the tile array
    return {
      width: template.width,
      height: template.height,
      tiles: template.tiles.map(row => [...row]),
      getTile: (x, y) => {
        if (x < 0 || x >= template.width || y < 0 || y >= template.height) {
          return TileType.EMPTY;
        }
        return template.tiles[y][x];
      },
      setTile: (x, y, type) => {
        if (x >= 0 && x < template.width && y >= 0 && y < template.height) {
          template.tiles[y][x] = type;
        }
      },
    };
  }

  /**
   * Creates detective office room template
   * @private
   * @returns {RoomTemplate} Detective office template
   */
  _createDetectiveOfficeTemplate() {
    const width = 20;
    const height = 20;

    // Build tile layout
    const tiles = Array(height).fill(null).map(() => Array(width).fill(TileType.EMPTY));

    // Walls
    for (let x = 0; x < width; x++) {
      tiles[0][x] = TileType.WALL;
      tiles[height - 1][x] = TileType.WALL;
    }
    for (let y = 0; y < height; y++) {
      tiles[y][0] = TileType.WALL;
      tiles[y][width - 1] = TileType.WALL;
    }

    // Floor
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        tiles[y][x] = TileType.FLOOR;
      }
    }

    // Furniture (desk, evidence board, etc.)
    tiles[5][5] = TileType.FURNITURE; // Desk
    tiles[5][6] = TileType.FURNITURE;
    tiles[10][3] = TileType.FURNITURE; // Evidence board
    tiles[10][4] = TileType.FURNITURE;
    tiles[15][10] = TileType.CONTAINER; // Filing cabinet
    tiles[15][15] = TileType.CONTAINER; // Computer

    // Door (main entrance)
    tiles[height - 1][Math.floor(width / 2)] = TileType.DOOR;

    return new RoomTemplate({
      id: 'detective_office_default',
      type: AnchorType.DETECTIVE_OFFICE,
      width,
      height,
      tiles,
      doors: [
        {
          id: 'main',
          x: Math.floor(width / 2),
          y: height - 1,
          direction: 'south',
          type: 'main',
        },
      ],
      interactionPoints: [
        { id: 'desk', x: 5, y: 5, type: 'quest_trigger', metadata: { object: 'desk' } },
        { id: 'evidence_board', x: 10, y: 3, type: 'quest_trigger', metadata: { object: 'evidence_board' } },
        { id: 'filing_cabinet', x: 15, y: 10, type: 'container' },
        { id: 'computer', x: 15, y: 15, type: 'quest_trigger', metadata: { object: 'computer' } },
        { id: 'spawn_center', x: 10, y: 10, type: 'npc_spawn' },
      ],
      metadata: {
        name: 'Detective Office',
        description: 'Your base of operations',
      },
    });
  }

  /**
   * Creates faction HQ room template
   * @private
   * @param {object} faction - Faction data
   * @returns {RoomTemplate} Faction HQ template
   */
  _createFactionHQTemplate(faction) {
    const width = 18;
    const height = 18;

    // Build tile layout
    const tiles = Array(height).fill(null).map(() => Array(width).fill(TileType.EMPTY));

    // Walls
    for (let x = 0; x < width; x++) {
      tiles[0][x] = TileType.WALL;
      tiles[height - 1][x] = TileType.WALL;
    }
    for (let y = 0; y < height; y++) {
      tiles[y][0] = TileType.WALL;
      tiles[y][width - 1] = TileType.WALL;
    }

    // Floor
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        tiles[y][x] = TileType.FLOOR;
      }
    }

    // Faction-specific furniture
    tiles[8][8] = TileType.FURNITURE; // Central meeting table
    tiles[8][9] = TileType.FURNITURE;
    tiles[9][8] = TileType.FURNITURE;
    tiles[9][9] = TileType.FURNITURE;

    tiles[3][3] = TileType.CONTAINER; // Faction resources
    tiles[3][14] = TileType.CONTAINER;
    tiles[14][3] = TileType.CONTAINER;
    tiles[14][14] = TileType.CONTAINER;

    // Door
    tiles[0][Math.floor(width / 2)] = TileType.DOOR;

    return new RoomTemplate({
      id: `faction_hq_${faction.id}_default`,
      type: AnchorType.FACTION_HEADQUARTERS,
      width,
      height,
      tiles,
      doors: [
        {
          id: 'main',
          x: Math.floor(width / 2),
          y: 0,
          direction: 'north',
          type: 'main',
        },
      ],
      interactionPoints: [
        { id: 'meeting_table', x: 8, y: 8, type: 'quest_trigger', metadata: { object: 'meeting_table' } },
        { id: 'resource_1', x: 3, y: 3, type: 'container' },
        { id: 'resource_2', x: 3, y: 14, type: 'container' },
        { id: 'resource_3', x: 14, y: 3, type: 'container' },
        { id: 'resource_4', x: 14, y: 14, type: 'container' },
        { id: 'spawn_center', x: 8, y: 12, type: 'npc_spawn' },
      ],
      metadata: {
        name: `${faction.name} Headquarters`,
        factionId: faction.id,
      },
    });
  }
}
