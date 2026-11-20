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
