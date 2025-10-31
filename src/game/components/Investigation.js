/**
 * Investigation Component
 *
 * Stores player investigation capabilities such as evidence detection radius,
 * unlocked abilities, and collected evidence metadata for case files.
 */

import { GameConfig } from '../config/GameConfig.js';

export class Investigation {
  constructor({
    observationRadius = GameConfig.player.observationRadius,
    abilityLevel = 1,
    abilities = ['basic_observation'],
    caseFiles = {}
  } = {}) {
    this.observationRadius = observationRadius;
    this.abilityLevel = abilityLevel;
    this.abilities = new Set(abilities);
    this.caseFiles = new Map();

    // Restore any serialized case file data
    Object.entries(caseFiles).forEach(([caseId, entries]) => {
      this.caseFiles.set(
        caseId,
        Array.isArray(entries) ? entries.map((entry) => ({ ...entry })) : []
      );
    });
  }

  /**
   * Get effective detection radius for evidence scanning.
   * @returns {number}
   */
  getDetectionRadius() {
    return this.observationRadius;
  }

  /**
   * Update detection radius (clamped to non-negative values).
   * @param {number} radius
   */
  setDetectionRadius(radius) {
    if (Number.isFinite(radius) && radius >= 0) {
      this.observationRadius = radius;
    }
  }

  /**
   * Increase ability level by one (capped to at least 1).
   */
  increaseAbilityLevel() {
    this.abilityLevel = Math.max(1, this.abilityLevel + 1);
  }

  /**
   * Unlock a new investigation ability.
   * @param {string} abilityId
   */
  addAbility(abilityId) {
    if (typeof abilityId === 'string' && abilityId.length > 0) {
      this.abilities.add(abilityId);
    }
  }

  /**
   * Check if ability is unlocked.
   * @param {string} abilityId
   * @returns {boolean}
   */
  hasAbility(abilityId) {
    return this.abilities.has(abilityId);
  }

  /**
   * Return unlocked abilities as an array.
   * @returns {string[]}
   */
  getAbilities() {
    return Array.from(this.abilities);
  }

  /**
   * Record evidence collection into case files.
   * @param {Object} params
   * @param {string} params.caseId
   * @param {string} params.evidenceId
   * @param {string} params.type
   * @param {string} params.category
   */
  recordEvidence({ caseId, evidenceId, type, category }) {
    if (!caseId || !evidenceId) {
      return;
    }

    const entry = {
      evidenceId,
      type,
      category,
      collectedAt: Date.now()
    };

    if (!this.caseFiles.has(caseId)) {
      this.caseFiles.set(caseId, []);
    }

    this.caseFiles.get(caseId).push(entry);
  }

  /**
   * Retrieve logged evidence for a case.
   * @param {string} caseId
   * @returns {Array<Object>}
   */
  getCaseEvidence(caseId) {
    return this.caseFiles.get(caseId) ?? [];
  }
}
