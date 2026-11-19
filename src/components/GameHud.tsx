import React from 'react';
import { BLESSINGS_POOL, RELICS_POOL } from '../game/data';
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

  return (
    <div
      className="fixed inset-0 pointer-events-none p-4 md:p-6 flex flex-col justify-between z-10"
      data-testid="game-hud"
    >
      {/* Top Perimeter Clusters (2 compact corners) */}
      <div className="flex justify-between items-start gap-4">
        {/* Top-Left: Vitality, Breath, Flasks & Build */}
        <div className="w-[290px] bg-[#0c0910]/85 border border-[#4a3b2c] px-3.5 py-2.5 shadow-[0_6px_24px_rgba(0,0,0,0.65)]">
          {/* HP */}
          <div className="mb-2">
            <div className="flex justify-between items-baseline text-[11px] uppercase tracking-wider text-[#9d9284] mb-1">
              <span>Vitalité</span>
              <span className="font-mono-num text-[#e8e1d5] font-semibold" data-testid="hud-hp">
                {hud.hp} / {hud.maxHp}
              </span>
            </div>
            <div className="relative h-2.5 bg-[#1b1620] border border-[#3a2e25] overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-[#e6a65d]/70"
                style={{ width: `${ghostPct}%` }}
              />
              <div
                className="relative h-full bg-[#b82c3a]"
                style={{ width: `${hpPct}%` }}
              />
            </div>
          </div>

          {/* Breath / Stamina */}
          <div className="mb-2">
            <div className="flex justify-between items-baseline text-[11px] uppercase tracking-wider text-[#9d9284] mb-1">
              <span>Souffle</span>
              <span className="font-mono-num text-[#c7d9cc]">
                {hud.stam} / {hud.maxStam}
              </span>
            </div>
            <div className="h-2 bg-[#1b1620] border border-[#3a2e25] overflow-hidden">
              <div
                className="h-full bg-[#4a9c67]"
                style={{ width: `${stamPct}%` }}
              />
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
            <span className="text-[11px] text-[#d4a853] truncate max-w-[130px]">{hud.weaponName}</span>
          </div>

          {(hud.blessings.length > 0 || hud.relics.length > 0 || hud.parryStreak >= 2) && (
            <div className="mt-2 pt-1.5 border-t border-[#2d241c] text-[11px] text-[#9d9284] flex items-center justify-between gap-2">
              <span className="truncate">
                {hud.blessings.length} Bénéd. · {hud.relics.length} Rel.
              </span>
              {hud.parryStreak >= 2 && (
                <span className="text-[#ffd470] font-mono-num whitespace-nowrap">
                  Série {hud.parryStreak}x
                </span>
              )}
            </div>
          )}
        </div>

        {/* Top-Right: Zone, Resources & Utility Buttons */}
        <div className="flex items-start gap-2.5">
          <div className="bg-[#0c0910]/85 border border-[#4a3b2c] px-3.5 py-2.5 text-right shadow-[0_6px_24px_rgba(0,0,0,0.65)]">
            <div className="font-display text-xs md:text-sm text-[#d4a853] tracking-wider uppercase">
              Strate {hud.depth} · {hud.biomeName}
            </div>
            <div className="mt-1.5 flex items-center justify-end gap-3.5 text-xs font-mono-num text-[#e8e1d5]">
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
              className="w-9 h-9 flex items-center justify-center bg-[#0c0910]/90 border border-[#4a3b2c] text-[#d4a853] hover:border-[#d4a853] cursor-pointer"
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
              className="w-9 h-9 flex items-center justify-center bg-[#0c0910]/90 border border-[#4a3b2c] text-[#d4a853] hover:border-[#d4a853] cursor-pointer"
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
            style={{ color: hud.banner.color, textShadow: '0 4px 24px #000' }}
          >
            {hud.banner.title}
          </h1>
          <p className="mt-2 text-sm md:text-base text-[#b8afa2] tracking-wider">
            {hud.banner.sub}
          </p>
        </div>
      )}

      {hud.promptText && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-[#0c0910]/95 border border-[#d4a853] px-4 py-2 text-xs md:text-sm text-[#d4a853] tracking-wide whitespace-nowrap">
          {hud.promptText}
        </div>
      )}

      {/* Bottom Center: Boss Health & Posture Bar (Only during Boss Encounters) */}
      {hud.boss ? (
        <div className="self-center w-[min(640px,78vw)] mb-2 text-center">
          <div className="font-display text-sm md:text-base uppercase tracking-[0.14em] text-[#d4a853] mb-1">
            {hud.boss.name} {hud.boss.phase === 2 ? '· Phase II' : ''}
          </div>
          <div className="h-3.5 bg-[#161118] border border-[#6b4f35]">
            <div
              className="h-full bg-[#bd2b3c]"
              style={{ width: `${(hud.boss.hp / Math.max(1, hud.boss.maxHp)) * 100}%` }}
            />
          </div>
          <div className="h-1 bg-[#1b171d] mt-1">
            <div
              className="h-full bg-[#e5b85c]"
              style={{ width: `${(hud.boss.stagger / Math.max(1, hud.boss.maxStagger)) * 100}%` }}
            />
          </div>
        </div>
      ) : (
        <div />
      )}

      {/* Tooltip-free active blessing/relic count reference for accessibility */}
      <span className="sr-only">
        {hud.blessings.map((id) => BLESSINGS_POOL.find((b) => b.id === id)?.name).join(', ')}
        {hud.relics.map((id) => RELICS_POOL.find((r) => r.id === id)?.name).join(', ')}
      </span>
    </div>
  );
}
