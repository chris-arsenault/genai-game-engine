/**
 * FactionManager
 *
 * Manages dual-axis reputation system (Fame/Infamy) with cascading changes.
 * Tracks player standing with all factions and provides attitude calculations.
 *
 * Fame: Positive standing (helping faction, completing quests, lawful actions)
 * Infamy: Antagonistic standing (hostile actions, crimes, betrayals)
 */

import { getFaction, getFactionAllies, getFactionEnemies, getFactionIds } from '../data/factions/index.js';

export class FactionManager {
  constructor(eventBus, options = {}) {
    this.eventBus = eventBus;
    this.events = eventBus; // Legacy alias maintained for compatibility

    // Reputation storage: { factionId: { fame: 0-100, infamy: 0-100 } }
    this.reputation = {};

    const storageOption = options.storage;
    const resolvedStorage =
      storageOption !== undefined
        ? storageOption
        : typeof globalThis !== 'undefined' && globalThis.localStorage
          ? globalThis.localStorage
          : null;

    this.storage = typeof resolvedStorage?.setItem === 'function' ? resolvedStorage : null;
    const defaultKey = 'faction_state';
    const keyCandidate = typeof options.storageKey === 'string' ? options.storageKey.trim() : '';
    this.storageKey = keyCandidate.length ? keyCandidate : defaultKey;

    // Configuration
    this.config = {
      cascadeMultiplier: 0.5, // Allies get 50% bonus, enemies get 50% penalty
      maxReputation: 100,
      minReputation: 0,
    };

    // Initialize all factions at their baseline reputation
    this.initializeReputation();

    this.recentMemberRemovals = [];
  }

  /**
   * Initialize reputation for all factions
   */
  initializeReputation() {
    const factionIds = getFactionIds();
    const min = this.config?.minReputation ?? 0;
    const max = this.config?.maxReputation ?? 100;

    for (const factionId of factionIds) {
      const faction = getFaction(factionId);
      const initial = faction?.initialReputation ?? {};
      const baseFame = Number.isFinite(initial.fame) ? initial.fame : 20;
      const baseInfamy = Number.isFinite(initial.infamy) ? initial.infamy : 20;

      this.reputation[factionId] = {
        fame: this.clamp(baseFame, min, max),
        infamy: this.clamp(baseInfamy, min, max),
      };
    }
  }

  /**
   * Modify reputation for a faction
   * @param {string} factionId
   * @param {number} deltaFame - Change in fame (-100 to +100)
   * @param {number} deltaInfamy - Change in infamy (-100 to +100)
   * @param {string} reason - Reason for change
   */
  modifyReputation(factionId, deltaFame, deltaInfamy, reason = 'Unknown') {
    const faction = getFaction(factionId);
    if (!faction) {
      console.warn(`[FactionManager] Unknown faction: ${factionId}`);
      return;
    }

    // Get current reputation
    const rep = this.reputation[factionId];
    if (!rep) {
      console.warn(`[FactionManager] No reputation data for faction: ${factionId}`);
      return;
    }

    // Store old attitude for comparison
    const oldAttitude = this.getFactionAttitude(factionId);

    // Apply changes with clamping
    rep.fame = this.clamp(rep.fame + deltaFame, this.config.minReputation, this.config.maxReputation);
    rep.infamy = this.clamp(rep.infamy + deltaInfamy, this.config.minReputation, this.config.maxReputation);

    // Emit reputation change event
    this.eventBus.emit('reputation:changed', {
      factionId,
      factionName: faction.name,
      deltaFame,
      deltaInfamy,
      newFame: rep.fame,
      newInfamy: rep.infamy,
      reason,
    });

    console.log(
      `[FactionManager] ${faction.name}: Fame ${rep.fame.toFixed(1)} (${deltaFame >= 0 ? '+' : ''}${deltaFame.toFixed(1)}), ` +
      `Infamy ${rep.infamy.toFixed(1)} (${deltaInfamy >= 0 ? '+' : ''}${deltaInfamy.toFixed(1)}) - ${reason}`
    );

    // Check if attitude changed
    const newAttitude = this.getFactionAttitude(factionId);
    if (oldAttitude !== newAttitude) {
      this.eventBus.emit('faction:attitude_changed', {
        factionId,
        factionName: faction.name,
        oldAttitude,
        newAttitude,
        sourceFactionName: null,
      });

      console.log(`[FactionManager] ${faction.name} attitude changed: ${oldAttitude} → ${newAttitude}`);
    }

    // Cascade to allies and enemies
    this.cascadeReputationChange(factionId, deltaFame, deltaInfamy, reason);
  }

