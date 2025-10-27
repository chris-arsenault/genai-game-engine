/**
 * @fileoverview CaseGenerator - Generates murder mystery cases with guaranteed solvability
 * Uses REVERSE CONSTRUCTION: defines solution first, then builds evidence chain backward.
 * Ensures all cases are solvable by validating with EvidenceGraph.
 */

import { SeededRandom } from '../../engine/procedural/SeededRandom.js';
import { EvidenceGraph, EvidenceType } from './EvidenceGraph.js';

/**
 * Case difficulty configurations
 * @readonly
 * @enum {object}
 */
export const Difficulty = {
  EASY: {
    evidenceCount: 15,
    redHerringCount: 2,
    chainLength: 3,
    clueDirectness: 'obvious',
  },
  MEDIUM: {
    evidenceCount: 25,
    redHerringCount: 4,
    chainLength: 5,
    clueDirectness: 'moderate',
  },
  HARD: {
    evidenceCount: 35,
    redHerringCount: 6,
    chainLength: 7,
    clueDirectness: 'subtle',
  },
};

/**
 * Motive types for murder cases
 * @readonly
 * @enum {string}
 */
export const MotiveType = {
  REVENGE: 'revenge',       // Victim wronged killer in past
  GREED: 'greed',          // Financial gain (inheritance, insurance)
  JEALOUSY: 'jealousy',    // Romantic rivalry
  BLACKMAIL: 'blackmail',  // Victim knew killer's secret
  POWER: 'power',          // Political/business elimination
  MADNESS: 'madness',      // Serial killer pattern
};

/**
 * Method types for murder
 * @readonly
 * @enum {string}
 */
export const MethodType = {
  STABBING: 'stabbing',           // Knife/blade weapon
  SHOOTING: 'shooting',           // Firearm
  POISONING: 'poisoning',         // Toxin in food/drink
  STRANGULATION: 'strangulation', // Manual/ligature
  BLUNT_FORCE: 'blunt_force',     // Heavy object
  EXPLOSION: 'explosion',         // Bomb/device
};

/**
 * Generates complete murder mystery cases using reverse construction.
 * Creates solution first, then builds evidence chain backward to ensure solvability.
 *
 * @class
 * @example
 * const generator = new CaseGenerator({ difficulty: 'medium' });
 * const district = { rooms: [...], npcs: [...] };
 * const caseData = generator.generate(district, 12345);
 * console.log(caseData.evidenceGraph.isSolvable(caseData.solution)); // true
 */
export class CaseGenerator {
  /**
   * Creates a new case generator
   * @param {object} [config={}] - Configuration options
   * @param {string} [config.difficulty='medium'] - Case difficulty level
   * @param {number} [config.redHerringCount] - Override red herring count
   * @param {number} [config.evidenceChainLength] - Override evidence chain length
   */
  constructor(config = {}) {
    this.difficulty = config.difficulty || 'medium';
    this.difficultyConfig = Difficulty[this.difficulty.toUpperCase()] || Difficulty.MEDIUM;

    // Allow overrides
    if (config.redHerringCount !== undefined) {
      this.difficultyConfig.redHerringCount = config.redHerringCount;
    }
    if (config.evidenceChainLength !== undefined) {
      this.difficultyConfig.chainLength = config.evidenceChainLength;
    }
  }

