import React, { useState } from 'react';
import {
  ARMOR_SKINS_DEF,
  BUILDINGS_DEF,
  ENEMY_LORE,
  LORE_TABLETS,
  NPCS_DEF,
  OATHS_DEF,
  QUESTS_DEF,
  TALENTS_DEF,
  WEAPONS_DEF,
} from '../game/data';
import {
  calculateBastionProduction,
  canAfford,
  getBuildingCost,
  getNpcUpgradeCost,
  getWeaponUpgradeCost,
  isSkinUnlocked,
  payCost,
} from '../game/rules';
import type {
  ArmorSkinKey,
  BuildingKey,
  EnemyKind,
  NpcKey,
  OathKey,
  ResourceBag,
  SaveData,
  TalentKey,
  WeaponKey,
} from '../game/types';
import { AudioFX } from '../game/audio';
import { CinderIcon, IronIcon, TearIcon } from './GameIcons';
import { ExpeditionRewards } from './ExpeditionRewards';
import { ExpeditionChronicle } from './ExpeditionChronicle';

interface BastionModalProps {
  save: SaveData;
  expeditionRewards?: ResourceBag;
  onUpdateSave: (updater: (prev: SaveData) => SaveData) => void;
  onResetSave: () => void;
  onStartRun: () => void;
  onStartTraining: () => void;
  onReturnTitle: () => void;
}

type BastionTab = 'buildings' | 'npcs' | 'arsenal' | 'talents' | 'codex';

function formatCost(cost: Partial<ResourceBag>): string {
  const parts: string[] = [];
  if (cost.cendres) parts.push(`${cost.cendres} Cendres`);
  if (cost.fer) parts.push(`${cost.fer} Fer`);
  if (cost.larmes) parts.push(`${cost.larmes} Larmes`);
  return parts.join(' · ') || 'Gratuit';
}

