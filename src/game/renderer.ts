import { renderAttackWarnings, renderEnemiesAndShadows, renderPlayer, renderProjectiles } from './actorRender';
import { renderDeepAtmosphericDecor, renderMidAtmosphereAndDust } from './atmosphere';
import type { BloodSystem } from './bloodDecals';
import { BIOMES } from './data';
import { renderGroundEffects, renderWorldEffects } from './effectsRender';
import type { FrameProfile } from './frameProfile';
import { renderAtmosphericColorGrading, renderLowHpVignette, renderMinimap } from './overlayRender';
import { computeCombatDepthFocus, renderDeepParallaxLayers, renderForegroundParallax } from './parallax';
import type { ParticlePool } from './particles';
import type { PositionInterpolator } from './renderInterpolation';
import { renderHazards, renderProps, renderTerrainAndTorches } from './roomRender';
import { renderBackdropAndEclipse, renderMidgroundArchitecture } from './sceneryRender';
import { getTitleHeroArtwork } from './textures';
import { renderTitleArtworkBackdrop, renderTitleShowcase } from './titleRender';
import type { ArmorSkinKey, GameSettings, Player, RoomData, RunState, WeaponKey } from './types';
import { renderScreenVfx, type VfxSystem } from './vfx';

export interface RenderContextState {
  phase: string;
  time: number;
  width: number;
  height: number;
  cameraX: number;
  cameraY: number;
  trauma: number;
  room: RoomData | null;
  player: Player | null;
  interpolatePosition?: PositionInterpolator;
  run: RunState | null;
  weapon: WeaponKey;
  armorSkin?: ArmorSkinKey;
  particles: ParticlePool;
  blood?: BloodSystem;
  vfx?: VfxSystem;
  settings?: GameSettings;
}

export function renderGameFrame(
  ctx: CanvasRenderingContext2D,
  st: RenderContextState,
  profile?: FrameProfile,
): void {
  const { width: W, height: H, time } = st;
  const isTitle = st.phase === 'title';
  const b = st.room ? st.room.biome : BIOMES[0];
  const fogQuality = st.settings?.fogQuality ?? 'high';

  if (isTitle) {
    const titleArt = getTitleHeroArtwork();
    if (titleArt) {
      const titleStart = profile?.now() ?? 0;
      renderTitleArtworkBackdrop(ctx, titleArt, b, W, H, time, fogQuality);
      profile?.finishTiming('titleArtwork', titleStart);
      return;
    }
  }

  const camX = isTitle ? Math.sin(time * 0.14) * 90 + 160 : st.cameraX;
  const camY = isTitle ? 120 : st.cameraY;

  let sceneryStart = profile?.now() ?? 0;
  const eclipseX = renderBackdropAndEclipse(ctx, b, W, H, camX, camY, time, isTitle, st.trauma);

  const parallaxOn = st.settings?.parallaxEnabled !== false;
  const bloodIntensity = st.settings?.bloodIntensity ?? 'high';
  const vfxQuality = st.settings?.vfxQuality ?? 'high';
  const highContrast = !!st.settings?.highContrastTelegraphs;
  const showEnemyBars = st.settings?.showEnemyBars !== false;
  const shakeMult = st.settings?.screenShakeScale ?? 1;

  profile?.finishTiming('backdropAndEclipse', sceneryStart);

  sceneryStart = profile?.now() ?? 0;
  if (parallaxOn) {
    renderDeepParallaxLayers(ctx, b, W, H, camX, isTitle ? 0 : camY, time, st.trauma * shakeMult);
  }
  renderDeepAtmosphericDecor(ctx, b, W, H, camX, isTitle ? 0 : camY, time, isTitle, fogQuality);

  profile?.finishTiming('distantScenery', sceneryStart);

  sceneryStart = profile?.now() ?? 0;
  renderMidgroundArchitecture(ctx, W, H, camX, camY, time, isTitle, st.trauma * shakeMult, eclipseX);

  profile?.finishTiming('midgroundArchitecture', sceneryStart);

  sceneryStart = profile?.now() ?? 0;
  renderMidAtmosphereAndDust(ctx, b, W, H, camX, isTitle ? 0 : camY, time, isTitle, fogQuality);

  profile?.finishTiming('midgroundAtmosphere', sceneryStart);

  if (isTitle) {
    sceneryStart = profile?.now() ?? 0;
    renderTitleShowcase(ctx, W, H, time);
    profile?.finishTiming('titleShowcase', sceneryStart);
    return;
  }

  if (!st.room || !st.player) return;
  const { room } = st;
  const interpolate = st.interpolatePosition ?? (<T>(position: T): T => position);
  const player = interpolate(st.player);

  ctx.save();
  const shakePower = st.trauma * st.trauma * 18 * shakeMult;
  const sx = (Math.random() - 0.5) * shakePower;
  const sy = (Math.random() - 0.5) * shakePower;
  ctx.translate(-Math.round(camX - sx), -Math.round(camY - sy));

  sceneryStart = profile?.now() ?? 0;
  renderTerrainAndTorches(ctx, room, b, camX, W, time, interpolate);

  profile?.finishTiming('terrainAndTorches', sceneryStart);

  renderHazards(ctx, room, camX, W, interpolate);
  renderGroundEffects(ctx, room.platforms, camX, W, bloodIntensity, vfxQuality, st.blood, st.vfx);

  sceneryStart = profile?.now() ?? 0;
  renderProps(ctx, room, camX, W, time);

  profile?.finishTiming('props', sceneryStart);

  renderEnemiesAndShadows(ctx, room, player, camX, W, time, showEnemyBars, interpolate);
  renderProjectiles(ctx, room.projectiles, interpolate);
  renderPlayer(ctx, player, st.weapon, st.run, time, st.armorSkin);
  renderWorldEffects(ctx, st.particles, camX, W, bloodIntensity, vfxQuality, st.blood, st.vfx);

  ctx.restore();

  // Foreground parallax and overlays use screen coordinates.
  if (parallaxOn) {
    sceneryStart = profile?.now() ?? 0;
    const hpRatio = st.run ? st.run.hp / Math.max(1, st.run.maxHp) : 1;
    const depthFocus = computeCombatDepthFocus(st.trauma * shakeMult, room.isBoss, hpRatio);
    renderForegroundParallax(ctx, b, W, H, camX, camY, time, st.trauma * shakeMult, depthFocus);
    profile?.finishTiming('foregroundParallax', sceneryStart);
  }

  if (st.vfx && !st.settings?.reduceFlashes) {
    renderScreenVfx(ctx, st.vfx, W, H, vfxQuality);
  }

  renderLowHpVignette(ctx, st.run, W, H, time);

  sceneryStart = profile?.now() ?? 0;
  renderAtmosphericColorGrading(ctx, b, W, H);
  profile?.finishTiming('colorGrading', sceneryStart);

  // Attack cues stay legible over particles, foreground fog, and color grading.
  ctx.save();
  ctx.translate(-Math.round(camX - sx), -Math.round(camY - sy));
  renderAttackWarnings(ctx, room.enemies, player, camX, W, highContrast, interpolate);
  ctx.restore();

  if (st.phase === 'playing' && st.settings?.showMinimap !== false) {
    renderMinimap(ctx, W, H, room, player);
  }
}
