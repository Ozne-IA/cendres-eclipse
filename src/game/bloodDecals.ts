import type { EnemyKind, Platform } from './types';

export type BloodTone = 'crimson' | 'ichor' | 'ember_ichor';

export interface BloodLobe {
  dx: number;
  dy: number;
  rx: number;
  ry: number;
}

export interface BloodDrip {
  dx: number;
  width: number;
  maxLen: number;
}

export interface BloodDecal {
  id: number;
  platformIndex: number;
  localX: number;
  poolRx: number;
  poolRy: number;
  tone: BloodTone;
  life: number;
  maxLife: number;
  lobes: BloodLobe[];
  drips: BloodDrip[];
}

export interface BloodDroplet {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  dirX: number;
  intensity: number;
  tone: BloodTone;
  life: number;
}

export interface DecalVisualState {
  alpha: number;
  wetness: number;
  dryMix: number;
}

export interface LandingMatch {
  platformIndex: number;
  y: number;
  clampedX: number;
}

export const MAX_BLOOD_DECALS = 96;
export const MAX_BLOOD_DROPLETS = 64;

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function hashSeed(seed: number, salt: number): number {
  const n = Math.sin(seed * 127.1 + salt * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

export function getBloodToneForEnemy(kind: EnemyKind): BloodTone {
  if (kind === 'watcher' || kind === 'specter') return 'ichor';
  if (kind === 'pyromancer' || kind === 'sovereign') return 'ember_ichor';
  return 'crimson';
}

/**
 * Finds the highest non-broken landing platform crossed downward by a blood droplet.
 */
export function findLandingPlatform(
  x: number,
  prevY: number,
  nextY: number,
  platforms: readonly Platform[]
): LandingMatch | null {
  let bestIdx = -1;
  let bestY = Infinity;

  for (let i = 0; i < platforms.length; i++) {
    const p = platforms[i];
    if (p.broken || p.type === 'bounce' || p.w < 12) continue;
    if (x < p.x + 2 || x > p.x + p.w - 2) continue;
    if (prevY <= p.y + 8 && nextY >= p.y && p.y < bestY) {
      bestY = p.y;
      bestIdx = i;
    }
  }

  if (bestIdx === -1) return null;
  const p = platforms[bestIdx];
  return {
    platformIndex: bestIdx,
    y: p.y,
    clampedX: clamp(x, p.x + 4, p.x + p.w - 4),
  };
}

/**
 * Finds the closest non-broken platform top surface directly beneath (x, y) within maxDropPx.
 */
export function findNearestFloorBelow(
  x: number,
  y: number,
  maxDropPx: number,
  platforms: readonly Platform[]
): LandingMatch | null {
  let bestIdx = -1;
  let bestY = Infinity;

  for (let i = 0; i < platforms.length; i++) {
    const p = platforms[i];
    if (p.broken || p.type === 'bounce' || p.w < 12) continue;
    if (x < p.x + 2 || x > p.x + p.w - 2) continue;
    if (p.y >= y - 10 && p.y <= y + maxDropPx && p.y < bestY) {
      bestY = p.y;
      bestIdx = i;
    }
  }

  if (bestIdx === -1) return null;
  const p = platforms[bestIdx];
  return {
    platformIndex: bestIdx,
    y: p.y,
    clampedX: clamp(x, p.x + 4, p.x + p.w - 4),
  };
}

/**
 * Deterministically builds a procedural blood splatter anchored to a platform surface,
 * clamping every lobe and drip cleanly within platform horizontal bounds and height.
 */
export function buildProceduralSplatter(
  id: number,
  worldX: number,
  platformIndex: number,
  platform: Platform,
  dirX: number,
  intensity: number,
  seed: number,
  tone: BloodTone,
  target?: BloodDecal
): BloodDecal {
  const safeIntensity = clamp(intensity, 0.35, 2.4);
  const rawPoolRx = (10 + hashSeed(seed, 1) * 11) * safeIntensity;
  const maxHalfSpan = Math.max(4, platform.w * 0.5 - 3);
  const poolRx = Math.min(rawPoolRx, maxHalfSpan);
  const poolRy = 2.4 + safeIntensity * 1.45;

  const minLocal = Math.min(platform.w * 0.5, poolRx + 3);
  const maxLocal = Math.max(minLocal, platform.w - poolRx - 3);
  const localX = clamp(worldX - platform.x, minLocal, maxLocal);

  const dirSign = dirX >= 0 ? 1 : -1;
  const lobeCount = Math.min(5, Math.max(2, Math.round(1.5 + safeIntensity * 1.6)));
  const lobes: BloodLobe[] = target?.lobes ?? [];

  for (let i = 0; i < lobeCount; i++) {
    const r0 = hashSeed(seed, 10 + i * 3);
    const r1 = hashSeed(seed, 11 + i * 3);
    const r2 = hashSeed(seed, 12 + i * 3);
    const rx = Math.min(maxHalfSpan * 0.6, (2.8 + r1 * 5.2) * Math.min(1.5, safeIntensity));
    const ry = 1.2 + r2 * 1.3;
    const rawDx = dirSign * (poolRx * 0.55 + r0 * 24 * safeIntensity) + (r2 - 0.5) * 8;
    const clampedDx = clamp(rawDx, -(localX - rx - 2), platform.w - localX - rx - 2);
    const lobe = lobes[i] ?? (lobes[i] = { dx: 0, dy: 0, rx: 0, ry: 0 });
    lobe.dx = clampedDx;
    lobe.dy = (r1 - 0.35) * 2.2;
    lobe.rx = rx;
    lobe.ry = ry;
  }

  lobes.length = lobeCount;

  const dripCount = safeIntensity >= 0.75 ? (hashSeed(seed, 40) > 0.45 ? 3 : 2) : 1;
  const drips: BloodDrip[] = target?.drips ?? [];
  const maxAllowedDrip = Math.max(3, Math.min(16, platform.h - 3));
  for (let i = 0; i < dripCount; i++) {
    const r0 = hashSeed(seed, 50 + i * 2);
    const r1 = hashSeed(seed, 51 + i * 2);
    const rawDx = (r0 - 0.5) * poolRx * 1.3;
    const dx = clamp(rawDx, -(localX - 2), platform.w - localX - 2);
    const drip = drips[i] ?? (drips[i] = { dx: 0, width: 0, maxLen: 0 });
    drip.dx = dx;
    drip.width = 1.4 + r1 * 1.4;
    drip.maxLen = Math.min(maxAllowedDrip, (4 + r1 * 8.5) * Math.min(1.35, safeIntensity));
  }

  const maxLife = 22 + hashSeed(seed, 77) * 12;
  drips.length = dripCount;
  if (!target) return { id, platformIndex, localX, poolRx, poolRy, tone, life: maxLife, maxLife, lobes, drips };
  target.id = id;
  target.platformIndex = platformIndex;
  target.localX = localX;
  target.poolRx = poolRx;
  target.poolRy = poolRy;
  target.tone = tone;
  target.life = target.maxLife = maxLife;
  return target;
}

/**
 * Computes opacity, fresh wet specular highlight, and dried clot oxidation mix from decal lifetime.
 */
export function computeDecalVisualState(life: number, maxLife: number): DecalVisualState {
  const safeMax = Math.max(0.01, maxLife);
  const ratio = clamp(life / safeMax, 0, 1);
  const alpha = ratio >= 0.28 ? 1 : ratio / 0.28;
  const wetness = ratio >= 0.85 ? (ratio - 0.85) / 0.15 : 0;
  const dryMix = clamp((1 - ratio) * 1.65, 0, 1);
  return { alpha, wetness, dryMix };
}

export class BloodSystem {
  decals: BloodDecal[] = [];
  droplets: BloodDroplet[] = [];
  private idleDecals: BloodDecal[] = [];
  private nextId = 1;

  constructor() {
    for (let i = 0; i < MAX_BLOOD_DROPLETS; i++) {
      this.droplets.push({
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        radius: 2.5,
        dirX: 1,
        intensity: 0.6,
        tone: 'crimson',
        life: 0,
      });
    }
  }

  clear(): void {
    for (const decal of this.decals) this.idleDecals.push(decal);
    this.decals.length = 0;
    for (let i = 0; i < this.droplets.length; i++) {
      this.droplets[i].active = false;
    }
  }

  private acquireDecal(): BloodDecal | undefined {
    if (this.decals.length >= MAX_BLOOD_DECALS) return this.decals.shift();
    return this.idleDecals.pop();
  }

  /**
   * Spawns airborne directional blood droplets and immediately stamps a primary surface splatter
   * if solid stone or a walkway lies right beneath the impact.
   */
  spawnImpact(
    x: number,
    y: number,
    dirX: number,
    intensity: number,
    platforms: readonly Platform[],
    tone: BloodTone = 'crimson',
    rng: () => number = Math.random
  ): void {
    const safeIntensity = clamp(intensity, 0.4, 2.4);
    const dirSign = dirX >= 0 ? 1 : -1;

    // Immediate primary pool under grounded or low-flying targets
    const floor = findNearestFloorBelow(x + dirSign * 6, y, 64, platforms);
    if (floor) {
      const id = this.nextId++;
      this.decals.push(
        buildProceduralSplatter(
          id,
          floor.clampedX,
          floor.platformIndex,
          platforms[floor.platformIndex],
          dirSign,
          safeIntensity,
          id * 17.3 + rng() * 100,
          tone,
          this.acquireDecal()
        )
      );
    }

    // Airborne arterial droplets that arc and leave trailing splatters wherever they land
    const dropCount = Math.min(14, Math.max(4, Math.round(4 + safeIntensity * 4.5)));
    let spawned = 0;
    for (let i = 0; i < this.droplets.length && spawned < dropCount; i++) {
      const d = this.droplets[i];
      if (d.active) continue;
      d.active = true;
      d.x = x + (rng() - 0.5) * 10;
      d.y = y + (rng() - 0.5) * 12;
      const forwardBias = dirSign * (85 + rng() * 210 * safeIntensity);
      const backSpray = (rng() < 0.22 ? -dirSign * (40 + rng() * 80) : 0);
      d.vx = forwardBias + backSpray;
      d.vy = -(70 + rng() * 220 * Math.min(1.5, safeIntensity));
      d.radius = 1.9 + rng() * 2.2;
      d.dirX = dirSign;
      d.intensity = clamp(safeIntensity * (0.45 + rng() * 0.35), 0.38, 1.3);
      d.tone = tone;
      d.life = 1.4;
      spawned++;
    }
  }

  update(dt: number, platforms: readonly Platform[], rng: () => number = Math.random): void {
    // 1. Simulate flying blood droplets and stamp floor splatters on landing
    for (let i = 0; i < this.droplets.length; i++) {
      const d = this.droplets[i];
      if (!d.active) continue;
      d.life -= dt;
      if (d.life <= 0) {
        d.active = false;
        continue;
      }

      const prevY = d.y;
      d.x += d.vx * dt;
      d.vy += 820 * dt;
      d.y += d.vy * dt;

      if (d.vy > 0) {
        const hit = findLandingPlatform(d.x, prevY, d.y, platforms);
        if (hit) {
          const id = this.nextId++;
          this.decals.push(
            buildProceduralSplatter(
              id,
              hit.clampedX,
              hit.platformIndex,
              platforms[hit.platformIndex],
              d.vx !== 0 ? d.vx : d.dirX,
              d.intensity,
              id * 13.7 + rng() * 50,
              d.tone,
              this.acquireDecal()
            )
          );
          d.active = false;
        }
      }
    }

    // 2. Age and purge faded decals
    let remaining = 0;
    for (let i = 0; i < this.decals.length; i++) {
      const decal = this.decals[i];
      decal.life -= dt;
      if (decal.life <= 0) this.idleDecals.push(decal);
      else this.decals[remaining++] = decal;
    }
    this.decals.length = remaining;
  }
}

function getDecalColors(tone: BloodTone, dryMix: number): { base: string; wet: string; drip: string } {
  if (tone === 'ichor') {
    const r = Math.round(126 - dryMix * 58);
    const g = Math.round(24 - dryMix * 12);
    const b = Math.round(62 - dryMix * 28);
    return {
      base: `rgb(${r}, ${g}, ${b})`,
      wet: 'rgba(184, 58, 114, 0.85)',
      drip: `rgba(${Math.max(30, r - 18)}, ${Math.max(8, g - 6)}, ${Math.max(22, b - 10)}, 0.82)`,
    };
  }
  if (tone === 'ember_ichor') {
    const r = Math.round(168 - dryMix * 78);
    const g = Math.round(38 - dryMix * 20);
    const b = Math.round(28 - dryMix * 12);
    return {
      base: `rgb(${r}, ${g}, ${b})`,
      wet: 'rgba(235, 86, 52, 0.85)',
      drip: `rgba(${Math.max(40, r - 24)}, ${Math.max(10, g - 8)}, 14, 0.82)`,
    };
  }
  const r = Math.round(156 - dryMix * 78);
  const g = Math.round(20 - dryMix * 10);
  const b = Math.round(32 - dryMix * 14);
  return {
    base: `rgb(${r}, ${g}, ${b})`,
    wet: 'rgba(218, 46, 64, 0.85)',
    drip: `rgba(${Math.max(38, r - 26)}, 8, 16, 0.86)`,
  };
}

/**
 * Renders persistent blood splatters anchored cleanly to stone platform top surfaces and cornices.
 */
export function renderBloodDecals(
  ctx: CanvasRenderingContext2D,
  blood: BloodSystem,
  platforms: readonly Platform[],
  camX: number,
  viewW: number
): void {
  if (blood.decals.length === 0) return;

  for (let i = 0; i < blood.decals.length; i++) {
    const d = blood.decals[i];
    const p = platforms[d.platformIndex];
    if (!p || p.broken) continue;

    const wx = p.x + d.localX;
    if (wx + d.poolRx + 36 < camX || wx - d.poolRx - 36 > camX + viewW) continue;

    const wy = p.y;
    const vis = computeDecalVisualState(d.life, d.maxLife);
    if (vis.alpha <= 0.01) continue;

    const cols = getDecalColors(d.tone, vis.dryMix);
    const age = d.maxLife - d.life;
    const dripProgress = Math.min(1, age / 1.35);

    ctx.globalAlpha = vis.alpha * 0.9;
    ctx.fillStyle = cols.base;

    // 1. Primary flattened floor splatter pool along stone surface
    ctx.beginPath();
    ctx.ellipse(wx, wy + 1.4, d.poolRx, d.poolRy, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Directional splatter lobes & trailing smear drops
    for (let j = 0; j < d.lobes.length; j++) {
      const l = d.lobes[j];
      ctx.beginPath();
      ctx.ellipse(wx + l.dx, wy + 1.4 + l.dy * 0.35, l.rx, l.ry, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Stone-lip crimson drips slowly seeping down the carved cornice front
    if (dripProgress > 0.04) {
      ctx.fillStyle = cols.drip;
      for (let j = 0; j < d.drips.length; j++) {
        const dr = d.drips[j];
        const len = dr.maxLen * dripProgress;
        ctx.fillRect(wx + dr.dx - dr.width * 0.5, wy + 2, dr.width, len);
        ctx.beginPath();
        ctx.arc(wx + dr.dx, wy + 2 + len, dr.width * 0.55, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 4. Fresh wet arterial sheen during initial seconds after impact
    if (vis.wetness > 0.05) {
      ctx.globalAlpha = vis.alpha * vis.wetness * 0.72;
      ctx.fillStyle = cols.wet;
      ctx.beginPath();
      ctx.ellipse(wx - d.poolRx * 0.15, wy + 1, d.poolRx * 0.52, d.poolRy * 0.48, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

/**
 * Renders airborne blood droplets arcing toward floor surfaces.
 */
export function renderBloodDroplets(
  ctx: CanvasRenderingContext2D,
  blood: BloodSystem,
  camX: number,
  viewW: number
): void {
  for (let i = 0; i < blood.droplets.length; i++) {
    const d = blood.droplets[i];
    if (!d.active) continue;
    if (d.x < camX - 30 || d.x > camX + viewW + 30) continue;

    ctx.fillStyle = d.tone === 'ichor' ? '#8f2450' : d.tone === 'ember_ichor' ? '#b82e24' : '#b81d2c';
    ctx.strokeStyle = d.tone === 'ichor' ? '#cf4c82' : '#e03648';
    ctx.lineWidth = Math.max(1.5, d.radius);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(d.x, d.y);
    ctx.lineTo(d.x - d.vx * 0.022, d.y - d.vy * 0.022);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(d.x, d.y, d.radius * 0.65, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.lineWidth = 1;
}