  /**
   * Cascade reputation changes to allies and enemies
   * Allies get 50% bonus, enemies get 50% penalty
   * @param {string} sourceFactionId
   * @param {number} deltaFame
   * @param {number} deltaInfamy
   * @param {string} reason
   */
  cascadeReputationChange(sourceFactionId, deltaFame, deltaInfamy, reason) {
    const sourceFaction = getFaction(sourceFactionId);
    if (!sourceFaction) return;

    const multiplier = this.config.cascadeMultiplier;

    // Apply to allies (positive cascade)
    const allies = getFactionAllies(sourceFactionId);
    for (const allyId of allies) {
      const allyRep = this.reputation[allyId];
      if (!allyRep) continue;

      // Allies gain partial fame, lose partial infamy
      const cascadeFame = deltaFame * multiplier;
      const cascadeInfamy = -deltaInfamy * multiplier; // Inverse for allies

      if (cascadeFame !== 0 || cascadeInfamy !== 0) {
        const oldAttitude = this.getFactionAttitude(allyId);

        allyRep.fame = this.clamp(
          allyRep.fame + cascadeFame,
          this.config.minReputation,
          this.config.maxReputation
        );
        allyRep.infamy = this.clamp(
          allyRep.infamy + cascadeInfamy,
          this.config.minReputation,
          this.config.maxReputation
        );

        const allyFaction = getFaction(allyId);
        console.log(
          `[FactionManager] Cascade to ally ${allyFaction.name}: Fame ${cascadeFame >= 0 ? '+' : ''}${cascadeFame.toFixed(1)}, ` +
          `Infamy ${cascadeInfamy >= 0 ? '+' : ''}${cascadeInfamy.toFixed(1)}`
        );

        // Check attitude change
        const newAttitude = this.getFactionAttitude(allyId);
        if (oldAttitude !== newAttitude) {
          this.eventBus.emit('faction:attitude_changed', {
            factionId: allyId,
            factionName: allyFaction.name,
            oldAttitude,
            newAttitude,
            cascade: true,
            source: sourceFactionId,
            sourceFactionName: sourceFaction?.name ?? null,
          });
        }
      }
    }

    // Apply to enemies (negative cascade)
    const enemies = getFactionEnemies(sourceFactionId);
    for (const enemyId of enemies) {
      const enemyRep = this.reputation[enemyId];
      if (!enemyRep) continue;

      // Enemies lose partial fame, gain partial infamy
      const cascadeFame = -deltaFame * multiplier; // Inverse for enemies
      const cascadeInfamy = deltaInfamy * multiplier;

      if (cascadeFame !== 0 || cascadeInfamy !== 0) {
        const oldAttitude = this.getFactionAttitude(enemyId);

        enemyRep.fame = this.clamp(
          enemyRep.fame + cascadeFame,
          this.config.minReputation,
          this.config.maxReputation
        );
        enemyRep.infamy = this.clamp(
          enemyRep.infamy + cascadeInfamy,
          this.config.minReputation,
          this.config.maxReputation
        );

        const enemyFaction = getFaction(enemyId);
        console.log(
          `[FactionManager] Cascade to enemy ${enemyFaction.name}: Fame ${cascadeFame >= 0 ? '+' : ''}${cascadeFame.toFixed(1)}, ` +
          `Infamy ${cascadeInfamy >= 0 ? '+' : ''}${cascadeInfamy.toFixed(1)}`
        );

        // Check attitude change
        const newAttitude = this.getFactionAttitude(enemyId);
        if (oldAttitude !== newAttitude) {
          this.eventBus.emit('faction:attitude_changed', {
            factionId: enemyId,
            factionName: enemyFaction.name,
            oldAttitude,
            newAttitude,
            cascade: true,
            source: sourceFactionId,
            sourceFactionName: sourceFaction?.name ?? null,
          });
        }
      }
    }
  }

