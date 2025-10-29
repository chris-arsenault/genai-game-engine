/**
 * Tests for DeductionSystem
 */
import { DeductionSystem } from '../../../src/game/systems/DeductionSystem.js';
import { EventBus } from '../../../src/engine/events/EventBus.js';

describe('DeductionSystem', () => {
  let system;
  let mockComponentRegistry;
  let mockEventBus;
  let mockCaseManager;
  let mockDeductionBoard;

  beforeEach(() => {
    mockComponentRegistry = {
      getComponent: jest.fn(),
      getAllComponents: jest.fn()
    };

    mockEventBus = new EventBus();

    mockCaseManager = {
      getActiveCase: jest.fn(),
      getCase: jest.fn(),
      validateTheory: jest.fn(),
      clueDatabase: new Map()
    };

    mockDeductionBoard = {
      show: jest.fn(),
      hide: jest.fn(),
      loadClues: jest.fn(),
      getTheory: jest.fn(),
      theoryAccuracy: 0,
      onValidate: null,
      onClose: null
    };

    system = new DeductionSystem(mockComponentRegistry, mockEventBus, mockCaseManager, null);
    system.setDeductionBoard(mockDeductionBoard);
  });

  describe('Initialization', () => {
    it('should initialize with correct priority', () => {
      expect(system.priority).toBe(30);
    });

    it('should start with board closed', () => {
      expect(system.isOpen).toBe(false);
    });

    it('should have no current case initially', () => {
      expect(system.currentCase).toBe(null);
    });

    it('should set up board callbacks', () => {
      expect(mockDeductionBoard.onValidate).toBeDefined();
      expect(mockDeductionBoard.onClose).toBeDefined();
    });

    it('supports attaching deduction board after construction', () => {
      const newBoard = {
        show: jest.fn(),
        hide: jest.fn(),
        loadClues: jest.fn(),
        getTheory: jest.fn(),
        theoryAccuracy: 0,
        onValidate: null,
        onClose: null
      };

      system.setDeductionBoard(newBoard);

      expect(newBoard.onValidate).toBeDefined();
      expect(newBoard.onClose).toBeDefined();
    });
  });

  describe('Opening Board', () => {
    let mockCase;

    beforeEach(() => {
      mockCase = {
        id: 'case_1',
        title: 'Test Case',
        discoveredClues: new Set(['clue_1', 'clue_2'])
      };

      mockCaseManager.getActiveCase.mockReturnValue(mockCase);
      mockCaseManager.clueDatabase.set('clue_1', {
        title: 'Clue 1',
        description: 'Test clue 1',
        confidence: 0.9
      });
      mockCaseManager.clueDatabase.set('clue_2', {
        title: 'Clue 2',
        description: 'Test clue 2',
        confidence: 0.8
      });
    });

    it('should open board when active case exists', () => {
      system.openBoard();

      expect(mockDeductionBoard.show).toHaveBeenCalled();
      expect(system.isOpen).toBe(true);
    });

    it('should load clues into board', () => {
      system.openBoard();

      expect(mockDeductionBoard.loadClues).toHaveBeenCalled();
      const clues = mockDeductionBoard.loadClues.mock.calls[0][0];
      expect(clues.length).toBe(2);
    });

    it('should not open if no active case', () => {
      mockCaseManager.getActiveCase.mockReturnValue(null);

      system.openBoard();

      expect(mockDeductionBoard.show).not.toHaveBeenCalled();
      expect(system.isOpen).toBe(false);
    });

    it('should not open if no clues available', () => {
      const emptyCase = {
        id: 'case_2',
        title: 'Empty Case',
        discoveredClues: new Set()
      };
      mockCaseManager.getActiveCase.mockReturnValue(emptyCase);

      system.openBoard();

      expect(mockDeductionBoard.show).not.toHaveBeenCalled();
      expect(system.isOpen).toBe(false);
    });

    it('should emit opened event', () => {
      const openedSpy = jest.fn();
      mockEventBus.on('deduction_board:opened', openedSpy);

      system.openBoard();

      expect(openedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          caseId: 'case_1'
        })
      );
    });

    it('should set current case', () => {
      system.openBoard();

      expect(system.currentCase).toEqual(mockCase);
    });
  });

  describe('Closing Board', () => {
    const mockCase = {
      id: 'case_1',
      title: 'Test Case',
      discoveredClues: new Set(['clue_1'])
    };

    beforeEach(() => {
      mockCaseManager.getActiveCase.mockReturnValue(mockCase);
      mockCaseManager.clueDatabase.set('clue_1', {
        title: 'Clue 1',
        description: 'Test',
        confidence: 0.9
      });
    });

    it('should close board', () => {
      system.openBoard();
      system.closeBoard();

      expect(mockDeductionBoard.hide).toHaveBeenCalled();
      expect(system.isOpen).toBe(false);
    });

    it('should emit closed event', () => {
      const closedSpy = jest.fn();
      mockEventBus.on('deduction_board:closed', closedSpy);

      system.openBoard();
      system.closeBoard();

      expect(closedSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          caseId: 'case_1'
        })
      );
    });
  });

  it('gracefully handles board toggle when no UI attached', () => {
    const noBoardSystem = new DeductionSystem(mockComponentRegistry, mockEventBus, mockCaseManager, null);
    expect(() => noBoardSystem.openBoard()).not.toThrow();
    expect(() => noBoardSystem.closeBoard()).not.toThrow();
  });

  describe('Toggling Board', () => {
    const mockCase = {
      id: 'case_1',
      title: 'Test Case',
      discoveredClues: new Set(['clue_1'])
    };

    beforeEach(() => {
      mockCaseManager.getActiveCase.mockReturnValue(mockCase);
      mockCaseManager.clueDatabase.set('clue_1', {
        title: 'Clue 1',
        description: 'Test',
        confidence: 0.9
      });
    });

    it('should toggle from closed to open', () => {
      system.toggleBoard();

      expect(system.isOpen).toBe(true);
    });

    it('should toggle from open to closed', () => {
      system.openBoard();
      system.toggleBoard();

      expect(system.isOpen).toBe(false);
    });

    it('responds to input events emitted by the event bus', () => {
      mockEventBus.emit('input:deductionBoard:pressed', { action: 'deductionBoard' });
      expect(system.isOpen).toBe(true);

      mockEventBus.emit('input:deductionBoard:pressed', { action: 'deductionBoard' });
      expect(system.isOpen).toBe(false);
    });
  });

  describe('Theory Validation', () => {
    const mockCase = {
      id: 'case_1',
      title: 'Test Case'
    };

    const mockTheory = {
      nodes: ['clue_1', 'clue_2'],
      connections: [{ from: 'clue_1', to: 'clue_2', type: 'supports' }]
    };

    beforeEach(() => {
      system.currentCase = mockCase;
    });

    it('should validate theory via case manager', () => {
      const validationResult = {
        valid: true,
        accuracy: 0.85,
        feedback: 'Good theory'
      };

      mockCaseManager.validateTheory.mockReturnValue(validationResult);

      const result = system.validateTheory(mockTheory);

      expect(mockCaseManager.validateTheory).toHaveBeenCalledWith('case_1', mockTheory);
      expect(result).toEqual(validationResult);
    });

    it('should emit validation event', () => {
      const validatedSpy = jest.fn();
      mockEventBus.on('theory:validated', validatedSpy);

      mockCaseManager.validateTheory.mockReturnValue({
        valid: true,
        accuracy: 0.8,
        feedback: 'Test'
      });

      system.validateTheory(mockTheory);

      expect(validatedSpy).toHaveBeenCalledWith({
        caseId: 'case_1',
        accuracy: 0.8,
        valid: true
      });
    });

    it('should return invalid if no current case', () => {
      system.currentCase = null;

      const result = system.validateTheory(mockTheory);

      expect(result.valid).toBe(false);
      expect(result.accuracy).toBe(0);
    });
  });

  describe('Event Handling', () => {
    it('should handle case activated event', () => {
      const mockCase = {
        id: 'case_1',
        title: 'Test Case'
      };

      mockCaseManager.getCase.mockReturnValue(mockCase);

      mockEventBus.emit('case:activated', {
        caseId: 'case_1',
        title: 'Test Case'
      });

      expect(system.currentCase).toBe(mockCase);
    });

    it('should reload board when clue derived while open', () => {
      const mockCase = {
        id: 'case_1',
        title: 'Test Case',
        discoveredClues: new Set(['clue_1'])
      };

      mockCaseManager.getActiveCase.mockReturnValue(mockCase);
      mockCaseManager.clueDatabase.set('clue_1', {
        title: 'Clue 1',
        description: 'Test',
        confidence: 0.9
      });

      system.openBoard();
      mockDeductionBoard.loadClues.mockClear();

      // Add new clue
      mockCase.discoveredClues.add('clue_2');
      mockCaseManager.clueDatabase.set('clue_2', {
        title: 'Clue 2',
        description: 'Test 2',
        confidence: 0.8
      });

      mockEventBus.emit('clue:derived', {
        caseId: 'case_1',
        clueId: 'clue_2'
      });

      expect(mockDeductionBoard.loadClues).toHaveBeenCalled();
    });

    it('should not reload board when clue derived while closed', () => {
      mockEventBus.emit('clue:derived', {
        caseId: 'case_1',
        clueId: 'clue_2'
      });

      expect(mockDeductionBoard.loadClues).not.toHaveBeenCalled();
    });
  });

  describe('Board State', () => {
    it('should return board state when closed', () => {
      const state = system.getBoardState();

      expect(state.isOpen).toBe(false);
      expect(state.currentCase).toBeUndefined();
      expect(state.theory).toBe(null);
    });

    it('should return board state when open', () => {
      const mockCase = {
        id: 'case_1',
        title: 'Test Case',
        discoveredClues: new Set(['clue_1'])
      };

      const mockTheory = {
        nodes: ['clue_1'],
        connections: []
      };

      mockCaseManager.getActiveCase.mockReturnValue(mockCase);
      mockCaseManager.clueDatabase.set('clue_1', {
        title: 'Clue 1',
        description: 'Test',
        confidence: 0.9
      });

      mockDeductionBoard.getTheory.mockReturnValue(mockTheory);
      mockDeductionBoard.theoryAccuracy = 0.5;

      system.openBoard();

      const state = system.getBoardState();

      expect(state.isOpen).toBe(true);
      expect(state.currentCase).toBe('case_1');
      expect(state.theory).toEqual(mockTheory);
      expect(state.accuracy).toBe(0.5);
    });
  });

  describe('Cleanup', () => {
    it('should close board on cleanup', () => {
      const mockCase = {
        id: 'case_1',
        title: 'Test Case',
        discoveredClues: new Set(['clue_1'])
      };

      mockCaseManager.getActiveCase.mockReturnValue(mockCase);
      mockCaseManager.clueDatabase.set('clue_1', {
        title: 'Clue 1',
        description: 'Test',
        confidence: 0.9
      });

      system.openBoard();
      system.cleanup();

      expect(system.isOpen).toBe(false);
      expect(system.currentCase).toBe(null);
    });
  });
});
