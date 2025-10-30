import { AdaptiveMusicLayerController } from '../../../src/engine/audio/AdaptiveMusicLayerController.js';

function createMockAudioContext() {
  const createdGains = [];
  const createdSources = [];

  const context = {
    currentTime: 10,
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
      };
      createdSources.push(source);
      return source;
    }),
  };

  context.__createdGains = createdGains;
  context.__createdSources = createdSources;
  return context;
}

function createMockAudioManager(context) {
  const buffers = new Map();
  return {
    audioContext: context,
    init: jest.fn(() => Promise.resolve(true)),
    hasBuffer: jest.fn((id) => buffers.has(id)),
    loadMusic: jest.fn((id, url, meta) => {
      buffers.set(id, { id, url, meta, duration: 120 });
      return Promise.resolve(buffers.get(id));
    }),
    getBuffer: jest.fn((id) => buffers.get(id)),
    createBusGain: jest.fn(() => context.createGain()),
  };
}

describe('AdaptiveMusicLayerController', () => {
  let context;
  let audioManager;
  let controller;
  const layers = [
    {
      id: 'ambient_base',
      trackId: 'ambient-track',
      url: '/music/ambient.mp3',
      baseVolume: 0.6,
    },
    {
      id: 'tension_layer',
      trackId: 'tension-track',
      url: '/music/tension.mp3',
      baseVolume: 0.9,
    },
  ];
  const states = {
    ambient: {
      ambient_base: 1,
      tension_layer: 0,
    },
    alert: {
      ambient_base: 0.7,
      tension_layer: 1,
    },
  };

  beforeEach(() => {
    context = createMockAudioContext();
    audioManager = createMockAudioManager(context);
    controller = new AdaptiveMusicLayerController(audioManager, {
      layers,
      states,
      fadeDuration: 0.5,
    });
  });

  afterEach(() => {
    controller.dispose();
  });

  it('initializes layers and applies default state', async () => {
    const initialized = await controller.init();

    expect(initialized).toBe(true);
    expect(audioManager.loadMusic).toHaveBeenCalledWith(
      'ambient-track',
      '/music/ambient.mp3',
      expect.objectContaining({ loop: true })
    );
    expect(audioManager.loadMusic).toHaveBeenCalledWith(
      'tension-track',
      '/music/tension.mp3',
      expect.objectContaining({ loop: true })
    );

    expect(context.createBufferSource).toHaveBeenCalledTimes(2);
    expect(controller.getState()).toBe('ambient');

    const [ambientGain, tensionGain] = context.__createdGains.slice(-2).map((gain) => gain.gain);
    expect(ambientGain.setValueAtTime).toHaveBeenCalledWith(
      0,
      expect.any(Number)
    );
    expect(tensionGain.setValueAtTime).toHaveBeenCalled();
  });

  it('transitions state with fade scheduling', async () => {
    await controller.init();
    const gains = context.__createdGains.slice(-2).map((gain) => gain.gain);
    gains.forEach((gain) => gain.linearRampToValueAtTime.mockClear());

    controller.setState('alert', { fadeDuration: 0.75 });

    expect(gains[0].linearRampToValueAtTime).toHaveBeenCalledWith(
      0.42,
      context.currentTime + 0.75
    );
    expect(gains[1].linearRampToValueAtTime).toHaveBeenCalledWith(
      0.9,
      context.currentTime + 0.75
    );
  });

  it('disposes layers and disconnects resources', async () => {
    await controller.init();
    const [ambientLayer, tensionLayer] = context.__createdSources.slice(-2);
    const [ambientGain, tensionGain] = context.__createdGains.slice(-2);

    controller.dispose();

    expect(ambientLayer.stop).toHaveBeenCalled();
    expect(ambientLayer.disconnect).toHaveBeenCalled();
    expect(tensionLayer.stop).toHaveBeenCalled();
    expect(tensionGain.disconnect).toHaveBeenCalled();
  });
});
