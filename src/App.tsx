import React, { useEffect, useRef, useState } from 'react';
import { BastionModal } from './components/BastionModal';
import { BlessingModal } from './components/BlessingModal';
import { GameHud } from './components/GameHud';
import { GameMenuModal } from './components/GameMenuModal';
import { GameOverModal } from './components/GameOverModal';
import { LauncherModal, type BeforeInstallPromptEvent } from './components/LauncherModal';
import { MerchantModal } from './components/MerchantModal';
import { PauseModal } from './components/PauseModal';
import { TitleScreen } from './components/TitleScreen';
import { CendresEngine } from './game/engine';
import { defaultSave } from './game/rules';
import type {
  BlessingDef,
  GamePhase,
  HudSnapshot,
  QualityLevel,
  RunState,
  RunSummary,
  SaveData,
} from './game/types';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<CendresEngine | null>(null);

  const [phase, setPhase] = useState<GamePhase>('title');
  const [save, setSave] = useState<SaveData>(() => defaultSave());
  const [hud, setHud] = useState<HudSnapshot | null>(null);
  const [blessingChoices, setBlessingChoices] = useState<BlessingDef[]>([]);
  const [merchantRun, setMerchantRun] = useState<RunState | null>(null);
  const [runSummary, setRunSummary] = useState<RunSummary | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const params = new URLSearchParams(window.location.search);
    const autostart = params.get('autostart') === '1';

    const engine = new CendresEngine(canvas, {
      onPhaseChange: (nextPhase) => setPhase(nextPhase),
      onSaveChange: (nextSave) => setSave(nextSave),
      onHudUpdate: (nextHud) => setHud(nextHud),
      onBlessingChoices: (choices) => setBlessingChoices(choices),
      onMerchantOpen: (run) => setMerchantRun(run),
      onRunSummary: (summary) => setRunSummary(summary),
    });

    const fogParam = params.get('fog') as QualityLevel | null;
    const fpsParam = params.get('fps');
    if (fogParam === 'medium' || fogParam === 'off' || fpsParam === '1') {
      engine.updateSettings({
        ...(fogParam === 'medium' || fogParam === 'off' ? { fogQuality: fogParam } : {}),
        ...(fpsParam === '1' ? { showFps: true } : {}),
      });
    }

    engineRef.current = engine;
    engine.init(autostart);

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#070609]">
      {/* Isolated Canvas Mount: React HUD updates never unmount or reset the 60fps loop */}
      <div className="absolute inset-0">
        <canvas
          ref={canvasRef}
          tabIndex={0}
          data-testid="game-canvas"
          className="block w-full h-full outline-none"
        />
      </div>

      {!isOnline && (
        <div
          className="fixed bottom-3 left-4 z-40 px-3 py-1.5 text-[11px] font-display uppercase tracking-wider bg-[#1b1510]/95 text-[#ffd470] border border-[#8a652d] pointer-events-none"
          data-testid="offline-badge"
        >
          Mode Hors-ligne · Cache PWA actif
        </div>
      )}

      {phase === 'title' && (
        <TitleScreen
          save={save}
          installPrompt={installPrompt}
          onStartRun={() => engineRef.current?.startNewRun()}
          onStartTraining={() => engineRef.current?.startTrainingMode()}
          onOpenBastion={() => engineRef.current?.openBastion()}
          onOpenMenu={() => setMenuOpen(true)}
          onOpenLauncher={() => setLauncherOpen(true)}
          onToggleMute={() => engineRef.current?.toggleMute()}
        />
      )}

      {phase === 'playing' && hud && (
        <GameHud
          hud={hud}
          keyBindings={save.settings?.keyBindings}
          muted={save.muted}
          onToggleMute={() => engineRef.current?.toggleMute()}
          onOpenPause={() => engineRef.current?.openPause()}
        />
      )}

      {phase === 'bastion' && (
        <BastionModal
          save={save}
          expeditionRewards={runSummary?.rewards}
          onUpdateSave={(updater) => engineRef.current?.updateSave(updater)}
          onResetSave={() => engineRef.current?.resetSave()}
          onStartRun={() => engineRef.current?.startNewRun()}
          onStartTraining={() => engineRef.current?.startTrainingMode()}
          onReturnTitle={() => engineRef.current?.openTitle()}
        />
      )}

      {phase === 'blessing' && hud && (
        <BlessingModal
          depth={hud.depth}
          isAfterBoss={hud.depth % 3 === 0}
          ownedIds={[...hud.blessings, ...hud.relics]}
          choices={blessingChoices}
          onSelect={(id) => engineRef.current?.selectBlessing(id)}
          onExtractVictory={() => engineRef.current?.extractVictory()}
        />
      )}

      {phase === 'merchant' && merchantRun && (
        <MerchantModal
          run={merchantRun}
          onBuy={(type, id) => engineRef.current?.buyMerchantItem(type, id)}
          onClose={() => engineRef.current?.closeMerchant()}
        />
      )}

      {phase === 'paused' && !menuOpen && !launcherOpen && (
        <PauseModal
          hud={hud}
          onResume={() => engineRef.current?.resumeGame()}
          onRestart={() => {
            if (hud?.isTraining) engineRef.current?.startTrainingMode();
            else engineRef.current?.startNewRun();
          }}
          onOpenMenu={() => setMenuOpen(true)}
          onReturnBastion={() => engineRef.current?.extractReturnBastion()}
        />
      )}

      {phase === 'gameover' && runSummary && (
        <GameOverModal
          summary={runSummary}
          onPlayAgain={() => engineRef.current?.startNewRun()}
          onOpenBastion={() => engineRef.current?.openBastion()}
        />
      )}

      {menuOpen && (
        <GameMenuModal
          save={save}
          onUpdateSettings={(partial) => engineRef.current?.updateSettings(partial)}
          onResetSettings={() => engineRef.current?.resetSettings()}
          onToggleMute={() => engineRef.current?.toggleMute()}
          onExportSave={() => engineRef.current?.exportSaveData() || '{}'}
          onImportSave={(raw) => engineRef.current?.importSaveData(raw) || false}
          onResetSave={() => engineRef.current?.resetSave()}
          onOpenLauncher={() => {
            setMenuOpen(false);
            setLauncherOpen(true);
          }}
          onClose={() => setMenuOpen(false)}
        />
      )}

      {launcherOpen && (
        <LauncherModal
          save={save}
          installPrompt={installPrompt}
          onUpdateSettings={(partial) => engineRef.current?.updateSettings(partial)}
          onClose={() => setLauncherOpen(false)}
        />
      )}
    </div>
  );
}

