/**
 * Faction Registry
 *
 * Central export for all faction data.
 * Maps faction IDs to faction objects.
 */

import { vanguardPrime } from './vanguardPrime.js';
import { luminariSyndicate } from './luminariSyndicate.js';
import { cipherCollective } from './cipherCollective.js';
import { wraithNetwork } from './wraithNetwork.js';
import { memoryKeepers } from './memoryKeepers.js';

// All playable factions
export const factions = {
  vanguard_prime: vanguardPrime,
  luminari_syndicate: luminariSyndicate,
  cipher_collective: cipherCollective,
  wraith_network: wraithNetwork,
  memory_keepers: memoryKeepers,
};

// Helper functions
export function getFaction(factionId) {
  return factions[factionId] || null;
}

export function getAllFactions() {
  return Object.values(factions);
}

export function getFactionIds() {
  return Object.keys(factions);
}

// Faction relationship queries
export function areFactionsAllied(factionId1, factionId2) {
  const faction = getFaction(factionId1);
  return faction?.allies.includes(factionId2) || false;
}

export function areFactionsEnemies(factionId1, factionId2) {
  const faction = getFaction(factionId1);
  return faction?.enemies.includes(factionId2) || false;
}

export function getFactionAllies(factionId) {
  const faction = getFaction(factionId);
  return faction?.allies || [];
}

export function getFactionEnemies(factionId) {
  const faction = getFaction(factionId);
  return faction?.enemies || [];
}

// Export individual factions as well
export { vanguardPrime, luminariSyndicate, cipherCollective, wraithNetwork, memoryKeepers };
