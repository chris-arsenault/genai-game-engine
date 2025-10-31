import { DetectiveVisionOverlay } from '../../../src/game/ui/DetectiveVisionOverlay.js';

describe('DetectiveVisionOverlay', () => {
  let canvas;
  let eventBus;
  let handlers;
  let componentRegistry;

  beforeEach(() => {
    canvas = { width: 800, height: 600 };
    handlers = {};
    eventBus = {
      emit: jest.fn(),
      on: jest.fn((event, handler) => {
        handlers[event] = handlers[event] || [];
        handlers[event].push(handler);
        return () => {
          handlers[event] = handlers[event].filter((h) => h !== handler);
        };
      }),
    };

    const evidenceComponent = {
      hidden: true,
      requires: 'detective_vision',
      collected: false,
      title: 'Hidden Fragment',
    };
    const transformComponent = { x: 120, y: 220 };
    const spriteComponent = { width: 24, height: 24 };

    componentRegistry = {
      queryEntities: jest.fn(() => ['hidden_1']),
      getComponent: jest.fn((entityId, type) => {
        if (entityId !== 'hidden_1') {
          return null;
        }
        switch (type) {
          case 'Evidence':
            return evidenceComponent;
          case 'Transform':
            return transformComponent;
          case 'Sprite':
            return spriteComponent;
          default:
            return null;
        }
      }),
    };
  });

  function getHandler(eventName) {
    const list = handlers[eventName] || [];
    expect(list.length).toBeGreaterThan(0);
    return list[list.length - 1];
  }

  function createMockContext() {
    return {
      globalAlpha: 1,
      lineWidth: 0,
      fillStyle: '',
      strokeStyle: '',
      font: '',
      textAlign: '',
      textBaseline: '',
      save: jest.fn(),
      restore: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      quadraticCurveTo: jest.fn(),
      closePath: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      stroke: jest.fn(),
      fillRect: jest.fn(),
      strokeRect: jest.fn(),
      fillText: jest.fn(),
      measureText: jest.fn(() => ({ width: 120 })),
      translate: jest.fn(),
    };
  }

  it('updates status snapshot when receiving status events', () => {
    const overlay = new DetectiveVisionOverlay(canvas, eventBus, {
      worldToScreen: (x, y) => ({ x, y }),
    }, componentRegistry);
    overlay.init();

    getHandler('detective_vision:status')({
      active: true,
      energy: 3,
      energyMax: 5,
      cooldown: 4,
      cooldownMax: 10,
      canActivate: false,
      timestamp: 1234,
    });

    const status = overlay.getStatus();
    expect(status.active).toBe(true);
    expect(status.energy).toBe(3);
    expect(status.energyPercent).toBeCloseTo(0.6, 2);
    expect(status.cooldownPercent).toBeCloseTo(0.4, 2);
    expect(status.timestamp).toBe(1234);
    overlay.cleanup();
  });

  it('refreshes highlight targets upon activation', () => {
    const overlay = new DetectiveVisionOverlay(canvas, eventBus, {
      worldToScreen: (x, y) => ({ x, y }),
    }, componentRegistry, { highlightRefreshInterval: 0.1 });
    overlay.init();

    getHandler('detective_vision:activated')({ duration: 5 });
    expect(componentRegistry.queryEntities).toHaveBeenCalled();
    expect(overlay.highlightTargets.size).toBe(1);

    getHandler('evidence:collected')({ entityId: 'hidden_1' });
    expect(overlay.highlightTargets.size).toBe(0);
    overlay.cleanup();
  });

  it('renders energy gauge text based on latest status', () => {
    const overlay = new DetectiveVisionOverlay(
      canvas,
      eventBus,
      {
        worldToScreen: (x, y) => ({ x, y }),
      },
      componentRegistry
    );
    overlay.init();

    getHandler('detective_vision:status')({
      active: false,
      energy: 3,
      energyMax: 5,
      cooldown: 0,
      cooldownMax: 10,
      canActivate: true,
      timestamp: Date.now(),
    });

    overlay.update(0.5);

    const ctx = createMockContext();
    overlay.render(ctx);

    const energyLabels = ctx.fillText.mock.calls
      .map(([text]) => text)
      .filter((text) => text === '60%');

    expect(energyLabels.length).toBeGreaterThan(0);

    const gaugeWidth = overlay.options.gaugeStyle.width;
    const expectedEnergyWidth = (gaugeWidth - 6) * 0.6;
    const energyFillCall = ctx.fillRect.mock.calls.find(([, , width]) =>
      typeof width === 'number' && width < gaugeWidth && width > 0
    );
    expect(energyFillCall).toBeDefined();
    expect(energyFillCall[2]).toBeCloseTo(expectedEnergyWidth, 3);
    overlay.cleanup();
  });

  it('emits AR-007 particle cues while detective vision is active', () => {
    const overlay = new DetectiveVisionOverlay(
      canvas,
      eventBus,
      {
        worldToScreen: (x, y) => ({ x, y }),
      },
      componentRegistry,
      { highlightRefreshInterval: 0.1 }
    );
    overlay.init();

    getHandler('detective_vision:activated')({ duration: 5 });
    overlay.update(0.016);
    overlay.update(0.9);

    const overlayCues = eventBus.emit.mock.calls
      .filter(([event]) => event === 'fx:overlay_cue')
      .map(([, payload]) => payload.effectId);

    expect(overlayCues).toEqual(
      expect.arrayContaining([
        'detectiveVisionRainfall',
        'detectiveVisionNeonBloom',
        'detectiveVisionMemoryFragmentBurst',
      ])
    );
    overlay.cleanup();
  });
});
