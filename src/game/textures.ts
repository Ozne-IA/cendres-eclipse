import { BIOME_BACKDROP_URLS, BIOME_BACKDROP_V2_URLS, TITLE_HERO_ARTWORK_URL } from '../artwork';
import { mkGrad, poly } from './renderPrimitives';
import type { BiomeDef } from './types';

let preferCinematicArt = true;

export function setPreferCinematicArt(value: boolean): void {
  preferCinematicArt = value;
}

export function getPreferCinematicArt(): boolean {
  return preferCinematicArt;
}

let titleArtworkImg: HTMLImageElement | null = null;
let titleArtworkReady = false;
let titleArtworkFailed = false;

export function getTitleHeroArtwork(): HTMLImageElement | null {
  if (typeof Image === 'undefined') return null;
  if (titleArtworkImg) {
    return titleArtworkReady && titleArtworkImg.naturalWidth > 0 ? titleArtworkImg : null;
  }
  const img = new Image();
  img.decoding = 'async';
  img.onload = () => {
    titleArtworkReady = true;
  };
  img.onerror = () => {
    titleArtworkFailed = true;
  };
  img.src = TITLE_HERO_ARTWORK_URL;
  titleArtworkImg = img;
  return null;
}

const loadedBackdrops = new Map<string, HTMLImageElement>();
const backdropReady = new Set<string>();
const failedCinematicBackdrops = new Set<string>();
const bakedSeamlessCache = new Map<string, HTMLCanvasElement>();

/**
 * Loads a biome backdrop.
 * Preferential order when preferCinematicArt is true:
 *   1. v2 cinematic version (if present and successfully loaded)
 *   2. Classic original version (always available as fallback)
 * This guarantees the game never breaks if v2 assets are missing.
 */
export function getBiomeBackdrop(biomeId: string): HTMLImageElement | null {
  if (typeof Image === 'undefined') return null;
  const key = BIOME_BACKDROP_URLS[biomeId] ? biomeId : 'catacombes';

  // --- Try cinematic v2 first ---
  if (preferCinematicArt && BIOME_BACKDROP_V2_URLS[key] && !failedCinematicBackdrops.has(key)) {
    const v2Key = `v2:${key}`;
    if (backdropReady.has(v2Key)) return loadedBackdrops.get(v2Key)!;
    if (!loadedBackdrops.has(v2Key)) {
      const imgV2 = new Image();
      imgV2.decoding = 'async';
      imgV2.onload = () => {
        backdropReady.add(v2Key);
      };
      imgV2.onerror = () => {
        failedCinematicBackdrops.add(key);
        console.info(`[textures] cinematic backdrop not found for "${key}", using classic`);
      };
      imgV2.src = BIOME_BACKDROP_V2_URLS[key];
      loadedBackdrops.set(v2Key, imgV2);
    }
    return backdropReady.has(key) ? loadedBackdrops.get(key)! : null;
  }

  // --- Classic fallback (original behaviour) ---
  if (loadedBackdrops.has(key)) {
    return backdropReady.has(key) ? loadedBackdrops.get(key)! : null;
  }
  const img = new Image();
  img.decoding = 'async';
  img.onload = () => {
    backdropReady.add(key);
  };
  img.src = BIOME_BACKDROP_URLS[key];
  loadedBackdrops.set(key, img);
  return null;
}

