import { DistrictTravelOverlay } from '../../../src/game/ui/DistrictTravelOverlay.js';
import { districtSlice } from '../../../src/game/state/slices/districtSlice.js';
import { storySlice } from '../../../src/game/state/slices/storySlice.js';
import { questSlice } from '../../../src/game/state/slices/questSlice.js';
import { factionSlice } from '../../../src/game/state/slices/factionSlice.js';
import { inventorySlice } from '../../../src/game/state/slices/inventorySlice.js';

class MockEventBus {
  constructor() {
    this._handlers = new Map();
  }

  on(event, handler) {
    if (!this._handlers.has(event)) {
      this._handlers.set(event, new Set());
    }
    const handlers = this._handlers.get(event);
    handlers.add(handler);
    return () => {
      handlers.delete(handler);
    };
  }

  emit(event, payload) {
    const handlers = this._handlers.get(event);
    if (!handlers) {
      return;
    }
    for (const handler of handlers) {
      handler(payload);
    }
  }
}

function createMockStore() {
  const districtState = districtSlice.reducer(undefined, { type: '@@INIT' });
  const storyState = storySlice.getInitialState();
  const questState = questSlice.getInitialState();
  const factionState = factionSlice.getInitialState();
  const inventoryState = inventorySlice.getInitialState();

  const corporateSpires = districtState.byId?.corporate_spires ?? null;
  if (corporateSpires) {
    corporateSpires.access.defaultUnlocked = false;
    corporateSpires.access.restrictions = [
      {
        id: 'corporate_checkpoint_lock',
        type: 'checkpoint',
        description: 'Executive checkpoint sealed pending clearance.',
        active: true,
        lastChangedAt: 1000,
        metadata: {},
      },
    ];
  }

  let state = {
    district: districtState,
    story: storyState,
    quest: questState,
    faction: factionState,
    inventory: inventoryState,
  };
  const subscribers = new Set();

  return {
    onUpdate(callback) {
      subscribers.add(callback);
      return () => {
        subscribers.delete(callback);
      };
    },
    select(selector, ...args) {
      return selector(state, ...args);
    },
    getState() {
      return state;
    },
    setState(nextState) {
      state = nextState;
      for (const subscriber of subscribers) {
        subscriber(state);
      }
    },
    state,
  };
}

function createOverlay({ playerEntityId = 1 } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  canvas.getContext = jest.fn(() => ({}));

  const eventBus = new MockEventBus();
  const store = createMockStore();

  const overlay = new DistrictTravelOverlay(canvas, eventBus, {
    store,
    playerEntityId,
    traversalNoticeDurationMs: 1000,
    traversalCooldownMs: 10,
  });

  overlay.init();
  return { overlay, eventBus };
}

describe('DistrictTravelOverlay traversal denial handling', () => {
  it('ignores traversal-denied events for non-player entities', () => {
    const { overlay, eventBus } = createOverlay({ playerEntityId: 42 });

    expect(overlay.visible).toBe(false);

    eventBus.emit('navigation:movement_blocked', {
      entityId: 99,
      reason: 'locked_surface',
      surfaceId: 'branch_walkway',
      surfaceTags: ['transition'],
    });

    expect(overlay.visible).toBe(false);
    expect(overlay.lastTraversalNotice).toBeNull();
  });

  it('shows overlay and records notice when player traversal is denied', () => {
    const { overlay, eventBus } = createOverlay({ playerEntityId: 7 });

    eventBus.emit('navigation:movement_blocked', {
      entityId: 7,
      reason: 'locked_surface',
      surfaceId: 'branch_walkway',
      surfaceTags: ['transition', 'checkpoint'],
      sceneId: 'act1_hollow_case',
    });

    expect(overlay.visible).toBe(true);
    expect(overlay.targetAlpha).toBe(1);

    const selectedEntry = overlay.getSelectedEntry();
    expect(selectedEntry).not.toBeNull();
    expect(selectedEntry.status?.accessible).toBe(false);

    expect(overlay.lastTraversalNotice).toEqual(
      expect.objectContaining({
        reason: 'locked_surface',
        surfaceId: 'branch_walkway',
      })
    );
    expect(overlay.lastTraversalNotice.surfaceTags).toEqual(
      expect.arrayContaining(['transition', 'checkpoint'])
    );
  });
});
