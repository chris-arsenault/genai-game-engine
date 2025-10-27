/**
 * ForensicEvidence Component
 *
 * Extends Evidence component with forensic analysis capabilities.
 * Allows evidence to be examined with specialized tools to reveal hidden clues.
 *
 * @property {string} forensicType - Type of forensic analysis needed
 *   ('fingerprint', 'document', 'memory_trace')
 * @property {boolean} requiresAnalysis - Whether this evidence needs forensic examination
 * @property {boolean} analyzed - Whether forensic analysis has been completed
 * @property {string|null} requiredTool - Tool needed for analysis (e.g., 'fingerprint_kit')
 * @property {number} difficulty - Analysis difficulty level (1-3)
 * @property {Array<string>} hiddenClues - Clues revealed only after forensic analysis
 * @property {number} analysisTime - Time required for analysis (milliseconds)
 */
export class ForensicEvidence {
  constructor({
    forensicType = 'fingerprint',
    requiresAnalysis = true,
    analyzed = false,
    requiredTool = null,
    difficulty = 1,
    hiddenClues = [],
    analysisTime = 2000
  } = {}) {
    this.forensicType = forensicType;
    this.requiresAnalysis = requiresAnalysis;
    this.analyzed = analyzed;
    this.requiredTool = requiredTool;
    this.difficulty = difficulty;
    this.hiddenClues = hiddenClues;
    this.analysisTime = analysisTime;
  }

  /**
   * Check if player can analyze this evidence
   * @param {Set<string>} playerTools - Player's available forensic tools
   * @param {Set<string>} playerKnowledge - Player's knowledge for skill checks
   * @returns {boolean}
   */
  canAnalyze(playerTools, playerKnowledge) {
    if (this.analyzed) return false;
    if (!this.requiresAnalysis) return false;

    // Check if player has required tool
    if (this.requiredTool && !playerTools.has(this.requiredTool)) {
      return false;
    }

    // Check if player has minimum forensic skill for difficulty
    const requiredSkill = `forensic_skill_${this.difficulty}`;
    if (!playerKnowledge.has(requiredSkill)) {
      return false;
    }

    return true;
  }

  /**
   * Mark evidence as analyzed
   * @returns {Array<string>} Hidden clues revealed by analysis
   */
  analyze() {
    if (this.analyzed) return [];

    this.analyzed = true;
    return [...this.hiddenClues];
  }

  /**
   * Get analysis requirements
   * @returns {Object} Requirements for analysis
   */
  getRequirements() {
    return {
      tool: this.requiredTool,
      difficulty: this.difficulty,
      requiredSkill: `forensic_skill_${this.difficulty}`,
      analysisTime: this.analysisTime
    };
  }

  /**
   * Get analysis status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      forensicType: this.forensicType,
      requiresAnalysis: this.requiresAnalysis,
      analyzed: this.analyzed,
      hiddenCluesCount: this.hiddenClues.length
    };
  }
}
