import { getColoredGlow, getGodRaySprite } from './textures';
import type { BiomeDef, QualityLevel } from './types';

export interface FogStratumSpec {
  id: 'deep' | 'mid' | 'abyss';
  factorX: number;
  factorY: number;
  windSpeedX: number;
  baseAlpha: number;
  breathAmp: number;
  breathFreq: number;
  baseYRatio: number;
  verticalBobPx: number;
  scaleY: number;
}

export interface FogStratumTransform {
  wrapX: number;
  y: number;
  alpha: number;
}

export interface DustMoteSpec {
  id: number;
  seedX: number;
  seedY: number;
  depthFactor: number;
  driftX: number;
  riseSpeedY: number;
  swayAmp: number;
  swayFreq: number;
  phase: number;
  size: number;
  kind: 'dust' | 'ash' | 'ember' | 'halo';
}

export interface DustMotePose {
  x: number;
  y: number;
  alpha: number;
  tilt: number;
}

export const ATMOS_FOG_STRATA: readonly FogStratumSpec[] = [
  {
    id: 'deep',
    factorX: 0.16,
    factorY: 0.06,
    windSpeedX: -9,
    baseAlpha: 0.34,
    breathAmp: 0.06,
    breathFreq: 0.45,
    baseYRatio: 0.36,
    verticalBobPx: 10,
    scaleY: 1.15,
  },
  {
    id: 'mid',
    factorX: 0.26,
    factorY: 0.11,
    windSpeedX: 18,
    baseAlpha: 0.46,
    breathAmp: 0.08,
    breathFreq: 0.62,
    baseYRatio: 0.54,
    verticalBobPx: 12,
    scaleY: 1.0,
  },
  {
    id: 'abyss',
    factorX: 0.55,
    factorY: 0.22,
    windSpeedX: 28,
    baseAlpha: 0.52,
    breathAmp: 0.09,
    breathFreq: 0.78,
    baseYRatio: 0.74,
    verticalBobPx: 8,
    scaleY: 0.92,
  },
];

function hashNorm(i: number, salt: number): number {
  const n = Math.sin(i * 91.345 + salt * 47.17) * 43758.5453;
  return n - Math.floor(n);
}

/**
 * Pure, deterministic transform for each animated volumetric fog stratum.
 */
export function computeFogStratumTransform(
  cameraX: number,
  cameraY: number,
  time: number,
  stratum: FogStratumSpec,
  tileWidth: number,
  viewportH: number
): FogStratumTransform {
  const safeW = Math.max(1, tileWidth);
  const rawX = cameraX * stratum.factorX + time * stratum.windSpeedX;
  const wrapX = ((rawX % safeW) + safeW) % safeW;
  const clampedCamY = Math.max(-90, Math.min(90, cameraY * stratum.factorY));
  const bob = Math.sin(time * stratum.breathFreq + stratum.factorX * 10) * stratum.verticalBobPx;
  const y = Math.round(viewportH * stratum.baseYRatio - clampedCamY * 0.5 + bob);
  const alpha = Math.max(
    0.1,
    Math.min(0.9, stratum.baseAlpha + Math.sin(time * stratum.breathFreq * 0.85 + stratum.windSpeedX) * stratum.breathAmp)
  );
  return { wrapX, y, alpha };
}

/**
 * Computes gentle breathing opacity for animated crepuscular light shafts.
 */
export function computeLightShaftAlpha(time: number, index: number): number {
  const wave = Math.sin(time * 0.55 + index * 2.1) * 0.5 + 0.5;
  return 0.07 + wave * 0.13;
}

/**
 * Generates a fixed, reusable field of multi-plane floating dust motes, ash flakes, and embers.
 */
export function createDustSeedField(count = 52): DustMoteSpec[] {
  const list: DustMoteSpec[] = [];
  for (let i = 0; i < count; i++) {
    const r0 = hashNorm(i, 1);
    const r1 = hashNorm(i, 2);
    const r2 = hashNorm(i, 3);
    const r3 = hashNorm(i, 4);

    let kind: DustMoteSpec['kind'] = 'dust';
    let depthFactor = 0.2;
    let size = 1.4 + r2 * 1.4;
    let riseSpeedY = 8 + r3 * 12;

    if (i % 7 === 0) {
      kind = 'halo';
      depthFactor = 0.48;
      size = 14 + r2 * 10;
      riseSpeedY = 12 + r3 * 10;
    } else if (i % 3 === 0) {
      kind = 'ember';
      depthFactor = 0.38;
      size = 1.6 + r2 * 1.6;
      riseSpeedY = 18 + r3 * 18;
    } else if (i % 2 === 0) {
      kind = 'ash';
      depthFactor = 0.32;
      size = 2.0 + r2 * 1.8;
      riseSpeedY = 10 + r3 * 11;
    }

    list.push({
      id: i,
      seedX: r0,
      seedY: r1,
      depthFactor,
      driftX: (r2 - 0.32) * 22,
      riseSpeedY,
      swayAmp: 12 + r3 * 24,
      swayFreq: 0.65 + r0 * 1.15,
      phase: r1 * Math.PI * 2,
      size,
      kind,
    });
  }
  return list;
}

