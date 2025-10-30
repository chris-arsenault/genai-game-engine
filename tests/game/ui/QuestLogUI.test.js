jest.mock('../../../src/game/ui/helpers/questViewModel.js', () => ({
  buildQuestListByStatus: jest.fn(() => []),
  buildQuestViewModel: jest.fn(() => null),
  summarizeQuestProgress: jest.fn(() => ({
    completed: 0,
    total: 0,
    percentage: 0,
    label: '0%',
  })),
}));

jest.mock('../../../src/game/utils/controlBindingPrompts.js', () => ({
  getBindingLabels: jest.fn((action) => {
    switch (action) {
      case 'quest':
        return ['Q'];
      case 'caseFile':
        return ['Tab'];
      case 'inventory':
        return ['I'];
      default:
        return [];
    }
  }),
}));

import { QuestLogUI } from '../../../src/game/ui/QuestLogUI.js';
import { getBindingLabels } from '../../../src/game/utils/controlBindingPrompts.js';
import { buildQuestViewModel } from '../../../src/game/ui/helpers/questViewModel.js';

function createMockContext() {
  return {
    save: jest.fn(),
    restore: jest.fn(),
    fillRect: jest.fn(),
    strokeRect: jest.fn(),
    beginPath: jest.fn(),
    rect: jest.fn(),
    clip: jest.fn(),
    fillText: jest.fn(),
    measureText: jest.fn((text) => ({ width: text.length * 8 || 8 })),
    stroke: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    font: '',
    textAlign: '',
    textBaseline: '',
  };
}

describe('QuestLogUI', () => {
  let ui;
  let ctx;

  beforeEach(() => {
    ctx = createMockContext();
    ui = new QuestLogUI(640, 480, { questManager: {}, worldStateStore: {} });
    ui.visible = true;
  });

  test('renders binding hints with dynamic labels', () => {
    ui.render(ctx);

    expect(getBindingLabels).toHaveBeenCalledWith(
      'quest',
      expect.objectContaining({ fallbackLabel: 'Q' }),
    );

    const hintCall = ctx.fillText.mock.calls.find(
      ([text]) => typeof text === 'string' && text.includes('Close:'),
    );
    expect(hintCall).toBeDefined();
    expect(hintCall[0]).toContain('Close: Q');
  });

  test('emits FX cue when overlay visibility changes', () => {
    const emit = jest.fn();
    ui = new QuestLogUI(640, 480, { questManager: {}, worldStateStore: {}, eventBus: { emit } });

    ui.setVisible(true, 'hotkey');

    expect(emit).toHaveBeenCalledWith(
      'fx:overlay_cue',
      expect.objectContaining({
        effectId: 'questLogOverlayReveal',
        context: expect.objectContaining({ source: 'hotkey' }),
      }),
    );

    emit.mockClear();
    ui.setVisible(false, 'close');
    expect(emit).toHaveBeenCalledWith(
      'fx:overlay_cue',
      expect.objectContaining({ effectId: 'questLogOverlayDismiss' }),
    );
  });

  test('emits FX cue when switching tabs', () => {
    const emit = jest.fn();
    ui = new QuestLogUI(640, 480, { questManager: {}, worldStateStore: {}, eventBus: { emit } });

    ui.switchTab('completed');
    expect(emit).toHaveBeenCalledWith(
      'fx:overlay_cue',
      expect.objectContaining({ effectId: 'questLogTabPulse', context: expect.objectContaining({ tab: 'completed' }) }),
    );
  });

  test('emits FX cue when selecting a quest', () => {
    const emit = jest.fn();
    const quest = { id: 'q-1', status: 'active' };
    const questView = { id: 'q-1', status: 'active' };

    ui = new QuestLogUI(640, 480, { questManager: {}, worldStateStore: {}, eventBus: { emit } });

    buildQuestViewModel.mockReturnValue(questView);

    ui.selectQuest(quest);

    expect(emit).toHaveBeenCalledWith(
      'fx:overlay_cue',
      expect.objectContaining({
        effectId: 'questLogQuestSelected',
        context: expect.objectContaining({ questId: 'q-1' }),
      }),
    );
  });
});
