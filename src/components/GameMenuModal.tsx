import React, { useEffect, useState } from 'react';
import { AudioFX } from '../game/audio';
import {
  ACHIEVEMENTS_DEF,
  ARMOR_SKINS_DEF,
  DEFAULT_KEY_BINDINGS,
  DIFFICULTIES_DEF,
} from '../game/data';
import { formatKeyLabel } from '../game/input';
import type {
  DifficultyMode,
  GameSettings,
  KeyAction,
  QualityLevel,
  SaveData,
} from '../game/types';

type MenuTab = 'gameplay' | 'graphics' | 'audio' | 'controls' | 'profile';

interface GameMenuModalProps {
  save: SaveData;
  onUpdateSettings: (partial: Partial<GameSettings>) => void;
  onResetSettings: () => void;
  onToggleMute: () => void;
  onExportSave: () => string;
  onImportSave: (rawJson: string) => boolean;
  onResetSave: () => void;
  onOpenLauncher?: () => void;
  onClose: () => void;
}

const KEY_ACTION_LABELS: Array<{ action: KeyAction; label: string; alt: string }> = [
  { action: 'left', label: 'Déplacer à gauche', alt: '← / Stick G' },
  { action: 'right', label: 'Déplacer à droite', alt: '→ / Stick G' },
  { action: 'up', label: 'Viser haut / Saut', alt: '↑ / Stick Haut' },
  { action: 'down', label: 'S’accroupir / Plongeon', alt: '↓ / Stick Bas' },
  { action: 'jump', label: 'Sauter / Saut mural', alt: 'Bouton A' },
  { action: 'dash', label: 'Roulade / Esquive', alt: 'Bouton B' },
  { action: 'attack', label: 'Attaque légère', alt: 'Clic Gauche / X' },
  { action: 'heavy', label: 'Attaque lourde', alt: 'L / Y ou RT' },
  { action: 'parry', label: 'Déviation / Garde', alt: 'Clic Droit / LB ou LT' },
  { action: 'skill', label: "Art d'arme (Éclipse)", alt: 'C / Gâchette D (RB)' },
  { action: 'heal', label: 'Fiole de Sève', alt: 'Croix D-Pad Haut' },
  { action: 'interact', label: 'Interagir / Passage', alt: 'Entrée / A ou Haut' },
];

const QUALITY_OPTIONS: Array<{ val: QualityLevel; label: string }> = [
  { val: 'high', label: 'Élevée' },
  { val: 'medium', label: 'Moyenne' },
  { val: 'off', label: 'Désactivée' },
];

