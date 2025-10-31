import { AdaptiveMusicLayerController } from '../../../src/engine/audio/AdaptiveMusicLayerController.js';
import { GameConfig } from '../../../src/game/config/GameConfig.js';

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

  it('matches memory parlor adaptive mix weights for ambient/tension/combat states', async () => {
    controller.dispose();

    const { memoryParlorAmbient } = GameConfig.audio;
    controller = new AdaptiveMusicLayerController(audioManager, {
      layers: [
        {
          id: 'ambient_base',
          trackId: memoryParlorAmbient.trackId,
          baseVolume: memoryParlorAmbient.baseVolume,
          trackUrl: memoryParlorAmbient.trackUrl,
        },
        {
          id: 'tension_layer',
          trackId: memoryParlorAmbient.tensionTrackId,
          baseVolume: memoryParlorAmbient.tensionBaseVolume,
          trackUrl: memoryParlorAmbient.tensionTrackUrl,
        },
        {
          id: 'combat_layer',
          trackId: memoryParlorAmbient.combatTrackId,
          baseVolume: memoryParlorAmbient.combatBaseVolume,
          trackUrl: memoryParlorAmbient.combatTrackUrl,
        },
      ],
      states: memoryParlorAmbient.states,
      fadeDuration: 1.1,
    });

    const initialized = await controller.init();
    expect(initialized).toBe(true);

    const [ambientGain, tensionGain, combatGain] = context.__createdGains
      .slice(-3)
      .map((gain) => gain.gain);

    const expectMix = (stateName, expectedVolumes) => {
      [ambientGain, tensionGain, combatGain].forEach((gain) => {
        gain.linearRampToValueAtTime.mockClear();
      });

      controller.setState(stateName, { fadeDuration: 1.1, force: true });

      const checkGain = (gain, expected) => {
        const calls = gain.linearRampToValueAtTime.mock.calls;
        expect(calls.length).toBeGreaterThan(0);
        const [target, when] = calls[calls.length - 1];
        expect(target).toBeCloseTo(expected, 5);
        expect(when).toBeCloseTo(context.currentTime + 1.1, 5);
      };

      checkGain(ambientGain, expectedVolumes.ambient);
      checkGain(tensionGain, expectedVolumes.tension);
      checkGain(combatGain, expectedVolumes.combat);
    };

    expectMix('stealth', {
      ambient: memoryParlorAmbient.baseVolume * memoryParlorAmbient.states.stealth.ambient_base,
      tension: memoryParlorAmbient.tensionBaseVolume * memoryParlorAmbient.states.stealth.tension_layer,
      combat: memoryParlorAmbient.combatBaseVolume * memoryParlorAmbient.states.stealth.combat_layer,
    });

    expectMix('alert', {
      ambient: memoryParlorAmbient.baseVolume * memoryParlorAmbient.states.alert.ambient_base,
      tension: memoryParlorAmbient.tensionBaseVolume * memoryParlorAmbient.states.alert.tension_layer,
      combat: memoryParlorAmbient.combatBaseVolume * memoryParlorAmbient.states.alert.combat_layer,
    });

    expectMix('combat', {
      ambient: memoryParlorAmbient.baseVolume * memoryParlorAmbient.states.combat.ambient_base,
      tension: memoryParlorAmbient.tensionBaseVolume * memoryParlorAmbient.states.combat.tension_layer,
      combat: memoryParlorAmbient.combatBaseVolume * memoryParlorAmbient.states.combat.combat_layer,
    });

    expectMix('ambient', {
      ambient: memoryParlorAmbient.baseVolume * memoryParlorAmbient.states.ambient.ambient_base,
      tension: memoryParlorAmbient.tensionBaseVolume * memoryParlorAmbient.states.ambient.tension_layer,
      combat: memoryParlorAmbient.combatBaseVolume * memoryParlorAmbient.states.ambient.combat_layer,
    });
  }

  it('matches act2 crossroads adaptive mix weights with downtown stems', async () => {
    controller.dispose();

    const crossroads = GameConfig.audio.act2CrossroadsAmbient;
    controller = new AdaptiveMusicLayerController(audioManager, {
      layers: [
        {
          id: 'ambient_base',
          trackId: crossroads.trackId,
          baseVolume: crossroads.baseVolume,
          trackUrl: crossroads.trackUrl,
        },
        {
          id: 'tension_layer',
          trackId: crossroads.tensionTrackId,
          baseVolume: crossroads.tensionBaseVolume,
          trackUrl: crossroads.tensionTrackUrl,
        },
        {
          id: 'combat_layer',
          trackId: crossroads.combatTrackId,
          baseVolume: crossroads.combatBaseVolume,
          trackUrl: crossroads.combatTrackUrl,
        },
      ],
      states: crossroads.states,
      fadeDuration: 1.0,
    });

    const initialized = await controller.init();
    expect(initialized).toBe(true);

    const [ambientGain, tensionGain, combatGain] = context.__createdGains
      .slice(-3)
      .map((gain) => gain.gain);

    const expectCrossroadsMix = (stateName, expectedVolumes) => {
      [ambientGain, tensionGain, combatGain].forEach((gain) => gain.linearRampToValueAtTime.mockClear());

      controller.setState(stateName, { fadeDuration: 1.0, force: true });

      const checkGain = (gain, expected) => {
        const calls = gain.linearRampToValueAtTime.mock.calls;
        expect(calls.length).toBeGreaterThan(0);
        const [target, when] = calls[calls.length - 1];
        expect(target).toBeCloseTo(expected, 5);
        expect(when).toBeCloseTo(context.currentTime + 1.0, 5);
      };

      checkGain(ambientGain, expectedVolumes.ambient);
      checkGain(tensionGain, expectedVolumes.tension);
      checkGain(combatGain, expectedVolumes.combat);
    };

    expectCrossroadsMix('decision', {
      ambient: crossroads.baseVolume * crossroads.states.decision.ambient_base,
      tension: crossroads.tensionBaseVolume * crossroads.states.decision.tension_layer,
      combat: crossroads.combatBaseVolume * crossroads.states.decision.combat_layer,
    });

    expectCrossroadsMix('tension', {
      ambient: crossroads.baseVolume * crossroads.states.tension.ambient_base,
      tension: crossroads.tensionBaseVolume * crossroads.states.tension.tension_layer,
      combat: crossroads.combatBaseVolume * crossroads.states.tension.combat_layer,
    });

    expectCrossroadsMix('alert', {
      ambient: crossroads.baseVolume * crossroads.states.alert.ambient_base,
      tension: crossroads.tensionBaseVolume * crossroads.states.alert.tension_layer,
      combat: crossroads.combatBaseVolume * crossroads.states.alert.combat_layer,
    });

    expectCrossroadsMix('ambient', {
      ambient: crossroads.baseVolume * crossroads.states.ambient.ambient_base,
      tension: crossroads.tensionBaseVolume * crossroads.states.ambient.tension_layer,
      combat: crossroads.combatBaseVolume * crossroads.states.ambient.combat_layer,
    });
  });
);
});
