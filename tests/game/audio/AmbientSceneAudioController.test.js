import { AmbientSceneAudioController } from '../../../src/game/audio/AmbientSceneAudioController.js';

class StubEventBus {
  constructor() {
    this.listeners = new Map();
  }

  on(event, handler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    const handlers = this.listeners.get(event);
    handlers.push(handler);
    return () => {
      const index = handlers.indexOf(handler);
      if (index >= 0) {
        handlers.splice(index, 1);
      }
    };
  }

  emit(event, payload) {
    const handlers = this.listeners.get(event);
    if (!handlers) {
      return;
    }
    handlers.slice().forEach((handler) => handler(payload));
  }
}

describe('AmbientSceneAudioController', () => {
  let audioManager;
  let eventBus;
  let controller;
  let adaptiveController;
  let createAdaptiveController;

  beforeEach(() => {
    audioManager = {
      loadMusic: jest.fn(() => Promise.resolve()),
      playMusic: jest.fn(),
      setMusicVolume: jest.fn(),
      stopMusic: jest.fn(),
    };
    eventBus = new StubEventBus();
    adaptiveController = {
      init: jest.fn(() => Promise.resolve(true)),
      setState: jest.fn(() => true),
      dispose: jest.fn(),
      getState: jest.fn(() => 'ambient'),
    };
    createAdaptiveController = jest.fn(() => adaptiveController);
    controller = new AmbientSceneAudioController(audioManager, eventBus, {
      baseVolume: 0.5,
      scramblerBoost: 0.3,
      fadeDuration: 0.7,
      scramblerFadeDuration: 0.4,
      allowedAreas: ['memory_parlor_firewall'],
      createAdaptiveController,
    });
  });

  afterEach(() => {
    controller.dispose();
  });

  it('loads and plays ambient track on init', async () => {
    await controller.init();

    expect(createAdaptiveController).toHaveBeenCalled();
    expect(adaptiveController.init).toHaveBeenCalled();
    const [, adaptiveOptions] = createAdaptiveController.mock.calls[0];
    expect(adaptiveOptions.layers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'ambient_base',
          trackId: 'music-memory-parlor-ambient-001',
        }),
        expect.objectContaining({
          id: 'tension_layer',
          trackId: 'music-memory-parlor-tension-001',
          trackUrl: '/music/memory-parlor/goodnightmare-tension.wav',
        }),
        expect.objectContaining({
          id: 'combat_layer',
          trackId: 'music-memory-parlor-combat-001',
          trackUrl: '/music/memory-parlor/goodnightmare-combat.wav',
        }),
      ])
    );
    expect(adaptiveOptions.states.alert).toEqual(
      expect.objectContaining({
        ambient_base: expect.any(Number),
        tension_layer: expect.any(Number),
        combat_layer: expect.any(Number),
      })
    );
    expect(audioManager.playMusic).not.toHaveBeenCalled();
  });

  it('adjusts volume in response to scrambler events', async () => {
    await controller.init();
    adaptiveController.setState.mockClear();

    eventBus.emit('firewall:scrambler_activated', { areaId: 'memory_parlor_firewall' });
    expect(adaptiveController.setState).toHaveBeenCalledWith('alert', {
      fadeDuration: 0.4,
    });

    eventBus.emit('firewall:scrambler_expired');
    expect(adaptiveController.setState).toHaveBeenLastCalledWith('ambient', {
      fadeDuration: 0.4,
    });
  });

  it('cleans up listeners and stops music on dispose', async () => {
    await controller.init();
    controller.dispose();

    expect(audioManager.stopMusic).toHaveBeenCalledWith({ fadeDuration: 0.7 });
    expect(adaptiveController.dispose).toHaveBeenCalled();

    adaptiveController.setState.mockClear();
    eventBus.emit('firewall:scrambler_activated', { areaId: 'memory_parlor_firewall' });
    expect(adaptiveController.setState).not.toHaveBeenCalled();
  });

  it('falls back to single track playback when adaptive init fails', async () => {
    adaptiveController.init.mockResolvedValue(false);
    await controller.init();

    expect(audioManager.playMusic).toHaveBeenCalledWith(
      'music-memory-parlor-ambient-001',
      expect.objectContaining({
        volume: 0.5,
        loop: true,
        fadeDuration: 0.7,
      })
    );
  });
});
