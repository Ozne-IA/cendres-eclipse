import React from 'react';
import { SYNERGIES_POOL } from '../game/data';
import type { BlessingDef } from '../game/types';

interface BlessingModalProps {
  depth: number;
  isAfterBoss: boolean;
  ownedIds: string[];
  choices: BlessingDef[];
  onSelect: (id: string) => void;
  onExtractVictory: () => void;
}

export function BlessingModal({
  depth,
  isAfterBoss,
  ownedIds,
  choices,
  onSelect,
  onExtractVictory,
}: BlessingModalProps) {
  const owned = new Set(ownedIds);

  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center bg-[#070609]/88 p-5"
      data-ui-interactive="true"
      data-testid="blessing-modal"
    >
      <div className="w-full max-w-3xl bg-[#110e15] border border-[#4a3b2c] p-6 md:p-7 shadow-[0_0_60px_rgba(0,0,0,0.9)]">
        <div className="flex flex-wrap justify-between items-baseline border-b border-[#332920] pb-3 mb-4 gap-2">
          <h2 className="font-display text-xl md:text-2xl text-[#d4a853] uppercase tracking-widest m-0">
            Bénédiction de l&apos;Éclipse
          </h2>
          <span className="text-xs text-[#9d9284] font-mono-num">
            Strate {depth} vaincue
          </span>
        </div>

        <p className="text-sm text-[#b8afa2] mb-5">
          Choisissez un serment éphémère pour poursuivre votre descente vers la Strate {depth + 1}.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {choices.map((b) => {
            const completingSynergy = SYNERGIES_POOL.find(
              (s) =>
                (s.requires[0] === b.id && owned.has(s.requires[1])) ||
                (s.requires[1] === b.id && owned.has(s.requires[0]))
            );
            return (
              <div
                key={b.id}
                className={`bg-[#191520] border p-4 flex flex-col justify-between gap-4 ${
                  completingSynergy ? 'border-[#ff9d42]' : 'border-[#3d3024]'
                }`}
              >
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-[#9d9284] mb-1">
                    Aspect · {b.aspect}
                  </div>
                  <h3 className="font-display text-base text-[#d4a853] m-0">{b.name}</h3>
                  <p className="text-xs text-[#b8afa2] leading-relaxed mt-2 mb-0">{b.desc}</p>
                  {completingSynergy && (
                    <div className="mt-2.5 pt-2 border-t border-[#3a2a1a] text-[11px] text-[#ff9d42]">
                      Complète le Duo : <span className="font-semibold">{completingSynergy.name}</span>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onSelect(b.id)}
                  className="w-full py-2.5 px-3 text-xs font-display uppercase tracking-wider bg-[#6e1c26] text-[#ffe8ea] border border-[#b54552] hover:bg-[#8e2431] hover:border-[#ff7887] transition-colors cursor-pointer"
                >
                  Accepter
                </button>
              </div>
            );
          })}
        </div>

        {isAfterBoss && (
          <div className="mt-6 pt-4 border-t border-[#332920] flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-[#9d9284]">
              Gardien vaincu : vous pouvez vous extraire victorieusement avec tout votre butin.
            </span>
            <button
              type="button"
              onClick={onExtractVictory}
              className="px-5 py-2.5 text-xs font-display uppercase tracking-wider bg-[#221b15] text-[#d4a853] border border-[#6b5235] hover:border-[#d4a853] transition-colors cursor-pointer whitespace-nowrap"
            >
              Extraire vers le Bastion (Victoire)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
