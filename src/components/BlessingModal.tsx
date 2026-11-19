import React from 'react';
import type { BlessingDef } from '../game/types';

interface BlessingModalProps {
  depth: number;
  isAfterBoss: boolean;
  choices: BlessingDef[];
  onSelect: (id: string) => void;
  onExtractVictory: () => void;
}

export function BlessingModal({
  depth,
  isAfterBoss,
  choices,
  onSelect,
  onExtractVictory,
}: BlessingModalProps) {
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
          {choices.map((b) => (
            <div
              key={b.id}
              className="bg-[#191520] border border-[#3d3024] p-4 flex flex-col justify-between gap-4"
            >
              <div>
                <div className="text-[11px] uppercase tracking-wider text-[#9d9284] mb-1">
                  Aspect · {b.aspect}
                </div>
                <h3 className="font-display text-base text-[#d4a853] m-0">{b.name}</h3>
                <p className="text-xs text-[#b8afa2] leading-relaxed mt-2">{b.desc}</p>
              </div>
              <button
                type="button"
                onClick={() => onSelect(b.id)}
                className="w-full py-2.5 px-3 text-xs font-display uppercase tracking-wider bg-[#6e1c26] text-[#ffe8ea] border border-[#b54552] hover:bg-[#8e2431] hover:border-[#ff7887] transition-colors cursor-pointer"
              >
                Accepter
              </button>
            </div>
          ))}
        </div>

        {isAfterBoss && (
          <div className="mt-6 pt-4 border-t border-[#332920] flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-[#9d9284]">
              Gardien vaincu : vous pouvez vous extraire victorieusement avec tout votre butin.
            </span>
            <button
              type="button"
              onClick={onExtractVictory}
              className="px-5 py-2.5 text-xs font-display uppercase tracking-wider bg-[#221b15] text-[#d4a853] border border-[#6b5235] hover:border-[#d4a853] transition-colors cursor-pointer"
            >
              Extraire vers le Bastion (Victoire)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
