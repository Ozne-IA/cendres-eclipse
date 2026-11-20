import React, { useEffect, useState } from 'react';
import { AudioFX } from '../game/audio';
import {
  buildLaunchUrl,
  generatePcLauncherReadme,
  generatePowerShellLauncher,
  generateUnixShLauncher,
  generateWindowsBat,
  sanitizePort,
  type PcLauncherConfig,
} from '../game/pcLauncher';
import type { GameSettings, QualityLevel, SaveData } from '../game/types';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface LauncherModalProps {
  save: SaveData;
  installPrompt: BeforeInstallPromptEvent | null;
  onUpdateSettings: (partial: Partial<GameSettings>) => void;
  onClose: () => void;
}

export function LauncherModal({
  save,
  installPrompt,
  onUpdateSettings,
  onClose,
}: LauncherModalProps) {
  const [port, setPort] = useState<number>(save.settings.pcLauncherPort || 4173);
  const [appMode, setAppMode] = useState<boolean>(save.settings.pcAppMode !== false);
  const [fullscreen, setFullscreen] = useState<boolean>(false);
  const [autostart, setAutostart] = useState<boolean>(false);
  const [fogQuality, setFogQuality] = useState<QualityLevel>(save.settings.fogQuality || 'high');
  const [showFps, setShowFps] = useState<boolean>(save.settings.showFps);
  const [feedback, setFeedback] = useState<string>('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const cfg: PcLauncherConfig = {
    port: sanitizePort(port),
    appMode,
    fullscreen,
    autostart,
    fogQuality,
    showFps,
  };

  const downloadFile = (filename: string, content: string, mime = 'text/plain;charset=utf-8') => {
    onUpdateSettings({ pcLauncherPort: cfg.port, pcAppMode: cfg.appMode });
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    AudioFX.pickup();
    setFeedback(`Script « ${filename} » généré et téléchargé.`);
  };

  const handleInstallPwa = async () => {
    if (!installPrompt) return;
    try {
      await installPrompt.prompt();
      const res = await installPrompt.userChoice;
      if (res.outcome === 'accepted') {
        AudioFX.victory();
        setFeedback('Application bureau installée sur votre PC.');
      }
    } catch {
      // ignore prompt cancellation
    }
  };

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-[#070609]/92 p-4 md:p-8"
      data-ui-interactive="true"
      data-testid="launcher-modal"
    >
      <div className="w-full max-w-3xl max-h-[88vh] flex flex-col bg-[#110e15] border border-[#5c4835] shadow-[0_0_80px_rgba(0,0,0,0.95)]">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-[#332920] bg-[#0d0a10]">
          <div>
            <h2 className="font-display text-lg md:text-2xl text-[#d4a853] tracking-[0.14em] uppercase m-0">
              Launcher PC Standalone
            </h2>
            <p className="text-xs text-[#9d9284] m-0 mt-0.5">
              Exécutez Cendres de l&apos;Éclipse directement depuis votre bureau Windows, macOS ou Linux en fenêtre dédiée.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              AudioFX.ui();
              onClose();
            }}
            className="px-4 py-2 text-xs font-display uppercase tracking-wider bg-[#6e1c26] text-[#ffe8ea] border border-[#b54552] hover:bg-[#8e2431] cursor-pointer"
          >
            Fermer
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Desktop PWA Instant Install if supported */}
          {installPrompt && (
            <div className="bg-[#1b1522] border border-[#d4a853] p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-display text-sm text-[#ffd470]">
                  Installation directe Bureau (Application Native Chrome/Edge)
                </div>
                <div className="text-xs text-[#cfc6b8] mt-0.5">
                  Ajoute un raccourci natif « Cendres de l&apos;Éclipse » dans votre menu Démarrer / Bureau sans barre de navigateur.
                </div>
              </div>
              <button
                type="button"
                onClick={handleInstallPwa}
                className="px-4 py-2 text-xs font-display uppercase tracking-wider bg-[#781e28] text-white border border-[#c44755] hover:bg-[#912430] cursor-pointer"
              >
                Installer sur ce PC
              </button>
            </div>
          )}

          {/* Launcher Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="bg-[#18141e] border border-[#3a2f24] p-4 space-y-2">
              <label className="block font-display text-xs uppercase tracking-wider text-[#d4a853]">
                Port serveur local PC
              </label>
              <input
                type="number"
                min={1024}
                max={65535}
                value={port}
                onChange={(e) => setPort(Number(e.target.value))}
                className="w-full px-3 py-2 bg-[#0d0a10] border border-[#4a3b2c] text-sm font-mono-num text-[#f2ece1] outline-none focus:border-[#d4a853]"
              />
              <div className="text-[11px] text-[#8f8578] font-mono-num truncate">
                URL : {buildLaunchUrl(cfg)}
              </div>
            </div>

            <div className="bg-[#18141e] border border-[#3a2f24] p-4 space-y-2">
              <div className="font-display text-xs uppercase tracking-wider text-[#d4a853]">
                Préréglage Brouillard au lancement
              </div>
              <div className="flex gap-2 pt-1">
                {(['high', 'medium', 'off'] as QualityLevel[]).map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => {
                      AudioFX.ui();
                      setFogQuality(q);
                    }}
                    className={`flex-1 py-2 text-xs font-display uppercase border cursor-pointer ${
                      fogQuality === q
                        ? 'bg-[#362819] text-[#ffd470] border-[#d4a853]'
                        : 'bg-[#120e17] text-[#9d9284] border-[#352b22]'
                    }`}
                  >
                    {q === 'high' ? 'Élevé' : q === 'medium' ? 'Moyen' : 'Off'}
                  </button>
                ))}
              </div>
            </div>

            <LauncherToggle
              label="Fenêtre dédiée sans bordure (--app)"
              desc="Masque la barre d’URL du navigateur pour une expérience PC native."
              checked={appMode}
              onClick={() => setAppMode(!appMode)}
            />
            <LauncherToggle
              label="Plein écran automatique"
              desc="Démarre directement en plein écran au lancement."
              checked={fullscreen}
              onClick={() => setFullscreen(!fullscreen)}
            />
            <LauncherToggle
              label="Plongée immédiate (?autostart=1)"
              desc="Entre directement en Strate 1 sans passer par l’écran titre."
              checked={autostart}
              onClick={() => setAutostart(!autostart)}
            />
            <LauncherToggle
              label="Afficher le compteur FPS"
              desc="Active la télémétrie d’images par seconde dans le coin droit."
              checked={showFps}
              onClick={() => setShowFps(!showFps)}
            />
          </div>

          {/* 1-Click Script Exports */}
          <div className="bg-[#18141e] border border-[#3a2f24] p-4 space-y-3">
            <div className="font-display text-sm text-[#d4a853] uppercase tracking-wider">
              Télécharger le Lanceur configuré (dossier launcher/ du projet)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={() =>
                  downloadFile('Lancer_Cendres_Eclipse.bat', generateWindowsBat(cfg))
                }
                className="py-2.5 px-3 text-xs font-display uppercase tracking-wider bg-[#261e17] text-[#ffd470] border border-[#d4a853] hover:bg-[#382b1f] cursor-pointer"
              >
                Windows (.bat)
              </button>
              <button
                type="button"
                onClick={() =>
                  downloadFile('Lancer_Cendres_Eclipse.ps1', generatePowerShellLauncher(cfg))
                }
                className="py-2.5 px-3 text-xs font-display uppercase tracking-wider bg-[#151b22] text-[#8ab8e6] border border-[#3a4b5c] hover:border-[#8ab8e6] cursor-pointer"
              >
                PowerShell (.ps1)
              </button>
              <button
                type="button"
                onClick={() =>
                  downloadFile('Lancer_Cendres_Eclipse.sh', generateUnixShLauncher(cfg))
                }
                className="py-2.5 px-3 text-xs font-display uppercase tracking-wider bg-[#181a1f] text-[#e8e1d5] border border-[#4a3b2c] hover:border-[#d4a853] cursor-pointer"
              >
                Linux / macOS (.sh)
              </button>
              <button
                type="button"
                onClick={() =>
                  downloadFile('GUIDE_LANCEUR_PC.md', generatePcLauncherReadme(cfg))
                }
                className="py-2.5 px-3 text-xs font-display uppercase tracking-wider bg-[#18141e] text-[#cfc6b8] border border-[#352b22] hover:border-[#d4a853] cursor-pointer"
              >
                Guide PC (.md)
              </button>
            </div>
            {feedback && <div className="text-xs text-[#5db87a]">{feedback}</div>}
          </div>

          {/* CLI Instructions */}
          <div className="bg-[#0d0a10] border border-[#332920] p-4 space-y-2 text-xs text-[#b8afa2]">
            <div className="font-display text-[#d4a853] uppercase tracking-wider">
              Lancement rapide depuis un terminal PC (Node.js 18+)
            </div>
            <pre className="bg-[#070609] border border-[#2a2119] p-3 font-mono-num text-[11px] text-[#f2ece1] overflow-x-auto m-0">
{`npm install
npm run build
npm run start:pc -- --port=${cfg.port}`}
            </pre>
            <p className="text-[11px] text-[#8f8578] m-0">
              Astuce : les scripts prêts à l’emploi sont également inclus directement dans le dossier <code className="text-[#d4a853]">launcher/</code> du projet exporté, avec sauvegarde automatique sur disque dans <code className="text-[#d4a853]">cendres-eclipse-save.json</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function LauncherToggle({
  label,
  desc,
  checked,
  onClick,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        AudioFX.ui();
        onClick();
      }}
      className="text-left bg-[#18141e] border border-[#3a2f24] hover:border-[#6b5235] p-3.5 flex items-center justify-between gap-3 cursor-pointer"
    >
      <div>
        <div className="font-display text-xs text-[#e8e1d5] uppercase tracking-wider">{label}</div>
        <div className="text-[11px] text-[#9d9284] mt-0.5">{desc}</div>
      </div>
      <span
        className={`px-2 py-1 text-[10px] font-display uppercase border whitespace-nowrap ${
          checked
            ? 'bg-[#2a2115] text-[#ffd470] border-[#d4a853]'
            : 'bg-[#120e16] text-[#8a8073] border-[#352b22]'
        }`}
      >
        {checked ? 'Oui' : 'Non'}
      </span>
    </button>
  );
}
