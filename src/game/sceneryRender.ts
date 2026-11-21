import { computeParallaxOffset, PARALLAX_LAYERS } from './parallax';
import { getSeamlessBakedBackdrop } from './textures';
import type { BiomeDef } from './types';

let coronaCanvas: HTMLCanvasElement | null = null;

export function getCoronaSprite(): HTMLCanvasElement | null {
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

export function renderBackdropAndEclipse(
  ctx: CanvasRenderingContext2D,
  b: BiomeDef,
  W: number,
  H: number,
  camX: number,
  camY: number,
  time: number,
  isTitle: boolean,
  trauma: number,
): number {
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
  const skyOff = computeParallaxOffset(camX, camY, time, PARALLAX_LAYERS.sky, W, trauma);
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
  return ex;
}

export function renderMidgroundArchitecture(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  camX: number,
  camY: number,
  time: number,
  isTitle: boolean,
  trauma: number,
  eclipseX: number,
): void {
  // Plan 3: Midground Gothic Colonnade (0.42x H & 0.18x V for clear 2.5D separation)
  const midTileW = 540;
  const midOff = computeParallaxOffset(
    camX,
    isTitle ? 0 : camY,
    time,
    PARALLAX_LAYERS.midground,
    midTileW,
    trauma
  );
  const midYShift = Math.round(-midOff.offsetY * 0.35);
  const midStart = -Math.round(midOff.wrapX) - midTileW;
  for (let px = midStart, idx = 0; px < W + midTileW; px += midTileW, idx++) {
    if (px + 140 < 0 || px - 140 > W) continue;
    if (isTitle && (px < W * 0.48 || Math.abs(px + 22 - eclipseX) < 92)) continue;

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
}
