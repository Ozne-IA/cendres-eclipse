import {
  drawAttackWarning,
  drawDetailedEnemy,
  drawDetailedPlayer,
  drawDetailedProp,
  drawPlantedRelicSword,
  drawWeaponSprite,
  getTorchGlow,
} from './artSprites';
import {
  renderDeepAtmosphericDecor,
  renderMidAtmosphereAndDust,
} from './atmosphere';
import {
  renderBloodDecals,
  renderBloodDroplets,
  type BloodSystem,
} from './bloodDecals';
import { BIOMES } from './data';
import type { ParticlePool } from './particles';
import {
  computeCombatDepthFocus,
  computeParallaxOffset,
  PARALLAX_LAYERS,
  renderDeepParallaxLayers,
  renderForegroundParallax,
} from './parallax';
import {
  getColoredGlow,
  getSeamlessBakedBackdrop,
  getStonePattern,
  getTitleHeroArtwork,
} from './textures';
import type { ArmorSkinKey, BiomeDef, GameSettings, Player, RoomData, RunState, WeaponKey } from './types';
import {
  renderGroundFissuresVfx,
  renderScreenVfx,
  renderWorldVfx,
  type VfxSystem,
} from './vfx';

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
  run: RunState | null;
  weapon: WeaponKey;
  armorSkin?: ArmorSkinKey;
  particles: ParticlePool;
  blood?: BloodSystem;
  vfx?: VfxSystem;
  settings?: GameSettings;
}

let coronaCanvas: HTMLCanvasElement | null = null;
let lowHpVignetteCanvas: HTMLCanvasElement | null = null;

function getCoronaSprite(): HTMLCanvasElement | null {
  if (coronaCanvas || typeof document === 'undefined') return coronaCanvas;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const gctx = c.getContext('2d');
  if (!gctx) return null;
  const g = gctx.createRadialGradient(128, 128, 22, 128, 128, 128);
  g.addColorStop(0, 'rgba(255, 188, 96, 0.72)');
  g.addColorStop(0.32, 'rgba(224, 107, 43, 0.30)');
  g.addColorStop(0.68, 'rgba(168, 40, 53, 0.09)');
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  gctx.fillStyle = g;
  gctx.fillRect(0, 0, 256, 256);
  coronaCanvas = c;
  return coronaCanvas;
}

function getVignetteSprite(lowHp: boolean): HTMLCanvasElement | null {
  if (typeof document === 'undefined' || !lowHp) return null;
  if (lowHpVignetteCanvas) return lowHpVignetteCanvas;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const gctx = c.getContext('2d');
  if (!gctx) return null;
  const g = gctx.createRadialGradient(128, 128, 62, 128, 128, 156);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(148, 22, 34, 0.56)');
  gctx.fillStyle = g;
  gctx.fillRect(0, 0, 256, 256);
  lowHpVignetteCanvas = c;
  return c;
}

