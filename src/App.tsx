import { Component, lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { BlessingModal } from './components/BlessingModal';
import { GameHud } from './components/GameHud';
import { GameOverModal } from './components/GameOverModal';
import type { BeforeInstallPromptEvent } from './components/LauncherModal';
import { MerchantModal } from './components/MerchantModal';
import { PauseModal } from './components/PauseModal';
import { TitleScreen } from './components/TitleScreen';
import { UpdateNotice } from './components/UpdateNotice';
import { CendresEngine } from './game/engine';
import { focusGamepadMenu, handleGamepadMenu } from './game/menuNavigation';
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

const BastionModal = lazy(() => import('./components/BastionModal').then(({ BastionModal }) => ({ default: BastionModal })));
const GameMenuModal = lazy(() => import('./components/GameMenuModal').then(({ GameMenuModal }) => ({ default: GameMenuModal })));
const LauncherModal = lazy(() => import('./components/LauncherModal').then(({ LauncherModal }) => ({ default: LauncherModal })));

class DeferredMenuBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function FocusDeferredMenu({ onMount, children }: { onMount: () => void; children: ReactNode }) {
  useLayoutEffect(onMount, [onMount]);
  return children;
}

export default function App() {
  const appRef = useRef<HTMLDivElement | null>(null);
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
      isOverlayOpen: () => !!appRef.current?.querySelector('[data-gamepad-menu="overlay"]'),
      onGamepadMenu: (command) => {
        if (appRef.current) handleGamepadMenu(appRef.current, command);
      },
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

  const deferredMenu = launcherOpen ? 'launcher' : menuOpen ? 'options' : phase === 'bastion' ? 'bastion' : null;
  const focusMenu = useCallback(() => {
    if (appRef.current && engineRef.current?.isUsingGamepad()) focusGamepadMenu(appRef.current);
  }, []);

  useEffect(() => {
    if (!deferredMenu) focusMenu();
  }, [phase, deferredMenu, focusMenu]);

  const closeDeferredMenu = () => {
    if (deferredMenu === 'bastion') {
      engineRef.current?.openTitle();
      return;
    }
    setMenuOpen(false);
    setLauncherOpen(false);
  };

  return (
    <div ref={appRef} className="relative w-screen h-screen overflow-hidden bg-[#070609]">
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

      {phase === 'title' && !menuOpen && !launcherOpen && <UpdateNotice />}

      {phase === 'title' && (
        <TitleScreen
          inactive={menuOpen || launcherOpen}
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

      {deferredMenu && (
        <DeferredMenuBoundary
          key={deferredMenu}
          fallback={(
            <FocusDeferredMenu onMount={focusMenu}>
              <div
                data-ui-interactive="true"
                data-gamepad-menu={deferredMenu === 'bastion' ? 'bastion' : 'overlay'}
                className="fixed inset-0 z-50 grid place-items-center bg-black/75"
              >
                <div className="max-w-sm border border-[#5c4835] bg-[#110e15] p-6 text-center text-[#e8e1d5]">
                  <p role="alert">Impossible de charger cet écran.</p>
                  <div className="mt-4 flex justify-center gap-3">
                    <button
                      type="button"
                      data-gamepad-back
                      data-gamepad-default
                      className="cursor-pointer border border-[#5c4835] px-3 py-2"
                      onClick={closeDeferredMenu}
                    >
                      Retour
                    </button>
                    {phase !== 'paused' && (
                      <button
                        type="button"
                        className="cursor-pointer border border-[#5c4835] px-3 py-2"
                        onClick={() => window.location.reload()}
                      >
                        Recharger le jeu
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </FocusDeferredMenu>
          )}
        >
          <Suspense
            fallback={(
              <div
                role="status"
                data-ui-interactive="true"
                data-gamepad-menu={deferredMenu === 'bastion' ? 'bastion' : 'overlay'}
                className="fixed inset-0 z-50 grid place-items-center bg-black/75 font-display text-[#e8e1d5]"
              >
                Chargement…
              </div>
            )}
          >
            <FocusDeferredMenu onMount={focusMenu}>
              {deferredMenu === 'bastion' && (
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

              {deferredMenu === 'options' && (
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

              {deferredMenu === 'launcher' && (
                <LauncherModal
                  save={save}
                  installPrompt={installPrompt}
                  onUpdateSettings={(partial) => engineRef.current?.updateSettings(partial)}
                  onClose={() => setLauncherOpen(false)}
                />
              )}
            </FocusDeferredMenu>
          </Suspense>
        </DeferredMenuBoundary>
      )}
    </div>
  );
}

