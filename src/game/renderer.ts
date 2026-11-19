import {
  drawDetailedEnemy,
  drawDetailedPlayer,
  drawDetailedProp,
  drawWeaponSprite,
  getTorchGlow,
} from './artSprites';
import { BIOMES } from './data';
import type { ParticlePool } from './particles';
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
let vignetteCanvas: HTMLCanvasElement | null = null;
let lowHpVignetteCanvas: HTMLCanvasElement | null = null;

function getCoronaSprite(): HTMLCanvasElement | null {
  if (coronaCanvas || typeof document === 'undefined') return coronaCanvas;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const gctx = c.getContext('2d');
  if (!gctx) return null;
  const g = gctx.createRadialGradient(128, 128, 22, 128, 128, 128);
  g.addColorStop(0, 'rgba(255, 174, 82, 0.62)');
  g.addColorStop(0.35, 'rgba(224, 107, 43, 0.24)');
  g.addColorStop(0.7, 'rgba(168, 40, 53, 0.08)');
  g.addColorStop(1, 'rgba(0, 0, 0, 0)');
  gctx.fillStyle = g;
  gctx.fillRect(0, 0, 256, 256);
  coronaCanvas = c;
  return coronaCanvas;
}

function getVignetteSprite(lowHp: boolean): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  if (!lowHp && vignetteCanvas) return vignetteCanvas;
  if (lowHp && lowHpVignetteCanvas) return lowHpVignetteCanvas;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const gctx = c.getContext('2d');
  if (!gctx) return null;
  const g = gctx.createRadialGradient(128, 128, 60, 128, 128, 155);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, lowHp ? 'rgba(148, 22, 34, 0.48)' : 'rgba(4, 3, 6, 0.44)');
  gctx.fillStyle = g;
  gctx.fillRect(0, 0, 256, 256);
  if (lowHp) lowHpVignetteCanvas = c;
  else vignetteCanvas = c;
  return c;
}

let cachedSkyCanvas: HTMLCanvasElement | null = null;
let cachedSkyKey = '';

function getSkyMistCanvas(
  W: number,
  H: number,
  biomeId: string,
  skyTop: string,
  skyBot: string,
  fogColor: string
): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const key = `${biomeId}|${W}|${H}`;
  if (cachedSkyCanvas && cachedSkyKey === key) return cachedSkyCanvas;
  const c = cachedSkyCanvas || document.createElement('canvas');
  c.width = W;
  c.height = H;
  const gctx = c.getContext('2d');
  if (!gctx) return null;

  const grad = gctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, skyTop);
  grad.addColorStop(0.65, skyBot);
  grad.addColorStop(1, '#09070b');
  gctx.fillStyle = grad;
  gctx.fillRect(0, 0, W, H);

  const mistGrad = gctx.createLinearGradient(0, H * 0.56, 0, H);
  mistGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  mistGrad.addColorStop(0.55, fogColor);
  mistGrad.addColorStop(1, 'rgba(7, 6, 9, 0.35)');
  gctx.fillStyle = mistGrad;
  gctx.fillRect(0, H * 0.56, W, H * 0.44);

  cachedSkyCanvas = c;
  cachedSkyKey = key;
  return cachedSkyCanvas;
}

