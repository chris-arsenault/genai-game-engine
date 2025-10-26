/**
 * NPCEntity Factory
 *
 * Creates NPC entities with faction affiliation.
 * Stub implementation for initial gameplay loop.
 */

import { Transform } from '../components/Transform.js';
import { Sprite } from '../components/Sprite.js';
import { FactionMember } from '../components/FactionMember.js';
import { Collider } from '../components/Collider.js';
import { InteractionZone } from '../components/InteractionZone.js';

/**
 * Create NPC entity
 * @param {Object} entityManager - Entity manager instance
 * @param {Object} componentRegistry - Component registry instance
 * @param {Object} npcData - NPC configuration
 * @returns {string} Entity ID
 */
export function createNPCEntity(entityManager, componentRegistry, npcData) {
  const {
    x = 0,
    y = 0,
    id = `npc_${Date.now()}`,
    name = 'NPC',
    faction = 'civilian',
    hasDialogue = false,
    dialogueId = null
  } = npcData;

  // Create entity
  const entityId = entityManager.createEntity();
  entityManager.tagEntity(entityId, 'npc');

  // Add Transform component
  const transform = new Transform(x, y, 0, 1, 1);
  componentRegistry.addComponent(entityId, 'Transform', transform);

  // Add Sprite component (placeholder)
  const sprite = new Sprite({
    image: null,
    width: 32,
    height: 48,
    layer: 'entities',
    zIndex: 8,
    color: getFactionColor(faction),
    visible: true
  });
  componentRegistry.addComponent(entityId, 'Sprite', sprite);

  // Add FactionMember component
  const factionMember = new FactionMember({
    primaryFaction: faction,
    reputation: {},
    currentDisguise: null,
    knownBy: new Set()
  });
  componentRegistry.addComponent(entityId, 'FactionMember', factionMember);

  // Add Collider component
  const collider = new Collider({
    type: 'AABB',
    width: 28,
    height: 40,
    isTrigger: false,
    isStatic: true,
    tags: ['npc', 'solid']
  });
  componentRegistry.addComponent(entityId, 'Collider', collider);

  // Add InteractionZone for dialogue (if applicable)
  if (hasDialogue && dialogueId) {
    const interactionZone = new InteractionZone({
      id: `dialogue_${id}`,
      type: 'dialogue',
      radius: 64,
      requiresInput: true,
      prompt: `Press E to talk to ${name}`,
      active: true,
      oneShot: false,
      data: {
        npcId: id,
        dialogueId
      }
    });
    componentRegistry.addComponent(entityId, 'InteractionZone', interactionZone);
  }

  console.log(`[NPCEntity] Created NPC: ${name} (${faction}) at (${x}, ${y})`);

  return entityId;
}

/**
 * Get visual color based on faction
 * @param {string} faction
 * @returns {string}
 */
function getFactionColor(faction) {
  const colors = {
    police: '#0066CC', // Blue
    criminals: '#CC0000', // Red
    neurosynch: '#9900CC', // Purple
    resistance: '#00CC66', // Green
    civilian: '#999999' // Gray
  };
  return colors[faction] || '#CCCCCC';
}
