import { SaveLoadOverlay } from '../../../src/game/ui/SaveLoadOverlay.js';
import { EventBus } from '../../../src/engine/events/EventBus.js';

function createStubCanvas(width = 1280, height = 720) {
  const ctx = {
    save: jest.fn(),
    restore: jest.fn(),
    fillRect: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    quadraticCurveTo: jest.fn(),
    closePath: jest.fn(),
    fill: jest.fn(),
    stroke: jest.fn(),
    fillText: jest.fn(),
    measureText: jest.fn(() => ({ width: 42 })),
    strokeStyle: '#000',
    fillStyle: '#000',
    font: '12px sans-serif',
    textAlign: 'left',
    textBaseline: 'top',
    lineWidth: 1,
    shadowColor: '#000',
    shadowBlur: 0,
    globalAlpha: 1,
  };

  return {
    width,
    height,
    getContext: jest.fn(() => ctx),
    _ctx: ctx,
  };
}

function createSaveManager({ manualSlots = [], autosave = null, saveSuccess = true, loadSuccess = true, maxSlots = 3 } = {}) {
  const manualEntries = manualSlots.map((entry) => ({ ...entry }));
  const manager = {
    config: {
      maxSaveSlots: maxSlots,
    },
    getSaveSlots: jest.fn(() => {
      const entries = [];
      if (autosave) {
        entries.push({ ...autosave, slot: 'autosave', slotType: 'auto' });
      }
      for (const entry of manualEntries) {
        entries.push({ ...entry, slotType: 'manual' });
      }
      return entries;
    }),
    getSaveSlotMetadata: jest.fn((slot) => {
      if (slot === 'autosave') {
        return autosave ? { ...autosave, slot: 'autosave' } : null;
      }
      const match = manualEntries.find((entry) => entry.slot === slot);
      return match ? { ...match } : null;
    }),
    saveGame: jest.fn((slotName) => {
      if (!saveSuccess) {
        return false;
      }
      const existingIndex = manualEntries.findIndex((entry) => entry.slot === slotName);
      const timestamp = Date.now();
      const payload = {
        slot: slotName,
        label: slotName,
        timestamp,
        playtime: 15_000,
        snapshotSource: 'unit-test',
      };

      if (existingIndex >= 0) {
        manualEntries[existingIndex] = payload;
      } else {
        manualEntries.push(payload);
      }
      return true;
    }),
    loadGame: jest.fn(() => loadSuccess),
  };

  return manager;
}

describe('SaveLoadOverlay', () => {
  let canvas;
  let eventBus;

  beforeEach(() => {
    canvas = createStubCanvas();
    eventBus = new EventBus();
  });

  afterEach(() => {
    canvas = null;
    eventBus = null;
  });

  test('emits overlay visibility events when toggled', () => {
    const saveManager = createSaveManager();
    const overlay = new SaveLoadOverlay(canvas, eventBus, { saveManager });
    const openedEvents = [];
    const closedEvents = [];

    eventBus.on('ui:overlay_opened', (payload) => openedEvents.push(payload));
    eventBus.on('ui:overlay_closed', (payload) => closedEvents.push(payload));

    overlay.init();
    overlay.show('unit-test');
    expect(openedEvents).toHaveLength(1);
    expect(openedEvents[0].overlayId).toBe('saveLoad');
    expect(openedEvents[0].source).toBe('unit-test');

    overlay.hide('unit-test-hide');
    expect(closedEvents).toHaveLength(1);
    expect(closedEvents[0].overlayId).toBe('saveLoad');
    expect(closedEvents[0].source).toBe('unit-test-hide');

    overlay.cleanup();
  });

  test('saving overwrites the selected manual slot', () => {
    const saveManager = createSaveManager({
      manualSlots: [
        {
          slot: 'slot1',
          label: 'slot1',
          timestamp: 10,
          playtime: 5_000,
          snapshotSource: 'legacy-managers',
        },
      ],
    });

    const overlay = new SaveLoadOverlay(canvas, eventBus, { saveManager });
    overlay.init();
    overlay.show('save-test');

    // Move selection to first manual slot (index 1: autosave -> manual)
    overlay.changeSelection(1);
    eventBus.emit('input:interact:pressed', { source: 'jest' });

    expect(saveManager.saveGame).toHaveBeenCalledWith('slot1');
    overlay.cleanup();
  });

  test('creating a new slot uses the first available slot index', () => {
    const saveManager = createSaveManager({ manualSlots: [], maxSlots: 3 });
    const overlay = new SaveLoadOverlay(canvas, eventBus, { saveManager });
    overlay.init();
    overlay.show('create-test');

    // Move selection to the "Create New Manual Slot" entry (index 1)
    overlay.changeSelection(1);
    eventBus.emit('input:interact:pressed', {});

    expect(saveManager.saveGame).toHaveBeenCalledWith('slot1');

    // Trigger another save to ensure next slot increments
    overlay.refreshSlots();
    overlay.changeSelection(1); // move from slot1 to create entry
    eventBus.emit('input:interact:pressed', {});

    expect(saveManager.saveGame).toHaveBeenLastCalledWith('slot2');

    overlay.cleanup();
  });

  test('loading a slot hides the overlay on success', () => {
    const saveManager = createSaveManager({
      manualSlots: [
        {
          slot: 'slot5',
          label: 'slot5',
          timestamp: 30,
          playtime: 60_000,
          snapshotSource: 'worldStateStore',
        },
      ],
      loadSuccess: true,
    });

    const overlay = new SaveLoadOverlay(canvas, eventBus, { saveManager });
    overlay.init();
    overlay.show('load-test');
    overlay.changeSelection(1);

    eventBus.emit('input:confirm:pressed', {});

    expect(saveManager.loadGame).toHaveBeenCalledWith('slot5');
    expect(overlay.visible).toBe(false);

    overlay.cleanup();
  });
});