  /**
   * Generates a complete murder mystery case
   * @param {object} district - District data from DistrictGenerator
   * @param {number} seed - Random seed for deterministic generation
   * @returns {CaseData} Complete case with solution and evidence
   */
  generate(district, seed) {
    const rng = new SeededRandom(seed);

    // Extract NPCs from district (create mock NPCs if not provided)
    const npcs = district.npcs || this._createMockNPCs(district, rng);

    // Phase 1: Define solution
    const { victim, killer } = this._selectVictimAndKiller(npcs, rng);
    const motive = this._chooseMotive(victim, killer, rng);
    const method = this._chooseMethod(rng);
    const timeline = this._buildTimeline(victim, killer, rng);

    const solution = {
      victimId: victim.id,
      killerId: killer.id,
      motive,
      method,
      timeline,
    };

    // Phase 2: Build evidence graph (reverse construction)
    const evidenceGraph = this._buildEvidenceGraph(solution, district, rng, this.difficultyConfig);

    // Phase 3: Place evidence in rooms
    const evidencePlacements = this._placeEvidence(evidenceGraph, district, solution, rng);

    // Phase 4: Add red herrings
    this._createRedHerrings(evidenceGraph, district, rng, this.difficultyConfig.redHerringCount);

    // Phase 5: Validate solvability
    const startingEvidence = evidenceGraph.getStartingEvidence();
    const solutionFactIds = ['solution_killer_identity', 'solution_motive', 'solution_method'];

    const solvabilityResult = evidenceGraph.isSolvable(startingEvidence);

    if (!solvabilityResult.solvable) {
      // Should never happen with proper construction, but fail-safe
      console.error('Generated case is not solvable! Unreachable facts:', solvabilityResult.unreachableFactIds);
      console.error('Regenerating...');
      return this.generate(district, rng.next() * 999999);
    }

    // Phase 6: Calculate metrics
    const metrics = this._calculateMetrics(evidenceGraph, this.difficultyConfig, startingEvidence, solutionFactIds);

    return {
      id: `case_${seed}`,
      difficulty: this.difficulty,
      solution,
      npcs: [victim, killer, ...npcs.filter(n => n !== victim && n !== killer)],
      evidenceGraph,
      evidencePlacements,
      metrics,
    };
  }

  /**
   * Selects victim and killer from NPC pool
   * @private
   * @param {Array<object>} npcs - Available NPCs
   * @param {SeededRandom} rng - Random number generator
   * @returns {{victim: object, killer: object}} Selected NPCs
   */
  _selectVictimAndKiller(npcs, rng) {
    if (npcs.length < 2) {
      throw new Error('Need at least 2 NPCs to generate a case');
    }

    // Shuffle NPCs for random selection
    const shuffled = [...npcs];
    rng.shuffle(shuffled);

    const victim = shuffled[0];
    const killer = shuffled[1];

    return { victim, killer };
  }

  /**
   * Chooses motive based on NPC relationships
   * @private
   * @param {object} victim - Victim NPC
   * @param {object} killer - Killer NPC
   * @param {SeededRandom} rng - Random number generator
   * @returns {string} Selected motive
   */
  _chooseMotive(victim, killer, rng) {
    // Weighted probabilities
    const motives = [
      { type: MotiveType.REVENGE, weight: 30 },
      { type: MotiveType.GREED, weight: 25 },
      { type: MotiveType.JEALOUSY, weight: 20 },
      { type: MotiveType.BLACKMAIL, weight: 15 },
      { type: MotiveType.POWER, weight: 7 },
      { type: MotiveType.MADNESS, weight: 3 },
    ];

    const totalWeight = motives.reduce((sum, m) => sum + m.weight, 0);
    let roll = rng.nextFloat(0, totalWeight);

    for (const motive of motives) {
      roll -= motive.weight;
      if (roll <= 0) {
        return motive.type;
      }
    }

    return MotiveType.REVENGE; // Fallback
  }

  /**
   * Chooses murder method
   * @private
   * @param {SeededRandom} rng - Random number generator
   * @returns {string} Selected method
   */
  _chooseMethod(rng) {
    const methods = Object.values(MethodType);
    return rng.choice(methods);
  }

  /**
   * Builds timeline for the murder
   * @private
   * @param {object} victim - Victim NPC
   * @param {object} killer - Killer NPC
   * @param {SeededRandom} rng - Random number generator
   * @returns {object} Timeline data
   */
  _buildTimeline(victim, killer, rng) {
    const murderTime = rng.nextInt(1800, 2300); // 18:00-23:00
    const discoveryTime = murderTime + rng.nextInt(30, 180); // 30min-3hr later

    return {
      murderTime,
      discoveryTime,
      victimLastSeen: murderTime - rng.nextInt(60, 180),
      killerAlibiStart: murderTime - rng.nextInt(120, 240),
      killerAlibiEnd: murderTime + rng.nextInt(30, 120),
    };
  }