/**
 * Evaluates seamless wrapped viewport coordinates, flicker opacity, and tilt for a floating mote.
 */
export function evaluateDustMote(
  mote: DustMoteSpec,
  cameraX: number,
  cameraY: number,
  time: number,
  viewportW: number,
  viewportH: number
): DustMotePose {
  const spanX = Math.max(120, viewportW + 80);
  const spanY = Math.max(120, viewportH + 60);
  const sway = Math.sin(time * mote.swayFreq + mote.phase) * mote.swayAmp;
  const rawX = mote.seedX * spanX - cameraX * mote.depthFactor + time * mote.driftX + sway;
  const rawY = mote.seedY * spanY - cameraY * (mote.depthFactor * 0.45) - time * mote.riseSpeedY;

  const x = (((rawX % spanX) + spanX) % spanX) - 40;
  const y = (((rawY % spanY) + spanY) % spanY) - 30;

  const shimmer = 0.58 + 0.42 * Math.sin(time * (1.4 + mote.swayFreq) + mote.phase * 1.7);
  const baseAlpha =
    mote.kind === 'halo' ? 0.28 : mote.kind === 'ember' ? 0.78 : mote.kind === 'ash' ? 0.56 : 0.48;
  const alpha = Math.max(0.08, Math.min(1, baseAlpha * shimmer));
  const tilt = Math.sin(time * mote.swayFreq + mote.phase) * 0.65;
  return { x, y, alpha, tilt };
}

const DEFAULT_DUST_FIELD: DustMoteSpec[] = createDustSeedField(52);
const fogRibbonCache = new Map<string, HTMLCanvasElement>();

function getBiomeFogRgb(biome: BiomeDef): { primary: string; secondary: string; dustRgb: string; emberRgb: string } {
  switch (biome.id) {
    case 'viaduc':
      return {
        primary: '141, 185, 220',
        secondary: '86, 128, 168',
        dustRgb: '204, 226, 245',
        emberRgb: '142, 204, 255',
      };
    case 'fleche':
      return {
        primary: '196, 59, 77',
        secondary: '112, 34, 48',
        dustRgb: '232, 186, 182',
        emberRgb: '255, 114, 118',
      };
    case 'sanctuaire':
      return {
        primary: '255, 212, 112',
        secondary: '176, 132, 62',
        dustRgb: '248, 234, 198',
        emberRgb: '255, 224, 128',
      };
    default:
      return {
        primary: '214, 134, 82',
        secondary: '118, 92, 126',
        dustRgb: '226, 212, 192',
        emberRgb: '255, 168, 76',
      };
  }
}

/**
 * Pre-bakes a seamless 1024x220 volumetric wisp strip per biome & stratum variant.
 * Uses scaled radial gradients so every wisp feathers smoothly to 0 alpha without horizontal seams.
 */
