import { EntityManager } from '../../../src/engine/ecs/EntityManager.js';
import { ComponentRegistry } from '../../../src/engine/ecs/ComponentRegistry.js';
import { ForensicEvidence } from '../../../src/game/components/ForensicEvidence.js';
import { createEvidenceEntity } from '../../../src/game/entities/EvidenceEntity.js';

describe('EvidenceEntity', () => {
  it('attaches ForensicEvidence when forensic config provided', () => {
    const entityManager = new EntityManager();
    const componentRegistry = new ComponentRegistry(entityManager);

    const entityId = createEvidenceEntity(entityManager, componentRegistry, {
      id: 'ev_forensic_test',
      x: 42,
      y: 84,
      type: 'forensic',
      category: 'device',
      title: 'Encrypted Vial',
      description: 'Prototype evidence requiring lab work.',
      caseId: 'case_forensic',
      derivedClues: ['clue_alpha'],
      forensic: {
        forensicType: 'analysis',
        requiresAnalysis: true,
        requiredTool: 'basic_magnifier',
        difficulty: 2,
        analysisTime: 900,
        hiddenClues: ['clue_hidden_precision']
      }
    });

    const forensicComponent = componentRegistry.getComponent(entityId, 'ForensicEvidence');
    const evidenceComponent = componentRegistry.getComponent(entityId, 'Evidence');

    expect(evidenceComponent.derivedClues).toEqual(['clue_alpha']);
    expect(forensicComponent).toBeInstanceOf(ForensicEvidence);
    expect(forensicComponent.hiddenClues).toEqual(['clue_hidden_precision']);
    expect(forensicComponent.difficulty).toBe(2);
    expect(forensicComponent.requiredTool).toBe('basic_magnifier');
  });

  it('defaults hidden clues to derived clues when not provided', () => {
    const entityManager = new EntityManager();
    const componentRegistry = new ComponentRegistry(entityManager);

    const entityId = createEvidenceEntity(entityManager, componentRegistry, {
      id: 'ev_forensic_default_hidden',
      type: 'forensic',
      category: 'lab',
      title: 'Chemical Residue',
      caseId: 'case_forensic',
      derivedClues: ['clue_beta'],
      forensic: {
        forensicType: 'document',
        requiresAnalysis: true,
        requiredTool: null,
        difficulty: 1,
        analysisTime: 600
      }
    });

    const forensicComponent = componentRegistry.getComponent(entityId, 'ForensicEvidence');
    expect(forensicComponent.hiddenClues).toEqual(['clue_beta']);
  });
});
