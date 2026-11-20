import React from 'react';
import { BLESSINGS_POOL, RELICS_POOL, SYNERGIES_POOL } from '../game/data';
import type { HudSnapshot } from '../game/types';

interface PauseModalProps {
  hud: HudSnapshot | null;
  onResume: () => void;
  onRestart: () => void;
  onOpenMenu: () => void;
  onReturnBastion: () => void;
}

export function PauseModal({
  hud,
  onResume,
  onRestart,
  onOpenMenu,
  onReturnBastion,
}: PauseModalProps) {
  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center bg-[#070609]/88 p-5"
      data-ui-interactive="true"
      data-testid="pause-modal"
    >
      <div className="w-full max-w-md bg-[#110e15] border border-[#4a3b2c] p-6 text-center shadow-[0_0_60px_rgba(0,0,0,0.9)]">
        <h2 className="font-display text-2xl text-[#d4a853] uppercase tracking-[0.18em] m-0">
          Pause
        </h2>
        <p className="text-xs text-[#9d9284] leading-relaxed mt-3 mb-5">
          {hud?.isTraining
            ? 'Vous êtes dans la Cour d’Entraînement. Rentrez au Bastion pour ajuster votre équipement.'
            : 'En rentrant au Bastion du Crépuscule maintenant, vous conservez toutes les ressources déjà récoltées durant cette expédition.'}
        </p>

        {hud && (
          <div className="text-left bg-[#18141e] border border-[#352b22] p-3 mb-5 text-xs space-y-1.5">
            <div className="text-[#e8e1d5] flex flex-wrap justify-between gap-2 font-mono-num">
              <span>
                {hud.weaponName}{hud.weaponTier > 0 ? ` +${hud.weaponTier}` : ''} · {hud.oathName}
              </span>
              <span className="text-[#9d9284]">
                {Math.floor(hud.elapsedSec / 60)}:{(hud.elapsedSec % 60).toString().padStart(2, '0')}
              </span>
            </div>
            <div className="text-[#9d9284] font-mono-num">
              Esquives parfaites : {hud.perfectDodges} · Série parade : {hud.parryStreak}x
              {hud.ascensionLevel > 0 ? ` · Ascension ${hud.ascensionLevel}` : ''}
            </div>
            {hud.activeSynergies.length > 0 && (
              <div className="text-[#ff9d42]">
                <span className="font-semibold">Synergies (Duos) : </span>
                {hud.activeSynergies
                  .map((id) => SYNERGIES_POOL.find((s) => s.id === id)?.name)
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            )}
            {hud.blessings.length > 0 && (
              <div className="text-[#b8afa2]">
                <span className="text-[#d4a853]">Bénédictions : </span>
                {hud.blessings
                  .map((id) => BLESSINGS_POOL.find((b) => b.id === id)?.name)
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            )}
            {hud.relics.length > 0 && (
              <div className="text-[#b8afa2]">
                <span className="text-[#d4a853]">Reliques : </span>
                {hud.relics
                  .map((id) => RELICS_POOL.find((r) => r.id === id)?.name)
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onResume}
            className="w-full py-3 text-xs font-display uppercase tracking-widest bg-[#6e1c26] text-[#ffe8ea] border border-[#b54552] hover:bg-[#8e2431] cursor-pointer"
          >
            Reprendre
          </button>
          <button
            type="button"
            onClick={onOpenMenu}
            className="w-full py-2.5 text-xs font-display uppercase tracking-wider bg-[#1b161f] text-[#ffd470] border border-[#5c4833] hover:border-[#d4a853] cursor-pointer"
          >
            Paramètres &amp; Commandes
          </button>
          <button
            type="button"
            onClick={onRestart}
            className="w-full py-2.5 text-xs font-display uppercase tracking-wider bg-[#1b161f] text-[#e8e1d5] border border-[#4a3b2c] hover:border-[#d4a853] cursor-pointer"
          >
            Recommencer l&apos;expédition
          </button>
          <button
            type="button"
            onClick={onReturnBastion}
            className="w-full py-2.5 text-xs font-display uppercase tracking-wider bg-[#1b161f] text-[#d4a853] border border-[#5c4833] hover:border-[#d4a853] cursor-pointer"
          >
            Rentrer au Bastion du Crépuscule
          </button>
        </div>
      </div>
    </div>
  );
}
