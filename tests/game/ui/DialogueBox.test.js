/**
 * DialogueBox Tests
 *
 * Tests for dialogue UI rendering, input handling, and typewriter effect
 */

import { DialogueBox } from '../../../src/game/ui/DialogueBox.js';
import { dialogueSlice } from '../../../src/game/state/slices/dialogueSlice.js';

function createMockStore(initialState) {
  let state = initialState;
  const listeners = new Set();

  return {
    onUpdate(callback) {
      listeners.add(callback);
      return () => listeners.delete(callback);
    },
    getState() {
      return state;
    },
    setState(nextState) {
      state = nextState;
      for (const callback of listeners) {
        callback(state);
      }
    },
    getListenerCount() {
      return listeners.size;
    },
  };
}

describe('DialogueBox', () => {
  let dialogueBox;
  let mockCtx;
  let mockEventBus;
  let emittedEvents;

  beforeEach(() => {
    emittedEvents = [];

    // Mock Canvas Context
    mockCtx = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      font: '',
      fillRect: jest.fn(),
      strokeRect: jest.fn(),
      fillText: jest.fn(),
      measureText: jest.fn((text) => ({ width: text.length * 8 }))
    };

    // Mock EventBus
    mockEventBus = {
      emit: jest.fn((eventType, data) => {
        emittedEvents.push({ eventType, data });
      }),
      on: jest.fn(),
      off: jest.fn()
    };

    dialogueBox = new DialogueBox(mockCtx, mockEventBus, {
      typewriterSpeed: 10, // Fast for testing
      enableTypewriter: true
    });
  });

  describe('Initialization', () => {
    it('should initialize as hidden', () => {
      expect(dialogueBox.visible).toBe(false);
      expect(dialogueBox.isVisible()).toBe(false);
    });

    it('should initialize with default config', () => {
      expect(dialogueBox.config.width).toBe(800);
      expect(dialogueBox.config.height).toBe(200);
      expect(dialogueBox.config.fontSize).toBe(16);
    });

    it('should accept custom config', () => {
      const customBox = new DialogueBox(mockCtx, mockEventBus, {
        width: 600,
        fontSize: 20
      });

      expect(customBox.config.width).toBe(600);
      expect(customBox.config.fontSize).toBe(20);
    });

    it('should setup input handlers', () => {
      expect(dialogueBox.keyHandlers.size).toBeGreaterThan(0);
      expect(dialogueBox.keyHandlers.has('Space')).toBe(true);
      expect(dialogueBox.keyHandlers.has('Enter')).toBe(true);
    });

    it('should subscribe to dialogue events', () => {
      expect(mockEventBus.on).toHaveBeenCalledWith('dialogue:started', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('dialogue:node_changed', expect.any(Function));
      expect(mockEventBus.on).toHaveBeenCalledWith('dialogue:ended', expect.any(Function));
    });
  });

  describe('Showing Dialogue', () => {
    const testData = {
      speaker: 'Officer Martinez',
      text: 'Hello, Detective.',
      choices: [
        { text: 'Greeting' },
        { text: 'Question' }
      ],
      canAdvance: false,
      hasChoices: true
    };

    it('should show dialogue with data', () => {
      dialogueBox.show(testData);

      expect(dialogueBox.visible).toBe(true);
      expect(dialogueBox.speaker).toBe('Officer Martinez');
      expect(dialogueBox.text).toBe('Hello, Detective.');
      expect(dialogueBox.choices.length).toBe(2);
    });

    it('should start typewriter effect when enabled', () => {
      dialogueBox.show(testData);

      expect(dialogueBox.isTyping).toBe(true);
      expect(dialogueBox.displayedText).toBe('');
      expect(dialogueBox.typewriterIndex).toBe(0);
    });

    it('should show full text when typewriter disabled', () => {
      const noTypewriterBox = new DialogueBox(mockCtx, mockEventBus, {
        enableTypewriter: false
      });

      noTypewriterBox.show(testData);

      expect(noTypewriterBox.isTyping).toBe(false);
      expect(noTypewriterBox.displayedText).toBe('Hello, Detective.');
    });

    it('should reset selected choice index', () => {
      dialogueBox.selectedChoiceIndex = 2;
      dialogueBox.show(testData);

      expect(dialogueBox.selectedChoiceIndex).toBe(0);
    });
  });

  describe('Hiding Dialogue', () => {
    it('should hide dialogue', () => {
      dialogueBox.show({
        speaker: 'NPC',
        text: 'Test',
        choices: []
      });

      dialogueBox.hide();

      expect(dialogueBox.visible).toBe(false);
      expect(dialogueBox.isTyping).toBe(false);
    });
  });

  describe('Store integration', () => {
    it('updates when world state changes', () => {
      const initialState = {
        dialogue: dialogueSlice.getInitialState(),
      };
      const store = createMockStore(initialState);
      const storeEventBus = {
        emit: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
      };
      const storeDialogueBox = new DialogueBox(mockCtx, storeEventBus, {
        store,
        enableTypewriter: false,
      });

      expect(storeEventBus.on).not.toHaveBeenCalled();
      expect(storeDialogueBox.visible).toBe(false);

      const activeState = {
        dialogue: {
          ...initialState.dialogue,
          active: {
            npcId: 'npc_alpha',
            dialogueId: 'dlg_intro',
            nodeId: 'node_1',
            speaker: 'NPC Alpha',
            text: 'Welcome detective.',
            choices: [{ id: 'c1', text: 'Thanks' }],
            canAdvance: true,
            hasChoices: true,
            startedAt: 100,
            updatedAt: 100,
          },
          historyByNpc: {
            npc_alpha: [
              {
                type: 'node',
                dialogueId: 'dlg_intro',
                nodeId: 'node_1',
                text: 'Welcome detective.',
                timestamp: 100,
              },
            ],
          },
          completedByNpc: {},
        },
      };

      store.setState(activeState);

      expect(storeDialogueBox.visible).toBe(true);
      expect(storeDialogueBox.speaker).toBe('NPC Alpha');
      expect(storeDialogueBox.text).toBe('Welcome detective.');
      expect(storeDialogueBox.choices).toHaveLength(1);

      store.setState({
        dialogue: {
          ...initialState.dialogue,
          historyByNpc: activeState.dialogue.historyByNpc,
          completedByNpc: {
            npc_alpha: {
              lastDialogueId: 'dlg_intro',
              lastNodeId: 'node_1',
              lastChoiceId: 'c1',
              completedAt: 200,
            },
          },
          active: null,
        },
      });

      expect(storeDialogueBox.visible).toBe(false);
      storeDialogueBox.cleanup();
      expect(store.getListenerCount()).toBe(0);
    });
  });

  describe('Typewriter Effect', () => {
    it('should advance typewriter on update', () => {
      dialogueBox.show({
        speaker: 'NPC',
        text: 'Test message.',
        choices: []
      });

      expect(dialogueBox.displayedText).toBe('');

      dialogueBox.update(50); // 5 characters at 10ms each

      expect(dialogueBox.displayedText.length).toBeGreaterThan(0);
      expect(dialogueBox.displayedText.length).toBeLessThanOrEqual('Test message.'.length);
    });

    it('should complete typewriter when all text shown', () => {
      dialogueBox.show({
        speaker: 'NPC',
        text: 'Hi',
        choices: []
      });

      dialogueBox.update(1000); // More than enough time

      expect(dialogueBox.displayedText).toBe('Hi');
      expect(dialogueBox.isTyping).toBe(false);
    });

    it('should skip typewriter effect', () => {
      dialogueBox.show({
        speaker: 'NPC',
        text: 'Long message here.',
        choices: []
      });

      expect(dialogueBox.isTyping).toBe(true);

      dialogueBox.skipTypewriter();

      expect(dialogueBox.displayedText).toBe('Long message here.');
      expect(dialogueBox.isTyping).toBe(false);
    });
  });

  describe('Input Handling - Choices', () => {
    beforeEach(() => {
      dialogueBox.show({
        speaker: 'NPC',
        text: 'Choose.',
        choices: [
          { text: 'Choice 1' },
          { text: 'Choice 2' },
          { text: 'Choice 3' }
        ],
        hasChoices: true,
        canAdvance: false
      });
      dialogueBox.skipTypewriter(); // Skip typing for tests
    });

    it('should select choice with number key', () => {
      dialogueBox.handleInput('Digit1');

      const choiceEvent = emittedEvents.find(e => e.eventType === 'dialogue:choice_requested');
      expect(choiceEvent).toBeDefined();
      expect(choiceEvent.data.choiceIndex).toBe(0);
    });

    it('should select choice with numpad key', () => {
      dialogueBox.handleInput('Numpad2');

      const choiceEvent = emittedEvents.find(e => e.eventType === 'dialogue:choice_requested');
      expect(choiceEvent).toBeDefined();
      expect(choiceEvent.data.choiceIndex).toBe(1);
    });

    it('should navigate choices with arrow keys', () => {
      expect(dialogueBox.selectedChoiceIndex).toBe(0);

      dialogueBox.handleInput('ArrowDown');
      expect(dialogueBox.selectedChoiceIndex).toBe(1);

      dialogueBox.handleInput('ArrowDown');
      expect(dialogueBox.selectedChoiceIndex).toBe(2);

      dialogueBox.handleInput('ArrowUp');
      expect(dialogueBox.selectedChoiceIndex).toBe(1);
    });

    it('should not navigate beyond bounds', () => {
      dialogueBox.handleInput('ArrowUp'); // At 0, should stay at 0
      expect(dialogueBox.selectedChoiceIndex).toBe(0);

      dialogueBox.selectedChoiceIndex = 2;
      dialogueBox.handleInput('ArrowDown'); // At max, should stay at max
      expect(dialogueBox.selectedChoiceIndex).toBe(2);
    });

    it('should confirm selected choice with Enter', () => {
      dialogueBox.selectedChoiceIndex = 1;
      dialogueBox.handleInput('Enter');

      const choiceEvent = emittedEvents.find(e => e.eventType === 'dialogue:choice_requested');
      expect(choiceEvent).toBeDefined();
      expect(choiceEvent.data.choiceIndex).toBe(1);
    });

    it('should confirm selected choice with Space', () => {
      dialogueBox.selectedChoiceIndex = 2;
      dialogueBox.handleInput('Space');

      const choiceEvent = emittedEvents.find(e => e.eventType === 'dialogue:choice_requested');
      expect(choiceEvent).toBeDefined();
      expect(choiceEvent.data.choiceIndex).toBe(2);
    });

    it('should not allow choice selection during typing', () => {
      dialogueBox.isTyping = true;

      dialogueBox.handleInput('Digit1');

      const choiceEvent = emittedEvents.find(e => e.eventType === 'dialogue:choice_requested');
      expect(choiceEvent).toBeUndefined();
    });
  });

  describe('Input Handling - Advance', () => {
    beforeEach(() => {
      dialogueBox.show({
        speaker: 'NPC',
        text: 'Continue...',
        choices: [],
        hasChoices: false,
        canAdvance: true
      });
      dialogueBox.skipTypewriter();
    });

    it('should advance dialogue with Space', () => {
      dialogueBox.handleInput('Space');

      const advanceEvent = emittedEvents.find(e => e.eventType === 'dialogue:advance_requested');
      expect(advanceEvent).toBeDefined();
    });

    it('should advance dialogue with Enter', () => {
      dialogueBox.handleInput('Enter');

      const advanceEvent = emittedEvents.find(e => e.eventType === 'dialogue:advance_requested');
      expect(advanceEvent).toBeDefined();
    });

    it('should skip typewriter instead of advancing when typing', () => {
      dialogueBox.isTyping = true;

      dialogueBox.handleInput('Space');

      const advanceEvent = emittedEvents.find(e => e.eventType === 'dialogue:advance_requested');
      expect(advanceEvent).toBeUndefined();
      expect(dialogueBox.isTyping).toBe(false);
    });
  });

  describe('Input Handling - Close', () => {
    it('should request close with Escape', () => {
      dialogueBox.show({
        speaker: 'NPC',
        text: 'Test',
        choices: []
      });

      dialogueBox.handleInput('Escape');

      const closeEvent = emittedEvents.find(e => e.eventType === 'dialogue:close_requested');
      expect(closeEvent).toBeDefined();
    });

    it('should not request close when hidden', () => {
      dialogueBox.visible = false;

      dialogueBox.handleInput('Escape');

      const closeEvent = emittedEvents.find(e => e.eventType === 'dialogue:close_requested');
      expect(closeEvent).toBeUndefined();
    });
  });

  describe('Rendering', () => {
    beforeEach(() => {
      dialogueBox.show({
        speaker: 'Officer Martinez',
        text: 'This is a test message.',
        choices: [
          { text: 'Choice 1' },
          { text: 'Choice 2' }
        ],
        hasChoices: true,
        canAdvance: false
      });
      dialogueBox.skipTypewriter();
    });

    it('should not render when hidden', () => {
      dialogueBox.hide();
      dialogueBox.render(1024, 768);

      expect(mockCtx.fillRect).not.toHaveBeenCalled();
    });

    it('should render background and border', () => {
      dialogueBox.render(1024, 768);

      expect(mockCtx.fillRect).toHaveBeenCalled();
      expect(mockCtx.strokeRect).toHaveBeenCalled();
    });

    it('should render speaker name', () => {
      dialogueBox.render(1024, 768);

      const speakerCall = mockCtx.fillText.mock.calls.find(
        call => call[0] === 'Officer Martinez'
      );
      expect(speakerCall).toBeDefined();
    });

    it('should render dialogue text', () => {
      dialogueBox.render(1024, 768);

      const textCalls = mockCtx.fillText.mock.calls;
      expect(textCalls.length).toBeGreaterThan(0);
    });

    it('should render choices when not typing', () => {
      dialogueBox.render(1024, 768);

      const choice1Call = mockCtx.fillText.mock.calls.find(
        call => call[0] && call[0].includes('Choice 1')
      );
      expect(choice1Call).toBeDefined();
    });

    it('should not render choices when typing', () => {
      dialogueBox.isTyping = true;
      dialogueBox.render(1024, 768);

      const choice1Call = mockCtx.fillText.mock.calls.find(
        call => call[0] && call[0].includes('Choice 1')
      );
      expect(choice1Call).toBeUndefined();
    });

    it('should render selection indicator', () => {
      dialogueBox.selectedChoiceIndex = 1;
      dialogueBox.render(1024, 768);

      const indicatorCall = mockCtx.fillText.mock.calls.find(
        call => call[0] === '>'
      );
      expect(indicatorCall).toBeDefined();
    });
  });

  describe('Text Wrapping', () => {
    it('should wrap long text', () => {
      const longText = 'This is a very long message that should be wrapped across multiple lines when rendered on the canvas.';
      const lines = dialogueBox.wrapText(longText, 200);

      expect(lines.length).toBeGreaterThan(1);
    });

    it('should not wrap short text', () => {
      const shortText = 'Short';
      const lines = dialogueBox.wrapText(shortText, 1000);

      expect(lines.length).toBe(1);
      expect(lines[0]).toBe('Short');
    });

    it('should handle empty text', () => {
      const lines = dialogueBox.wrapText('', 100);

      expect(lines.length).toBe(1);
      expect(lines[0]).toBe('');
    });
  });

  describe('Cleanup', () => {
    it('should cleanup state', () => {
      dialogueBox.show({
        speaker: 'NPC',
        text: 'Test',
        choices: []
      });

      dialogueBox.cleanup();

      expect(dialogueBox.visible).toBe(false);
      expect(dialogueBox.keyHandlers.size).toBe(0);
    });
  });
});