  /**
   * Builds evidence graph using reverse construction
   * @private
   * @param {object} solution - Case solution
   * @param {object} district - District data
   * @param {SeededRandom} rng - Random number generator
   * @param {object} difficulty - Difficulty configuration
   * @returns {EvidenceGraph} Complete evidence graph
   */
  _buildEvidenceGraph(solution, district, rng, difficulty) {
    const graph = new EvidenceGraph();

    // Step 1: Add starting evidence (always accessible)
    const crimeScene = this._selectCrimeScene(district, rng);

    graph.addEvidence('crime_scene_body', {
      type: EvidenceType.BODY,
      location: crimeScene,
      description: `Victim found at crime scene with signs of ${solution.method}`,
      isSolutionFact: false,
    });

    graph.addEvidence('crime_scene_observation', {
      type: EvidenceType.FINGERPRINTS,
      location: crimeScene,
      description: 'Signs of struggle and forced entry at crime scene',
      isSolutionFact: false,
    });

    // Step 2: Add intermediate evidence (requires body analysis)
    const victimApartment = this._selectRoomByType(district, 'apartment', rng);

    graph.addEvidence('victim_phone_records', {
      type: EvidenceType.RECEIPT,
      location: victimApartment,
      description: `Phone records show last contact with ${solution.killerId}`,
      isSolutionFact: false,
    });

    graph.addEvidence('victim_financial_records', {
      type: EvidenceType.CONTRACT,
      location: victimApartment,
      description: 'Financial documents revealing possible motive',
      isSolutionFact: false,
    });

    // Step 3: Add killer-identifying evidence
    const killerLocation = this._selectRoomByType(district, 'apartment', rng);

    graph.addEvidence('weapon_found', {
      type: EvidenceType.WEAPON,
      location: killerLocation,
      description: 'Murder weapon found at suspect location',
      isSolutionFact: false,
    });

    graph.addEvidence('killer_fingerprints', {
      type: EvidenceType.DNA,
      location: crimeScene,
      description: 'Forensic analysis confirms suspect presence',
      isSolutionFact: false,
    });

    // Step 4: Add solution facts
    graph.addEvidence('solution_killer_identity', {
      type: EvidenceType.KILLER_IDENTITY,
      location: killerLocation,
      description: `Evidence proves ${solution.killerId} is the killer`,
      isSolutionFact: true,
    });

    graph.addEvidence('solution_motive', {
      type: EvidenceType.MOTIVE,
      location: victimApartment,
      description: `Evidence establishes motive: ${solution.motive}`,
      isSolutionFact: true,
    });

    graph.addEvidence('solution_method', {
      type: EvidenceType.METHOD,
      location: crimeScene,
      description: `Evidence confirms method: ${solution.method}`,
      isSolutionFact: true,
    });

    // Add dependencies (evidence chain)
    graph.addDependency('crime_scene_body', 'victim_phone_records');
    graph.addDependency('crime_scene_body', 'victim_financial_records');
    graph.addDependency('victim_phone_records', 'weapon_found');
    graph.addDependency('crime_scene_observation', 'killer_fingerprints');
    graph.addDependency('weapon_found', 'solution_killer_identity');
    graph.addDependency('killer_fingerprints', 'solution_killer_identity');
    graph.addDependency('victim_financial_records', 'solution_motive');
    graph.addDependency('crime_scene_body', 'solution_method');

    // Step 5: Add supporting witness testimony
    const witnessLocation = this._selectRoomByType(district, 'apartment', rng);

    graph.addEvidence('witness_testimony', {
      type: EvidenceType.WITNESS_STATEMENT,
      location: witnessLocation,
      description: `Witness saw suspect near crime scene`,
      isSolutionFact: false,
    });

    graph.addDependency('witness_testimony', 'solution_killer_identity');

    return graph;
  }

  /**
   * Places evidence in appropriate rooms
   * @private
   * @param {EvidenceGraph} evidenceGraph - Evidence graph
   * @param {object} district - District data
   * @param {object} solution - Case solution
   * @param {SeededRandom} rng - Random number generator
   * @returns {Array<object>} Evidence placements
   */
  _placeEvidence(evidenceGraph, district, solution, rng) {
    const placements = [];

    for (const [evidenceId, evidence] of evidenceGraph.evidenceData.entries()) {
      // Get room bounds
      const room = this._findRoomById(district, evidence.location);
      if (!room) {
        console.warn(`Room not found for evidence ${evidenceId}: ${evidence.location}`);
        continue;
      }

      // Calculate position within room (avoid walls)
      const position = this._calculateEvidencePosition(room, rng);

      placements.push({
        evidenceId,
        roomId: evidence.location,
        position,
      });
    }

    return placements;
  }

