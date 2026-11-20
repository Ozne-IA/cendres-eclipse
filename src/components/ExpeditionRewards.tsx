import type { ResourceBag } from '../game/types';
import { CinderIcon, IronIcon, TearIcon } from './GameIcons';

export function ExpeditionRewards({ rewards }: { rewards: ResourceBag }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border border-[#4a3b2c] bg-[#18141e] px-4 py-2.5 text-left text-xs">
      <p className="m-0 text-[#ded6ca]">Gains de l’expédition</p>
      <ul className="m-0 flex flex-wrap gap-x-4 gap-y-1 font-mono-num text-[#f2ece1]">
        <li className="flex items-center gap-1.5"><CinderIcon className="w-3.5 h-3.5" />+{rewards.cendres} Cendres</li>
        <li className="flex items-center gap-1.5"><IronIcon className="w-3.5 h-3.5" />+{rewards.fer} Fer</li>
        <li className="flex items-center gap-1.5"><TearIcon className="w-3.5 h-3.5" />+{rewards.larmes} Larmes</li>
      </ul>
    </div>
  );
}
