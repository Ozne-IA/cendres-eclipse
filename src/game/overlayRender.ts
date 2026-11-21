import type { BiomeDef, Player, RoomData, RunState } from './types';

let lowHpVignetteCanvas: HTMLCanvasElement | null = null;

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

export function renderLowHpVignette(
  ctx: CanvasRenderingContext2D,
  run: RunState | null,
  W: number,
  H: number,
  time: number,
): void {
  // 15. Subtle Low-HP Pulse Vignette (standard vignette is pre-baked into backdrop)
  const isLowHp = !!(run && run.hp > 0 && run.hp / run.maxHp <= 0.28);
  if (isLowHp) {
    const vgSprite = getVignetteSprite(true);
    if (vgSprite) {
      ctx.globalAlpha = 0.75 + Math.sin(time * 5) * 0.22;
      ctx.drawImage(vgSprite, 0, 0, W, H);
      ctx.globalAlpha = 1;
    }
  }
}

/**
 * Applies cinematic color grading tailored to the active biome to enhance chiaroscuro and atmospheric depth.
 */
export function renderAtmosphericColorGrading(
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

export function renderMinimap(
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
