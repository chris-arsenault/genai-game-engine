import { Game } from '../../src/game/Game.js';

function createEngineStub() {
  const renderer = {
    getCamera: jest.fn(() => ({
      worldToScreen: jest.fn(() => ({ x: 0, y: 0 })),
      containsRect: jest.fn(() => true),
    })),
  };

  return {
    canvas: { getContext: jest.fn(() => ({ clearRect: jest.fn() })) },
    eventBus: {
      emit: jest.fn(),
      on: jest.fn(),
      off: jest.fn(),
    },
    entityManager: {},
    componentRegistry: {},
    systemManager: {
      registerSystem: jest.fn(),
      init: jest.fn(),
      update: jest.fn(),
      cleanup: jest.fn(),
    },
    renderer,
  };
}

describe('Game forensic prompt formatting', () => {
  let game;

  beforeEach(() => {
    const engine = createEngineStub();
    game = new Game(engine);
  });

  afterEach(() => {
    if (game) {
      game.cleanup();
    }
    game = null;
  });

  it('formats forensic requirements with player-friendly labels', () => {
    const text = game._formatForensicRequirements({
      tool: 'basic_magnifier',
      requiredSkill: 'forensic_skill_2',
      difficulty: 2,
    });

    expect(text).toBe('Tool: Basic Magnifier · Skill: Forensic Skill II · Difficulty: Challenging (II)');
  });

  it('formats missing requirement failures using friendly labels', () => {
    const message = game._formatForensicFailureMessage({
      reason: 'missing_requirements',
      requiredTool: 'fingerprint_kit',
      requiredSkill: 'forensic_skill_3',
    });

    expect(message).toBe('Missing Tool: Fingerprint Kit & Skill: Forensic Skill III');
  });

  it('builds forensic prompt text with humanized type and requirements', () => {
    game.caseManager = {
      getEvidenceDefinition: jest.fn(() => ({
        title: 'Encoded Ledgers',
      })),
    };

    const prompt = game._buildForensicPromptText({
      evidenceId: 'evidence_encoded_ledgers',
      forensicType: 'document',
      requirements: {
        tool: 'document_scanner',
        requiredSkill: 'forensic_skill_1',
        difficulty: 1,
      },
    });

    expect(prompt.fallbackActionText).toBe('run forensic analysis (Document Analysis): Encoded Ledgers');
    expect(prompt.text).toContain('Press F to run forensic analysis (Document Analysis): Encoded Ledgers');
    expect(prompt.text).toContain('Requires Tool: Document Scanner · Skill: Forensic Skill I · Difficulty: Routine (I)');
  });
});
