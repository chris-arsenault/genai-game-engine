import { InventoryOverlay } from '../../../src/game/ui/InventoryOverlay.js';

jest.mock('../../../src/game/utils/controlBindingPrompts.js', () => ({
  getBindingLabels: jest.fn((action, options = {}) => {
    switch (action) {
      case 'inventory':
        return ['Tab'];
      case 'quest':
        return ['Q'];
      case 'moveUp':
        return ['W'];
      case 'moveDown':
        return ['S'];
      default:
        if (options.fallbackLabel) {
          return [options.fallbackLabel];
        }
        return [];
    }
  }),
}));

describe('InventoryOverlay binding hints', () => {
  function createMockContext() {
    return {
      globalAlpha: 1,
      shadowColor: '',
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
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
      rect: jest.fn(),
      clip: jest.fn(),
      fill: jest.fn(),
      stroke: jest.fn(),
      fillRect: jest.fn(),
      strokeRect: jest.fn(),
      fillText: jest.fn(),
      measureText: jest.fn(() => ({ width: 160 })),
    };
  }

  function createOverlay(context) {
    const canvas = {
      width: 800,
      height: 600,
      getContext: () => context,
    };
    const eventBus = { on: jest.fn(), emit: jest.fn() };
    return new InventoryOverlay(canvas, eventBus);
  }

  it('renders dynamic binding hints sourced from control bindings', () => {
    const ctx = createMockContext();
    const overlay = createOverlay(ctx);
    overlay.visible = true;
    overlay.fadeAlpha = 1;
    overlay.items = [];

    overlay.render(ctx);

    const renderedHints = ctx.fillText.mock.calls
      .map((call) => call[0])
      .filter((text) => typeof text === 'string' && text.includes('Close:'));

    expect(renderedHints.length).toBeGreaterThan(0);
    expect(renderedHints[0]).toContain('Close: Tab');
    expect(renderedHints[0]).toContain('Scroll: W/S');
    expect(renderedHints[0]).toContain('Quest Log: Q');
  });
});
