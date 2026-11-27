import { DEFAULT_KEY_BINDINGS } from './data';
import type { GamepadMenuCommand, InputState, KeyAction, KeyBindings } from './types';

export function formatKeyLabel(code: string): string {
  if (!code) return '?';
  if (code === 'Space') return 'Espace';
  if (code === 'ShiftLeft') return 'Shift G';
  if (code === 'ShiftRight') return 'Shift D';
  if (code === 'ControlLeft') return 'Ctrl G';
  if (code === 'ControlRight') return 'Ctrl D';
  if (code === 'Enter') return 'Entrée';
  if (code === 'ArrowUp') return '↑';
  if (code === 'ArrowDown') return '↓';
  if (code === 'ArrowLeft') return '←';
  if (code === 'ArrowRight') return '→';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  return code;
}

// These actions survive frames without a tick and fire once on the next gameplay tick.
const GAMEPLAY_EDGES = [
  'jump', 'jumpReleased', 'dash', 'attack', 'heavy', 'parry', 'skill', 'heal', 'interact',
] as const;

export class GameplayInputBuffer {
  private pending = new Set<(typeof GAMEPLAY_EDGES)[number]>();

  sample(input: InputState): void {
    for (const action of GAMEPLAY_EDGES) {
      if (input[action]) this.pending.add(action);
    }
  }

  consume(held: InputState): InputState {
    const input = { ...held };
    for (const action of GAMEPLAY_EDGES) input[action] = this.pending.has(action);
    this.clear();
    return input;
  }

  clear(): void {
    this.pending.clear();
  }
}

const TOUCH_ACTIONS = ['jump', 'dash', 'attack', 'heavy', 'parry', 'skill', 'heal', 'interact'] as const;

export class InputHub {
  private touchHeld = new Set<KeyAction>();
  private touchJust = new Set<KeyAction>();
  private touchDirectionIsLatest = false;

  private keys = new Set<string>();
  private keysJust = new Set<string>();
  private mouseHeld = new Set<number>();
  private mouseJust = new Set<number>();
  private prevJumpHeld = false;
  private prevPadButtons: boolean[] = [];
  private blockedPadButtons: boolean[] = [];
  private padAxesInUse = false;
  private blockedPadAxes = false;
  private previousMenuDirection: GamepadMenuCommand | null = null;
  private active = false;
  private bindings: KeyBindings = { ...DEFAULT_KEY_BINDINGS };
  public lastInputMode = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches
    ? 'Tactile' : 'Clavier / Souris';

  constructor(private readonly onClear?: () => void) {}

  setTouch(control: KeyAction, held: boolean): void {
    if (held) {
      if (this.touchHeld.has(control)) return;
      this.touchJust.add(control);
      if (control === 'left' || control === 'right') this.touchDirectionIsLatest = true;
      this.touchHeld.add(control);
      this.lastInputMode = 'Tactile';
    } else {
      this.touchHeld.delete(control);
    }
  }

