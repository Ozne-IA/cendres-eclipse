import { AudioFX } from './audio';
import { BloodSystem } from './bloodDecals';
import { RoomCamera } from './camera';
import { startAttack } from './combat';
import { executeWeaponArt, hurtPlayer, resolveEnemyDeath, resolveMeleeAttack, type DamageEffects } from './damage';
import { updateEnemies, type EnemyEffects } from './enemyAI';
import {
  DEFAULT_KEY_BINDINGS,
  DEFAULT_SETTINGS,
  OATHS_DEF,
  RELICS_POOL,
  WEAPONS_DEF,
} from './data';
import { GameplayInputBuffer, InputHub } from './input';
import { generateRoom, generateTrainingRoom } from './levelGen';
import { createPlayer, PlayerMovement } from './movement';
import { ParticlePool } from './particles';
import { ProjectilePool, updateOrbitalWisp, type ProjectileEffects } from './projectiles';
import { createSeededRandom } from './random';
import { RenderInterpolation } from './renderInterpolation';
import { renderGameFrame } from './renderer';
import { interactWithProps, updateRoomHazards, type RoomHazardEffects, type RoomInteractionEffects } from './room';
import { FrameProfile } from './frameProfile';
import { MAX_FRAME_TIME, SimulationClock } from './simulationClock';
import { setPreferCinematicArt } from './textures';
import { VfxSystem } from './vfx';
import {
  bankRunIntoSave,
  computeActiveSynergies,
  computeComboRank,
  createRunState,
  defaultSave,
  evaluateAchievements,
  exportSaveJson,
  getParryWindowSec,
  importSaveJson,
  loadSave,
  mergeSave,
  persistSave,
} from './rules';
import type {
  AttackMove,
  BlessingDef,
  Enemy,
  GamePhase,
  GamepadMenuCommand,
  GameSettings,
  HudSnapshot,
  InputState,
  Player,
  Projectile,
  RoomData,
  RunOutcome,
  RunState,
  RunSummary,
  SaveData,
} from './types';

export interface EngineCallbacks {
  onPhaseChange: (phase: GamePhase) => void;
  onSaveChange: (save: SaveData) => void;
  onHudUpdate: (hud: HudSnapshot) => void;
  onBlessingChoices: (choices: BlessingDef[]) => void;
  onMerchantOpen: (run: RunState) => void;
  onRunSummary: (summary: RunSummary | null) => void;
  onGamepadMenu?: (command: GamepadMenuCommand) => void;
  isOverlayOpen?: () => boolean;
}

const MAX_CANVAS_PIXEL_RATIO = 2;

function canvasPixelRatio(): number {
  return Math.min(window.devicePixelRatio || 1, MAX_CANVAS_PIXEL_RATIO);
}

