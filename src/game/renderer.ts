import {
  drawDetailedEnemy,
  drawDetailedPlayer,
  drawDetailedProp,
  drawWeaponSprite,
  getTorchGlow,
} from './artSprites';
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
} from './textures';
import type { Player, RoomData, RunState, WeaponKey } from './types';

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
  particles: ParticlePool;
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
  const camX = isTitle ? Math.sin(time * 0.14) * 90 + 160 : st.cameraX;
  const camY = isTitle ? 120 : st.cameraY;
  const b = st.room ? st.room.biome : BIOMES[0];

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

  // Celestial Brass Eclipse + Additive Corona + Engraved Astrolabe Rings (0.03x H & 0.015x V)
  const ex = W * 0.74 - (isTitle ? camX * 0.04 : skyOff.offsetX);
  const ey = H * 0.24 - (isTitle ? 0 : skyOff.offsetY);
  const pulse = 1 + Math.sin(time * 1.4) * 0.04;
  const coronaSprite = getCoronaSprite();
  const cRad = 225 * pulse;
  if (coronaSprite) {
    ctx.globalAlpha = 0.82;
    ctx.drawImage(coronaSprite, Math.round(ex - cRad), Math.round(ey - cRad), Math.round(cRad * 2), Math.round(cRad * 2));
    ctx.globalAlpha = 1;
  }

  ctx.strokeStyle = 'rgba(212, 168, 83, 0.24)';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.arc(ex, ey, 72, time * 0.18, time * 0.18 + Math.PI * 1.38);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(ex, ey, 96, -time * 0.12, -time * 0.12 + Math.PI * 0.88);
  ctx.stroke();

  // Eclipse Core & Molten Rim
  ctx.fillStyle = '#060508';
  ctx.beginPath();
  ctx.arc(ex, ey, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = b.accentColor;
  ctx.lineWidth = 2.6;
  ctx.stroke();
  ctx.lineWidth = 1;

  // Plan 1 & 2: Distant Gothic Horizon Silhouettes (0.14x) + Drifting Low Mist (0.24x)
  renderDeepParallaxLayers(ctx, b, W, H, camX, isTitle ? 0 : camY, time, st.trauma);

  // Plan 3: Midground Gothic Colonnade (0.42x H & 0.18x V for clear 2.5D separation)
  const midTileW = 540;
  const midOff = computeParallaxOffset(
    camX,
    isTitle ? 0 : camY,
    time,
    PARALLAX_LAYERS.midground,
    midTileW,
    st.trauma
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

  // Drifting Atmospheric Embers anchored at 0.35x parallax depth
  for (let i = 0; i < 24; i++) {
    const mx = (((i * 97 - camX * 0.35 + time * (15 + (i % 5) * 3)) % (W + 40)) + (W + 40)) % (W + 40) - 20;
    const my = (((i * 61 - camY * 0.18 - time * (21 + (i % 4) * 5)) % H) + H) % H;
    const sz = i % 4 === 0 ? 2.4 : 1.4;
    ctx.fillStyle = i % 3 === 0 ? 'rgba(255, 206, 120, 0.65)' : 'rgba(235, 130, 62, 0.5)';
    ctx.beginPath();
    ctx.arc(mx, my, sz, 0, Math.PI * 2);
    ctx.fill();
  }

  // Title Screen Vignette Showcase
  if (isTitle) {
    renderTitleShowcase(ctx, W, H, time);
    return;
  }

  if (!st.room || !st.player) return;
  const { room, player } = st;

  ctx.save();
  const shakePower = st.trauma * st.trauma * 18;
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
    }
    ctx.globalAlpha = 1;
  }

  // Warm torchlight reflection pools along the main floor edge
  ctx.fillStyle = 'rgba(255, 148, 62, 0.12)';
  for (const t of room.torches) {
    if (t.x < camX - 100 || t.x > camX + W + 100) continue;
    if (Math.abs(room.groundY - t.y) < 150) {
      ctx.beginPath();
      ctx.ellipse(t.x, room.groundY + 2, 54, 5, 0, 0, Math.PI * 2);
      ctx.fill();
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
    }
  }

  // 9. Props
  for (const pr of room.props) {
    if (pr.x + pr.w < camX - 100 || pr.x > camX + W + 100) continue;
    drawDetailedProp(ctx, pr, time);
  }

  // 10. Enemies & Bosses
  for (const e of room.enemies) {
    if (e.x + e.w < camX - 120 || e.x > camX + W + 120) continue;
    drawDetailedEnemy(ctx, e, player, time);
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

  // 12. Articulated Protagonist
  drawDetailedPlayer(
    ctx,
    player,
    st.weapon,
    !!(st.run && st.run.blessings.includes('orbital_wisp')),
    time
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
  const hpRatio = st.run ? st.run.hp / Math.max(1, st.run.maxHp) : 1;
  const depthFocus = computeCombatDepthFocus(st.trauma, room.isBoss, hpRatio);
  renderForegroundParallax(ctx, b, W, H, camX, camY, time, st.trauma, depthFocus);

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

  // 16. Compact Corner Minimap
  if (st.phase === 'playing') {
    renderMinimap(ctx, W, H, room, player);
  }
}

function renderTitleShowcase(ctx: CanvasRenderingContext2D, W: number, H: number, time: number): void {
  const groundY = Math.round(H * 0.78);

  // Textured ashlar terrace with deep velvet fade at bottom for clean control-hint readability
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

  // Ornate Wrought-Iron Sanctuary Brazier on right third with warm radial bloom
  const bx = Math.round(W * 0.72);
  const glow = getTorchGlow();
  if (glow) {
    ctx.globalAlpha = 0.92;
    ctx.drawImage(glow, bx - 210, groundY - 235, 420, 420);
    ctx.globalAlpha = 1;
  }

  // Contact shadow under brazier
  ctx.fillStyle = 'rgba(4, 3, 6, 0.65)';
  ctx.beginPath();
  ctx.ellipse(bx, groundY + 2, 34, 6.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Clawed wrought-iron pedestal & ribbed fire bowl (1.35x monumental scale)
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

  for (let s = 0; s < 5; s++) {
    const sy = ((time * 28 + s * 19) % 58);
    const sx = bx + Math.sin(time * 3 + s * 1.9) * 14;
    ctx.globalAlpha = 1 - sy / 58;
    ctx.fillStyle = s % 2 === 0 ? '#ffd470' : '#ff8c3b';
    ctx.fillRect(sx, groundY - 52 - sy, 2.2, 2.2);
  }
  ctx.globalAlpha = 1;

  // Articulated 1.35x Scale Resting Éveillé d'Argile keeping vigil beside the brazier
  const px = bx - 88;
  const bob = Math.sin(time * 2) * 1.4;
  ctx.save();
  ctx.translate(px, groundY);
  ctx.scale(1.32, 1.32);

  ctx.fillStyle = 'rgba(4, 3, 6, 0.62)';
  ctx.beginPath();
  ctx.ellipse(2, 1, 24, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  // Multi-fold Cloak + Crimson Lining + Wind-swept Scarf
  ctx.fillStyle = '#4a1720';
  ctx.beginPath();
  ctx.moveTo(-4, -36);
  ctx.quadraticCurveTo(-19, -22, -28, -2);
  ctx.lineTo(8, -2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#201720';
  ctx.beginPath();
  ctx.moveTo(-4, -37);
  ctx.quadraticCurveTo(-17, -24, -24, -4);
  ctx.lineTo(6, -4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#0a070c';
  ctx.lineWidth = 1.1;
  ctx.stroke();

  ctx.fillStyle = '#9c2634';
  ctx.beginPath();
  ctx.moveTo(-2, -35 + bob);
  ctx.quadraticCurveTo(-16, -34, -26, -26 + Math.sin(time * 2.4) * 2.2);
  ctx.lineTo(-22, -23 + Math.sin(time * 2.4) * 2.2);
  ctx.quadraticCurveTo(-13, -30, 0, -31 + bob);
  ctx.closePath();
  ctx.fill();

  // Tunic, Engraved Brass Belt, Pauldron with Warm Fire Rim-Light
  ctx.fillStyle = '#382830';
  ctx.beginPath();
  ctx.moveTo(-10, -2);
  ctx.lineTo(-8.5, -34 + bob);
  ctx.lineTo(8.5, -34 + bob);
  ctx.lineTo(10, -2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#d4a853';
  ctx.fillRect(-9.5, -18, 19, 2.5);
  ctx.fillStyle = '#6c7380';
  ctx.beginPath();
  ctx.ellipse(6, -32 + bob, 7.5, 4.8, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffb86b';
  ctx.lineWidth = 1.1;
  ctx.stroke();

  // Sculpted Hood & Beveled Porcelain Mask catching Brazier Glow
  ctx.fillStyle = '#1b131a';
  ctx.beginPath();
  ctx.arc(0, -40 + bob, 9.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e8decb';
  ctx.beginPath();
  ctx.moveTo(-6.5, -46 + bob);
  ctx.lineTo(6.5, -46 + bob);
  ctx.lineTo(6, -36 + bob);
  ctx.lineTo(0, -32 + bob);
  ctx.lineTo(-6, -36 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 148, 68, 0.24)';
  ctx.beginPath();
  ctx.moveTo(0, -46 + bob);
  ctx.lineTo(6.5, -46 + bob);
  ctx.lineTo(6, -36 + bob);
  ctx.lineTo(0, -32 + bob);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#ff7b29';
  ctx.fillRect(1.5, -42 + bob, 4, 2.6);
  ctx.fillStyle = '#fff0a8';
  ctx.fillRect(2.5, -41.5 + bob, 2, 1.4);

  // Vigil Greatsword planted at a slight forward tilt beside the hero
  ctx.save();
  ctx.translate(22, -32);
  ctx.rotate(Math.PI / 2 - 0.08);
  drawWeaponSprite(ctx, 'clay_blade', 0.88);
  ctx.restore();
  ctx.restore();
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
    ctx.fillStyle = pr.type === 'exit' ? '#ffd470' : '#8ab8e6';
    ctx.fillRect(mx + pr.x * scaleX - 1, my + pr.y * scaleY - 3, 3, 3);
  }

  ctx.fillStyle = '#c4303e';
  for (const e of room.enemies) {
    if (e.hp <= 0 || e.state === 'dead') continue;
    ctx.fillRect(mx + e.x * scaleX - 1, my + e.y * scaleY - 2, e.isBoss ? 4 : 2.5, e.isBoss ? 4 : 2.5);
  }

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(mx + player.x * scaleX - 1.5, my + player.y * scaleY - 3, 3.5, 4);
}