  /**
   * Get faction attitude based on reputation thresholds
   * @param {string} factionId
   * @returns {string} 'hostile' | 'unfriendly' | 'neutral' | 'friendly' | 'allied'
   */
  getFactionAttitude(factionId) {
    const faction = getFaction(factionId);
    if (!faction) return 'neutral';

    const rep = this.reputation[factionId];
    if (!rep) return 'neutral';

    const thresholds = faction.reputationThresholds;

    // Check thresholds in order (most restrictive first)
    if (rep.fame >= thresholds.allied.fame && rep.infamy <= thresholds.allied.infamy) {
      return 'allied';
    }
    if (rep.fame >= thresholds.friendly.fame && rep.infamy <= thresholds.friendly.infamy) {
      return 'friendly';
    }
    if (rep.fame >= thresholds.neutral.fame && rep.infamy <= thresholds.neutral.infamy) {
      return 'neutral';
    }
    if (rep.fame >= thresholds.unfriendly.fame && rep.infamy <= thresholds.unfriendly.infamy) {
      return 'unfriendly';
    }

    return 'hostile';
  }

  /**
   * Check if player can perform action with faction
   * @param {string} factionId
   * @param {string} actionType - 'enter_territory', 'access_services', 'trade', etc.
   * @returns {boolean}
   */
  canPerformAction(factionId, actionType) {
    const attitude = this.getFactionAttitude(factionId);

    // Define action requirements
    const requirements = {
      enter_territory: ['neutral', 'friendly', 'allied'],
      access_services: ['friendly', 'allied'],
      trade: ['friendly', 'allied'],
      access_classified: ['allied'],
      request_assistance: ['friendly', 'allied'],
    };

    const allowedAttitudes = requirements[actionType] || ['allied'];
    return allowedAttitudes.includes(attitude);
  }

  /**
   * Get all faction standings
   * @returns {Object} Map of faction IDs to reputation and attitude
   */
  getAllStandings() {
    const standings = {};

    for (const factionId of getFactionIds()) {
      const faction = getFaction(factionId);
      const rep = this.reputation[factionId];

      standings[factionId] = {
        name: faction.name,
        fame: rep.fame,
        infamy: rep.infamy,
        attitude: this.getFactionAttitude(factionId),
      };
    }

    return standings;
  }

  /**
   * Get reputation for a faction
   * @param {string} factionId
   * @returns {Object|null} { fame, infamy }
   */
  getReputation(factionId) {
    return this.reputation[factionId] || null;
  }

  /**
   * Serialize faction state for persistence consumers.
   * @returns {{version:number,timestamp:number,reputation:Object, recentMemberRemovals:Array}}
   */
  serialize() {
    return {
      version: 1,
      timestamp: Date.now(),
      reputation: this.#cloneReputation(),
      recentMemberRemovals: this.getRecentMemberRemovals(),
    };
  }

  /**
   * Restore faction state from a serialized snapshot.
   * @param {object} snapshot
   * @returns {boolean}
   */
  deserialize(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') {
      return false;
    }

    const version = snapshot.version ?? 1;
    if (version !== 1) {
      console.warn('[FactionManager] Incompatible save version');
      return false;
    }

    const incomingReputation = snapshot.reputation;
    if (!incomingReputation || typeof incomingReputation !== 'object') {
      console.warn('[FactionManager] Invalid reputation snapshot');
      return false;
    }

    const factionIds = new Set(getFactionIds());
    const min = this.config?.minReputation ?? 0;
    const max = this.config?.maxReputation ?? 100;
    const restored = {};

    for (const [factionId, rep] of Object.entries(incomingReputation)) {
      const fameValue = this.#coerceNumber(rep?.fame);
      const infamyValue = this.#coerceNumber(rep?.infamy);
      restored[factionId] = {
        fame: this.clamp(Number.isFinite(fameValue) ? fameValue : min, min, max),
        infamy: this.clamp(Number.isFinite(infamyValue) ? infamyValue : min, min, max),
      };
      factionIds.delete(factionId);
    }

    for (const factionId of factionIds) {
      const existing = this.reputation[factionId];
      restored[factionId] = {
        fame: existing?.fame ?? min,
        infamy: existing?.infamy ?? min,
      };
    }

