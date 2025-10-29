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

  beforeEach(() => {
    audioManager = {
      loadMusic: jest.fn(() => Promise.resolve()),
      playMusic: jest.fn(),
      setMusicVolume: jest.fn(),
      stopMusic: jest.fn(),
    };
    eventBus = new StubEventBus();
    controller = new AmbientSceneAudioController(audioManager, eventBus, {
      baseVolume: 0.5,
      scramblerBoost: 0.3,
      fadeDuration: 0.7,
      scramblerFadeDuration: 0.4,
      allowedAreas: ['memory_parlor_firewall'],
    });
  });

  afterEach(() => {
    controller.dispose();
  });

  it('loads and plays ambient track on init', async () => {
    await controller.init();

    expect(audioManager.loadMusic).toHaveBeenCalledWith(
      'music-memory-parlor-ambient-001',
      '/music/memory-parlor/goodnightmare.mp3',
      expect.objectContaining({
        loop: true,
        loopStart: 0,
        fadeDuration: 0.7,
      })
    );
    expect(audioManager.playMusic).toHaveBeenCalledWith(
      'music-memory-parlor-ambient-001',
      expect.objectContaining({
        volume: 0.5,
        loop: true,
        fadeDuration: 0.7,
      })
    );
  });

  it('adjusts volume in response to scrambler events', async () => {
    await controller.init();
    audioManager.setMusicVolume.mockClear();

    eventBus.emit('firewall:scrambler_activated', { areaId: 'memory_parlor_firewall' });
    expect(audioManager.setMusicVolume).toHaveBeenCalledWith(0.8, {
      fadeDuration: 0.4,
    });

    eventBus.emit('firewall:scrambler_expired');
    expect(audioManager.setMusicVolume).toHaveBeenLastCalledWith(0.5, {
      fadeDuration: 0.4,
    });
  });

  it('cleans up listeners and stops music on dispose', async () => {
    await controller.init();
    controller.dispose();

    expect(audioManager.stopMusic).toHaveBeenCalledWith({ fadeDuration: 0.7 });

    audioManager.setMusicVolume.mockClear();
    eventBus.emit('firewall:scrambler_activated', { areaId: 'memory_parlor_firewall' });
    expect(audioManager.setMusicVolume).not.toHaveBeenCalled();
  });
});
