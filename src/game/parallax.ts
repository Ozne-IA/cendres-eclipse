import { dot, mkGrad, poly } from './renderPrimitives';
import { getColoredGlow } from './textures';
import type { BiomeDef } from './types';

export interface ParallaxLayerSpec {
  id: 'sky' | 'horizon' | 'mist' | 'midground' | 'combat' | 'foreground';
  factorX: number;
  factorY: number;
  windSpeedX: number;
  alpha: number;
}

export interface ParallaxOffset {
  offsetX: number;
  offsetY: number;
  wrapX: number;
}

export const PARALLAX_LAYERS: Record<ParallaxLayerSpec['id'], ParallaxLayerSpec> = {
  sky: { id: 'sky', factorX: 0.03, factorY: 0.015, windSpeedX: 0, alpha: 1 },
  horizon: { id: 'horizon', factorX: 0.14, factorY: 0.06, windSpeedX: 0, alpha: 0.62 },
  mist: { id: 'mist', factorX: 0.24, factorY: 0.1, windSpeedX: 14, alpha: 0.48 },
  midground: { id: 'midground', factorX: 0.42, factorY: 0.18, windSpeedX: 0, alpha: 1 },
  combat: { id: 'combat', factorX: 1.0, factorY: 1.0, windSpeedX: 0, alpha: 1 },
  foreground: { id: 'foreground', factorX: 1.32, factorY: 1.15, windSpeedX: 0, alpha: 0.92 },
};

/**
 * Pure parallax coordinate projection with seamless positive modulo wrapping
 * and vertical clamp so distant horizons never detach from viewport bounds.
 */
export function computeParallaxOffset(
  cameraX: number,
  cameraY: number,
  time: number,
  layer: ParallaxLayerSpec,
  tileWidth: number,
  trauma = 0
): ParallaxOffset {
  const safeTile = Math.max(1, tileWidth);
  const rawX = cameraX * layer.factorX + time * layer.windSpeedX;
  const wrapX = ((rawX % safeTile) + safeTile) % safeTile;
  // Subtle depth separation impulse on heavy combat impacts (trauma)
  const impactOffset = trauma > 0 ? Math.sin(time * 42) * trauma * (1 - layer.factorX) * 5 : 0;
  const offsetY = Math.max(-90, Math.min(90, cameraY * layer.factorY));
  return {
    offsetX: rawX + impactOffset,
    offsetY,
    wrapX,
  };
}

/**
 * Computes subtle combat vignette intensity boost during hits, boss encounters, or low-HP focus.
 */
export function computeCombatDepthFocus(trauma: number, isBossRoom: boolean, hpRatio: number): number {
  const traumaBoost = Math.max(0, Math.min(0.45, trauma * 0.45));
  const bossFocus = isBossRoom ? 0.14 : 0;
  const lowHpPulse = hpRatio > 0 && hpRatio <= 0.28 ? 0.18 : 0;
  return Math.min(0.65, traumaBoost + bossFocus + lowHpPulse);
}

const horizonStripCache = new Map<string, HTMLCanvasElement>();
const mistStripCache = new Map<string, HTMLCanvasElement>();