  /**
   * Creates red herrings to increase difficulty
   * @private
   * @param {EvidenceGraph} evidenceGraph - Evidence graph to add red herrings to
   * @param {object} district - District data
   * @param {SeededRandom} rng - Random number generator
   * @param {number} count - Number of red herrings to add
   */
  _createRedHerrings(evidenceGraph, district, rng, count) {
    const falseSuspects = ['suspect_a', 'suspect_b', 'suspect_c', 'suspect_d'];

    for (let i = 0; i < count; i++) {
      const falseSuspect = falseSuspects[i % falseSuspects.length];
      const herringType = rng.choice([
        'false_witness',
        'misleading_evidence',
        'suspicious_behavior',
        'weak_alibi',
      ]);

      const location = this._selectRoomByType(district, rng.choice(['apartment', 'office', 'alley']), rng);

      if (herringType === 'false_witness') {
        evidenceGraph.addEvidence(`red_herring_${i}_witness`, {
          type: EvidenceType.WITNESS_STATEMENT,
          location,
          description: `Witness claims to have seen ${falseSuspect} acting suspiciously`,
          isSolutionFact: false,
        });
      } else if (herringType === 'misleading_evidence') {
        evidenceGraph.addEvidence(`red_herring_${i}_evidence`, {
          type: EvidenceType.FINGERPRINTS,
          location,
          description: `Item belonging to ${falseSuspect} found near scene`,
          isSolutionFact: false,
        });
      } else if (herringType === 'suspicious_behavior') {
        evidenceGraph.addEvidence(`red_herring_${i}_behavior`, {
          type: EvidenceType.WITNESS_STATEMENT,
          location,
          description: `${falseSuspect} has no alibi for murder time`,
          isSolutionFact: false,
        });
      } else {
        evidenceGraph.addEvidence(`red_herring_${i}_alibi`, {
          type: EvidenceType.ALIBI,
          location,
          description: `${falseSuspect}'s alibi has inconsistencies`,
          isSolutionFact: false,
        });
      }
    }
  }

  /**
   * Calculates metrics for the generated case
   * @private
   * @param {EvidenceGraph} evidenceGraph - Evidence graph
   * @param {object} difficulty - Difficulty configuration
   * @param {string[]} startingEvidence - Starting evidence IDs
   * @param {string[]} solutionFactIds - Solution fact IDs
   * @returns {object} Case metrics
   */
  _calculateMetrics(evidenceGraph, difficulty, startingEvidence, solutionFactIds) {
    const evidenceCount = evidenceGraph.getEvidenceCount();

    // Calculate chain length (longest path to solution)
    const pathResult = evidenceGraph.getSolutionPath(startingEvidence, solutionFactIds);
    const chainLength = pathResult ? pathResult.steps : 0;

    // Estimate solve time based on evidence count and chain length
    const baseSolveTime = 5; // minutes
    const evidenceTime = evidenceCount * 0.5;
    const chainTime = chainLength * 2;
    const estimatedSolveTime = Math.round(baseSolveTime + evidenceTime + chainTime);

    return {
      evidenceCount,
      redHerringCount: difficulty.redHerringCount,
      chainLength,
      estimatedSolveTime,
      difficultyRating: difficulty.clueDirectness,
    };
  }

