/**
 * PlayerEntity Factory
 *
 * Creates the player detective entity with all required components.
 * Tags entity as 'player' for easy querying.
 */

import { Transform } from '../components/Transform.js';
import { Sprite } from '../components/Sprite.js';
import { PlayerController } from '../components/PlayerController.js';
import { Collider } from '../components/Collider.js';
import { FactionMember } from '../components/FactionMember.js';
import { Disguise } from '../components/Disguise.js';
import { GameConfig } from '../config/GameConfig.js';

/**
 * Create player entity
 * @param {Object} entityManager - Entity manager instance
 * @param {Object} componentRegistry - Component registry instance
 * @param {number} x - Spawn X position
 * @param {number} y - Spawn Y position
 * @returns {string} Entity ID
 */
export function createPlayerEntity(entityManager, componentRegistry, x = 0, y = 0) {
  // Create entity
  const entityId = entityManager.createEntity();
  entityManager.tagEntity(entityId, 'player');

  // Add Transform component
  const transform = new Transform(x, y, 0, 1, 1);
  componentRegistry.addComponent(entityId, 'Transform', transform);

  // Add Sprite component (placeholder visual)
  const sprite = new Sprite({
    image: null, // Will be replaced with actual player sprite
    width: 32,
    height: 48,
    layer: 'entities',
    zIndex: 10,
    color: '#00CCFF', // Detective blue placeholder
    visible: true
  });
  componentRegistry.addComponent(entityId, 'Sprite', sprite);

  // Add PlayerController component
  const controller = new PlayerController({
    moveSpeed: GameConfig.player.moveSpeed,
    acceleration: GameConfig.player.acceleration,
    friction: GameConfig.player.friction
  });
  componentRegistry.addComponent(entityId, 'PlayerController', controller);

  // Add Collider component
  const collider = new Collider({
    type: 'AABB',
    width: 28,
    height: 40,
    offsetX: 0,
    offsetY: 4, // Offset down slightly for feet
    isTrigger: false,
    isStatic: false,
    tags: ['player', 'solid']
  });
  componentRegistry.addComponent(entityId, 'Collider', collider);

  // Add FactionMember component (player starts as civilian detective)
  // Note: Reputation is now managed centrally by FactionManager
  // This component tracks disguise state and relationship modifiers
  const factionMember = new FactionMember({
    primaryFaction: 'civilian',
    reputation: {
      vanguard_prime: { fame: 10, infamy: 0 }, // Former officer
      wraith_network: { fame: 0, infamy: 0 },
      luminari_syndicate: { fame: 5, infamy: 0 },
      cipher_collective: { fame: 0, infamy: 0 },
      memory_keepers: { fame: 0, infamy: 0 }
    },
    currentDisguise: null,
    knownBy: new Set(),
    relationshipModifiers: [
      { factionId: 'vanguard_prime', modifier: 1.1, reason: 'former_officer' }
    ]
  });
  componentRegistry.addComponent(entityId, 'FactionMember', factionMember);

  // Add Disguise component (player can wear disguises)
  // Player starts with no disguise equipped
  const disguise = new Disguise({
    disguiseId: 'player_disguise',
    factionId: 'civilian', // Default, will change when equipped
    baseEffectiveness: 0.7,
    equipped: false
  });
  componentRegistry.addComponent(entityId, 'Disguise', disguise);

  console.log(`[PlayerEntity] Created player entity at (${x}, ${y})`);

  return entityId;
}
