import React from 'react';
import type { SaveData } from '../game/types';
import { EclipseTitleEmblem, SoundIcon } from './GameIcons';

interface TitleScreenProps {
  save: SaveData;
  onStartRun: () => void;
  onOpenBastion: () => void;
  onToggleMute: () => void;
}

export function TitleScreen({ save, onStartRun, onOpenBastion, onToggleMute }: TitleScreenProps) {
  return (
    <div
      className="fixed inset-0 z-10 flex flex-col justify-between p-8 md:p-14 pointer-events-none"
      data-testid="title-screen"
    >
      {/* Top Bar: Minimal Mute Toggle */}
      <div className="flex justify-end pointer-events-auto">
        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            onToggleMute();
          }}
          aria-label={save.muted ? 'Activer le son' : 'Couper le son'}
          className="flex items-center gap-2 px-3 py-2 text-xs text-[#d4a853] bg-[#110e15]/90 border border-[#4a3b2c] hover:border-[#d4a853] transition-colors cursor-pointer whitespace-nowrap"
        >
          <SoundIcon muted={save.muted} />
          <span>{save.muted ? 'Son coupé' : 'Audio actif'}</span>
        </button>
      </div>

      {/* Left-Third Negative Space Composition */}
      <div className="max-w-xl space-y-6 pointer-events-auto">
        <EclipseTitleEmblem />

        <p className="text-sm md:text-base text-[#b8afa2] max-w-md leading-relaxed">
          Déviation au fil de la lame, strates procédurales et reconstruction du Bastion du Crépuscule.
        </p>

        <div className="text-xs text-[#9d9284] tracking-wide font-mono-num">
          <span>Meilleure strate : {save.records.bestDepth}</span>
          <span className="mx-2 text-[#4a3b2c]" aria-hidden="true">·</span>
          <span>Expéditions : {save.records.runs}</span>
          <span className="mx-2 text-[#4a3b2c]" aria-hidden="true">·</span>
          <span>Gardiens terrassés : {save.records.bossesSlain}</span>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-2">
          <button
            type="button"
            data-start="true"
            onClick={(e) => {
              e.currentTarget.blur();
              onStartRun();
            }}
            className="px-7 py-3.5 text-sm font-display font-semibold tracking-widest uppercase bg-[#781e28] text-[#fff0f2] border border-[#c44755] hover:bg-[#912430] hover:border-[#ff8a97] transition-colors cursor-pointer whitespace-nowrap"
          >
            Descendre dans l&apos;Abîme
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              onOpenBastion();
            }}
            className="px-6 py-3.5 text-sm font-display tracking-wider uppercase bg-[#16121b] text-[#d4a853] border border-[#5c4833] hover:border-[#d4a853] hover:text-[#fff3d6] transition-colors cursor-pointer whitespace-nowrap"
          >
            Bastion du Crépuscule
          </button>
        </div>
      </div>

      {/* Single Flat Control Hint Line */}
      <div className="text-xs text-[#9d9284] tracking-wide">
        Q/D Déplacer · Espace Sauter · Shift Roulade · Clic G Attaque · Clic D Déviation · F Lourde · R Fiole · E Interagir · Échap Pause
      </div>
    </div>
  );
}
