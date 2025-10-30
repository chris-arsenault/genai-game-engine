import { SuspicionMoodMapper } from '../../../src/game/audio/SuspicionMoodMapper.js';

describe('SuspicionMoodMapper', () => {
  it('returns ambient mood when calm', () => {
    const mapper = new SuspicionMoodMapper();
    const result = mapper.mapState({ suspicion: 0 });

    expect(result.mood).toBe('ambient');
    expect(result.options.metadata.suspicion).toBe(0);
    expect(result.options.force).toBe(false);
  });

  it('maps suspicion above stealth threshold to stealth mood', () => {
    const mapper = new SuspicionMoodMapper({ thresholds: { stealth: 5 } });
    const result = mapper.mapState({ suspicion: 12 });

    expect(result.mood).toBe('stealth');
    expect(result.options.metadata.priority).toBeUndefined();
    expect(result.options.metadata.scramblerActive).toBe(false);
  });

  it('promotes to alert when alert flag active even if suspicion lower', () => {
    const mapper = new SuspicionMoodMapper({ thresholds: { alert: 30 } });
    const result = mapper.mapState({ suspicion: 10, alertActive: true });

    expect(result.mood).toBe('alert');
    expect(result.options.force).toBe(false);
    expect(result.options.metadata.alertActive).toBe(true);
  });

  it('promotes to combat when combat engaged', () => {
    const mapper = new SuspicionMoodMapper();
    const result = mapper.mapState({ suspicion: 20, combatEngaged: true });

    expect(result.mood).toBe('combat');
    expect(result.options.metadata.combatEngaged).toBe(true);
  });

  it('honours mood hints with force option', () => {
    const mapper = new SuspicionMoodMapper({ defaultMood: 'ambient' });
    const result = mapper.mapState({ suspicion: 3, moodHint: 'narrative_peak' });

    expect(result.mood).toBe('narrative_peak');
    expect(result.options.force).toBe(true);
  });

  it('applies scrambler tail to maintain stealth shortly after expiry', () => {
    const mapper = new SuspicionMoodMapper({ scramblerGraceSeconds: 1, thresholds: { stealth: 10 } });
    const first = mapper.mapState({
      suspicion: 8,
      scramblerActive: true,
      timestamp: 1000,
    });

    expect(first.mood).toBe('stealth');

    const afterExpiry = mapper.mapState({
      suspicion: 8,
      scramblerActive: false,
      timestamp: 1500,
    });

    expect(afterExpiry.mood).toBe('stealth');

    const reset = mapper.mapState({
      suspicion: 2,
      scramblerActive: false,
      timestamp: 2600,
    });

    expect(reset.mood).toBe('ambient');
  });

  it('updates thresholds via setThresholds', () => {
    const mapper = new SuspicionMoodMapper({ thresholds: { stealth: 5 } });
    mapper.setThresholds({ stealth: 20 });
    const calm = mapper.mapState({ suspicion: 10 });
    expect(calm.mood).toBe('ambient');
  });
});