export function getSeamlessBakedBackdrop(
  biome: BiomeDef,
  W: number,
  H: number,
  isTitle: boolean
): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const img = isTitle && !titleArtworkFailed ? null : getBiomeBackdrop(biome.id);
  const hasImg = !!(img && img.naturalWidth > 0);
  const cacheKey = `${biome.id}|${W}|${H}|${img?.src ?? 'gradient'}|${isTitle ? 1 : 0}|${preferCinematicArt ? 'c' : 'o'}`;
  const existing = bakedSeamlessCache.get(cacheKey);
  if (existing) return existing;

  if (bakedSeamlessCache.size > 8) {
    bakedSeamlessCache.clear();
  }

  const c = document.createElement('canvas');
  c.width = W * 3;
  c.height = H;
  const gctx = c.getContext('2d');
  if (!gctx) return null;

  if (hasImg && img) {
    const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight);
    const dw = Math.ceil(img.naturalWidth * scale);
    const dh = Math.ceil(img.naturalHeight * scale);
    const dy = Math.round((H - dh) * 0.5);
    const dx = Math.round((W - dw) * 0.5);

    gctx.drawImage(img, dx, dy, dw, dh);
    gctx.save();
    gctx.translate(W * 2 - dx, dy);
    gctx.scale(-1, 1);
    gctx.drawImage(img, 0, 0, dw, dh);
    gctx.restore();
    gctx.drawImage(img, W * 2 + dx, dy, dw, dh);

    gctx.fillStyle = mkGrad(gctx, 0, 0, 0, H, null, [
      [0, preferCinematicArt ? 'rgba(7, 5, 10, 0.44)' : 'rgba(7, 5, 10, 0.56)'],
      [0.45, preferCinematicArt ? 'rgba(9, 7, 12, 0.28)' : 'rgba(9, 7, 12, 0.36)'],
      [1, preferCinematicArt ? 'rgba(7, 6, 9, 0.68)' : 'rgba(7, 6, 9, 0.74)'],
    ]);
    gctx.fillRect(0, 0, W * 3, H);
  } else {
    gctx.fillStyle = mkGrad(gctx, 0, 0, 0, H, null, [
      [0, biome.skyTop],
      [0.65, biome.skyBot],
      [1, '#09070b'],
    ]);
    gctx.fillRect(0, 0, W * 3, H);
  }

  gctx.fillStyle = mkGrad(gctx, 0, H * 0.56, 0, H, null, [
    [0, 'rgba(0, 0, 0, 0)'],
    [0.6, biome.fogColor],
    [1, 'rgba(7, 6, 9, 0.48)'],
  ]);
  gctx.fillRect(0, H * 0.56, W * 3, H * 0.44);

  // Pre-baked diagonal volumetric god-rays across the seamless strip
  const ray = getGodRaySprite();
  if (ray) {
    gctx.save();
    gctx.globalAlpha = 0.24;
    for (const rx of [W * 0.42, W * 0.85, W * 1.48, W * 2.42]) {
      gctx.save();
      gctx.translate(rx, -30);
      gctx.rotate(-0.24);
      gctx.drawImage(ray, -100, 0, 200, H * 1.15);
      gctx.restore();
    }
    gctx.restore();
  }

  if (isTitle) {
    const scrimW = Math.round(W * 0.62);
    gctx.fillStyle = mkGrad(gctx, 0, 0, scrimW, 0, null, [
      [0, 'rgba(7, 5, 9, 0.82)'],
      [0.55, 'rgba(7, 5, 9, 0.48)'],
      [1, 'rgba(7, 5, 9, 0)'],
    ]);
    gctx.fillRect(0, 0, scrimW, H);
    gctx.fillRect(W, 0, scrimW, H);
    gctx.fillRect(W * 2, 0, scrimW, H);
  }

  bakedSeamlessCache.set(cacheKey, c);
  return c;
}

