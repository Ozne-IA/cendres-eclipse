import React from 'react';
import { BLESSINGS_POOL, RELICS_POOL, SYNERGIES_POOL } from '../game/data';
import type { HudSnapshot } from '../game/types';
import {
  CinderIcon,
  FlaskSocketIcon,
  IronIcon,
  PauseIcon,
  SoundIcon,
  TearIcon,
} from './GameIcons';

interface GameHudProps {
  hud: HudSnapshot;
  muted: boolean;
  onToggleMute: () => void;
  onOpenPause: () => void;
}

export function GameHud({ hud, muted, onToggleMute, onOpenPause }: GameHudProps) {
  const hpPct = Math.max(0, Math.min(100, (hud.hp / Math.max(1, hud.maxHp)) * 100));
  const ghostPct = Math.max(hpPct, Math.min(100, (hud.ghostHp / Math.max(1, hud.maxHp)) * 100));
  const stamPct = Math.max(0, Math.min(100, (hud.stam / Math.max(1, hud.maxStam)) * 100));
  const skillReady = hud.skillCd <= 0.05;
  const skillPct =
    hud.skillMaxCd > 0
      ? Math.max(0, Math.min(100, ((hud.skillMaxCd - hud.skillCd) / hud.skillMaxCd) * 100))
      : 100;

  return (
    <div
      className="fixed inset-0 pointer-events-none p-4 md:p-6 flex flex-col justify-between z-10"
      data-testid="game-hud"
    >
      {/* Top-Center Achievement Toast */}
      {hud.achievementToast && (
        <div
          className="fixed top-5 left-1/2 -translate-x-1/2 z-20 bg-[#140f19]/95 border border-[#d4a853] px-5 py-2.5 text-center shadow-[0_8px_32px_rgba(0,0,0,0.88)]"
          data-testid="achievement-toast"
        >
          <div className="font-display text-xs uppercase tracking-[0.18em] text-[#ffd470]">
            {hud.achievementToast}
          </div>
        </div>
      )}

      {/* Top Perimeter Clusters (2 compact corners) */}
      <div className="flex justify-between items-start gap-4">
        {/* Top-Left: Vitality, Breath, Flasks, Weapon Art & Build */}
        <div className="relative w-[308px] bg-[#0c0910]/90 border border-[#5c4835] px-4 py-3 shadow-[0_8px_28px_rgba(0,0,0,0.75)]">
          <span aria-hidden="true" className="absolute -top-px -left-px w-2 h-2 border-t-2 border-l-2 border-[#d4a853]" />
          <span aria-hidden="true" className="absolute -top-px -right-px w-2 h-2 border-t-2 border-r-2 border-[#d4a853]" />
          <span aria-hidden="true" className="absolute -bottom-px -left-px w-2 h-2 border-b-2 border-l-2 border-[#d4a853]" />
          <span aria-hidden="true" className="absolute -bottom-px -right-px w-2 h-2 border-b-2 border-r-2 border-[#d4a853]" />
          {/* HP */}
          <div className="mb-2.5">
            <div className="flex justify-between items-baseline text-[11px] uppercase tracking-wider text-[#b0a494] mb-1">
              <span>Vitalité</span>
              <span className="font-mono-num text-[#f2ece1] font-semibold" data-testid="hud-hp">
                {hud.hp} / {hud.maxHp}
              </span>
            </div>
            <div className="relative h-3 bg-[#17121b] border border-[#4a3a2d] overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-[#e6a65d]/75"
                style={{ width: `${ghostPct}%` }}
              />
              <div
                className="relative h-full bg-gradient-to-r from-[#8f1d2c] via-[#bf2c3c] to-[#d9414f]"
                style={{ width: `${hpPct}%` }}
              />
              <div className="absolute inset-x-0 top-0 h-[1px] bg-white/15" />
            </div>
          </div>

          {/* Breath / Stamina */}
          <div className="mb-2">
            <div className="flex justify-between items-baseline text-[11px] uppercase tracking-wider text-[#b0a494] mb-1">
              <span>Souffle</span>
              <span className="font-mono-num text-[#cde0d2]">
                {hud.stam} / {hud.maxStam}
              </span>
            </div>
            <div className="relative h-2 bg-[#17121b] border border-[#3a2e25] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#34784d] to-[#56b376]"
                style={{ width: `${stamPct}%` }}
              />
              <div className="absolute inset-x-0 top-0 h-[1px] bg-white/15" />
            </div>
          </div>

          {/* Flask Sockets & Active Weapon */}
          <div className="flex items-center justify-between pt-0.5">
            <div className="flex items-center gap-1" aria-label={`Fioles de Sève : ${hud.flasks} sur ${hud.maxFlasks}`}>
              {Array.from({ length: hud.maxFlasks }).map((_, idx) => (
                <FlaskSocketIcon key={idx} state={idx < hud.flasks ? 'full' : 'empty'} />
              ))}
              <span className="ml-1 text-[11px] text-[#9d9284] font-mono-num">[R]</span>
            </div>
            <span className="text-[11px] text-[#d4a853] truncate max-w-[140px]">{hud.weaponName}</span>
          </div>

          {/* Weapon Art Cooldown Bar */}
          <div className="mt-2 pt-1.5 border-t border-[#2d241c]">
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-[#cfc6b8] truncate max-w-[195px]">
                <span className="font-mono-num text-[#9d9284] mr-1">[C]</span>
                {hud.weaponArtName}
              </span>
              <span
                className={`font-mono-num ${skillReady ? 'text-[#ffd470]' : 'text-[#9d9284]'}`}
                data-testid="hud-skill-status"
              >
                {skillReady ? 'Prêt' : `${hud.skillCd.toFixed(1)}s`}
              </span>
            </div>
            <div className="h-1 bg-[#17121b] border border-[#322820] overflow-hidden">
              <div
                className={`h-full ${skillReady ? 'bg-[#ffd470]' : 'bg-[#7d5e34]'}`}
                style={{ width: `${skillPct}%` }}
              />
            </div>
          </div>

          {(hud.blessings.length > 0 ||
            hud.relics.length > 0 ||
            hud.activeSynergies.length > 0 ||
            hud.parryStreak >= 2 ||
            hud.comboHits >= 2) && (
            <div className="mt-2 pt-1.5 border-t border-[#2d241c] text-[11px] text-[#9d9284] flex items-center justify-between gap-2">
              <span className="truncate">
                {hud.blessings.length} Bénéd. · {hud.relics.length} Rel.
                {hud.activeSynergies.length > 0 && (
                  <span className="text-[#ff9d42]"> · {hud.activeSynergies.length} Duo</span>
                )}
              </span>
              <div className="flex items-center gap-2 whitespace-nowrap font-mono-num">
                {hud.comboHits >= 2 && (
                  <span className="text-[#ff9d42]">
                    Rang {hud.comboRank} · {hud.comboHits}x
                  </span>
                )}
                {hud.parryStreak >= 2 && (
                  <span className="text-[#ffd470]">
                    Série {hud.parryStreak}x
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Top-Right: Zone, Resources & Utility Buttons */}
        <div className="flex items-start gap-2.5">
          <div className="relative bg-[#0c0910]/90 border border-[#5c4835] px-4 py-3 text-right shadow-[0_8px_28px_rgba(0,0,0,0.75)]">
            <span aria-hidden="true" className="absolute -top-px -left-px w-2 h-2 border-t-2 border-l-2 border-[#d4a853]" />
            <span aria-hidden="true" className="absolute -top-px -right-px w-2 h-2 border-t-2 border-r-2 border-[#d4a853]" />
            <span aria-hidden="true" className="absolute -bottom-px -left-px w-2 h-2 border-b-2 border-l-2 border-[#d4a853]" />
            <span aria-hidden="true" className="absolute -bottom-px -right-px w-2 h-2 border-b-2 border-r-2 border-[#d4a853]" />
            <div className="font-display text-xs md:text-sm text-[#e5be6e] tracking-wider uppercase">
              {hud.isTraining
                ? "Cour d'Entraînement · Bastion"
                : `Strate ${hud.depth} · ${hud.biomeName}`}
            </div>
            {!hud.isTraining && (hud.affixName || hud.ascensionLevel > 0) && (
              <div className="text-[11px] text-[#8ab8e6] mt-0.5" title={hud.affixDesc}>
                {hud.ascensionLevel > 0 ? `Ascension ${hud.ascensionLevel}` : ''}
                {hud.ascensionLevel > 0 && hud.affixName ? ' · ' : ''}
                {hud.affixName || ''}
              </div>
            )}
            <div className="mt-1.5 flex items-center justify-end gap-3.5 text-xs font-mono-num text-[#f2ece1]">
              <span className="flex items-center gap-1" title="Cendres">
                <CinderIcon className="w-3.5 h-3.5" />
                {hud.cendresTotal}
              </span>
              <span className="flex items-center gap-1" title="Fer Noir">
                <IronIcon className="w-3.5 h-3.5" />
                {hud.ferTotal}
              </span>
              <span className="flex items-center gap-1" title="Larmes de Lune">
                <TearIcon className="w-3.5 h-3.5" />
                {hud.larmesTotal}
              </span>
              {hud.showFps && typeof hud.fps === 'number' && (
                <span className="text-[11px] text-[#9d9284]">{hud.fps} FPS</span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5 pointer-events-auto">
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenPause();
              }}
              aria-label="Pause (Échap)"
              title="Pause (Échap)"
              className="w-9 h-9 flex items-center justify-center bg-[#0c0910]/90 border border-[#5c4835] text-[#d4a853] hover:border-[#d4a853] cursor-pointer"
            >
              <PauseIcon />
            </button>
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleMute();
              }}
              aria-label={muted ? 'Activer audio (M)' : 'Couper audio (M)'}
              title={muted ? 'Activer audio (M)' : 'Couper audio (M)'}
              className="w-9 h-9 flex items-center justify-center bg-[#0c0910]/90 border border-[#5c4835] text-[#d4a853] hover:border-[#d4a853] cursor-pointer"
            >
              <SoundIcon muted={muted} />
            </button>
          </div>
        </div>
      </div>

      {/* Center Area: World Banner & Interaction Prompt */}
      {hud.banner.visible && (
        <div className="fixed top-[34%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none px-4 w-full max-w-2xl">
          <h1
            className="font-display text-2xl md:text-5xl uppercase tracking-[0.2em] m-0"
            style={{ color: hud.banner.color, textShadow: '0 4px 28px #000' }}
          >
            {hud.banner.title}
          </h1>
          <p className="mt-2 text-sm md:text-base text-[#cfc6b8] tracking-wider" style={{ textShadow: '0 2px 12px #000' }}>
            {hud.banner.sub}
          </p>
        </div>
      )}

      {hud.promptText && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-[#0c0910]/95 border border-[#d4a853] px-4 py-2 text-xs md:text-sm text-[#e5be6e] tracking-wide whitespace-nowrap shadow-[0_6px_24px_rgba(0,0,0,0.85)]">
          {hud.promptText}
        </div>
      )}

      {/* Bottom Center: Boss Health & Posture Bar (Only during Boss Encounters) */}
      {hud.boss ? (
        <div className="self-center w-[min(660px,80vw)] mb-2 text-center">
          <div className="font-display text-sm md:text-base uppercase tracking-[0.16em] text-[#e5be6e] mb-1.5" style={{ textShadow: '0 2px 10px #000' }}>
            {hud.boss.name} {hud.boss.phase === 2 ? '· Phase II' : ''}
          </div>
          <div className="relative h-4 bg-[#140f17] border border-[#7c5c3c] shadow-[0_4px_20px_rgba(0,0,0,0.8)]">
            <div
              className="h-full bg-gradient-to-r from-[#7e1928] via-[#bd2b3c] to-[#e04856]"
              style={{ width: `${(hud.boss.hp / Math.max(1, hud.boss.maxHp)) * 100}%` }}
            />
            <div className="absolute inset-x-0 top-0 h-[1px] bg-white/15" />
            <div aria-hidden="true" className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-[#d4a853]/50" />
          </div>
          <div className="h-1.5 bg-[#1b171d] border border-[#3a2e25] mt-1">
            <div
              className="h-full bg-gradient-to-r from-[#b8862d] to-[#ffd470]"
              style={{ width: `${(hud.boss.stagger / Math.max(1, hud.boss.maxStagger)) * 100}%` }}
            />
          </div>
        </div>
      ) : (
        <div />
      )}

      {/* Tooltip-free active blessing/relic/synergy reference for accessibility */}
      <span className="sr-only">
        {hud.blessings.map((id) => BLESSINGS_POOL.find((b) => b.id === id)?.name).join(', ')}
        {hud.relics.map((id) => RELICS_POOL.find((r) => r.id === id)?.name).join(', ')}
        {hud.activeSynergies.map((id) => SYNERGIES_POOL.find((s) => s.id === id)?.name).join(', ')}
      </span>
    </div>
  );
}
