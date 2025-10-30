import { SaveInspectorOverlay } from '../../../src/game/ui/SaveInspectorOverlay.js';
import { EventBus } from '../../../src/engine/events/EventBus.js';
import { factionSlice } from '../../../src/game/state/slices/factionSlice.js';
import { tutorialSlice } from '../../../src/game/state/slices/tutorialSlice.js';

jest.mock('../../../src/game/utils/controlBindingPrompts.js', () => ({
  getBindingLabels: jest.fn((action, options = {}) => {
    switch (action) {
      case 'saveInspector':
        return ['O'];
      case 'controlsMenu':
        return ['K'];
      case 'quest':
        return ['Q'];
      default:
        if (options.fallbackLabel) {
          return [options.fallbackLabel];
        }
        return [];
    }
  }),
}));

describe('SaveInspectorOverlay', () => {
  function createMockCanvas() {
    const context = {
      save: jest.fn(),
      restore: jest.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      font: '',
      textAlign: '',
      textBaseline: '',
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      quadraticCurveTo: jest.fn(),
      closePath: jest.fn(),
      fill: jest.fn(),
      stroke: jest.fn(),
      fillText: jest.fn(),
      measureText: jest.fn(() => ({ width: 140 })),
    };

    return {
      width: 1280,
      height: 720,
      getContext: () => context,
      _ctx: context,
    };
  }

  it('normalizes SaveManager telemetry into cascade and tutorial summaries', () => {
    const canvas = createMockCanvas();
    const eventBus = new EventBus();
    const now = Date.now();

    const saveManager = {
      getInspectorSummary: jest.fn(() => ({
        generatedAt: now,
        factions: {
          lastCascadeEvent: {
            sourceFactionId: 'vanguard_prime',
            targetFactionId: 'luminari_syndicate',
            newAttitude: 'friendly',
            occurredAt: now - 2500,
          },
          cascadeTargets: [
            {
              factionId: 'luminari_syndicate',
              cascadeCount: 3,
              lastCascade: {
                occurredAt: now - 1000,
                sourceFactionId: 'vanguard_prime',
                sourceFactionName: 'Vanguard Prime',
              },
              sources: ['vanguard_prime'],
            },
          ],
        },
        tutorial: {
          latestSnapshot: {
            event: 'step_completed',
            timestamp: now - 1200,
            stepIndex: 0,
            totalSteps: 2,
            completedSteps: ['movement'],
          },
          snapshots: [
            {
              event: 'step_started',
              timestamp: now - 1800,
              stepIndex: 0,
              totalSteps: 2,
              completedSteps: [],
            },
            {
              event: 'step_completed',
              timestamp: now - 1200,
              stepIndex: 0,
              totalSteps: 2,
              completedSteps: ['movement'],
            },
          ],
        },
      })),
    };

    const overlay = new SaveInspectorOverlay(canvas, eventBus, { saveManager });
    overlay.init();

    expect(saveManager.getInspectorSummary).toHaveBeenCalled();
    expect(overlay.summary.generatedAt).toBe(now);
    expect(overlay.summary.cascade.lastEvent).toBeDefined();
    expect(overlay.summary.cascade.topTargets[0].factionId).toBe('luminari_syndicate');
    expect(overlay.summary.tutorial.latest.eventLabel).toContain('Step Completed');
    expect(overlay.summary.tutorial.recent.length).toBeGreaterThan(0);
    expect(overlay.summary.metrics.cascadeEvents).toBe(3);
    expect(overlay.summary.metrics.cascadeTargets).toBe(1);
    expect(overlay.summary.metrics.tutorialSnapshots).toBe(2);
  });

  it('renders control binding hints for QA toggles', () => {
    const canvas = createMockCanvas();
    const eventBus = new EventBus();
    const overlay = new SaveInspectorOverlay(canvas, eventBus, {});
    overlay.visible = true;
    overlay.render();

    const hintCall = canvas._ctx.fillText.mock.calls.find(
      (call) => typeof call[0] === 'string' && call[0].includes('Close:')
    );

    expect(hintCall).toBeDefined();
    expect(hintCall[0]).toContain('Close: O');
    expect(hintCall[0]).toContain('Bindings: K');
    expect(hintCall[0]).toContain('Quest Log: Q');
  });

  it('falls back to world state store selectors when SaveManager summary unavailable', () => {
    const canvas = createMockCanvas();
    const eventBus = new EventBus();
    const now = Date.now();

    const factionState = factionSlice.reducer(undefined, { type: '@@INIT' });
    const tutorialState = tutorialSlice.reducer(undefined, { type: '@@INIT' });

    const mockState = {
      faction: {
        ...factionState,
        byId: {
          wraith_network: {
            id: 'wraith_network',
            cascadeCount: 4,
            lastCascade: {
              occurredAt: now - 1500,
              sourceFactionId: 'cipher_collective',
            },
            cascadeSources: ['cipher_collective', 'memory_keepers'],
          },
        },
        lastCascadeEvent: {
          sourceFactionId: 'cipher_collective',
          targetFactionId: 'wraith_network',
          targetFactionName: 'Wraith Network',
          newAttitude: 'hostile',
          occurredAt: now - 5000,
        },
      },
      tutorial: {
        ...tutorialState,
        promptHistorySnapshots: [
          {
            event: 'step_started',
            timestamp: now - 3000,
            stepIndex: 0,
            totalSteps: 3,
            promptHistory: [],
          },
          {
            event: 'prompt_shown',
            timestamp: now - 2000,
            stepIndex: 1,
            totalSteps: 3,
            promptHistory: ['movement'],
          },
        ],
      },
    };

    const store = {
      select: jest.fn((selector) => selector(mockState)),
    };

    const overlay = new SaveInspectorOverlay(canvas, eventBus, {
      saveManager: {
        getInspectorSummary: jest.fn(() => null),
      },
      store,
    });

    overlay.show();
    overlay.refreshSummary();

    expect(store.select).toHaveBeenCalledWith(factionSlice.selectors.selectFactionCascadeSummary);
    expect(store.select).toHaveBeenCalledWith(tutorialSlice.selectors.selectPromptHistorySnapshots);
    expect(store.select).toHaveBeenCalledWith(tutorialSlice.selectors.selectLatestPromptSnapshot);
    expect(overlay.summary.cascade.topTargets[0].factionId).toBe('wraith_network');
    expect(overlay.summary.metrics.cascadeEvents).toBe(4);
    expect(overlay.summary.metrics.tutorialSnapshots).toBe(2);
    expect(overlay.summary.tutorial.latest.relative).toMatch(/ago|just now/);
  });

  it('emits overlay visibility events when toggled', () => {
    const canvas = createMockCanvas();
    const eventBus = new EventBus();
    const spy = jest.fn();
    eventBus.on('ui:overlay_visibility_changed', spy);

    const overlay = new SaveInspectorOverlay(canvas, eventBus, {});

    overlay.toggle('test');
    expect(overlay.visible).toBe(true);
    overlay.toggle('test');
    expect(overlay.visible).toBe(false);
    expect(spy).toHaveBeenCalledTimes(2);
    const [firstCall, secondCall] = spy.mock.calls;
    expect(firstCall[0].overlayId).toBe('saveInspector');
    expect(firstCall[0].source).toBe('test');
    expect(secondCall[0].visible).toBe(false);
  });
});
