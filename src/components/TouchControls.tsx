import { useEffect, useRef, useState } from 'react';
import type { VirtualControl } from '../game/input';
import './TouchControls.css';

interface TouchControlsProps {
  /** Appui (true) ou relâchement (false) d'un bouton, envoyé au moteur. */
  onControl: (control: VirtualControl, down: boolean) => void;
}

/** Vrai sur les écrans tactiles (doigt = pointeur principal), ou avec ?touch=1 pour les tests sur ordinateur. */
export function useTouchScreen(): boolean {
  const query = '(pointer: coarse)';
  const forced =
    typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('touch') === '1';
  const [coarse, setCoarse] = useState<boolean>(
    () => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches
  );
  useEffect(() => {
    const media = window.matchMedia?.(query);
    if (!media) return;
    const update = () => setCoarse(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  return forced || coarse;
}

interface ActionButtonProps {
  control: VirtualControl;
  label: string;
  hint: string;
  className: string;
  onControl: TouchControlsProps['onControl'];
}

/** Bouton d'action : tient tant que le doigt est posé, plusieurs doigts possibles en même temps. */
function ActionButton({ control, label, hint, className, onControl }: ActionButtonProps) {
  const [pressed, setPressed] = useState(false);
  const release = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    setPressed(false);
    onControl(control, false);
  };
  return (
    <button
      type="button"
      data-ui-interactive="true"
      data-gamepad-ignore
      data-touch-control={control}
      aria-label={hint}
      className={`touch-btn ${className}${pressed ? ' is-pressed' : ''}`}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture?.(e.pointerId);
        setPressed(true);
        onControl(control, true);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  );
}

/** Pavé de déplacement : on glisse le doigt à gauche ou à droite du centre pour marcher. */
function MovePad({ onControl }: TouchControlsProps) {
  const padRef = useRef<HTMLDivElement | null>(null);
  const side = useRef<'left' | 'right' | null>(null);
  const [active, setActive] = useState<'left' | 'right' | null>(null);

  const apply = (next: 'left' | 'right' | null) => {
    if (next === side.current) return;
    if (side.current) onControl(side.current, false);
    if (next) onControl(next, true);
    side.current = next;
    setActive(next);
  };
  const update = (clientX: number) => {
    const rect = padRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    apply(x < -0.18 ? 'left' : x > 0.18 ? 'right' : null);
  };
  const end = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    apply(null);
  };
  // Si le composant disparaît pendant qu'un doigt est posé, on relâche la direction.
  const latest = useRef(onControl);
  latest.current = onControl;
  useEffect(() => () => {
    if (side.current) latest.current(side.current, false);
  }, []);

  return (
    <div
      ref={padRef}
      data-ui-interactive="true"
      data-gamepad-ignore
      data-touch-control="move"
      role="group"
      aria-label="Déplacement : glisse à gauche ou à droite"
      className="touch-pad"
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture?.(e.pointerId);
        update(e.clientX);
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture?.(e.pointerId)) update(e.clientX);
      }}
      onPointerUp={end}
      onPointerCancel={end}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className={`touch-pad-arrow${active === 'left' ? ' is-active' : ''}`} aria-hidden="true">◀</span>
      <span className="touch-pad-knob" aria-hidden="true" />
      <span className={`touch-pad-arrow${active === 'right' ? ' is-active' : ''}`} aria-hidden="true">▶</span>
    </div>
  );
}

/** Commandes à l'écran : déplacement à gauche, actions à droite. Affichées seulement sur écran tactile. */
export function TouchControls({ onControl }: TouchControlsProps) {
  return (
    <div className="touch-controls" data-testid="touch-controls">
      <MovePad onControl={onControl} />
      <div className="touch-actions">
        <ActionButton control="attack" label="⚔" hint="Attaque" className="touch-attack" onControl={onControl} />
        <ActionButton control="jump" label="⤒" hint="Saut" className="touch-jump" onControl={onControl} />
        <ActionButton control="dash" label="≫" hint="Esquive" className="touch-dash" onControl={onControl} />
        <ActionButton control="parry" label="🛡" hint="Parade" className="touch-parry" onControl={onControl} />
        <ActionButton control="heavy" label="✦" hint="Coup lourd" className="touch-heavy" onControl={onControl} />
        <ActionButton control="skill" label="✺" hint="Compétence d'arme" className="touch-skill" onControl={onControl} />
        <ActionButton control="heal" label="♥" hint="Fiole de soin" className="touch-heal" onControl={onControl} />
        <ActionButton control="interact" label="E" hint="Interagir" className="touch-interact" onControl={onControl} />
      </div>
    </div>
  );
}
