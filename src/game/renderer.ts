import { BIOMES } from './data';
import type { ParticlePool } from './particles';
import type { Enemy, Player, RoomData, RunState, WeaponKey } from './types';

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

let torchGlowCanvas: HTMLCanvasElement | null = null;

function getTorchGlowSprite(): HTMLCanvasElement | null {
  if (torchGlowCanvas || typeof document === 'undefined') return torchGlowCanvas;
  const c = document.createElement('canvas');
  c.width = 160;
  c.height = 160;
  const gctx = c.getContext('2d');
  if (!gctx) return null;
  const g = gctx.createRadialGradient(80, 80, 2, 80, 80, 80);
  g.addColorStop(0, 'rgba(255, 162, 66, 0.28)');
  g.addColorStop(0.45, 'rgba(224, 107, 43, 0.11)');
  g.addColorStop(1, 'rgba(224, 107, 43, 0)');
  gctx.fillStyle = g;
  gctx.fillRect(0, 0, 160, 160);
  torchGlowCanvas = c;
  return torchGlowCanvas;
}

export function renderGameFrame(ctx: CanvasRenderingContext2D, st: RenderContextState): void {
  const { width: W, height: H, time } = st;
  const isTitle = st.phase === 'title';
  const camX = isTitle ? Math.sin(time * 0.14) * 110 + 180 : st.cameraX;
  const camY = isTitle ? 120 : st.cameraY;
  const b = st.room ? st.room.biome : BIOMES[0];

  // 1. Sky Gradient
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, b.skyTop);
  grad.addColorStop(1, b.skyBot);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // 2. Brass Eclipse (shifted slightly right on Title so left 40% stays calm negative space)
  const ex = isTitle ? W * 0.72 - camX * 0.05 : W * 0.72 - camX * 0.035;
  const ey = H * 0.25;
  const pulse = 1 + Math.sin(time * 1.4) * 0.04;

  const corona = ctx.createRadialGradient(ex, ey, 38, ex, ey, 185 * pulse);
  corona.addColorStop(0, 'rgba(224, 107, 43, 0.58)');
  corona.addColorStop(0.42, 'rgba(184, 50, 62, 0.2)');
  corona.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = corona;
  ctx.beginPath();
  ctx.arc(ex, ey, 185 * pulse, 0, Math.PI * 2);
  ctx.fill();

  // Eclipse Ring & Dark Core
  ctx.fillStyle = '#070609';
  ctx.beginPath();
  ctx.arc(ex, ey, 48, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = b.accentColor;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Subtle orbital sigil on eclipse
  ctx.strokeStyle = 'rgba(212, 168, 83, 0.22)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(ex, ey, 68, time * 0.25, time * 0.25 + Math.PI * 1.25);
  ctx.stroke();

  // 3. Distant Gothic Spires & Rose Arches (Parallax Layer 1)
  ctx.fillStyle = 'rgba(12, 9, 15, 0.62)';
  for (let i = -1; i < 10; i++) {
    const px = ((i * 290 - camX * 0.14) % (W + 580)) - 140;
    const archH = 260 + ((i * 53) % 90);
    ctx.fillRect(px, H - archH, 42, archH);
    ctx.beginPath();
    ctx.moveTo(px - 6, H - archH);
    ctx.lineTo(px + 21, H - archH - 48);
    ctx.lineTo(px + 48, H - archH);
    ctx.fill();
  }

  // 4. Midground Gothic Columns & Hanging Chains (Parallax Layer 2)
  ctx.fillStyle = 'rgba(15, 12, 19, 0.72)';
  for (let i = -1; i < 9; i++) {
    const px = ((i * 330 - camX * 0.26) % (W + 660)) - 160;
    ctx.fillRect(px, 60, 48, H);
    ctx.fillRect(px - 12, 60, 72, 18);
    // Pointed gothic arch rib
    ctx.strokeStyle = 'rgba(74, 59, 44, 0.22)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(px + 165, 140, 140, Math.PI, Math.PI * 1.5);
    ctx.stroke();
    // Hanging chains
    if (i % 2 === 0) {
      ctx.strokeStyle = 'rgba(120, 106, 94, 0.28)';
      ctx.lineWidth = 2;
      const sway = Math.sin(time * 1.1 + i) * 4;
      ctx.beginPath();
      ctx.moveTo(px + 110, 0);
      ctx.lineTo(px + 110 + sway, 210 + (i % 3) * 45);
      ctx.stroke();
    }
  }

  // 5. Ambient Drifting Ash Motes (screen-space)
  ctx.fillStyle = 'rgba(232, 200, 150, 0.35)';
  for (let i = 0; i < 24; i++) {
    const mx = ((i * 97 + time * (12 + (i % 5) * 3)) % (W + 40)) - 20;
    const my = ((i * 61 - time * (18 + (i % 4) * 5)) % H + H) % H;
    ctx.fillRect(mx, my, i % 3 === 0 ? 2.5 : 1.5, i % 3 === 0 ? 2.5 : 1.5);
  }

  // Title Screen Vignette Showcase (protagonist silhouette by brazier on right third)
  if (isTitle) {
    renderTitleShowcase(ctx, W, H, time);
    return;
  }

  if (!st.room || !st.player) return;
  const { room, player } = st;

  ctx.save();
  const shakePower = st.trauma * st.trauma * 16;
  const sx = (Math.random() - 0.5) * shakePower;
  const sy = (Math.random() - 0.5) * shakePower;
  ctx.translate(-Math.round(camX - sx), -Math.round(camY - sy));

  // 6. Torches & Smooth Pre-Baked Radial Glow (frustum-culled, zero gradient allocations)
  const glowSprite = getTorchGlowSprite();
  for (const t of room.torches) {
    if (t.x < camX - 180 || t.x > camX + W + 180) continue;
    const flick = 1 + Math.sin(time * 9 + t.x) * 0.08;
    const r = 120 * flick;
    if (glowSprite) {
      ctx.drawImage(glowSprite, t.x - r, t.y - r, r * 2, r * 2);
    }

    // Wall sconce & flame tongue
    ctx.fillStyle = '#3b2e26';
    ctx.fillRect(t.x - 3, t.y, 6, 16);
    ctx.fillStyle = '#e06b2b';
    ctx.beginPath();
    ctx.moveTo(t.x - 5, t.y);
    ctx.lineTo(t.x + Math.sin(time * 14 + t.x) * 2, t.y - 12 * flick);
    ctx.lineTo(t.x + 5, t.y);
    ctx.fill();
    ctx.fillStyle = '#ffd470';
    ctx.beginPath();
    ctx.arc(t.x, t.y - 3, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // 7. Platforms
  for (const p of room.platforms) {
    if (p.broken) {
      // Faint shimmer outline while respawning
      ctx.strokeStyle = 'rgba(140, 83, 56, 0.28)';
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(p.x, p.y, p.w, p.h);
      ctx.setLineDash([]);
      continue;
    }

    if (p.type === 'crumble' && p.crumbleT && p.crumbleT > 0) {
      ctx.globalAlpha = 0.55 + Math.sin(p.crumbleT * 42) * 0.3;
    }

    if (p.type === 'bounce') {
      // Thermal Ash Geyser pad
      ctx.fillStyle = '#3d281f';
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = '#e06b2b';
      ctx.fillRect(p.x + 4, p.y - 3, p.w - 8, 4);
      const glowY = p.y - 12 - Math.abs(Math.sin(time * 4)) * 10;
      ctx.fillStyle = 'rgba(255, 168, 76, 0.45)';
      ctx.fillRect(p.x + p.w * 0.3, glowY, p.w * 0.4, 3);
    } else {
      ctx.fillStyle = b.stone;
      ctx.fillRect(p.x, p.y, p.w, p.h);

      // Subtle brick seams on solid terrain
      if (p.type === 'solid') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
        for (let bx = p.x + 32; bx < p.x + p.w - 16; bx += 48) {
          ctx.fillRect(bx, p.y + 8, 2, Math.min(48, p.h - 10));
        }
      }

      // Top trim
      ctx.fillStyle =
        p.type === 'crumble'
          ? '#96583a'
          : p.type === 'moving'
          ? '#d4a853'
          : b.trim;
      ctx.fillRect(p.x, p.y, p.w, 5);
    }
    ctx.globalAlpha = 1;
  }

  // 8. Hazards
  for (const h of room.hazards) {
    if (h.kind === 'spikes') {
      ctx.fillStyle = '#7e242e';
      for (let x = h.x; x < h.x + h.w; x += 14) {
        ctx.beginPath();
        ctx.moveTo(x, h.y + 24);
        ctx.lineTo(x + 7, h.y);
        ctx.lineTo(x + 14, h.y + 24);
        ctx.fill();
      }
    } else if (h.kind === 'flamejet') {
      ctx.fillStyle = '#2e2226';
      ctx.fillRect(h.x, h.y + 6, h.w, 8);
      if (h.active) {
        const fGrad = ctx.createLinearGradient(h.x, h.y - 78, h.x, h.y + 6);
        fGrad.addColorStop(0, 'rgba(255, 190, 80, 0)');
        fGrad.addColorStop(0.5, 'rgba(224, 107, 43, 0.85)');
        fGrad.addColorStop(1, '#ffd470');
        ctx.fillStyle = fGrad;
        ctx.fillRect(h.x + 4, h.y - 78, h.w - 8, 84);
      } else if (h.timer > 2.2) {
        // Pre-eruption glow telegraph
        ctx.fillStyle = 'rgba(255, 120, 40, 0.7)';
        ctx.fillRect(h.x + 6, h.y + 2, h.w - 12, 4);
      }
    }
  }

  // 9. Props
  for (const pr of room.props) {
    if (pr.type === 'chest' || pr.type === 'gilded_chest') {
      const gilded = pr.type === 'gilded_chest';
      ctx.fillStyle = pr.opened ? '#2d2520' : gilded ? '#966b28' : '#6c4b2b';
      ctx.fillRect(pr.x, pr.y, pr.w, pr.h);
      ctx.strokeStyle = gilded ? '#ffd470' : '#d4a853';
      ctx.lineWidth = gilded ? 2 : 1.5;
      ctx.strokeRect(pr.x, pr.y, pr.w, pr.h);
      if (!pr.opened) {
        ctx.fillStyle = gilded ? '#ffd470' : '#d4a853';
        ctx.fillRect(pr.x + pr.w / 2 - 3, pr.y + 10, 6, 8);
      }
      ctx.lineWidth = 1;
    } else if (pr.type === 'urn' && !pr.broken) {
      ctx.fillStyle = '#5e463a';
      ctx.beginPath();
      ctx.ellipse(pr.x + pr.w / 2, pr.y + pr.h * 0.6, pr.w * 0.45, pr.h * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8b6852';
      ctx.fillRect(pr.x + 5, pr.y, pr.w - 10, 5);
    } else if (pr.type === 'brazier') {
      ctx.fillStyle = '#332924';
      ctx.fillRect(pr.x + 6, pr.y + 18, pr.w - 12, 20);
      ctx.fillRect(pr.x, pr.y + 12, pr.w, 8);
      if (!pr.used) {
        const fl = Math.sin(time * 10) * 3;
        ctx.fillStyle = '#e06b2b';
        ctx.beginPath();
        ctx.moveTo(pr.x + 4, pr.y + 12);
        ctx.lineTo(pr.x + pr.w / 2 + fl, pr.y - 12);
        ctx.lineTo(pr.x + pr.w - 4, pr.y + 12);
        ctx.fill();
        ctx.fillStyle = '#ffd470';
        ctx.beginPath();
        ctx.arc(pr.x + pr.w / 2, pr.y + 6, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (pr.type === 'shrine') {
      ctx.fillStyle = '#2b242c';
      ctx.fillRect(pr.x + 4, pr.y + 12, pr.w - 8, pr.h - 12);
      ctx.fillStyle = pr.used ? '#4a3d42' : '#c4303e';
      ctx.beginPath();
      ctx.moveTo(pr.x + pr.w / 2, pr.y - 4);
      ctx.lineTo(pr.x + pr.w - 6, pr.y + 16);
      ctx.lineTo(pr.x + 6, pr.y + 16);
      ctx.closePath();
      ctx.fill();
    } else if (pr.type === 'merchant') {
      // Hooded figure with warm lantern
      ctx.fillStyle = '#2d323e';
      ctx.fillRect(pr.x + 2, pr.y + 10, pr.w - 4, pr.h - 10);
      ctx.fillStyle = '#53453c';
      ctx.beginPath();
      ctx.arc(pr.x + pr.w / 2, pr.y + 10, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd470';
      ctx.beginPath();
      ctx.arc(pr.x - 6, pr.y + 24, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (pr.type === 'lore') {
      ctx.fillStyle = '#38343d';
      ctx.fillRect(pr.x, pr.y, pr.w, pr.h);
      ctx.fillStyle = pr.used ? '#6e645c' : '#8ab8e6';
      ctx.fillRect(pr.x + 8, pr.y + 10, pr.w - 16, 4);
      ctx.fillRect(pr.x + 8, pr.y + 18, pr.w - 16, 4);
      ctx.fillRect(pr.x + 8, pr.y + 26, pr.w - 16, 4);
    } else if (pr.type === 'npc' && !pr.used) {
      ctx.fillStyle = '#4e6f94';
      ctx.fillRect(pr.x, pr.y + 12, pr.w, pr.h - 12);
      ctx.fillStyle = '#e8e1d5';
      ctx.fillRect(pr.x + 6, pr.y + 2, pr.w - 12, 13);
    } else if (pr.type === 'exit') {
      ctx.fillStyle = pr.locked ? '#1e1419' : '#120f17';
      ctx.fillRect(pr.x, pr.y, pr.w, pr.h);
      ctx.strokeStyle = pr.locked ? '#732630' : '#d4a853';
      ctx.lineWidth = 3;
      ctx.strokeRect(pr.x, pr.y, pr.w, pr.h);
      if (!pr.locked) {
        const portal = ctx.createRadialGradient(
          pr.x + pr.w / 2,
          pr.y + pr.h / 2,
          4,
          pr.x + pr.w / 2,
          pr.y + pr.h / 2,
          42
        );
        portal.addColorStop(0, 'rgba(255, 212, 112, 0.5)');
        portal.addColorStop(1, 'rgba(212, 168, 83, 0)');
        ctx.fillStyle = portal;
        ctx.fillRect(pr.x + 4, pr.y + 4, pr.w - 8, pr.h - 8);
      }
      ctx.lineWidth = 1;
    }
  }

  // 10. Enemies & Bosses
  for (const e of room.enemies) {
    renderEnemy(ctx, e, player, time);
  }

  // 11. Projectiles
  for (const pr of room.projectiles) {
    if (pr.kind === 'eruption') {
      if (pr.telegraphT && pr.telegraphT > 0) {
        ctx.strokeStyle = '#ff5a36';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(pr.x, pr.y, pr.r, 8, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 1;
      } else {
        ctx.fillStyle = 'rgba(255, 110, 48, 0.85)';
        ctx.fillRect(pr.x - pr.r * 0.65, pr.y - 110, pr.r * 1.3, 110);
      }
    } else if (pr.kind === 'crescent') {
      ctx.save();
      ctx.translate(pr.x, pr.y);
      ctx.rotate(Math.atan2(pr.vy, pr.vx));
      ctx.strokeStyle = pr.friendly ? '#ffd470' : '#ff4d63';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, pr.r + 4, -1.1, 1.1);
      ctx.stroke();
      ctx.restore();
    } else {
      ctx.fillStyle = pr.friendly ? '#ffd470' : pr.color;
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, pr.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.stroke();
    }
  }

  // 12. Player Afterimages & Articulated Protagonist
  for (const af of player.afterimages) {
    ctx.globalAlpha = af.alpha * 0.45;
    ctx.fillStyle = '#9c8d82';
    ctx.fillRect(af.x, af.y + 10, player.w, player.h - 10);
  }
  ctx.globalAlpha = 1;

  renderPlayer(ctx, player, st.weapon, st.run, time);

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

  // 14. Critical Low-HP Peripheral Vignette (Screen Space)
  if (st.run && st.run.hp > 0 && st.run.hp / st.run.maxHp <= 0.28) {
    const pulseLow = 0.22 + Math.sin(time * 5) * 0.08;
    const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, W * 0.72);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, `rgba(168, 28, 42, ${pulseLow.toFixed(3)})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }

  // 15. Compact Corner Minimap (Bottom-Right)
  if (st.phase === 'playing') {
    renderMinimap(ctx, W, H, room, player);
  }
}

function renderTitleShowcase(ctx: CanvasRenderingContext2D, W: number, H: number, time: number): void {
  const groundY = H * 0.78;
  // Stone terrace on lower half
  ctx.fillStyle = '#18131a';
  ctx.fillRect(0, groundY, W, H - groundY);
  ctx.fillStyle = '#4e3c2d';
  ctx.fillRect(0, groundY, W, 5);

  // Brazier on right third
  const bx = W * 0.72;
  ctx.fillStyle = '#2d2421';
  ctx.fillRect(bx - 16, groundY - 22, 32, 22);
  const fGlow = ctx.createRadialGradient(bx, groundY - 30, 6, bx, groundY - 30, 150);
  fGlow.addColorStop(0, 'rgba(255, 160, 64, 0.35)');
  fGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = fGlow;
  ctx.beginPath();
  ctx.arc(bx, groundY - 30, 150, 0, Math.PI * 2);
  ctx.fill();

  const fl = Math.sin(time * 8) * 3;
  ctx.fillStyle = '#e06b2b';
  ctx.beginPath();
  ctx.moveTo(bx - 10, groundY - 22);
  ctx.lineTo(bx + fl, groundY - 56);
  ctx.lineTo(bx + 10, groundY - 22);
  ctx.fill();

  // Resting Éveillé d'Argile silhouette beside brazier
  const px = bx - 64;
  const py = groundY - 46 + Math.sin(time * 2) * 1.5;
  ctx.fillStyle = '#3c2e34';
  ctx.fillRect(px, py + 12, 28, 34);
  ctx.fillStyle = '#d6cbb9';
  ctx.fillRect(px + 5, py, 18, 14);
  ctx.fillStyle = '#e06b2b';
  ctx.fillRect(px + 16, py + 5, 4, 4);
  // Sword planted in stone
  ctx.fillStyle = '#9aa3ad';
  ctx.fillRect(px + 34, groundY - 38, 4, 38);
  ctx.fillStyle = '#d4a853';
  ctx.fillRect(px + 28, groundY - 34, 16, 4);
}

function renderEnemy(
  ctx: CanvasRenderingContext2D,
  e: Enemy,
  player: Player,
  time: number
): void {
  if (e.state === 'dead') {
    ctx.globalAlpha = Math.max(0, e.deadT / 0.35);
  }

  ctx.save();
  const cx = e.x + e.w / 2;
  const cy = e.y + e.h;
  ctx.translate(cx, cy);
  if (e.state === 'dead') {
    ctx.rotate(e.facing * -0.6 * (1 - e.deadT / 0.35));
  }

  // Elite golden aura
  if (e.elite !== 'none' && e.state !== 'dead') {
    ctx.strokeStyle = e.elite === 'blazing' ? '#e06b2b' : '#ffd470';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-e.w / 2 - 4, -e.h - 4, e.w + 8, e.h + 8);
    ctx.lineWidth = 1;
  }

  // Body color with hit-flash & status tint
  let bodyCol = e.state === 'staggered' ? '#ffd470' : e.color;
  if (e.hitFlashT > 0) bodyCol = '#fff6e6';
  else if (e.chillT > 0) bodyCol = '#7ab8ff';

  ctx.fillStyle = bodyCol;
  ctx.fillRect(-e.w / 2, -e.h, e.w, e.h);

  // Archetype details
  if (e.kind === 'lancer') {
    // Frontal pavois shield
    ctx.fillStyle = '#474f5c';
    const shX = e.facing === 1 ? e.w / 2 - 4 : -e.w / 2 - 6;
    ctx.fillRect(shX, -e.h + 8, 10, e.h - 12);
    ctx.strokeStyle = '#d4a853';
    ctx.strokeRect(shX, -e.h + 8, 10, e.h - 12);
  } else if (e.isBoss) {
    // Boss crown/horns
    ctx.fillStyle = e.phase === 2 ? '#ff5468' : '#d4a853';
    ctx.beginPath();
    ctx.moveTo(-e.w * 0.35, -e.h);
    ctx.lineTo(-e.w * 0.45, -e.h - 18);
    ctx.lineTo(-e.w * 0.15, -e.h);
    ctx.lineTo(0, -e.h - 22);
    ctx.lineTo(e.w * 0.15, -e.h);
    ctx.lineTo(e.w * 0.45, -e.h - 18);
    ctx.lineTo(e.w * 0.35, -e.h);
    ctx.fill();
  }

  // Eyes
  ctx.fillStyle = e.state === 'windup' ? '#ff3344' : '#0b0a0e';
  const eyeX = e.facing === 1 ? e.w / 2 - 10 : -e.w / 2 + 4;
  ctx.fillRect(eyeX, -e.h + 10, 6, 6);

  // Windup telegraph ring / sniper line
  if (e.state === 'windup') {
    ctx.strokeStyle = '#ff4455';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -e.h - 12, 8 + Math.sin(time * 24) * 2, 0, Math.PI * 2);
    ctx.stroke();

    if (e.kind === 'arbalest') {
      ctx.strokeStyle = 'rgba(255, 68, 85, 0.55)';
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(0, -e.h * 0.6);
      ctx.lineTo(
        player.x + player.w / 2 - cx,
        player.y + player.h / 2 - cy
      );
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.lineWidth = 1;
  }

  ctx.restore();

  // Enemy HP & Stagger mini bars (non-boss)
  if (!e.isBoss && e.state !== 'dead' && (e.hp < e.maxHp || e.stagger > 0)) {
    ctx.fillStyle = '#141016';
    ctx.fillRect(e.x, e.y - 12, e.w, 5);
    ctx.fillStyle = '#c4303e';
    ctx.fillRect(e.x, e.y - 12, e.w * Math.max(0, e.hp / e.maxHp), 5);
    if (e.stagger > 0) {
      ctx.fillStyle = '#e5b85c';
      ctx.fillRect(e.x, e.y - 6, e.w * Math.min(1, e.stagger / e.maxStagger), 2);
    }
  }
  ctx.globalAlpha = 1;
}

function renderPlayer(
  ctx: CanvasRenderingContext2D,
  player: Player,
  weapon: WeaponKey,
  run: RunState | null,
  time: number
): void {
  if (player.invulnT > 0 && Math.floor(player.invulnT * 22) % 2 === 1 && player.dashT <= 0) {
    ctx.globalAlpha = 0.55;
  }

  ctx.save();
  const footX = player.x + player.w / 2;
  const footY = player.y + player.h;
  ctx.translate(footX, footY);
  ctx.scale(player.squashX, player.squashY);

  // Fluttering tattered cloak behind player
  const capeDir = -player.facing;
  const wave = Math.sin(player.capeWave) * 5;
  ctx.fillStyle = '#2d2128';
  ctx.beginPath();
  ctx.moveTo(capeDir * 4, -player.h + 14);
  ctx.lineTo(capeDir * (18 + Math.abs(player.vx) * 0.02), -10 + wave);
  ctx.lineTo(capeDir * 6, -4);
  ctx.closePath();
  ctx.fill();

  // Body cloak
  ctx.fillStyle = player.hitFlashT > 0 ? '#fff2e0' : player.dashT > 0 ? '#9c8b7b' : '#3d2d34';
  ctx.fillRect(-player.w / 2, -player.h + 12, player.w, player.h - 12);

  // Porcelain Mask / Head
  ctx.fillStyle = player.hitFlashT > 0 ? '#ffffff' : '#dfd4c2';
  ctx.fillRect(-player.w / 2 + 4, -player.h, player.w - 8, 15);

  // Glowing Ember Visor Eye
  ctx.fillStyle = '#e06b2b';
  const eyeX = player.facing === 1 ? 4 : -8;
  ctx.fillRect(eyeX, -player.h + 5, 4, 4);

  // Weapon held at side when idle
  if (player.attackT <= 0) {
    ctx.fillStyle = weapon === 'eclipse_daggers' ? '#ffd470' : '#a9b3bd';
    const wLen =
      weapon === 'ash_halberd' ? 34 : weapon === 'belfry_greatsword' ? 30 : weapon === 'eclipse_daggers' ? 16 : 24;
    ctx.fillRect(player.facing * 10, -24, player.facing * wLen, 3);
  }

  ctx.restore();
  ctx.globalAlpha = 1;

  // Parry / Guard Shield Aura
  if (player.parryT > 0 || player.guardT > 0) {
    ctx.strokeStyle = player.parryT > 0 ? '#ffd470' : '#968b7c';
    ctx.lineWidth = player.parryT > 0 ? 3.5 : 2;
    ctx.beginPath();
    ctx.arc(
      player.x + player.w / 2 + player.facing * 14,
      player.y + 22,
      25,
      -1.15,
      1.15,
      player.facing === -1
    );
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  // Sword Slash Arc
  if (player.attackT > 0) {
    const prog = 1 - player.attackT / Math.max(0.01, player.attackTotalT);
    const isHeavy = player.attackMove === 'heavy' || player.attackMove === 'light3';
    const reach =
      (weapon === 'ash_halberd' ? 84 : weapon === 'belfry_greatsword' ? 74 : weapon === 'eclipse_daggers' ? 48 : 58) +
      (isHeavy ? 14 : 0);

    ctx.save();
    ctx.translate(player.x + player.w / 2, player.y + 22);
    ctx.scale(player.facing, 1);
    ctx.strokeStyle =
      player.attackMove === 'heavy'
        ? 'rgba(224, 107, 43, 0.85)'
        : player.attackMove === 'light3'
        ? 'rgba(255, 212, 112, 0.9)'
        : 'rgba(235, 228, 216, 0.8)';
    ctx.lineWidth = isHeavy ? 8 : 5;
    ctx.beginPath();
    if (player.attackMove === 'plunge') {
      ctx.arc(0, 12, reach * 0.72, 0.1, Math.PI - 0.1);
    } else if (player.attackMove === 'launcher') {
      ctx.arc(8, 0, reach * 0.85, 0.7, -1.3, true);
    } else {
      const startA = -1.2 + prog * 0.4;
      const endA = 1.05;
      ctx.arc(6, 0, reach * 0.78, startA, endA);
    }
    ctx.stroke();
    ctx.restore();
  }

  // Orbital Flame Wisp companion
  if (run && run.blessings.includes('orbital_wisp')) {
    const wx = player.x + player.w / 2 + Math.cos(player.wispAngle) * 42;
    const wy = player.y + 18 + Math.sin(player.wispAngle * 1.4) * 16;
    ctx.fillStyle = '#ff9842';
    ctx.beginPath();
    ctx.arc(wx, wy, 5 + Math.sin(time * 10) * 1, 0, Math.PI * 2);
    ctx.fill();
  }
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

  ctx.fillStyle = 'rgba(10, 8, 13, 0.78)';
  ctx.fillRect(mx, my, mw, mh);
  ctx.strokeStyle = '#4a3b2c';
  ctx.strokeRect(mx, my, mw, mh);

  // Platforms
  ctx.fillStyle = '#4b3f48';
  for (const p of room.platforms) {
    if (p.broken) continue;
    ctx.fillRect(mx + p.x * scaleX, my + p.y * scaleY, Math.max(2, p.w * scaleX), 2);
  }

  // Props (Chests, Shrines, Exit)
  for (const pr of room.props) {
    if (pr.opened || pr.used || pr.broken) continue;
    ctx.fillStyle = pr.type === 'exit' ? '#ffd470' : '#8ab8e6';
    ctx.fillRect(mx + pr.x * scaleX - 1, my + pr.y * scaleY - 3, 3, 3);
  }

  // Enemies
  ctx.fillStyle = '#c4303e';
  for (const e of room.enemies) {
    if (e.hp <= 0) continue;
    ctx.fillRect(mx + e.x * scaleX - 1, my + e.y * scaleY - 2, e.isBoss ? 4 : 2.5, e.isBoss ? 4 : 2.5);
  }

  // Player
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(mx + player.x * scaleX - 1.5, my + player.y * scaleY - 3, 3.5, 4);
}
