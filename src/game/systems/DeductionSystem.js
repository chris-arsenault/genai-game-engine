/**
 * DeductionSystem - Manages deduction board integration and theory validation
 *
 * Coordinates between the DeductionBoard UI and CaseManager for theory validation.
 * Handles keyboard input for opening/closing the board and manages board state.
 *
 * @class DeductionSystem
 */
import { System } from '../../engine/ecs/System.js';

export class DeductionSystem extends System {
  /**
   * Create a DeductionSystem
   * @param {ComponentRegistry} componentRegistry - Component registry
   * @param {EventBus} eventBus - Event system
   * @param {CaseManager} caseManager - Case management system
   * @param {DeductionBoard} deductionBoard - Deduction board UI
   */
  constructor(componentRegistry, eventBus, caseManager, deductionBoard) {
    super(componentRegistry, eventBus, []); // No required components

    this.caseManager = caseManager;
    this.deductionBoard = deductionBoard;
    this.priority = 30; // Set priority

    // State
    this.isOpen = false;
    this.currentCase = null;

    // Setup event listeners
    this.setupEventListeners();
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for case activation
    this.eventBus.on('case:activated', (data) => {
      this.onCaseActivated(data);
    });

    // Listen for clue derivation
    this.eventBus.on('clue:derived', (data) => {
      this.onClueDerived(data);
    });

    // React to edge-triggered toggle input
    this.eventBus.on('input:deductionBoard:pressed', () => {
      this.toggleBoard('input:deductionBoard');
    });

    // Setup deduction board callbacks
    this.deductionBoard.onValidate = (theory) => {
      return this.validateTheory(theory);
    };

    this.deductionBoard.onClose = () => {
      this.closeBoard('ui:close');
    };
  }

  /**
   * Initialize system
   */
  init() {
    console.log('[DeductionSystem] Initialized');
  }

  /**
   * Update system
   * @param {number} deltaTime - Time since last update (ms)
   * @param {Array} entities - Entities to process
   */
  update(deltaTime, entities) {
    // System is event-driven, no per-frame updates needed
  }

  /**
   * Toggle deduction board open/closed
   */
  toggleBoard(source = 'toggle') {
    if (this.isOpen) {
      this.closeBoard(source);
    } else {
      this.openBoard(source);
    }
  }

  /**
   * Open deduction board
   */
  openBoard(source = 'toggle') {
    // Check if there's an active case
    const activeCase = this.caseManager.getActiveCase();
    if (!activeCase) {
      console.warn('[DeductionSystem] No active case to open board for');
      return;
    }

    // Load clues from case
    const clues = this._getCluesForCase(activeCase);
    if (clues.length === 0) {
      console.warn('[DeductionSystem] No clues available for deduction');
      return;
    }

    this.currentCase = activeCase;
    this.deductionBoard.loadClues(clues);
    this.deductionBoard.show(source);
    this.isOpen = true;

    this.eventBus.emit('deduction_board:opened', {
      caseId: activeCase.id,
      source
    });

    console.log('[DeductionSystem] Deduction board opened');
  }

  /**
   * Close deduction board
   */
  closeBoard(source = 'toggle') {
    this.deductionBoard.hide(source);
    this.isOpen = false;

    this.eventBus.emit('deduction_board:closed', {
      caseId: this.currentCase?.id,
      source
    });

    console.log('[DeductionSystem] Deduction board closed');
  }

  /**
   * Validate player's theory
   * @param {Object} theory - Player's theory {nodes, connections}
   * @returns {Object} Validation result {valid, accuracy, feedback}
   */
  validateTheory(theory) {
    if (!this.currentCase) {
      return {
        valid: false,
        accuracy: 0,
        feedback: 'No active case'
      };
    }

    // Use CaseManager to validate theory
    const result = this.caseManager.validateTheory(this.currentCase.id, theory);

    // Emit validation event
    this.eventBus.emit('theory:validated', {
      caseId: this.currentCase.id,
      accuracy: result.accuracy,
      valid: result.valid
    });

    if (result.valid) {
      console.log(`[DeductionSystem] Theory validated! Accuracy: ${(result.accuracy * 100).toFixed(0)}%`);
    } else {
      console.log(`[DeductionSystem] Theory incomplete. Accuracy: ${(result.accuracy * 100).toFixed(0)}%`);
    }

    return result;
  }

  /**
   * Handle case activation
   * @param {Object} data - Case activation data
   */
  onCaseActivated(data) {
    this.currentCase = this.caseManager.getCase(data.caseId);
    console.log(`[DeductionSystem] Case activated: ${data.title}`);
  }

  /**
   * Handle clue derivation
   * @param {Object} data - Clue derivation data
   */
  onClueDerived(data) {
    // If board is open, reload clues to show new one
    if (this.isOpen && this.currentCase && this.currentCase.id === data.caseId) {
      const clues = this._getCluesForCase(this.currentCase);
      this.deductionBoard.loadClues(clues);

      console.log(`[DeductionSystem] Board updated with new clue: ${data.clueId}`);
    }
  }

  /**
   * Get clues for a case from clue database
   * @private
   * @param {Object} caseFile - Case file object
   * @returns {Array} Array of clue objects
   */
  _getCluesForCase(caseFile) {
    const clues = [];

    // Get discovered clues from case
    for (const clueId of caseFile.discoveredClues) {
      const clueData = this.caseManager.clueDatabase.get(clueId);
      if (clueData) {
        clues.push({
          id: clueId,
          title: clueData.title,
          description: clueData.description,
          confidence: clueData.confidence
        });
      }
    }

    return clues;
  }

  /**
   * Get current board state
   * @returns {Object} Board state
   */
  getBoardState() {
    return {
      isOpen: this.isOpen,
      currentCase: this.currentCase?.id,
      theory: this.isOpen ? this.deductionBoard.getTheory() : null,
      accuracy: this.deductionBoard.theoryAccuracy
    };
  }

  /**
   * Cleanup
   */
  cleanup() {
    this.closeBoard();
    this.currentCase = null;
  }
}
