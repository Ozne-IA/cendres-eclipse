import type { BiomeDef } from './types';

// === Classic (original) backdrop paths — kept intact ===
const BIOME_BACKDROP_URLS: Record<string, string> = {
  catacombes: '/src/assets/images/biome_catacombes_bg_1795125904324.jpg',
  viaduc: '/src/assets/images/biome_viaduc_bg_1795125905664.jpg',
  fleche: '/src/assets/images/biome_fleche_bg_1795125905927.jpg',
  sanctuaire: '/src/assets/images/biome_sanctuaire_bg_1795125905684.jpg',
};

// === NEW cinematic v2 backdrops (non-destructive) ===
// If a v2 file is missing, the system automatically falls back to the classic version.
const BIOME_BACKDROP_V2_URLS: Record<string, string> = {
  catacombes: '/src/assets/images/v2/biome_catacombes_v2.jpg',
  viaduc: '/src/assets/images/v2/biome_viaduc_v2.jpg',
  fleche: '/src/assets/images/v2/biome_fleche_v2.jpg',
  sanctuaire: '/src/assets/images/v2/biome_sanctuaire_v2.jpg',
};

let preferCinematicArt = true;

export function setPreferCinematicArt(value: boolean): void {
  preferCinematicArt = value;
}

export function getPreferCinematicArt(): boolean {
  return preferCinematicArt;
}

const TITLE_HERO_ARTWORK_URL = '/assets/aistudio/Creating_video_game_hero_concept_082510a8_2K_39b1471f.webp';
let titleArtworkImg: HTMLImageElement | null = null;
let titleArtworkReady = false;

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
  img.src = TITLE_HERO_ARTWORK_URL;
  titleArtworkImg = img;
  return null;
}

const loadedBackdrops = new Map<string, HTMLImageElement>();
const backdropReady = new Set<string>();
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
  if (preferCinematicArt && BIOME_BACKDROP_V2_URLS[key]) {
    const v2Key = `v2:${key}`;
    if (loadedBackdrops.has(v2Key)) {
      if (backdropReady.has(v2Key)) {
        return loadedBackdrops.get(v2Key)!;
      }
      // v2 is still loading or failed → fall through to classic
    } else {
      const imgV2 = new Image();
      imgV2.decoding = 'async';
      imgV2.onload = () => {
        backdropReady.add(v2Key);
      };
      imgV2.onerror = () => {
        // Explicitly do not mark ready so we keep falling back
        console.info(`[textures] cinematic backdrop not found for "${key}", using classic`);
      };
      imgV2.src = BIOME_BACKDROP_V2_URLS[key];
      loadedBackdrops.set(v2Key, imgV2);
      // This frame returns null / classic; next frames will pick v2 once ready
    }
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
  const img = getBiomeBackdrop(biome.id);
  const hasImg = !!(img && img.naturalWidth > 0);
  const cacheKey = `${biome.id}|${W}|${H}|${img?.src ?? 'gradient'}|${isTitle ? 1 : 0}|${preferCinematicArt ? 'c' : 'o'}`;
  const existing = bakedSeamlessCache.get(cacheKey);
  if (existing) return existing;

  // Keep cache bounded to avoid memory bloat on window resize
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

    const vScrim = gctx.createLinearGradient(0, 0, 0, H);
    vScrim.addColorStop(0, 'rgba(7, 5, 10, 0.56)');
    vScrim.addColorStop(0.45, 'rgba(9, 7, 12, 0.36)');
    vScrim.addColorStop(1, 'rgba(7, 6, 9, 0.74)');
    gctx.fillStyle = vScrim;
    gctx.fillRect(0, 0, W * 3, H);
  } else {
    const grad = gctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, biome.skyTop);
    grad.addColorStop(0.65, biome.skyBot);
    grad.addColorStop(1, '#09070b');
    gctx.fillStyle = grad;
    gctx.fillRect(0, 0, W * 3, H);
  }

  const mistGrad = gctx.createLinearGradient(0, H * 0.56, 0, H);
  mistGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
  mistGrad.addColorStop(0.6, biome.fogColor);
  mistGrad.addColorStop(1, 'rgba(7, 6, 9, 0.48)');
  gctx.fillStyle = mistGrad;
  gctx.fillRect(0, H * 0.56, W * 3, H * 0.44);

  // Pre-baked diagonal volumetric god-rays across the seamless strip (zero per-frame cost)
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
    const tScrim = gctx.createLinearGradient(0, 0, scrimW, 0);
    tScrim.addColorStop(0, 'rgba(7, 5, 9, 0.82)');
    tScrim.addColorStop(0.55, 'rgba(7, 5, 9, 0.48)');
    tScrim.addColorStop(1, 'rgba(7, 5, 9, 0)');
    gctx.fillStyle = tScrim;
    // Tile across all 3 horizontal sections of the strip
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

