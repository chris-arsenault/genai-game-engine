/**
 * ClueData Component
 *
 * Derived clue from evidence analysis.
 * Used for deduction board connections and theory building.
 *
 * @property {string} id - Unique clue identifier
 * @property {string} title - Clue title
 * @property {string} description - Detailed description
 * @property {Array<string>} derivedFrom - Source evidence IDs
 * @property {string} category - Clue category (suspect_identity, motive, method, etc)
 * @property {number} confidence - Certainty level (0.0 to 1.0)
 * @property {Array<Object>} connections - Connections to other clues
 * @property {string} connections[].targetClue - Target clue ID
 * @property {string} connections[].type - Connection type (supports, contradicts, implies)
 * @property {boolean} connections[].validated - Whether connection has been verified
 */
export class ClueData {
  constructor({
    id = '',
    title = 'Clue',
    description = 'A clue derived from evidence',
    derivedFrom = [],
    category = 'general',
    confidence = 0.5,
    connections = []
  } = {}) {
    this.id = id;
    this.title = title;
    this.description = description;
    this.derivedFrom = derivedFrom;
    this.category = category;
    this.confidence = confidence;
    this.connections = connections;
  }

  /**
   * Add connection to another clue
   * @param {string} targetClueId - Target clue ID
   * @param {string} type - Connection type
   */
  addConnection(targetClueId, type = 'supports') {
    if (!this.connections.find(c => c.targetClue === targetClueId)) {
      this.connections.push({
        targetClue: targetClueId,
        type,
        validated: false
      });
    }
  }

  /**
   * Validate a connection
   * @param {string} targetClueId - Target clue ID
   */
  validateConnection(targetClueId) {
    const conn = this.connections.find(c => c.targetClue === targetClueId);
    if (conn) {
      conn.validated = true;
    }
  }

  /**
   * Get all validated connections
   * @returns {Array<Object>}
   */
  getValidatedConnections() {
    return this.connections.filter(c => c.validated);
  }
}
