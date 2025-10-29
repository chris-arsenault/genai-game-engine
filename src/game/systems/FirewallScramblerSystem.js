/**
 * FirewallScramblerSystem
 *
 * Bridges the Cipher scrambler gadget into gameplay by managing activation,
 * charge consumption, and stealth modifiers when Memory Parlor firewalls are
 * encountered. Listens for knowledge and inventory events so narrative beats
 * remain synchronized with mechanical access.
 */

import { System } from '../../engine/ecs/System.js';
import { GameConfig } from '../config/GameConfig.js';

const DEFAULT_CONFIG = Object.freeze({
  knowledgeId: 'cipher_scrambler_access',
  itemId: 'gadget_cipher_scrambler_charge',
  activationAreaId: 'memory_parlor_interior',
  firewallAreaId: 'memory_parlor_firewall',
  durationSeconds: 30,
  detectionMultiplier: 0.35,
  suspicionDecayBonusPerSecond: 12,
  cooldownSeconds: 5,
});

function clampNumber(value, min, max) {
  if (!Number.isFinite(value)) {
    return min;
  }
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

export class FirewallScramblerSystem extends System {
  constructor(componentRegistry, eventBus, storyFlagManager = null) {
    super(componentRegistry, eventBus);

    this.events = this.eventBus; // Legacy alias maintained for compatibility
    this.storyFlags = storyFlagManager;
    this.priority = 21;

    this.config = {
      ...DEFAULT_CONFIG,
      ...(GameConfig?.stealth?.firewallScrambler || {}),
    };

    this.state = {
      hasAccess: false,
      charges: 0,
      active: false,
      timer: 0,
      cooldown: 0,
      lastActivationSource: null,
    };

    this._subscriptions = [];

    this.handleKnowledgeLearned = this.handleKnowledgeLearned.bind(this);
    this.handleInventoryAdded = this.handleInventoryAdded.bind(this);
    this.handleInventoryUpdated = this.handleInventoryUpdated.bind(this);
    this.handleInventoryRemoved = this.handleInventoryRemoved.bind(this);
    this.handleAreaEntered = this.handleAreaEntered.bind(this);
    this.handleManualActivation = this.handleManualActivation.bind(this);
  }

  init() {
    this._subscriptions.push(
      this.eventBus.on('knowledge:learned', this.handleKnowledgeLearned)
    );
    this._subscriptions.push(
      this.eventBus.on('inventory:item_added', this.handleInventoryAdded)
    );
    this._subscriptions.push(
      this.eventBus.on('inventory:item_updated', this.handleInventoryUpdated)
    );
    this._subscriptions.push(
      this.eventBus.on('inventory:item_removed', this.handleInventoryRemoved)
    );
    this._subscriptions.push(
      this.eventBus.on('area:entered', this.handleAreaEntered, null, 20)
    );
    this._subscriptions.push(
      this.eventBus.on('firewall:scrambler:activate', this.handleManualActivation)
    );
    this._subscriptions.push(
      this.eventBus.on('objective:blocked', (payload = {}) => {
        if (
          payload.requirement === this.config.knowledgeId ||
          payload.requirement === 'cipher_scrambler_active'
        ) {
          this.eventBus.emit('firewall:scrambler_unavailable', {
            areaId: payload.eventData?.areaId || null,
            reason: payload.reason || 'scrambler_blocked',
            chargesRemaining: this.state.charges,
          });
        }
      })
    );

    // If story flags already exist (e.g., from a save), prime access state
    if (this.storyFlags && this.storyFlags.hasFlag?.(this.config.knowledgeId)) {
      this.state.hasAccess = true;
    }
  }

  update(deltaTime) {
    if (this.state.active) {
      this.state.timer = Math.max(0, this.state.timer - deltaTime);

      if (this.state.timer === 0) {
        this.deactivateScrambler('expired');
      }
    }

    if (this.state.cooldown > 0) {
      this.state.cooldown = Math.max(0, this.state.cooldown - deltaTime);
    }
  }

  cleanup() {
    for (const unsubscribe of this._subscriptions) {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    }
    this._subscriptions = [];
  }

  handleKnowledgeLearned(payload = {}) {
    if (payload.knowledgeId !== this.config.knowledgeId) {
      return;
    }

    if (!this.state.hasAccess) {
      this.state.hasAccess = true;
    }

    if (this.storyFlags && typeof this.storyFlags.setFlag === 'function') {
      this.storyFlags.setFlag(this.config.knowledgeId, true, {
        source: payload.source || 'knowledge:learned',
        triggeredAt: Date.now(),
      });
    }
  }

  handleInventoryAdded(payload = {}) {
    if (payload.id !== this.config.itemId) {
      return;
    }

    const quantity = this.resolveQuantityFromPayload(payload, this.state.charges);
    this.updateChargeCount(quantity, 'inventory:item_added');

    if (!this.state.hasAccess) {
      this.state.hasAccess = true;
    }
  }

  handleInventoryUpdated(payload = {}) {
    if (payload.id !== this.config.itemId) {
      return;
    }

    const quantity = this.resolveQuantityFromPayload(payload, this.state.charges);
    this.updateChargeCount(quantity, 'inventory:item_updated');
  }

  handleInventoryRemoved(payload = {}) {
    if (payload.id !== this.config.itemId) {
      return;
    }

    this.updateChargeCount(0, 'inventory:item_removed');
  }

  handleAreaEntered(payload = {}) {
    const { areaId } = payload;
    if (!areaId) {
      return;
    }

    if (
      areaId === this.config.activationAreaId ||
      areaId === this.config.firewallAreaId
    ) {
      this.tryActivateScrambler({
        source: areaId,
        areaId,
      });
    }
  }

  handleManualActivation(payload = {}) {
    const payloadAreaId = payload.areaId || payload?.data?.areaId || null;
    this.tryActivateScrambler({
      source: payload.source || 'manual',
      areaId: payloadAreaId,
      allowWithoutArea: true,
      force: Boolean(payload.force),
    });
  }

  tryActivateScrambler(options = {}) {
    const { areaId = null, source = 'unknown', force = false, allowWithoutArea = false } = options;

    if (!this.state.hasAccess && !force) {
      this.eventBus.emit('firewall:scrambler_unavailable', {
        areaId,
        reason: 'no_access',
        chargesRemaining: this.state.charges,
      });
      return false;
    }

    if (this.state.active) {
      this.eventBus.emit('firewall:scrambler_active', {
        areaId,
        remainingSeconds: this.state.timer,
        chargesRemaining: this.state.charges,
      });
      return true;
    }

    if (this.state.cooldown > 0 && !force) {
      this.eventBus.emit('firewall:scrambler_on_cooldown', {
        areaId,
        cooldownSeconds: this.state.cooldown,
      });
      return false;
    }

    if (this.state.charges <= 0 && !force) {
      this.eventBus.emit('firewall:scrambler_unavailable', {
        areaId,
        reason: 'no_charges',
        chargesRemaining: this.state.charges,
      });
      return false;
    }

    if (!areaId && !allowWithoutArea) {
      return false;
    }

    return this.activateScrambler({
      source,
      areaId,
      force,
    });
  }

  activateScrambler({ source, areaId = null, force = false }) {
    const durationSeconds = clampNumber(
      this.config.durationSeconds,
      1,
      Number.MAX_SAFE_INTEGER
    );

    this.state.active = true;
    this.state.timer = durationSeconds;
    this.state.lastActivationSource = source;

    // Consume one charge unless forced activation is requested
    if (!force) {
      this.consumeCharge(areaId || source || 'activation');
    }

    const expiresAt = Date.now() + durationSeconds * 1000;

    if (this.storyFlags && typeof this.storyFlags.setFlag === 'function') {
      this.storyFlags.setFlag('cipher_scrambler_active', true, {
        source,
        areaId,
        expiresAt,
      });
      this.storyFlags.setFlag('cipher_scrambler_last_used', expiresAt, {
        source,
        areaId,
      });
    }

    this.eventBus.emit('firewall:scrambler_activated', {
      source,
      areaId,
      durationSeconds,
      expiresAt,
      detectionMultiplier: clampNumber(this.config.detectionMultiplier, 0, 1),
      suspicionDecayBonusPerSecond: Math.max(
        0,
        Number(this.config.suspicionDecayBonusPerSecond) || 0
      ),
      chargesRemaining: this.state.charges,
    });

    return true;
  }

  deactivateScrambler(reason = 'expired') {
    if (!this.state.active) {
      return;
    }

    this.state.active = false;
    this.state.timer = 0;
    this.state.cooldown = Math.max(
      this.state.cooldown,
      Math.max(0, Number(this.config.cooldownSeconds) || 0)
    );

    if (this.storyFlags && typeof this.storyFlags.setFlag === 'function') {
      this.storyFlags.setFlag('cipher_scrambler_active', false, {
        reason,
        timestamp: Date.now(),
      });
    }

    this.eventBus.emit('firewall:scrambler_expired', {
      reason,
      source: this.state.lastActivationSource,
      cooldownSeconds: this.state.cooldown,
    });
  }

  consumeCharge(source = 'activation') {
    if (this.state.charges <= 0) {
      return;
    }

    this.eventBus.emit('inventory:item_updated', {
      id: this.config.itemId,
      quantityDelta: -1,
      metadata: {
        source: 'firewall_scrambler_system',
        consumedBy: source,
        consumedAt: Date.now(),
      },
    });
  }

  updateChargeCount(nextCount, eventSource) {
    const normalized = Math.max(0, Math.trunc(Number(nextCount) || 0));
    this.state.charges = normalized;

    if (this.storyFlags && typeof this.storyFlags.setFlag === 'function') {
      this.storyFlags.setFlag('cipher_scrambler_stock', normalized, {
        source: eventSource,
        timestamp: Date.now(),
      });
    }
  }

  resolveQuantityFromPayload(payload = {}, fallback = 0) {
    if (Number.isFinite(payload.quantity)) {
      return Math.max(0, Math.trunc(payload.quantity));
    }

    if (Number.isFinite(payload.quantityDelta) && payload.quantityDelta !== 0) {
      return Math.max(0, Math.trunc(fallback + payload.quantityDelta));
    }

    return Math.max(0, Math.trunc(fallback));
  }
}

export default FirewallScramblerSystem;
