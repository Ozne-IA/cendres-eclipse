import React from 'react';
import { DEFAULT_KEY_BINDINGS, DIFFICULTIES_DEF } from '../game/data';
import { formatKeyLabel } from '../game/input';
import type { SaveData } from '../game/types';
import { EclipseTitleEmblem, SoundIcon } from './GameIcons';
import type { BeforeInstallPromptEvent } from './LauncherModal';

interface TitleScreenProps {
  save: SaveData;
  installPrompt?: BeforeInstallPromptEvent | null;
  onStartRun: () => void;
  onStartTraining: () => void;
  onOpenBastion: () => void;
  onOpenMenu: () => void;
  onOpenLauncher: () => void;
  onToggleMute: () => void;
}

export function TitleScreen({
  save,
  installPrompt,
  onStartRun,
  onStartTraining,
  onOpenBastion,
  onOpenMenu,
  onOpenLauncher,
  onToggleMute,
}: TitleScreenProps) {
  const diff = DIFFICULTIES_DEF[save.settings?.difficulty || 'awakened'];
  const kb = save.settings?.keyBindings ?? DEFAULT_KEY_BINDINGS;
  const controls = [
    ['Déplacer', `${formatKeyLabel(kb.left)} / ${formatKeyLabel(kb.right)}`],
    ['Sauter', formatKeyLabel(kb.jump)],
    ['Esquiver', formatKeyLabel(kb.dash)],
    ['Attaquer', `${formatKeyLabel(kb.attack)} / Clic G`],
    ['Dévier', `${formatKeyLabel(kb.parry)} / Clic D`],
  ];

  const handleInstall = async () => {
    if (!installPrompt) return;
    try {
      await installPrompt.prompt();
      await installPrompt.userChoice;
    } catch {
      // ignore cancellation
    }
  };

  return (
    <div
      className="fixed inset-0 z-10 flex flex-col justify-between gap-4 overflow-y-auto p-5 md:p-12"
      data-testid="title-screen"
      data-ui-interactive="true"
    >
      {/* Top Bar: PWA Install, Launcher PC, Menu & Audio Toggle */}
      <div className="flex flex-wrap justify-end items-center gap-2.5">
        {installPrompt && (
          <button
            type="button"
            onClick={(e) => {
              e.currentTarget.blur();
              void handleInstall();
            }}
            className="px-3.5 py-2 text-xs font-display uppercase tracking-wider text-[#ffd470] bg-[#1e1712]/95 border border-[#d4a853] hover:bg-[#2a2018] transition-colors cursor-pointer whitespace-nowrap"
          >
            Installer App
          </button>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            onOpenLauncher();
          }}
          className="px-3.5 py-2 text-xs font-display uppercase tracking-wider text-[#8ab8e6] bg-[#110e15]/90 border border-[#3a4b5c] hover:border-[#8ab8e6] transition-colors cursor-pointer whitespace-nowrap"
        >
          Launcher PC
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.currentTarget.blur();
            onOpenMenu();
          }}
          className="px-3.5 py-2 text-xs font-display uppercase tracking-wider text-[#e8e1d5] bg-[#110e15]/90 border border-[#4a3b2c] hover:border-[#d4a853] transition-colors cursor-pointer whitespace-nowrap"
        >
          Menu &amp; Options
        </button>

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
      <div className="max-w-2xl space-y-4 md:space-y-6">
        <EclipseTitleEmblem />

        <p className="text-sm md:text-base text-[#b8afa2] max-w-md leading-relaxed">
          Déviation au fil de la lame, strates procédurales et reconstruction du Bastion du Crépuscule.
        </p>

        <div className="text-xs text-[#9d9284] tracking-wide font-mono-num">
          <span className="text-[#d4a853]">{diff.name}</span>
          {(save.ascensionLevel || 0) > 0 && (
            <>
              <span className="mx-2 text-[#4a3b2c]" aria-hidden="true">·</span>
              <span className="text-[#8ab8e6]">Ascension {save.ascensionLevel}</span>
            </>
          )}
          <span className="mx-2 text-[#4a3b2c]" aria-hidden="true">·</span>
          <span>Meilleure strate : {save.records.bestDepth}</span>
          <span className="mx-2 text-[#4a3b2c]" aria-hidden="true">·</span>
          <span>Expéditions : {save.records.runs}</span>
          <span className="mx-2 text-[#4a3b2c]" aria-hidden="true">·</span>
          <span>Gardiens : {save.records.bossesSlain}</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
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
          <button
            type="button"
            onClick={onStartTraining}
            className="px-5 py-3.5 text-sm font-display tracking-wider uppercase bg-[#121923] text-[#bdd9f2] border border-[#516f89] hover:border-[#bdd9f2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#bdd9f2] cursor-pointer"
          >
            Cour d’entraînement
          </button>
        </div>
      </div>

      <ul aria-label="Commandes clavier et souris" className="self-start flex flex-wrap gap-x-4 gap-y-2 bg-[#0c0910]/95 px-3 py-2.5 border border-[#4a3b2c] text-xs text-[#ded6ca] m-0">
        {controls.map(([action, key]) => (
          <li key={action} className="flex items-center gap-1.5">
            <kbd className="rounded-sm border border-[#655440] px-1.5 py-0.5 text-[#ffe0a0]">{key}</kbd>
            {action}
          </li>
        ))}
      </ul>
    </div>
  );
}
