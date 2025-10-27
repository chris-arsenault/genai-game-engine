/**
 * EvidenceEntity Factory
 *
 * Creates evidence entities that can be collected by player.
 * Evidence drives investigation and knowledge-gated progression.
 */

import { Transform } from '../components/Transform.js';
import { Sprite } from '../components/Sprite.js';
import { Evidence } from '../components/Evidence.js';
import { InteractionZone } from '../components/InteractionZone.js';
import { Collider } from '../components/Collider.js';

/**
 * Create evidence entity
 * @param {Object} entityManager - Entity manager instance
 * @param {Object} componentRegistry - Component registry instance
 * @param {Object} evidenceData - Evidence configuration
 * @returns {string} Entity ID
 */
export function createEvidenceEntity(entityManager, componentRegistry, evidenceData) {
  const {
    x = 0,
    y = 0,
    id = `evidence_${Date.now()}`,
    type = 'physical',
    category = 'generic',
    title = 'Evidence',
    description = 'A piece of evidence',
    caseId = 'case_tutorial',
    hidden = false,
    requires = null,
    derivedClues = []
  } = evidenceData;

  // Create entity with 'evidence' tag
  const entityId = entityManager.createEntity('evidence');

  // Add Transform component
  const transform = new Transform(x, y, 0, 1, 1);
  transform.type = 'Transform';
  componentRegistry.addComponent(entityId, transform);

  // Add Sprite component
  const sprite = new Sprite({
    image: null,
    width: 24,
    height: 24,
    layer: 'entities',
    zIndex: 5,
    color: getEvidenceColor(type),
    visible: !hidden, // Hidden evidence not visible until detective vision
    alpha: hidden ? 0.3 : 1.0
  });
  sprite.type = 'Sprite';
  componentRegistry.addComponent(entityId, sprite);

  // Add Evidence component
  const evidence = new Evidence({
    id,
    type,
    category,
    title,
    description,
    caseId,
    collected: false,
    analyzed: false,
    hidden,
    requires,
    derivedClues
  });
  evidence.type = 'Evidence';
  componentRegistry.addComponent(entityId, evidence);

  // Add InteractionZone component
  const interactionZone = new InteractionZone({
    id: `interaction_${id}`,
    type: 'evidence',
    radius: 48,
    requiresInput: true,
    prompt: `Press E to collect: ${title}`,
    active: true,
    oneShot: true,
    data: {
      evidenceId: id,
      caseId
    }
  });
  interactionZone.type = 'InteractionZone';
  componentRegistry.addComponent(entityId, interactionZone);

  // Add trigger collider for detection
  const collider = new Collider({
    type: 'circle',
    radius: 12,
    isTrigger: true,
    isStatic: true,
    tags: ['evidence']
  });
  collider.type = 'Collider';
  componentRegistry.addComponent(entityId, collider);

  console.log(`[EvidenceEntity] Created evidence: ${title} at (${x}, ${y})`);

  return entityId;
}

/**
 * Get visual color based on evidence type
 * @param {string} type
 * @returns {string}
 */
function getEvidenceColor(type) {
  const colors = {
    physical: '#FFAA00', // Orange
    digital: '#00FFFF', // Cyan
    testimony: '#FF00FF', // Magenta
    forensic: '#00FF00' // Green
  };
  return colors[type] || '#FFFFFF';
}
