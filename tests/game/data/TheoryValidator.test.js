/**
 * TheoryValidator Tests
 *
 * Validates multiple-solution support, hint generation, and connection validation.
 */
import { TheoryValidator } from '../../../src/game/data/TheoryValidator.js';

describe('TheoryValidator', () => {
  let validator;
  let caseFile;
  let clueLookup;

  beforeEach(() => {
    validator = new TheoryValidator();
    caseFile = {
      accuracyThreshold: 0.75,
      theoryGraph: {
        id: 'primary',
        nodes: ['clue_a', 'clue_b', 'clue_c'],
        connections: [
          { from: 'clue_a', to: 'clue_b', type: 'supports' },
          { from: 'clue_b', to: 'clue_c', type: 'supports' }
        ]
      },
      alternateTheoryGraphs: [
        {
          id: 'alternate',
          nodes: ['clue_a', 'clue_b', 'clue_c'],
          connections: [
            { from: 'clue_a', to: 'clue_c', type: 'supports' },
            { from: 'clue_b', to: 'clue_c', type: 'supports' }
          ]
        }
      ]
    };

    clueLookup = new Map([
      ['clue_a', { id: 'clue_a', title: 'Anonymous Tip' }],
      ['clue_b', { id: 'clue_b', title: 'Corporate Motive' }],
      ['clue_c', { id: 'clue_c', title: 'NeuroSync Lead' }]
    ]);
  });

  it('marks matching primary solution as valid', () => {
    const playerTheory = {
      nodes: ['clue_a', 'clue_b', 'clue_c'],
      connections: [
        { from: 'clue_a', to: 'clue_b', type: 'supports' },
        { from: 'clue_b', to: 'clue_c', type: 'supports' }
      ]
    };

    const result = validator.validate(playerTheory, caseFile, { clueLookup });

    expect(result.valid).toBe(true);
    expect(result.accuracy).toBeCloseTo(1, 5);
    expect(result.hints).toHaveLength(0);
    expect(result.solutionId).toBe('primary');
  });

  it('accepts alternate solution graphs', () => {
    const playerTheory = {
      nodes: ['clue_a', 'clue_b', 'clue_c'],
      connections: [
        { from: 'clue_a', to: 'clue_c', type: 'supports' },
        { from: 'clue_b', to: 'clue_c', type: 'supports' }
      ]
    };

    const result = validator.validate(playerTheory, caseFile, { clueLookup });

    expect(result.valid).toBe(true);
    expect(result.solutionId).toBe('alternate');
    expect(result.accuracy).toBeGreaterThanOrEqual(0.95);
  });

  it('produces hints for missing connections', () => {
    const playerTheory = {
      nodes: ['clue_a', 'clue_b', 'clue_c'],
      connections: [
        { from: 'clue_a', to: 'clue_b', type: 'supports' }
      ]
    };

    const result = validator.validate(playerTheory, caseFile, { clueLookup });

    expect(result.valid).toBe(false);
    expect(result.hints.length).toBeGreaterThan(0);
    expect(result.hints.join(' ')).toContain('Corporate Motive');
    expect(result.feedback.toLowerCase()).toContain('link');
  });

  it('flags unsupported connection types', () => {
    const playerTheory = {
      nodes: ['clue_a', 'clue_b'],
      connections: [
        { from: 'clue_a', to: 'clue_b', type: 'disproves' }
      ]
    };

    const result = validator.validate(playerTheory, caseFile, { clueLookup });

    expect(result.valid).toBe(false);
    expect(result.invalidConnections[0].reason).toBe('unsupported_connection_type');
    expect(result.feedback).toContain('incompatible');
    expect(result.hints[0]).toContain('Connection type');
  });
});
