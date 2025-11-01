/**
 * @fileoverview Tests for DeductionBoardPointerController helper.
 */
import { DeductionBoardPointerController } from '../../../../src/game/ui/helpers/deductionBoardPointerController.js';

describe('DeductionBoardPointerController', () => {
  let canvas;
  let board;
  let controller;

  beforeAll(() => {
    if (typeof window.PointerEvent !== 'function') {
      // JSDOM can lack PointerEvent; provide minimal shim for tests.
      window.PointerEvent = class PointerEvent extends window.MouseEvent {
        constructor(type, params = {}) {
          super(type, params);
          Object.defineProperty(this, 'pointerId', {
            configurable: true,
            enumerable: true,
            value: params.pointerId ?? 1,
            writable: false
          });
          Object.defineProperty(this, 'button', {
            configurable: true,
            enumerable: true,
            value: params.button ?? 0,
            writable: false
          });
          Object.defineProperty(this, 'clientX', {
            configurable: true,
            enumerable: true,
            value: params.clientX ?? 0,
            writable: false
          });
          Object.defineProperty(this, 'clientY', {
            configurable: true,
            enumerable: true,
            value: params.clientY ?? 0,
            writable: false
          });
        }
      };
    }
  });

  beforeEach(() => {
    canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    canvas.getBoundingClientRect = jest.fn(() => ({
      left: 10,
      top: 20,
      width: 400,
      height: 300
    }));

    board = {
      visible: true,
      onMouseDown: jest.fn(),
      onMouseMove: jest.fn(),
      onMouseUp: jest.fn(),
      onMouseLeave: jest.fn(),
      onRightClick: jest.fn()
    };

    controller = new DeductionBoardPointerController(canvas, board);
  });

  afterEach(() => {
    controller.destroy();
  });

  it('routes pointerdown events with scaled coordinates', () => {
    const event = new window.PointerEvent('pointerdown', {
      clientX: 210,
      clientY: 170,
      button: 0,
      pointerId: 1,
      bubbles: true
    });

    canvas.dispatchEvent(event);

    const expectedX = (210 - 10) * (canvas.width / 400);
    const expectedY = (170 - 20) * (canvas.height / 300);

    expect(board.onMouseDown).toHaveBeenCalledWith(expectedX, expectedY);
    expect(board.onRightClick).not.toHaveBeenCalled();
  });

  it('routes right-click to onRightClick without triggering onMouseDown', () => {
    const event = new window.PointerEvent('pointerdown', {
      clientX: 150,
      clientY: 160,
      button: 2,
      pointerId: 5,
      bubbles: true
    });

    canvas.dispatchEvent(event);

    expect(board.onRightClick).toHaveBeenCalledTimes(1);
    expect(board.onMouseDown).not.toHaveBeenCalled();
  });

  it('ignores interactions while the board is hidden', () => {
    board.visible = false;

    const event = new window.PointerEvent('pointerdown', {
      clientX: 120,
      clientY: 180,
      button: 0,
      pointerId: 2,
      bubbles: true
    });

    canvas.dispatchEvent(event);

    expect(board.onMouseDown).not.toHaveBeenCalled();
    expect(board.onRightClick).not.toHaveBeenCalled();
  });

  it('routes pointer move and up events to the board', () => {
    const moveEvent = new window.PointerEvent('pointermove', {
      clientX: 240,
      clientY: 260,
      pointerId: 3,
      bubbles: true
    });
    canvas.dispatchEvent(moveEvent);

    const upEvent = new window.PointerEvent('pointerup', {
      clientX: 260,
      clientY: 280,
      pointerId: 3,
      button: 0,
      bubbles: true
    });
    canvas.dispatchEvent(upEvent);

    expect(board.onMouseMove).toHaveBeenCalled();
    expect(board.onMouseUp).toHaveBeenCalled();
  });

  it('cleans up listeners on destroy', () => {
    controller.destroy();

    const event = new window.PointerEvent('pointerdown', {
      clientX: 210,
      clientY: 170,
      button: 0,
      pointerId: 1,
      bubbles: true
    });

    canvas.dispatchEvent(event);

    expect(board.onMouseDown).not.toHaveBeenCalled();
  });

  it('invokes onMouseLeave when pointer leaves the canvas', () => {
    const leaveEvent = new window.PointerEvent('pointerleave', {
      pointerId: 4,
      bubbles: true
    });

    canvas.dispatchEvent(leaveEvent);

    expect(board.onMouseLeave).toHaveBeenCalled();
  });
});