export function renderGameFrame(ctx: CanvasRenderingContext2D, st: RenderContextState): void {
  const { width: W, height: H, time } = st;
  const isTitle = st.phase === 'title';
  const b = st.room ? st.room.biome : BIOMES[0];
  const fogQuality = st.settings?.fogQuality ?? 'high';

  // AAA Title Composition: composite the 2K Crowned Eclipse Knight concept art + live atmospheric/corona layers
  if (isTitle) {
    const titleArt = getTitleHeroArtwork();
    if (titleArt) {
      renderTitleArtworkBackdrop(ctx, titleArt, b, W, H, time, fogQuality);
      return;
    }
  }

  const camX = isTitle ? Math.sin(time * 0.14) * 90 + 160 : st.cameraX;
  const camY = isTitle ? 120 : st.cameraY;

  // Plan 0: Pre-baked Seamless Matte-Painted Biome Backdrop + Scrim + Mist (0.05x)
  const bakedBg = getSeamlessBakedBackdrop(b, W, H, isTitle);
  if (bakedBg) {
    const sx = Math.floor(((camX * 0.05) % (W * 2) + W * 2) % (W * 2));
    ctx.drawImage(bakedBg, sx, 0, W, H, 0, 0, W, H);
  } else {
    ctx.fillStyle = b.skyTop;
    ctx.fillRect(0, 0, W, H);
  }

  // Faint celestial dust stars in upper sky (0.03x)
  const skyOff = computeParallaxOffset(camX, camY, time, PARALLAX_LAYERS.sky, W, st.trauma);
  ctx.fillStyle = 'rgba(236, 226, 206, 0.25)';
  for (let i = 0; i < 24; i++) {
    const sx = ((i * 149 - skyOff.offsetX) % W + W) % W;
    const sy = ((i * 41 - skyOff.offsetY * 0.4) % (H * 0.42) + H * 0.42) % (H * 0.42);
    ctx.fillRect(sx, sy, i % 3 === 0 ? 2 : 1.2, i % 3 === 0 ? 2 : 1.2);
  }

  // Celestial Brass Eclipse + Additive Corona + Solar Plasma Prominences + Astrolabe Rings
  const ex = W * 0.72 - (isTitle ? camX * 0.04 : skyOff.offsetX);
  const ey = H * 0.25 - (isTitle ? 0 : skyOff.offsetY);
  const pulse = 1 + Math.sin(time * 1.4) * 0.045;
  const coronaSprite = getCoronaSprite();
  const cRad = 255 * pulse;
  if (coronaSprite) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.72;
    ctx.drawImage(coronaSprite, Math.round(ex - cRad), Math.round(ey - cRad), Math.round(cRad * 2), Math.round(cRad * 2));
    // Swirling fiery solar prominence rim arcs
    for (let fl = 0; fl < 4; fl++) {
      const a = time * (0.28 + fl * 0.09) + fl * 1.57;
      ctx.strokeStyle = fl % 2 === 0 ? 'rgba(255, 178, 86, 0.32)' : 'rgba(224, 96, 42, 0.24)';
      ctx.lineWidth = 4 + (fl % 2) * 2;
      ctx.beginPath();
      ctx.arc(ex, ey, 51 + fl * 3.5, a, a + 1.05);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.strokeStyle = 'rgba(212, 168, 83, 0.24)';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.arc(ex, ey, 78, time * 0.18, time * 0.18 + Math.PI * 1.38);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(ex, ey, 104, -time * 0.12, -time * 0.12 + Math.PI * 0.88);
  ctx.stroke();

  // Eclipse Core & Molten Rim
  ctx.fillStyle = '#050408';
  ctx.beginPath();
  ctx.arc(ex, ey, 48, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffd470';
  ctx.lineWidth = 2.8;
  ctx.stroke();
  ctx.strokeStyle = b.accentColor;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(ex, ey, 50.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 1;

  const parallaxOn = st.settings?.parallaxEnabled !== false;
  const bloodIntensity = st.settings?.bloodIntensity ?? 'high';
  const vfxQuality = st.settings?.vfxQuality ?? 'high';
  const highContrast = !!st.settings?.highContrastTelegraphs;
  const showEnemyBars = st.settings?.showEnemyBars !== false;
  const shakeMult = st.settings?.screenShakeScale ?? 1;

  // Plan 1: Distant Gothic Horizon Silhouettes (0.14x) + Plan 2: Animated Volumetric God-Rays & Deep/Mid Fog
  if (parallaxOn) {
    renderDeepParallaxLayers(ctx, b, W, H, camX, isTitle ? 0 : camY, time, st.trauma * shakeMult);
  }
  renderDeepAtmosphericDecor(ctx, b, W, H, camX, isTitle ? 0 : camY, time, isTitle, fogQuality);

  // Plan 3: Midground Gothic Colonnade (0.42x H & 0.18x V for clear 2.5D separation)
  const midTileW = 540;
  const midOff = computeParallaxOffset(
    camX,
    isTitle ? 0 : camY,
    time,
    PARALLAX_LAYERS.midground,
    midTileW,
    st.trauma * shakeMult
  );
  const midYShift = Math.round(-midOff.offsetY * 0.35);
  const midStart = -Math.round(midOff.wrapX) - midTileW;
  for (let px = midStart, idx = 0; px < W + midTileW; px += midTileW, idx++) {
    if (px + 140 < 0 || px - 140 > W) continue;
    if (isTitle && (px < W * 0.48 || Math.abs(px + 22 - ex) < 92)) continue;

    // Fluted shadow column (soft atmospheric perspective behind Plan 4 combat)
    ctx.fillStyle = isTitle ? 'rgba(10, 7, 14, 0.64)' : 'rgba(10, 7, 15, 0.54)';
    ctx.fillRect(px, 28 + midYShift, 44, H + 90);
    ctx.fillStyle = 'rgba(255, 225, 185, 0.038)';
    ctx.fillRect(px + 33, 28 + midYShift, 5, H + 90);
    // Column capital
    ctx.fillStyle = 'rgba(15, 11, 19, 0.72)';
    ctx.fillRect(px - 10, 28 + midYShift, 64, 15);
    ctx.fillRect(px - 6, 48 + midYShift, 56, 7);

    // Ribbed gothic arch
    ctx.strokeStyle = 'rgba(74, 59, 44, 0.25)';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.arc(px + 270, 150 + midYShift, 225, Math.PI, Math.PI * 1.44);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(px + 270, 150 + midYShift, 225, Math.PI * 1.56, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;

    // Hanging censer & war banner
    if (idx % 2 === 0) {
      const sway = Math.sin(time * 1.1 + idx) * 5;
      const chainLen = 195 + (idx % 3) * 38 + midYShift;
      ctx.strokeStyle = 'rgba(130, 116, 102, 0.28)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(px + 270, 0);
      ctx.lineTo(px + 270 + sway, chainLen);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.fillStyle = 'rgba(255, 148, 62, 0.7)';
      ctx.beginPath();
      ctx.arc(px + 270 + sway, chainLen + 4, 3.8, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const bWave = Math.sin(time * 1.7 + idx) * 4;
      ctx.fillStyle = 'rgba(92, 24, 34, 0.36)';
      ctx.beginPath();
      ctx.moveTo(px + 9, 64 + midYShift);
      ctx.lineTo(px + 35, 64 + midYShift);
      ctx.lineTo(px + 33 + bWave, 200 + midYShift);
      ctx.lineTo(px + 22 + bWave * 0.7, 179 + midYShift);
      ctx.lineTo(px + 11 + bWave, 203 + midYShift);
      ctx.closePath();
      ctx.fill();
    }
  }

  // Abyssal Volumetric Fog & Multi-Plane Floating Dust Motes, Ash Flakes & Luminous Embers
  renderMidAtmosphereAndDust(ctx, b, W, H, camX, isTitle ? 0 : camY, time, isTitle, fogQuality);

  // Title Screen Vignette Showcase
  if (isTitle) {
    renderTitleShowcase(ctx, W, H, time);
    return;
  }

  if (!st.room || !st.player) return;
  const { room, player } = st;

  ctx.save();
  const shakePower = st.trauma * st.trauma * 18 * shakeMult;
  const sx = (Math.random() - 0.5) * shakePower;
  const sy = (Math.random() - 0.5) * shakePower;
  ctx.translate(-Math.round(camX - sx), -Math.round(camY - sy));

  // 6. Torches & Wrought-Iron Wall Sconces
  const glowSprite = getTorchGlow();
  for (const t of room.torches) {
    if (t.x < camX - 180 || t.x > camX + W + 180) continue;
    const flick = 1 + Math.sin(time * 9 + t.x) * 0.08;
    const r = 132 * flick;
    if (glowSprite) {
      ctx.globalAlpha = 0.74;
      ctx.drawImage(glowSprite, Math.round(t.x - r), Math.round(t.y - r), Math.round(r * 2), Math.round(r * 2));
      ctx.globalAlpha = 1;
    }

    ctx.fillStyle = '#241c19';
    ctx.fillRect(t.x - 3, t.y, 6, 18);
    ctx.fillStyle = '#5c4839';
    ctx.fillRect(t.x - 7, t.y, 14, 3.5);
    const sway = Math.sin(time * 13 + t.x) * 2.5;
    ctx.fillStyle = '#d45124';
    ctx.beginPath();
    ctx.moveTo(t.x - 5.5, t.y);
    ctx.quadraticCurveTo(t.x - 3, t.y - 10, t.x + sway, t.y - 18 * flick);
    ctx.quadraticCurveTo(t.x + 4, t.y - 9, t.x + 5.5, t.y);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff0a8';
    ctx.beginPath();
    ctx.arc(t.x, t.y - 3.5, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // 7. Textured Carved Stone Platforms & Gothic Bridges (horizontally clipped to viewport)
  const stonePat = getStonePattern(ctx, b);
  for (const p of room.platforms) {
    if (p.x + p.w < camX - 40 || p.x > camX + W + 40) continue;
    const drawX = Math.max(p.x, Math.floor(camX - 4));
    const drawRight = Math.min(p.x + p.w, Math.ceil(camX + W + 4));
    const drawW = drawRight - drawX;
    if (drawW <= 0) continue;

    if (p.broken) {
      ctx.strokeStyle = 'rgba(150, 88, 58, 0.35)';
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(p.x, p.y, p.w, p.h);
      ctx.setLineDash([]);
      continue;
    }

    if (p.type === 'crumble' && p.crumbleT && p.crumbleT > 0) {
      ctx.globalAlpha = 0.55 + Math.sin(p.crumbleT * 42) * 0.3;
    }

    if (p.type === 'bounce') {
      ctx.fillStyle = '#36231c';
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = '#e06b2b';
      ctx.fillRect(p.x + 4, p.y - 3, p.w - 8, 4);
      const glowY = p.y - 11 - Math.abs(Math.sin(time * 4)) * 10;
      ctx.fillStyle = 'rgba(255, 194, 100, 0.72)';
      ctx.fillRect(p.x + p.w * 0.25, glowY, p.w * 0.5, 3);
    } else {
      ctx.fillStyle = stonePat || b.stone;
      ctx.fillRect(drawX, p.y, drawW, p.h);

      if (p.h >= 60) {
        ctx.fillStyle = 'rgba(6, 5, 8, 0.36)';
        ctx.fillRect(drawX, p.y + Math.round(p.h * 0.32), drawW, Math.ceil(p.h * 0.68));
        ctx.fillStyle = 'rgba(5, 4, 7, 0.72)';
        ctx.fillRect(drawX, p.y + Math.round(p.h * 0.66), drawW, Math.ceil(p.h * 0.34));
      }

      if (p.type !== 'solid') {
        // Carved stone/iron bridge corbel brackets beneath suspended platforms
        ctx.fillStyle = '#141018';
        ctx.fillRect(p.x + 10, p.y + p.h, 12, 10);
        ctx.fillRect(p.x + p.w - 22, p.y + p.h, 12, 10);
        ctx.fillStyle = '#68523e';
        ctx.fillRect(p.x + 12, p.y + p.h + 2, 8, 3);
        ctx.fillRect(p.x + p.w - 20, p.y + p.h + 2, 8, 3);
        ctx.fillStyle = 'rgba(6, 5, 9, 0.45)';
        ctx.fillRect(drawX, p.y + p.h - 4, drawW, 4);

        // Hanging gothic stone stalactites & weathered creeping roots beneath suspended platforms
        const rootSeed = Math.round(p.x * 0.1);
        ctx.fillStyle = '#100c14';
        for (let rx = drawX + 16; rx < drawRight - 16; rx += 28) {
          const rh = 6 + Math.abs(Math.sin(rx * 0.35 + rootSeed)) * 14;
          const rSway = Math.sin(time * 1.8 + rx) * 1.6;
          ctx.beginPath();
          ctx.moveTo(rx - 2.5, p.y + p.h);
          ctx.lineTo(rx + 2.5, p.y + p.h);
          ctx.lineTo(rx + rSway, p.y + p.h + rh);
          ctx.closePath();
          ctx.fill();
        }

        // Suspended wrought-iron dungeon chains
        if (Math.round(p.x) % 2 === 0) {
          const chainX = p.x + p.w * 0.5;
          if (chainX > camX - 30 && chainX < camX + W + 30) {
            const cSway = Math.sin(time * 1.35 + chainX * 0.05) * 3.5;
            ctx.strokeStyle = '#2b2320';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(chainX, p.y + p.h);
            ctx.lineTo(chainX + cSway, p.y + p.h + 36);
            ctx.stroke();
            ctx.fillStyle = '#423630';
            ctx.beginPath();
            ctx.arc(chainX + cSway, p.y + p.h + 38, 2.8, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }

      // Sculpted Gothic Capstone Cornice
      ctx.fillStyle =
        p.type === 'crumble'
          ? '#96583a'
          : p.type === 'moving'
          ? '#d4a853'
          : b.trim;
      ctx.fillRect(drawX, p.y, drawW, 6);
      // Specular rim highlight along top stone edge
      ctx.fillStyle = 'rgba(255, 240, 212, 0.2)';
      ctx.fillRect(drawX, p.y, drawW, 1.8);
      // Recessed shadow under cornice overhang
      ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
      ctx.fillRect(drawX, p.y + 6, drawW, 3);

      // Subtle ash moss & spectral lichen tufts along stone platform surface
      ctx.fillStyle =
        b.id === 'sanctuaire'
          ? 'rgba(212, 168, 83, 0.45)'
          : b.id === 'fleche'
          ? 'rgba(180, 52, 68, 0.36)'
          : 'rgba(112, 138, 156, 0.35)';
      for (let mx = drawX + 10; mx < drawRight - 10; mx += 32) {
        if (Math.sin(mx * 11.7) > 0.18) {
          ctx.fillRect(mx, p.y - 1.5, 6, 2);
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  // Warm torchlight reflection pools + smoldering subterranean ember cracks & planted relic swords along solid ground
  ctx.fillStyle = 'rgba(255, 148, 62, 0.12)';
  for (const t of room.torches) {
    if (t.x < camX - 100 || t.x > camX + W + 100) continue;
    if (Math.abs(room.groundY - t.y) < 150) {
      ctx.beginPath();
      ctx.ellipse(t.x, room.groundY + 2, 54, 5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  for (let pIdx = 0; pIdx < room.platforms.length; pIdx++) {
    const p = room.platforms[pIdx];
    if (p.broken || p.type !== 'solid' || p.w < 240) continue;
    if (p.x + p.w < camX - 60 || p.x > camX + W + 60) continue;
    const fx = p.x + p.w * 0.42;
    if (fx > camX - 80 && fx < camX + W + 80) {
      const glowPulse = 0.38 + 0.25 * Math.sin(time * 2.2 + pIdx);
      const amberGlow = getColoredGlow('amber');
      if (amberGlow) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = glowPulse * 0.42;
        ctx.drawImage(amberGlow, fx - 44, p.y + 4, 88, 22);
        ctx.restore();
      }
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(7, 5, 8, 0.85)';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(fx - 26, p.y + 11);
      ctx.lineTo(fx - 9, p.y + 14);
      ctx.lineTo(fx + 8, p.y + 12);
      ctx.lineTo(fx + 27, p.y + 17);
      ctx.stroke();

      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(255, 114, 38, ${glowPulse})`;
      ctx.lineWidth = 1.1;
      ctx.stroke();
      ctx.restore();
    }
    if (pIdx % 3 === 1 && p.x + 68 > camX - 40 && p.x + 68 < camX + W + 40) {
      drawPlantedRelicSword(ctx, p.x + 68, p.y + 2, -0.14, 0.86, true);
    }
  }

  // 8. Hazards
  for (const h of room.hazards) {
    if (h.x + h.w < camX - 60 || h.x > camX + W + 60) continue;
    if (h.kind === 'spikes') {
      for (let x = h.x; x < h.x + h.w; x += 14) {
        ctx.fillStyle = '#47151c';
        ctx.beginPath();
        ctx.moveTo(x, h.y + 24);
        ctx.lineTo(x + 7, h.y);
        ctx.lineTo(x + 14, h.y + 24);
        ctx.fill();
        ctx.fillStyle = '#b83c4c';
        ctx.beginPath();
        ctx.moveTo(x + 7, h.y);
        ctx.lineTo(x + 10.5, h.y + 24);
        ctx.lineTo(x + 7, h.y + 24);
        ctx.fill();
      }
    } else if (h.kind === 'flamejet') {
      ctx.fillStyle = '#2e2226';
      ctx.fillRect(h.x, h.y + 6, h.w, 8);
      if (h.active) {
        ctx.fillStyle = 'rgba(235, 112, 42, 0.85)';
        ctx.fillRect(h.x + 3, h.y - 84, h.w - 6, 90);
        ctx.fillStyle = '#fff0a8';
        ctx.fillRect(h.x + 7, h.y - 68, h.w - 14, 74);
      } else if (h.timer > 2.2) {
        ctx.fillStyle = 'rgba(255, 130, 48, 0.85)';
        ctx.fillRect(h.x + 6, h.y + 2, h.w - 12, 4);
      }
    } else if (h.kind === 'pendulum' && h.pivotX !== undefined && h.pivotY !== undefined && h.length) {
      const ang = h.angle ?? 0;
      const bx = h.pivotX + Math.sin(ang) * h.length;
      const by = h.pivotY + Math.cos(ang) * h.length;
      ctx.save();
      // Anchor bracket & wrought iron chain
      ctx.fillStyle = '#332826';
      ctx.fillRect(h.pivotX - 7, h.pivotY - 4, 14, 8);
      ctx.strokeStyle = '#6c5a4a';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(h.pivotX, h.pivotY);
      ctx.lineTo(bx, by);
      ctx.stroke();

      // Crescent guillotine pendulum blade
      ctx.translate(bx, by);
      ctx.rotate(-ang);
      ctx.fillStyle = '#474f5c';
      ctx.beginPath();
      ctx.moveTo(-24, -4);
      ctx.quadraticCurveTo(0, 22, 24, -4);
      ctx.quadraticCurveTo(0, 6, -24, -4);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#d4dde8';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.fillStyle = '#8b2430';
      ctx.fillRect(-10, 4, 20, 2.5);
      ctx.restore();
    }
  }

  // 8b. Persistent Floor Blood Splatter Decals & Active Ground Ember Fissures
  if (st.blood && bloodIntensity !== 'off') {
    if (bloodIntensity === 'medium') ctx.save(), (ctx.globalAlpha = 0.6);
    renderBloodDecals(ctx, st.blood, room.platforms, camX, W);
    if (bloodIntensity === 'medium') ctx.restore();
  }
  if (st.vfx) {
    renderGroundFissuresVfx(ctx, st.vfx, camX, W, vfxQuality);
  }

  // 9. Props
  for (const pr of room.props) {
    if (pr.x + pr.w < camX - 100 || pr.x > camX + W + 100) continue;
    drawDetailedProp(ctx, pr, time);
  }

  // 9b. Dynamic Ground Contact Shadows (Anchor characters and bosses to the gothic architecture)
  for (const e of room.enemies) {
    if (e.x + e.w < camX - 120 || e.x > camX + W + 120 || e.state === 'dead') continue;
    drawCharacterGroundShadow(ctx, e.x, e.y, e.w, e.h, room, !!e.flying);
  }
  drawCharacterGroundShadow(ctx, player.x, player.y, player.w, player.h, room, false);

  // 10. Enemies & Bosses
  for (const e of room.enemies) {
    if (e.x + e.w < camX - 120 || e.x > camX + W + 120) continue;
    drawDetailedEnemy(ctx, e, time, showEnemyBars);
  }

  // 11. Luminous Projectiles
  for (const pr of room.projectiles) {
    if (pr.kind === 'eruption') {
      if (pr.telegraphT && pr.telegraphT > 0) {
        ctx.strokeStyle = '#ff5a36';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(pr.x, pr.y, pr.r, 8, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 1;
      } else {
        ctx.fillStyle = 'rgba(255, 110, 48, 0.85)';
        ctx.fillRect(pr.x - pr.r * 0.65, pr.y - 115, pr.r * 1.3, 115);
        ctx.fillStyle = '#fff0a8';
        ctx.fillRect(pr.x - pr.r * 0.25, pr.y - 105, pr.r * 0.5, 105);
      }
    } else if (pr.kind === 'crescent') {
      ctx.save();
      ctx.translate(pr.x, pr.y);
      ctx.rotate(Math.atan2(pr.vy, pr.vx));
      ctx.strokeStyle = pr.friendly ? '#ffd470' : '#ff4d63';
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.arc(0, 0, pr.r + 5, -1.1, 1.1);
      ctx.stroke();
      ctx.restore();
    } else {
      const pg = getColoredGlow(pr.friendly ? 'gold' : 'amber');
      if (pg) {
        ctx.globalAlpha = 0.72;
        ctx.drawImage(pg, pr.x - pr.r * 3.5, pr.y - pr.r * 3.5, pr.r * 7, pr.r * 7);
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = pr.friendly ? '#fff0b2' : pr.color;
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, pr.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 11b. Pilgrim Cinder Lantern Glow (Subtle warm radiant aura around protagonist)
  const pilgrimAura = getColoredGlow('amber');
  if (pilgrimAura) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const auraPulse = 0.22 + Math.sin(time * 3.2) * 0.04;
    ctx.globalAlpha = auraPulse;
    const auraR = 150;
    ctx.drawImage(
      pilgrimAura,
      Math.round(player.x + player.w * 0.5 - auraR),
      Math.round(player.y + player.h * 0.5 - auraR),
      auraR * 2,
      auraR * 2
    );
    ctx.restore();
  }

  // 12. Articulated Protagonist
  drawDetailedPlayer(
    ctx,
    player,
    st.weapon,
    !!(st.run && st.run.blessings.includes('orbital_wisp')),
    time,
    st.armorSkin || 'eclipse'
  );

  // 13. Shockwave Rings, Velocity-Aligned Sparks & Floating Texts
  for (const r of st.particles.rings) {
    if (!r.active) continue;
    ctx.globalAlpha = Math.max(0, r.life / r.maxLife);
    ctx.strokeStyle = r.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.lineWidth = 1;

  for (const pt of st.particles.particles) {
    if (!pt.active) continue;
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.strokeStyle = pt.color;
    ctx.lineWidth = Math.max(1.4, pt.size * 0.72);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
    ctx.lineTo(pt.x - pt.vx * 0.024, pt.y - pt.vy * 0.024);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.lineWidth = 1;

  if (st.vfx) {
    renderWorldVfx(ctx, st.vfx, camX, W, vfxQuality);
  }

  if (st.blood && bloodIntensity === 'high') {
    renderBloodDroplets(ctx, st.blood, camX, W);
  }

  ctx.textAlign = 'center';
  for (const ft of st.particles.texts) {
    if (!ft.active) continue;
    ctx.globalAlpha = Math.min(1, (ft.life / ft.maxLife) * 1.45);
    ctx.font = `700 ${Math.round(14 * ft.scale)}px "JetBrains Mono", monospace`;
    ctx.fillStyle = '#070609';
    ctx.fillText(ft.text, ft.x + 1.5, ft.y + 1.5);
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, ft.x, ft.y);
  }
  ctx.globalAlpha = 1;

  ctx.restore();

  // Plan 5: Foreground 1.32x Parallax Depth Silhouettes, Chains, Bokeh Embers & Combat Focus
  if (parallaxOn) {
    const hpRatio = st.run ? st.run.hp / Math.max(1, st.run.maxHp) : 1;
    const depthFocus = computeCombatDepthFocus(st.trauma * shakeMult, room.isBoss, hpRatio);
    renderForegroundParallax(ctx, b, W, H, camX, camY, time, st.trauma * shakeMult, depthFocus);
  }

  // 14b. Screen-space Directional Chromatic Combat Flash
  if (st.vfx && !st.settings?.reduceFlashes) {
    renderScreenVfx(ctx, st.vfx, W, H, vfxQuality);
  }

  // 15. Subtle Low-HP Pulse Vignette (standard vignette is pre-baked into backdrop)
  const isLowHp = !!(st.run && st.run.hp > 0 && st.run.hp / st.run.maxHp <= 0.28);
  if (isLowHp) {
    const vgSprite = getVignetteSprite(true);
    if (vgSprite) {
      ctx.globalAlpha = 0.75 + Math.sin(time * 5) * 0.22;
      ctx.drawImage(vgSprite, 0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  }

  // 15b. Cinematic Biome Atmospheric Color Grading & Ambient Vignette
  renderAtmosphericColorGrading(ctx, b, W, H);

  // Attack cues stay legible over particles, foreground fog, and color grading.
  ctx.save();
  ctx.translate(-Math.round(camX - sx), -Math.round(camY - sy));
  for (const enemy of room.enemies) {
    if (enemy.state !== 'windup' || enemy.x + enemy.w < camX - 120 || enemy.x > camX + W + 120) continue;
    drawAttackWarning(ctx, enemy, player, highContrast);
  }
  ctx.restore();

  // 16. Compact Corner Minimap
  if (st.phase === 'playing' && st.settings?.showMinimap !== false) {
    renderMinimap(ctx, W, H, room, player);
  }
}

/**
 * Projects a soft, dynamic ground contact shadow anchoring characters and enemies to the terrain.
 */
function drawCharacterGroundShadow(
  ctx: CanvasRenderingContext2D,
  charX: number,
  charY: number,
  charW: number,
  charH: number,
  room: RoomData,
  isFlying = false
): void {
  const feetX = charX + charW * 0.5;
  const feetY = charY + charH;
  let groundY = room.groundY;
  let minDiff = groundY - feetY;

  for (const p of room.platforms) {
    if (p.broken) continue;
    if (feetX >= p.x && feetX <= p.x + p.w) {
      const diff = p.y - feetY;
      if (diff >= -8 && diff < minDiff) {
        minDiff = diff;
        groundY = p.y;
      }
    }
  }

  const dist = Math.max(0, groundY - feetY);
  const maxDist = isFlying ? 280 : 180;
  if (dist > maxDist) return;

  const factor = 1 - dist / maxDist;
  const baseAlpha = isFlying ? 0.32 : 0.55;
  const shadowAlpha = baseAlpha * factor;
  const shadowW = Math.max(8, (charW * 0.88 + dist * 0.06) * factor);
  const shadowH = Math.max(2.5, charW * 0.24 * factor);

  ctx.save();
  ctx.fillStyle = `rgba(3, 2, 5, ${shadowAlpha.toFixed(3)})`;
  ctx.beginPath();
  ctx.ellipse(feetX, groundY + 1.2, shadowW * 0.5, shadowH * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Applies cinematic color grading tailored to the active biome to enhance chiaroscuro and atmospheric depth.
 */
function renderAtmosphericColorGrading(
  ctx: CanvasRenderingContext2D,
  biome: BiomeDef,
  W: number,
  H: number
): void {
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  if (biome.id === 'catacombes') {
    // Warm subterranean amber & embers
    ctx.fillStyle = 'rgba(255, 142, 48, 0.04)';
    ctx.fillRect(0, 0, W, H);
  } else if (biome.id === 'viaduc') {
    // Chill cobalt spectral mountain mist
    ctx.fillStyle = 'rgba(74, 118, 196, 0.05)';
    ctx.fillRect(0, 0, W, H);
  } else if (biome.id === 'fleche') {
    // Ominous dried-blood crimson twilight
    ctx.fillStyle = 'rgba(172, 38, 54, 0.05)';
    ctx.fillRect(0, 0, W, H);
  } else if (biome.id === 'sanctuaire') {
    // Luminous ethereal celestial gold
    ctx.fillStyle = 'rgba(255, 218, 98, 0.045)';
    ctx.fillRect(0, 0, W, H);
  }

  // Soft atmospheric corner vignette
  const vig = ctx.createRadialGradient(W * 0.5, H * 0.5, H * 0.42, W * 0.5, H * 0.5, W * 0.74);
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, 'rgba(5, 4, 8, 0.38)');
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

function renderTitleShowcase(ctx: CanvasRenderingContext2D, W: number, H: number, time: number): void {
  const groundY = Math.round(H * 0.78);

  // Textured cracked ashlar terrace with smoldering subterranean ember veins
  const stonePat = getStonePattern(ctx, BIOMES[0]);
  ctx.fillStyle = stonePat || '#151118';
  ctx.fillRect(0, groundY, W, H - groundY);

  const terraceGrad = ctx.createLinearGradient(0, groundY, 0, H);
  terraceGrad.addColorStop(0, 'rgba(7, 6, 9, 0.14)');
  terraceGrad.addColorStop(0.28, 'rgba(7, 6, 9, 0.56)');
  terraceGrad.addColorStop(1, 'rgba(6, 5, 8, 0.94)');
  ctx.fillStyle = terraceGrad;
  ctx.fillRect(0, groundY, W, H - groundY);

  // Carved stone cornice & brass frieze edge
  ctx.fillStyle = '#5c4635';
  ctx.fillRect(0, groundY, W, 6);
  ctx.fillStyle = 'rgba(255, 240, 212, 0.22)';
  ctx.fillRect(0, groundY, W, 1.8);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(0, groundY + 6, W, 4);

  // Smoldering charred ash crevices across right-half stone foreground
  const fissurePulse = 0.45 + 0.32 * Math.sin(time * 2.4);
  const emberPool = getColoredGlow('amber');
  for (const fx of [W * 0.54, W * 0.67, W * 0.82]) {
    if (emberPool) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = fissurePulse * 0.48;
      ctx.drawImage(emberPool, fx - 54, groundY + 14, 108, 34);
      ctx.restore();
    }
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(7, 5, 8, 0.88)';
    ctx.lineWidth = 3.8;
    ctx.beginPath();
    ctx.moveTo(fx - 38, groundY + 25);
    ctx.lineTo(fx - 10, groundY + 34);
    ctx.lineTo(fx + 14, groundY + 29);
    ctx.lineTo(fx + 42, groundY + 39);
    ctx.stroke();

    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(255, 112, 36, ${fissurePulse})`;
    ctx.lineWidth = 1.25;
    ctx.stroke();
    ctx.restore();
  }

  // Planted weathered swords in the ash flanking the showcase vigil
  drawPlantedRelicSword(ctx, Math.round(W * 0.54), groundY + 4, -0.22, 1.15, true);
  drawPlantedRelicSword(ctx, Math.round(W * 0.89), groundY + 6, 0.16, 1.25, true);

  // Ornate Wrought-Iron Sanctuary Brazier on right third with warm radial bloom
  const bx = Math.round(W * 0.79);
  const glow = getTorchGlow();
  if (glow) {
    ctx.globalAlpha = 0.92;
    ctx.drawImage(glow, bx - 220, groundY - 245, 440, 440);
    ctx.globalAlpha = 1;
  }

  // Contact shadow under brazier
  ctx.fillStyle = 'rgba(4, 3, 6, 0.65)';
  ctx.beginPath();
  ctx.ellipse(bx, groundY + 2, 34, 6.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Clawed wrought-iron pedestal & ribbed fire bowl
  ctx.fillStyle = '#1b1416';
  ctx.fillRect(bx - 16, groundY - 26, 6, 26);
  ctx.fillRect(bx + 10, groundY - 26, 6, 26);
  ctx.fillRect(bx - 4, groundY - 26, 8, 22);
  ctx.fillStyle = '#332826';
  ctx.beginPath();
  ctx.moveTo(bx - 27, groundY - 37);
  ctx.lineTo(bx + 27, groundY - 37);
  ctx.lineTo(bx + 19, groundY - 23);
  ctx.lineTo(bx - 19, groundY - 23);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#6c533f';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.lineWidth = 1;

  // Multi-tongue roaring flame & rising ember sparks
  const fl = Math.sin(time * 7.5) * 4.5;
  const fl2 = Math.cos(time * 9.2) * 3;
  ctx.fillStyle = '#b8351c';
  ctx.beginPath();
  ctx.moveTo(bx - 18, groundY - 37);
  ctx.quadraticCurveTo(bx - 8, groundY - 72, bx + fl, groundY - 94);
  ctx.quadraticCurveTo(bx + 11, groundY - 68, bx + 18, groundY - 37);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#ff8624';
  ctx.beginPath();
  ctx.moveTo(bx - 12, groundY - 37);
  ctx.quadraticCurveTo(bx - 2, groundY - 64, bx + fl * 0.65 + fl2 * 0.4, groundY - 78);
  ctx.quadraticCurveTo(bx + 8, groundY - 58, bx + 12, groundY - 37);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#fff3b8';
  ctx.beginPath();
  ctx.arc(bx, groundY - 45, 7.5, 0, Math.PI * 2);
  ctx.fill();

  for (let s = 0; s < 8; s++) {
    const sy = ((time * 32 + s * 17) % 86);
    const sx = bx + Math.sin(time * 3 + s * 1.9) * 24 - s * 5;
    ctx.globalAlpha = 1 - sy / 86;
    ctx.fillStyle = s % 2 === 0 ? '#ffd470' : '#ff7b29';
    ctx.fillRect(sx, groundY - 52 - sy, 2.4, 2.4);
  }
  ctx.globalAlpha = 1;

  // Monumental Crowned Eclipse Knight Showcase keeping vigil beneath the Solar Eclipse
  const px = Math.round(W * 0.65);
  const bob = Math.sin(time * 1.9) * 1.5;
  const cloakWave = Math.sin(time * 2.5) * 4;
  ctx.save();
  ctx.translate(px, groundY);
  ctx.scale(1.88, 1.88);

  // Warm rim glow behind hero
  if (glow) {
    ctx.globalAlpha = 0.36;
    ctx.drawImage(glow, -48, -68, 96, 96);
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = 'rgba(4, 3, 6, 0.68)';
  ctx.beginPath();
  ctx.ellipse(2, 1, 26, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Tattered Crimson-lined War Cloak billowing left
  ctx.fillStyle = '#47151e';
  ctx.beginPath();
  ctx.moveTo(-4, -37 + bob);
  ctx.quadraticCurveTo(-22, -23 + cloakWave * 0.4, -34, -2 + cloakWave * 0.3);
  ctx.lineTo(-22, -7);
  ctx.lineTo(-14, -1);
  ctx.lineTo(8, -2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#1b161d';
  ctx.beginPath();
  ctx.moveTo(-4, -38 + bob);
  ctx.quadraticCurveTo(-20, -25 + cloakWave * 0.4, -31, -6 + cloakWave * 0.3);
  ctx.lineTo(-19, -11);
  ctx.lineTo(-10, -4);
  ctx.lineTo(7, -4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#09070b';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Crimson shoulder scarf
  ctx.fillStyle = '#781d29';
  ctx.beginPath();
  ctx.moveTo(-3, -36 + bob);
  ctx.quadraticCurveTo(-18, -35, -30, -27 + cloakWave * 0.35);
  ctx.lineTo(-24, -22 + cloakWave * 0.35);
  ctx.quadraticCurveTo(-14, -30, 0, -31 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Greaves, Sabatons & Chainmail + Tattered Split Surcoat
  ctx.fillStyle = '#252831';
  ctx.fillRect(-7.5, -16, 5, 16);
  ctx.fillRect(2.5, -16, 5, 16);
  ctx.fillStyle = '#5a6070';
  ctx.fillRect(-7, -11, 4, 3);
  ctx.fillRect(3, -11, 4, 3);

  ctx.fillStyle = '#3b3f4a';
  ctx.fillRect(-8, -20, 16, 11);
  ctx.fillStyle = '#631b26';
  ctx.beginPath();
  ctx.moveTo(-4.5, -19);
  ctx.lineTo(4.5, -19);
  ctx.lineTo(5.5, -4);
  ctx.lineTo(1, -8);
  ctx.lineTo(-2, -3);
  ctx.lineTo(-5, -7);
  ctx.closePath();
  ctx.fill();

  // Engraved Eclipse Cuirass, Cross-Belt & Hip Pouch
  ctx.fillStyle = '#2c303a';
  ctx.beginPath();
  ctx.moveTo(-10.5, -15);
  ctx.lineTo(-9, -36 + bob);
  ctx.lineTo(9, -36 + bob);
  ctx.lineTo(10.5, -15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = '#c89b4b';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.arc(0, -27 + bob * 0.7, 4.4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = '#472f22';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-7, -35 + bob);
  ctx.lineTo(7.5, -20);
  ctx.stroke();
  ctx.fillStyle = '#38251a';
  ctx.fillRect(-10, -20, 20, 3);
  ctx.fillStyle = '#ffd470';
  ctx.fillRect(-2, -20.5, 4, 4);

  // Lamellar Shoulder Pauldrons catching warm brazier highlight
  for (const side of [-1, 1] as const) {
    ctx.fillStyle = side === 1 ? '#5e6675' : '#3d424e';
    ctx.beginPath();
    ctx.ellipse(side * 7.5, -33 + bob, 7.6, 5.2, side * -0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = side === 1 ? '#ffb86b' : '#120e16';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // Jagged Crowned Gothic Fluted Visor Helm
  ctx.fillStyle = '#383d48';
  ctx.beginPath();
  ctx.moveTo(-7.2, -48 + bob);
  ctx.lineTo(7.2, -48 + bob);
  ctx.lineTo(7.5, -38 + bob);
  ctx.lineTo(0, -33.5 + bob);
  ctx.lineTo(-7.5, -38 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#09070b';
  ctx.stroke();

  ctx.fillStyle = '#8b6f47';
  ctx.beginPath();
  ctx.moveTo(-7, -47 + bob);
  ctx.lineTo(-8, -54 + bob);
  ctx.lineTo(-3.5, -49.5 + bob);
  ctx.lineTo(0, -56.5 + bob);
  ctx.lineTo(3.5, -49.5 + bob);
  ctx.lineTo(8, -54 + bob);
  ctx.lineTo(7, -47 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Breather Grille & Fierce Molten Ember Eyes
  ctx.strokeStyle = '#100c14';
  ctx.lineWidth = 0.9;
  for (let gx = -3; gx <= 3; gx += 2) {
    ctx.beginPath();
    ctx.moveTo(gx, -40 + bob);
    ctx.lineTo(gx * 0.8, -35.5 + bob);
    ctx.stroke();
  }
  ctx.fillStyle = '#0d090e';
  ctx.fillRect(-4.5, -43.8 + bob, 9.5, 2.6);
  ctx.fillStyle = '#ff6a1f';
  ctx.fillRect(-3.6, -43.4 + bob, 3, 1.8);
  ctx.fillRect(1.2, -43.4 + bob, 3.2, 1.8);
  ctx.fillStyle = '#fff0a8';
  ctx.fillRect(2, -43.1 + bob, 1.4, 1.1);

  // Runic Bastard Sword held diagonally toward the ember-cracked ground
  ctx.save();
  ctx.translate(10, -24 + bob);
  ctx.rotate(1.16);
  drawWeaponSprite(ctx, 'clay_blade', 0.96);
  ctx.restore();
  ctx.restore();
}

function renderTitleArtworkBackdrop(
  ctx: CanvasRenderingContext2D,
  art: HTMLImageElement,
  biome: typeof BIOMES[number],
  W: number,
  H: number,
  time: number,
  fogQuality: 'off' | 'medium' | 'high'
): void {
  ctx.fillStyle = '#070509';
  ctx.fillRect(0, 0, W, H);

  // Scale image slightly wider to allow smooth right-shift framing (Knight occupies right 62%, UI sits clearly on left 38%)
  const coverScale = Math.max((W * 1.16) / art.naturalWidth, H / art.naturalHeight);
  const dw = art.naturalWidth * coverScale;
  const dh = art.naturalHeight * coverScale;
  const panX = Math.sin(time * 0.25) * 6;
  const dx = Math.round(W - dw + dw * 0.045 + panX);
  const dy = Math.round((H - dh) * 0.38);

  ctx.drawImage(art, dx, dy, dw, dh);

  // Subtle top/bottom vignette & left-third dark-plum reading scrim protecting title typography & controls
  const leftScrim = ctx.createLinearGradient(0, 0, W * 0.62, 0);
  leftScrim.addColorStop(0, 'rgba(7, 5, 10, 0.94)');
  leftScrim.addColorStop(0.46, 'rgba(8, 6, 12, 0.78)');
  leftScrim.addColorStop(0.76, 'rgba(9, 7, 13, 0.32)');
  leftScrim.addColorStop(1, 'rgba(9, 7, 13, 0)');
  ctx.fillStyle = leftScrim;
  ctx.fillRect(0, 0, W, H);

  const bottomScrim = ctx.createLinearGradient(0, H * 0.72, 0, H);
  bottomScrim.addColorStop(0, 'rgba(7, 5, 10, 0)');
  bottomScrim.addColorStop(1, 'rgba(7, 5, 10, 0.76)');
  ctx.fillStyle = bottomScrim;
  ctx.fillRect(0, H * 0.72, W, H * 0.28);

  // Live additive Solar Eclipse corona pulse aligned to the painted Eclipse in the 2K concept art
  const eclipseX = dx + dw * 0.635;
  const eclipseY = dy + dh * 0.255;
  const corona = getCoronaSprite();
  if (corona) {
    const pulse = 1 + Math.sin(time * 1.8) * 0.06;
    const rad = dw * 0.145 * pulse;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.42 + Math.sin(time * 2.2) * 0.08;
    ctx.drawImage(corona, eclipseX - rad, eclipseY - rad, rad * 2, rad * 2);
    ctx.restore();
  }

  // Flickering additive ember bloom along the painted runic sword & cracked ash foreground
  const amber = getColoredGlow('amber');
  if (amber) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const swordX = dx + dw * 0.31;
    const swordY = dy + dh * 0.71;
    const flick = 0.22 + Math.sin(time * 5.2) * 0.07;
    ctx.globalAlpha = flick;
    ctx.drawImage(amber, swordX - 90, swordY - 90, 180, 180);
    ctx.restore();
  }

  // Live drifting volumetric mist & glowing rising ember particles across the painted ruin terrace
  renderMidAtmosphereAndDust(ctx, biome, W, H, time * 14, 0, time, true, fogQuality);
}

function renderMinimap(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  room: RoomData,
  player: Player
): void {
  const mw = 168;
  const mh = 52;
  const mx = W - mw - 20;
  const my = H - mh - 18;
  const scaleX = mw / room.width;
  const scaleY = mh / room.height;

  ctx.fillStyle = 'rgba(10, 8, 13, 0.84)';
  ctx.fillRect(mx, my, mw, mh);
  ctx.strokeStyle = '#5c4936';
  ctx.strokeRect(mx, my, mw, mh);

  ctx.fillStyle = '#4b3f48';
  for (const p of room.platforms) {
    if (p.broken) continue;
    ctx.fillRect(mx + p.x * scaleX, my + p.y * scaleY, Math.max(2, p.w * scaleX), 2);
  }

  for (const pr of room.props) {
    if (pr.opened || pr.used || pr.broken) continue;
    ctx.fillStyle =
      pr.type === 'exit'
        ? pr.locked
          ? '#6e5a42'
          : '#ffd470'
        : pr.type === 'npc'
        ? '#5db87a'
        : '#8ab8e6';
    ctx.fillRect(mx + pr.x * scaleX - 1, my + pr.y * scaleY - 3, 3, 3);
  }

  for (const e of room.enemies) {
    if (e.hp <= 0 || e.state === 'dead') continue;
    ctx.fillStyle = e.isBoss ? '#ffd470' : e.elite !== 'none' ? '#ff9d42' : '#c4303e';
    ctx.fillRect(mx + e.x * scaleX - 1, my + e.y * scaleY - 2, e.isBoss ? 4.5 : 2.5, e.isBoss ? 4.5 : 2.5);
  }

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(mx + player.x * scaleX - 1.5, my + player.y * scaleY - 3, 3.5, 4);
}
