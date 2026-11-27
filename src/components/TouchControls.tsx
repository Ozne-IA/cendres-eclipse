import { useEffect, useRef, useSyncExternalStore, type PointerEvent } from 'react';
import type { CendresEngine } from '../game/engine';
import type { KeyAction } from '../game/types';
import './TouchControls.css';

const query = '(any-pointer: coarse)';
function subscribe(callback: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}

export function useTouchScreen() {
  return useSyncExternalStore(subscribe, () =>
    window.location.origin === 'https://appassets.androidplatform.net' || window.matchMedia(query).matches
  );
}

const directions = [
  ['up', '↑', 'Viser vers le haut'], ['left', '←', 'Aller à gauche'],
  ['right', '→', 'Aller à droite'], ['down', '↓', 'Descendre'],
] as const;
const actions = [
  ['heal', 'Fiole'], ['interact', 'Agir'], ['skill', 'Art'], ['heavy', 'Lourd'],
  ['parry', 'Parade'], ['dash', 'Esquive'], ['jump', 'Saut'], ['attack', 'Frappe'],
] as const;

export function TouchControls({ engine }: { engine: CendresEngine }) {
  const fingers = useRef(new Map<number, HTMLButtonElement>());
  const release = (id: number) => {
    const button = fingers.current.get(id);
    if (!button) return;
    fingers.current.delete(id);
    if (Array.from(fingers.current.values()).includes(button)) return;
    delete button.dataset.pressed;
    engine.setTouchControl(button.dataset.control as KeyAction, false);
  };

  useEffect(() => {
    const clear = () => {
      for (const button of fingers.current.values()) {
        delete button.dataset.pressed;
        engine.setTouchControl(button.dataset.control as KeyAction, false);
      }
      fingers.current.clear();
    };
    const visibility = () => { if (document.hidden) clear(); };
    window.addEventListener('blur', clear);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      clear();
      window.removeEventListener('blur', clear);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [engine]);

  const hold = (id: number, button: HTMLButtonElement) => {
    fingers.current.set(id, button);
    button.dataset.pressed = 'true';
    engine.setTouchControl(button.dataset.control as KeyAction, true);
  };
  const start = (event: PointerEvent<HTMLDivElement>) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement) || event.button !== 0) return;
    event.preventDefault();
    target.setPointerCapture(event.pointerId);
    hold(event.pointerId, target);
  };
  const slide = (event: PointerEvent<HTMLDivElement>) => {
    const current = fingers.current.get(event.pointerId);
    if (!current?.closest('.touch-directions')) return;
    const next = document.elementFromPoint(event.clientX, event.clientY);
    if (next !== current && next instanceof HTMLButtonElement && next.closest('.touch-directions')) {
      release(event.pointerId);
      hold(event.pointerId, next);
    }
  };

  return (
    <div className="touch-controls" data-testid="touch-controls" data-ui-interactive="true"
      onPointerDown={start} onPointerMove={slide} onPointerUp={e => release(e.pointerId)}
      onPointerCancel={e => release(e.pointerId)} onLostPointerCapture={e => release(e.pointerId)}
      onClick={event => {
        const target = event.target;
        if (event.detail !== 0 || !(target instanceof HTMLButtonElement)) return;
        const action = target.dataset.control as KeyAction;
        engine.setTouchControl(action, true);
        engine.setTouchControl(action, false);
      }}
      onContextMenu={e => e.preventDefault()}>
      <div role="group" aria-label="Déplacement" className="touch-directions">
        {directions.map(([control, label, description]) => (
          <button type="button" tabIndex={-1} key={control} data-control={control} aria-label={description}>{label}</button>
        ))}
      </div>
      <div role="group" aria-label="Actions" className="touch-actions">
        {actions.map(([control, label]) => (
          <button type="button" tabIndex={-1} key={control} data-control={control}>{label}</button>
        ))}
      </div>
    </div>
  );
}
