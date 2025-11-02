import { FingerprintMatching } from '../../../src/game/minigames/FingerprintMatching.js';

const samplePuzzle = () => ({
  id: 'case-fp-001',
  partialPattern: [
    {
      id: 'ridge-A',
      points: [
        { x: -0.2, y: -0.1 },
        { x: 0.1, y: 0 },
        { x: 0.3, y: 0.2 },
      ],
    },
    {
      id: 'ridge-B',
      points: [
        { x: -0.15, y: 0.35 },
        { x: 0.2, y: 0.4 },
      ],
    },
  ],
  candidatePrints: [
    {
      id: 'suspect-one',
      label: 'Suspect One',
      pattern: [
        { id: 'ridge-A' },
        { id: 'ridge-C' },
      ],
      matchFeatures: ['ridge-A'],
      isCorrect: true,
    },
    {
      id: 'suspect-two',
      label: 'Suspect Two',
      pattern: [
        { id: 'ridge-B' },
        { id: 'ridge-D' },
      ],
    },
    {
      id: 'suspect-three',
      label: 'Suspect Three',
      pattern: [
        { id: 'ridge-E' },
      ],
    },
  ],
  timeLimitSeconds: 45,
});

describe('FingerprintMatching', () => {
  let eventBus;
  let emitted;

  beforeEach(() => {
    emitted = [];
    eventBus = {
      emit: jest.fn((event, payload) => {
        emitted.push({ event, payload });
      }),
    };
  });

  test('loads puzzle data and normalizes candidates', () => {
    const game = new FingerprintMatching({ eventBus });
    game.loadPuzzle(samplePuzzle());

    const state = game.getState();
    expect(state.state).toBe('active');
    expect(state.candidates).toHaveLength(3);
    expect(state.candidates[0].matchedFeatureIds).toEqual(['ridge-A']);
    expect(state.timeLimitSeconds).toBe(45);
  });

  test('selecting correct candidate emits success result', () => {
    const game = new FingerprintMatching({ eventBus });
    game.loadPuzzle(samplePuzzle());

    const result = game.selectCandidate(0);
    expect(result).toBeTruthy();
    expect(result.success).toBe(true);
    expect(result.reason).toBe('match');
    expect(game.getState().state).toBe('success');

    expect(eventBus.emit).toHaveBeenCalledWith('forensic:minigame_result', expect.objectContaining({
      success: true,
      candidateId: 'suspect-one',
    }));
  });

  test('timer expiration triggers failure result', () => {
    const game = new FingerprintMatching({ eventBus, defaultTimeLimit: 30 });
    game.loadPuzzle(samplePuzzle());

    // Advance the timer beyond the limit.
    game.update(100);

    const state = game.getState();
    expect(state.state).toBe('failure');

    expect(eventBus.emit).toHaveBeenCalledWith('forensic:minigame_result', expect.objectContaining({
      success: false,
      reason: 'timeout',
    }));
  });

  test('incorrect selection retains active state when retries allowed', () => {
    const game = new FingerprintMatching({ eventBus, timePenaltySeconds: 5 });
    game.loadPuzzle(samplePuzzle());

    const missResult = game.selectCandidate(1);
    expect(missResult).toBeNull();

    const stateAfterMiss = game.getState();
    expect(stateAfterMiss.state).toBe('active');
    expect(stateAfterMiss.remainingSeconds).toBe(40); // 45 initial - 5 penalty
    expect(stateAfterMiss.attempts).toHaveLength(1);
  });
});
