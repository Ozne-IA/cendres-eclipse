import { getColoredGlow } from './textures';
import type { QualityLevel } from './types';

export interface VfxSlashArc {
  active: boolean;
  x: number;
  y: number;
  radius: number;
  a0: number;
  a1: number;
  facing: 1 | -1;
  thickness: number;
  color: string;
  coreColor: string;
  life: number;
  maxLife: number;
}

export interface VfxImpactFlare {
  active: boolean;
  x: number;
  y: number;
  size: number;
  angle: number;
  color: string;
  glowType: 'amber' | 'crimson' | 'gold' | 'astral';
  life: number;
  maxLife: number;
}

export interface VfxLightningBolt {
  active: boolean;
  points: { x: number; y: number }[];
  color: string;
  width: number;
  life: number;
  maxLife: number;
}

export interface VfxGroundFissure {
  active: boolean;
  x: number;
  y: number;
  span: number;
  segments: { dx1: number; dy1: number; dx2: number; dy2: number }[];
  color: string;
  life: number;
  maxLife: number;
}

export interface VfxAshWisp {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  phase: number;
  color: string;
  glow: boolean;
  life: number;
  maxLife: number;
}

const SLASH_CAP = 20;
const FLARE_CAP = 24;
const BOLT_CAP = 28;
const FISSURE_CAP = 14;
const WISP_CAP = 96;

export class VfxSystem {
  readonly slashArcs: VfxSlashArc[] = Array.from({ length: SLASH_CAP }, () => ({
    active: false,
    x: 0,
    y: 0,
    radius: 56,
    a0: -1.1,
    a1: 1.1,
    facing: 1,
    thickness: 18,
    color: '#ff9842',
    coreColor: '#fff4d4',
    life: 0,
    maxLife: 0.2,
  }));

  readonly flares: VfxImpactFlare[] = Array.from({ length: FLARE_CAP }, () => ({
    active: false,
    x: 0,
    y: 0,
    size: 48,
    angle: 0,
    color: '#ffd470',
    glowType: 'gold',
    life: 0,
    maxLife: 0.22,
  }));

  readonly bolts: VfxLightningBolt[] = Array.from({ length: BOLT_CAP }, () => ({
    active: false,
    points: [],
    color: '#ffd470',
    width: 2,
    life: 0,
    maxLife: 0.16,
  }));

  readonly fissures: VfxGroundFissure[] = Array.from({ length: FISSURE_CAP }, () => ({
    active: false,
    x: 0,
    y: 0,
    span: 70,
    segments: [],
    color: '#ff7b29',
    life: 0,
    maxLife: 1.4,
  }));

  readonly wisps: VfxAshWisp[] = Array.from({ length: WISP_CAP }, () => ({
    active: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: -60,
    size: 3,
    phase: 0,
    color: '#ff9842',
    glow: true,
    life: 0,
    maxLife: 0.7,
  }));

  screenFlashAlpha = 0;
  screenFlashColor = '#ffd470';

  private sCur = 0;
  private fCur = 0;
  private bCur = 0;
  private gCur = 0;
  private wCur = 0;

  clear(): void {
    for (let i = 0; i < SLASH_CAP; i++) this.slashArcs[i].active = false;
    for (let i = 0; i < FLARE_CAP; i++) this.flares[i].active = false;
    for (let i = 0; i < BOLT_CAP; i++) this.bolts[i].active = false;
    for (let i = 0; i < FISSURE_CAP; i++) this.fissures[i].active = false;
    for (let i = 0; i < WISP_CAP; i++) this.wisps[i].active = false;
    this.screenFlashAlpha = 0;
  }

  triggerScreenFlash(color: string, alpha = 0.22): void {
    this.screenFlashColor = color;
    this.screenFlashAlpha = Math.max(this.screenFlashAlpha, Math.min(0.42, alpha));
  }