export function GameMenuModal({
  save,
  onUpdateSettings,
  onResetSettings,
  onToggleMute,
  onExportSave,
  onImportSave,
  onResetSave,
  onOpenLauncher,
  onClose,
}: GameMenuModalProps) {
  const [tab, setTab] = useState<MenuTab>('gameplay');
  const [listeningAction, setListeningAction] = useState<KeyAction | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(
    typeof document !== 'undefined' ? !!document.fullscreenElement : false
  );
  const [importStatus, setImportStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const settings = save.settings;

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (listeningAction) {
        e.preventDefault();
        e.stopPropagation();
        if (e.code === 'Escape') {
          setListeningAction(null);
          return;
        }
        AudioFX.ui();
        onUpdateSettings({
          keyBindings: {
            ...settings.keyBindings,
            [listeningAction]: e.code,
          },
        });
        setListeningAction(null);
        return;
      }
      if (e.code === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [listeningAction, onClose, onUpdateSettings, settings.keyBindings]);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch {
      // ignore browser fullscreen restriction
    }
  };

  const handleDownloadSave = () => {
    const json = onExportSave();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cendres-eclipse-sauvegarde-strate-${save.records.bestDepth}.json`;
    a.click();
    URL.revokeObjectURL(url);
    AudioFX.pickup();
  };

  const handleUploadSave = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const ok = onImportSave(String(reader.result || ''));
      setImportStatus(
        ok
          ? { ok: true, msg: 'Sauvegarde importée avec succès.' }
          : { ok: false, msg: 'Fichier JSON invalide ou corrompu.' }
      );
      if (ok) AudioFX.pickup();
    };
    reader.readAsText(file);
  };

  const formatDuration = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const tabs: Array<{ id: MenuTab; label: string }> = [
    { id: 'gameplay', label: 'Jouabilité & Difficulté' },
    { id: 'graphics', label: 'Graphismes & HUD' },
    { id: 'audio', label: 'Audio & Ambiance' },
    { id: 'controls', label: 'Commandes' },
    { id: 'profile', label: 'Profil & Sauvegarde' },
  ];

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-[#070609]/92 p-4 md:p-8"
      data-ui-interactive="true"
      data-testid="game-menu-modal"
      data-gamepad-menu="overlay"
    >
      <div className="w-full max-w-4xl h-[min(86vh,720px)] flex flex-col bg-[#110e15] border border-[#5c4835] shadow-[0_0_80px_rgba(0,0,0,0.95)]">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-[#332920] bg-[#0d0a10]">
          <div>
            <h2 className="font-display text-lg md:text-2xl text-[#d4a853] tracking-[0.14em] uppercase m-0">
              Menu &amp; Paramètres PC
            </h2>
            <p className="text-xs text-[#9d9284] m-0 mt-0.5">
              Difficulté, rendu Triple A, mixage audio, touches personnalisées et gestion de sauvegarde locale.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {onOpenLauncher && (
              <button
                type="button"
                onClick={() => {
                  AudioFX.ui();
                  onOpenLauncher();
                }}
                className="px-3.5 py-2 text-xs font-display uppercase tracking-wider bg-[#1a1520] text-[#d4a853] border border-[#5c4833] hover:border-[#d4a853] cursor-pointer"
              >
                Launcher PC
              </button>
            )}
            <button
              type="button"
              data-gamepad-back
              data-gamepad-default
              onClick={() => {
                AudioFX.ui();
                onClose();
              }}
              className="px-4 py-2 text-xs font-display uppercase tracking-wider bg-[#6e1c26] text-[#ffe8ea] border border-[#b54552] hover:bg-[#8e2431] cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto border-b border-[#332920] bg-[#14101a]">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                AudioFX.ui();
                setTab(t.id);
                setListeningAction(null);
              }}
              className={`px-4 py-3 text-xs font-display uppercase tracking-wider border-r border-[#2a2119] transition-colors cursor-pointer whitespace-nowrap ${
                tab === t.id
                  ? 'bg-[#261d16] text-[#ffd470] border-b-2 border-b-[#d4a853]'
                  : 'text-[#9d9284] hover:text-[#e8e1d5]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {tab === 'gameplay' && (
            <>
              <div>
                <h3 className="font-display text-xs uppercase tracking-widest text-[#d4a853] mb-3 mt-0">
                  Difficulté de l&apos;Abîme
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {(Object.keys(DIFFICULTIES_DEF) as DifficultyMode[]).map((key) => {
                    const d = DIFFICULTIES_DEF[key];
                    const selected = settings.difficulty === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          AudioFX.ui();
                          onUpdateSettings({ difficulty: key });
                        }}
                        className={`text-left p-4 border transition-colors cursor-pointer flex flex-col justify-between gap-2 ${
                          selected
                            ? 'bg-[#261b18] border-[#d4a853]'
                            : 'bg-[#18141e] border-[#3a2f24] hover:border-[#6b5235]'
                        }`}
                      >
                        <div>
                          <div className="text-[11px] text-[#9d9284]">{d.subtitle}</div>
                          <div className="font-display text-base text-[#ffd470] mt-0.5">{d.name}</div>
                          <p className="text-xs text-[#b8afa2] leading-relaxed mt-2 mb-0">{d.desc}</p>
                        </div>
                        <div className="text-[11px] font-mono-num text-[#d4a853] pt-1">
                          {selected ? '◆ Sélectionné' : 'Choisir ce mode'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ToggleCard
                  title="Arrêt sur impact (Hitstop)"
                  desc="Micro-gel cinématique lors des déviations parfaites, coups lourds et exécutions."
                  checked={settings.hitstopEnabled}
                  onToggle={() => onUpdateSettings({ hitstopEnabled: !settings.hitstopEnabled })}
                />
                <ToggleCard
                  title="Chiffres de dégâts"
                  desc="Affiche les dégâts flottants, critiques et brisures de posture en combat."
                  checked={settings.showDamageNumbers}
                  onToggle={() => onUpdateSettings({ showDamageNumbers: !settings.showDamageNumbers })}
                />
                <ToggleCard
                  title="Télégraphes Haute Visibilité"
                  desc="Renforce les cercles d’alerte ennemis et viseurs d’arbalète en jaune vif."
                  checked={settings.highContrastTelegraphs}
                  onToggle={() =>
                    onUpdateSettings({ highContrastTelegraphs: !settings.highContrastTelegraphs })
                  }
                />
                <ToggleCard
                  title="Vibrations Manette (Haptique)"
                  desc="Impulsions tactiles lors des parades parfaites, esquives et chocs lourds."
                  checked={settings.gamepadRumble !== false}
                  onToggle={() =>
                    onUpdateSettings({ gamepadRumble: !(settings.gamepadRumble !== false) })
                  }
                />
                <div className="bg-[#18141e] border border-[#3a2f24] p-4 flex flex-col justify-between gap-2">
                  <div className="flex justify-between items-baseline">
                    <span className="font-display text-sm text-[#e8e1d5]">Secousses de caméra</span>
                    <span className="font-mono-num text-xs text-[#d4a853]">
                      {Math.round(settings.screenShakeScale * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1.5}
                    step={0.1}
                    value={settings.screenShakeScale}
                    onChange={(e) => onUpdateSettings({ screenShakeScale: Number(e.target.value) })}
                    className="w-full accent-[#d4a853] cursor-pointer"
                  />
                </div>
              </div>
            </>
          )}

          {tab === 'graphics' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[#18141e] border border-[#3a2f24] p-4 space-y-2.5">
                  <div className="font-display text-sm text-[#e8e1d5]">Brouillard volumétrique &amp; Poussières</div>
                  <p className="text-xs text-[#9d9284] m-0">
                    Contrôle la densité des strates de brume animée et des braises flottantes.
                  </p>
                  <div className="flex gap-2 pt-1">
                    {QUALITY_OPTIONS.map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => {
                          AudioFX.ui();
                          onUpdateSettings({ fogQuality: opt.val });
                        }}
                        className={`flex-1 py-1.5 text-xs font-display uppercase border cursor-pointer ${
                          settings.fogQuality === opt.val
                            ? 'bg-[#362819] text-[#ffd470] border-[#d4a853]'
                            : 'bg-[#120e17] text-[#9d9284] border-[#352b22]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-[#18141e] border border-[#3a2f24] p-4 space-y-2.5">
                  <div className="font-display text-sm text-[#e8e1d5]">Éclaboussures de sang &amp; Ichor</div>
                  <p className="text-xs text-[#9d9284] m-0">
                    Contrôle les gouttelettes balistiques et les taches persistantes sur la pierre.
                  </p>
                  <div className="flex gap-2 pt-1">
                    {QUALITY_OPTIONS.map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => {
                          AudioFX.ui();
                          onUpdateSettings({ bloodIntensity: opt.val });
                        }}
                        className={`flex-1 py-1.5 text-xs font-display uppercase border cursor-pointer ${
                          settings.bloodIntensity === opt.val
                            ? 'bg-[#362819] text-[#ffd470] border-[#d4a853]'
                            : 'bg-[#120e17] text-[#9d9284] border-[#352b22]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-[#18141e] border border-[#3a2f24] p-4 space-y-2.5">
                  <div className="font-display text-sm text-[#e8e1d5]">Effets Visuels &amp; Éclats (VFX)</div>
                  <p className="text-xs text-[#9d9284] m-0">
                    Arcs lumineux, éclairs de déviation, fissures incandescentes et dissolution en cendres.
                  </p>
                  <div className="flex gap-2 pt-1">
                    {QUALITY_OPTIONS.map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => {
                          AudioFX.ui();
                          onUpdateSettings({ vfxQuality: opt.val });
                        }}
                        className={`flex-1 py-1.5 text-xs font-display uppercase border cursor-pointer ${
                          (settings.vfxQuality ?? 'high') === opt.val
                            ? 'bg-[#362819] text-[#ffd470] border-[#d4a853]'
                            : 'bg-[#120e17] text-[#9d9284] border-[#352b22]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <ToggleCard
                  title="Parallaxe multi-plans (6 couches)"
                  desc="Silhouettes gothiques lointaines et avant-plan cinématique en profondeur."
                  checked={settings.parallaxEnabled}
                  onToggle={() => onUpdateSettings({ parallaxEnabled: !settings.parallaxEnabled })}
                />
                <ToggleCard
                  title="Mini-carte tactique"
                  desc="Affiche la silhouette de la strate, les ennemis et la sortie en bas à droite."
                  checked={settings.showMinimap}
                  onToggle={() => onUpdateSettings({ showMinimap: !settings.showMinimap })}
                />
                <ToggleCard
                  title="Barres de vie &amp; posture ennemies"
                  desc="Affiche les jauges de vie, posture et altérations au-dessus des ennemis blessés."
                  checked={settings.showEnemyBars !== false}
                  onToggle={() =>
                    onUpdateSettings({ showEnemyBars: !(settings.showEnemyBars !== false) })
                  }
                />
                <ToggleCard
                  title="Réduire les flashs d'impact (Accessibilité)"
                  desc="Supprime les éclairs plein écran lors des parades parfaites et exécutions."
                  checked={!!settings.reduceFlashes}
                  onToggle={() => onUpdateSettings({ reduceFlashes: !settings.reduceFlashes })}
                />
                <ToggleCard
                  title="Compteur d'images par seconde (FPS)"
                  desc="Affiche les performances temps réel dans le coin supérieur droit."
                  checked={settings.showFps}
                  onToggle={() => onUpdateSettings({ showFps: !settings.showFps })}
                />

                <div className="bg-[#18141e] border border-[#3a2f24] p-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-display text-sm text-[#e8e1d5]">Mode d&apos;affichage PC</div>
                    <div className="text-xs text-[#9d9284] mt-0.5">
                      {isFullscreen ? 'Plein écran actif' : 'Fenêtré / Bordless'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    className="px-4 py-2 text-xs font-display uppercase tracking-wider bg-[#261e17] text-[#d4a853] border border-[#6b5235] hover:border-[#d4a853] cursor-pointer"
                  >
                    {isFullscreen ? 'Quitter Plein Écran' : 'Passer en Plein Écran'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === 'audio' && (
            <div className="space-y-4 max-w-2xl">
              <ToggleCard
                title={save.muted ? 'Audio général coupé' : 'Audio général actif'}
                desc="Active ou coupe instantanément l’ensemble des effets et ambiances (raccourci M)."
                checked={!save.muted}
                onToggle={onToggleMute}
              />
              <SliderCard
                label="Volume Principal"
                value={settings.masterVolume}
                onChange={(v) => onUpdateSettings({ masterVolume: v })}
              />
              <SliderCard
                label="Volume Effets & Lames (SFX)"
                value={settings.sfxVolume}
                onChange={(v) => onUpdateSettings({ sfxVolume: v })}
              />
              <SliderCard
                label="Volume Musique Adaptative"
                value={settings.musicVolume ?? 0.45}
                onChange={(v) => onUpdateSettings({ musicVolume: v })}
              />
              <SliderCard
                label="Volume Bourdon Abyssal (Ambiance)"
                value={settings.ambientVolume}
                onChange={(v) => onUpdateSettings({ ambientVolume: v })}
              />
              <ToggleCard
                title="Musique Dark Fantasy Adaptative"
                desc="Séries de cordes et arpèges mineurs évoluant selon l’exploration, le combat et les Boss."
                checked={settings.musicEnabled !== false}
                onToggle={() =>
                  onUpdateSettings({ musicEnabled: !(settings.musicEnabled !== false) })
                }
              />
              <ToggleCard
                title="Synthétiseur d’Ambiance Dark Fantasy"
                desc="Nappe sonore grave générative WebAudio active durant l’exploration."
                checked={settings.ambientDrone}
                onToggle={() => onUpdateSettings({ ambientDrone: !settings.ambientDrone })}
              />
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => AudioFX.parry()}
                  className="px-4 py-2 text-xs font-display uppercase tracking-wider bg-[#261e17] text-[#ffd470] border border-[#6b5235] hover:border-[#d4a853] cursor-pointer"
                >
                  Tester le son de Déviation
                </button>
              </div>
            </div>
          )}

          {tab === 'controls' && (
            <div className="space-y-4">
              <div className="flex flex-wrap justify-between items-center gap-3 bg-[#18141e] border border-[#3a2f24] px-4 py-3 text-xs text-[#b8afa2]">
                <span>
                  Cliquez sur une touche pour la réassigner. Flèches directionnelles, Clic Gauche/Droit et Manettes Xbox/PlayStation restent toujours pris en charge.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    AudioFX.ui();
                    onUpdateSettings({ keyBindings: { ...DEFAULT_KEY_BINDINGS } });
                    setListeningAction(null);
                  }}
                  className="px-3 py-1.5 text-xs font-display uppercase bg-[#261e17] text-[#d4a853] border border-[#6b5235] hover:border-[#d4a853] cursor-pointer whitespace-nowrap"
                >
                  Touches par défaut
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {KEY_ACTION_LABELS.map((item) => {
                  const isListening = listeningAction === item.action;
                  const code = settings.keyBindings[item.action] || DEFAULT_KEY_BINDINGS[item.action];
                  return (
                    <div
                      key={item.action}
                      className="flex items-center justify-between gap-3 bg-[#18141e] border border-[#352b22] px-4 py-2.5"
                    >
                      <div>
                        <div className="text-xs font-medium text-[#e8e1d5]">{item.label}</div>
                        <div className="text-[11px] text-[#8f8578]">{item.alt}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          AudioFX.ui();
                          setListeningAction(isListening ? null : item.action);
                        }}
                        className={`min-w-[116px] px-3 py-1.5 text-xs font-mono-num border cursor-pointer ${
                          isListening
                            ? 'bg-[#6e1c26] text-white border-[#ff7887]'
                            : 'bg-[#120e17] text-[#ffd470] border-[#5c4833] hover:border-[#d4a853]'
                        }`}
                      >
                        {isListening ? 'Appuyez…' : formatKeyLabel(code)}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'profile' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 font-mono-num">
                <StatBox label="Meilleure Strate" value={String(save.records.bestDepth)} gold />
                <StatBox label="Expéditions" value={String(save.records.runs)} />
                <StatBox label="Victoires" value={String(save.records.victories)} gold />
                <StatBox label="Temps de jeu" value={formatDuration(save.records.totalPlaySec || 0)} />
                <StatBox label="Ennemis vaincus" value={String(save.records.totalKills)} />
                <StatBox label="Gardiens terrassés" value={String(save.records.bossesSlain)} />
                <StatBox label="Déviations totales" value={String(save.records.totalParries)} />
                <StatBox label="Meilleure série" value={`${save.records.maxParryStreak}x`} />
              </div>

              <div className="bg-[#18141e] border border-[#3a2f24] p-4 space-y-3">
                <div className="flex justify-between items-baseline">
                  <h3 className="font-display text-sm text-[#d4a853] m-0 uppercase tracking-wider">
                    Hauts Faits &amp; Apparences
                  </h3>
                  <span className="font-mono-num text-xs text-[#9d9284]">
                    {(save.achievementsUnlocked || []).length} / {ACHIEVEMENTS_DEF.length} débloqués
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {ACHIEVEMENTS_DEF.map((ach) => {
                    const done = (save.achievementsUnlocked || []).includes(ach.id);
                    return (
                      <div
                        key={ach.id}
                        className={`p-3 border flex items-start justify-between gap-2 ${
                          done ? 'bg-[#1c1722] border-[#6b5235]' : 'bg-[#120e17] border-[#2d241c] opacity-75'
                        }`}
                      >
                        <div>
                          <div className={`font-display text-xs ${done ? 'text-[#ffd470]' : 'text-[#b8afa2]'}`}>
                            {ach.title}
                          </div>
                          <div className="text-[11px] text-[#9d9284] mt-0.5">{ach.desc}</div>
                          <div className="text-[11px] font-mono-num text-[#8ab8e6] mt-1">
                            {ach.rewardCendres ? `+${ach.rewardCendres} Cendres` : ''}
                            {ach.rewardCendres && ach.rewardSkin ? ' · ' : ''}
                            {ach.rewardSkin ? `Armure : ${ARMOR_SKINS_DEF[ach.rewardSkin].name}` : ''}
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-display uppercase whitespace-nowrap ${
                            done ? 'text-[#5db87a]' : 'text-[#7c7368]'
                          }`}
                        >
                          {done ? 'Acquis' : 'Scellé'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-[#18141e] border border-[#3a2f24] p-4 space-y-3">
                <h3 className="font-display text-sm text-[#d4a853] m-0 uppercase tracking-wider">
                  Sauvegarde PC Locale (Export / Import JSON)
                </h3>
                <p className="text-xs text-[#9d9284] m-0">
                  Sauvegardez votre progression (Cendres, Forge, Talents, Armes et Stèles) dans un fichier sur votre ordinateur ou transférez-la vers l&apos;application PC standalone.
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleDownloadSave}
                    className="px-4 py-2 text-xs font-display uppercase tracking-wider bg-[#261e17] text-[#ffd470] border border-[#6b5235] hover:border-[#d4a853] cursor-pointer"
                  >
                    Exporter la sauvegarde (.json)
                  </button>
                  <label className="px-4 py-2 text-xs font-display uppercase tracking-wider bg-[#151b22] text-[#8ab8e6] border border-[#3a4b5c] hover:border-[#8ab8e6] cursor-pointer">
                    Importer un fichier .json
                    <input
                      type="file"
                      accept="application/json,.json"
                      onChange={handleUploadSave}
                      className="sr-only"
                    />
                  </label>
                </div>
                {importStatus && (
                  <div className={`text-xs ${importStatus.ok ? 'text-[#5db87a]' : 'text-[#ff7a85]'}`}>
                    {importStatus.msg}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#332920]">
                <button
                  type="button"
                  onClick={() => {
                    AudioFX.ui();
                    onResetSettings();
                  }}
                  className="px-4 py-2 text-xs font-display uppercase tracking-wider bg-[#18141e] text-[#cfc6b8] border border-[#4a3b2c] hover:border-[#d4a853] cursor-pointer"
                >
                  Réinitialiser les paramètres
                </button>

                {!confirmReset ? (
                  <button
                    type="button"
                    onClick={() => setConfirmReset(true)}
                    className="px-4 py-2 text-xs text-[#c97c84] border border-[#5a262c] bg-[#181014] hover:border-[#c97c84] cursor-pointer"
                  >
                    Effacer toute la sauvegarde
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#ff8a97]">Confirmer l&apos;effacement ?</span>
                    <button
                      type="button"
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
                      onClick={() => setConfirmReset(false)}
                      className="px-3 py-1.5 text-xs bg-[#1b161f] text-[#b8afa2] border border-[#4a3b2c] cursor-pointer"
                    >
                      Annuler
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ToggleCard({
  title,
  desc,
  checked,
  onToggle,
}: {
  title: string;
  desc: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        AudioFX.ui();
        onToggle();
      }}
      className="text-left bg-[#18141e] border border-[#3a2f24] hover:border-[#6b5235] p-4 flex items-center justify-between gap-4 cursor-pointer"
    >
      <div>
        <div className="font-display text-sm text-[#e8e1d5]">{title}</div>
        <div className="text-xs text-[#9d9284] mt-0.5 leading-snug">{desc}</div>
      </div>
      <span
        className={`px-2.5 py-1 text-[11px] font-display uppercase tracking-wider border whitespace-nowrap ${
          checked
            ? 'bg-[#2a2115] text-[#ffd470] border-[#d4a853]'
            : 'bg-[#120e16] text-[#8a8073] border-[#352b22]'
        }`}
      >
        {checked ? 'Activé' : 'Coupé'}
      </span>
    </button>
  );
}

function SliderCard({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (val: number) => void;
}) {
  return (
    <div className="bg-[#18141e] border border-[#3a2f24] p-4 space-y-2">
      <div className="flex justify-between items-baseline">
        <span className="font-display text-sm text-[#e8e1d5]">{label}</span>
        <span className="font-mono-num text-xs text-[#d4a853]">{Math.round(value * 100)}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#d4a853] cursor-pointer"
      />
    </div>
  );
}

function StatBox({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <div className="bg-[#18141e] border border-[#352b22] p-3">
      <div className="text-[11px] text-[#9d9284] uppercase">{label}</div>
      <div className={`text-lg mt-0.5 ${gold ? 'text-[#ffd470]' : 'text-[#e8e1d5]'}`}>{value}</div>
    </div>
  );
}