function hash1D(i: number, seed: number): number {
  const n = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

/**
 * Pre-bakes a seamless 1600px-wide distant architectural silhouette strip tailored to each biome.
 * Sized vertically to the lower horizon band (44% of H) to minimize full-screen overdraw.
 */
export function getParallaxHorizonStrip(biome: BiomeDef, H: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const stripH = Math.max(220, Math.round(H * 0.44));
  const key = `${biome.id}|${stripH}`;
  const existing = horizonStripCache.get(key);
  if (existing) return existing;

  if (horizonStripCache.size > 6) horizonStripCache.clear();

  const W = 1600;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = stripH;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  const seed =
    biome.id === 'viaduc' ? 23 : biome.id === 'fleche' ? 47 : biome.id === 'sanctuaire' ? 83 : 11;
  const baseLine = stripH - 12;

  // Soft vertical-gradient silhouette colors for authentic aerial perspective
  const gradStops: Record<string, [string, string]> = {
    viaduc: ['rgba(18,30,44,.34)', 'rgba(10,16,24,.78)'],
    fleche: ['rgba(36,14,22,.36)', 'rgba(16,7,12,.8)'],
    sanctuaire: ['rgba(34,24,16,.34)', 'rgba(14,10,8,.78)'],
  };
  const [topC, botC] = gradStops[biome.id] ?? ['rgba(20,14,26,.32)', 'rgba(9,7,13,.78)'];
  const silGrad = mkGrad(ctx, 0, 14, 0, stripH, null, [[0, topC], [1, botC]]);

  const rimCol =
    biome.id === 'viaduc'
      ? 'rgba(141, 185, 220, 0.16)'
      : biome.id === 'fleche'
      ? 'rgba(217, 83, 100, 0.16)'
      : biome.id === 'sanctuaire'
      ? 'rgba(255, 212, 112, 0.18)'
      : 'rgba(212, 168, 83, 0.13)';

  const segCount = 10;
  const segW = W / segCount;

  for (let i = 0; i < segCount; i++) {
    const x = i * segW;
    const r = hash1D(i, seed);
    const towerH = Math.round(stripH * (0.36 + r * 0.42));
    const topY = baseLine - towerH;

    ctx.fillStyle = silGrad;
    if (biome.id === 'viaduc') {
      // Distant arched aqueduct spans & weathered piers
      ctx.beginPath();
      ctx.moveTo(x + 8, stripH);
      ctx.lineTo(x + 14, topY + 34);
      ctx.lineTo(x + 38, topY + 22);
      ctx.lineTo(x + 48, topY + 60);
      ctx.quadraticCurveTo(x + segW * 0.5, topY + 18, x + segW - 44, topY + 62);
      ctx.lineTo(x + segW - 36, topY + 28);
      ctx.lineTo(x + segW - 14, topY + 40);
      ctx.lineTo(x + segW - 8, stripH);
      ctx.closePath();
      ctx.fill();
    } else if (biome.id === 'fleche') {
      // Jagged obsidian cathedral spires & swept flying buttresses
      poly(ctx, [x + 6, stripH, x + 26, topY + 58, x + segW * 0.44, topY + 6, x + segW * 0.66, topY + 64, x + segW - 16, topY + 28, x + segW + 2, stripH], silGrad);
    } else if (biome.id === 'sanctuaire') {
      // Tapered solar obelisks & distant ruined astrolabe crowns
      poly(ctx, [x + 18, stripH, x + 36, topY + 28, x + 56, topY, x + 76, topY + 28, x + 94, stripH], silGrad);
      if (i % 2 === 0) dot(ctx, x + 56, topY + 40, 22, undefined, rimCol, 1.6);
    } else {
      // Catacombes: tapered gothic lancet spires & ruined pointed vaults
      ctx.beginPath();
      ctx.moveTo(x + 4, stripH);
      ctx.lineTo(x + 22, topY + 46);
      ctx.lineTo(x + 42, topY + 8);
      ctx.lineTo(x + 62, topY + 46);
      ctx.quadraticCurveTo(x + segW * 0.56, topY + 96, x + segW - 42, topY + 64);
      ctx.lineTo(x + segW - 22, topY + 32);
      ctx.lineTo(x + segW - 4, stripH);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = rimCol;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + 22, topY + 46);
      ctx.lineTo(x + 42, topY + 8);
      ctx.lineTo(x + 62, topY + 46);
      ctx.stroke();
    }

    // Subtle distant gothic lancet slit catching dim torchlight
    if (i % 3 === 1) {
      ctx.fillStyle = rimCol;
      ctx.fillRect(x + 40, topY + 54, 3, 12);
    }
  }

  // Soft bottom atmospheric haze blending horizon cleanly into Plan 2 mist
  ctx.fillStyle = mkGrad(ctx, 0, stripH * 0.35, 0, stripH, null, [[0, 'rgba(0,0,0,0)'], [0.7, biome.fogColor], [1, 'rgba(7,6,9,.72)']]);
  ctx.fillRect(0, Math.round(stripH * 0.35), W, stripH);

  horizonStripCache.set(key, c);
  return c;
}

/**
 * Pre-bakes a seamless billowing low-fog ribbon canvas (1024 x 180) per biome.
 */
