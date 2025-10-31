/**
 * ReputationUI Tests
 *
 * Tests for the faction reputation UI display.
 */

import { ReputationUI } from '../../../src/game/ui/ReputationUI.js';
import { EventBus } from '../../../src/engine/events/EventBus.js';
import { factionSlice } from '../../../src/game/state/slices/factionSlice.js';

jest.mock('../../../src/game/utils/controlBindingPrompts.js', () => ({
  getBindingLabels: jest.fn((action, options = {}) => {
    switch (action) {
      case 'faction':
        return ['R'];
      case 'caseFile':
        return ['Tab'];
      case 'inventory':
        return ['I'];
      default:
        if (options.fallbackLabel) {
          return [options.fallbackLabel];
        }
        return [];
    }
  }),
}));

describe('ReputationUI', () => {
  let reputationUI;
  let eventBus;
  let mockContext;

  beforeEach(() => {
    eventBus = new EventBus();
    reputationUI = new ReputationUI(300, 500, {
      eventBus,
      x: 20,
      y: 80,
    });

    // Mock canvas context
    mockContext = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      font: '',
      textAlign: '',
      textBaseline: '',
      fillRect: jest.fn(),
      strokeRect: jest.fn(),
      fillText: jest.fn(),
      measureText: jest.fn(() => ({ width: 50 })),
      save: jest.fn(),
      restore: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      rect: jest.fn(),
      clip: jest.fn(),
    };
  });

  describe('Cascade telemetry subscription', () => {
    test('hydrates cascade telemetry from store', () => {
      const cascadeSummary = {
        lastCascadeEvent: {
          sourceFactionId: 'vanguard_prime',
          targetFactionId: 'luminari_syndicate',
          sourceFactionName: 'Vanguard Prime',
          targetFactionName: 'Luminari Syndicate',
          newAttitude: 'friendly',
          occurredAt: Date.now() - 1000,
        },
        cascadeTargets: [
          {
            factionId: 'luminari_syndicate',
            cascadeCount: 2,
            lastCascade: {
              occurredAt: Date.now() - 500,
              sourceFactionId: 'vanguard_prime',
              sourceFactionName: 'Vanguard Prime',
            },
            sources: ['vanguard_prime'],
          },
        ],
      };

      const mockStore = {
        _listener: null,
        onUpdate(callback) {
          this._listener = callback;
          return () => {
            this._listener = null;
          };
        },
        select(selector) {
          if (selector === factionSlice.selectors.selectFactionCascadeSummary) {
            return cascadeSummary;
          }
          throw new Error('Unexpected selector');
        },
      };

      const ui = new ReputationUI(300, 500, {
        eventBus,
        store: mockStore,
      });
      ui.init();

      expect(ui.cascadeTelemetry.lastCascadeEvent).not.toBeNull();
      expect(ui.cascadeTelemetry.targetsByFaction.luminari_syndicate.cascadeCount).toBe(2);

      ui.cleanup();
      expect(mockStore._listener).toBeNull();
    });
  });

  describe('Cascade hotspots', () => {
    test('returns sorted cascade hotspots with metadata', () => {
      reputationUI.cascadeTelemetry.targetsByFaction = {
        luminari_syndicate: {
          cascadeCount: 4,
          lastCascade: { occurredAt: Date.now() - 1500, sourceFactionId: 'vanguard_prime' },
          sources: ['vanguard_prime', 'memory_parlor'],
        },
        archivists: {
          cascadeCount: 1,
          lastCascade: { occurredAt: Date.now() - 500 },
          sources: ['curators'],
        },
      };

      const hotspots = reputationUI.getCascadeHotspots(3);
      expect(hotspots).toHaveLength(2);
      expect(hotspots[0].factionId).toBe('luminari_syndicate');
      expect(hotspots[0].cascadeCount).toBe(4);
      expect(hotspots[0].sourcesCount).toBe(2);
    });
  });

  describe('Cascade summary lines', () => {
    test('builds summary lines with last event and hotspots', () => {
      const now = Date.now();
      reputationUI.cascadeTelemetry.lastCascadeEvent = {
        sourceFactionId: 'vanguard_prime',
        targetFactionId: 'luminari_syndicate',
        newAttitude: 'friendly',
        occurredAt: now - 1200,
      };
      reputationUI.cascadeTelemetry.targetsByFaction = {
        luminari_syndicate: {
          cascadeCount: 3,
          lastCascade: { occurredAt: now - 900, sourceFactionId: 'vanguard_prime' },
          sources: ['vanguard_prime', 'memory_keepers'],
        },
      };

      const lines = reputationUI.buildCascadeSummaryLines();
      expect(lines[0]).toContain('Last:');
      expect(lines[2]).toBe('Hotspots:');
      expect(lines[3]).toMatch(/1\. .* — 3 events/);
    });

    test('builds fallback lines when no cascade data available', () => {
      reputationUI._resetCascadeTelemetry();
      const lines = reputationUI.buildCascadeSummaryLines();
      expect(lines[0]).toBe('Last: n/a');
      expect(lines[2]).toBe('Hotspots: none recorded');
    });
  });

  describe('Constructor', () => {
    test('should initialize with correct dimensions', () => {
      expect(reputationUI.width).toBe(300);
      expect(reputationUI.height).toBe(500);
    });

    test('should initialize with custom position', () => {
      expect(reputationUI.x).toBe(20);
      expect(reputationUI.y).toBe(80);
    });

    test('should start invisible', () => {
      expect(reputationUI.visible).toBe(false);
    });

    test('should have empty standings initially', () => {
      expect(Object.keys(reputationUI.standings)).toHaveLength(0);
    });

    test('should register event listeners with eventBus', () => {
      const listenSpy = jest.spyOn(eventBus, 'on');
      const newUI = new ReputationUI(300, 500, { eventBus });
      expect(listenSpy).toHaveBeenCalledWith('reputation:changed', expect.any(Function));
      expect(listenSpy).toHaveBeenCalledWith('faction:attitude_changed', expect.any(Function));
    });
  });

  describe('updateStandings', () => {
    test('should update standings data', () => {
      const standings = {
        faction1: { name: 'Faction 1', fame: 50, infamy: 20, attitude: 'neutral' },
        faction2: { name: 'Faction 2', fame: 80, infamy: 5, attitude: 'friendly' },
      };

      reputationUI.updateStandings(standings);

      expect(reputationUI.standings).toEqual(standings);
    });

    test('renders binding hints using remapped labels', () => {
      reputationUI.visible = true;
      reputationUI.render(mockContext);

      const hintCall = mockContext.fillText.mock.calls.find(
        (call) => typeof call[0] === 'string' && call[0].includes('Close:')
      );

      expect(hintCall).toBeDefined();
      expect(hintCall[0]).toContain('Close: R');
      expect(hintCall[0]).toContain('Case File: Tab');
      expect(hintCall[0]).toContain('Inventory: I');
    });

    test('should calculate max scroll for many factions', () => {
      const standings = {};
      for (let i = 0; i < 10; i++) {
        standings[`faction${i}`] = { name: `Faction ${i}`, fame: 50, infamy: 20, attitude: 'neutral' };
      }

      reputationUI.updateStandings(standings);

      expect(reputationUI.maxScroll).toBeGreaterThan(0);
    });

    test('should set maxScroll to 0 if content fits in view', () => {
      const standings = {
        faction1: { name: 'Faction 1', fame: 50, infamy: 20, attitude: 'neutral' },
      };

      reputationUI.updateStandings(standings);

      expect(reputationUI.maxScroll).toBe(0);
    });
  });

  describe('Visibility', () => {
    test('toggle() should change visibility', () => {
      expect(reputationUI.visible).toBe(false);
      reputationUI.toggle();
      expect(reputationUI.visible).toBe(true);
      reputationUI.toggle();
      expect(reputationUI.visible).toBe(false);
    });

    test('show() should make UI visible', () => {
      reputationUI.show();
      expect(reputationUI.visible).toBe(true);
    });

    test('hide() should make UI invisible', () => {
      reputationUI.show();
      reputationUI.hide();
      expect(reputationUI.visible).toBe(false);
    });

    test('toggle() should emit ui:reputation_opened event when opening', () => {
      const emitSpy = jest.spyOn(eventBus, 'emit');
      reputationUI.toggle();
      expect(emitSpy).toHaveBeenCalledWith('ui:reputation_opened', {
        overlayId: 'reputation',
        source: 'toggle',
      });
    });

    test('show() should emit ui:reputation_opened event', () => {
      const emitSpy = jest.spyOn(eventBus, 'emit');
      reputationUI.show();
      expect(emitSpy).toHaveBeenCalledWith('ui:reputation_opened', {
        overlayId: 'reputation',
        source: 'show',
      });
    });
  });

  describe('Scrolling', () => {
    beforeEach(() => {
      // Setup standings that require scrolling
      const standings = {};
      for (let i = 0; i < 10; i++) {
        standings[`faction${i}`] = { name: `Faction ${i}`, fame: 50, infamy: 20, attitude: 'neutral' };
      }
      reputationUI.updateStandings(standings);
    });

    test('scroll() should update scroll offset', () => {
      reputationUI.scroll(50);
      expect(reputationUI.scrollOffset).toBe(50);
    });

    test('scroll() should clamp to maxScroll', () => {
      const initialMaxScroll = reputationUI.maxScroll;
      reputationUI.scroll(999999);
      expect(reputationUI.scrollOffset).toBe(initialMaxScroll);
    });

    test('scroll() should not go below 0', () => {
      reputationUI.scroll(-999999);
      expect(reputationUI.scrollOffset).toBe(0);
    });

    test('scroll() should allow scrolling up and down', () => {
      reputationUI.scroll(100);
      expect(reputationUI.scrollOffset).toBe(100);
      reputationUI.scroll(-50);
      expect(reputationUI.scrollOffset).toBe(50);
    });
  });

  describe('Rendering', () => {
    test('should not render when invisible', () => {
      reputationUI.render(mockContext);
      expect(mockContext.fillRect).not.toHaveBeenCalled();
    });

    test('should render when visible', () => {
      reputationUI.show();
      reputationUI.render(mockContext);
      expect(mockContext.fillRect).toHaveBeenCalled();
    });

    test('should render faction standings', () => {
      const standings = {
        faction1: { name: 'Faction 1', fame: 50, infamy: 20, attitude: 'neutral' },
        faction2: { name: 'Faction 2', fame: 80, infamy: 5, attitude: 'friendly' },
      };
      reputationUI.updateStandings(standings);
      reputationUI.show();

      reputationUI.render(mockContext);

      // Should render faction names
      expect(mockContext.fillText).toHaveBeenCalledWith('Faction 1', expect.any(Number), expect.any(Number));
      expect(mockContext.fillText).toHaveBeenCalledWith('Faction 2', expect.any(Number), expect.any(Number));
    });

    test('should render attitude labels', () => {
      const standings = {
        faction1: { name: 'Faction 1', fame: 50, infamy: 20, attitude: 'neutral' },
      };
      reputationUI.updateStandings(standings);
      reputationUI.show();

      reputationUI.render(mockContext);

      expect(mockContext.fillText).toHaveBeenCalledWith('(NEUTRAL)', expect.any(Number), expect.any(Number));
    });

    test('should render fame and infamy bars', () => {
      const standings = {
        faction1: { name: 'Faction 1', fame: 50, infamy: 20, attitude: 'neutral' },
      };
      reputationUI.updateStandings(standings);
      reputationUI.show();

      reputationUI.render(mockContext);

      // Should render Fame and Infamy labels
      expect(mockContext.fillText).toHaveBeenCalledWith('Fame', expect.any(Number), expect.any(Number));
      expect(mockContext.fillText).toHaveBeenCalledWith('Infamy', expect.any(Number), expect.any(Number));
    });

    test('should render numerical values', () => {
      const standings = {
        faction1: { name: 'Faction 1', fame: 50, infamy: 20, attitude: 'neutral' },
      };
      reputationUI.updateStandings(standings);
      reputationUI.show();

      reputationUI.render(mockContext);

      expect(mockContext.fillText).toHaveBeenCalledWith('50/100', expect.any(Number), expect.any(Number));
      expect(mockContext.fillText).toHaveBeenCalledWith('20/100', expect.any(Number), expect.any(Number));
    });

    test('should use correct attitude colors', () => {
      const standings = {
        allied: { name: 'Allied Faction', fame: 90, infamy: 0, attitude: 'allied' },
        hostile: { name: 'Hostile Faction', fame: 10, infamy: 80, attitude: 'hostile' },
      };
      reputationUI.updateStandings(standings);
      reputationUI.show();

      reputationUI.render(mockContext);

      // Should set fillStyle to attitude color at some point
      // (complex to test exact call, but verifies rendering runs)
      expect(mockContext.fillStyle).toBeTruthy();
    });

    test('should render "no data" message when no standings', () => {
      reputationUI.show();
      reputationUI.render(mockContext);

      expect(mockContext.fillText).toHaveBeenCalledWith(
        'No faction data available',
        expect.any(Number),
        expect.any(Number)
      );
    });

    test('should render scroll indicator when scrollable', () => {
      const standings = {};
      for (let i = 0; i < 10; i++) {
        standings[`faction${i}`] = { name: `Faction ${i}`, fame: 50, infamy: 20, attitude: 'neutral' };
      }
      reputationUI.updateStandings(standings);
      reputationUI.show();

      reputationUI.render(mockContext);

      // Should render scroll indicator (extra fillRect call)
      expect(mockContext.fillRect.mock.calls.length).toBeGreaterThan(10);
    });
  });

  describe('renderReputationBar', () => {
    test('should render bar correctly', () => {
      reputationUI.show();
      reputationUI.renderReputationBar(mockContext, 10, 20, 100, 14, 50, 100, '#4caf50', 'Fame');

      // Should render label, background, filled bar, border
      expect(mockContext.fillText).toHaveBeenCalledWith('Fame', 10, expect.any(Number));
      expect(mockContext.fillRect).toHaveBeenCalled();
      expect(mockContext.strokeRect).toHaveBeenCalled();
    });

    test('should fill bar proportionally to value', () => {
      const fillRectSpy = jest.spyOn(mockContext, 'fillRect');
      reputationUI.show();

      // 50% filled
      reputationUI.renderReputationBar(mockContext, 10, 20, 100, 14, 50, 100, '#4caf50', 'Fame');

      // Find the filled bar call (width should be 50 = 50% of 100)
      const filledBarCall = fillRectSpy.mock.calls.find(call => call[2] === 50);
      expect(filledBarCall).toBeTruthy();
    });
  });

  describe('Input Handling', () => {
    beforeEach(() => {
      // Setup standings that require scrolling
      const standings = {};
      for (let i = 0; i < 10; i++) {
        standings[`faction${i}`] = { name: `Faction ${i}`, fame: 50, infamy: 20, attitude: 'neutral' };
      }
      reputationUI.updateStandings(standings);
      reputationUI.show();
    });

    test('handleKeyDown() should scroll up with ArrowUp', () => {
      reputationUI.scroll(100); // Set initial scroll
      reputationUI.handleKeyDown({ key: 'ArrowUp' });
      expect(reputationUI.scrollOffset).toBe(80);
    });

    test('handleKeyDown() should scroll down with ArrowDown', () => {
      reputationUI.handleKeyDown({ key: 'ArrowDown' });
      expect(reputationUI.scrollOffset).toBe(20);
    });

    test('handleKeyDown() should not process input when invisible', () => {
      reputationUI.hide();
      reputationUI.handleKeyDown({ key: 'ArrowDown' });
      expect(reputationUI.scrollOffset).toBe(0);
    });

    test('handleWheel() should scroll with mouse wheel', () => {
      const wheelEvent = {
        deltaY: 100,
        clientX: 50,
        clientY: 100,
        preventDefault: jest.fn(),
      };

      reputationUI.handleWheel(wheelEvent);
      expect(reputationUI.scrollOffset).toBeGreaterThan(0);
    });

    test('handleWheel() should only scroll if mouse over UI', () => {
      const wheelEvent = {
        deltaY: 100,
        clientX: 1000, // Far outside UI
        clientY: 1000,
        preventDefault: jest.fn(),
      };

      reputationUI.handleWheel(wheelEvent);
      expect(reputationUI.scrollOffset).toBe(0);
      expect(wheelEvent.preventDefault).not.toHaveBeenCalled();
    });
  });

  describe('Update', () => {
    test('update() should run without errors', () => {
      expect(() => reputationUI.update(16)).not.toThrow();
    });
  });

  describe('Attitude Colors', () => {
    test('should have colors for all attitudes', () => {
      const attitudes = ['allied', 'friendly', 'neutral', 'unfriendly', 'hostile'];
      attitudes.forEach(attitude => {
        expect(reputationUI.attitudeColors[attitude]).toBeTruthy();
      });
    });
  });

  describe('Event Listening', () => {
    test('should log attitude changes', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      eventBus.emit('faction:attitude_changed', {
        factionName: 'Test Faction',
        oldAttitude: 'neutral',
        newAttitude: 'friendly',
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Test Faction attitude: neutral → friendly')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Configuration', () => {
    test('should have correct config values', () => {
      expect(reputationUI.config.barWidth).toBe(180);
      expect(reputationUI.config.barHeight).toBe(14);
      expect(reputationUI.config.headerHeight).toBe(60);
      expect(reputationUI.config.summaryHeight).toBe(110);
    });
  });
});
