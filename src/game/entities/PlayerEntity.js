/**
 * PlayerEntity Factory
 *
 * Creates the player detective entity with all required components.
 * Tags entity as 'player' for easy querying.
 */

import { Transform } from '../components/Transform.js';
import { Sprite } from '../components/Sprite.js';
import { AnimatedSprite } from '../components/AnimatedSprite.js';
import { PlayerController } from '../components/PlayerController.js';
import { Collider } from '../components/Collider.js';
import { FactionMember } from '../components/FactionMember.js';
import { Disguise } from '../components/Disguise.js';
import { GameConfig } from '../config/GameConfig.js';
import { NavigationAgent } from '../components/NavigationAgent.js';

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

  // Add Sprite component (animation-driven visual)
  const sprite = new Sprite({
    image: null,
    width: 32,
    height: 32,
    layer: 'entities',
    zIndex: 10,
    color: '#00CCFF',
    visible: true
  });
  componentRegistry.addComponent(entityId, 'Sprite', sprite);

  const animationRow = {
    idleDown: 0,
    walkDown: 1,
    runDown: 2,
    idleLeft: 3,
    walkLeft: 4,
    runLeft: 5,
    idleRight: 6,
    walkRight: 7,
    runRight: 8,
    idleUp: 9,
    walkUp: 10,
    runUp: 11,
    dash: 12,
    slide: 13,
  };

  const frames = (row, count = 6) => Array.from({ length: count }, (_, index) => ({ col: index, row }));

  const animatedSprite = new AnimatedSprite({
    image: null,
    imageUrl: '/generated/images/ar-003/image-ar-003-kira-core-pack.png',
    frameWidth: 32,
    frameHeight: 32,
    defaultAnimation: 'idleDown',
    animations: {
      idleDown: {
        frames: frames(animationRow.idleDown, 6),
        loop: true,
        frameDuration: 0.28,
      },
      walkDown: {
        frames: frames(animationRow.walkDown, 6),
        loop: true,
        frameDuration: 0.14,
      },
      runDown: {
        frames: frames(animationRow.runDown, 6),
        loop: true,
        frameDuration: 0.1,
      },
      idleLeft: {
        frames: frames(animationRow.idleLeft, 6),
        loop: true,
        frameDuration: 0.28,
      },
      walkLeft: {
        frames: frames(animationRow.walkLeft, 6),
        loop: true,
        frameDuration: 0.14,
      },
      runLeft: {
        frames: frames(animationRow.runLeft, 6),
        loop: true,
        frameDuration: 0.1,
      },
      idleRight: {
        frames: frames(animationRow.idleRight, 6),
        loop: true,
        frameDuration: 0.28,
      },
      walkRight: {
        frames: frames(animationRow.walkRight, 6),
        loop: true,
        frameDuration: 0.14,
      },
      runRight: {
        frames: frames(animationRow.runRight, 6),
        loop: true,
        frameDuration: 0.1,
      },
      idleUp: {
        frames: frames(animationRow.idleUp, 6),
        loop: true,
        frameDuration: 0.28,
      },
      walkUp: {
        frames: frames(animationRow.walkUp, 6),
        loop: true,
        frameDuration: 0.14,
      },
      runUp: {
        frames: frames(animationRow.runUp, 6),
        loop: true,
        frameDuration: 0.1,
      },
      dash: {
        frames: frames(animationRow.dash, 8),
        loop: false,
        frameDuration: 0.055,
        next: 'idleDown',
      },
      dashLoop: {
        frames: frames(animationRow.dash, 6),
        loop: true,
        frameDuration: 0.06,
      },
      slide: {
        frames: frames(animationRow.slide, 8),
        loop: false,
        frameDuration: 0.06,
        next: 'idleDown',
      },
      idle: {
        frames: frames(animationRow.idleDown, 6),
        loop: true,
        frameDuration: 0.28,
      },
    },
  });

  componentRegistry.addComponent(entityId, 'AnimatedSprite', animatedSprite);

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

  const navigationAgent = new NavigationAgent({
    allowedSurfaceTags: ['safehouse', 'indoor', 'walkway', 'transition', 'checkpoint'],
    lockedSurfaceTags: ['transition', 'checkpoint'],
    initialPosition: { x, y },
    metadata: {
      role: 'player',
    },
  });
  componentRegistry.addComponent(entityId, 'NavigationAgent', navigationAgent);

  console.log(`[PlayerEntity] Created player entity at (${x}, ${y})`);

  return entityId;
}