export function BastionModal({
  save,
  expeditionRewards,
  onUpdateSave,
  onResetSave,
  onStartRun,
  onStartTraining,
  onReturnTitle,
}: BastionModalProps) {
  const [tab, setTab] = useState<BastionTab>('buildings');
  const [confirmReset, setConfirmReset] = useState(false);

  const prod = calculateBastionProduction(save);
  const maxSlots = save.buildings.refuge || 0;

  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center bg-[#070609]/92 p-4 md:p-6"
      data-ui-interactive="true"
      data-testid="bastion-modal"
      data-gamepad-menu="bastion"
    >
      <div className="w-full max-w-5xl max-h-[92vh] flex flex-col bg-[#110e15] border border-[#4a3b2c] shadow-[0_0_70px_rgba(0,0,0,0.95)]">
        {/* Header */}
        <div className="flex flex-wrap justify-between items-center gap-4 px-6 py-4 border-b border-[#332920]">
          <div>
            <h2 className="font-display text-xl md:text-2xl text-[#d4a853] uppercase tracking-[0.14em] m-0">
              Bastion du Crépuscule
            </h2>
            <p className="text-xs text-[#9d9284] mt-0.5 mb-0">
              Sanctuaire &amp; Préparation · Production passive : +{prod.cendres}🔥 +{prod.fer}⛓️ +{prod.larmes}💧 / expédition
            </p>
          </div>

          <div className="flex items-center gap-5 font-mono-num text-sm">
            <span className="flex items-center gap-1.5 text-[#d4a853]" title="Cendres">
              <CinderIcon className="w-4 h-4" />
              {save.res.cendres}
            </span>
            <span className="flex items-center gap-1.5 text-[#c2cbd6]" title="Fer Noir">
              <IronIcon className="w-4 h-4" />
              {save.res.fer}
            </span>
            <span className="flex items-center gap-1.5 text-[#7ab8ff]" title="Larmes de Lune">
              <TearIcon className="w-4 h-4" />
              {save.res.larmes}
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-1 px-6 pt-3 border-b border-[#2b221a] bg-[#0d0a10]">
          {(
            [
              ['buildings', 'Infrastructures'],
              ['npcs', 'Errants & Quêtes'],
              ['arsenal', 'Arsenal & Serments'],
              ['talents', 'Talents'],
              ['codex', 'Bestiaire & Chroniques'],
            ] as Array<[BastionTab, string]>
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              data-gamepad-default={tab === id || undefined}
              onClick={() => {
                AudioFX.ui();
                setTab(id);
              }}
              className={`px-4 py-2.5 text-xs font-display uppercase tracking-wider border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                tab === id
                  ? 'border-[#d4a853] text-[#ffd470] bg-[#191520]'
                  : 'border-transparent text-[#9d9284] hover:text-[#e8e1d5]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto dark-scroll p-6 space-y-6">
          {expeditionRewards && tab === 'buildings' && (
            <ExpeditionRewards rewards={expeditionRewards} />
          )}
          {tab === 'buildings' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(Object.keys(BUILDINGS_DEF) as BuildingKey[]).map((key) => {
                const def = BUILDINGS_DEF[key];
                const lvl = save.buildings[key] || 0;
                const isMax = lvl >= def.max;
                const cost = getBuildingCost(save, key);
                const affordable = canAfford(save.res, cost);
                const recommendFoyer = !!expeditionRewards && key === 'foyer' && lvl === 0 && affordable;

                return (
                  <div
                    key={key}
                    className={`bg-[#18141e] border p-4 flex flex-col justify-between gap-4 ${recommendFoyer ? 'border-[#a47e48]' : 'border-[#3a2f24]'}`}
                  >
                    <div>
                      <div className="flex justify-between items-baseline gap-2">
                        <h3 className="font-display text-base text-[#d4a853] m-0">{def.name}</h3>
                        <span className="font-mono-num text-xs text-[#9d9284]">
                          Niv. {lvl} / {def.max}
                        </span>
                      </div>
                      <p className="text-xs text-[#b8afa2] leading-relaxed mt-2 mb-0">{def.desc}</p>
                      {recommendFoyer && <p className="text-xs text-[#ffd470] mt-2 mb-0">Première amélioration conseillée</p>}
                    </div>
                    <button
                      type="button"
                      disabled={isMax || !affordable}
                      onClick={() => {
                        if (isMax || !affordable) return;
                        AudioFX.ui();
                        onUpdateSave((s) => ({
                          ...s,
                          res: payCost(s.res, cost),
                          buildings: { ...s.buildings, [key]: (s.buildings[key] || 0) + 1 },
                        }));
                      }}
                      className="w-full py-2 px-3 text-xs font-display uppercase tracking-wider bg-[#261e17] text-[#d4a853] border border-[#6b5235] hover:border-[#d4a853] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                    >
                      {isMax ? 'Niveau Maximum' : `Améliorer (${formatCost(cost)})`}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'npcs' && (
            <>
              <div>
                <div className="flex justify-between items-baseline mb-3">
                  <h3 className="font-display text-sm uppercase tracking-widest text-[#d4a853] m-0">
                    Errants du Refuge ({save.npcsAssigned.length} / {maxSlots} emplacements actifs)
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(Object.keys(NPCS_DEF) as NpcKey[]).map((id) => {
                    const def = NPCS_DEF[id];
                    const unlocked = !!save.npcsUnlocked[id];
                    const assigned = save.npcsAssigned.includes(id);
                    const lvl = save.npcLevels[id] || 1;
                    const upCost = getNpcUpgradeCost(lvl);
                    const canUp = unlocked && lvl < 3 && canAfford(save.res, upCost);

                    return (
                      <div
                        key={id}
                        className="bg-[#18141e] border border-[#3a2f24] p-4 flex flex-col justify-between gap-3"
                      >
                        <div>
                          <div className="flex justify-between items-baseline">
                            <h4 className="font-display text-sm text-[#d4a853] m-0">{def.name}</h4>
                            <span className="text-[11px] font-mono-num text-[#9d9284]">
                              {unlocked ? `Rang ${lvl}/3` : 'Disparu'}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#8ab8e6] mt-0.5">{def.role}</div>
                          <p className="text-xs text-[#b8afa2] leading-relaxed mt-2 mb-0">
                            {unlocked ? def.desc : def.unlockDesc}
                          </p>
                        </div>

                        <div className="flex flex-col gap-2">
                          <button
                            type="button"
                            disabled={!unlocked || (!assigned && save.npcsAssigned.length >= maxSlots)}
                            onClick={() => {
                              AudioFX.ui();
                              onUpdateSave((s) => ({
                                ...s,
                                npcsAssigned: assigned
                                  ? s.npcsAssigned.filter((x) => x !== id)
                                  : [...s.npcsAssigned, id],
                              }));
                            }}
                            className="w-full py-2 px-3 text-xs font-display uppercase tracking-wider bg-[#261e17] text-[#d4a853] border border-[#6b5235] hover:border-[#d4a853] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                          >
                            {!unlocked
                              ? 'À secourir dans l’Abîme'
                              : assigned
                              ? 'Retirer du Refuge'
                              : 'Assigner au Refuge'}
                          </button>

                          {unlocked && lvl < 3 && (
                            <button
                              type="button"
                              disabled={!canUp}
                              onClick={() => {
                                AudioFX.pickup();
                                onUpdateSave((s) => ({
                                  ...s,
                                  res: payCost(s.res, upCost),
                                  npcLevels: { ...s.npcLevels, [id]: lvl + 1 },
                                }));
                              }}
                              className="w-full py-1.5 px-3 text-[11px] uppercase tracking-wider bg-[#151b22] text-[#8ab8e6] border border-[#3a4b5c] hover:border-[#8ab8e6] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                            >
                              Former Rang {lvl + 1} ({formatCost(upCost)})
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="font-display text-sm uppercase tracking-widest text-[#d4a853] mb-3 mt-2">
                  Décrets du Bastion (Quêtes)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {QUESTS_DEF.map((q) => {
                    const claimed = save.questsClaimed.includes(q.id);
                    const prog = q.check(save);
                    const done = prog.current >= prog.target;
                    return (
                      <div
                        key={q.id}
                        className="bg-[#18141e] border border-[#3a2f24] p-3.5 flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="font-display text-sm text-[#e8e1d5]">{q.title}</div>
                          <div className="text-xs text-[#9d9284] mt-0.5">{q.desc}</div>
                          <div className="text-[11px] font-mono-num text-[#d4a853] mt-1">
                            Progrès : {Math.min(prog.current, prog.target)} / {prog.target} · Récompense :{' '}
                            {formatCost(q.reward)}
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={claimed || !done}
                          onClick={() => {
                            if (claimed || !done) return;
                            AudioFX.pickup();
                            onUpdateSave((s) => ({
                              ...s,
                              res: {
                                cendres: s.res.cendres + (q.reward.cendres || 0),
                                fer: s.res.fer + (q.reward.fer || 0),
                                larmes: s.res.larmes + (q.reward.larmes || 0),
                              },
                              questsClaimed: [...s.questsClaimed, q.id],
                            }));
                          }}
                          className="px-3.5 py-2 text-xs font-display uppercase tracking-wider bg-[#6e1c26] text-[#ffe8ea] border border-[#b54552] disabled:bg-[#1f1b24] disabled:border-[#352b22] disabled:text-[#7c7368] cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
                        >
                          {claimed ? 'Réclamé' : done ? 'Réclamer' : 'En cours'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {tab === 'arsenal' && (
            <>
              <div>
                <h3 className="font-display text-sm uppercase tracking-widest text-[#d4a853] mb-3 mt-0">
                  Armes de la Forge
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(Object.keys(WEAPONS_DEF) as WeaponKey[]).map((key) => {
                    const w = WEAPONS_DEF[key];
                    const unlocked = !!save.weaponsUnlocked[key];
                    const equipped = save.weapon === key;
                    const tier = save.weaponTiers[key] || 0;
                    const upCost = getWeaponUpgradeCost(tier);

                    return (
                      <div
                        key={key}
                        className={`bg-[#18141e] border p-4 flex flex-col justify-between gap-3 ${
                          equipped ? 'border-[#d4a853]' : 'border-[#3a2f24]'
                        }`}
                      >
                        <div>
                          <div className="flex justify-between items-baseline">
                            <h4 className="font-display text-base text-[#d4a853] m-0">
                              {w.name} {tier > 0 ? `+${tier}` : ''}
                            </h4>
                            <span className="text-[11px] font-mono-num text-[#9d9284]">
                              {w.style}
                            </span>
                          </div>
                          <p className="text-xs text-[#b8afa2] mt-1.5 mb-2">{w.desc}</p>
                          <div className="text-[11px] font-mono-num text-[#9d9284]">
                            Dégâts ×{(w.dmgMult * (1 + tier * 0.12)).toFixed(2)} · Posture ×{w.staggerMult.toFixed(2)} · Crit {Math.round(w.critChance * 100)}%
                          </div>
                          <div className="mt-2 pt-2 border-t border-[#2b221a] text-xs">
                            <span className="text-[#ffd470] font-display uppercase tracking-wider">
                              Art [C] : {w.artName}
                            </span>
                            <span className="text-[#9d9284] font-mono-num ml-2 text-[11px]">
                              ({w.artStamCost} Souffle · {w.artCooldown}s)
                            </span>
                            <p className="text-[11px] text-[#b8afa2] mt-0.5 mb-0 leading-snug">{w.artDesc}</p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {!unlocked ? (
                            <button
                              type="button"
                              disabled={!canAfford(save.res, w.unlockCost)}
                              onClick={() => {
                                AudioFX.pickup();
                                onUpdateSave((s) => ({
                                  ...s,
                                  res: payCost(s.res, w.unlockCost),
                                  weaponsUnlocked: { ...s.weaponsUnlocked, [key]: true },
                                  weapon: key,
                                }));
                              }}
                              className="flex-1 py-2 px-3 text-xs font-display uppercase tracking-wider bg-[#6e1c26] text-[#ffe8ea] border border-[#b54552] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                            >
                              Forger ({formatCost(w.unlockCost)})
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                disabled={equipped}
                                onClick={() => {
                                  AudioFX.ui();
                                  onUpdateSave((s) => ({ ...s, weapon: key }));
                                }}
                                className="py-2 px-3 text-[11px] font-display uppercase tracking-wider bg-[#261e17] text-[#d4a853] border border-[#6b5235] disabled:border-[#d4a853] disabled:text-[#ffd470] cursor-pointer whitespace-nowrap"
                              >
                                {equipped ? 'Équipée' : 'Équiper'}
                              </button>
                              <button
                                type="button"
                                disabled={tier >= 5 || !canAfford(save.res, upCost)}
                                onClick={() => {
                                  AudioFX.pickup();
                                  onUpdateSave((s) => ({
                                    ...s,
                                    res: payCost(s.res, upCost),
                                    weaponTiers: { ...s.weaponTiers, [key]: tier + 1 },
                                  }));
                                }}
                                className="flex-1 py-2 px-3 text-[11px] font-display uppercase tracking-wider bg-[#151b22] text-[#c2cbd6] border border-[#3a4b5c] hover:border-[#d4a853] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed whitespace-nowrap truncate"
                              >
                                {tier >= 5 ? 'Max (+5)' : `Renforcer (${formatCost(upCost)})`}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="font-display text-sm uppercase tracking-widest text-[#d4a853] mb-3 mt-2">
                  Serments d&apos;Expédition
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {(Object.keys(OATHS_DEF) as OathKey[]).map((id) => {
                    const o = OATHS_DEF[id];
                    const selected = save.oath === id;
                    return (
                      <div
                        key={id}
                        className={`bg-[#18141e] border p-4 flex flex-col justify-between gap-3 ${
                          selected ? 'border-[#d4a853]' : 'border-[#3a2f24]'
                        }`}
                      >
                        <div>
                          <div className="text-[11px] text-[#9d9284]">{o.subtitle}</div>
                          <h4 className="font-display text-sm text-[#d4a853] mt-0.5 mb-0">{o.name}</h4>
                          <p className="text-xs text-[#b8afa2] mt-2 mb-0 leading-relaxed">{o.desc}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            AudioFX.ui();
                            onUpdateSave((s) => ({ ...s, oath: id }));
                          }}
                          className={`w-full py-2 px-3 text-xs font-display uppercase tracking-wider border cursor-pointer ${
                            selected
                              ? 'bg-[#362819] text-[#ffd470] border-[#d4a853]'
                              : 'bg-[#221b15] text-[#d4a853] border-[#5c4833] hover:border-[#d4a853]'
                          }`}
                        >
                          {selected ? 'Serment Actif' : 'Prêter Serment'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Armor Skins Selector */}
              <div>
                <h3 className="font-display text-sm uppercase tracking-widest text-[#d4a853] mb-3 mt-2">
                  Apparence du Chevalier
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {(Object.keys(ARMOR_SKINS_DEF) as ArmorSkinKey[]).map((skinKey) => {
                    const skin = ARMOR_SKINS_DEF[skinKey];
                    const unlocked = isSkinUnlocked(save, skinKey);
                    const equipped = (save.armorSkin || 'eclipse') === skinKey;
                    return (
                      <div
                        key={skinKey}
                        className={`bg-[#18141e] border p-3.5 flex flex-col justify-between gap-2.5 ${
                          equipped ? 'border-[#d4a853]' : 'border-[#3a2f24]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-display text-sm text-[#e8e1d5]">{skin.name}</span>
                            <div className="flex items-center gap-1" aria-hidden="true">
                              <span className="w-3 h-3 border border-white/20" style={{ backgroundColor: skin.plate }} />
                              <span className="w-3 h-3 border border-white/20" style={{ backgroundColor: skin.capeLining }} />
                              <span className="w-3 h-3 border border-white/20" style={{ backgroundColor: skin.eye }} />
                            </div>
                          </div>
                          <p className="text-[11px] text-[#9d9284] mt-1.5 mb-0 leading-snug">
                            {unlocked ? skin.desc : skin.unlockHint}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={!unlocked || equipped}
                          onClick={() => {
                            AudioFX.ui();
                            onUpdateSave((s) => ({ ...s, armorSkin: skinKey }));
                          }}
                          className={`w-full py-1.5 px-2 text-xs font-display uppercase tracking-wider border cursor-pointer disabled:cursor-not-allowed ${
                            equipped
                              ? 'bg-[#362819] text-[#ffd470] border-[#d4a853]'
                              : unlocked
                              ? 'bg-[#221b15] text-[#d4a853] border-[#5c4833] hover:border-[#d4a853]'
                              : 'bg-[#120f17] text-[#6d655b] border-[#2d241c] opacity-60'
                          }`}
                        >
                          {equipped ? 'Équipée' : unlocked ? 'Revêtir' : 'Verrouillée'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Ascension Pact Selector */}
              <div className="bg-[#18141e] border border-[#3a2f24] p-4 space-y-3">
                <div className="flex flex-wrap justify-between items-baseline gap-2">
                  <h3 className="font-display text-sm uppercase tracking-widest text-[#d4a853] m-0">
                    Pacte d&apos;Ascension ({save.ascensionLevel || 0} / 5)
                  </h3>
                  <span className="text-xs font-mono-num text-[#8ab8e6]">
                    Débloqué jusqu&apos;au palier {save.maxAscensionUnlocked || 0} · +16% PV ennemis &amp; +15% Cendres / niveau
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[0, 1, 2, 3, 4, 5].map((tier) => {
                    const locked = tier > (save.maxAscensionUnlocked || 0);
                    const active = (save.ascensionLevel || 0) === tier;
                    return (
                      <button
                        key={tier}
                        type="button"
                        disabled={locked}
                        onClick={() => {
                          AudioFX.ui();
                          onUpdateSave((s) => ({ ...s, ascensionLevel: tier }));
                        }}
                        className={`px-4 py-2 text-xs font-display uppercase tracking-wider border cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap ${
                          active
                            ? 'bg-[#6e1c26] text-[#ffe8ea] border-[#d4a853]'
                            : 'bg-[#120e17] text-[#cfc6b8] border-[#3a2f24] hover:border-[#d4a853]'
                        }`}
                      >
                        {tier === 0 ? 'Standard (0)' : `Ascension ${tier}`}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-[#9d9284] m-0">
                  Remportez une victoire complète au niveau d&apos;Ascension maximum actuel pour débloquer le palier suivant.
                </p>
              </div>
            </>
          )}

          {tab === 'talents' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(Object.keys(TALENTS_DEF) as TalentKey[]).map((key) => {
                const t = TALENTS_DEF[key];
                const lvl = save.talents[key] || 0;
                const isMax = lvl >= t.max;
                const cost = { larmes: t.costLarmes };
                const affordable = canAfford(save.res, cost);
                return (
                  <div
                    key={key}
                    className="bg-[#18141e] border border-[#3a2f24] p-4 flex flex-col justify-between gap-4"
                  >
                    <div>
                      <div className="flex justify-between items-baseline">
                        <h3 className="font-display text-base text-[#7ab8ff] m-0">{t.name}</h3>
                        <span className="font-mono-num text-xs text-[#9d9284]">
                          Rang {lvl} / {t.max}
                        </span>
                      </div>
                      <p className="text-xs text-[#b8afa2] leading-relaxed mt-2 mb-0">{t.desc}</p>
                    </div>
                    <button
                      type="button"
                      disabled={isMax || !affordable}
                      onClick={() => {
                        if (isMax || !affordable) return;
                        AudioFX.heal();
                        onUpdateSave((s) => ({
                          ...s,
                          res: payCost(s.res, cost),
                          talents: { ...s.talents, [key]: lvl + 1 },
                        }));
                      }}
                      className="w-full py-2 px-3 text-xs font-display uppercase tracking-wider bg-[#151c26] text-[#8ab8e6] border border-[#3a526b] hover:border-[#7ab8ff] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                    >
                      {isMax ? 'Maîtrisé' : `Éveiller (${t.costLarmes} Larme${t.costLarmes > 1 ? 's' : ''})`}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'codex' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono-num">
                <div className="bg-[#18141e] border border-[#352b22] p-3">
                  <div className="text-[11px] text-[#9d9284] uppercase">Meilleure Strate</div>
                  <div className="text-lg text-[#d4a853] mt-0.5">{save.records.bestDepth}</div>
                </div>
                <div className="bg-[#18141e] border border-[#352b22] p-3">
                  <div className="text-[11px] text-[#9d9284] uppercase">Victoires</div>
                  <div className="text-lg text-[#e8e1d5] mt-0.5">{save.records.victories}</div>
                </div>
                <div className="bg-[#18141e] border border-[#352b22] p-3">
                  <div className="text-[11px] text-[#9d9284] uppercase">Total Déviations</div>
                  <div className="text-lg text-[#ffd470] mt-0.5">{save.records.totalParries}</div>
                </div>
                <div className="bg-[#18141e] border border-[#352b22] p-3">
                  <div className="text-[11px] text-[#9d9284] uppercase">Meilleure Série</div>
                  <div className="text-lg text-[#e8e1d5] mt-0.5">{save.records.maxParryStreak}x</div>
                </div>
              </div>

              <ExpeditionChronicle history={save.runHistory} bests={save.runBests} />

              <div>
                <h3 className="font-display text-sm uppercase tracking-widest text-[#d4a853] mb-3">
                  Bestiaire de l&apos;Abîme
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(Object.keys(ENEMY_LORE) as EnemyKind[]).map((kind) => {
                    const info = ENEMY_LORE[kind];
                    const kills = save.bestiaryKills[kind] || 0;
                    return (
                      <div key={kind} className="bg-[#18141e] border border-[#352b22] p-3.5">
                        <div className="flex justify-between items-baseline">
                          <span className="font-display text-sm text-[#e8e1d5]">{info.title}</span>
                          <span className="text-[11px] font-mono-num text-[#9d9284]">
                            {info.tier} · {kills} vaincu{kills > 1 ? 's' : ''}
                          </span>
                        </div>
                        <p className="text-xs text-[#9d9284] mt-1.5 mb-0 leading-relaxed">{info.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="font-display text-sm uppercase tracking-widest text-[#d4a853] mb-3">
                  Stèles Déchiffrées ({save.loreUnlocked.length} / {LORE_TABLETS.length})
                </h3>
                <div className="space-y-2.5">
                  {LORE_TABLETS.map((l) => {
                    const unlocked = save.loreUnlocked.includes(l.id);
                    return (
                      <div key={l.id} className="bg-[#18141e] border border-[#352b22] p-3.5">
                        <div className="flex justify-between items-baseline">
                          <span className="font-display text-sm text-[#8ab8e6]">
                            {unlocked ? l.title : 'Stèle Scellée'}
                          </span>
                          <span className="text-[11px] text-[#9d9284]">
                            {unlocked ? l.author : 'À découvrir dans les Strates'}
                          </span>
                        </div>
                        {unlocked && (
                          <p className="text-xs text-[#b8afa2] mt-1.5 mb-0 leading-relaxed">{l.text}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex flex-wrap justify-between items-center gap-3 px-6 py-4 border-t border-[#332920] bg-[#0d0a10]">
          <div className="flex items-center gap-2.5">
            {!confirmReset ? (
              <button
                type="button"
                data-gamepad-ignore
                onClick={() => setConfirmReset(true)}
                className="px-3.5 py-2 text-xs text-[#c97c84] border border-[#5a262c] bg-[#181014] hover:border-[#c97c84] cursor-pointer"
              >
                Réinitialiser sauvegarde
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#ff8a97]">Confirmer la remise à zéro ?</span>
                <button
                  type="button"
                  data-gamepad-ignore
                  onClick={() => {
                    onResetSave();
                    setConfirmReset(false);
                  }}
                  className="px-3 py-1.5 text-xs bg-[#781e28] text-white border border-[#c44755] cursor-pointer"
                >
                  Oui, effacer
                </button>
                <button
                  type="button"
                  data-gamepad-back
                  onClick={() => setConfirmReset(false)}
                  className="px-3 py-1.5 text-xs bg-[#1b161f] text-[#b8afa2] border border-[#4a3b2c] cursor-pointer"
                >
                  Annuler
                </button>
              </div>
            )}

            <button
              type="button"
              data-gamepad-back={!confirmReset || undefined}
              onClick={onReturnTitle}
              className="px-3.5 py-2 text-xs text-[#9d9284] border border-[#3a2f24] bg-[#15121a] hover:text-[#e8e1d5] cursor-pointer"
            >
              Écran Titre
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Sélecteur de Pacte d'Ascension */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#17131d] border border-[#4a3b2c] text-xs">
              <span className="text-[#d4a853] font-display uppercase tracking-wider text-[11px] whitespace-nowrap">
                Pacte d&apos;Ascension :
              </span>
              <select
                value={save.ascensionLevel || 0}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  onUpdateSave((s) => ({ ...s, ascensionLevel: val }));
                  AudioFX.ui();
                }}
                className="bg-[#0e0b12] text-[#ffe8ea] border border-[#5a4838] px-2 py-1 text-xs outline-none cursor-pointer"
              >
                <option value={0}>Rang 0 · Normal (Butin ×1.0)</option>
                {Array.from({ length: Math.min(5, Math.max(1, save.maxAscensionUnlocked || 0)) }, (_, i) => i + 1).map(
                  (lvl) => {
                    const isUnlocked = lvl <= (save.maxAscensionUnlocked || 0);
                    return (
                      <option key={lvl} value={lvl} disabled={!isUnlocked}>
                        {isUnlocked
                          ? `Rang ${lvl} · Affliction (+${lvl * 15}% Butin)`
                          : `Rang ${lvl} · Verrouillé (Terminer Rang ${lvl - 1})`}
                      </option>
                    );
                  }
                )}
              </select>
            </div>

            <button
              type="button"
              data-testid="start-training-btn"
              onClick={() => {
                AudioFX.ui();
                onStartTraining();
              }}
              className="px-4 py-2.5 text-xs font-display uppercase tracking-wider bg-[#151b22] text-[#8ab8e6] border border-[#3a4b5c] hover:border-[#8ab8e6] cursor-pointer whitespace-nowrap"
            >
              Cour d&apos;Entraînement
            </button>
            <button
              type="button"
              data-start="true"
              onClick={onStartRun}
              className="px-6 py-2.5 text-sm font-display uppercase tracking-widest bg-[#6e1c26] text-[#ffe8ea] border border-[#b54552] hover:bg-[#8e2431] hover:border-[#ff7887] cursor-pointer whitespace-nowrap"
            >
              Descendre dans l&apos;Abîme
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