export class CendresEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cb: EngineCallbacks;
  private gameplayInputs = new GameplayInputBuffer();
  private input = new InputHub(() => this.gameplayInputs.clear());
  private clock = new SimulationClock();
  private interpolation = new RenderInterpolation();
  private projectiles = new ProjectilePool();
  private particles = new ParticlePool();
  private blood = new BloodSystem();
  private vfx = new VfxSystem();
  private movement = new PlayerMovement(this.particles, this.vfx);

  private rafId: number | null = null;
  private destroyed = false;
  private resizeObs: ResizeObserver | null = null;
  private pixelRatio = 1;
  private canvasNeedsRender = false;
  private profile?: FrameProfile;
  private width = 1280;
  private height = 720;

  private save: SaveData;
  private phase: GamePhase = 'title';
  private run: RunState | null = null;
  private lastBankedRun: RunState | null = null;
  private room: RoomData | null = null;
  private player: Player | null = null;

  private camera = new RoomCamera();
  private hitStop = 0;
  private trauma = 0;
  private simTime = 0;
  private previousSimTime = 0;
  private freeDashTimer = 0;
  private hudSyncTimer = 0;
  private banner = { title: '', sub: '', color: '#d4a853', timer: 0 };
  private promptText = '';
  private achievementToast = '';
  private achievementToastT = 0;
  private deathDelayTimer = 0;
  private smoothedFps = 60;

  private readonly combatEffects: EnemyEffects & ProjectileEffects & DamageEffects;
  private readonly roomEffects: RoomHazardEffects & RoomInteractionEffects;

  constructor(
    canvas: HTMLCanvasElement,
    callbacks: EngineCallbacks,
    private readonly gameplayRandom = createSeededRandom(Math.random() * 0x100000000)
  ) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D context unavailable');
    this.ctx = context;
    this.cb = callbacks;
    const engine = this;
    // Save and phase callbacks are synchronous and may replace the engine's current state.
    this.combatEffects = {
      get room() { return engine.room; },
      get player() { return engine.player; },
      get simTime() { return engine.simTime; },
      get save() { return engine.save; },
      get run() { return engine.run; },
      get deathDelayTimer() { return engine.deathDelayTimer; },
      get trauma() { return engine.trauma; },
      blood: this.blood,
      particles: this.particles,
      vfx: this.vfx,
      gameplayRandom: this.gameplayRandom,
      acquireProjectile: (active) => this.acquireProjectile(active),
      snapPosition: (entity: Player | Enemy) => this.interpolation.forget(entity),
      hurtPlayer: (damage, sourceX) => hurtPlayer(this.combatEffects, damage, sourceX),
      registerComboHit: (hits) => this.registerComboHit(hits),
      onEnemyKilled: (enemy) => this.onEnemyKilled(enemy),
      rumble: (weak, strong, duration, enabled) => this.input.rumble(weak, strong, duration, enabled),
      stopFor: (seconds) => { this.hitStop = seconds; },
      slowFor: (seconds) => this.clock.slowFor(seconds),
      shake: (trauma) => { this.trauma = trauma; },
      delayDefeat: (seconds) => { this.deathDelayTimer = seconds; },
      updateSave: (updater) => this.updateSave(updater),
      pushHud: (force) => this.pushHud(force),
      showBanner: (title, sub, color, duration) => this.showBanner(title, sub, color, duration),
    };
    this.roomEffects = {
      get room() { return engine.room; },
      get save() { return engine.save; },
      get simTime() { return engine.simTime; },
      blood: this.blood,
      particles: this.particles,
      gameplayRandom: this.gameplayRandom,
      hurtPlayer: this.combatEffects.hurtPlayer,
      snapPosition: this.combatEffects.snapPosition,
      updateSave: this.combatEffects.updateSave,
      showBanner: this.combatEffects.showBanner,
      openMerchant: (run) => {
        this.cb.onMerchantOpen(run);
        this.setPhase('merchant');
      },
      openBlessingChoices: (choices) => {
        this.cb.onBlessingChoices(choices);
        this.setPhase('blessing');
      },
      openBastion: () => this.openBastion(),
    };
    this.save = loadSave();
    this.applySettingsSideEffects();
  }

  private applySettingsSideEffects(): void {
    const s = this.save.settings || DEFAULT_SETTINGS;
    setPreferCinematicArt(s.artStyle === 'cinematic');
    AudioFX.setMuted(this.save.muted);
    AudioFX.updateSettings(s);
    this.input.setKeyBindings(s.keyBindings || DEFAULT_KEY_BINDINGS);
  }

  private isPcDiskSaveActive(): boolean {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    if (params.get('pc_launcher') === '1') return true;
    return window.location.hostname === '127.0.0.1' && window.location.port !== '3000';
  }

  private async hydratePcDiskSave(): Promise<void> {
    if (!this.isPcDiskSaveActive()) return;
    try {
      const res = await fetch('/api/save');
      if (!res.ok) return;
      const payload = (await res.json()) as { exists?: boolean; save?: Partial<SaveData> };
      if (this.destroyed) return;
      if (payload?.exists && payload.save) {
        const merged = mergeSave(payload.save);
        this.save = merged;
        this.applySettingsSideEffects();
        persistSave(this.save);
        this.cb.onSaveChange({ ...this.save });
      } else if (payload?.exists === false) {
        this.syncPcDiskSave(this.save);
      }
    } catch {
      // ignore offline or browser restriction
    }
  }

  private syncPcDiskSave(save: SaveData): void {
    if (!this.isPcDiskSaveActive()) return;
    fetch('/api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(save),
    }).catch(() => {});
  }

  init(autostart = false): void {
    this.input.mount();
    this.handleResize();
    window.addEventListener('resize', this.handleResize);

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObs = new ResizeObserver(this.handleResize);
      if (this.canvas.parentElement) this.resizeObs.observe(this.canvas.parentElement);
    }

    this.cb.onSaveChange({ ...this.save });
    void this.hydratePcDiskSave();
    if (autostart) {
      this.startNewRun();
    } else {
      this.setPhase('title');
    }

    const profile = new URLSearchParams(window.location.search).get('profile') === '1'
      ? new FrameProfile()
      : undefined;
    if (profile) {
      this.profile = profile;
      window.cendresProfile = profile;
    }

    let last = performance.now();
    let needsStaticRender = true;
    let cooldownFrames = 0;
    const tick = (now: number): void => {
      if (this.destroyed) return;
      // Zoom and display changes can change the DPR while the layout size stays fixed.
      if (this.pixelRatio !== canvasPixelRatio()) this.handleResize();
      const rawDt = (now - last) / 1000;
      last = now;
      if (rawDt > 0.001 && rawDt < 0.25) {
        const instFps = Math.min(240, 1 / rawDt);
        this.smoothedFps = this.smoothedFps * 0.9 + instFps * 0.1;
      }
      const clampedDt = Math.min(MAX_FRAME_TIME, Math.max(0, rawDt));

      // Update adaptive procedural music & toast timers
      const enemies = this.phase === 'playing' ? this.room?.enemies : undefined;
      const bossActive = enemies?.find((e) => e.isBoss && e.hp > 0);
      const combatActive =
        !bossActive && enemies?.some((e) => e.hp > 0 && e.state !== 'dead' && e.state !== 'idle');
      AudioFX.setMusicContext(
        this.phase === 'playing'
          ? bossActive
            ? 'boss'
            : combatActive
            ? 'combat'
            : 'explore'
          : 'title',
        this.room?.biome.id,
        bossActive?.kind,
        bossActive?.phase === 2
      );
      AudioFX.updateMusic(clampedDt);
      if (this.achievementToastT > 0) {
        this.achievementToastT = Math.max(0, this.achievementToastT - clampedDt);
        if (this.achievementToastT <= 0) this.achievementToast = '';
      }

      const inp = this.input.poll(this.phase !== 'playing');
      const prevPhase = this.phase;
      const simulationStart = profile?.now() ?? 0;
      this.advanceSimulation(clampedDt, inp);
      profile?.finishTiming('simulation', simulationStart);

      if (this.phase === 'title' || this.phase === 'playing') {
        if (!this.canvasNeedsRender && cooldownFrames > 0) {
          cooldownFrames--;
          profile?.skipCooldown();
        } else {
          const t0 = performance.now();
          this.render();
          const renderMs = performance.now() - t0;
          profile?.recordTiming('render', renderMs);
          if (renderMs > 8 || rawDt > 0.032) {
            cooldownFrames = 1;
          }
        }
        needsStaticRender = true;
      } else if (this.canvasNeedsRender || needsStaticRender || prevPhase !== this.phase) {
        const renderStart = profile?.now() ?? 0;
        this.render();
        profile?.finishTiming('render', renderStart);
        needsStaticRender = false;
      } else {
        profile?.skipStatic();
      }

      if (!this.destroyed) this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  destroy(): void {
    this.destroyed = true;
    if (this.profile && window.cendresProfile === this.profile) delete window.cendresProfile;
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.input.unmount();
    this.resizeObs?.disconnect();
    window.removeEventListener('resize', this.handleResize);
  }

  private handleResize = (): void => {
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(320, Math.round(rect.width || window.innerWidth));
    const h = Math.max(240, Math.round(rect.height || window.innerHeight));
    this.pixelRatio = canvasPixelRatio();
    const backingWidth = Math.round(w * this.pixelRatio);
    const backingHeight = Math.round(h * this.pixelRatio);
    if (
      this.width !== w || this.height !== h ||
      this.canvas.width !== backingWidth || this.canvas.height !== backingHeight
    ) {
      this.canvasNeedsRender = true;
    }
    if (this.canvas.width !== backingWidth) this.canvas.width = backingWidth;
    if (this.canvas.height !== backingHeight) this.canvas.height = backingHeight;
    this.width = w;
    this.height = h;
  };

  private setPhase(next: GamePhase): void {
    this.phase = next;
    this.clock.clearFrame();
    this.interpolation.clear();
    this.previousSimTime = this.simTime;
    const bodyState =
      next === 'blessing' || next === 'merchant' ? 'playing' : next;
    if (typeof document !== 'undefined') document.body.dataset.state = bodyState;
    this.input.clearAll();
    this.input.blockHeldGamepad();
    if (next === 'playing') {
      this.canvas.focus();
    }
    this.cb.onPhaseChange(next);
  }

  isUsingGamepad(): boolean {
    return this.input.lastInputMode === 'Manette';
  }

  getSave(): SaveData {
    return this.save;
  }

  updateSave(updater: (prev: SaveData) => SaveData): void {
    const updated = updater(this.save);
    const { save: evaluated, unlocked } = evaluateAchievements(updated);
    this.save = evaluated;
    if (unlocked.length > 0) {
      this.achievementToast = `Haut Fait : ${unlocked[0]}`;
      this.achievementToastT = 4.2;
      AudioFX.achievement();
    }
    this.applySettingsSideEffects();
    persistSave(this.save);
    this.syncPcDiskSave(this.save);
    this.cb.onSaveChange({ ...this.save });
  }

  updateSettings(partial: Partial<GameSettings>): void {
    this.updateSave((s) => ({
      ...s,
      settings: {
        ...DEFAULT_SETTINGS,
        ...s.settings,
        ...partial,
        keyBindings: {
          ...DEFAULT_KEY_BINDINGS,
          ...(s.settings?.keyBindings || {}),
          ...(partial.keyBindings || {}),
        },
      },
    }));
  }

  resetSettings(): void {
    this.updateSave((s) => ({
      ...s,
      settings: {
        ...DEFAULT_SETTINGS,
        keyBindings: { ...DEFAULT_KEY_BINDINGS },
      },
    }));
  }

  exportSaveData(): string {
    return exportSaveJson(this.save);
  }

  importSaveData(rawText: string): boolean {
    const imported = importSaveJson(rawText);
    if (!imported) return false;
    this.save = imported;
    this.applySettingsSideEffects();
    persistSave(this.save);
    this.syncPcDiskSave(this.save);
    this.cb.onSaveChange({ ...this.save });
    return true;
  }

  resetSave(): void {
    this.cb.onRunSummary(null);
    this.save = defaultSave();
    this.applySettingsSideEffects();
    persistSave(this.save);
    this.syncPcDiskSave(this.save);
    this.cb.onSaveChange({ ...this.save });
  }

  toggleMute(): void {
    this.updateSave((s) => ({ ...s, muted: !s.muted }));
    AudioFX.ui();
  }

  openBastion(): void {
    AudioFX.ui();
    this.setPhase('bastion');
  }

  openTitle(): void {
    this.cb.onRunSummary(null);
    AudioFX.ui();
    this.setPhase('title');
  }

  startNewRun(): void {
    this.cb.onRunSummary(null);
    AudioFX.ui();
    this.updateSave((s) => ({
      ...s,
      records: { ...s.records, runs: s.records.runs + 1 },
    }));
    this.run = createRunState(this.save, this.gameplayRandom, false);
    this.deathDelayTimer = 0;
    this.freeDashTimer = 0;
    this.clock.slowFor(0);
    this.hitStop = 0;
    this.simTime = 0;
    this.loadRoom(1);
    this.setPhase('playing');
    this.pushHud(true);
  }

  startTrainingMode(): void {
    this.cb.onRunSummary(null);
    AudioFX.ui();
    this.run = createRunState(this.save, this.gameplayRandom, true);
    this.deathDelayTimer = 0;
    this.freeDashTimer = 0;
    this.clock.slowFor(0);
    this.hitStop = 0;
    this.simTime = 0;
    if (this.room) this.projectiles.clear(this.room.projectiles);
    this.room = generateTrainingRoom();
    this.player = createPlayer(110, this.room.groundY - 48, this.run, this.save);
    this.particles.clear();
    this.blood.clear();
    this.vfx.clear();
    this.camera.reset();
    this.promptText = '';
    this.showBanner("Cour d'Entraînement", 'La vitalité et les fioles se régénèrent en cas de défaite.', '#ffd470', 2.4);
    this.setPhase('playing');
    this.pushHud(true);
  }

  resumeGame(): void {
    if (this.phase === 'paused') {
      AudioFX.ui();
      this.setPhase('playing');
    }
  }

  openPause(): void {
    if (this.phase === 'playing') {
      AudioFX.ui();
      this.setPhase('paused');
    }
  }

  extractVictory(): void {
    if (!this.run || this.run.isTraining || this.phase !== 'blessing') return;
    AudioFX.victory();
    this.bankExpedition('victory');
    this.setPhase('gameover');
  }

  extractReturnBastion(): void {
    if (this.phase !== 'paused') return;
    this.bankExpedition('return');
    this.openBastion();
  }

  private bankExpedition(outcome: RunOutcome, boss?: Enemy): void {
    const run = this.run;
    if (!run || run.isTraining || run === this.lastBankedRun) return;
    this.lastBankedRun = run;

    const previousResources = this.save.res;
    const previousRun = this.save.runHistory[0];
    const weapon = WEAPONS_DEF[this.save.weapon] || WEAPONS_DEF.clay_blade;
    this.updateSave((save) => bankRunIntoSave(save, run, outcome));
    const resources = this.save.res;
    this.cb.onRunSummary({
      ...this.save.runHistory[0],
      victory: outcome === 'victory',
      previousRun,
      bests: this.save.runBests,
      weaponName: weapon.name,
      activeSynergies: [...run.activeSynergies],
      rewards: {
        cendres: resources.cendres - previousResources.cendres,
        fer: resources.fer - previousResources.fer,
        larmes: resources.larmes - previousResources.larmes,
      },
      bossNameRemaining: boss?.name,
      bossHpPct: boss ? Math.ceil((boss.hp / boss.maxHp) * 100) : undefined,
    });
  }

  selectBlessing(blessingId: string): void {
    if (!this.run) return;
    this.run.blessings.push(blessingId);
    this.run.activeSynergies = computeActiveSynergies(this.run);
    if (blessingId === 'vital_vessel') {
      this.run.maxHp += 45;
      this.run.hp = Math.min(this.run.maxHp, this.run.hp + 45);
      this.run.ghostHp = Math.max(this.run.ghostHp, this.run.hp);
    } else if (blessingId === 'iron_lungs') {
      this.run.maxStam += 35;
      this.run.stam = this.run.maxStam;
    } else if (blessingId === 'blood_flask') {
      this.run.maxFlasks += 1;
      this.run.flasks += 1;
    }
    AudioFX.heal();
    this.loadRoom(this.run.depth + 1);
    this.setPhase('playing');
    this.pushHud(true);
  }

  buyMerchantItem(itemType: 'flask' | 'tonic' | 'relic', relicId?: string): void {
    if (!this.run) return;
    if (itemType === 'flask' && this.run.loot.cendres >= 30 && this.run.flasks < this.run.maxFlasks) {
      this.run.loot.cendres -= 30;
      this.run.flasks += 1;
      AudioFX.pickup();
    } else if (itemType === 'tonic' && this.run.loot.cendres >= 25 && this.run.hp < this.run.maxHp) {
      this.run.loot.cendres -= 25;
      this.run.hp = Math.min(this.run.maxHp, this.run.hp + Math.round(this.run.maxHp * 0.45));
      AudioFX.heal();
    } else if (itemType === 'relic' && relicId) {
      const relic = RELICS_POOL.find((r) => r.id === relicId);
      if (relic && this.run.loot.cendres >= relic.costCendres && !this.run.relics.includes(relic.id)) {
        this.run.loot.cendres -= relic.costCendres;
        this.run.relics.push(relic.id);
        this.run.activeSynergies = computeActiveSynergies(this.run);
        this.run.merchantStock = this.run.merchantStock.filter((id) => id !== relic.id);
        AudioFX.pickup();
      }
    }
    this.cb.onMerchantOpen({ ...this.run });
    this.pushHud(true);
  }

  closeMerchant(): void {
    AudioFX.ui();
    this.setPhase('playing');
  }

  private registerComboHit(hits = 1): void {
    if (!this.run || !this.player) return;
    const prevRank = computeComboRank(this.run.comboHits).rank;
    this.run.comboHits += hits;
    this.run.peakComboHits = Math.max(this.run.peakComboHits, this.run.comboHits);
    this.run.comboTimer = 4.2;
    const nextRankInfo = computeComboRank(this.run.comboHits);
    if (nextRankInfo.rank !== prevRank && this.run.comboHits >= 2) {
      AudioFX.rankUp(nextRankInfo.rank);
      this.particles.addText(
        this.player.x + this.player.w / 2,
        this.player.y - 34,
        `RANG ${nextRankInfo.rank}`,
        nextRankInfo.color,
        1.15
      );
    }
  }

  private loadRoom(depth: number): void {
    if (!this.run) return;
    this.promptText = '';
    if (this.room) this.projectiles.clear(this.room.projectiles);
    this.room = generateRoom(depth, this.save, this.gameplayRandom);
    this.run.depth = depth;

    if (depth > 1 && this.run.relics.includes('chalice_shard')) {
      this.run.hp = Math.min(this.run.maxHp, this.run.hp + 12);
    }
    if (depth > this.save.records.bestDepth) {
      this.updateSave((s) => ({
        ...s,
        records: { ...s.records, bestDepth: depth },
      }));
    }

    this.player = createPlayer(110, this.room.groundY - 48, this.run, this.save);
    this.particles.clear();
    this.blood.clear();
    this.vfx.clear();
    this.vfx.spawnAshDissolve(160, this.room.groundY - 30, 14, this.room.biome.accentColor, 260, 80);
    this.camera.reset();

    const boss = this.room.enemies.find((e) => e.isBoss);
    const affixLabel = this.room.affix ? ` · ${this.room.affix.name}` : '';
    if (boss) {
      AudioFX.boss(boss.kind);
      this.showBanner(boss.name, `Strate ${depth} · Gardien de l'Abîme${affixLabel}`, '#d4a853', 2.8);
    } else {
      this.showBanner(`Strate ${depth}`, `${this.room.biome.name}${affixLabel}`, '#d4a853', 1.9);
    }
  }

  private showBanner(title: string, sub: string, color = '#d4a853', dur = 2.2): void {
    this.banner = { title, sub, color, timer: dur };
  }

  // Both requestAnimationFrame and deterministic tests drive the same update path.
  advanceSimulation(elapsed: number, inp: InputState): void {
    if (inp.mute) {
      this.toggleMute();
    }

    if (inp.gamepadMenuCommand) {
      this.cb.onGamepadMenu?.(inp.gamepadMenuCommand);
      if (this.phase !== 'title') return;
    }

    if (this.phase === 'title') {
      if (!inp.gamepadMenuCommand && (inp.jump || inp.interact) && !this.cb.isOverlayOpen?.()) {
        this.startNewRun();
        return;
      }
      this.clock.advance(elapsed, (dt) => {
        this.previousSimTime = this.simTime;
        this.simTime += dt;
        return true;
      });
      return;
    }

    if (inp.pause && (this.phase === 'playing' || this.phase === 'paused') && !this.cb.isOverlayOpen?.()) {
      if (this.phase === 'playing') {
        AudioFX.ui();
        this.setPhase('paused');
      } else {
        this.resumeGame();
      }
      return;
    }

    if (this.phase !== 'playing') return;

    this.gameplayInputs.sample(inp);
    this.clock.advance(elapsed, (dt) => {
      this.previousSimTime = this.simTime;
      this.simTime += dt;
      this.captureRenderPositions();
      this.step(dt, inp);
      return this.phase === 'playing';
    });
  }

  private captureRenderPositions(): void {
    this.interpolation.capture(this.camera);
    if (this.player) this.interpolation.capture(this.player);
    if (!this.room) return;
    // Wait for the first simulation pose before capturing room machinery.
    for (const platform of this.room.platforms) {
      if (platform.type === 'moving' && platform.vx !== undefined) this.interpolation.capture(platform);
    }
    for (const hazard of this.room.hazards) {
      if (hazard.kind === 'pendulum' && hazard.angle !== undefined) this.interpolation.capture(hazard);
    }
    for (const enemy of this.room.enemies) this.interpolation.capture(enemy);
    for (const projectile of this.room.projectiles) this.interpolation.capture(projectile);
  }

  private acquireProjectile(active: Projectile[]): Projectile {
    const shot = this.projectiles.acquire(active);
    this.interpolation.forget(shot);
    return shot;
  }

  private step(dt: number, held: InputState): void {
    if (!this.run || !this.room || !this.player) return;

    // Delayed defeat beat before Game Over summary modal
    if (this.deathDelayTimer > 0) {
      this.deathDelayTimer -= dt;
      this.trauma = Math.max(0, this.trauma - dt * 1.4);
      this.particles.update(dt);
      this.vfx.update(dt);
      if (this.deathDelayTimer <= 0) {
        const boss = this.room.enemies.find((e) => e.isBoss && e.hp > 0);
        this.bankExpedition('defeat', boss);
        this.setPhase('gameover');
      }
      return;
    }

    // Real-time visual timers tick even during hitstop
    this.trauma = Math.max(0, this.trauma - dt * 2.2);
    if (this.banner.timer > 0) this.banner.timer = Math.max(0, this.banner.timer - dt);
    this.run.ghostHp += (this.run.hp - this.run.ghostHp) * Math.min(1, dt * 4.5);

    if (this.hitStop > 0) {
      this.hitStop = Math.max(0, this.hitStop - dt);
      return;
    }

    const inp = this.gameplayInputs.consume(held);
    this.run.elapsedSec += dt;
    this.freeDashTimer = Math.max(0, this.freeDashTimer - dt);

    const player = this.player;
    const room = this.room;
    const run = this.run;
    const weapon = WEAPONS_DEF[this.save.weapon] || WEAPONS_DEF.clay_blade;

    // Squash & stretch recovery
    player.squashX += (1 - player.squashX) * Math.min(1, dt * 14);
    player.squashY += (1 - player.squashY) * Math.min(1, dt * 14);
    player.capeWave += dt * (4 + Math.abs(player.vx) * 0.03);
    player.hitFlashT = Math.max(0, player.hitFlashT - dt);

    // Ghost afterimage decay
    for (let i = player.afterimages.length - 1; i >= 0; i--) {
      player.afterimages[i].alpha -= dt * 4.5;
      if (player.afterimages[i].alpha <= 0) player.afterimages.splice(i, 1);
    }

    // Stamina regen
    if (player.stamRegenDelay > 0) {
      player.stamRegenDelay -= dt;
    } else {
      let regen = 34;
      if (this.save.oath === 'airain') regen *= 0.78;
      if (run.blessings.includes('iron_lungs')) regen *= 1.3;
      if (room.affix?.id === 'abyssal_haze') regen *= 1.25;
      run.stam = Math.min(run.maxStam, run.stam + regen * dt);
    }

    // Combo decay
    if (run.comboTimer > 0) {
      run.comboTimer -= dt;
      if (run.comboTimer <= 0) {
        run.comboTimer = 0;
        run.comboHits = 0;
      }
    }

    // Timers & Input buffering
    player.coyote = Math.max(0, player.coyote - dt);
    player.jumpBuf = Math.max(0, player.jumpBuf - dt);
    player.dashCd = Math.max(0, player.dashCd - dt);
    player.invulnT = Math.max(0, player.invulnT - dt);
    player.parryT = Math.max(0, player.parryT - dt);
    player.guardT = Math.max(0, player.guardT - dt);
    player.parryCd = Math.max(0, player.parryCd - dt);
    player.healT = Math.max(0, player.healT - dt);
    player.riposteBuffT = Math.max(0, player.riposteBuffT - dt);
    player.skillCd = Math.max(0, player.skillCd - dt);
    player.comboResetT = Math.max(0, player.comboResetT - dt);
    if (player.comboResetT <= 0) player.comboStep = 0;

    if (inp.jump) player.jumpBuf = 0.14;
    if (inp.attack) player.attackBuf = true;
    if (inp.dash) player.dashBuf = true;

    // Heal
    if (inp.heal && run.flasks > 0 && run.hp < run.maxHp && player.healT <= 0) {
      run.flasks -= 1;
      let healAmt = 46 + (this.save.buildings.autel || 0) * 12;
      if (run.blessings.includes('blood_flask')) healAmt = Math.round(healAmt * 1.2);
      run.hp = Math.min(run.maxHp, run.hp + healAmt);
      player.healT = 0.45;
      AudioFX.heal();
      this.particles.spawnBurst(player.x + player.w / 2, player.y + 24, '#ff9842', 16, 160);
      this.vfx.spawnAshDissolve(player.x + player.w / 2, player.y + 34, 14, '#5db87a', 20, 26);
      this.vfx.spawnImpactFlare(player.x + player.w / 2, player.y + 24, 42, '#ff9842', 'amber', 0.22);
      this.particles.addText(player.x + player.w / 2, player.y - 16, `+${healAmt} PV`, '#ff9842');
    }

    // Active riposte/crit blade ember aura wisps
    if ((player.riposteBuffT > 0 || run.critNextAttack) && Math.random() < dt * 11) {
      this.vfx.spawnAshDissolve(
        player.x + player.w / 2 + player.facing * 8,
        player.y + 22,
        1,
        '#ffd470',
        12,
        14
      );
    }

    // Dash / Dodge Roll
    const cdMult =
      (run.relics.includes('cracked_hourglass') ? 0.75 : 1) *
      (1 - (this.save.talents.mist_reflex || 0) * 0.15);
    let dashCost = run.blessings.includes('mist_step') ? 14 : 22;
    if (run.relics.includes('wind_spur')) dashCost = Math.round(dashCost * 0.75);
    if (this.save.oath === 'pelerin' && this.freeDashTimer <= 0) {
      dashCost = 0;
    }

    if (player.dashBuf && player.dashCd <= 0 && player.dashT <= 0 && player.dashesLeft > 0 && run.stam >= dashCost) {
      player.dashBuf = false;
      if (dashCost === 0 && this.save.oath === 'pelerin') this.freeDashTimer = 4.0;
      run.stam -= dashCost;
      player.stamRegenDelay = 0.4;
      player.dashT = 0.18;
      player.dashCd = 0.34 * cdMult;
      player.dashesLeft -= 1;
      player.invulnT = Math.max(player.invulnT, 0.25);
      const spd = run.blessings.includes('mist_step') ? 760 : 630;
      player.vx = (inp.moveX !== 0 ? inp.moveX : player.facing) * spd;
      player.vy = 0;
      player.squashX = 1.28;
      player.squashY = 0.76;
      if (run.blessings.includes('shadow_ambush')) run.critNextAttack = true;
      AudioFX.dash();
      this.particles.spawnBurst(player.x + player.w / 2, player.y + 28, '#9c8f83', 8, 120);
      this.vfx.spawnAshDissolve(player.x + player.w / 2, player.y + 28, 7, '#a89f94', 14, 20);
    } else if (player.dashT > 0) {
      player.dashBuf = false;
    }

    // Parry / Guard
    if (inp.parry && player.parryCd <= 0 && player.attackT <= 0 && run.stam >= 8) {
      run.stam -= 8;
      player.stamRegenDelay = 0.3;
      player.parryT = getParryWindowSec(this.save);
      player.parryCd = 0.4 * cdMult;
      AudioFX.ui();
    } else if (inp.parryHeld && player.parryT <= 0 && player.attackT <= 0) {
      player.guardT = 0.08;
    }

    // Weapon Art Signature Skill ([C] / LT)
    const atkSpdMult =
      weapon.speedMult *
      (run.relics.includes('wind_spur') ? 1.1 : 1) *
      (room.affix?.id === 'tempered_ash' ? 1.12 : 1);
    if (inp.skill && player.skillCd <= 0 && player.attackT <= 0 && run.stam >= weapon.artStamCost) {
      executeWeaponArt(this.combatEffects);
    } else if (inp.heavy && player.attackT <= 0 && player.dashT <= 0 && run.stam >= 26) {
      run.stam -= 26;
      player.stamRegenDelay = 0.65;
      startAttack(player, this.vfx, weapon.reachPx, 'heavy', 0.34 / atkSpdMult);
      AudioFX.heavy(weapon.key);
    } else if (player.attackBuf && player.attackT <= 0 && run.stam >= 12) {
      player.attackBuf = false;
      run.stam -= 12;
      player.stamRegenDelay = 0.45;
      if (player.dashT > 0) {
        startAttack(player, this.vfx, weapon.reachPx, 'dash_strike', 0.22 / atkSpdMult);
        AudioFX.slash(2, weapon.key);
      } else if (!player.onGround && inp.down) {
        player.vy = Math.max(player.vy, 540);
        startAttack(player, this.vfx, weapon.reachPx, 'plunge', 0.28 / atkSpdMult);
        AudioFX.heavy(weapon.key);
      } else if (inp.upHeld) {
        if (player.onGround) player.vy = -220;
        startAttack(player, this.vfx, weapon.reachPx, 'launcher', 0.24 / atkSpdMult);
        AudioFX.slash(1, weapon.key);
      } else {
        const move: AttackMove =
          player.comboStep === 0 ? 'light1' : player.comboStep === 1 ? 'light2' : 'light3';
        startAttack(player, this.vfx, weapon.reachPx, move, (move === 'light3' ? 0.27 : 0.2) / atkSpdMult);
        AudioFX.slash(player.comboStep, weapon.key);
        if (move === 'light3' && run.activeSynergies.includes('eternal_pyre')) {
          const shot = this.acquireProjectile(room.projectiles);
          shot.x = player.x + player.w / 2 + player.facing * 18;
          shot.y = player.y + 22;
          shot.vx = player.facing * 430;
          shot.vy = 0;
          shot.r = 12;
          shot.dmg = 28;
          shot.friendly = true;
          shot.color = '#ff7b29';
          shot.kind = 'crescent';
          shot.life = 0.75;
        }
        player.comboStep = ((player.comboStep + 1) % 3) as 0 | 1 | 2;
        player.comboResetT = 0.72;
      }
    } else if (player.attackT <= 0) {
      player.attackBuf = false;
    }

    this.movement.update(player, room, run, this.save, inp, this.simTime, dt);

    updateRoomHazards(room, player, dt, this.roomEffects);

    updateOrbitalWisp(room, player, run, dt, this.combatEffects.acquireProjectile);

    resolveMeleeAttack(room, player, run, weapon, dt, this.combatEffects);

    updateEnemies(room, player, run, dt, this.combatEffects);

    this.projectiles.update(room, player, run, dt, this.combatEffects);

    // Interactions (Chests, Braziers, Shrines, Merchants, Lore, NPCs, Exit)
    this.handlePropsInteraction(inp);

    // Update particles, blood decals/droplets, VFX & camera
    this.particles.update(dt);
    this.blood.update(dt, room.platforms);
    this.vfx.update(dt);
    this.camera.follow(player, room, this.width, this.height, dt);

    this.hudSyncTimer += dt;
    if (this.hudSyncTimer >= 0.06) {
      this.hudSyncTimer = 0;
      this.pushHud(false);
    }
  }

  private onEnemyKilled(enemy: Enemy): void {
    resolveEnemyDeath(this.combatEffects, enemy);
  }

  private handlePropsInteraction(inp: InputState): void {
    if (!this.room || !this.player || !this.run) return;
    const prompt = interactWithProps(this.room, this.player, this.run, inp.interact, this.isUsingGamepad(), this.roomEffects);
    if (prompt !== undefined && prompt !== this.promptText) {
      this.promptText = prompt;
      this.pushHud(true);
    }
  }

  private lastHudKey = '';

  private pushHud(force: boolean): void {
    if (!this.run || !this.room) return;
    const boss = this.room.enemies.find((e) => e.isBoss && e.hp > 0);
    const weapon = WEAPONS_DEF[this.save.weapon] || WEAPONS_DEF.clay_blade;

    if (!force && this.phase !== 'playing') return;

    const hp = Math.ceil(this.run.hp);
    const ghostHp = Math.ceil(this.run.ghostHp);
    const stam = Math.floor(this.run.stam);
    const bannerVisible = this.banner.timer > 0;
    const cendresTotal = this.save.res.cendres + this.run.loot.cendres;
    const ferTotal = this.save.res.fer + this.run.loot.fer;
    const larmesTotal = this.save.res.larmes + this.run.loot.larmes;
    const bossHp = boss ? Math.max(0, Math.ceil(boss.hp)) : -1;
    const bossStag = boss ? Math.min(boss.maxStagger, Math.round(boss.stagger)) : -1;
    const comboInfo = computeComboRank(this.run.comboHits);
    const fpsVal = Math.round(this.smoothedFps);
    const showFps = !!this.save.settings?.showFps;

    const skillCd = Math.max(0, Number((this.player?.skillCd || 0).toFixed(1)));
    const skillMaxCd = this.player?.skillMaxCd || weapon.artCooldown;

    const weaponTier = this.save.weaponTiers[this.save.weapon] || 0;
    const oathDef = OATHS_DEF[this.save.oath] || OATHS_DEF.argile;

    const riposteReady = (this.player?.riposteBuffT ?? 0) > 0;
    const hudKey = `${this.input.lastInputMode}|${riposteReady}|${hp}|${ghostHp}|${this.run.maxHp}|${stam}|${this.run.maxStam}|${this.run.flasks}|${this.run.depth}|${cendresTotal}|${ferTotal}|${larmesTotal}|${this.promptText}|${bannerVisible}|${bossHp}|${bossStag}|${this.run.parryStreak}|${this.run.perfectDodges}|${this.save.weapon}|${skillCd}|${this.run.activeSynergies.length}|${this.achievementToast}|${this.run.comboHits}|${showFps ? fpsVal : 0}`;
    if (!force && hudKey === this.lastHudKey) return;
    this.lastHudKey = hudKey;

    this.cb.onHudUpdate({
      hp,
      ghostHp,
      maxHp: this.run.maxHp,
      stam,
      maxStam: this.run.maxStam,
      flasks: this.run.flasks,
      maxFlasks: this.run.maxFlasks,
      depth: this.run.depth,
      isTraining: this.run.isTraining,
      ascensionLevel: this.run.ascensionLevel,
      biomeName: this.room.biome.name,
      cendresTotal,
      ferTotal,
      larmesTotal,
      runCendres: this.run.loot.cendres,
      blessings: [...this.run.blessings],
      relics: [...this.run.relics],
      activeSynergies: [...this.run.activeSynergies],
      weaponName: weapon.name,
      weaponTier,
      oathName: oathDef.name,
      weaponArtName: weapon.artName,
      skillCd,
      skillMaxCd,
      parryStreak: this.run.parryStreak,
      perfectDodges: this.run.perfectDodges,
      elapsedSec: Math.round(this.run.elapsedSec),
      comboHits: this.run.comboHits,
      comboRank: comboInfo.rank,
      affixName: this.room.affix?.name,
      affixDesc: this.room.affix?.desc,
      fps: fpsVal,
      showFps,
      inputMode: this.input.lastInputMode,
      riposteReady,
      promptText: this.promptText,
      achievementToast: this.achievementToast || undefined,
      boss: boss
        ? {
            name: boss.name,
            hp: bossHp,
            maxHp: boss.maxHp,
            stagger: bossStag,
            maxStagger: boss.maxStagger,
            phase: boss.phase,
          }
        : null,
      banner: {
        title: this.banner.title,
        sub: this.banner.sub,
        color: this.banner.color,
        visible: bannerVisible,
      },
    });
  }

  private render(): void {
    const alpha = this.phase === 'playing' || this.phase === 'title' ? this.clock.alpha : 1;
    const interpolate = <T extends { x: number; y: number }>(position: T): T =>
      this.interpolation.interpolate(position, alpha);
    const camera = interpolate(this.camera);
    this.ctx.save();
    this.ctx.setTransform(this.canvas.width / this.width, 0, 0, this.canvas.height / this.height, 0, 0);
    renderGameFrame(this.ctx, {
      phase: this.phase,
      time: this.previousSimTime + (this.simTime - this.previousSimTime) * alpha,
      width: this.width,
      height: this.height,
      cameraX: camera.x,
      cameraY: camera.y,
      trauma: this.trauma,
      room: this.room,
      player: this.player,
      interpolatePosition: interpolate,
      run: this.run,
      weapon: this.save.weapon,
      armorSkin: this.save.armorSkin || 'eclipse',
      particles: this.particles,
      blood: this.blood,
      vfx: this.vfx,
      settings: this.save.settings,
    }, this.profile);
    this.ctx.restore();
    this.canvasNeedsRender = false;
  }
}
