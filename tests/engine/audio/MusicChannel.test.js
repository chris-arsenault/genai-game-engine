import { MusicChannel } from '../../../src/engine/audio/MusicChannel.js';

function createMockAudioContext() {
  const createdGains = [];
  const createdSources = [];

  const context = {
    currentTime: 5,
    createGain: jest.fn(() => {
      const gainNode = {
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
      const source = {
        buffer: null,
        loop: false,
        loopStart: 0,
        loopEnd: 0,
        connect: jest.fn(),
        disconnect: jest.fn(),
        start: jest.fn(),
        stop: jest.fn(),
        onended: null,
        triggerEnd() {
          if (typeof this.onended === 'function') {
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

describe('MusicChannel', () => {
  let context;
  let destinationGain;
  let channel;

  beforeEach(() => {
    context = createMockAudioContext();
    destinationGain = context.createGain();
    channel = new MusicChannel(context, destinationGain, { defaultFade: 0.25 });
  });

  afterEach(() => {
    channel.dispose();
  });

  it('plays track with fade in', () => {
    const buffer = { duration: 120 };
    const track = channel.play(buffer, {
      volume: 0.7,
      fadeDuration: 0.5,
      loopStart: 1.2,
      loopEnd: 60,
      trackId: 'ambient',
    });

    expect(track).not.toBeNull();
    const gainNode = context.__createdGains[1];
    expect(gainNode.connect).toHaveBeenCalledWith(destinationGain);
    expect(gainNode.gain.setValueAtTime).toHaveBeenCalledWith(0, context.currentTime);
    expect(gainNode.gain.linearRampToValueAtTime).toHaveBeenCalledWith(
      0.7,
      context.currentTime + 0.5
    );

    const source = context.__createdSources[0];
    expect(source.start).toHaveBeenCalledWith(context.currentTime, 0);
    expect(source.loop).toBe(true);
    expect(source.loopStart).toBe(1.2);
    expect(source.loopEnd).toBe(60);
  });

  it('fades out previous track when playing new buffer', () => {
    const bufferA = { duration: 30 };
    const bufferB = { duration: 45 };

    channel.play(bufferA, { volume: 0.5, fadeDuration: 0.3, trackId: 'A' });
    const firstSource = context.__createdSources[0];

    channel.play(bufferB, { volume: 0.8, fadeDuration: 0.4, trackId: 'B' });

    const firstGain = context.__createdGains[1].gain;
    expect(firstGain.cancelScheduledValues).toHaveBeenCalledWith(context.currentTime);
    expect(firstGain.linearRampToValueAtTime).toHaveBeenCalledWith(
      0,
      context.currentTime + 0.4
    );
    expect(firstSource.stop).toHaveBeenCalledWith(context.currentTime + 0.4);
  });

  it('stop applies fade out when requested', () => {
    const buffer = { duration: 10 };
    channel.play(buffer, { volume: 1, fadeDuration: 0.2 });
    const source = context.__createdSources[0];
    const gain = context.__createdGains[1].gain;

    channel.stop({ fadeDuration: 0.6 });

    expect(gain.cancelScheduledValues).toHaveBeenCalledWith(context.currentTime);
    expect(gain.linearRampToValueAtTime).toHaveBeenCalledWith(
      0,
      context.currentTime + 0.6
    );
    expect(source.stop).toHaveBeenCalledWith(context.currentTime + 0.6);
  });

  it('setVolume ramps to requested level', () => {
    const buffer = { duration: 15 };
    channel.play(buffer, { volume: 0.4 });
    const gain = context.__createdGains[1].gain;

    channel.setVolume(0.9, { fadeDuration: 0.5 });

    expect(gain.cancelScheduledValues).toHaveBeenCalledWith(context.currentTime);
    expect(gain.linearRampToValueAtTime).toHaveBeenCalledWith(
      0.9,
      context.currentTime + 0.5
    );
  });
});
