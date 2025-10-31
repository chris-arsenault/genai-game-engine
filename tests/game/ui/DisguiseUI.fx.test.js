import { DisguiseUI } from '../../../src/game/ui/DisguiseUI.js';

describe('DisguiseUI FX cues', () => {
  let eventBus;
  let overlay;

  beforeEach(() => {
    eventBus = {
      emit: jest.fn(),
      on: jest.fn(() => jest.fn()),
    };

    overlay = new DisguiseUI(320, 480, { eventBus });
    overlay.updateDisguises([
      { factionId: 'faction-alpha', name: 'Alpha', effectiveness: 0.8, warnings: ['Known by guards'] },
      { factionId: 'faction-beta', name: 'Beta', effectiveness: 0.6 },
    ]);
  });

  function getFxCalls() {
    return eventBus.emit.mock.calls.filter(([event]) => event === 'fx:overlay_cue').map(([, payload]) => payload);
  }

  it('emits reveal and selection cues when shown', () => {
    overlay.show('unit-test');

    const fxCalls = getFxCalls();
    expect(fxCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          effectId: 'disguiseOverlayReveal',
          context: expect.objectContaining({
            disguisesAvailable: 2,
            selectedIndex: 0,
          }),
        }),
        expect.objectContaining({
          effectId: 'disguiseSelectionFocus',
          context: expect.objectContaining({
            index: 0,
            factionId: 'faction-alpha',
          }),
        }),
      ]),
    );
  });

  it('emits selection cue when selection changes while visible', () => {
    overlay.show('unit-test');
    eventBus.emit.mockClear();

    overlay.selectNext('test-select');
    const fxCalls = getFxCalls();
    expect(fxCalls).toHaveLength(1);
    expect(fxCalls[0]).toMatchObject({
      effectId: 'disguiseSelectionFocus',
      context: expect.objectContaining({
        index: 1,
        total: 2,
        source: 'test-select',
      }),
    });
  });

  it('emits dismiss cue when hidden', () => {
    overlay.show('unit-test');
    eventBus.emit.mockClear();

    overlay.hide('unit-test');
    const fxCalls = getFxCalls();
    expect(fxCalls).toEqual([
      expect.objectContaining({
        effectId: 'disguiseOverlayDismiss',
        context: expect.objectContaining({ source: 'unit-test' }),
      }),
    ]);
  });

  it('emits equip and unequip cues', () => {
    overlay.show('unit-test');
    eventBus.emit.mockClear();

    overlay.equipSelected();
    overlay.unequipCurrent();

    const fxCalls = getFxCalls();
    expect(fxCalls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          effectId: 'disguiseEquipIntent',
          context: expect.objectContaining({
            factionId: 'faction-alpha',
            source: 'equipSelected',
          }),
        }),
        expect.objectContaining({
          effectId: 'disguiseUnequipIntent',
          context: expect.objectContaining({
            source: 'unequipCurrent',
          }),
        }),
      ]),
    );
  });
});
