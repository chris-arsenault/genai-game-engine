/**
 * NPC Component
 *
 * NPC-specific data including memory, recognition, and witnessed events.
 * Tracks player interactions and remembers crimes/actions within the district.
 *
 * @property {string} npcId - Unique NPC identifier
 * @property {string} name - Display name
 * @property {string} faction - Primary faction affiliation
 * @property {boolean} knownPlayer - Has met/seen the player before
 * @property {number|null} lastInteraction - Timestamp of last player interaction
 * @property {Array<Object>} witnessedCrimes - List of crimes witnessed
 * @property {string} attitude - Current attitude towards player (friendly/neutral/hostile)
 * @property {Object} dialogue - Dialogue tree configuration
 * @property {Object} memory - Long-term memory storage
 */
export class NPC {
  constructor({
    npcId = `npc_${Date.now()}`,
    name = 'NPC',
    faction = 'civilian',
    knownPlayer = false,
    lastInteraction = null,
    witnessedCrimes = [],
    attitude = 'neutral',
    dialogue = {},
    memory = {}
  } = {}) {
    this.npcId = npcId;
    this.name = name;
    this.faction = faction;
    this.knownPlayer = knownPlayer;
    this.lastInteraction = lastInteraction;
    this.witnessedCrimes = [...witnessedCrimes];
    this.attitude = attitude;
    this.dialogue = dialogue;
    this.memory = { ...memory };
  }

  /**
   * Mark player as known (met/seen before)
   */
  recognizePlayer() {
    if (!this.knownPlayer) {
      this.knownPlayer = true;
      this.lastInteraction = Date.now();
      console.log(`[NPC] ${this.name} now recognizes the player`);
    }
  }

  /**
   * Update last interaction timestamp
   */
  updateInteraction() {
    this.lastInteraction = Date.now();
  }

  /**
   * Witness a crime committed by the player
   * @param {Object} crime - Crime details
   * @param {string} crime.type - Crime type (theft, assault, trespass, etc.)
   * @param {string} crime.location - Where crime occurred
   * @param {number} crime.severity - Severity level (1-5)
   * @param {number} crime.timestamp - When crime occurred
   */
  witnessCrime(crime) {
    this.witnessedCrimes.push({
      type: crime.type,
      location: crime.location,
      severity: crime.severity || 1,
      timestamp: crime.timestamp || Date.now(),
      reported: false
    });

    // Crimes increase hostility
    if (this.attitude === 'friendly') {
      this.attitude = 'neutral';
    } else if (this.attitude === 'neutral') {
      this.attitude = 'hostile';
    }

    console.log(`[NPC] ${this.name} witnessed crime: ${crime.type} (attitude: ${this.attitude})`);
  }

  /**
   * Report witnessed crimes to faction
   * @returns {Array<Object>} Unreported crimes
   */
  reportCrimes() {
    const unreportedCrimes = this.witnessedCrimes.filter(c => !c.reported);

    // Mark all crimes as reported
    this.witnessedCrimes.forEach(c => {
      c.reported = true;
    });

    if (unreportedCrimes.length > 0) {
      console.log(`[NPC] ${this.name} reported ${unreportedCrimes.length} crimes to ${this.faction}`);
    }

    return unreportedCrimes;
  }

  /**
   * Get total severity of unreported crimes
   * @returns {number}
   */
  getUnreportedSeverity() {
    return this.witnessedCrimes
      .filter(c => !c.reported)
      .reduce((sum, c) => sum + c.severity, 0);
  }

  /**
   * Set attitude towards player
   * @param {string} newAttitude - 'friendly', 'neutral', 'hostile'
   */
  setAttitude(newAttitude) {
    if (['friendly', 'neutral', 'hostile'].includes(newAttitude)) {
      this.attitude = newAttitude;
    }
  }

  /**
   * Store memory about player or event
   * @param {string} key - Memory key (e.g., 'helped_with_case_001')
   * @param {*} value - Memory value
   */
  rememberEvent(key, value) {
    this.memory[key] = value;
  }

  /**
   * Retrieve memory
   * @param {string} key - Memory key
   * @returns {*} Memory value or null
   */
  recallMemory(key) {
    return this.memory[key] || null;
  }

  /**
   * Check if NPC remembers an event
   * @param {string} key - Memory key
   * @returns {boolean}
   */
  hasMemory(key) {
    return key in this.memory;
  }

  /**
   * Get dialogue variant based on current attitude and memory
   * @returns {string} Dialogue ID variant
   */
  getDialogueVariant() {
    // Use attitude to select dialogue variant
    if (this.dialogue[this.attitude]) {
      return this.dialogue[this.attitude];
    }

    // Fallback to default
    return this.dialogue.default || 'default_dialogue';
  }

  /**
   * Get how long ago the player was last seen (in milliseconds)
   * @returns {number|null} Milliseconds since last interaction, or null if never met
   */
  getTimeSinceLastInteraction() {
    if (this.lastInteraction === null) return null;
    return Date.now() - this.lastInteraction;
  }

  /**
   * Check if NPC should forget about the player (after long time)
   * @param {number} forgetThreshold - Time in milliseconds after which memory fades
   * @returns {boolean}
   */
  shouldForgetPlayer(forgetThreshold = 24 * 60 * 60 * 1000) {
    const timeSince = this.getTimeSinceLastInteraction();
    if (timeSince === null) return false;
    return timeSince > forgetThreshold;
  }

  /**
   * Serialize for saving
   * @returns {Object}
   */
  toJSON() {
    return {
      npcId: this.npcId,
      name: this.name,
      faction: this.faction,
      knownPlayer: this.knownPlayer,
      lastInteraction: this.lastInteraction,
      witnessedCrimes: this.witnessedCrimes,
      attitude: this.attitude,
      dialogue: this.dialogue,
      memory: this.memory
    };
  }

  /**
   * Deserialize from saved data
   * @param {Object} data - Saved NPC data
   * @returns {NPC}
   */
  static fromJSON(data) {
    return new NPC(data);
  }
}
