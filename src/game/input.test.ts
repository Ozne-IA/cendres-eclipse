import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { InputHub } from './input';

function controller(t: TestContext) {
  const axes = [0, 0, 0, 0];
  const buttons = Array.from({ length: 17 }, () => ({ pressed: false }));
  const descriptor = Object.getOwnPropertyDescriptor(navigator, 'getGamepads');
  Object.defineProperty(navigator, 'getGamepads', {
    configurable: true,
    value: () => [{ axes, buttons }],
  });
  t.after(() => {
    if (descriptor) Object.defineProperty(navigator, 'getGamepads', descriptor);
    else Reflect.deleteProperty(navigator, 'getGamepads');
  });
  return {
    axes,
    press: (index: number) => { buttons[index].pressed = true; },
    release: (index: number) => { buttons[index].pressed = false; },
  };
}

test('menu commands use a direction or a button once per press, without gameplay actions', (t) => {
  const pad = controller(t);
  const input = new InputHub();

  pad.press(12);
  const up = input.poll(true);
  assert.equal(up.gamepadMenuCommand, 'up');
  assert.equal(up.heal, false);
  assert.equal(up.interact, false);
  assert.equal(input.poll(true).gamepadMenuCommand, undefined);
  pad.release(12);
  pad.axes[0] = -0.8;
  assert.equal(input.poll(true).gamepadMenuCommand, 'left');
  assert.equal(input.poll(true).gamepadMenuCommand, undefined);
  pad.press(0);
  const confirm = input.poll(true);
  assert.equal(confirm.gamepadMenuCommand, 'confirm');
  assert.equal(confirm.jump, false);
  assert.equal(confirm.interact, false);
});

test('touch controls: movement is held, actions fire once per press and clearAll releases everything', () => {
  const input = new InputHub();

  input.setVirtual('right', true);
  assert.equal(input.poll().moveX, 1);
  assert.equal(input.poll().moveX, 1);
  input.setVirtual('left', true);
  assert.equal(input.poll().moveX, 0);
  input.setVirtual('right', false);
  assert.equal(input.poll().moveX, -1);
  input.setVirtual('left', false);
  assert.equal(input.poll().moveX, 0);

  input.setVirtual('jump', true);
  const jump = input.poll();
  assert.equal(jump.jump, true);
  assert.equal(jump.jumpHeld, true);
  const stillHeld = input.poll();
  assert.equal(stillHeld.jump, false);
  assert.equal(stillHeld.jumpHeld, true);
  input.setVirtual('jump', false);
  const released = input.poll();
  assert.equal(released.jumpHeld, false);
  assert.equal(released.jumpReleased, true);

  input.setVirtual('attack', true);
  assert.equal(input.poll().attack, true);
  assert.equal(input.poll().attack, false);
  input.setVirtual('attack', true); // doigt posé deux fois de suite sans relâcher : pas de double coup
  assert.equal(input.poll().attack, false);
  input.setVirtual('attack', false);
  input.setVirtual('attack', true);
  assert.equal(input.poll().attack, true);

  input.setVirtual('parry', true);
  const parry = input.poll();
  assert.equal(parry.parry, true);
  assert.equal(parry.parryHeld, true);
  for (const control of ['dash', 'heavy', 'skill', 'heal', 'interact'] as const) {
    input.setVirtual(control, true);
    const state = input.poll();
    assert.equal(state[control], true, control);
    assert.equal(input.poll()[control], false, control);
  }

  input.setVirtual('left', true);
  input.clearAll();
  const cleared = input.poll();
  assert.equal(cleared.moveX, 0);
  assert.equal(cleared.parryHeld, false);
  assert.equal(input.lastInputMode, 'Tactile');
});

test('menu controls held during a transition cannot move or jump until released', (t) => {
  const pad = controller(t);
  const input = new InputHub();
  pad.axes[0] = 0.9;
  pad.press(0);
  assert.equal(input.poll(true).gamepadMenuCommand, 'confirm');
  input.blockHeldGamepad();

  pad.press(2);
  const playing = input.poll();
  assert.equal(playing.moveX, 0);
  assert.equal(playing.jumpHeld, false);
  assert.equal(playing.attack, true);
  pad.axes[0] = 0;
  pad.release(0);
  input.poll();

  pad.axes[0] = 0.9;
  pad.press(0);
  const fresh = input.poll();
  assert.equal(fresh.moveX, 1);
  assert.equal(fresh.jump, true);
  assert.equal(fresh.interact, true);
});
