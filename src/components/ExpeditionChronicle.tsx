import { computeComboRank } from '../game/rules';
import type { RunBests, RunRecord } from '../game/types';

const outcomeLabels: Record<RunRecord['outcome'], string> = {
  victory: 'Victoire',
  defeat: 'Défaite',
  return: 'Retour au Bastion',
};

function formatDuration(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

export function ExpeditionChronicle({ history, bests }: { history: RunRecord[]; bests: RunBests }) {
  return (
    <section className="space-y-3" aria-labelledby="expedition-chronicle-heading">
      <h3 id="expedition-chronicle-heading" className="font-display text-sm uppercase tracking-widest text-[#d4a853] m-0">
        Chroniques des expéditions
      </h3>
      {history.length === 0 ? (
        <p className="text-xs text-[#b8afa2] m-0">Terminez une expédition pour commencer les chroniques.</p>
      ) : (
        <>
          <div className="bg-[#18141e] border border-[#352b22] p-3 text-xs text-[#e8e1d5]">
            <h4 className="text-[#d4a853] m-0 mb-1">Records locaux</h4>
            <p className="m-0">
              Strate {bests.depthReached} · {bests.kills} vaincus · {bests.parries} déviations ·
              {' '}{bests.damageDealt} dégâts infligés · Rang {computeComboRank(bests.peakComboHits).rank}
            </p>
          </div>
          <ol className="m-0 p-0 list-none space-y-2">
            {history.map((record, index) => (
              <li key={index} className="bg-[#18141e] border border-[#352b22] p-3 text-xs">
                <p className="text-[#e8e1d5] m-0">
                  {index === 0 ? 'Dernière expédition' : `Expédition −${index}`}{' · '}
                  {outcomeLabels[record.outcome]} · Strate {record.depthReached} · Ascension {record.ascensionLevel}
                </p>
                <p className="text-[#b8afa2] m-0 mt-1">
                  {formatDuration(record.elapsedSec)} · {record.kills} vaincus · {record.parries} déviations ·
                  {' '}{record.damageDealt} dégâts infligés · {record.damageTaken} reçus ·
                  {' '}Rang {computeComboRank(record.peakComboHits).rank}
                </p>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
