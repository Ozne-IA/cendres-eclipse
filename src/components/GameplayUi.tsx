import { BlessingModal } from './BlessingModal';
import { GameHud } from './GameHud';
import { GameOverModal } from './GameOverModal';
import { MerchantModal } from './MerchantModal';
import { PauseModal } from './PauseModal';
import type { CendresEngine } from '../game/engine';
import type {
  BlessingDef,
  GamePhase,
  HudSnapshot,
  RunState,
  RunSummary,
  SaveData,
} from '../game/types';

export interface GameplayUiProps {
  phase: GamePhase;
  save: SaveData;
  hud: HudSnapshot | null;
  blessingChoices: BlessingDef[];
  merchantRun: RunState | null;
  runSummary: RunSummary | null;
  menuOpen: boolean;
  launcherOpen: boolean;
  engine: CendresEngine | null;
  onOpenMenu: () => void;
}

export function GameplayUi({
  phase,
  save,
  hud,
  blessingChoices,
  merchantRun,
  runSummary,
  menuOpen,
  launcherOpen,
  engine,
  onOpenMenu,
}: GameplayUiProps) {
  return (
    <>
      {phase === 'playing' && hud && (
        <GameHud
          hud={hud}
          keyBindings={save.settings?.keyBindings}
          muted={save.muted}
          onToggleMute={() => engine?.toggleMute()}
          onOpenPause={() => engine?.openPause()}
        />
      )}

      {phase === 'blessing' && hud && (
        <BlessingModal
          depth={hud.depth}
          isAfterBoss={hud.depth % 3 === 0}
          ownedIds={[...hud.blessings, ...hud.relics]}
          choices={blessingChoices}
          onSelect={(id) => engine?.selectBlessing(id)}
          onExtractVictory={() => engine?.extractVictory()}
        />
      )}

      {phase === 'merchant' && merchantRun && (
        <MerchantModal
          run={merchantRun}
          onBuy={(type, id) => engine?.buyMerchantItem(type, id)}
          onClose={() => engine?.closeMerchant()}
        />
      )}

      {phase === 'paused' && !menuOpen && !launcherOpen && (
        <PauseModal
          hud={hud}
          onResume={() => engine?.resumeGame()}
          onRestart={() => {
            if (hud?.isTraining) engine?.startTrainingMode(hud.trainingExercise?.id);
            else engine?.startNewRun();
          }}
          onOpenMenu={onOpenMenu}
          onStartTraining={(exercise) => engine?.startTrainingMode(exercise)}
          onReturnBastion={() => engine?.extractReturnBastion()}
        />
      )}

      {phase === 'gameover' && runSummary && (
        <GameOverModal
          summary={runSummary}
          onPlayAgain={() => engine?.startNewRun()}
          onOpenBastion={() => engine?.openBastion()}
        />
      )}
    </>
  );
}
