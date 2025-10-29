import { AdaptiveMusic } from '../../../src/engine/audio/AdaptiveMusic.js';

describe('AdaptiveMusic', () => {
  let audioManager;
  let controller;
  let createController;

  beforeEach(() => {
    audioManager = {
      init: jest.fn(() => Promise.resolve(true)),
    };

    controller = {
      init: jest.fn(() => Promise.resolve(true)),
      getState: jest.fn(() => 'exploration'),
      setState: jest.fn(() => true),
      dispose: jest.fn(),
      states: {},
    };

    createController = jest.fn(() => controller);
  });

  it('initializes controller with provided layers and moods', async () => {
    const adaptive = new AdaptiveMusic(audioManager, {
      layers: [
        { id: 'ambient', trackId: 'ambient-track' },
        { id: 'tension', trackId: 'tension-track' },
      ],
      moods: {
        exploration: { ambient: 1, tension: 0 },
        alert: { ambient: 0.5, tension: 0.9 },
      },
      defaultMood: 'exploration',
      createController,
    });

    const initialized = await adaptive.init();

    expect(initialized).toBe(true);
    expect(createController).toHaveBeenCalledWith(
      audioManager,
      expect.objectContaining({
        layers: expect.arrayContaining([
          expect.objectContaining({ id: 'ambient', trackId: 'ambient-track' }),
          expect.objectContaining({ id: 'tension', trackId: 'tension-track' }),
        ]),
        states: expect.objectContaining({
          exploration: { ambient: 1, tension: 0 },
          alert: { ambient: 0.5, tension: 0.9 },
        }),
        defaultState: 'exploration',
      })
    );
    expect(adaptive.currentMood).toBe('exploration');
  });

  it('delegates setMood to controller and updates current mood', async () => {
    controller.setState.mockImplementation(() => {
      controller.getState.mockReturnValue('alert');
      return true;
    });

    const adaptive = new AdaptiveMusic(audioManager, {
      layers: [{ id: 'ambient', trackId: 'ambient-track' }],
      moods: {
        exploration: { ambient: 1 },
        alert: { ambient: 0.4 },
      },
      defaultMood: 'exploration',
      createController,
    });

    await adaptive.init();
    const result = adaptive.setMood('alert', { fadeDuration: 1.25 });

    expect(result).toBe(true);
    expect(controller.setState).toHaveBeenCalledWith('alert', { fadeDuration: 1.25 });
    expect(adaptive.currentMood).toBe('alert');
  });

  it('schedules automatic reversion when duration supplied', async () => {
    controller.setState.mockImplementation((state) => {
      controller.getState.mockReturnValue(state);
      return true;
    });

    const adaptive = new AdaptiveMusic(audioManager, {
      layers: [{ id: 'ambient', trackId: 'ambient-track' }],
      moods: {
        exploration: { ambient: 1 },
        alert: { ambient: 0.6 },
      },
      defaultMood: 'exploration',
      createController,
    });

    await adaptive.init();

    adaptive.setMood('alert', { duration: 2, revertTo: 'exploration', fadeDuration: 0.5 });

    controller.setState.mockClear();
    adaptive.update(1);
    expect(controller.setState).not.toHaveBeenCalled();

    adaptive.update(1.1);
    expect(controller.setState).toHaveBeenCalledWith(
      'exploration',
      expect.objectContaining({
        fadeDuration: 0.5,
        force: true,
      })
    );
    expect(adaptive.currentMood).toBe('exploration');
  });

  it('defines new moods at runtime and forwards to controller', async () => {
    const adaptive = new AdaptiveMusic(audioManager, {
      layers: [{ id: 'ambient', trackId: 'ambient-track' }],
      moods: {
        exploration: { ambient: 1 },
      },
      defaultMood: 'exploration',
      createController,
    });

    await adaptive.init();
    adaptive.defineMood('stealth', { ambient: 0.3 });

    expect(controller.states.stealth).toEqual({ ambient: 0.3 });
    expect(adaptive.getAvailableMoods()).toContain('stealth');
  });

  it('ignores mood changes when controller missing', () => {
    const adaptive = new AdaptiveMusic(null);
    expect(adaptive.setMood('any')).toBe(false);
  });
});
