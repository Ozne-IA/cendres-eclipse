import type { InputState } from './types';

export class InputHub {
  private keys = new Set<string>();
  private keysJust = new Set<string>();
  private mouseHeld = new Set<number>();
  private mouseJust = new Set<number>();
  private prevJumpHeld = false;
  private prevPadButtons: boolean[] = [];
  private active = false;
  public lastInputMode = 'Clavier / Souris';

  private onKeyDown = (e: KeyboardEvent): void => {
    const k = e.code;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(k)) {
      e.preventDefault();
    }
    if (!this.keys.has(k)) this.keysJust.add(k);
    this.keys.add(k);
    this.lastInputMode = 'Clavier / Souris';
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  private onMouseDown = (e: MouseEvent): void => {
    const target = e.target as HTMLElement | null;
    if (target && target.closest('[data-ui-interactive="true"]')) return;
    if (!this.mouseHeld.has(e.button)) this.mouseJust.add(e.button);
    this.mouseHeld.add(e.button);
    this.lastInputMode = 'Clavier / Souris';
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
    this.keys.clear();
    this.keysJust.clear();
    this.mouseHeld.clear();
    this.mouseJust.clear();
    this.prevJumpHeld = false;
  }

  poll(): InputState {
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = pads ? Array.from(pads).find(Boolean) : undefined;

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
      heal: false,
      interact: false,
      pause: false,
      mute: false,
      down: false,
      upHeld: false,
    };

    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) inp.moveX -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) inp.moveX += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) inp.down = true;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) inp.upHeld = true;

    inp.jumpHeld = this.keys.has('Space') || this.keys.has('KeyW') || this.keys.has('ArrowUp');
    if (this.keysJust.has('Space') || this.keysJust.has('KeyW') || this.keysJust.has('ArrowUp')) {
      inp.jump = true;
    }
    if (this.keysJust.has('ShiftLeft') || this.keysJust.has('ShiftRight')) inp.dash = true;
    if (this.keysJust.has('KeyJ') || this.mouseJust.has(0)) inp.attack = true;
    if (this.keysJust.has('KeyK') || this.mouseJust.has(2)) inp.parry = true;
    inp.parryHeld = this.keys.has('KeyK') || this.mouseHeld.has(2);
    if (this.keysJust.has('KeyF') || this.keysJust.has('KeyL')) inp.heavy = true;
    if (this.keysJust.has('KeyR')) inp.heal = true;
    if (this.keysJust.has('KeyE') || this.keysJust.has('Enter')) inp.interact = true;
    if (this.keysJust.has('Escape') || this.keysJust.has('KeyP')) inp.pause = true;
    if (this.keysJust.has('KeyM')) inp.mute = true;

    if (pad) {
      const ax = Math.abs(pad.axes[0]) > 0.22 ? pad.axes[0] : 0;
      if (ax !== 0) {
        inp.moveX = Math.sign(ax);
        this.lastInputMode = 'Manette';
      }
      if (pad.buttons[14]?.pressed) {
        inp.moveX = -1;
        this.lastInputMode = 'Manette';
      }
      if (pad.buttons[15]?.pressed) {
        inp.moveX = 1;
        this.lastInputMode = 'Manette';
      }
      if (pad.buttons[13]?.pressed || pad.axes[1] > 0.6) inp.down = true;
      if (pad.axes[1] < -0.6) inp.upHeld = true;

      const just = (idx: number): boolean => {
        const cur = !!pad.buttons[idx]?.pressed;
        const prev = !!this.prevPadButtons[idx];
        if (cur) this.lastInputMode = 'Manette';
        return cur && !prev;
      };

      if (pad.buttons[0]?.pressed) inp.jumpHeld = true;
      if (just(0)) inp.jump = true;
      if (just(1)) inp.dash = true;
      if (just(2)) inp.attack = true;
      if (just(3)) inp.heal = true;
      if (just(4)) inp.parry = true;
      if (pad.buttons[4]?.pressed) inp.parryHeld = true;
      if (just(5) || just(7)) inp.heavy = true;
      if (just(12)) inp.interact = true;
      if (just(9)) inp.pause = true;

      this.prevPadButtons = pad.buttons.map((b) => !!b.pressed);
    }

    inp.jumpReleased = this.prevJumpHeld && !inp.jumpHeld;
    this.prevJumpHeld = inp.jumpHeld;

    this.keysJust.clear();
    this.mouseJust.clear();
    return inp;
  }
}