  spawnSlashArc(
    x: number,
    y: number,
    radius: number,
    a0: number,
    a1: number,
    facing: 1 | -1,
    color = '#ff9842',
    coreColor = '#fff6da',
    thickness = 18,
    duration = 0.22
  ): void {
    const s = this.slashArcs[this.sCur];
    this.sCur = (this.sCur + 1) % SLASH_CAP;
    s.active = true;
    s.x = x;
    s.y = y;
    s.radius = radius;
    s.a0 = a0;
    s.a1 = a1;
    s.facing = facing;
    s.thickness = thickness;
    s.color = color;
    s.coreColor = coreColor;
    s.life = duration;
    s.maxLife = duration;
  }

  spawnImpactFlare(
    x: number,
    y: number,
    size = 56,
    color = '#ffd470',
    glowType: VfxImpactFlare['glowType'] = 'gold',
    duration = 0.22,
    angle = (Math.random() - 0.5) * 0.45
  ): void {
    const f = this.flares[this.fCur];
    this.fCur = (this.fCur + 1) % FLARE_CAP;
    f.active = true;
    f.x = x;
    f.y = y;
    f.size = size;
    f.angle = angle;
    f.color = color;
    f.glowType = glowType;
    f.life = duration;
    f.maxLife = duration;
  }

  spawnLightning(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color = '#ffd470',
    width = 2.4,
    duration = 0.17,
    rng: () => number = Math.random
  ): void {
    const b = this.bolts[this.bCur];
    this.bCur = (this.bCur + 1) % BOLT_CAP;
    const steps = 6;
    const pts: { x: number; y: number }[] = [{ x: x1, y: y1 }];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const nx = -dy / dist;
    const ny = dx / dist;
    const jitter = Math.min(26, dist * 0.28);

    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const offset = (rng() - 0.5) * 2 * jitter;
      pts.push({
        x: x1 + dx * t + nx * offset,
        y: y1 + dy * t + ny * offset,
      });
    }
    pts.push({ x: x2, y: y2 });

    b.active = true;
    b.points = pts;
    b.color = color;
    b.width = width;
    b.life = duration;
    b.maxLife = duration;
  }

  spawnGroundFissure(
    x: number,
    y: number,
    span = 76,
    color = '#ff7b29',
    duration = 1.45,
    rng: () => number = Math.random
  ): void {
    const g = this.fissures[this.gCur];
    this.gCur = (this.gCur + 1) % FISSURE_CAP;
    const segs: VfxGroundFissure['segments'] = [];
    const branchCount = 5;
    for (let i = 0; i < branchCount; i++) {
      const dir = i % 2 === 0 ? -1 : 1;
      const len = span * (0.32 + rng() * 0.62);
      const startOff = (rng() - 0.5) * 14;
      const midX = startOff + dir * len * 0.55;
      const midY = 2 + rng() * 5;
      segs.push({ dx1: startOff, dy1: 0, dx2: midX, dy2: midY });
      segs.push({
        dx1: midX,
        dy1: midY,
        dx2: startOff + dir * len,
        dy2: 1 + rng() * 8,
      });
    }
    g.active = true;
    g.x = x;
    g.y = y;
    g.span = span;
    g.segments = segs;
    g.color = color;
    g.life = duration;
    g.maxLife = duration;
  }

  spawnAshDissolve(
    x: number,
    y: number,
    count = 16,
    color = '#ff9842',
    spreadX = 24,
    spreadY = 38,
    rng: () => number = Math.random
  ): void {
    for (let i = 0; i < count; i++) {
      const w = this.wisps[this.wCur];
      this.wCur = (this.wCur + 1) % WISP_CAP;
      const life = 0.45 + rng() * 0.55;
      w.active = true;
      w.x = x + (rng() - 0.5) * spreadX;
      w.y = y + (rng() - 0.5) * spreadY;
      w.vx = (rng() - 0.5) * 58;
      w.vy = -(48 + rng() * 95);
      w.size = 2 + rng() * 2.8;
      w.phase = rng() * Math.PI * 2;
      w.color = i % 3 === 0 ? '#ffd470' : color;
      w.glow = i % 2 === 0;
      w.life = life;
      w.maxLife = life;
    }
  }

  spawnBladeSparks(
    x: number,
    y: number,
    facing: 1 | -1,
    count = 10,
    color = '#ff9842',
    rng: () => number = Math.random
  ): void {
    for (let i = 0; i < count; i++) {
      const w = this.wisps[this.wCur];
      this.wCur = (this.wCur + 1) % WISP_CAP;
      const life = 0.28 + rng() * 0.34;
      const angle = (rng() - 0.5) * 1.6;
      const spd = 95 + rng() * 145;
      w.active = true;
      w.x = x + facing * (12 + rng() * 34);
      w.y = y + (rng() - 0.5) * 26;
      w.vx = facing * Math.cos(angle) * spd;
      w.vy = Math.sin(angle) * spd - 35;
      w.size = 1.6 + rng() * 2.2;
      w.phase = rng() * Math.PI * 2;
      w.color = i % 2 === 0 ? '#ffd470' : color;
      w.glow = true;
      w.life = life;
      w.maxLife = life;
    }
  }

  update(dt: number): void {
    if (this.screenFlashAlpha > 0) {
      this.screenFlashAlpha = Math.max(0, this.screenFlashAlpha - dt * 1.45);
    }

    for (let i = 0; i < SLASH_CAP; i++) {
      const s = this.slashArcs[i];
      if (!s.active) continue;
      s.life -= dt;
      s.radius += dt * 42;
      if (s.life <= 0) s.active = false;
    }

    for (let i = 0; i < FLARE_CAP; i++) {
      const f = this.flares[i];
      if (!f.active) continue;
      f.life -= dt;
      if (f.life <= 0) f.active = false;
    }

    for (let i = 0; i < BOLT_CAP; i++) {
      const b = this.bolts[i];
      if (!b.active) continue;
      b.life -= dt;
      if (b.life <= 0) b.active = false;
    }

    for (let i = 0; i < FISSURE_CAP; i++) {
      const g = this.fissures[i];
      if (!g.active) continue;
      g.life -= dt;
      if (g.life <= 0) g.active = false;
    }

    for (let i = 0; i < WISP_CAP; i++) {
      const w = this.wisps[i];
      if (!w.active) continue;
      w.life -= dt;
      w.phase += dt * 7;
      w.x += (w.vx + Math.sin(w.phase) * 24) * dt;
      w.y += w.vy * dt;
      w.vy -= 26 * dt;
      if (w.life <= 0) w.active = false;
    }
  }
}