export function getVolumetricFogRibbon(biome: BiomeDef, stratumId: FogStratumSpec['id']): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const key = `${biome.id}|${stratumId}`;
  const existing = fogRibbonCache.get(key);
  if (existing) return existing;

  if (fogRibbonCache.size > 12) fogRibbonCache.clear();

  const W = 1024;
  const H = 220;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  const palette = getBiomeFogRgb(biome);
  const rgb = stratumId === 'deep' ? palette.secondary : palette.primary;
  const puffCount = stratumId === 'abyss' ? 18 : 14;
  const coreAlpha = stratumId === 'abyss' ? 0.16 : stratumId === 'mid' ? 0.13 : 0.1;

  for (let i = 0; i < puffCount; i++) {
    const rA = hashNorm(i, stratumId === 'deep' ? 11 : stratumId === 'mid' ? 23 : 37);
    const rB = hashNorm(i, 53);
    const px = (i / puffCount) * W + rA * 28;
    const py = H * 0.5 + Math.sin(i * 1.4 + rB * 3) * 22;
    const rx = 145 + rA * 75;
    const ry = 44 + rB * 22;
    const yScale = ry / rx;

    for (const shift of [0, W, -W]) {
      ctx.save();
      ctx.translate(px + shift, py);
      ctx.scale(1, yScale);
      const grad = ctx.createRadialGradient(0, 0, 4, 0, 0, rx);
      grad.addColorStop(0, `rgba(${rgb}, ${coreAlpha})`);
      grad.addColorStop(0.5, `rgba(${rgb}, ${(coreAlpha * 0.4).toFixed(3)})`);
      grad.addColorStop(1, `rgba(${rgb}, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  fogRibbonCache.set(key, c);
  return c;
}

/**
 * Renders animated crepuscular light shafts + deep & mid volumetric fog strata behind the midground colonnade.
 */
export function renderDeepAtmosphericDecor(
  ctx: CanvasRenderingContext2D,
  biome: BiomeDef,
  W: number,
  H: number,
  camX: number,
  camY: number,
  time: number,
  isTitle: boolean,
  quality: QualityLevel = 'high'
): void {
  if (quality === 'off') return;
  // 1. Subtle shifting volumetric god-rays anchored at 0.22x depth
  const ray = getGodRaySprite();
  if (ray) {
    const raySpan = 1600;
    const baseShift = (((camX * 0.22 + time * 4) % raySpan) + raySpan) % raySpan;
    const rayLimit = quality === 'medium' ? 2 : 3;
    for (let i = 0; i < rayLimit; i++) {
      const rx = ((i * 540 - baseShift + Math.sin(time * 0.32 + i * 1.7) * 34) % (W + 360) + (W + 360)) % (W + 360) - 180;
      if (isTitle && rx < W * 0.36) continue;
      ctx.save();
      ctx.globalAlpha = computeLightShaftAlpha(time, i);
      ctx.translate(Math.round(rx), -36);
      ctx.rotate(-0.22 + Math.sin(time * 0.25 + i) * 0.02);
      ctx.drawImage(ray, -110, 0, 220, Math.round(H * 1.08));
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  // 2. Deep & mid drifting volumetric fog strata
  for (const stratum of ATMOS_FOG_STRATA) {
    if (stratum.id === 'abyss') continue;
    if (quality === 'medium' && stratum.id === 'deep') continue;
    const ribbon = getVolumetricFogRibbon(biome, stratum.id);
    if (!ribbon) continue;
    const tr = computeFogStratumTransform(camX, camY, time, stratum, ribbon.width, H);
    const startX = -Math.round(tr.wrapX);
    const drawH = Math.round(ribbon.height * stratum.scaleY);
    ctx.globalAlpha = isTitle ? tr.alpha * 0.8 : tr.alpha;
    for (let x = startX; x < W; x += ribbon.width) {
      ctx.drawImage(ribbon, x, tr.y, ribbon.width, drawH);
    }
  }
  ctx.globalAlpha = 1;
}

/**
 * Renders foreground-depth abyssal mist and multi-plane floating dust motes, ash flakes & luminous embers.
 */
export function renderMidAtmosphereAndDust(
  ctx: CanvasRenderingContext2D,
  biome: BiomeDef,
  W: number,
  H: number,
  camX: number,
  camY: number,
  time: number,
  isTitle: boolean,
  quality: QualityLevel = 'high'
): void {
  if (quality === 'off') return;
  // 1. Low abyssal volumetric fog hugging chasms and floor horizon
  const abyssSpec = ATMOS_FOG_STRATA[2];
  const abyssRibbon = getVolumetricFogRibbon(biome, 'abyss');
  if (abyssRibbon) {
    const tr = computeFogStratumTransform(camX, camY, time, abyssSpec, abyssRibbon.width, H);
    const startX = -Math.round(tr.wrapX);
    const drawH = Math.round(abyssRibbon.height * abyssSpec.scaleY);
    ctx.globalAlpha = isTitle ? tr.alpha * 0.65 : tr.alpha;
    for (let x = startX; x < W; x += abyssRibbon.width) {
      ctx.drawImage(abyssRibbon, x, tr.y, abyssRibbon.width, drawH);
    }
    ctx.globalAlpha = 1;
  }

  // 2. Multi-plane floating dust motes, tumbling ash flakes & glowing embers
  const palette = getBiomeFogRgb(biome);
  const glowName = biome.id === 'viaduc' ? 'astral' : biome.id === 'fleche' ? 'crimson' : biome.id === 'sanctuaire' ? 'gold' : 'amber';
  const haloGlow = getColoredGlow(glowName);

  const step = quality === 'medium' ? 2 : 1;
  for (let idx = 0; idx < DEFAULT_DUST_FIELD.length; idx += step) {
    const mote = DEFAULT_DUST_FIELD[idx];
    const pose = evaluateDustMote(mote, camX, camY, time, W, H);
    if (isTitle && pose.x < W * 0.34 && mote.kind === 'halo') continue;

    ctx.globalAlpha = pose.alpha;
    if (mote.kind === 'halo' && haloGlow) {
      const sz = Math.round(mote.size);
      ctx.drawImage(haloGlow, Math.round(pose.x - sz * 0.5), Math.round(pose.y - sz * 0.5), sz, sz);
    } else if (mote.kind === 'ember') {
      ctx.fillStyle = `rgb(${palette.emberRgb})`;
      ctx.beginPath();
      ctx.arc(pose.x, pose.y, mote.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (mote.kind === 'ash') {
      ctx.save();
      ctx.translate(pose.x, pose.y);
      ctx.rotate(pose.tilt);
      ctx.fillStyle = `rgb(${palette.dustRgb})`;
      ctx.fillRect(-mote.size * 0.7, -mote.size * 0.28, mote.size * 1.4, mote.size * 0.56);
      ctx.restore();
    } else {
      ctx.fillStyle = `rgb(${palette.dustRgb})`;
      ctx.fillRect(pose.x, pose.y, mote.size, mote.size);
    }
  }
  ctx.globalAlpha = 1;
}
