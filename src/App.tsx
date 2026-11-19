import React, { useEffect, useRef, useState } from 'react';
import { BastionModal } from './components/BastionModal';
import { BlessingModal } from './components/BlessingModal';
import { GameHud } from './components/GameHud';
import { GameOverModal } from './components/GameOverModal';
import { MerchantModal } from './components/MerchantModal';
import { PauseModal } from './components/PauseModal';
import { TitleScreen } from './components/TitleScreen';
import { CendresEngine } from './game/engine';
import { defaultSave } from './game/rules';
import type {
  BlessingDef,
  GamePhase,
  HudSnapshot,
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

      {phase === 'title' && (
        <TitleScreen
          save={save}
          onStartRun={() => engineRef.current?.startNewRun()}
          onOpenBastion={() => engineRef.current?.openBastion()}
          onToggleMute={() => engineRef.current?.toggleMute()}
        />
      )}

      {phase === 'playing' && hud && (
        <GameHud
          hud={hud}
          muted={save.muted}
          onToggleMute={() => engineRef.current?.toggleMute()}
          onOpenPause={() => engineRef.current?.openPause()}
        />
      )}

      {phase === 'bastion' && (
        <BastionModal
          save={save}
          onUpdateSave={(updater) => engineRef.current?.updateSave(updater)}
          onResetSave={() => engineRef.current?.resetSave()}
          onStartRun={() => engineRef.current?.startNewRun()}
          onReturnTitle={() => engineRef.current?.openTitle()}
        />
      )}

      {phase === 'blessing' && hud && (
        <BlessingModal
          depth={hud.depth}
          isAfterBoss={hud.depth % 3 === 0}
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

      {phase === 'paused' && (
        <PauseModal
          hud={hud}
          onResume={() => engineRef.current?.resumeGame()}
          onRestart={() => engineRef.current?.startNewRun()}
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
    </div>
  );
}
