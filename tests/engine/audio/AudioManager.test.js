import { AudioManager } from '../../../src/engine/audio/AudioManager.js';

function createMockAudioContext() {
  const createdGains = [];

  const context = {
    currentTime: 10,
    destination: { connect: jest.fn() },
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
    createBufferSource: jest.fn(),
    decodeAudioData: jest.fn((arrayBuffer, success) => {
      if (typeof success === 'function') {
        success({ duration: 1, _from: arrayBuffer });
        return;
      }
      return Promise.resolve({ duration: 1, _from: arrayBuffer });
    }),
    suspend: jest.fn(() => Promise.resolve()),
    resume: jest.fn(() => Promise.resolve()),
    close: jest.fn(() => Promise.resolve()),
  };
  context.__createdGains = createdGains;
  return context;
}

describe('AudioManager', () => {
  let context;
  let musicChannel;
  let sfxPool;
  let manager;

  beforeEach(() => {
    context = createMockAudioContext();
    musicChannel = {
      play: jest.fn(),
      stop: jest.fn(),
      dispose: jest.fn(),
      setVolume: jest.fn(),
    };
    sfxPool = {
      play: jest.fn(),
      dispose: jest.fn(),
    };
    manager = new AudioManager({
      contextFactory: () => context,
      createMusicChannel: () => musicChannel,
      createSFXPool: () => sfxPool,
      fetch: jest.fn((url) =>
        Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        })
      ),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('initializes audio graph with gain buses', async () => {
    const initialized = await manager.init({
      masterVolume: 0.9,
      musicVolume: 0.5,
      sfxVolume: 0.6,
      ambientVolume: 0.4,
    });

    expect(initialized).toBe(true);
    expect(context.createGain).toHaveBeenCalledTimes(4);
    expect(manager.masterGain.gain.value).toBe(0.9);
    expect(manager.musicGain.gain.value).toBe(0.5);
    expect(manager.sfxGain.gain.value).toBe(0.6);
    expect(manager.ambientGain.gain.value).toBe(0.4);
    expect(musicChannel.play).not.toHaveBeenCalled();
  });

  it('loads sound buffer and plays through pool', async () => {
    await manager.init();
    const arrayBuffer = new ArrayBuffer(4);
    const decoded = await manager.loadSound('ping', arrayBuffer, { volume: 0.3 });

    expect(context.decodeAudioData).toHaveBeenCalled();
    manager.playSFX('ping', { volume: 0.5, detune: -100, playbackRate: 1.2 });
    expect(sfxPool.play).toHaveBeenCalledWith(decoded, {
      volume: 0.5,
      detune: -100,
      playbackRate: 1.2,
      loop: undefined,
    });
  });

  it('loads music from URL and delegates to music channel', async () => {
    await manager.init();
    const decoded = await manager.loadMusic('ambient', '/assets/audio/ambient.mp3', {
      loopStart: 2,
      loopEnd: 60,
      fadeDuration: 1.5,
    });

    manager.playMusic('ambient', { volume: 0.6 });

    expect(musicChannel.play).toHaveBeenCalledWith(decoded, {
      trackId: 'ambient',
      volume: 0.6,
      fadeDuration: 1.5,
      loop: true,
      loopStart: 2,
      loopEnd: 60,
      startAt: 0,
    });
  });

  it('setBusVolume ramps gain values', async () => {
    await manager.init();

    manager.setBusVolume('music', 0.2, { fadeDuration: 0.5 });

    const musicGain = manager.musicGain.gain;
    expect(musicGain.cancelScheduledValues).toHaveBeenCalledWith(context.currentTime);
    expect(musicGain.linearRampToValueAtTime).toHaveBeenCalledWith(
      0.2,
      context.currentTime + 0.5
    );
  });

  it('setMusicVolume delegates to music channel', async () => {
    await manager.init();
    manager.setMusicVolume(0.3, { fadeDuration: 0.4 });
    expect(musicChannel.setVolume).toHaveBeenCalledWith(0.3, { fadeDuration: 0.4 });
  });

  it('stopMusic delegates to music channel', async () => {
    await manager.init();
    manager.stopMusic({ fadeDuration: 0.3 });
    expect(musicChannel.stop).toHaveBeenCalledWith({ fadeDuration: 0.3 });
  });
});
