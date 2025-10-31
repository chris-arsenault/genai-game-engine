import { EntityManager } from '../../../src/engine/ecs/EntityManager.js';
import { ComponentRegistry } from '../../../src/engine/ecs/ComponentRegistry.js';
import { ForensicEvidence } from '../../../src/game/components/ForensicEvidence.js';
import { createEvidenceEntity } from '../../../src/game/entities/EvidenceEntity.js';
import { setActionBindings, resetBindings } from '../../../src/game/state/controlBindingsStore.js';

describe('EvidenceEntity', () => {
  it('formats default interaction prompt with interact key when no custom prompt supplied', () => {
    const entityManager = new EntityManager();
    const componentRegistry = new ComponentRegistry(entityManager);

    const entityId = createEvidenceEntity(entityManager, componentRegistry, {
      id: 'ev_prompt_default',
      x: 0,
      y: 0,
      title: 'Encrypted Vial',
    });

    const interactionZone = componentRegistry.getComponent(entityId, 'InteractionZone');
    expect(interactionZone.prompt).toBe('Press E to collect Encrypted Vial');
  });

  it('uses dynamic interact binding when control bindings are remapped', () => {
    const entityManager = new EntityManager();
    const componentRegistry = new ComponentRegistry(entityManager);
    setActionBindings('interact', ['KeyQ']);

    const entityId = createEvidenceEntity(entityManager, componentRegistry, {
      id: 'ev_prompt_dynamic',
      x: 0,
      y: 0,
      title: 'Encrypted Vial',
    });

    const interactionZone = componentRegistry.getComponent(entityId, 'InteractionZone');
    expect(interactionZone.prompt).toBe('Press Q to collect Encrypted Vial');

    resetBindings();
  });
  it('rewrites custom prompt binding to current interact key', () => {
    const entityManager = new EntityManager();
    const componentRegistry = new ComponentRegistry(entityManager);

    const entityId = createEvidenceEntity(entityManager, componentRegistry, {
      id: 'ev_prompt_existing',
      x: 0,
      y: 0,
      title: 'Encrypted Vial',
      prompt: 'Press F to analyze evidence',
    });

    const interactionZone = componentRegistry.getComponent(entityId, 'InteractionZone');
    expect(interactionZone.prompt).toBe('Press E to analyze evidence');
  });

  it('applies remapped interact binding to custom prompt', () => {
    const entityManager = new EntityManager();
    const componentRegistry = new ComponentRegistry(entityManager);
    setActionBindings('interact', ['KeyY']);

    const entityId = createEvidenceEntity(entityManager, componentRegistry, {
      id: 'ev_prompt_existing_dynamic',
      x: 0,
      y: 0,
      title: 'Encrypted Vial',
      prompt: 'Press F to analyze evidence',
    });

    const interactionZone = componentRegistry.getComponent(entityId, 'InteractionZone');
    expect(interactionZone.prompt).toBe('Press Y to analyze evidence');

    resetBindings();
  });

  it('injects interact keybinding into custom prompt when missing', () => {
    const entityManager = new EntityManager();
    const componentRegistry = new ComponentRegistry(entityManager);

    const entityId = createEvidenceEntity(entityManager, componentRegistry, {
      id: 'ev_prompt_custom',
      x: 0,
      y: 0,
      title: 'Neural Extractor',
      prompt: 'Scan the neural extractor',
    });

    const interactionZone = componentRegistry.getComponent(entityId, 'InteractionZone');
    expect(interactionZone.prompt).toBe('Press E to scan the neural extractor');
  });

  it('applies sprite overrides when provided', () => {
    const entityManager = new EntityManager();
    const componentRegistry = new ComponentRegistry(entityManager);

    const entityId = createEvidenceEntity(entityManager, componentRegistry, {
      id: 'ev_sprite_override',
      x: 12,
      y: 18,
      title: 'Guidance Beacon',
      sprite: {
        width: 36,
        height: 36,
        layer: 'effects',
        zIndex: 9,
        color: '#FFD447',
        alpha: 0.85,
        visible: true,
      },
    });

    const sprite = componentRegistry.getComponent(entityId, 'Sprite');
    expect(sprite.width).toBe(36);
    expect(sprite.height).toBe(36);
    expect(sprite.layer).toBe('effects');
    expect(sprite.zIndex).toBe(9);
    expect(sprite.color).toBe('#FFD447');
    expect(sprite.alpha).toBe(0.85);
    expect(sprite.visible).toBe(true);
  });

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

  it('auto-selects AR-002 sprite assets for evidence metadata heuristics', () => {
    const cases = [
      {
        evidence: {
          id: 'ev_auto_fingerprint',
          title: 'Latent Fingerprint Sample',
          type: 'forensic',
          category: 'physical',
        },
        expectedImage: 'assets/generated/images/ar-002/image-ar-002-fingerprint.png',
      },
      {
        evidence: {
          id: 'ev_auto_blood',
          title: 'Holo Blood Spatter',
          type: 'forensic',
          category: 'physical',
        },
        expectedImage: 'assets/generated/images/ar-002/image-ar-002-blood-spatter.png',
      },
      {
        evidence: {
          id: 'ev_auto_extractor',
          title: 'Neural Extractor Device',
          type: 'forensic',
          category: 'device',
        },
        expectedImage: 'assets/generated/images/ar-002/image-ar-002-neural-extractor.png',
      },
      {
        evidence: {
          id: 'ev_auto_document',
          title: 'Confidential Case File',
          type: 'document',
          category: 'identification',
        },
        expectedImage: 'assets/generated/images/ar-002/image-ar-002-document.png',
      },
      {
        evidence: {
          id: 'ev_auto_marker',
          title: 'Evidence Marker A',
          type: 'physical',
          category: 'generic',
        },
        expectedImage: 'assets/generated/images/ar-002/image-ar-002-generic-marker.png',
      },
      {
        evidence: {
          id: 'ev_auto_fallback',
          title: 'Encrypted Memory Fragment',
          type: 'digital',
          category: 'data',
        },
        expectedImage: null,
        expectedColor: '#00FFFF',
      },
    ];

    cases.forEach(({ evidence, expectedImage, expectedColor }) => {
      const entityManager = new EntityManager();
      const componentRegistry = new ComponentRegistry(entityManager);

      const entityId = createEvidenceEntity(entityManager, componentRegistry, evidence);
      const sprite = componentRegistry.getComponent(entityId, 'Sprite');

      expect(sprite.image ?? null).toBe(expectedImage);

      if (expectedImage) {
        expect(sprite.width).toBe(32);
        expect(sprite.height).toBe(32);
      } else {
        expect(sprite.width).toBe(24);
        expect(sprite.height).toBe(24);
      }

      if (expectedColor) {
        expect(sprite.color).toBe(expectedColor);
      }
    });
  });
});