function hash2D(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

const stonePatterns = new Map<string, CanvasPattern>();
const stoneCanvases = new Map<string, HTMLCanvasElement>();
const cornicePatterns = new Map<string, CanvasPattern>();
const corniceCanvases = new Map<string, HTMLCanvasElement>();

function drawChippedBlock(
  ctx: CanvasRenderingContext2D,
  bx: number,
  by: number,
  bw: number,
  bh: number,
  biome: BiomeDef,
  seed: number,
  colIdx: number,
  rowIdx: number,
): void {
  const rnd = hash2D(colIdx + 11, rowIdx + 5, seed);
  const rnd2 = hash2D(colIdx * 3 + 7, rowIdx * 5 + 2, seed + 13);
  const cham = 2.4;

  poly(
    ctx,
    [
      bx + cham, by,
      bx + bw - cham, by,
      bx + bw, by + cham,
      bx + bw, by + bh - cham,
      bx + bw - cham, by + bh,
      bx + cham, by + bh,
      bx, by + bh - cham,
      bx, by + cham,
    ],
    biome.stone
  );

  // Per-block mineral hue & tonal variation
  if (rnd > 0.5) {
    ctx.fillStyle = `rgba(255, 232, 198, ${(rnd - 0.5) * 0.14})`;
    ctx.fill();
  } else {
    ctx.fillStyle = `rgba(0, 0, 0, ${(0.54 - rnd) * 0.42})`;
    ctx.fill();
  }

  // Directional top-to-bottom stone face weathering
  ctx.fillStyle = mkGrad(ctx, 0, by, 0, by + bh, null, [
    [0, 'rgba(255, 235, 200, 0.09)'],
    [0.28, 'rgba(255, 235, 200, 0.02)'],
    [0.68, 'rgba(0, 0, 0, 0.12)'],
    [1, 'rgba(0, 0, 0, 0.42)'],
  ]);
  ctx.fill();

  ctx.save();
  ctx.clip();

  // Chiseled top & left rim bevel
  ctx.strokeStyle = 'rgba(255, 235, 204, 0.12)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(bx + 1, by + bh - cham);
  ctx.lineTo(bx + 1, by + cham);
  ctx.lineTo(bx + cham, by + 1);
  ctx.lineTo(bx + bw - cham, by + 1);
  ctx.stroke();

  // Deep recessed bottom-right ambient occlusion
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.46)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(bx + bw - 1, by + cham);
  ctx.lineTo(bx + bw - 1, by + bh - cham);
  ctx.lineTo(bx + bw - cham, by + bh - 1);
  ctx.lineTo(bx + cham, by + bh - 1);
  ctx.stroke();

  // Surface pitting, chisel marks & ash stains
  for (let g = 0; g < 18; g++) {
    const gx = bx + 3 + hash2D(colIdx * 17 + g, rowIdx * 23, seed) * Math.max(4, bw - 6);
    const gy = by + 3 + hash2D(colIdx * 31, rowIdx * 19 + g, seed + 3) * Math.max(4, bh - 6);
    const pw = 1.5 + hash2D(g, colIdx, seed + 17) * 3.5;
    const ph = 1 + hash2D(g, rowIdx, seed + 21) * 1.4;
    const dark = hash2D(g, colIdx + rowIdx, seed + 9) > 0.36;
    ctx.fillStyle = dark ? 'rgba(6, 4, 9, 0.32)' : 'rgba(255, 238, 214, 0.065)';
    ctx.fillRect(gx, gy, pw, ph);
  }

  // Chipped corner notch or soot smudge
  if (rnd2 > 0.62) {
    const sx = bx + bw * (0.2 + rnd * 0.5);
    ctx.fillStyle = 'rgba(6, 4, 8, 0.22)';
    ctx.beginPath();
    ctx.ellipse(sx, by + bh * 0.82, bw * 0.22, bh * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Deep weathered fractures & biome mineral veins
  if (rnd > 0.48) {
    ctx.strokeStyle = 'rgba(5, 3, 8, 0.62)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    const cx = bx + bw * (0.22 + rnd2 * 0.54);
    const cy = by + 1;
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + (rnd - 0.5) * 12, cy + bh * 0.38);
    ctx.lineTo(cx + (rnd2 - 0.5) * 14, cy + bh * 0.72);
    ctx.lineTo(cx + (rnd - 0.4) * 10, cy + bh - 1);
    ctx.stroke();

    // Subtle mineral sheen next to crack
    ctx.strokeStyle =
      biome.id === 'sanctuaire'
        ? 'rgba(222, 176, 86, 0.22)'
        : biome.id === 'fleche'
        ? 'rgba(186, 52, 68, 0.22)'
        : biome.id === 'viaduc'
        ? 'rgba(130, 182, 220, 0.16)'
        : 'rgba(255, 198, 132, 0.11)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(cx + 1.2, cy + 2);
    ctx.lineTo(cx + 1.2 + (rnd - 0.5) * 12, cy + bh * 0.38);
    ctx.stroke();
  }

  ctx.restore();
}

export function getStoneTileCanvas(biome: BiomeDef): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const cached = stoneCanvases.get(biome.id);
  if (cached) return cached;

  const w = 512;
  const h = 256;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  // Deep recessed mortar bed
  ctx.fillStyle = '#09060c';
  ctx.fillRect(0, 0, w, h);

  const seed =
    biome.id === 'viaduc' ? 19 : biome.id === 'fleche' ? 41 : biome.id === 'sanctuaire' ? 73 : 7;

  const rowHeights = [32, 30, 36, 30];
  const widths = [72, 52, 88, 60, 84, 56, 96, 64, 76, 68, 92];

  let ry = 0;
  for (let r = 0; r < 8; r++) {
    const rh = rowHeights[r % 4];
    let rx = (r % 2) * -32;
    let colIdx = 0;

    while (rx < w) {
      const bwRaw = widths[(colIdx + r * 3) % widths.length];
      const bx = rx + 1.5;
      const by = ry + 1.5;
      const bw = bwRaw - 3;
      const bh = rh - 3;

      drawChippedBlock(ctx, bx, by, bw, bh, biome, seed, colIdx, r);

      // Wrap tile cleanly across left/right boundary if straddling x = 0 or x = w
      if (rx < 0) {
        drawChippedBlock(ctx, bx + w, by, bw, bh, biome, seed, colIdx, r);
      } else if (rx + bwRaw > w) {
        drawChippedBlock(ctx, bx - w, by, bw, bh, biome, seed, colIdx, r);
      }

      rx += bwRaw;
      colIdx++;
    }
    ry += rh;
  }

  stoneCanvases.set(biome.id, c);
  return c;
}

export function getStonePattern(
  ctx: CanvasRenderingContext2D,
  biome: BiomeDef
): CanvasPattern | null {
  const key = biome.id;
  if (stonePatterns.has(key)) return stonePatterns.get(key)!;
  const tile = getStoneTileCanvas(biome);
  if (!tile) return null;
  const pat = ctx.createPattern(tile, 'repeat');
  if (pat) stonePatterns.set(key, pat);
  return pat;
}

