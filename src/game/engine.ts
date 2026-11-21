import { AudioFX } from './audio';
import { BloodSystem, getBloodToneForEnemy } from './bloodDecals';
import {
  DEFAULT_KEY_BINDINGS,
  DEFAULT_SETTINGS,
  LORE_TABLETS,
  NPCS_DEF,
  OATHS_DEF,
  RELICS_POOL,
  WEAPONS_DEF,
} from './data';
import { formatKeyLabel, InputHub } from './input';
import { generateRoom, generateTrainingRoom } from './levelGen';
import { ParticlePool } from './particles';
import { ProjectilePool } from './projectiles';
import { renderGameFrame } from './renderer';
import { setPreferCinematicArt } from './textures';
import { VfxSystem } from './vfx';
import {
  applyEnemyDamage,
  bankRunIntoSave,
  computeActiveSynergies,
  computeComboRank,
  createRunState,
  defaultSave,
  evaluateAchievements,
  exportSaveJson,
  getLootMultiplier,
  getParryWindowSec,
  getPlayerDamageStats,
  importSaveJson,
  loadSave,
  mergeSave,
  persistSave,
  pickBlessingChoices,
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

export class CendresEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cb: EngineCallbacks;
  private input = new InputHub();
  private projectiles = new ProjectilePool();
  private particles = new ParticlePool();
  private blood = new BloodSystem();
  private vfx = new VfxSystem();

  private rafId: number | null = null;
  private timeoutId: number | null = null;
  private destroyed = false;
  private resizeObs: ResizeObserver | null = null;
  private width = 1280;
  private height = 720;

  private save: SaveData;
  private phase: GamePhase = 'title';
  private run: RunState | null = null;
  private lastBankedRun: RunState | null = null;
  private room: RoomData | null = null;
  private player: Player | null = null;

  private camera = { x: 0, y: 0 };
  private hitStop = 0;
  private slowMoT = 0;
  private trauma = 0;
  private simTime = 0;
  private freeDashTimer = 0;
  private footstepTimer = 0;
  private hudSyncTimer = 0;
  private banner = { title: '', sub: '', color: '#d4a853', timer: 0 };
  private promptText = '';
  private achievementToast = '';
  private achievementToastT = 0;
  private deathDelayTimer = 0;
  private smoothedFps = 60;

  constructor(canvas: HTMLCanvasElement, callbacks: EngineCallbacks) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D context unavailable');
    this.ctx = context;
    this.cb = callbacks;
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

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObs = new ResizeObserver(() => this.handleResize());
      if (this.canvas.parentElement) this.resizeObs.observe(this.canvas.parentElement);
    }

    this.cb.onSaveChange({ ...this.save });
    void this.hydratePcDiskSave();
    if (autostart) {
      this.startNewRun();
    } else {
      this.setPhase('title');
    }

    let last = performance.now();
    let needsStaticRender = true;
    let cooldownFrames = 0;
    const isAutomated =
      typeof navigator !== 'undefined' &&
      (!!navigator.webdriver || /HeadlessChrome/i.test(navigator.userAgent));
    const scheduleNext = (): void => {
      if (this.destroyed) return;
      if (isAutomated) {
        this.timeoutId = window.setTimeout(() => {
          if (!this.destroyed) this.rafId = requestAnimationFrame(tick);
        }, 120);
      } else {
        this.rafId = requestAnimationFrame(tick);
      }
    };
    const tick = (now: number): void => {
      if (this.destroyed) return;
      const rawDt = (now - last) / 1000;
      last = now;
      if (rawDt > 0.001 && rawDt < 0.25) {
        const instFps = Math.min(240, 1 / rawDt);
        this.smoothedFps = this.smoothedFps * 0.9 + instFps * 0.1;
      }
      const clampedDt = Math.min(0.05, Math.max(0.0001, rawDt));
      if (this.slowMoT > 0) {
        this.slowMoT = Math.max(0, this.slowMoT - clampedDt);
      }
      const dt = this.slowMoT > 0 ? clampedDt * 0.42 : clampedDt;
      this.simTime += dt;

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
      this.step(dt, inp);

      if (this.phase === 'title' || this.phase === 'playing') {
        if (!isAutomated && cooldownFrames > 0) {
          cooldownFrames--;
        } else {
          const t0 = performance.now();
          this.render();
          const renderMs = performance.now() - t0;
          if (!isAutomated && (renderMs > 8 || rawDt > 0.032)) {
            cooldownFrames = 1;
          }
        }
        needsStaticRender = true;
      } else if (needsStaticRender || prevPhase !== this.phase) {
        this.render();
        needsStaticRender = false;
      }

      scheduleNext();
    };
    this.rafId = requestAnimationFrame(tick);
  }

  destroy(): void {
    this.destroyed = true;
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    if (this.timeoutId !== null) clearTimeout(this.timeoutId);
    this.input.unmount();
    this.resizeObs?.disconnect();
  }

  private handleResize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(320, Math.round(rect.width || window.innerWidth));
    const h = Math.max(240, Math.round(rect.height || window.innerHeight));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.width = w;
    this.height = h;
  }

  private setPhase(next: GamePhase): void {
    this.phase = next;
    const bodyState =
      next === 'blessing' || next === 'merchant' ? 'playing' : next;
    document.body.dataset.state = bodyState;
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
    this.run = createRunState(this.save, Math.random, false);
    this.deathDelayTimer = 0;
    this.freeDashTimer = 0;
    this.slowMoT = 0;
    this.loadRoom(1);
    this.setPhase('playing');
    this.pushHud(true);
  }

  startTrainingMode(): void {
    this.cb.onRunSummary(null);
    AudioFX.ui();
    this.run = createRunState(this.save, Math.random, true);
    this.deathDelayTimer = 0;
    this.freeDashTimer = 0;
    this.slowMoT = 0;
    if (this.room) this.projectiles.clear(this.room.projectiles);
    this.room = generateTrainingRoom();
    this.player = this.createPlayer(110, this.room.groundY - 48);
    this.particles.clear();
    this.blood.clear();
    this.vfx.clear();
    this.camera.x = 0;
    this.camera.y = 0;
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

  private createPlayer(x: number, y: number): Player {
    return {
      x,
      y,
      w: 28,
      h: 48,
      vx: 0,
      vy: 0,
      facing: 1,
      onGround: false,
      onWall: 0,
      coyote: 0,
      jumpBuf: 0,
      attackBuf: false,
      dashBuf: false,
      jumpsLeft: this.run?.blessings.includes('wind_dancer') ? 3 : 2,
      dashesLeft: 1 + (this.save.talents.mist_reflex || 0),
      dashT: 0,
      dashCd: 0,
      invulnT: 0,
      hitFlashT: 0,
      attackT: 0,
      attackTotalT: 0.22,
      attackMove: 'light1',
      comboStep: 0,
      comboResetT: 0,
      attackHitIds: new Set<number>(),
      parryT: 0,
      guardT: 0,
      parryCd: 0,
      stamRegenDelay: 0,
      healT: 0,
      squashX: 1,
      squashY: 1,
      walkCycle: 0,
      capeWave: 0,
      afterimages: [],
      wispAngle: 0,
      wispCd: 0,
      riposteBuffT: 0,
      skillCd: 0,
      skillMaxCd: (WEAPONS_DEF[this.save.weapon] || WEAPONS_DEF.clay_blade).artCooldown,
    };
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
    this.room = generateRoom(depth, this.save);
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

    this.player = this.createPlayer(110, this.room.groundY - 48);
    this.particles.clear();
    this.blood.clear();
    this.vfx.clear();
    this.vfx.spawnAshDissolve(160, this.room.groundY - 30, 14, this.room.biome.accentColor, 260, 80);
    this.camera.x = 0;
    this.camera.y = 0;

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

  private step(dt: number, inp: InputState): void {
    if (inp.mute) {
      this.toggleMute();
    }

    if (inp.gamepadMenuCommand) {
      this.cb.onGamepadMenu?.(inp.gamepadMenuCommand);
      return;
    }

    if (this.phase === 'title') {
      if ((inp.jump || inp.interact) && !this.cb.isOverlayOpen?.()) {
        this.startNewRun();
      }
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

    if (this.phase !== 'playing' || !this.run || !this.room || !this.player) return;

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
      this.hitStop -= dt;
      return;
    }

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
      this.executeWeaponArt();
    } else if (inp.heavy && player.attackT <= 0 && player.dashT <= 0 && run.stam >= 26) {
      run.stam -= 26;
      player.stamRegenDelay = 0.65;
      this.startAttack('heavy', 0.34 / atkSpdMult);
      AudioFX.heavy(weapon.key);
    } else if (player.attackBuf && player.attackT <= 0 && run.stam >= 12) {
      player.attackBuf = false;
      run.stam -= 12;
      player.stamRegenDelay = 0.45;
      if (player.dashT > 0) {
        this.startAttack('dash_strike', 0.22 / atkSpdMult);
        AudioFX.slash(2, weapon.key);
      } else if (!player.onGround && inp.down) {
        player.vy = Math.max(player.vy, 540);
        this.startAttack('plunge', 0.28 / atkSpdMult);
        AudioFX.heavy(weapon.key);
      } else if (inp.upHeld) {
        if (player.onGround) player.vy = -220;
        this.startAttack('launcher', 0.24 / atkSpdMult);
        AudioFX.slash(1, weapon.key);
      } else {
        const move: AttackMove =
          player.comboStep === 0 ? 'light1' : player.comboStep === 1 ? 'light2' : 'light3';
        this.startAttack(move, (move === 'light3' ? 0.27 : 0.2) / atkSpdMult);
        AudioFX.slash(player.comboStep, weapon.key);
        if (move === 'light3' && run.activeSynergies.includes('eternal_pyre')) {
          const shot = this.projectiles.acquire(room.projectiles);
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

    // Movement & Gravity
    let moveSpeed = 315;
    if (this.save.oath === 'pelerin') moveSpeed *= 1.15;
    if (run.relics.includes('raven_feather')) moveSpeed *= 1.18;
    if (room.affix?.id === 'tempered_ash') moveSpeed *= 1.12;

    if (player.dashT > 0) {
      player.dashT -= dt;
      if (Math.floor(player.dashT * 60) % 2 === 0) {
        player.afterimages.push({ x: player.x, y: player.y, alpha: 1, facing: player.facing });
      }
    } else {
      if (inp.moveX !== 0) {
        player.facing = inp.moveX > 0 ? 1 : -1;
        player.vx += (inp.moveX * moveSpeed - player.vx) * Math.min(1, dt * 16);
      } else {
        player.vx *= Math.pow(0.001, dt);
      }

      // Jump, Coyote, Double Jump & Wall Jump
      const jumpMult = run.relics.includes('raven_feather') ? 1.1 : 1;
      if (player.jumpBuf > 0) {
        if (player.coyote > 0) {
          player.vy = -565 * jumpMult;
          player.onGround = false;
          player.coyote = 0;
          player.jumpBuf = 0;
          player.jumpsLeft = (run.blessings.includes('wind_dancer') ? 3 : 2) - 1;
          player.squashX = 0.82;
          player.squashY = 1.2;
          AudioFX.jump();
        } else if (player.onWall !== 0) {
          player.vy = -545 * jumpMult;
          player.vx = -player.onWall * 375;
          player.facing = (-player.onWall) as 1 | -1;
          player.jumpBuf = 0;
          player.squashX = 0.84;
          player.squashY = 1.18;
          if (run.blessings.includes('wall_tempest')) run.critNextAttack = true;
          AudioFX.wallJump();
          this.particles.spawnBurst(player.x + player.w / 2, player.y + 24, '#b8aba0', 6, 100);
          this.vfx.spawnImpactFlare(player.x + player.w / 2, player.y + 24, 28, '#ffd470', 'amber', 0.14);
        } else if (player.jumpsLeft > 0) {
          player.vy = -515 * jumpMult;
          player.jumpsLeft -= 1;
          player.jumpBuf = 0;
          player.squashX = 0.86;
          player.squashY = 1.16;
          AudioFX.jump();
          this.particles.spawnBurst(player.x + player.w / 2, player.y + player.h, '#a89d92', 7, 110);
        }
      }

      // Variable jump height cut
      if (inp.jumpReleased && player.vy < -180) {
        player.vy *= 0.45;
      }

      // Wall slide cap
      const maxFall = player.onWall !== 0 && player.vy > 0 && inp.moveX === player.onWall ? 160 : 940;
      player.vy = Math.min(maxFall, player.vy + 1480 * dt);
    }

    // Update Moving Platforms
    for (const p of room.platforms) {
      if (p.type === 'moving' && p.baseX !== undefined && p.baseY !== undefined) {
        const oldX = p.x;
        const oldY = p.y;
        const ph = (p.phase || 0) + this.simTime * (p.moveSpeed || 1);
        p.x = p.baseX + Math.sin(ph) * (p.moveRangeX || 0);
        p.y = p.baseY + Math.cos(ph) * (p.moveRangeY || 0);
        p.vx = (p.x - oldX) / dt;
        p.vy = (p.y - oldY) / dt;
      }
      if (p.type === 'crumble' && p.broken && p.respawnT !== undefined) {
        p.respawnT -= dt;
        if (p.respawnT <= 0) {
          p.broken = false;
          p.crumbleT = 0;
        }
      }
    }

    // Horizontal collision & Wall detection (outer bounds + raised solid stone steps)
    let nextX = Math.max(0, Math.min(room.width - player.w, player.x + player.vx * dt));
    player.onWall = 0;
    if (nextX === 0 && !player.onGround) player.onWall = -1;
    if (nextX === room.width - player.w && !player.onGround) player.onWall = 1;
    for (const p of room.platforms) {
      if (p.broken || p.type !== 'solid') continue;
      if (player.y + player.h <= p.y + 6 || player.y >= p.y + p.h - 4) continue;
      if (player.x + player.w <= p.x + 8 && nextX + player.w > p.x) {
        nextX = p.x - player.w;
        player.vx = 0;
        if (!player.onGround) player.onWall = 1;
      } else if (player.x >= p.x + p.w - 8 && nextX < p.x + p.w) {
        nextX = p.x + p.w;
        player.vx = 0;
        if (!player.onGround) player.onWall = -1;
      }
    }
    player.x = nextX;

    // Vertical collision with platforms
    const prevBot = player.y + player.h;
    const wasOnGround = player.onGround;
    player.y += player.vy * dt;
    player.onGround = false;

    for (const p of room.platforms) {
      if (p.broken) continue;
      if (p.type === 'crumble' && p.crumbleT && p.crumbleT > 0) {
        p.crumbleT -= dt;
        if (p.crumbleT <= 0) {
          p.broken = true;
          p.respawnT = 2.6;
          this.particles.spawnBurst(p.x + p.w / 2, p.y + 8, '#8c5338', 10, 140);
          continue;
        }
      }

      const overlapX = player.x + player.w > p.x && player.x < p.x + p.w;
      if (!overlapX) continue;

      if (p.type === 'bounce') {
        if (player.vy >= 0 && prevBot <= p.y + 18 && player.y + player.h >= p.y) {
          player.y = p.y - player.h;
          player.vy = -780;
          player.jumpsLeft = run.blessings.includes('wind_dancer') ? 2 : 1;
          player.squashX = 0.78;
          player.squashY = 1.28;
          AudioFX.jump();
          this.particles.spawnBurst(p.x + p.w / 2, p.y, '#e06b2b', 12, 200);
        }
        continue;
      }

      if (p.type === 'solid' || !inp.down) {
        if (player.vy >= 0 && prevBot <= p.y + 14 && player.y + player.h >= p.y) {
          if (!wasOnGround && player.vy > 220) {
            const heavyFall = player.vy > 480;
            player.squashX = 1.22;
            player.squashY = 0.78;
            AudioFX.land();
            this.particles.spawnBurst(player.x + player.w / 2, p.y, '#9c9286', heavyFall ? 8 : 4, 95);
            if (heavyFall) {
              this.vfx.spawnGroundFissure(player.x + player.w / 2, p.y + 2, 48, '#ff7b29', 0.85);
            }
          }
          player.y = p.y - player.h;
          player.vy = 0;
          player.onGround = true;
          player.coyote = 0.11;
          player.jumpsLeft = run.blessings.includes('wind_dancer') ? 3 : 2;
          player.dashesLeft = 1 + (this.save.talents.mist_reflex || 0);
          if (p.type === 'moving' && p.vx) {
            player.x = Math.max(0, Math.min(room.width - player.w, player.x + p.vx * dt));
          }
          if (p.type === 'crumble' && (!p.crumbleT || p.crumbleT === 0)) {
            p.crumbleT = 0.65;
          }
        }
      }
    }

    if (player.onGround && Math.abs(player.vx) > 40) {
      player.walkCycle += Math.abs(player.vx) * dt * 0.04;
      this.footstepTimer -= dt;
      if (this.footstepTimer <= 0) {
        this.footstepTimer = 0.27;
        const surf = room.isBoss ? 'stone' : room.platforms.some((p) => p.type === 'crumble' && Math.abs(player.y + player.h - p.y) < 6 && player.x > p.x && player.x < p.x + p.w) ? 'wood' : 'ash';
        AudioFX.footstep(surf);
        // Subtle dynamic ash dust puffs under running sabatons
        const footX = player.x + (player.facing === 1 ? 4 : player.w - 4);
        this.particles.spawnBurst(footX, player.y + player.h, '#736b63', 2, 45);
      }
    } else {
      this.footstepTimer = 0.05;
    }

    // Hazards
    for (const h of room.hazards) {
      if (h.kind === 'flamejet') {
        h.timer = (h.timer + dt) % 3.6;
        h.active = h.timer >= 2.6;
        if (
          h.active &&
          player.x + player.w > h.x + 4 &&
          player.x < h.x + h.w - 4 &&
          player.y + player.h > h.y - 76 &&
          player.y < h.y + h.h
        ) {
          this.hurtPlayer(18, h.x + h.w / 2);
        }
      } else if (h.kind === 'pendulum' && h.pivotX !== undefined && h.pivotY !== undefined && h.length) {
        const ang = Math.sin(this.simTime * 2.15 + h.timer) * 0.88;
        h.angle = ang;
        const bx = h.pivotX + Math.sin(ang) * h.length;
        const by = h.pivotY + Math.cos(ang) * h.length;
        h.x = bx - 22;
        h.y = by - 14;
        if (
          player.x + player.w > bx - 20 &&
          player.x < bx + 20 &&
          player.y + player.h > by - 14 &&
          player.y < by + 18
        ) {
          this.hurtPlayer(26, bx);
        }
      } else if (
        player.x + player.w > h.x &&
        player.x < h.x + h.w &&
        player.y + player.h > h.y
      ) {
        this.hurtPlayer(22, h.x + h.w / 2);
        player.y = room.groundY - 120;
        player.vy = -300;
      }
    }

    if (player.y > room.height + 90) {
      this.hurtPlayer(24, player.x);
      player.x = 120;
      player.y = room.groundY - 120;
      player.vy = 0;
    }

    // Orbital Flame Wisp Blessing
    if (run.blessings.includes('orbital_wisp')) {
      player.wispAngle += dt * 3.2;
      player.wispCd -= dt;
      if (player.wispCd <= 0) {
        const target = room.enemies.find(
          (e) =>
            e.hp > 0 &&
            e.state !== 'dead' &&
            Math.hypot(e.x - player.x, e.y - player.y) < 340
        );
        if (target) {
          player.wispCd = 1.15;
          const ang = Math.atan2(target.y + target.h / 2 - (player.y + 20), target.x + target.w / 2 - (player.x + 14));
          const shot = this.projectiles.acquire(room.projectiles);
          shot.x = player.x + 14;
          shot.y = player.y + 20;
          shot.vx = Math.cos(ang) * 440;
          shot.vy = Math.sin(ang) * 440;
          shot.r = 5;
          shot.dmg = 18;
          shot.friendly = true;
          shot.color = '#ff9842';
          shot.kind = 'orb';
          shot.life = 1.5;
        }
      }
    }

    // Player Attack Hitbox
    if (player.attackT > 0) {
      player.attackT -= dt;
      const isHeavy = player.attackMove === 'heavy' || player.attackMove === 'light3';
      const reach = weapon.reachPx + (isHeavy ? 14 : 0);
      const ax = player.facing === 1 ? player.x + player.w - 6 : player.x - reach + 6;
      const ay = player.attackMove === 'launcher' ? player.y - 24 : player.y - 4;
      const ah = player.attackMove === 'plunge' ? player.h + 26 : player.h + 12;

      // Smash destructible urns
      for (const pr of room.props) {
        if (pr.type === 'urn' && !pr.broken && ax < pr.x + pr.w && ax + reach > pr.x && ay < pr.y + pr.h && ay + ah > pr.y) {
          pr.broken = true;
          const c = Math.round((4 + Math.random() * 5) * getLootMultiplier(this.save, run));
          run.loot.cendres += c;
          AudioFX.hit(false);
          this.particles.spawnBurst(pr.x + pr.w / 2, pr.y + pr.h / 2, '#9c785c', 10, 170);
          this.particles.addText(pr.x, pr.y - 10, `+${c}🔥`, '#d4a853', 0.9);
        }
      }

      // Hit Enemies
      for (const e of room.enemies) {
        if (e.hp <= 0 || e.state === 'dead' || player.attackHitIds.has(e.id)) continue;
        if (ax < e.x + e.w && ax + reach > e.x && ay < e.y + e.h && ay + ah > e.y) {
          player.attackHitIds.add(e.id);
          const isRiposte = e.state === 'staggered';
          const blockedByShield =
            e.shielded &&
            e.state !== 'staggered' &&
            player.attackMove !== 'heavy' &&
            player.facing !== e.facing;

          const stats = getPlayerDamageStats(
            this.save,
            run,
            player.attackMove,
            isRiposte,
            e.sunderT > 0,
            Math.random,
            room.affix?.id
          );
          if (run.critNextAttack) run.critNextAttack = false;

          let finalDmg = stats.damage;
          if (player.riposteBuffT > 0) {
            finalDmg = Math.round(finalDmg * 1.2);
            player.riposteBuffT = 0;
          }
          let finalStag = stats.stagger;
          const armoredPlating =
            e.elite === 'armored' &&
            !isRiposte &&
            e.sunderT <= 0 &&
            player.attackMove !== 'heavy' &&
            player.attackMove !== 'plunge';
          if (blockedByShield) {
            finalDmg = Math.max(2, Math.round(finalDmg * 0.28));
            finalStag = Math.round(finalStag * 0.45);
            AudioFX.guard();
            this.particles.addText(e.x + e.w / 2, e.y - 14, `BLOQUÉ (${finalDmg})`, '#968b7c', 0.9);
          } else {
            if (armoredPlating) {
              finalDmg = Math.max(2, Math.round(finalDmg * 0.75));
              this.particles.addText(e.x + e.w / 2, e.y - 26, 'BLINDÉ', '#8ab8e6', 0.8);
            }
            this.registerComboHit(1);
            if (stats.isCrit) {
              AudioFX.crit();
              if (run.relics.includes('blood_medal')) {
                run.hp = Math.min(run.maxHp, run.hp + 4);
              }
            } else {
              AudioFX.hit(isHeavy || isRiposte);
            }
          }

          applyEnemyDamage(run, e, finalDmg);
          e.stagger += finalStag;
          e.hitFlashT = 0.06;
          e.vx = player.facing * (isHeavy ? 230 : 120);
          if (player.attackMove === 'launcher' && !e.isBoss) {
            e.vy = -290;
          }

          // Status blessings
          if (run.blessings.includes('cinder_burn') && isHeavy) {
            e.burnT = 3.0;
          }
          if (run.blessings.includes('sunder_steel')) {
            e.sunderT = 4.0;
          }
          if (run.blessings.includes('lunar_frost')) {
            e.chillT = 3.0;
          }

          // Active Synergies on Melee Hit
          if (e.burnT > 0 && e.chillT > 0 && run.activeSynergies.includes('thermal_shock')) {
            finalDmg += 28;
            e.chillT = 0;
            this.vfx.spawnImpactFlare(e.x + e.w / 2, e.y + e.h / 2, 74, '#ff9d42', 'gold', 0.24);
            this.particles.addText(e.x + e.w / 2, e.y - 36, 'CHOC THERMIQUE +28!', '#ff9d42', 1.1);
          }
          if (stats.isCrit && run.activeSynergies.includes('blood_feast')) {
            run.hp = Math.min(run.maxHp, run.hp + 4);
          }

          // Riposte execution siphon
          if (isRiposte) {
            e.state = 'recover';
            e.stagger = 0;
            if (run.activeSynergies.includes('storm_anvil')) {
              finalDmg = Math.round(finalDmg * 1.35);
            }
            if (run.activeSynergies.includes('shatter_bells')) {
              for (const other of room.enemies) {
                if (other.id !== e.id && other.hp > 0 && Math.abs(other.x - e.x) < 180) {
                  other.stagger += 45;
                }
              }
              this.particles.spawnRing(e.x + e.w / 2, e.y + e.h / 2, '#d4a853', 160, 0.3);
            }
            const siphon = (this.save.talents.execution_siphon || 0) * 6;
            if (siphon > 0) {
              run.hp = Math.min(run.maxHp, run.hp + siphon);
              this.particles.addText(player.x, player.y - 18, `+${siphon} PV`, '#5db87a', 0.95);
            }
          } else if (e.stagger >= e.maxStagger && e.state !== 'staggered') {
            e.stagger = 0;
            e.state = 'staggered';
            e.stateT = 2.1;
            this.particles.spawnRing(e.x + e.w / 2, e.y + e.h / 2, '#ffd470', 80, 0.28);
            this.particles.addText(e.x + e.w / 2, e.y - 34, 'POSTURE BRISÉE !', '#ff9d42', 1.15);
          }

          if (this.save.settings?.hitstopEnabled !== false) {
            this.hitStop = isRiposte || player.attackMove === 'heavy' ? 0.06 : 0.025;
          }
          this.trauma = Math.min(1, this.trauma + (isRiposte ? 0.55 : isHeavy ? 0.38 : 0.2));
          if (isRiposte || isHeavy || stats.isCrit) {
            this.input.rumble(0.28, isRiposte ? 0.72 : 0.45, 95, this.save.settings?.gamepadRumble !== false);
          }
          this.particles.spawnBurst(
            e.x + e.w / 2,
            e.y + e.h / 2,
            isRiposte || stats.isCrit ? '#ffd470' : '#d44242',
            isRiposte ? 18 : 11,
            240
          );
          this.blood.spawnImpact(
            e.x + e.w / 2,
            e.y + e.h * 0.45,
            player.facing,
            blockedByShield ? 0.45 : isRiposte ? 1.75 : isHeavy || stats.isCrit ? 1.35 : 0.95,
            room.platforms,
            getBloodToneForEnemy(e.kind)
          );

          const hx = e.x + e.w / 2;
          const hy = e.y + e.h * 0.45;
          if (!blockedByShield) {
            const flareSize = isRiposte ? 76 : isHeavy || stats.isCrit ? 58 : 34;
            const flareCol = isRiposte || stats.isCrit ? '#ffd470' : '#ff8c3b';
            this.vfx.spawnImpactFlare(
              hx,
              hy,
              flareSize,
              flareCol,
              isRiposte || stats.isCrit ? 'gold' : 'amber',
              isRiposte ? 0.26 : 0.18
            );
            if (isRiposte || stats.isCrit) {
              this.vfx.spawnLightning(
                hx - 32,
                hy - 28,
                hx + 34,
                hy + 26,
                '#ffd470',
                2.5,
                0.16
              );
              this.vfx.triggerScreenFlash('#ffd470', isRiposte ? 0.2 : 0.11);
            }
            if (player.attackMove === 'heavy' || player.attackMove === 'plunge') {
              this.vfx.spawnGroundFissure(hx, e.y + e.h + 1, 76, '#ff7b29', 1.4);
            }
          }

          if (!blockedByShield && this.save.settings?.showDamageNumbers !== false) {
            const label = isRiposte
              ? `RIPOSTE -${finalDmg}!`
              : stats.isCrit
              ? `CRIT -${finalDmg}!`
              : `-${finalDmg}`;
            this.particles.addText(
              e.x + e.w / 2,
              e.y - 12,
              label,
              isRiposte || stats.isCrit ? '#ffd470' : '#f2d8b3',
              isRiposte || stats.isCrit ? 1.15 : 1
            );
          }

          if (e.hp <= 0) this.onEnemyKilled(e);
        }
      }
    }

    // Update Enemies (with attack token pool of max 3 concurrent windups)
    let activeAttackers = 0;
    for (const e of room.enemies) {
      if (e.state === 'windup' || e.state === 'attack') activeAttackers++;
    }

    for (const e of room.enemies) {
      if (e.state === 'dead') {
        e.deadT -= dt;
        if (run.isTraining && e.deadT <= 0) {
          e.state = 'idle';
          e.hp = e.maxHp;
          e.stagger = 0;
          e.burnT = 0;
          e.chillT = 0;
          e.sunderT = 0;
          this.vfx.spawnAshDissolve(e.x + e.w / 2, e.y + e.h * 0.5, 10, '#ffd470', e.w, e.h);
        }
        continue;
      }
      if (e.hp <= 0) continue;

      e.hitFlashT = Math.max(0, e.hitFlashT - dt);
      e.sunderT = Math.max(0, e.sunderT - dt);
      e.chillT = Math.max(0, e.chillT - dt);

      if (e.elite === 'blazing' && Math.random() < dt * 7) {
        this.vfx.spawnAshDissolve(e.x + e.w / 2, e.y + e.h * 0.45, 1, '#ff7b29', e.w * 0.6, e.h * 0.5);
      }

      if (e.burnT > 0) {
        e.burnT -= dt;
        e.burnTickT -= dt;
        if (e.burnTickT <= 0) {
          e.burnTickT = 0.75;
          applyEnemyDamage(run, e, 10);
          this.particles.spawnBurst(e.x + e.w / 2, e.y + 18, '#e06b2b', 4, 90);
          this.particles.addText(e.x + e.w / 2, e.y - 8, '-10 🔥', '#e06b2b', 0.85);
          if (e.hp <= 0) {
            this.onEnemyKilled(e);
            continue;
          }
        }
      }

      // Boss Phase 2 transition at 50% HP
      if (e.isBoss && e.phase === 1 && e.hp <= e.maxHp * 0.5) {
        e.phase = 2;
        e.state = 'idle';
        e.cd = 0.6;
        this.hitStop = 0.07;
        this.trauma = 0.7;
        AudioFX.boss(e.kind, true);
        this.particles.spawnRing(e.x + e.w / 2, e.y + e.h / 2, '#ff4d63', 180, 0.45);
        this.vfx.triggerScreenFlash('#ff4d63', 0.3);
        this.vfx.spawnImpactFlare(e.x + e.w / 2, e.y + e.h * 0.5, 112, '#ff4d63', 'crimson', 0.38);
        this.vfx.spawnGroundFissure(e.x + e.w / 2, e.y + e.h, 130, '#ff4d63', 1.8);
        for (let b = 0; b < 4; b++) {
          const ang = (b * Math.PI) / 2 + 0.35;
          this.vfx.spawnLightning(
            e.x + e.w / 2,
            e.y + e.h * 0.45,
            e.x + e.w / 2 + Math.cos(ang) * 110,
            e.y + e.h * 0.45 + Math.sin(ang) * 90,
            '#ff7b7b',
            2.8,
            0.22
          );
        }
        this.showBanner(e.name, 'Phase II — Fureur de l’Éclipse', '#ff4d63', 2.0);
      }

      const chillMult = e.chillT > 0 ? 0.75 : 1;
      const swiftMult = e.elite === 'swift' ? 1.25 : 1;
      const simEnemyDt = dt * chillMult * swiftMult;

      const dx = player.x + player.w / 2 - (e.x + e.w / 2);
      const dy = player.y + player.h / 2 - (e.y + e.h / 2);
      const dist = Math.hypot(dx, dy);

      // Slow posture decay when enemy is idle
      if (e.state === 'idle' && e.stagger > 0) {
        e.stagger = Math.max(0, e.stagger - dt * 6);
      }

      if (e.state === 'staggered') {
        e.stateT -= dt;
        e.vx *= 0.84;
        if (e.stateT <= 0) e.state = 'idle';
      } else if (e.state === 'windup') {
        e.stateT -= simEnemyDt;
        e.vx *= 0.84;
        if (e.stateT <= 0) {
          this.executeEnemyAttack(e, dx, dy, dist);
        }
      } else if (e.state === 'attack') {
        e.stateT -= simEnemyDt;
        if (
          player.x < e.x + e.w + 10 &&
          player.x + player.w > e.x - 10 &&
          player.y < e.y + e.h &&
          player.y + player.h > e.y
        ) {
          this.hurtPlayer(e.dmg, e.x + e.w / 2);
        }
        if (e.stateT <= 0) {
          e.state = 'recover';
          e.stateT = e.isBoss ? (e.phase === 2 ? 0.35 : 0.5) : 0.45;
          e.cd = e.isBoss ? (e.phase === 2 ? 0.55 : 0.8) : 1.05;
        }
      } else if (e.state === 'recover') {
        e.stateT -= simEnemyDt;
        e.vx *= 0.85;
        if (e.stateT <= 0) e.state = 'idle';
      } else {
        e.cd = Math.max(0, e.cd - simEnemyDt);
        const aggroRange = e.isBoss ? 950 : 460;
        if (dist < aggroRange) {
          e.facing = dx >= 0 ? 1 : -1;
          const desiredRange =
            e.kind === 'watcher'
              ? 270
              : e.kind === 'arbalest'
              ? 360
              : e.kind === 'pyromancer'
              ? 310
              : e.isBoss
              ? 155
              : 78;

          if (dist > desiredRange) {
            const baseSpd = e.isBoss
              ? e.phase === 2
                ? 195
                : 165
              : e.kind === 'flagellant'
              ? 105
              : e.kind === 'specter'
              ? 175
              : 140;
            e.vx += (e.facing * baseSpd * swiftMult * chillMult - e.vx) * Math.min(1, dt * 6);
          } else {
            e.vx *= 0.86;
            if (e.cd <= 0 && (e.isBoss || activeAttackers < 3)) {
              activeAttackers++;
              e.state = 'windup';
              e.stateT =
                e.kind === 'flagellant'
                  ? 0.6
                  : e.kind === 'arbalest'
                  ? 0.65
                  : e.isBoss
                  ? e.phase === 2
                    ? 0.42
                    : 0.5
                  : 0.44;
              if (e.kind === 'specter') {
                this.particles.spawnBurst(e.x + e.w / 2, e.y + e.h / 2, '#796794', 10, 140);
              }
            }
          }
        } else {
          e.vx *= 0.9;
        }
      }

      e.x = Math.max(20, Math.min(room.width - e.w - 20, e.x + e.vx * dt));
      if (!e.flying) {
        e.vy += 1400 * dt;
        e.y += e.vy * dt;
        for (const p of room.platforms) {
          if (
            p.type === 'solid' &&
            e.x + e.w > p.x &&
            e.x < p.x + p.w &&
            e.vy >= 0 &&
            e.y + e.h >= p.y &&
            e.y + e.h <= p.y + 34
          ) {
            e.y = p.y - e.h;
            e.vy = 0;
          }
        }
      } else {
        // Ennemi volant : oscillation organique & flottement vertical adaptatif
        const hoverTargetY = Math.max(room.groundY - 140, Math.min(room.groundY - 50, player.y - 28));
        const hoverOffset = Math.sin(this.simTime * 2.8 + e.id) * 16;
        const targetY = hoverTargetY + hoverOffset;
        e.y += (targetY - e.y) * Math.min(1, dt * 2.5);
      }
    }

    // Remove finished dead enemies
    for (let i = room.enemies.length - 1; i >= 0; i--) {
      if (room.enemies[i].state === 'dead' && room.enemies[i].deadT <= 0) {
        room.enemies.splice(i, 1);
      }
    }

    // Update Projectiles
    for (let i = room.projectiles.length - 1; i >= 0; i--) {
      const pr = room.projectiles[i];
      pr.life -= dt;
      if (pr.life <= 0) {
        this.projectiles.release(room.projectiles, i);
        continue;
      }

      if (pr.kind === 'eruption') {
        if (pr.telegraphT && pr.telegraphT > 0) {
          pr.telegraphT -= dt;
        } else {
          if (
            player.x + player.w > pr.x - pr.r * 0.65 &&
            player.x < pr.x + pr.r * 0.65 &&
            player.y + player.h > pr.y - 110 &&
            player.y < pr.y + 10
          ) {
            this.hurtPlayer(pr.dmg, pr.x);
          }
        }
        continue;
      }

      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      if (pr.x < -40 || pr.x > room.width + 40 || pr.y < -40 || pr.y > room.height + 40) {
        this.projectiles.release(room.projectiles, i);
        continue;
      }

      if (
        !pr.friendly &&
        pr.x + pr.r > player.x &&
        pr.x - pr.r < player.x + player.w &&
        pr.y + pr.r > player.y &&
        pr.y - pr.r < player.y + player.h
      ) {
        if (player.parryT > 0) {
          pr.friendly = true;
          pr.vx *= -1.5;
          pr.vy *= -1.5;
          pr.dmg = Math.round(pr.dmg * (run.relics.includes('ember_ring') ? 2.4 : 2.0));
          run.parries += 1;
          run.parryStreak += 1;
          run.bestParryStreak = Math.max(run.bestParryStreak, run.parryStreak);
          AudioFX.parry();
          this.hitStop = 0.05;
          this.particles.spawnRing(pr.x, pr.y, '#ffd470', 60, 0.22);
          this.particles.addText(player.x + 14, player.y - 14, 'RENVOI !', '#ffd470', 1.1);
        } else {
          this.hurtPlayer(pr.dmg, pr.x);
          this.projectiles.release(room.projectiles, i);
        }
      } else if (pr.friendly) {
        for (const e of room.enemies) {
          if (
            e.hp > 0 &&
            e.state !== 'dead' &&
            pr.x + pr.r > e.x &&
            pr.x - pr.r < e.x + e.w &&
            pr.y + pr.r > e.y &&
            pr.y - pr.r < e.y + e.h
          ) {
            applyEnemyDamage(run, e, pr.dmg);
            e.hitFlashT = 0.06;
            if (run.blessings.includes('cinder_burn')) e.burnT = Math.max(e.burnT, 3.0);
            if (run.blessings.includes('sunder_steel')) e.sunderT = Math.max(e.sunderT, 4.0);
            if (run.blessings.includes('lunar_frost')) e.chillT = Math.max(e.chillT, 3.0);
            this.registerComboHit(1);
            AudioFX.hit(false);
            this.particles.spawnBurst(pr.x, pr.y, '#ffd470', 8, 160);
            this.vfx.spawnImpactFlare(pr.x, pr.y, 44, '#ffd470', 'gold', 0.16);
            this.particles.addText(e.x + e.w / 2, e.y - 10, `-${pr.dmg}`, '#ffd470');
            if (e.hp <= 0) this.onEnemyKilled(e);
            this.projectiles.release(room.projectiles, i);
            break;
          }
        }
      }
    }

    // Interactions (Chests, Braziers, Shrines, Merchants, Lore, NPCs, Exit)
    this.handlePropsInteraction(inp);

    // Update particles, blood decals/droplets, VFX & camera
    this.particles.update(dt);
    this.blood.update(dt, room.platforms);
    this.vfx.update(dt);
    const targetCamX = Math.max(0, Math.min(room.width - this.width, player.x + player.w / 2 - this.width * 0.42));
    const targetCamY = Math.max(0, Math.min(room.height - this.height, player.y + player.h / 2 - this.height * 0.56));
    this.camera.x += (targetCamX - this.camera.x) * Math.min(1, dt * 8);
    this.camera.y += (targetCamY - this.camera.y) * Math.min(1, dt * 8);

    this.hudSyncTimer += dt;
    if (this.hudSyncTimer >= 0.06) {
      this.hudSyncTimer = 0;
      this.pushHud(false);
    }
  }

  private startAttack(move: AttackMove, duration: number): void {
    if (!this.player) return;
    this.player.attackMove = move;
    this.player.attackT = duration;
    this.player.attackTotalT = duration;
    this.player.attackHitIds.clear();
    this.player.squashX = 1.15;
    this.player.squashY = 0.9;

    const wDef = WEAPONS_DEF[this.save.weapon] || WEAPONS_DEF.clay_blade;
    const isHeavy = move === 'heavy' || move === 'light3' || move === 'plunge';
    const arcCol =
      move === 'heavy' || move === 'plunge'
        ? '#ff6a1f'
        : move === 'light3' || move === 'dash_strike'
        ? '#ffd470'
        : '#9fd0ff';
    const coreCol = move === 'heavy' ? '#ffe08a' : '#ffffff';
    const cx = this.player.x + this.player.w / 2;
    const cy = this.player.y + 22;
    const radius = wDef.reachPx * 0.8 + (isHeavy ? 14 : 2);
    if (move === 'plunge') {
      this.vfx.spawnSlashArc(cx, cy + 12, radius * 0.85, 0.15, Math.PI - 0.15, this.player.facing, arcCol, coreCol, 22, 0.24);
    } else if (move === 'launcher') {
      this.vfx.spawnSlashArc(cx, cy, radius * 0.9, -1.45, 0.65, this.player.facing, arcCol, coreCol, 18, 0.22);
    } else {
      this.vfx.spawnSlashArc(cx, cy, radius, -1.25, 1.15, this.player.facing, arcCol, coreCol, isHeavy ? 22 : 14, isHeavy ? 0.24 : 0.18);
    }
    this.vfx.spawnBladeSparks(cx, cy, this.player.facing, isHeavy ? 14 : 7, arcCol);
    if (move === 'heavy' && this.player.onGround) {
      this.vfx.spawnGroundFissure(
        cx + this.player.facing * 42,
        this.player.y + this.player.h,
        68,
        '#ff7b29',
        1.15
      );
    }
  }

  private executeWeaponArt(): void {
    if (!this.player || !this.run || !this.room) return;
    const player = this.player;
    const run = this.run;
    const room = this.room;
    const wDef = WEAPONS_DEF[this.save.weapon] || WEAPONS_DEF.clay_blade;
    const cdMult = run.activeSynergies.includes('phantom_gale') ? 0.7 : 1;

    run.stam = Math.max(0, run.stam - wDef.artStamCost);
    player.stamRegenDelay = 0.65;
    player.skillMaxCd = wDef.artCooldown * cdMult;
    player.skillCd = player.skillMaxCd;
    AudioFX.skillArt(wDef.key);
    this.input.rumble(0.45, 0.72, 140, this.save.settings?.gamepadRumble !== false);

    const cx = player.x + player.w / 2;
    const cy = player.y + 22;
    this.particles.addText(cx, player.y - 24, `${wDef.artName.toUpperCase()} !`, '#ffd470', 1.1);

    if (wDef.key === 'clay_blade') {
      this.startAttack('heavy', 0.28);
      const shot = this.projectiles.acquire(room.projectiles);
      shot.x = cx + player.facing * 20;
      shot.y = cy;
      shot.vx = player.facing * 520;
      shot.vy = 0;
      shot.r = 18;
      shot.dmg = 48;
      shot.friendly = true;
      shot.color = '#ffd470';
      shot.kind = 'crescent';
      shot.life = 1.0;
      this.vfx.spawnImpactFlare(cx + player.facing * 24, cy, 78, '#ffd470', 'gold', 0.25);
    } else if (wDef.key === 'belfry_greatsword') {
      this.startAttack('heavy', 0.34);
      this.trauma = 0.62;
      this.vfx.spawnGroundFissure(cx + player.facing * 60, player.y + player.h, 150, '#ff7b29', 1.7);
      this.vfx.spawnImpactFlare(cx + player.facing * 50, player.y + player.h - 10, 96, '#ff9842', 'amber', 0.3);
      for (const e of room.enemies) {
        if (e.hp > 0 && e.state !== 'dead' && Math.abs(e.x + e.w / 2 - cx) < 175) {
          applyEnemyDamage(run, e, 54);
          e.stagger += 75;
          e.hitFlashT = 0.08;
          if (run.blessings.includes('cinder_burn')) e.burnT = 3.0;
          if (run.blessings.includes('sunder_steel')) e.sunderT = 4.0;
          if (run.blessings.includes('lunar_frost')) e.chillT = 3.0;
          this.particles.addText(e.x + e.w / 2, e.y - 16, '-54 SISMIQUE!', '#ff9d42', 1.1);
          if (e.hp <= 0) this.onEnemyKilled(e);
        }
      }
    } else if (wDef.key === 'eclipse_daggers') {
      const target = room.enemies.find((e) => e.hp > 0 && e.state !== 'dead' && Math.abs(e.x - cx) < 320);
      if (target) {
        player.x = Math.max(24, Math.min(room.width - 52, target.x - player.facing * 32));
        player.facing = target.x >= player.x ? 1 : -1;
        this.vfx.spawnLightning(cx, cy, player.x + 14, cy, '#9fd0ff', 2.8, 0.22);
      } else {
        player.vx = player.facing * 680;
      }
      player.invulnT = 0.35;
      run.critNextAttack = true;
      this.startAttack('dash_strike', 0.2);
    } else if (wDef.key === 'ash_halberd') {
      this.startAttack('launcher', 0.28);
      this.vfx.spawnSlashArc(cx, cy, 118, -1.5, 1.5, player.facing, '#ffd470', '#ffffff', 24, 0.25);
      for (const e of room.enemies) {
        if (e.hp > 0 && e.state !== 'dead' && Math.abs(e.x + e.w / 2 - cx) < 145) {
          applyEnemyDamage(run, e, 44);
          e.sunderT = 5.0;
          if (run.blessings.includes('cinder_burn')) e.burnT = 3.0;
          if (run.blessings.includes('lunar_frost')) e.chillT = 3.0;
          if (!e.isBoss) e.vy = -260;
          this.particles.addText(e.x + e.w / 2, e.y - 16, '-44 FISSURÉ!', '#ffd470', 1.05);
          if (e.hp <= 0) this.onEnemyKilled(e);
        }
      }
    } else if (wDef.key === 'scythe_eclipse') {
      this.startAttack('heavy', 0.28);
      this.vfx.spawnSlashArc(cx, cy, 108, -Math.PI, Math.PI, player.facing, '#ff4d63', '#ffe0eb', 22, 0.26);
      let drained = 0;
      for (const e of room.enemies) {
        if (e.hp > 0 && e.state !== 'dead' && Math.abs(e.x + e.w / 2 - cx) < 135) {
          applyEnemyDamage(run, e, 46);
          e.chillT = 4.0;
          if (run.blessings.includes('cinder_burn')) e.burnT = 3.0;
          if (run.blessings.includes('sunder_steel')) e.sunderT = 4.0;
          drained += 8;
          if (e.hp <= 0) this.onEnemyKilled(e);
        }
      }
      if (drained > 0) {
        run.hp = Math.min(run.maxHp, run.hp + drained);
        this.particles.addText(cx, player.y - 38, `+${drained} PV MOISSON`, '#ff4d63', 1);
      }
    } else {
      // twin_hammers: double tectonic slam
      this.startAttack('heavy', 0.32);
      this.trauma = 0.68;
      this.vfx.spawnGroundFissure(cx - 48, player.y + player.h, 85, '#ff7b29', 1.5);
      this.vfx.spawnGroundFissure(cx + 48, player.y + player.h, 85, '#ff7b29', 1.5);
      for (const e of room.enemies) {
        if (e.hp > 0 && e.state !== 'dead' && Math.abs(e.x + e.w / 2 - cx) < 150) {
          applyEnemyDamage(run, e, 42);
          e.stagger = e.maxStagger;
          e.state = 'staggered';
          e.stateT = 2.4;
          if (run.blessings.includes('cinder_burn')) e.burnT = 3.0;
          if (run.blessings.includes('sunder_steel')) e.sunderT = 4.0;
          this.particles.addText(e.x + e.w / 2, e.y - 18, 'GARDE PULVÉRISÉE !', '#ffd470', 1.15);
          if (e.hp <= 0) this.onEnemyKilled(e);
        }
      }
    }
    this.pushHud(true);
  }

  private executeEnemyAttack(e: Enemy, dx: number, dy: number, dist: number): void {
    if (!this.room || !this.player) return;
    e.state = 'attack';
    e.stateT = 0.24;
    e.attackPattern = (e.attackPattern + 1) % 3;

    if (e.kind === 'specter') {
      // Teleport behind player before slash
      const targetX = Math.max(
        30,
        Math.min(this.room.width - e.w - 30, this.player.x - this.player.facing * 54)
      );
      e.x = targetX;
      e.facing = this.player.x >= e.x ? 1 : -1;
      e.vx = e.facing * 240;
      return;
    }

    if (e.kind === 'pyromancer') {
      const shot = this.projectiles.acquire(this.room.projectiles);
      shot.x = this.player.x + this.player.w / 2;
      shot.y = this.room.groundY;
      shot.vx = 0;
      shot.vy = 0;
      shot.r = 28;
      shot.dmg = e.dmg;
      shot.friendly = false;
      shot.color = '#e06b2b';
      shot.kind = 'eruption';
      shot.telegraphT = 0.65;
      shot.life = 1.05;
      return;
    }

    if (e.kind === 'watcher' || e.kind === 'arbalest') {
      const ang = Math.atan2(dy, dx);
      const speed = e.kind === 'arbalest' ? 520 : 340;
      const shot = this.projectiles.acquire(this.room.projectiles);
      shot.x = e.x + e.w / 2;
      shot.y = e.y + e.h * 0.45;
      shot.vx = Math.cos(ang) * speed;
      shot.vy = Math.sin(ang) * speed;
      shot.r = e.kind === 'arbalest' ? 6 : 8;
      shot.dmg = e.dmg;
      shot.friendly = false;
      shot.color = e.kind === 'arbalest' ? '#ff4d63' : '#e06b2b';
      shot.kind = e.kind === 'arbalest' ? 'bolt' : 'orb';
      shot.life = 2.2;
      return;
    }

    if (e.isBoss) {
      if (e.attackPattern === 1 || dist > 230) {
        // Multi-orb / Crescent barrage
        const ang = Math.atan2(dy, dx);
        const count = e.phase === 2 ? 5 : 3;
        for (let i = 0; i < count; i++) {
          const a = ang + (i - (count - 1) / 2) * 0.2;
          const shot = this.projectiles.acquire(this.room.projectiles);
          shot.x = e.x + e.w / 2;
          shot.y = e.y + e.h * 0.45;
          shot.vx = Math.cos(a) * (e.phase === 2 ? 400 : 340);
          shot.vy = Math.sin(a) * (e.phase === 2 ? 400 : 340);
          shot.r = 10;
          shot.dmg = e.dmg;
          shot.friendly = false;
          shot.color = e.kind === 'mother' ? '#ff4d63' : '#ffd470';
          shot.kind = e.kind === 'sovereign' ? 'crescent' : 'orb';
          shot.life = 2.6;
        }
      } else if (e.phase === 2 && e.attackPattern === 2) {
        // Ground Eruption Pillar
        const shot = this.projectiles.acquire(this.room.projectiles);
        shot.x = this.player.x + this.player.w / 2;
        shot.y = this.room.groundY;
        shot.vx = 0;
        shot.vy = 0;
        shot.r = 36;
        shot.dmg = e.dmg;
        shot.friendly = false;
        shot.color = '#ff4d63';
        shot.kind = 'eruption';
        shot.telegraphT = 0.55;
        shot.life = 0.95;
      }
      e.vx = e.facing * (e.phase === 2 ? 480 : 410);
      return;
    }

    e.vx = e.facing * (e.kind === 'flagellant' ? 280 : 310);
  }

  private hurtPlayer(rawDmg: number, sourceX: number): void {
    if (!this.player || !this.run || !this.room || this.deathDelayTimer > 0) {
      return;
    }
    const player = this.player;
    const run = this.run;

    // 0. Check Perfect Dodge during active Dash evading a strike!
    if (player.dashT > 0) {
      if (player.invulnT > 0.14) {
        player.invulnT = 0.14;
        run.perfectDodges += 1;
        run.stam = Math.min(run.maxStam, run.stam + 14);
        run.critNextAttack = true;
        this.slowMoT = 0.22;
        AudioFX.perfectDodge();
        this.vfx.spawnImpactFlare(player.x + player.w / 2, player.y + 24, 62, '#8ab8e6', 'astral', 0.24);
        this.particles.addText(player.x + 14, player.y - 18, 'ESQUIVE PARFAITE !', '#8ab8e6', 1.1);
      }
      return;
    }

    if (player.invulnT > 0) return;

    // 1. Check Perfect Sekiro Deflect!
    if (player.parryT > 0) {
      AudioFX.parry();
      if (this.save.settings?.hitstopEnabled !== false) this.hitStop = 0.08;
      this.slowMoT = 0.18;
      this.trauma = 0.48;
      this.input.rumble(0.42, 0.85, 130, this.save.settings?.gamepadRumble !== false);
      player.invulnT = 0.26;
      player.riposteBuffT = 4.0;
      run.stam = Math.min(run.maxStam, run.stam + 24);
      run.parries += 1;
      run.parryStreak += 1;
      run.bestParryStreak = Math.max(run.bestParryStreak, run.parryStreak);
      if (run.parryStreak >= 3 && run.parryStreak % 3 === 0) {
        run.stam = Math.min(run.maxStam, run.stam + 18);
        this.particles.addText(player.x + 14, player.y - 36, `ÉLAN ${run.parryStreak}x !`, '#ff9d42', 1.05);
      }
      this.registerComboHit(2);
      if (run.blessings.includes('bronze_counter')) run.critNextAttack = true;
      const pxP = player.x + player.w / 2 + player.facing * 16;
      const pyP = player.y + 20;
      const quietParry = this.save.settings?.reduceFlashes;
      this.particles.spawnBurst(pxP, pyP, '#ffd470', quietParry ? 6 : 16, quietParry ? 120 : 270);
      this.particles.spawnRing(player.x + player.w / 2, player.y + 20, '#ffd470', 90, 0.26);
      if (!quietParry) {
        this.particles.spawnBurst(pxP, pyP, '#fff3cb', 6, 180, 160, 1);
        this.vfx.spawnImpactFlare(pxP, pyP, 84, '#ffd470', 'gold', 0.25);
        this.vfx.triggerScreenFlash('#ffd470', 0.18);
      }
      for (let b = 0; !quietParry && b < 3; b++) {
        const ang = -0.8 + b * 0.8 + (player.facing === -1 ? Math.PI : 0);
        this.vfx.spawnLightning(
          pxP,
          pyP,
          pxP + Math.cos(ang) * 72,
          pyP + Math.sin(ang) * 72,
          '#ffd470',
          2.6,
          0.18
        );
      }
      this.particles.addText(player.x + 14, player.y - 16, 'PARADE PARFAITE', '#ffe2a3', 1.15);

      const stagPower =
        ((this.save.oath === 'airain' ? 78 : 55) +
          (this.save.talents.parry_mastery || 0) * 10) *
        (run.relics.includes('eclipse_mirror') ? 1.2 : 1);

      for (const e of this.room.enemies) {
        if (e.hp <= 0 || e.state === 'dead') continue;
        if (Math.abs(e.x + e.w / 2 - (player.x + player.w / 2)) < 145) {
          e.stagger += run.blessings.includes('fortress_guard')
            ? Math.round(stagPower * 1.45)
            : stagPower;
          if (run.blessings.includes('thunder_parry')) {
            applyEnemyDamage(run, e, 38);
            e.hitFlashT = 0.06;
            this.particles.addText(e.x + e.w / 2, e.y - 24, '-38 ⚡', '#ffd470');
            if (e.hp <= 0) this.onEnemyKilled(e);
          }
          if (e.hp > 0 && e.stagger >= e.maxStagger) {
            e.stagger = 0;
            e.state = 'staggered';
            e.stateT = 2.1;
            this.particles.addText(e.x + e.w / 2, e.y - 40, 'BRISÉ !', '#ff9d42', 1.2);
          }
        }
      }
      this.pushHud(true);
      return;
    }

    // 2. Partial Guard Mitigation
    let dmg = rawDmg;
    if (this.save.oath === 'eclipse') dmg = Math.round(dmg * 1.25);
    if (run.relics.includes('iron_crown')) dmg = Math.round(dmg * 0.82);

    if (player.guardT > 0 && run.stam >= 15) {
      run.stam -= 15;
      dmg = Math.max(2, Math.round(dmg * 0.4));
      AudioFX.guard();
      this.particles.addText(player.x + 14, player.y - 12, `GARDE -${dmg}`, '#b8b0a6');
    } else {
      run.parryStreak = 0;
      run.comboHits = 0;
      run.comboTimer = 0;
      AudioFX.hurt();
      this.particles.addText(player.x + 14, player.y - 12, `-${dmg}`, '#ff4d5e', 1.1);
    }

    run.damageTaken += Math.min(run.hp, dmg);
    run.hp = Math.max(0, run.hp - dmg);
    player.invulnT = 0.65;
    player.hitFlashT = 0.08;
    player.vx = (player.x < sourceX ? -1 : 1) * 240;
    player.vy = -190;
    if (this.save.settings?.hitstopEnabled !== false) this.hitStop = 0.055;
    this.trauma = 0.62;
    this.input.rumble(0.55, 0.85, 160, this.save.settings?.gamepadRumble !== false);
    this.particles.spawnBurst(player.x + player.w / 2, player.y + 24, '#c4303e', 14, 240);
    this.vfx.spawnImpactFlare(player.x + player.w / 2, player.y + 24, 48, '#ff4d5e', 'crimson', 0.18);
    this.vfx.triggerScreenFlash('#c4303e', 0.24);
    this.blood.spawnImpact(
      player.x + player.w / 2,
      player.y + player.h * 0.5,
      player.x < sourceX ? -1 : 1,
      1.15,
      this.room.platforms,
      'crimson'
    );

    // Second Wind talent check
    if (run.hp <= 0 && (this.save.talents.second_wind || 0) > 0 && !run.secondWindUsed) {
      run.secondWindUsed = true;
      run.hp = Math.round(run.maxHp * 0.3);
      player.invulnT = 1.6;
      AudioFX.heal();
      this.particles.spawnRing(player.x + player.w / 2, player.y + 24, '#ffd470', 140, 0.4);
      this.particles.addText(player.x + 14, player.y - 26, 'DERNIER SOUFFLE !', '#ffd470', 1.25);
      this.pushHud(true);
      return;
    }

    if (run.hp <= 0) {
      if (run.isTraining) {
        run.hp = run.maxHp;
        run.flasks = run.maxFlasks;
        run.stam = run.maxStam;
        player.invulnT = 1.6;
        AudioFX.heal();
        this.particles.spawnRing(player.x + player.w / 2, player.y + 24, '#ffd470', 120, 0.35);
        this.particles.addText(player.x + 14, player.y - 26, 'RÉGÉNÉRATION LIBRE !', '#ffd470', 1.1);
        this.pushHud(true);
        return;
      }
      AudioFX.death();
      this.deathDelayTimer = 0.65;
      this.showBanner("L'ARGILE SE BRISE", 'Bilan de l’expédition…', '#c4303e', 1.8);
    }
    this.pushHud(true);
  }

  private onEnemyKilled(e: Enemy): void {
    if (!this.run || !this.room) return;
    e.state = 'dead';
    e.deadT = 0.35;
    this.run.kills += 1;

    if (!this.run.isTraining) {
      this.updateSave((s) => ({
        ...s,
        bestiaryKills: {
          ...s.bestiaryKills,
          [e.kind]: (s.bestiaryKills[e.kind] || 0) + 1,
        },
        records: {
          ...s.records,
          bossesSlain: s.records.bossesSlain + (e.isBoss ? 1 : 0),
        },
      }));
    }

    this.particles.spawnBurst(
      e.x + e.w / 2,
      e.y + e.h / 2,
      '#d4a853',
      e.isBoss ? 48 : 18,
      280
    );
    this.vfx.spawnAshDissolve(
      e.x + e.w / 2,
      e.y + e.h * 0.5,
      e.isBoss ? 42 : 16,
      e.isBoss ? '#ffd470' : '#ff8c3b',
      e.w,
      e.h
    );
    if (e.isBoss) {
      this.slowMoT = 0.45;
      this.vfx.spawnImpactFlare(e.x + e.w / 2, e.y + e.h * 0.5, 130, '#ffd470', 'gold', 0.42);
      this.vfx.triggerScreenFlash('#ffd470', 0.32);
    }
    this.blood.spawnImpact(
      e.x + e.w / 2,
      e.y + e.h * 0.55,
      this.player ? this.player.facing : -e.facing,
      e.isBoss ? 2.2 : 1.55,
      this.room.platforms,
      getBloodToneForEnemy(e.kind)
    );

    const mult = getLootMultiplier(this.save, this.run, this.room.affix?.id);
    const baseC = e.isBoss ? 80 : e.kind === 'flagellant' ? 24 : 13;
    const cendres = Math.round(baseC * (e.elite !== 'none' ? 1.7 : 1) * mult);
    this.run.loot.cendres += cendres;

    const ferChance = (e.elite !== 'none' ? 0.85 : 0.25) + (this.run.relics.includes('cinder_magnet') ? 0.15 : 0);
    if (e.isBoss || Math.random() < ferChance) {
      this.run.loot.fer += e.isBoss ? 2 : 1;
    }
    if (e.isBoss || Math.random() < 0.08 + (this.save.buildings.vigie || 0) * 0.03) {
      this.run.loot.larmes += 1;
    }

    if (this.run.blessings.includes('vampiric')) {
      this.run.hp = Math.min(this.run.maxHp, this.run.hp + 8);
    }
    if (this.run.blessings.includes('ash_echo') && this.player) {
      this.run.stam = Math.min(this.run.maxStam, this.run.stam + 18);
      this.player.dashCd = 0;
    }

    if (e.isBoss) {
      this.room.props.forEach((p) => {
        if (p.type === 'exit') p.locked = false;
      });
      AudioFX.victory();
      this.showBanner('GARDIEN TERRASSÉ', 'Le passage vers les profondeurs est ouvert', '#ffd470', 2.6);
    }
    this.pushHud(true);
  }

  private handlePropsInteraction(inp: InputState): void {
    if (!this.room || !this.player || !this.run) return;
    const player = this.player;
    const run = this.run;
    let prompt = '';
    const interact = this.input.lastInputMode === 'Manette'
      ? 'A / Croix'
      : formatKeyLabel(this.save.settings?.keyBindings?.interact ?? DEFAULT_KEY_BINDINGS.interact);
    const action = `[${interact}]`;

    for (const pr of this.room.props) {
      if (pr.type === 'urn') continue;
      const near =
        Math.abs(player.x + player.w / 2 - (pr.x + pr.w / 2)) < 58 &&
        Math.abs(player.y + player.h - (pr.y + pr.h)) < 70;
      if (!near) continue;

      if ((pr.type === 'chest' || pr.type === 'gilded_chest') && !pr.opened) {
        prompt = pr.type === 'gilded_chest' ? `${action} Ouvrir le Reliquaire Doré` : `${action} Ouvrir le Reliquaire`;
        if (inp.interact) {
          pr.opened = true;
          const mult = getLootMultiplier(this.save, run);
          const c = Math.round((pr.type === 'gilded_chest' ? 35 : 20 + Math.random() * 14) * mult);
          const f = pr.type === 'gilded_chest' || Math.random() < 0.48 + (this.save.buildings.vigie || 0) * 0.08 ? 1 : 0;
          run.loot.cendres += c;
          run.loot.fer += f;

          if (pr.type === 'gilded_chest') {
            const unowned = RELICS_POOL.filter((r) => !run.relics.includes(r.id));
            if (unowned.length > 0) {
              const relic = unowned[Math.floor(Math.random() * unowned.length)];
              run.relics.push(relic.id);
              run.activeSynergies = computeActiveSynergies(run);
              this.particles.addText(pr.x, pr.y - 34, `Relique : ${relic.name}`, '#ffd470', 1.1);
            }
          }
          AudioFX.pickup();
          this.particles.spawnBurst(pr.x + pr.w / 2, pr.y, '#ffd470', 18, 200);
          this.particles.addText(pr.x, pr.y - 16, `+${c}🔥 ${f ? `+${f}⛓️` : ''}`, '#d4a853');
        }
      } else if (pr.type === 'brazier' && !pr.used) {
        prompt = run.isTraining
          ? `${action} Se régénérer au Brasero (Illimité)`
          : `${action} Se réchauffer au Brasero (+35% PV & +1 Fiole)`;
        if (inp.interact) {
          if (!run.isTraining) pr.used = true;
          const heal = run.isTraining ? run.maxHp : Math.round(run.maxHp * 0.35);
          run.hp = Math.min(run.maxHp, run.hp + heal);
          run.flasks = run.isTraining ? run.maxFlasks : Math.min(run.maxFlasks, run.flasks + 1);
          AudioFX.heal();
          this.particles.spawnBurst(pr.x + pr.w / 2, pr.y, '#ff9842', 20, 180);
          this.particles.addText(
            pr.x,
            pr.y - 20,
            run.isTraining ? 'VITALITÉ & FIOLES RESTAURÉES' : `+${heal} PV · +1 Fiole`,
            '#ff9842'
          );
        }
      } else if (pr.type === 'shrine' && !pr.used) {
        prompt = `${action} Autel de Sang (Sacrifier 20% PV -> +55🔥 & +1💧)`;
        if (inp.interact) {
          pr.used = true;
          const sac = Math.max(1, Math.round(run.maxHp * 0.2));
          run.hp = Math.max(1, run.hp - sac);
          run.loot.cendres += 55;
          run.loot.larmes += 1;
          AudioFX.sacrifice();
          this.particles.spawnBurst(pr.x + pr.w / 2, pr.y, '#c4303e', 18, 180);
          this.blood.spawnImpact(
            pr.x + pr.w / 2,
            pr.y + pr.h * 0.5,
            1,
            0.95,
            this.room.platforms,
            'crimson'
          );
          this.particles.addText(pr.x, pr.y - 22, `+55🔥 +1💧`, '#7ab8ff');
        }
      } else if (pr.type === 'merchant') {
        prompt = `${action} Parler au Marchand Errant`;
        if (inp.interact) {
          AudioFX.ui();
          this.cb.onMerchantOpen({ ...run });
          this.setPhase('merchant');
        }
      } else if (pr.type === 'lore' && !pr.used && pr.loreId) {
        prompt = `${action} Déchiffrer la Stèle`;
        if (inp.interact) {
          pr.used = true;
          const lore = LORE_TABLETS.find((l) => l.id === pr.loreId);
          if (lore && !this.save.loreUnlocked.includes(lore.id)) {
            this.updateSave((s) => ({ ...s, loreUnlocked: [...s.loreUnlocked, lore.id] }));
          }
          run.loot.cendres += 15;
          AudioFX.pickup();
          this.showBanner(lore?.title || 'Stèle Ancienne', lore?.text || '', '#8ab8e6', 3.5);
        }
      } else if (pr.type === 'npc' && !pr.used && pr.npcId) {
        const npcName = NPCS_DEF[pr.npcId].name;
        prompt = `${action} Secourir ${npcName}`;
        if (inp.interact) {
          pr.used = true;
          const id = pr.npcId;
          this.updateSave((s) => ({
            ...s,
            npcsUnlocked: { ...s.npcsUnlocked, [id]: true },
          }));
          AudioFX.heal();
          this.particles.addText(pr.x, pr.y - 22, `${npcName} rejoint le Bastion !`, '#7ab8ff');
        }
      } else if (pr.type === 'exit') {
        if (pr.locked) {
          prompt = 'Terrassez le Gardien pour ouvrir le Passage';
        } else if (run.isTraining) {
          prompt = `${action} Quitter la Cour et revenir au Bastion`;
          if (inp.interact) {
            this.openBastion();
            return;
          }
        } else {
          prompt = `${action} Descendre vers la Strate ${run.depth + 1}`;
          if (inp.interact) {
            AudioFX.ui();
            this.cb.onBlessingChoices(pickBlessingChoices(run, 3));
            this.setPhase('blessing');
            return;
          }
        }
      }
    }

    if (prompt !== this.promptText) {
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
    renderGameFrame(this.ctx, {
      phase: this.phase,
      time: this.simTime,
      width: this.width,
      height: this.height,
      cameraX: this.camera.x,
      cameraY: this.camera.y,
      trauma: this.trauma,
      room: this.room,
      player: this.player,
      run: this.run,
      weapon: this.save.weapon,
      armorSkin: this.save.armorSkin || 'eclipse',
      particles: this.particles,
      blood: this.blood,
      vfx: this.vfx,
      settings: this.save.settings,
    });
  }
}