  setKeyBindings(bindings: KeyBindings): void {
    this.bindings = { ...DEFAULT_KEY_BINDINGS, ...bindings };
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.defaultPrevented) return;
    const target = e.target instanceof Element ? e.target : null;
    const k = e.code;
    if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
    if ((k === 'Space' || k === 'Enter') && target?.closest('button, a[href]')) return;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(k)) {
      e.preventDefault();
    }
    // Repeats may arrive after a touch press or after pause/blur cleared the keyboard.
    if (e.repeat || this.keys.has(k)) return;
    if (k === this.bindings.left || k === this.bindings.right || k === 'ArrowLeft' || k === 'ArrowRight') {
      this.touchDirectionIsLatest = false;
    }
    this.keysJust.add(k);
    this.keys.add(k);
    this.lastInputMode = 'Clavier / Souris';
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  private onMouseDown = (e: MouseEvent & { sourceCapabilities?: { firesTouchEvents: boolean } }): void => {
    if (e.sourceCapabilities?.firesTouchEvents) return;
    const target = e.target as HTMLElement | null;
    if (target && target.closest('[data-ui-interactive="true"]')) return;
    this.lastInputMode = 'Clavier / Souris';
    if (!this.mouseHeld.has(e.button)) this.mouseJust.add(e.button);
    this.mouseHeld.add(e.button);
  };

  private onMouseUp = (e: MouseEvent): void => {
    this.mouseHeld.delete(e.button);
  };

  private onContextMenu = (e: MouseEvent): void => {
    const target = e.target as HTMLElement | null;
    if (target && target.closest('[data-ui-interactive="true"]')) return;
    e.preventDefault();
  };

  private onBlur = (): void => {
    this.clearAll();
  };

  private onVisibility = (): void => {
    if (document.hidden) this.clearAll();
  };

  mount(): void {
    if (this.active || typeof window === 'undefined') return;
    this.active = true;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('contextmenu', this.onContextMenu);
    window.addEventListener('blur', this.onBlur);
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  unmount(): void {
    if (!this.active || typeof window === 'undefined') return;
    this.active = false;
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('contextmenu', this.onContextMenu);
    window.removeEventListener('blur', this.onBlur);
    document.removeEventListener('visibilitychange', this.onVisibility);
  }

  clearAll(): void {
    this.touchHeld.clear();
    this.touchJust.clear();
    this.keys.clear();
    this.keysJust.clear();
    this.mouseHeld.clear();
    this.mouseJust.clear();
    this.prevJumpHeld = false;
    this.onClear?.();
  }

  blockHeldGamepad(): void {
    this.blockedPadButtons = this.prevPadButtons.slice();
    this.blockedPadAxes ||= this.padAxesInUse;
    this.previousMenuDirection = null;
  }

  rumble(weak = 0.25, strong = 0.45, durationMs = 110, enabled = true): void {
    if (!enabled || typeof navigator === 'undefined' || !navigator.getGamepads) return;
    try {
      const pads = navigator.getGamepads();
      const pad = pads ? Array.from(pads).find(Boolean) : undefined;
      const act = pad?.vibrationActuator as
        | { playEffect?: (type: string, params: Record<string, number>) => Promise<unknown> }
        | undefined;
      if (act && typeof act.playEffect === 'function') {
        void act.playEffect('dual-rumble', {
          startDelay: 0,
          duration: durationMs,
          weakMagnitude: Math.max(0, Math.min(1, weak)),
          strongMagnitude: Math.max(0, Math.min(1, strong)),
        });
      }
    } catch {
      // ignore unsupported gamepad rumble
    }
  }

  poll(inMenu = false): InputState {
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = pads ? Array.from(pads).find(Boolean) : undefined;
    const b = this.bindings;

    const inp: InputState = {
      moveX: 0,
      jump: false,
      jumpHeld: false,
      jumpReleased: false,
      dash: false,
      attack: false,
      heavy: false,
      parry: false,
      parryHeld: false,
      skill: false,
      heal: false,
      interact: false,
      pause: false,
      mute: false,
      down: false,
      upHeld: false,
    };

    if (this.keys.has(b.left) || this.keys.has('ArrowLeft')) inp.moveX -= 1;
    if (this.keys.has(b.right) || this.keys.has('ArrowRight')) inp.moveX += 1;
    if (this.keys.has(b.down) || this.keys.has('ArrowDown')) inp.down = true;
    if (this.keys.has(b.up) || this.keys.has('ArrowUp')) inp.upHeld = true;

    inp.jumpHeld = this.keys.has(b.jump) || this.keys.has(b.up) || this.keys.has('ArrowUp');
    if (this.keysJust.has(b.jump) || this.keysJust.has(b.up) || this.keysJust.has('ArrowUp')) {
      inp.jump = true;
    }
    if (this.keysJust.has(b.dash) || this.keysJust.has('ShiftRight')) inp.dash = true;
    if (this.keysJust.has(b.attack) || this.mouseJust.has(0)) inp.attack = true;
    if (this.keysJust.has(b.parry) || this.mouseJust.has(2)) inp.parry = true;
    inp.parryHeld = this.keys.has(b.parry) || this.mouseHeld.has(2);
    if (this.keysJust.has(b.heavy) || this.keysJust.has('KeyL')) inp.heavy = true;
    if (this.keysJust.has(b.skill || 'KeyC')) inp.skill = true;
    if (this.keysJust.has(b.heal)) inp.heal = true;
    if (this.keysJust.has(b.interact) || this.keysJust.has('Enter')) inp.interact = true;
    if (this.keysJust.has('Escape') || this.keysJust.has('KeyP')) inp.pause = true;
    if (this.keysJust.has('KeyM')) inp.mute = true;

    if (!inMenu) {
      for (const action of TOUCH_ACTIONS) inp[action] ||= this.touchJust.has(action);
      const touchX = Number(this.touchHeld.has('right')) - Number(this.touchHeld.has('left'));
      if (touchX && (!inp.moveX || this.touchDirectionIsLatest)) inp.moveX = touchX;
      inp.down ||= this.touchHeld.has('down');
      inp.upHeld ||= this.touchHeld.has('up');
      inp.jumpHeld ||= this.touchHeld.has('jump');
      inp.parryHeld ||= this.touchHeld.has('parry');
    }
    this.touchJust.clear();

    if (pad) {
      this.pollGamepad(pad, inp, inMenu);
    } else {
      this.prevPadButtons = [];
      this.blockedPadButtons = [];
      this.padAxesInUse = false;
      this.blockedPadAxes = false;
      this.previousMenuDirection = null;
    }

    inp.jumpReleased = (this.prevJumpHeld || inp.jump) && !inp.jumpHeld;
    this.prevJumpHeld = inp.jumpHeld;

    this.keysJust.clear();
    this.mouseJust.clear();
    return inp;
  }
  private pollGamepad(pad: Gamepad, inp: InputState, inMenu: boolean): void {
    const buttons = pad.buttons.map((button) => button.pressed);
    const rawX = pad.axes[0] ?? 0;
    const rawY = pad.axes[1] ?? 0;
    const stickStrength = Math.max(Math.abs(rawX), Math.abs(rawY));
    this.padAxesInUse = inMenu ? stickStrength >= 0.55 : Math.abs(rawX) > 0.22 || Math.abs(rawY) > 0.6;

    // A transition can happen while a confirm button or stick is still held.
    // Ignore only those held controls, leaving unrelated new presses available.
    if (this.blockedPadAxes && stickStrength <= 0.22) this.blockedPadAxes = false;
    const x = this.blockedPadAxes ? 0 : rawX;
    const y = this.blockedPadAxes ? 0 : rawY;
    for (let index = 0; index < this.blockedPadButtons.length; index++) {
      if (!buttons[index]) this.blockedPadButtons[index] = false;
    }
    const held = (index: number) => !!buttons[index] && !this.blockedPadButtons[index];
    const just = (index: number) => held(index) && !this.prevPadButtons[index];

    if (buttons.some((_, index) => held(index)) || (!this.blockedPadAxes && this.padAxesInUse)) {
      this.lastInputMode = 'Manette';
    }
    if (inMenu) {
      const direction = gamepadMenuDirection(held, x, y);
      if (just(1)) inp.gamepadMenuCommand = 'back';
      else if (just(8) || just(9)) inp.gamepadMenuCommand = 'pause';
      else if (just(0)) inp.gamepadMenuCommand = 'confirm';
      else if (direction && direction !== this.previousMenuDirection) inp.gamepadMenuCommand = direction;
      this.previousMenuDirection = direction;
    } else {
      this.previousMenuDirection = null;
      if (Math.abs(x) > 0.22) inp.moveX = Math.sign(x);
      if (held(14)) inp.moveX = -1;
      if (held(15)) inp.moveX = 1;
      if (held(13) || y > 0.6) inp.down = true;
      if (y < -0.6) inp.upHeld = true;

      if (held(0)) inp.jumpHeld = true;
      if (just(0)) {
        inp.jump = true;
        inp.interact = true;
      }
      if (just(1)) inp.dash = true;
      if (just(2)) inp.attack = true;
      if (just(3) || just(7)) inp.heavy = true;
      if (just(4) || just(6)) inp.parry = true;
      if (held(4) || held(6)) inp.parryHeld = true;
      if (just(5)) inp.skill = true;
      if (just(12)) {
        inp.heal = true;
        inp.interact = true;
      }
      if (just(8) || just(9)) inp.pause = true;
    }

    this.prevPadButtons = buttons;
  }
}


function gamepadMenuDirection(
  held: (button: number) => boolean,
  x: number,
  y: number
): GamepadMenuCommand | null {
  if (held(12)) return 'up';
  if (held(13)) return 'down';
  if (held(14)) return 'left';
  if (held(15)) return 'right';
  if (Math.max(Math.abs(x), Math.abs(y)) < 0.55) return null;
  if (Math.abs(x) >= Math.abs(y)) return x < 0 ? 'left' : 'right';
  return y < 0 ? 'up' : 'down';
}