export function renderGroundFissuresVfx(
  ctx: CanvasRenderingContext2D,
  vfx: VfxSystem,
  camX: number,
  W: number,
  quality: QualityLevel
): void {
  if (quality === 'off') return;
  const emberGlow = getColoredGlow('amber');
  for (let i = 0; i < FISSURE_CAP; i++) {
    const g = vfx.fissures[i];
    if (!g.active || g.x + g.span < camX - 40 || g.x - g.span > camX + W + 40) continue;
    const t = Math.max(0, g.life / g.maxLife);
    ctx.save();
    ctx.translate(g.x, g.y);

    // Soft additive ember haze pool over scorched stone
    if (emberGlow) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = t * 0.45;
      ctx.drawImage(emberGlow, -g.span * 0.65, -14, g.span * 1.3, 28);
      ctx.restore();
    }

    // Dark charred fracture trench
    ctx.globalAlpha = t * 0.82;
    ctx.strokeStyle = '#070507';
    ctx.lineWidth = 4.2 * t + 1;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (const seg of g.segments) {
      ctx.moveTo(seg.dx1, seg.dy1);
      ctx.lineTo(seg.dx2, seg.dy2);
    }
    ctx.stroke();

    // Inner incandescent molten magma core
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = g.color;
    ctx.lineWidth = 2.0 * t + 0.5;
    ctx.globalAlpha = t * 0.85;
    ctx.stroke();

    ctx.strokeStyle = '#fff3c4';
    ctx.lineWidth = 0.85 * t;
    ctx.globalAlpha = t * 0.72;
    ctx.stroke();
    ctx.restore();
  }
}

