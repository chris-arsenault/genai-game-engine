import { SFXPool } from '../../../src/engine/audio/SFXPool.js';

function createMockAudioContext() {
  const createdGains = [];
  const createdSources = [];

  const context = {
    currentTime: 0,
    createGain: jest.fn(() => {
      const gainNode = {
        connects: [],
        connected: false,
        connect: jest.fn(),
        disconnect: jest.fn(),
        gain: {
          value: 1,
          setValueAtTime: jest.fn(function setValue(value) {
            this.value = value;
          }),
          linearRampToValueAtTime: jest.fn(),
          cancelScheduledValues: jest.fn(),
        },
      };
      createdGains.push(gainNode);
      return gainNode;
    }),
    createBufferSource: jest.fn(() => {
      let ended = false;
      const source = {
        buffer: null,
        loop: false,
        detune: {
          setValueAtTime: jest.fn(),
          value: 0,
        },
        playbackRate: {
          setValueAtTime: jest.fn(),
          value: 1,
        },
        connect: jest.fn(),
        disconnect: jest.fn(),
        start: jest.fn(),
        stop: jest.fn(),
        onended: null,
        triggerEnd() {
          if (!ended && typeof this.onended === 'function') {
            ended = true;
            this.onended();
          }
        },
      };
      createdSources.push(source);
      return source;
    }),
  };

  context.__createdGains = createdGains;
  context.__createdSources = createdSources;

  return context;
}

describe('SFXPool', () => {
  let context;
  let destinationGain;
  let pool;

  beforeEach(() => {
    context = createMockAudioContext();
    destinationGain = context.createGain();
    pool = new SFXPool(context, destinationGain, { maxGainNodes: 2 });
  });

  afterEach(() => {
    pool.dispose();
  });

  it('plays a buffer using pooled gain nodes', () => {
    const buffer = { duration: 1 };
    const playback = pool.play(buffer, { volume: 0.5 });

    expect(playback).not.toBeNull();
    expect(context.createBufferSource).toHaveBeenCalledTimes(1);
    const createdSource = context.__createdSources[0];

    expect(createdSource.connect).toHaveBeenCalled();
    expect(playback.source).toBe(createdSource);
    expect(context.__createdGains[1].connect).toHaveBeenCalledWith(destinationGain);
    expect(context.__createdGains[1].gain.value).toBe(0.5);
  });

  it('reuses gain nodes after playback ends', () => {
    const buffer = { duration: 1 };
    const first = pool.play(buffer, { volume: 0.6 });
    const second = pool.play(buffer, { volume: 0.7 });
    expect(context.createGain).toHaveBeenCalledTimes(3); // destination + two active

    first.source.triggerEnd();
    const gainsCreatedBefore = context.createGain.mock.calls.length;

    const third = pool.play(buffer, { volume: 0.8 });
    expect(third).not.toBeNull();
    expect(context.createGain).toHaveBeenCalledTimes(gainsCreatedBefore); // no new gain

    // cleanup
    second.source.triggerEnd();
    third.source.triggerEnd();
  });

  it('stopAll stops active sources and clears state', () => {
    const buffer = { duration: 1 };
    const first = pool.play(buffer);
    const second = pool.play(buffer);

    pool.stopAll();

    expect(first.source.stop).toHaveBeenCalled();
    expect(second.source.stop).toHaveBeenCalled();
    expect(context.__createdSources.every((s) => s.onended === null || s.onended === undefined)).toBe(
      true
    );
  });
});