export function renderGameFrame(ctx: CanvasRenderingContext2D, st: RenderContextState): void {
  const { width: W, height: H, time } = st;
  const isTitle = st.phase === 'title';
  const camX = isTitle ? Math.sin(time * 0.14) * 110 + 180 : st.cameraX;
  const camY = isTitle ? 120 : st.cameraY;
  const b = st.room ? st.room.biome : BIOMES[0];

  // 1. Pre-baked Sky & Horizon Mist
  const skySprite = getSkyMistCanvas(W, H, b.id, b.skyTop, b.skyBot, b.fogColor);
  if (skySprite) {
    ctx.drawImage(skySprite, 0, 0);
  } else {
    ctx.fillStyle = b.skyTop;
    ctx.fillRect(0, 0, W, H);
  }

  // Faint celestial dust stars in upper sky
  ctx.fillStyle = 'rgba(232, 225, 213, 0.22)';
  for (let i = 0; i < 32; i++) {
    const sx = ((i * 137 - camX * 0.02) % W + W) % W;
    const sy = (i * 43) % (H * 0.45);
    ctx.fillRect(sx, sy, 1.5, 1.5);
  }

  // 2. Brass Eclipse + Sunburst Rays + Concentric Astrolabe Rings
  const ex = W * 0.72 - camX * (isTitle ? 0.05 : 0.035);
  const ey = H * 0.25;
  const pulse = 1 + Math.sin(time * 1.4) * 0.04;

  const coronaSprite = getCoronaSprite();
  const cRad = 210 * pulse;
  if (coronaSprite) {
    ctx.drawImage(coronaSprite, ex - cRad, ey - cRad, cRad * 2, cRad * 2);
  }

  // Rotating astrolabe arcs
  ctx.strokeStyle = 'rgba(212, 168, 83, 0.18)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(ex, ey, 72, time * 0.18, time * 0.18 + Math.PI * 1.35);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(ex, ey, 94, -time * 0.12, -time * 0.12 + Math.PI * 0.85);
  ctx.stroke();

  // Eclipse Core & Rim
  ctx.fillStyle = '#070609';
  ctx.beginPath();
  ctx.arc(ex, ey, 48, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = b.accentColor;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.lineWidth = 1;

  // 3. Distant Ruined Cathedral Skyline & Rose Windows (Parallax Layer 1)
  for (let i = -1; i < 9; i++) {
    const px = ((i * 280 - camX * 0.12) % (W + 560)) - 140;
    const spireH = 260 + ((i * 67) % 110);
    ctx.fillStyle = 'rgba(13, 10, 17, 0.72)';
    ctx.fillRect(px, H - spireH, 48, spireH);
    ctx.fillRect(px + 48, H - spireH * 0.68, 120, spireH * 0.68);
    ctx.beginPath();
    ctx.moveTo(px - 6, H - spireH);
    ctx.lineTo(px + 24, H - spireH - 58);
    ctx.lineTo(px + 54, H - spireH);
    ctx.closePath();
    ctx.fill();

    if (i % 2 === 0) {
      ctx.strokeStyle = 'rgba(212, 168, 83, 0.14)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(px + 108, H - spireH * 0.52, 22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(px + 108, H - spireH * 0.52, 11, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
  }

  // 4. Midground Gothic Colonnade, Ribbed Vaults & Swaying Chains (Parallax Layer 2)
  for (let i = -1; i < 8; i++) {
    const px = ((i * 340 - camX * 0.25) % (W + 680)) - 160;
    if (isTitle && px < W * 0.48) continue; // Keep left negative space calm on Title Screen
    ctx.fillStyle = 'rgba(14, 11, 18, 0.68)';
    ctx.fillRect(px, 40, 44, H);
    ctx.fillRect(px - 10, 40, 64, 16);
    ctx.fillRect(px - 6, 62, 56, 8);

    ctx.strokeStyle = 'rgba(74, 59, 44, 0.24)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(px + 170, 150, 145, Math.PI, Math.PI * 1.48);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(px + 170, 150, 145, Math.PI * 1.52, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;

    if (i % 2 === 0) {
      const sway = Math.sin(time * 1.1 + i) * 5;
      const chainLen = 190 + (i % 3) * 40;
      ctx.strokeStyle = 'rgba(130, 116, 102, 0.26)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px + 170, 0);
      ctx.lineTo(px + 170 + sway, chainLen);
      ctx.stroke();
      ctx.lineWidth = 1;
      ctx.fillStyle = 'rgba(224, 107, 43, 0.42)';
      ctx.beginPath();
      ctx.arc(px + 170 + sway, chainLen + 4, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 5. Drifting Atmospheric Embers
  ctx.fillStyle = 'rgba(245, 198, 130, 0.38)';
  for (let i = 0; i < 28; i++) {
    const mx = ((i * 97 + time * (14 + (i % 5) * 3)) % (W + 40)) - 20;
    const my = ((i * 61 - time * (20 + (i % 4) * 5)) % H + H) % H;
    const sz = i % 4 === 0 ? 2.8 : 1.5;
    ctx.fillRect(mx, my, sz, sz);
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

  // 6. Torches & Pre-Baked Smooth Radial Light
  const glowSprite = getTorchGlow();
  for (const t of room.torches) {
    if (t.x < camX - 180 || t.x > camX + W + 180) continue;
    const flick = 1 + Math.sin(time * 9 + t.x) * 0.08;
    const r = 126 * flick;
    if (glowSprite) {
      ctx.drawImage(glowSprite, t.x - r, t.y - r, r * 2, r * 2);
    }

    // Iron wall sconce
    ctx.fillStyle = '#3b2e26';
    ctx.fillRect(t.x - 3, t.y, 6, 18);
    ctx.fillStyle = '#614d3d';
    ctx.fillRect(t.x - 6, t.y, 12, 3);
    // Flame tongue
    ctx.fillStyle = '#e06b2b';
    ctx.beginPath();
    ctx.moveTo(t.x - 5, t.y);
    ctx.lineTo(t.x + Math.sin(time * 14 + t.x) * 2.5, t.y - 14 * flick);
    ctx.lineTo(t.x + 5, t.y);
    ctx.fill();
    ctx.fillStyle = '#ffd470';
    ctx.beginPath();
    ctx.arc(t.x, t.y - 3.5, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // 7. Sculpted Stone Platforms & Bridges
  for (const p of room.platforms) {
    if (p.x + p.w < camX - 60 || p.x > camX + W + 60) continue;
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
      ctx.fillStyle = 'rgba(255, 180, 90, 0.6)';
      ctx.fillRect(p.x + p.w * 0.25, glowY, p.w * 0.5, 3);
    } else {
      ctx.fillStyle = b.stone;
      ctx.fillRect(p.x, p.y, p.w, p.h);

      if (p.type === 'solid') {
        // Staggered stone masonry courses
        ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
        for (let row = 0; row < 4; row++) {
          const ry = p.y + 12 + row * 28;
          if (ry > p.y + p.h) break;
          ctx.fillRect(p.x, ry, p.w, 2);
          const offset = (row % 2) * 26;
          for (let bx = p.x + 24 + offset; bx < p.x + p.w - 10; bx += 52) {
            ctx.fillRect(bx, ry, 2, 28);
          }
        }
        // Subtle bevel highlight beneath top capstone
        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.fillRect(p.x, p.y + 6, p.w, 3);
      } else {
        // Iron support brackets under one-way/moving platforms
        ctx.fillStyle = '#1b161e';
        ctx.fillRect(p.x + 12, p.y + p.h, 8, 8);
        ctx.fillRect(p.x + p.w - 20, p.y + p.h, 8, 8);
      }

      // Capstone trim
      ctx.fillStyle =
        p.type === 'crumble'
          ? '#96583a'
          : p.type === 'moving'
          ? '#d4a853'
          : b.trim;
      ctx.fillRect(p.x, p.y, p.w, 6);
    }
    ctx.globalAlpha = 1;
  }

  // 8. Hazards
  for (const h of room.hazards) {
    if (h.x + h.w < camX - 60 || h.x > camX + W + 60) continue;
    if (h.kind === 'spikes') {
      ctx.fillStyle = '#5e1a22';
      for (let x = h.x; x < h.x + h.w; x += 14) {
        ctx.beginPath();
        ctx.moveTo(x, h.y + 24);
        ctx.lineTo(x + 7, h.y);
        ctx.lineTo(x + 14, h.y + 24);
        ctx.fill();
        ctx.fillStyle = '#a83442';
        ctx.beginPath();
        ctx.moveTo(x + 7, h.y);
        ctx.lineTo(x + 11, h.y + 24);
        ctx.lineTo(x + 7, h.y + 24);
        ctx.fill();
        ctx.fillStyle = '#5e1a22';
      }
    } else if (h.kind === 'flamejet') {
      ctx.fillStyle = '#2e2226';
      ctx.fillRect(h.x, h.y + 6, h.w, 8);
      if (h.active) {
        const fGrad = ctx.createLinearGradient(h.x, h.y - 82, h.x, h.y + 6);
        fGrad.addColorStop(0, 'rgba(255, 190, 80, 0)');
        fGrad.addColorStop(0.5, 'rgba(224, 107, 43, 0.88)');
        fGrad.addColorStop(1, '#ffd470');
        ctx.fillStyle = fGrad;
        ctx.fillRect(h.x + 4, h.y - 82, h.w - 8, 88);
      } else if (h.timer > 2.2) {
        ctx.fillStyle = 'rgba(255, 120, 40, 0.78)';
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

  // 11. Projectiles
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
        ctx.fillStyle = '#ffd470';
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
      ctx.fillStyle = pr.friendly ? 'rgba(255, 212, 112, 0.35)' : 'rgba(224, 107, 43, 0.35)';
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, pr.r * 1.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = pr.friendly ? '#ffd470' : pr.color;
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

  // 13. Shockwave Rings, Particles & Floating Texts
  for (const r of st.particles.rings) {
    if (!r.active) continue;
    ctx.globalAlpha = Math.max(0, r.life / r.maxLife);
    ctx.strokeStyle = r.color;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.lineWidth = 1;
  ctx.globalAlpha = 1;

  for (const pt of st.particles.particles) {
    if (!pt.active) continue;
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x, pt.y, pt.size, pt.size);
  }
  ctx.globalAlpha = 1;

  ctx.textAlign = 'center';
  for (const ft of st.particles.texts) {
    if (!ft.active) continue;
    ctx.globalAlpha = Math.min(1, (ft.life / ft.maxLife) * 1.45);
    ctx.font = `700 ${Math.round(14 * ft.scale)}px "JetBrains Mono", monospace`;
    ctx.fillStyle = '#070609';
    ctx.fillText(ft.text, ft.x + 1, ft.y + 1);
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, ft.x, ft.y);
  }
  ctx.globalAlpha = 1;

  ctx.restore();

  // 14. Subtle Cinematic Edge Vignette + Low-HP Pulse
  const isLowHp = !!(st.run && st.run.hp > 0 && st.run.hp / st.run.maxHp <= 0.28);
  const vgSprite = getVignetteSprite(isLowHp);
  if (vgSprite) {
    if (isLowHp) ctx.globalAlpha = 0.75 + Math.sin(time * 5) * 0.22;
    ctx.drawImage(vgSprite, 0, 0, W, H);
    ctx.globalAlpha = 1;
  }

  // 15. Compact Corner Minimap
  if (st.phase === 'playing') {
    renderMinimap(ctx, W, H, room, player);
  }
}

function renderTitleShowcase(ctx: CanvasRenderingContext2D, W: number, H: number, time: number): void {
  const groundY = H * 0.78;

  // Stone terrace with carved masonry
  ctx.fillStyle = '#151118';
  ctx.fillRect(0, groundY, W, H - groundY);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
  for (let row = 0; row < 4; row++) {
    ctx.fillRect(0, groundY + 14 + row * 28, W, 2);
  }
  ctx.fillStyle = '#5c4635';
  ctx.fillRect(0, groundY, W, 6);

  // Brazier on right third
  const bx = W * 0.72;
  const glow = getTorchGlow();
  if (glow) {
    ctx.drawImage(glow, bx - 160, groundY - 190, 320, 320);
  }

  ctx.fillStyle = '#2d2421';
  ctx.fillRect(bx - 16, groundY - 22, 32, 22);
  ctx.fillStyle = '#473a34';
  ctx.fillRect(bx - 22, groundY - 26, 44, 6);

  const fl = Math.sin(time * 8) * 3.5;
  ctx.fillStyle = '#e06b2b';
  ctx.beginPath();
  ctx.moveTo(bx - 12, groundY - 26);
  ctx.lineTo(bx + fl, groundY - 64);
  ctx.lineTo(bx + 12, groundY - 26);
  ctx.fill();
  ctx.fillStyle = '#ffd470';
  ctx.beginPath();
  ctx.arc(bx, groundY - 34, 6, 0, Math.PI * 2);
  ctx.fill();

  // Detailed resting Éveillé d'Argile beside the brazier
  const px = bx - 68;
  const py = groundY - 46 + Math.sin(time * 2) * 1.2;
  ctx.save();
  ctx.translate(px + 14, groundY);
  // Cloak & scarf
  ctx.fillStyle = '#261b22';
  ctx.beginPath();
  ctx.moveTo(-4, -36);
  ctx.lineTo(-22, -2);
  ctx.lineTo(8, -2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#9c2634';
  ctx.fillRect(-16, -33, 18, 4);
  // Tunic & bronze belt
  ctx.fillStyle = '#3d2c34';
  ctx.fillRect(-10, -34 + (py - (groundY - 46)), 20, 34);
  ctx.fillStyle = '#d4a853';
  ctx.fillRect(-10, -18, 20, 2.5);
  // Porcelain mask
  ctx.fillStyle = '#e4dac8';
  ctx.fillRect(-7, -46 + (py - (groundY - 46)), 14, 13);
  ctx.fillStyle = '#ff7b29';
  ctx.fillRect(2, -41 + (py - (groundY - 46)), 4, 3);
  // Clay Blade planted in stone
  ctx.save();
  ctx.translate(28, -32);
  ctx.rotate(Math.PI / 2);
  drawWeaponSprite(ctx, 'clay_blade', 1.15);
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

  ctx.fillStyle = 'rgba(10, 8, 13, 0.8)';
  ctx.fillRect(mx, my, mw, mh);
  ctx.strokeStyle = '#4a3b2c';
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
