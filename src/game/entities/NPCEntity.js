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
import { NPC } from '../components/NPC.js';
import { NavigationAgent } from '../components/NavigationAgent.js';

function shouldLog() {
  if (typeof __DEV__ !== 'undefined') {
    return Boolean(__DEV__);
  }

  if (typeof process !== 'undefined' && process.env && typeof process.env.NODE_ENV === 'string') {
    return process.env.NODE_ENV !== 'test';
  }

  return true;
}

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

  // Create entity with 'npc' tag
  const entityId = entityManager.createEntity('npc');

  // Add Transform component
  const transform = new Transform(x, y, 0, 1, 1);
  transform.type = 'Transform';
  componentRegistry.addComponent(entityId, transform);

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
  sprite.type = 'Sprite';
  componentRegistry.addComponent(entityId, sprite);

  // Add FactionMember component
  const factionMember = new FactionMember({
    primaryFaction: faction,
    reputation: {},
    currentDisguise: null,
    knownBy: new Set()
  });
  factionMember.type = 'FactionMember';
  componentRegistry.addComponent(entityId, factionMember);

  // Add NPC component (memory and recognition)
  const npcComponent = new NPC({
    npcId: id,
    name,
    faction,
    knownPlayer: false,
    attitude: 'neutral',
    dialogue: {
      default: dialogueId || 'default_npc_dialogue',
      friendly: dialogueId ? `${dialogueId}_friendly` : 'default_friendly',
      neutral: dialogueId ? `${dialogueId}_neutral` : 'default_neutral',
      hostile: dialogueId ? `${dialogueId}_hostile` : 'default_hostile'
    }
  });
  npcComponent.type = 'NPC';
  componentRegistry.addComponent(entityId, npcComponent);

  // Add Collider component
  const collider = new Collider({
    type: 'AABB',
    width: 28,
    height: 40,
    isTrigger: false,
    isStatic: true,
    tags: ['npc', 'solid']
  });
  collider.type = 'Collider';
  componentRegistry.addComponent(entityId, collider);

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
    interactionZone.type = 'InteractionZone';
    componentRegistry.addComponent(entityId, interactionZone);
  }

  if (npcData?.navigationAgent) {
    const navigationAgent = new NavigationAgent({
      ...npcData.navigationAgent,
      metadata: {
        ...(npcData.navigationAgent.metadata || {}),
        role: 'npc',
        npcId: id,
      },
      initialPosition: { x, y },
    });
    componentRegistry.addComponent(entityId, 'NavigationAgent', navigationAgent);
  }

  if (shouldLog()) {
    console.log(`[NPCEntity] Created NPC: ${name} (${faction}) at (${x}, ${y})`);
  }

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
