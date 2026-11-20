import React from 'react';
import { RELICS_POOL, SYNERGIES_POOL } from '../game/data';
import type { RunState } from '../game/types';
import { CinderIcon } from './GameIcons';

interface MerchantModalProps {
  run: RunState;
  onBuy: (itemType: 'flask' | 'tonic' | 'relic', relicId?: string) => void;
  onClose: () => void;
}

export function MerchantModal({ run, onBuy, onClose }: MerchantModalProps) {
  const owned = new Set([...run.blessings, ...run.relics]);

  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center bg-[#070609]/88 p-5"
      data-ui-interactive="true"
      data-testid="merchant-modal"
    >
      <div className="w-full max-w-2xl bg-[#110e15] border border-[#4a3b2c] p-6 shadow-[0_0_60px_rgba(0,0,0,0.9)]">
        <div className="flex flex-wrap justify-between items-center border-b border-[#332920] pb-3 mb-4 gap-2">
          <div>
            <h2 className="font-display text-xl text-[#d4a853] uppercase tracking-widest m-0">
              Étal du Marchand Errant
            </h2>
            <div className="text-xs text-[#9d9284] font-mono-num mt-0.5">
              Vitalité : {Math.ceil(run.hp)}/{run.maxHp} · Fioles : {run.flasks}/{run.maxFlasks} · Reliques : {run.relics.length}
            </div>
          </div>
          <span className="flex items-center gap-1.5 text-sm font-mono-num text-[#d4a853]">
            <CinderIcon className="w-4 h-4" />
            {run.loot.cendres} Cendres d&apos;expédition
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Tonic */}
          <div className="bg-[#191520] border border-[#3d3024] p-4 flex flex-col justify-between gap-3">
            <div>
              <h3 className="font-display text-sm text-[#d4a853] m-0">Onguent d&apos;Argile</h3>
              <p className="text-xs text-[#9d9284] mt-1">Restaure immédiatement 45% de votre Vitalité.</p>
            </div>
            <button
              type="button"
              disabled={run.loot.cendres < 25 || run.hp >= run.maxHp}
              onClick={() => onBuy('tonic')}
              className="py-2 px-3 text-xs font-display uppercase tracking-wider bg-[#2b221a] text-[#d4a853] border border-[#6b5235] hover:border-[#d4a853] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              Acheter (25 Cendres)
            </button>
          </div>

          {/* Flask */}
          <div className="bg-[#191520] border border-[#3d3024] p-4 flex flex-col justify-between gap-3">
            <div>
              <h3 className="font-display text-sm text-[#d4a853] m-0">Recharge de Sève</h3>
              <p className="text-xs text-[#9d9284] mt-1">Remplit +1 Fiole de Sève Ardente.</p>
            </div>
            <button
              type="button"
              disabled={run.loot.cendres < 30 || run.flasks >= run.maxFlasks}
              onClick={() => onBuy('flask')}
              className="py-2 px-3 text-xs font-display uppercase tracking-wider bg-[#2b221a] text-[#d4a853] border border-[#6b5235] hover:border-[#d4a853] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              Acheter (30 Cendres)
            </button>
          </div>

          {/* Relics */}
          {run.merchantStock.map((id) => {
            const relic = RELICS_POOL.find((r) => r.id === id);
            if (!relic) return null;
            const completingSynergy = SYNERGIES_POOL.find(
              (s) =>
                (s.requires[0] === relic.id && owned.has(s.requires[1])) ||
                (s.requires[1] === relic.id && owned.has(s.requires[0]))
            );
            return (
              <div
                key={relic.id}
                className={`bg-[#191520] border p-4 flex flex-col justify-between gap-3 ${
                  completingSynergy ? 'border-[#ff9d42]' : 'border-[#3d3024]'
                }`}
              >
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-[#9d9284]">Relique</div>
                  <h3 className="font-display text-sm text-[#d4a853] mt-0.5 mb-0">{relic.name}</h3>
                  <p className="text-xs text-[#9d9284] mt-1 mb-0">{relic.desc}</p>
                  {completingSynergy && (
                    <div className="mt-2 pt-1.5 border-t border-[#3a2a1a] text-[11px] text-[#ff9d42]">
                      Complète le Duo : <span className="font-semibold">{completingSynergy.name}</span>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  disabled={run.loot.cendres < relic.costCendres}
                  onClick={() => onBuy('relic', relic.id)}
                  className="py-2 px-3 text-xs font-display uppercase tracking-wider bg-[#6e1c26] text-[#ffe8ea] border border-[#b54552] hover:bg-[#8e2431] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                >
                  Acquérir ({relic.costCendres} Cendres)
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-display uppercase tracking-wider bg-[#1f1914] text-[#d4a853] border border-[#6b5235] hover:border-[#d4a853] cursor-pointer"
          >
            Fermer l&apos;étal
          </button>
        </div>
      </div>
    </div>
  );
}
