import React from 'react';
import type { RunSummary } from '../game/types';

interface GameOverModalProps {
  summary: RunSummary;
  onPlayAgain: () => void;
  onOpenBastion: () => void;
}

export function GameOverModal({ summary, onPlayAgain, onOpenBastion }: GameOverModalProps) {
  const mins = Math.floor(summary.elapsedSec / 60);
  const secs = summary.elapsedSec % 60;
  const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;

  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center bg-[#070609]/90 p-5"
      data-ui-interactive="true"
      data-testid="gameover-modal"
    >
      <div className="w-full max-w-lg bg-[#110e15] border border-[#4a3b2c] p-7 text-center shadow-[0_0_60px_rgba(0,0,0,0.95)]">
        <h2
          className={`font-display text-2xl md:text-3xl uppercase tracking-[0.18em] m-0 ${
            summary.victory ? 'text-[#ffd470]' : 'text-[#c4303e]'
          }`}
        >
          {summary.victory ? 'Extraction Victorieuse' : "L'Argile s'est Brisée"}
        </h2>
        <p className="text-xs text-[#9d9284] mt-2 mb-6">
          {summary.victory
            ? 'Vous regagnez le Bastion avec la totalité de votre butin et les honneurs de l’Abîme.'
            : summary.bossNameRemaining
            ? `Terrassé devant ${summary.bossNameRemaining} (${summary.bossHpPct}% PV restants).`
            : 'Vos cendres récoltées ont été rapatriées au Bastion.'}
        </p>

        {/* Mastery / Progress Metrics Grid */}
        <div className="grid grid-cols-3 gap-3 mb-6 text-left">
          <div className="bg-[#18141e] border border-[#352b22] p-3">
            <div className="text-[11px] text-[#9d9284] uppercase">Strate</div>
            <div className="font-mono-num text-lg text-[#d4a853] font-semibold mt-0.5">
              {summary.depthReached}
            </div>
          </div>
          <div className="bg-[#18141e] border border-[#352b22] p-3">
            <div className="text-[11px] text-[#9d9284] uppercase">Vaincus</div>
            <div className="font-mono-num text-lg text-[#e8e1d5] font-semibold mt-0.5">
              {summary.kills}
            </div>
          </div>
          <div className="bg-[#18141e] border border-[#352b22] p-3">
            <div className="text-[11px] text-[#9d9284] uppercase">Déviations</div>
            <div className="font-mono-num text-lg text-[#ffd470] font-semibold mt-0.5">
              {summary.parries}
            </div>
          </div>
          <div className="bg-[#18141e] border border-[#352b22] p-3">
            <div className="text-[11px] text-[#9d9284] uppercase">Durée</div>
            <div className="font-mono-num text-base text-[#e8e1d5] mt-0.5">{timeStr}</div>
          </div>
          <div className="bg-[#18141e] border border-[#352b22] p-3">
            <div className="text-[11px] text-[#9d9284] uppercase">Dégâts subis</div>
            <div className="font-mono-num text-base text-[#e8e1d5] mt-0.5">
              {summary.damageTaken}
            </div>
          </div>
          <div className="bg-[#18141e] border border-[#352b22] p-3">
            <div className="text-[11px] text-[#9d9284] uppercase">Butin</div>
            <div className="font-mono-num text-xs text-[#d4a853] mt-1">
              +{summary.loot.cendres}🔥 +{summary.loot.fer}⛓️ +{summary.loot.larmes}💧
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            data-start="true"
            onClick={onPlayAgain}
            className="flex-1 py-3 px-4 text-xs font-display uppercase tracking-widest bg-[#6e1c26] text-[#ffe8ea] border border-[#b54552] hover:bg-[#8e2431] cursor-pointer"
          >
            Nouvelle Expédition
          </button>
          <button
            type="button"
            onClick={onOpenBastion}
            className="flex-1 py-3 px-4 text-xs font-display uppercase tracking-wider bg-[#1b161f] text-[#d4a853] border border-[#5c4833] hover:border-[#d4a853] cursor-pointer"
          >
            Bastion du Crépuscule
          </button>
        </div>
      </div>
    </div>
  );
}
