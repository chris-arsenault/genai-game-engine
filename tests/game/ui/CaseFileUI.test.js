/**
 * CaseFileUI Tests
 */

jest.mock('../../../src/game/utils/controlBindingPrompts.js', () => ({
  getBindingLabels: jest.fn((action) => {
    switch (action) {
      case 'caseFile':
        return ['Tab'];
      case 'deductionBoard':
        return ['B'];
      case 'inventory':
        return ['I'];
      default:
        return [];
    }
  }),
}));

import { CaseFileUI } from '../../../src/game/ui/CaseFileUI.js';
import { getBindingLabels } from '../../../src/game/utils/controlBindingPrompts.js';

describe('CaseFileUI', () => {
  let caseFileUI;
  let mockCanvas;
  let mockCtx;

  beforeEach(() => {
    // Mock canvas context
    mockCtx = {
      save: jest.fn(),
      restore: jest.fn(),
      fillRect: jest.fn(),
      strokeRect: jest.fn(),
      fillText: jest.fn(),
      measureText: jest.fn((text) => ({ width: text.length * 8 })),
      beginPath: jest.fn(),
      rect: jest.fn(),
      clip: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      stroke: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      closePath: jest.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      font: '',
      textAlign: '',
      textBaseline: ''
    };

    caseFileUI = new CaseFileUI(400, 600);
  });

  describe('Instrumentation', () => {
    test('emits overlay visibility events with case metadata and FX cues', () => {
      const emit = jest.fn();
      const eventBus = { emit };
      caseFileUI = new CaseFileUI(400, 600, { eventBus });

      caseFileUI.loadCase({
        id: 'case-1',
        title: 'Instrumentation Test',
        objectives: [],
        collectedEvidence: new Set(),
        discoveredClues: new Set(),
        evidenceIds: new Set(),
        requiredClues: new Set()
      });

      caseFileUI.show('test');

      expect(emit).toHaveBeenCalledWith(
        'ui:overlay_visibility_changed',
        expect.objectContaining({
          overlayId: 'caseFile',
          visible: true,
          source: 'test',
          caseId: 'case-1'
        })
      );
      expect(emit).toHaveBeenCalledWith('ui:overlay_opened', expect.objectContaining({ overlayId: 'caseFile' }));
      expect(emit).toHaveBeenCalledWith('case_file:opened', { caseId: 'case-1' });
      expect(emit).toHaveBeenCalledWith(
        'fx:overlay_cue',
        expect.objectContaining({
          effectId: 'caseFileOverlayReveal',
          context: expect.objectContaining({ source: 'test' }),
        })
      );

      emit.mockClear();

      caseFileUI.hide('testHide');

      expect(emit).toHaveBeenCalledWith(
        'ui:overlay_visibility_changed',
        expect.objectContaining({
          overlayId: 'caseFile',
          visible: false,
          source: 'testHide',
          caseId: 'case-1'
        })
      );
      expect(emit).toHaveBeenCalledWith('ui:overlay_closed', expect.objectContaining({ overlayId: 'caseFile' }));
      expect(emit).toHaveBeenCalledWith('case_file:closed', { caseId: 'case-1' });
      expect(emit).toHaveBeenCalledWith(
        'fx:overlay_cue',
        expect.objectContaining({ effectId: 'caseFileOverlayDismiss' })
      );
    });
  });

  describe('Initialization', () => {
    test('should initialize with default properties', () => {
      expect(caseFileUI.width).toBe(400);
      expect(caseFileUI.height).toBe(600);
      expect(caseFileUI.visible).toBe(false);
      expect(caseFileUI.caseData).toBeNull();
    });

    test('should create ObjectiveList sub-component', () => {
      expect(caseFileUI.objectiveList).toBeDefined();
    });
  });

  describe('Loading Case Data', () => {
    test('should load case data correctly', () => {
      const mockCase = {
        id: 'case-1',
        title: 'The Missing Memory',
        description: 'A corporate executive has lost critical memories.',
        status: 'active',
        objectives: [
          { description: 'Find evidence in office', completed: false },
          { description: 'Interview witnesses', completed: true }
        ],
        collectedEvidence: new Set(['evidence-1', 'evidence-2']),
        discoveredClues: new Set(['clue-1']),
        evidenceIds: new Set(['evidence-1', 'evidence-2', 'evidence-3']),
        requiredClues: new Set(['clue-1', 'clue-2', 'clue-3']),
        accuracy: 0.75
      };

      caseFileUI.loadCase(mockCase);

      expect(caseFileUI.caseData).toBeDefined();
      expect(caseFileUI.caseData.title).toBe('The Missing Memory');
      expect(caseFileUI.caseData.collectedEvidence).toHaveLength(2);
      expect(caseFileUI.caseData.discoveredClues).toHaveLength(1);
      expect(caseFileUI.caseData.totalEvidence).toBe(3);
      expect(caseFileUI.caseData.totalClues).toBe(3);
    });

    test('should handle null case data', () => {
      caseFileUI.loadCase(null);
      expect(caseFileUI.caseData).toBeNull();
    });

    test('should reset scroll offsets when loading new case', () => {
      caseFileUI.evidenceScrollOffset = 50;
      caseFileUI.clueScrollOffset = 30;

      const mockCase = {
        id: 'case-1',
        title: 'Test Case',
        objectives: [],
        collectedEvidence: new Set(),
        discoveredClues: new Set(),
        evidenceIds: new Set(),
        requiredClues: new Set()
      };

      caseFileUI.loadCase(mockCase);

      expect(caseFileUI.evidenceScrollOffset).toBe(0);
      expect(caseFileUI.clueScrollOffset).toBe(0);
    });
  });

  describe('Updating Case Data', () => {
    beforeEach(() => {
      const mockCase = {
        id: 'case-1',
        title: 'Test Case',
        objectives: [{ description: 'Test', completed: false }],
        collectedEvidence: new Set(['evidence-1']),
        discoveredClues: new Set(),
        evidenceIds: new Set(['evidence-1', 'evidence-2']),
        requiredClues: new Set()
      };
      caseFileUI.loadCase(mockCase);
    });

    test('should update case data with partial updates', () => {
      caseFileUI.updateCase({
        collectedEvidence: ['evidence-1', 'evidence-2'],
        discoveredClues: ['clue-1']
      });

      expect(caseFileUI.caseData.collectedEvidence).toHaveLength(2);
      expect(caseFileUI.caseData.discoveredClues).toHaveLength(1);
    });

    test('should reload objectives if provided', () => {
      const spy = jest.spyOn(caseFileUI.objectiveList, 'loadObjectives');

      caseFileUI.updateCase({
        objectives: [
          { description: 'New objective', completed: false }
        ]
      });

      expect(spy).toHaveBeenCalled();
    });

    test('emits FX cues when new evidence, clues, or objectives arrive', () => {
      const emit = jest.fn();
      const eventBus = { emit };
      caseFileUI = new CaseFileUI(400, 600, { eventBus });

      caseFileUI.loadCase({
        id: 'case-2',
        title: 'FX Validation',
        objectives: [{ id: 'o1', description: 'Find clue', completed: false }],
        collectedEvidence: new Set(['e-1']),
        discoveredClues: new Set([]),
        evidenceIds: new Set(['e-1', 'e-2']),
        requiredClues: new Set(['c-1']),
      });

      emit.mockClear();

      caseFileUI.updateCase({
        collectedEvidence: ['e-1', 'e-2'],
        discoveredClues: ['c-1'],
        objectives: [
          { id: 'o1', description: 'Find clue', completed: true },
          { id: 'o2', description: 'Interview witness', completed: false },
        ],
      });

      const fxCalls = emit.mock.calls.filter(([eventName]) => eventName === 'fx:overlay_cue');
      expect(fxCalls).toEqual(
        expect.arrayContaining([
          expect.arrayContaining([
            'fx:overlay_cue',
            expect.objectContaining({ effectId: 'caseEvidencePulse' }),
          ]),
          expect.arrayContaining([
            'fx:overlay_cue',
            expect.objectContaining({ effectId: 'caseCluePulse' }),
          ]),
          expect.arrayContaining([
            'fx:overlay_cue',
            expect.objectContaining({ effectId: 'caseObjectivePulse' }),
          ]),
        ])
      );
    });

    test('should do nothing if no case loaded', () => {
      caseFileUI.caseData = null;
      caseFileUI.updateCase({ title: 'New Title' });
      expect(caseFileUI.caseData).toBeNull();
    });
  });

  describe('Visibility', () => {
    test('should show UI', () => {
      caseFileUI.show();
      expect(caseFileUI.visible).toBe(true);
    });

    test('should hide UI', () => {
      caseFileUI.visible = true;
      caseFileUI.hide();
      expect(caseFileUI.visible).toBe(false);
    });

    test('should toggle visibility', () => {
      expect(caseFileUI.visible).toBe(false);
      caseFileUI.toggle();
      expect(caseFileUI.visible).toBe(true);
      caseFileUI.toggle();
      expect(caseFileUI.visible).toBe(false);
    });
  });

  describe('Mouse Interaction', () => {
    beforeEach(() => {
      const mockCase = {
        id: 'case-1',
        title: 'Test Case',
        objectives: [],
        collectedEvidence: new Set(),
        discoveredClues: new Set(),
        evidenceIds: new Set(),
        requiredClues: new Set()
      };
      caseFileUI.loadCase(mockCase);
      caseFileUI.show();
    });

    test('should track mouse position', () => {
      caseFileUI.onMouseMove(100, 200);
      expect(caseFileUI.mouseX).toBe(100);
      expect(caseFileUI.mouseY).toBe(200);
    });

    test('should close when clicking close button', () => {
      const closeSpy = jest.fn();
      caseFileUI.onClose = closeSpy;

      const buttonX = caseFileUI.closeButton.x + 5;
      const buttonY = caseFileUI.closeButton.y + 5;

      const handled = caseFileUI.onMouseDown(buttonX, buttonY);

      expect(handled).toBe(true);
      expect(caseFileUI.visible).toBe(false);
      expect(closeSpy).toHaveBeenCalled();
    });

    test('should not handle clicks when hidden', () => {
      caseFileUI.hide();
      const handled = caseFileUI.onMouseDown(100, 100);
      expect(handled).toBe(false);
    });

    test('should return false for clicks outside close button', () => {
      const handled = caseFileUI.onMouseDown(50, 50);
      expect(handled).toBe(false);
    });
  });

  describe('Scrolling', () => {
    beforeEach(() => {
      const mockCase = {
        id: 'case-1',
        title: 'Test Case',
        objectives: [],
        collectedEvidence: new Set(['e1', 'e2', 'e3', 'e4', 'e5']),
        discoveredClues: new Set(['c1', 'c2', 'c3']),
        evidenceIds: new Set(),
        requiredClues: new Set()
      };
      caseFileUI.loadCase(mockCase);
      caseFileUI.show();
    });

    test('should scroll evidence section when mouse is over it', () => {
      const evidenceX = caseFileUI.x + 30;
      const evidenceY = caseFileUI.y + 290;

      caseFileUI.onScroll(1, evidenceX, evidenceY);
      expect(caseFileUI.evidenceScrollOffset).toBeGreaterThan(0);
    });

    test('should scroll clue section when mouse is over it', () => {
      const clueX = caseFileUI.x + 30;
      const clueY = caseFileUI.y + 430;

      caseFileUI.onScroll(1, clueX, clueY);
      expect(caseFileUI.clueScrollOffset).toBeGreaterThan(0);
    });

    test('should not scroll below zero', () => {
      caseFileUI.evidenceScrollOffset = 10;
      caseFileUI.onScroll(-2, caseFileUI.x + 30, caseFileUI.y + 290);
      expect(caseFileUI.evidenceScrollOffset).toBeGreaterThanOrEqual(0);
    });

    test('should not scroll when hidden', () => {
      caseFileUI.hide();
      const initialScroll = caseFileUI.evidenceScrollOffset;
      caseFileUI.onScroll(1, caseFileUI.x + 30, caseFileUI.y + 290);
      expect(caseFileUI.evidenceScrollOffset).toBe(initialScroll);
    });
  });

  describe('Rendering', () => {
    beforeEach(() => {
      const mockCase = {
        id: 'case-1',
        title: 'The Missing Memory',
        description: 'A corporate executive has lost critical memories.',
        status: 'active',
        objectives: [
          { description: 'Find evidence', completed: false },
          { description: 'Interview witnesses', completed: true }
        ],
        collectedEvidence: new Set(['evidence-1', 'evidence-2']),
        discoveredClues: new Set(['clue-1']),
        evidenceIds: new Set(['evidence-1', 'evidence-2', 'evidence-3']),
        requiredClues: new Set(['clue-1', 'clue-2']),
        accuracy: 0.5
      };
      caseFileUI.loadCase(mockCase);
      caseFileUI.show();
    });

    test('should not render when hidden', () => {
      caseFileUI.hide();
      caseFileUI.render(mockCtx);
      expect(mockCtx.save).not.toHaveBeenCalled();
    });

    test('should not render without case data', () => {
      caseFileUI.caseData = null;
      caseFileUI.render(mockCtx);
      expect(mockCtx.save).not.toHaveBeenCalled();
    });

    test('should render main UI elements', () => {
      caseFileUI.render(mockCtx);

      // Should save and restore context
      expect(mockCtx.save).toHaveBeenCalled();
      expect(mockCtx.restore).toHaveBeenCalled();

      // Should render background
      expect(mockCtx.fillRect).toHaveBeenCalled();

      // Should render border
      expect(mockCtx.strokeRect).toHaveBeenCalled();

      // Should render text
      expect(mockCtx.fillText).toHaveBeenCalled();
    });

    test('should render case title', () => {
      caseFileUI.render(mockCtx);

      const titleCall = mockCtx.fillText.mock.calls.find(
        call => call[0] === 'The Missing Memory'
      );
      expect(titleCall).toBeDefined();
    });

    test('renders binding hint text with dynamic labels', () => {
      caseFileUI.render(mockCtx);

      expect(getBindingLabels).toHaveBeenCalledWith(
        'caseFile',
        expect.objectContaining({ fallbackLabel: 'Tab' })
      );

      const hintCall = mockCtx.fillText.mock.calls.find(
        call => typeof call[0] === 'string' && call[0].includes('Close:')
      );
      expect(hintCall).toBeDefined();
      expect(hintCall[0]).toContain('Close: Tab');
    });

    test('should render section headers', () => {
      caseFileUI.render(mockCtx);

      const calls = mockCtx.fillText.mock.calls.map(call => call[0]);
      expect(calls).toContain('Objectives');
      expect(calls).toContain('Evidence');
      expect(calls).toContain('Clues');
    });

    test('should render progress bar', () => {
      caseFileUI.render(mockCtx);

      const progressCall = mockCtx.fillText.mock.calls.find(
        call => call[0] === 'Case Progress'
      );
      expect(progressCall).toBeDefined();
    });

    test('should render close button', () => {
      caseFileUI.render(mockCtx);

      // Should draw close button background
      const fillRectCalls = mockCtx.fillRect.mock.calls;
      const closeButtonCall = fillRectCalls.find(
        call => call[0] === caseFileUI.closeButton.x
      );
      expect(closeButtonCall).toBeDefined();
    });
  });

  describe('Progress Calculation', () => {
    test('should calculate overall progress correctly', () => {
      const mockCase = {
        id: 'case-1',
        title: 'Test',
        objectives: [
          { description: 'A', completed: true },
          { description: 'B', completed: true }
        ],
        collectedEvidence: new Set(['e1', 'e2']),
        discoveredClues: new Set(['c1']),
        evidenceIds: new Set(['e1', 'e2']),
        requiredClues: new Set(['c1', 'c2'])
      };

      caseFileUI.loadCase(mockCase);
      caseFileUI.show();
      caseFileUI.render(mockCtx);

      // Objectives: 2/2 = 100%
      // Evidence: 2/2 = 100%
      // Clues: 1/2 = 50%
      // Average: (100 + 100 + 50) / 3 = 83.33%

      const percentageCall = mockCtx.fillText.mock.calls.find(
        call => typeof call[0] === 'string' && call[0].includes('%')
      );

      expect(percentageCall).toBeDefined();
      expect(percentageCall[0]).toMatch(/83%/);
    });

    test('should handle zero division in progress calculation', () => {
      const mockCase = {
        id: 'case-1',
        title: 'Test',
        objectives: [],
        collectedEvidence: new Set(),
        discoveredClues: new Set(),
        evidenceIds: new Set(),
        requiredClues: new Set()
      };

      caseFileUI.loadCase(mockCase);
      caseFileUI.show();

      // Should not throw error
      expect(() => caseFileUI.render(mockCtx)).not.toThrow();
    });
  });

  describe('Performance', () => {
    test('should render in <16ms (60 FPS)', () => {
      const mockCase = {
        id: 'case-1',
        title: 'Performance Test',
        description: 'Testing render performance',
        objectives: Array(10).fill(null).map((_, i) => ({
          description: `Objective ${i}`,
          completed: i % 2 === 0
        })),
        collectedEvidence: new Set(Array(20).fill(null).map((_, i) => `evidence-${i}`)),
        discoveredClues: new Set(Array(15).fill(null).map((_, i) => `clue-${i}`)),
        evidenceIds: new Set(Array(30).fill(null).map((_, i) => `evidence-${i}`)),
        requiredClues: new Set(Array(20).fill(null).map((_, i) => `clue-${i}`))
      };

      caseFileUI.loadCase(mockCase);
      caseFileUI.show();

      const startTime = performance.now();
      caseFileUI.render(mockCtx);
      const elapsed = performance.now() - startTime;

      expect(elapsed).toBeLessThan(16);
    });
  });
});