    this.reputation = restored;
    this.recentMemberRemovals = this.#sanitizeRemovalHistory(snapshot.recentMemberRemovals);
    return true;
  }

  /**
   * Save faction state to localStorage
   * @returns {string} Serialized state
   */
  saveState() {
    const serialized = JSON.stringify(this.serialize());
    if (this.storage) {
      this.storage.setItem(this.storageKey, serialized);
    }
    return serialized;
  }

  /**
   * Load faction state from localStorage
   * @returns {boolean} Success
   */
  loadState() {
    if (!this.storage || typeof this.storage.getItem !== 'function') {
      return false;
    }

    const serialized = this.storage.getItem(this.storageKey);
    if (!serialized) return false;

    try {
      const state = JSON.parse(serialized);

      if (!this.deserialize(state)) {
        return false;
      }

      console.log('[FactionManager] State loaded from localStorage');
      return true;
    } catch (error) {
      console.error('[FactionManager] Failed to load state:', error);
      return false;
    }
  }

  /**
   * Reset all reputation to neutral
   */
  resetReputation() {
    this.initializeReputation();
    if (this.storage && typeof this.storage.removeItem === 'function') {
      this.storage.removeItem(this.storageKey);
    }
    console.log('[FactionManager] Reputation reset to neutral');

    this.eventBus.emit('faction:reputation_reset', {});
    this.recentMemberRemovals = [];
  }

  /**
   * Handles an entity destruction notification to keep faction state in sync.
   * @param {number} entityId
   * @param {object|null} metadata
   * @param {Map<string,*>|object|null} componentSnapshot
   * @returns {object|null} Removal summary payload
   */
  handleEntityDestroyed(entityId, metadata = null, componentSnapshot = null) {
    const removal = this.#resolveRemovalSummary(entityId, metadata, componentSnapshot);
    if (!removal) {
      return null;
    }

    this.recentMemberRemovals.push(removal);
    if (this.recentMemberRemovals.length > 10) {
      this.recentMemberRemovals.splice(0, this.recentMemberRemovals.length - 10);
    }

    this.eventBus.emit('faction:member_removed', removal);
    return removal;
  }

  getRecentMemberRemovals() {
    return this.recentMemberRemovals.map((entry) => ({ ...entry }));
  }

  #cloneReputation() {
    const clone = {};
    for (const [factionId, rep] of Object.entries(this.reputation)) {
      clone[factionId] = {
        fame: rep?.fame ?? 0,
        infamy: rep?.infamy ?? 0,
      };
    }
    return clone;
  }

  #sanitizeRemovalHistory(history) {
    if (!Array.isArray(history) || history.length === 0) {
      return [];
    }

    const normalized = [];
    for (const entry of history) {
      const clone = this.#cloneRemovalEntry(entry);
      if (clone) {
        normalized.push(clone);
      }
    }

    if (normalized.length > 10) {
      return normalized.slice(normalized.length - 10);
    }

    return normalized;
  }

  #cloneRemovalEntry(entry) {
    if (!entry || typeof entry !== 'object') {
      return null;
    }

    return {
      factionId: entry.factionId ?? null,
      factionName: entry.factionName ?? null,
      entityId: entry.entityId ?? null,
      npcId: entry.npcId ?? null,
      tag: entry.tag ?? null,
      removedAt: entry.removedAt ?? null,
    };
  }

  #coerceNumber(value) {
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'string' && value.trim().length) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : NaN;
    }
    return NaN;
  }

  #resolveRemovalSummary(entityId, metadata, snapshot) {
    let factionId = null;
    let factionName = null;
    let npcId = null;

    if (snapshot instanceof Map) {
      const factionMember = snapshot.get('FactionMember');
      const npcComponent = snapshot.get('NPC');
      factionId = factionMember?.primaryFaction ?? npcComponent?.faction ?? null;
      npcId = npcComponent?.npcId ?? null;
    } else if (snapshot && typeof snapshot === 'object') {
      const narrative = snapshot.narrative || snapshot;
      factionId = narrative?.factionId ?? null;
      npcId = narrative?.npcId ?? null;
    }

    if (!factionId) {
      return null;
    }

    const faction = getFaction(factionId);
    factionName = faction?.name ?? null;

    return {
      factionId,
      factionName,
      entityId,
      npcId,
      tag: metadata?.tag ?? null,
      removedAt: Date.now(),
    };
  }

  /**
   * Clamp value between min and max
   * @param {number} value
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
}
