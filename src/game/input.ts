import { DEFAULT_KEY_BINDINGS } from './data';
import type { InputState, KeyBindings } from './types';

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

export class InputHub {
  private keys = new Set<string>();
  private keysJust = new Set<string>();
  private mouseHeld = new Set<number>();
  private mouseJust = new Set<number>();
  private prevJumpHeld = false;
  private prevPadButtons: boolean[] = [];
  private active = false;
  private bindings: KeyBindings = { ...DEFAULT_KEY_BINDINGS };
  public lastInputMode = 'Clavier / Souris';

  setKeyBindings(bindings: KeyBindings): void {
    this.bindings = { ...DEFAULT_KEY_BINDINGS, ...bindings };
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    const target = e.target instanceof Element ? e.target : null;
    const k = e.code;
    if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
    if ((k === 'Space' || k === 'Enter') && target?.closest('button, a[href]')) return;
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
    this.lastInputMode = 'Clavier / Souris';
    const target = e.target as HTMLElement | null;
    if (target && target.closest('[data-ui-interactive="true"]')) return;
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
    this.keys.clear();
    this.keysJust.clear();
    this.mouseHeld.clear();
    this.mouseJust.clear();
    this.prevJumpHeld = false;
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

  poll(): InputState {
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
      if (just(0)) {
        inp.jump = true;
        inp.interact = true; // Permet d'interagir facilement avec le bouton A
      }
      if (just(1)) inp.dash = true; // B = Roulade / Dash
      if (just(2)) inp.attack = true; // X = Attaque légère
      if (just(3) || just(7)) inp.heavy = true; // Y ou RT = Attaque lourde
      if (just(4)) inp.parry = true; // LB = Parade
      if (pad.buttons[4]?.pressed || pad.buttons[6]?.pressed) inp.parryHeld = true;
      if (just(6)) inp.parry = true; // LT = Parade alternative
      if (just(5)) inp.skill = true; // RB = Art d'Éclipse (Skill)
      if (just(12)) {
        inp.heal = true; // D-Pad Haut = Fiole de Sève (Soin)
        inp.interact = true;
      }
      if (just(8) || just(9)) inp.pause = true; // Start ou Select = Pause

      this.prevPadButtons = pad.buttons.map((btn) => !!btn.pressed);
    }

    inp.jumpReleased = this.prevJumpHeld && !inp.jumpHeld;
    this.prevJumpHeld = inp.jumpHeld;

    this.keysJust.clear();
    this.mouseJust.clear();
    return inp;
  }
}

