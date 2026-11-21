import React from 'react';
import { SYNERGIES_POOL } from '../game/data';
import { computeComboRank } from '../game/rules';
import type { RunSummary } from '../game/types';
import { ExpeditionRewards } from './ExpeditionRewards';

interface GameOverModalProps {
  summary: RunSummary;
  onPlayAgain: () => void;
  onOpenBastion: () => void;
}

function signedDelta(value: number): string {
  return value > 0 ? `+${value}` : String(value);
}

export function GameOverModal({ summary, onPlayAgain, onOpenBastion }: GameOverModalProps) {
  const mins = Math.floor(summary.elapsedSec / 60);
  const secs = summary.elapsedSec % 60;
  const timeStr = `${mins}:${secs.toString().padStart(2, '0')}`;
  const rank = computeComboRank(summary.peakComboHits).rank;
  const previous = summary.previousRun;

  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center bg-[#070609]/90 p-5"
      data-ui-interactive="true"
      data-testid="gameover-modal"
      data-gamepad-menu="summary"
    >
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto dark-scroll bg-[#110e15] border border-[#4a3b2c] p-7 text-center shadow-[0_0_60px_rgba(0,0,0,0.95)]">
        <h2
          className={`font-display text-2xl md:text-3xl uppercase tracking-[0.18em] m-0 ${
            summary.victory ? 'text-[#ffd470]' : 'text-[#c4303e]'
          }`}
        >
          {summary.victory ? 'Extraction Victorieuse' : "L'Argile s'est Brisée"}
        </h2>
        <p className="text-xs text-[#9d9284] mt-2 mb-2">
          {summary.victory
            ? 'Vous regagnez le Bastion avec la totalité de votre butin et les honneurs de l’Abîme.'
            : summary.bossNameRemaining
            ? `Terrassé devant ${summary.bossNameRemaining} (${summary.bossHpPct}% PV restants).`
            : 'Vous pouvez dépenser vos gains au Bastion avant de repartir.'}
        </p>
        <div className="text-[11px] font-mono-num text-[#cfc6b8] mb-5">
          {summary.weaponName}
          {summary.ascensionLevel > 0 ? ` · Pacte d'Ascension ${summary.ascensionLevel}` : ''}
        </div>

        {/* Mastery / Progress Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5 text-left">
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
            <div className="text-[11px] text-[#9d9284] uppercase">Esquives Parfaites</div>
            <div className="font-mono-num text-base text-[#8ab8e6] font-semibold mt-0.5">
              {summary.perfectDodges}
            </div>
          </div>
          <div className="bg-[#18141e] border border-[#352b22] p-3">
            <div className="text-[11px] text-[#9d9284] uppercase">Série Max</div>
            <div className="font-mono-num text-base text-[#ffd470] mt-0.5">
              {summary.bestParryStreak}x
            </div>
          </div>
          <div className="bg-[#18141e] border border-[#352b22] p-3">
            <div className="text-[11px] text-[#9d9284] uppercase">Durée en jeu</div>
            <div className="font-mono-num text-sm text-[#e8e1d5] mt-1">
              {timeStr}
            </div>
          </div>
          <div className="bg-[#18141e] border border-[#352b22] p-3">
            <div className="text-[11px] text-[#9d9284] uppercase">Dégâts infligés</div>
            <div className="font-mono-num text-base text-[#e8e1d5] mt-0.5">{summary.damageDealt}</div>
          </div>
          <div className="bg-[#18141e] border border-[#352b22] p-3">
            <div className="text-[11px] text-[#9d9284] uppercase">Dégâts reçus</div>
            <div className="font-mono-num text-base text-[#e8e1d5] mt-0.5">{summary.damageTaken}</div>
          </div>
          <div className="bg-[#18141e] border border-[#352b22] p-3">
            <div className="text-[11px] text-[#9d9284] uppercase">Rang de combo max.</div>
            <div className="font-mono-num text-base text-[#ffd470] mt-0.5">{rank} · {summary.peakComboHits}</div>
          </div>
        </div>

        {previous && (
          <div className="mb-3 px-4 py-2.5 bg-[#18141e] border border-[#352b22] text-left text-xs">
            <h3 className="text-[#d4a853] m-0 mb-1">Par rapport à l’expédition précédente</h3>
            <p className="text-[#e8e1d5] m-0">
              Strate {signedDelta(summary.depthReached - previous.depthReached)} ·
              {' '}Vaincus {signedDelta(summary.kills - previous.kills)} ·
              {' '}Déviations {signedDelta(summary.parries - previous.parries)} ·
              {' '}Rang {computeComboRank(previous.peakComboHits).rank} → {rank}
            </p>
          </div>
        )}

        <p className="text-xs text-[#cfc6b8] text-left mt-0 mb-4">
          Records locaux · Strate {summary.bests.depthReached} · {summary.bests.damageDealt} dégâts infligés ·
          {' '}Rang {computeComboRank(summary.bests.peakComboHits).rank}
        </p>

        <div className="mb-5">
          <ExpeditionRewards rewards={summary.rewards} />
        </div>

        {summary.activeSynergies.length > 0 && (
          <div className="text-xs text-[#ff9d42] mb-5 text-left bg-[#18141e] border border-[#352b22] px-4 py-2">
            Synergies d&apos;Éclipse :{' '}
            {summary.activeSynergies
              .map((id) => SYNERGIES_POOL.find((s) => s.id === id)?.name)
              .filter(Boolean)
              .join(' · ')}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            data-start="true"
            onClick={onPlayAgain}
            className="flex-1 py-3 px-4 text-xs font-display uppercase tracking-widest bg-[#6e1c26] text-[#ffe8ea] border border-[#b54552] hover:bg-[#8e2431] cursor-pointer whitespace-nowrap"
          >
            Nouvelle Expédition
          </button>
          <button
            type="button"
            data-gamepad-back
            data-gamepad-default
            onClick={onOpenBastion}
            className="flex-1 py-3 px-4 text-xs font-display uppercase tracking-wider bg-[#1b161f] text-[#d4a853] border border-[#5c4833] hover:border-[#d4a853] cursor-pointer whitespace-nowrap"
          >
            Bastion du Crépuscule
          </button>
        </div>
      </div>
    </div>
  );
}