  /**
   * Validates the case structure
   * @param {CaseData} caseData - Case to validate
   * @returns {{valid: boolean, issues: string[]}} Validation result
   */
  static validate(caseData) {
    const issues = [];

    // Check structure
    if (!caseData.solution) {
      issues.push('Missing solution');
    }
    if (!caseData.evidenceGraph) {
      issues.push('Missing evidence graph');
    }
    if (!caseData.npcs || caseData.npcs.length < 2) {
      issues.push('Need at least 2 NPCs');
    }

    // Check victim ≠ killer
    if (caseData.solution && caseData.solution.victimId === caseData.solution.killerId) {
      issues.push('Victim and killer cannot be the same');
    }

    // Check solvability
    if (caseData.evidenceGraph) {
      const startingEvidence = caseData.evidenceGraph.getStartingEvidence();
      const solvabilityResult = caseData.evidenceGraph.isSolvable(startingEvidence);

      if (!solvabilityResult.solvable) {
        issues.push('Case is not solvable');
      }
    }

    // Check evidence placement
    if (!caseData.evidencePlacements || caseData.evidencePlacements.length === 0) {
      issues.push('No evidence placements');
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  /**
   * Serializes case data
   * @param {CaseData} caseData - Case to serialize
   * @returns {object} Serialized case
   */
  static serialize(caseData) {
    return {
      id: caseData.id,
      difficulty: caseData.difficulty,
      solution: { ...caseData.solution },
      npcs: caseData.npcs.map(npc => ({ ...npc })),
      evidenceGraph: caseData.evidenceGraph.serialize(),
      evidencePlacements: caseData.evidencePlacements.map(p => ({ ...p })),
      metrics: { ...caseData.metrics },
    };
  }

  /**
   * Deserializes case data
   * @param {object} data - Serialized case
   * @returns {CaseData} Reconstructed case
   */
  static deserialize(data) {
    return {
      id: data.id,
      difficulty: data.difficulty,
      solution: { ...data.solution },
      npcs: data.npcs.map(npc => ({ ...npc })),
      evidenceGraph: EvidenceGraph.deserialize(data.evidenceGraph),
      evidencePlacements: data.evidencePlacements.map(p => ({ ...p })),
      metrics: { ...data.metrics },
    };
  }

  // Helper methods

  /**
   * Creates mock NPCs for testing
   * @private
   */
  _createMockNPCs(district, rng) {
    const names = ['John Doe', 'Jane Smith', 'Bob Johnson', 'Alice Williams', 'Charlie Brown'];
    return names.map((name, i) => ({
      id: `npc_${i}`,
      name,
      role: i === 0 ? 'victim' : i === 1 ? 'killer' : 'witness',
    }));
  }

  /**
   * Selects a crime scene room
   * @private
   */
  _selectCrimeScene(district, rng) {
    // Prefer crime_scene type, fall back to apartment
    const crimeScenes = district.rooms?.filter(r => r.roomType === 'crime_scene') || [];
    if (crimeScenes.length > 0) {
      return rng.choice(crimeScenes).id;
    }

    const apartments = district.rooms?.filter(r => r.roomType === 'apartment') || [];
    if (apartments.length > 0) {
      return rng.choice(apartments).id;
    }

    // Fallback to any room
    return district.rooms?.[0]?.id || 'crime_scene_1';
  }

  /**
   * Selects a room by type
   * @private
   */
  _selectRoomByType(district, roomType, rng) {
    const matching = district.rooms?.filter(r => r.roomType === roomType) || [];
    if (matching.length > 0) {
      return rng.choice(matching).id;
    }

    // Fallback
    return district.rooms?.[0]?.id || `${roomType}_1`;
  }

  /**
   * Finds room by ID
   * @private
   */
  _findRoomById(district, roomId) {
    return district.rooms?.find(r => r.id === roomId);
  }

  /**
   * Calculates evidence position within room
   * @private
   */
  _calculateEvidencePosition(room, rng) {
    // Place evidence in center of room (avoiding walls)
    const margin = 2;
    return {
      x: room.x + rng.nextInt(margin, Math.max(margin + 1, (room.width || 10) - margin)),
      y: room.y + rng.nextInt(margin, Math.max(margin + 1, (room.height || 10) - margin)),
    };
  }
}

/**
 * @typedef {object} CaseData
 * @property {string} id - Case identifier
 * @property {string} difficulty - Difficulty level
 * @property {object} solution - Solution (victim, killer, motive, method, timeline)
 * @property {Array<object>} npcs - All NPCs involved
 * @property {EvidenceGraph} evidenceGraph - Evidence dependency graph
 * @property {Array<object>} evidencePlacements - Evidence positions
 * @property {object} metrics - Case metrics (evidence count, chain length, solve time)
 */