export function getSculptedCorniceCanvas(biome: BiomeDef): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const cached = corniceCanvases.get(biome.id);
  if (cached) return cached;

  const w = 512;
  const h = 16;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  const seed =
    biome.id === 'viaduc' ? 109 : biome.id === 'fleche' ? 211 : biome.id === 'sanctuaire' ? 313 : 41;

  ctx.fillStyle = '#0c080f';
  ctx.fillRect(0, 0, w, h);

  let x = 0;
  let idx = 0;
  while (x < w) {
    const segW = 28 + Math.floor(hash2D(idx, 1, seed) * 28);
    const drawW = Math.min(segW, w - x);
    const tone = hash2D(idx, 2, seed);

    ctx.fillStyle = mkGrad(ctx, 0, 0, 0, h, null, [
      [0, biome.trim],
      [0.55, biome.stone],
      [1, '#120d16'],
    ]);
    ctx.fillRect(x + 0.8, 0, Math.max(2, drawW - 1.6), h - 2);

    if (tone > 0.5) {
      ctx.fillStyle = `rgba(255, 232, 195, ${(tone - 0.5) * 0.24})`;
      ctx.fillRect(x + 1, 0, Math.max(2, drawW - 2), 4);
    }

    // Specular beveled top edge with weathered breaks
    ctx.fillStyle = 'rgba(255, 240, 212, 0.28)';
    ctx.fillRect(x + 1.5, 0, Math.max(1, drawW - 3), 1.8);

    // Chiseled dentil underside tooth
    if (drawW > 12) {
      ctx.fillStyle = '#1b141e';
      ctx.fillRect(x + 3, h - 5, drawW - 6, 4);
      ctx.fillStyle = 'rgba(255, 224, 180, 0.08)';
      ctx.fillRect(x + 4, h - 5, drawW - 8, 1);
    }

    // Subtle vertical joint seam
    ctx.fillStyle = 'rgba(6, 4, 8, 0.42)';
    ctx.fillRect(x, 1, 1.2, h - 3);

    x += segW;
    idx++;
  }

  corniceCanvases.set(biome.id, c);
  return c;
}

export function getCornicePattern(
  ctx: CanvasRenderingContext2D,
  biome: BiomeDef
): CanvasPattern | null {
  const key = biome.id;
  if (cornicePatterns.has(key)) return cornicePatterns.get(key)!;
  const tile = getSculptedCorniceCanvas(biome);
  if (!tile) return null;
  const pat = ctx.createPattern(tile, 'repeat');
  if (pat) cornicePatterns.set(key, pat);
  return pat;
}

let godRayCanvas: HTMLCanvasElement | null = null;
export function getGodRaySprite(): HTMLCanvasElement | null {
  if (godRayCanvas || typeof document === 'undefined') return godRayCanvas;
  const w = 240;
  const h = 640;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  const grad = mkGrad(ctx, 0, 0, 0, h, null, [
    [0, 'rgba(255, 214, 145, 0.26)'],
    [0.45, 'rgba(235, 168, 92, 0.11)'],
    [1, 'rgba(220, 120, 60, 0)'],
  ]);

  const hMask = mkGrad(ctx, 0, 0, w, 0, null, [
    [0, 'rgba(0,0,0,0)'],
    [0.3, 'rgba(255,255,255,1)'],
    [0.5, 'rgba(255,255,255,1)'],
    [1, 'rgba(0,0,0,0)'],
  ]);

  poly(ctx, [w * 0.34, 0, w * 0.66, 0, w, h, 0, h], grad);

  ctx.globalCompositeOperation = 'destination-in';
  ctx.fillStyle = hMask;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';

  godRayCanvas = c;
  return godRayCanvas;
}

const glowCache = new Map<string, HTMLCanvasElement>();

export function getColoredGlow(
  name: 'amber' | 'crimson' | 'astral' | 'gold' | 'emerald'
): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  if (glowCache.has(name)) return glowCache.get(name)!;

  const specs: Record<string, [number, number, number, number, number]> = {
    amber: [255, 148, 56, 0.44, 0.16],
    crimson: [224, 48, 72, 0.42, 0.14],
    astral: [122, 188, 255, 0.36, 0.12],
    gold: [255, 220, 118, 0.52, 0.18],
    emerald: [88, 210, 145, 0.34, 0.11],
  };
  const [r, g, b, innerA, midA] = specs[name];

  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  const grad = ctx.createRadialGradient(128, 128, 2, 128, 128, 128);
  grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${innerA})`);
  grad.addColorStop(0.28, `rgba(${r}, ${g}, ${b}, ${midA})`);
  grad.addColorStop(0.68, `rgba(${r}, ${g}, ${b}, ${midA * 0.25})`);
  grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);

  glowCache.set(name, c);
  return c;
}