export function getParallaxMistStrip(biome: BiomeDef): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const key = biome.id;
  const existing = mistStripCache.get(key);
  if (existing) return existing;

  const W = 1024;
  const H = 180;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  const baseColor =
    biome.id === 'viaduc'
      ? '141, 185, 220'
      : biome.id === 'fleche'
      ? '196, 59, 77'
      : biome.id === 'sanctuaire'
      ? '255, 212, 112'
      : '214, 134, 82';

  // Seamless undulating mist puffs wrapping modulo W
  for (let i = 0; i < 16; i++) {
    const px = (i / 16) * W;
    const py = 96 + Math.sin(i * 1.35) * 18;
    const rx = 140 + (i % 3) * 35;
    const ry = 54 + (i % 2) * 14;
    for (const shift of [0, W, -W]) {
      const grad = ctx.createRadialGradient(px + shift, py, 8, px + shift, py, rx);
      grad.addColorStop(0, `rgba(${baseColor}, 0.13)`);
      grad.addColorStop(0.55, `rgba(${baseColor}, 0.05)`);
      grad.addColorStop(1, `rgba(${baseColor}, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(px + shift, py, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  mistStripCache.set(key, c);
  return c;
}

/**
 * Renders Plan 1 (Distant Horizon Silhouettes). Volumetric fog strata are handled by atmosphere.ts.
 */
export function renderDeepParallaxLayers(
  ctx: CanvasRenderingContext2D,
  biome: BiomeDef,
  W: number,
  H: number,
  camX: number,
  camY: number,
  time: number,
  trauma: number
): void {
  // Plan 1: Distant Gothic Horizon Silhouettes (anchored smoothly in lower horizon band)
  const horizonStrip = getParallaxHorizonStrip(biome, H);
  if (horizonStrip) {
    const p1 = computeParallaxOffset(camX, camY, time, PARALLAX_LAYERS.horizon, horizonStrip.width, trauma);
    const startX = -Math.round(p1.wrapX);
    const dy = Math.round(H * 0.88 - horizonStrip.height - p1.offsetY * 0.45);
    ctx.globalAlpha = PARALLAX_LAYERS.horizon.alpha;
    for (let x = startX; x < W; x += horizonStrip.width) {
      ctx.drawImage(horizonStrip, x, dy);
    }
    ctx.globalAlpha = 1;
  }
}

/**
 * Renders Plan 5 (1.32x Foreground Silhouettes, Hanging Chains, Broken Cornices & Bokeh Embers)
 * framing the arena edges without blocking center combat visibility.
 */
export function renderForegroundParallax(
  ctx: CanvasRenderingContext2D,
  biome: BiomeDef,
  W: number,
  H: number,
  camX: number,
  camY: number,
  time: number,
  trauma: number,
  depthFocus: number
): void {
  const tileW = 820;
  const p5 = computeParallaxOffset(camX, camY, time, PARALLAX_LAYERS.foreground, tileW, trauma);
  const startX = -Math.round(p5.wrapX) - tileW;

  for (let bx = startX; bx < W + tileW; bx += tileW) {
    // Upper gothic stone overhang bracket & hanging chain
    poly(ctx, [bx, 0, bx + 54, 0, bx + 32, 76, bx + 8, 96, bx - 14, 58], 'rgba(4,3,7,.88)');

    // Hanging iron chain silhouette
    const chainX = bx + 420;
    const sway = Math.sin(time * 1.4 + bx * 0.01) * 4;
    ctx.strokeStyle = 'rgba(6, 5, 9, 0.85)';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(chainX, 0);
    ctx.lineTo(chainX + sway, 108);
    ctx.stroke();
    ctx.lineWidth = 1;

    // Lower near-camera foreground stone spire silhouette (kept low at bottom edge)
    poly(ctx, [bx + 210, H, bx + 228, H - 46, bx + 258, H - 32, bx + 276, H], 'rgba(4,3,7,.9)');
  }

  // Soft out-of-focus foreground bokeh embers drifting rapidly at 1.32x parallax
  const glow = getColoredGlow(
    biome.id === 'viaduc' ? 'astral' : biome.id === 'fleche' ? 'crimson' : 'amber'
  );
  if (glow) {
    ctx.globalAlpha = 0.24 + depthFocus * 0.14;
    for (let i = 0; i < 6; i++) {
      const fx = (((i * 290 - camX * 1.32 + time * (24 + i * 5)) % (W + 160)) + (W + 160)) % (W + 160) - 80;
      const fy = (((i * 155 - camY * 0.5 - time * (16 + i * 3)) % H) + H) % H;
      const sz = 26 + (i % 3) * 14;
      ctx.drawImage(glow, Math.round(fx - sz * 0.5), Math.round(fy - sz * 0.5), sz, sz);
    }
    ctx.globalAlpha = 1;
  }

  // Subtle dynamic combat focus perimeter darkening (trauma / boss focus)
  if (depthFocus > 0.05) {
    ctx.fillStyle = `rgba(4, 3, 7, ${depthFocus * 0.26})`;
    ctx.fillRect(0, 0, W, 18);
    ctx.fillRect(0, H - 18, W, 18);
  }
}