export function renderWorldVfx(
  ctx: CanvasRenderingContext2D,
  vfx: VfxSystem,
  camX: number,
  W: number,
  quality: QualityLevel
): void {
  if (quality === 'off') return;
  const skipSecondary = quality === 'medium';

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // 1. Kinetic Luminous Slash Arcs
  for (let i = 0; i < SLASH_CAP; i++) {
    const s = vfx.slashArcs[i];
    if (!s.active || s.x + s.radius + 40 < camX || s.x - s.radius - 40 > camX + W) continue;
    const t = Math.max(0, s.life / s.maxLife);
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.scale(s.facing, 1);

    ctx.globalAlpha = t * 0.72;
    ctx.strokeStyle = s.color;
    ctx.lineWidth = s.thickness * t;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(0, 0, s.radius, s.a0, s.a1);
    ctx.stroke();

    ctx.globalAlpha = t * 0.92;
    ctx.strokeStyle = s.coreColor;
    ctx.lineWidth = Math.max(1.5, s.thickness * 0.28 * t);
    ctx.beginPath();
    ctx.arc(0, 0, s.radius + s.thickness * 0.14, s.a0 + 0.08, s.a1 - 0.04);
    ctx.stroke();
    ctx.restore();
  }

  // 2. Anamorphic Star Flares & Hit Blooms
  for (let i = 0; i < FLARE_CAP; i++) {
    const f = vfx.flares[i];
    if (!f.active || f.x + 120 < camX || f.x - 120 > camX + W) continue;
    const t = Math.max(0, f.life / f.maxLife);
    const bloom = getColoredGlow(f.glowType);
    if (bloom && !skipSecondary) {
      const r = f.size * (1.25 - t * 0.25);
      ctx.globalAlpha = t * 0.7;
      ctx.drawImage(bloom, Math.round(f.x - r), Math.round(f.y - r), Math.round(r * 2), Math.round(r * 2));
    }

    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.angle);
    const armX = f.size * (0.75 + (1 - t) * 0.55);
    const armY = f.size * 0.42;

    ctx.globalAlpha = t * 0.92;
    ctx.fillStyle = f.color;
    ctx.beginPath();
    ctx.moveTo(-armX, 0);
    ctx.lineTo(-4, -3.5 * t);
    ctx.lineTo(0, -armY);
    ctx.lineTo(4, -3.5 * t);
    ctx.lineTo(armX, 0);
    ctx.lineTo(4, 3.5 * t);
    ctx.lineTo(0, armY);
    ctx.lineTo(-4, 3.5 * t);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, Math.max(2, f.size * 0.12 * t), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 3. High-Voltage Deflection & Sovereign Lightning Bolts
  if (!skipSecondary) {
    for (let i = 0; i < BOLT_CAP; i++) {
      const b = vfx.bolts[i];
      if (!b.active || b.points.length < 2) continue;
      const t = Math.max(0, b.life / b.maxLife);
      ctx.globalAlpha = t * 0.85;
      ctx.strokeStyle = b.color;
      ctx.lineWidth = b.width * 2;
      ctx.beginPath();
      ctx.moveTo(b.points[0].x, b.points[0].y);
      for (let k = 1; k < b.points.length; k++) {
        ctx.lineTo(b.points[k].x, b.points[k].y);
      }
      ctx.stroke();

      ctx.globalAlpha = t;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = Math.max(1, b.width * 0.65);
      ctx.stroke();
    }
  }

  // 4. Swirling Rising Ember & Ash Wisps
  for (let i = 0; i < WISP_CAP; i++) {
    const w = vfx.wisps[i];
    if (!w.active || w.x + 24 < camX || w.x - 24 > camX + W) continue;
    const t = Math.max(0, w.life / w.maxLife);
    ctx.globalAlpha = t * 0.88;
    ctx.fillStyle = w.color;
    ctx.beginPath();
    ctx.arc(w.x, w.y, Math.max(0.8, w.size * t), 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

export function renderScreenVfx(
  ctx: CanvasRenderingContext2D,
  vfx: VfxSystem,
  W: number,
  H: number,
  quality: QualityLevel
): void {
  if (quality === 'off' || vfx.screenFlashAlpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = vfx.screenFlashAlpha * 0.45;
  ctx.strokeStyle = vfx.screenFlashColor;
  ctx.lineWidth = 28;
  ctx.strokeRect(0, 0, W, H);
  ctx.globalAlpha = vfx.screenFlashAlpha * 0.25;
  ctx.fillStyle = vfx.screenFlashColor;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}
