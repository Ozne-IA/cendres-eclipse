import { computeParallaxOffset, PARALLAX_LAYERS } from './parallax';
import { dot, mkGrad, poly } from './renderPrimitives';
import { getPreferCinematicArt, getSeamlessBakedBackdrop } from './textures';
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
  reduceOverdraw = false,
): number {
  // Cache the background at the actual raster size on Android.
  const bw = reduceOverdraw ? Math.min(W, ctx.canvas.width) : W;
  const bh = reduceOverdraw ? Math.min(H, ctx.canvas.height) : H;
  const bakedBg = getSeamlessBakedBackdrop(b, bw, bh, isTitle);
  if (bakedBg) {
    const scroll = camX * 0.05 * (bw / W);
    const sx = Math.floor((scroll % (bw * 2) + bw * 2) % (bw * 2));
    ctx.drawImage(bakedBg, sx, 0, bw, bh, 0, 0, W, H);
  } else {
    ctx.fillStyle = b.skyTop;
    ctx.fillRect(0, 0, W, H);
  }

  // Faint celestial dust stars in upper sky (0.03x)
  const skyOff = computeParallaxOffset(camX, camY, time, PARALLAX_LAYERS.sky, W, trauma);
  ctx.fillStyle = 'rgba(236, 226, 206, 0.22)';
  for (let i = 0; i < 24; i++) {
    const sx = ((i * 149 - skyOff.offsetX) % W + W) % W;
    const sy = ((i * 41 - skyOff.offsetY * 0.4) % (H * 0.42) + H * 0.42) % (H * 0.42);
    ctx.fillRect(sx, sy, i % 3 === 0 ? 2 : 1.2, i % 3 === 0 ? 2 : 1.2);
  }

  // Celestial Brass Eclipse (subtle blend when v2 painted backdrops already establish sky mood)
  const ex = W * 0.72 - (isTitle ? camX * 0.04 : skyOff.offsetX);
  const ey = H * 0.25 - (isTitle ? 0 : skyOff.offsetY);
  const cinematicV2Active = getPreferCinematicArt() && !isTitle && b.id !== 'catacombes';
  const eclipseOpacity = cinematicV2Active ? 0.38 : 1;

  const pulse = 1 + Math.sin(time * 1.4) * 0.045;
  const coronaSprite = getCoronaSprite();
  const cRad = 255 * pulse;
  if (coronaSprite) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.65 * eclipseOpacity;
    ctx.drawImage(coronaSprite, Math.round(ex - cRad), Math.round(ey - cRad), Math.round(cRad * 2), Math.round(cRad * 2));
    for (let fl = 0; fl < 4; fl++) {
      const a = time * (0.28 + fl * 0.09) + fl * 1.57;
      ctx.strokeStyle = fl % 2 === 0 ? 'rgba(255, 178, 86, 0.30)' : 'rgba(224, 96, 42, 0.22)';
      ctx.lineWidth = 4 + (fl % 2) * 2;
      ctx.beginPath();
      ctx.arc(ex, ey, 51 + fl * 3.5, a, a + 1.05);
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.save();
  ctx.globalAlpha = eclipseOpacity;
  ctx.strokeStyle = 'rgba(212, 168, 83, 0.24)';
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  ctx.arc(ex, ey, 78, time * 0.18, time * 0.18 + Math.PI * 1.38);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(ex, ey, 104, -time * 0.12, -time * 0.12 + Math.PI * 0.88);
  ctx.stroke();

  dot(ctx, ex, ey, 48, '#050408', '#ffd470', 2.6);
  dot(ctx, ex, ey, 50.5, undefined, b.accentColor, 1.3);
  ctx.restore();

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
  // Plan 3: Fluted Gothic Stone Colonnade (0.42x H & 0.18x V)
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

    const colTop = 28 + midYShift;
    const colH = H + 90;

    // Fluted cylindrical stone pier with shadow core & subtle stone ribs
    ctx.fillStyle = mkGrad(ctx, px, 0, px + 46, 0, null, [
      [0, 'rgba(9, 7, 13, 0.72)'],
      [0.28, 'rgba(24, 19, 28, 0.56)'],
      [0.68, 'rgba(14, 11, 18, 0.62)'],
      [1, 'rgba(255, 210, 165, 0.08)'],
    ]);
    ctx.fillRect(px, colTop, 46, colH);

    // Fluted vertical stone grooves
    ctx.fillStyle = 'rgba(5, 4, 8, 0.38)';
    ctx.fillRect(px + 9, colTop + 20, 4, colH - 20);
    ctx.fillRect(px + 21, colTop + 20, 4, colH - 20);
    ctx.fillRect(px + 33, colTop + 20, 4, colH - 20);

    // Carved gothic pier capital moldings
    ctx.fillStyle = 'rgba(18, 14, 22, 0.82)';
    ctx.fillRect(px - 12, colTop, 70, 14);
    ctx.fillRect(px - 7, colTop + 16, 60, 8);
    ctx.fillStyle = 'rgba(255, 220, 170, 0.1)';
    ctx.fillRect(px - 12, colTop, 70, 2);

    // Horizontal stone joint lines across pier
    ctx.fillStyle = 'rgba(4, 3, 6, 0.45)';
    for (let jy = colTop + 68; jy < H; jy += 72) {
      ctx.fillRect(px, jy, 46, 2);
    }

    // Ribbed gothic arch
    ctx.strokeStyle = 'rgba(92, 74, 56, 0.24)';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.arc(px + 270, 150 + midYShift, 225, Math.PI, Math.PI * 1.44);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(px + 270, 150 + midYShift, 225, Math.PI * 1.56, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;

    // Hanging censer & embroidered frayed war banner
    if (idx % 2 === 0) {
      const sway = Math.sin(time * 1.1 + idx) * 5;
      const chainLen = 195 + (idx % 3) * 38 + midYShift;
      ctx.strokeStyle = 'rgba(130, 116, 102, 0.26)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(px + 270, 0);
      ctx.lineTo(px + 270 + sway, chainLen);
      ctx.stroke();
      ctx.lineWidth = 1;
      dot(ctx, px + 270 + sway, chainLen + 4, 3.8, 'rgba(255,148,62,.72)');
    } else {
      const bWave = Math.sin(time * 1.7 + idx) * 4;
      poly(
        ctx,
        [
          px + 9, 64 + midYShift,
          px + 37, 64 + midYShift,
          px + 35 + bWave, 206 + midYShift,
          px + 23 + bWave * 0.7, 182 + midYShift,
          px + 11 + bWave, 208 + midYShift,
        ],
        'rgba(96, 22, 32, 0.46)'
      );
      // Faint gold heraldic line down banner center
      ctx.strokeStyle = 'rgba(212, 168, 83, 0.26)';
      ctx.beginPath();
      ctx.moveTo(px + 23, 76 + midYShift);
      ctx.lineTo(px + 23 + bWave * 0.6, 174 + midYShift);
      ctx.stroke();
    }
  }
}