export function getStoneTileCanvas(biome: BiomeDef): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const cached = stoneCanvases.get(biome.id);
  if (cached) return cached;

  const w = 256;
  const h = 128;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  // Deep recessed mortar base
  ctx.fillStyle = '#110d14';
  ctx.fillRect(0, 0, w, h);

  const seed =
    biome.id === 'viaduc' ? 19 : biome.id === 'fleche' ? 41 : biome.id === 'sanctuaire' ? 73 : 7;

  // Variable-width courses so blocks look hand-hewn rather than a uniform grid
  const rowHeights = [30, 34, 30, 34];
  const courseWidths = [
    [64, 48, 80, 64],
    [48, 80, 64, 64],
    [80, 48, 64, 64],
    [64, 64, 48, 80],
  ];

  let ry = 0;
  for (let r = 0; r < rowHeights.length; r++) {
    const rh = rowHeights[r];
    const widths = courseWidths[r];
    let rx = (r % 2) * -28;
    let colIdx = 0;

    while (rx < w) {
      const bwRaw = widths[colIdx % widths.length];
      const bx = rx + 1;
      const by = ry + 1;
      const bw = bwRaw - 2;
      const bh = rh - 2;
      const rnd = hash2D(colIdx + 11, r + 5, seed);

      // Base stone block
      ctx.fillStyle = biome.stone;
      ctx.fillRect(bx, by, bw, bh);

      // Subtle per-block tone & warm/cool mineral shift
      if (rnd > 0.5) {
        ctx.fillStyle = `rgba(255, 240, 218, ${(rnd - 0.5) * 0.1})`;
        ctx.fillRect(bx, by, bw, bh);
      } else {
        ctx.fillStyle = `rgba(0, 0, 0, ${(0.52 - rnd) * 0.34})`;
        ctx.fillRect(bx, by, bw, bh);
      }

      // Vertical weathering gradient inside each block (lit top, shaded bottom)
      const blkGrad = ctx.createLinearGradient(0, by, 0, by + bh);
      blkGrad.addColorStop(0, 'rgba(255, 236, 205, 0.065)');
      blkGrad.addColorStop(0.55, 'rgba(0, 0, 0, 0)');
      blkGrad.addColorStop(1, 'rgba(0, 0, 0, 0.3)');
      ctx.fillStyle = blkGrad;
      ctx.fillRect(bx, by, bw, bh);

      // Chiseled top/left bevel highlight
      ctx.fillStyle = 'rgba(255, 236, 208, 0.07)';
      ctx.fillRect(bx, by, bw, 1.5);
      ctx.fillRect(bx, by, 1.5, bh);

      // Recessed bottom/right edge shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.32)';
      ctx.fillRect(bx, by + bh - 1.5, bw, 1.5);
      ctx.fillRect(bx + bw - 1.5, by, 1.5, bh);

      // Micro stone pitting & grain speckles
      for (let g = 0; g < 14; g++) {
        const gx = bx + 3 + hash2D(colIdx * 17 + g, r * 23, seed) * Math.max(4, bw - 6);
        const gy = by + 3 + hash2D(colIdx * 31, r * 19 + g, seed + 3) * Math.max(4, bh - 6);
        const dark = hash2D(g, colIdx + r, seed + 9) > 0.4;
        ctx.fillStyle = dark ? 'rgba(0, 0, 0, 0.24)' : 'rgba(255, 240, 220, 0.05)';
        ctx.fillRect(gx, gy, 2.5, 1.4);
      }

      // Hairline fracture or mineral vein on select blocks
      if (rnd > 0.68) {
        ctx.strokeStyle =
          biome.id === 'sanctuaire'
            ? 'rgba(212, 168, 83, 0.22)'
            : biome.id === 'fleche'
            ? 'rgba(180, 52, 68, 0.2)'
            : biome.id === 'viaduc'
            ? 'rgba(128, 178, 212, 0.14)'
            : 'rgba(0, 0, 0, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        const cx = bx + bw * (0.28 + rnd * 0.35);
        const cy = by + 2;
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + 5, cy + bh * 0.45);
        ctx.lineTo(cx + 1, cy + bh * 0.85);
        ctx.stroke();
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

  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(255, 214, 145, 0.26)');
  grad.addColorStop(0.45, 'rgba(235, 168, 92, 0.11)');
  grad.addColorStop(1, 'rgba(220, 120, 60, 0)');

  const hMask = ctx.createLinearGradient(0, 0, w, 0);
  hMask.addColorStop(0, 'rgba(0,0,0,0)');
  hMask.addColorStop(0.3, 'rgba(255,255,255,1)');
  hMask.addColorStop(0.5, 'rgba(255,255,255,1)');
  hMask.addColorStop(1, 'rgba(0,0,0,0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(w * 0.34, 0);
  ctx.lineTo(w * 0.66, 0);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();

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
