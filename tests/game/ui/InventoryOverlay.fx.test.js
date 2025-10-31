import { InventoryOverlay } from '../../../src/game/ui/InventoryOverlay.js';

function createStubCanvas(width = 1280, height = 720) {
  return {
    width,
    height,
    getContext: jest.fn(() => ({
      save: jest.fn(),
      restore: jest.fn(),
      beginPath: jest.fn(),
      fill: jest.fn(),
      stroke: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      closePath: jest.fn(),
      fillRect: jest.fn(),
      strokeRect: jest.fn(),
      clearRect: jest.fn(),
      measureText: jest.fn(() => ({ width: 10 })),
      font: '',
      fillStyle: '',
      strokeStyle: '',
      globalAlpha: 1,
    })),
  };
}

describe('InventoryOverlay FX cue integration', () => {
  let canvas;
  let eventBus;
  let overlay;
  let emittedEvents;

  beforeEach(() => {
    canvas = createStubCanvas();
    emittedEvents = [];
    eventBus = {
      emit: jest.fn((eventType, data) => {
        emittedEvents.push({ eventType, data });
      }),
      on: jest.fn(),
      off: jest.fn(),
    };
    overlay = new InventoryOverlay(canvas, eventBus);
    overlay.applyInventoryState({
      items: [
        { id: 'item-1', name: 'Phoenix Lens', tags: ['evidence'], rarity: 'rare' },
        { id: 'item-2', name: 'Pulse Beacon', tags: ['gadget'], rarity: 'uncommon' },
      ],
    });
  });

  it('emits overlay reveal and dismiss cues', () => {
    overlay.show('fx-test');
    const reveal = emittedEvents.find(
      (entry) => entry.eventType === 'fx:overlay_cue' && entry.data?.effectId === 'inventoryOverlayReveal'
    );
    expect(reveal).toBeDefined();
    expect(reveal.data.context.source).toBe('fx-test');

    overlay.hide('fx-hide');
    const dismiss = emittedEvents.find(
      (entry) => entry.eventType === 'fx:overlay_cue' && entry.data?.effectId === 'inventoryOverlayDismiss'
    );
    expect(dismiss).toBeDefined();
    expect(dismiss.data.context.source).toBe('fx-hide');
  });

  it('emits item focus cues when selection changes', () => {
    overlay.show();
    emittedEvents.length = 0;

    overlay.changeSelection(1);

    const focusCue = emittedEvents.find(
      (entry) => entry.eventType === 'fx:overlay_cue' && entry.data?.effectId === 'inventoryItemFocus'
    );
    expect(focusCue).toBeDefined();
    expect(focusCue.data.context.itemId).toBe('item-2');
    expect(focusCue.data.context.index).toBe(1);
  });
});
