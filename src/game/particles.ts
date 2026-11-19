export interface PooledParticle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export interface PooledFloatText {
  active: boolean;
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  scale: number;
}

export interface ShockwaveRing {
  active: boolean;
  x: number;
  y: number;
  r: number;
  maxR: number;
  life: number;
  maxLife: number;
  color: string;
}

const PARTICLE_CAP = 320;
const TEXT_CAP = 48;
const RING_CAP = 24;

export class ParticlePool {
  readonly particles: PooledParticle[] = Array.from({ length: PARTICLE_CAP }, () => ({
    active: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    gravity: 300,
    life: 0,
    maxLife: 1,
    size: 2,
    color: '#d4a853',
  }));

  readonly texts: PooledFloatText[] = Array.from({ length: TEXT_CAP }, () => ({
    active: false,
    x: 0,
    y: 0,
    vy: -38,
    text: '',
    color: '#e8e1d5',
    life: 0,
    maxLife: 0.85,
    scale: 1,
  }));

  readonly rings: ShockwaveRing[] = Array.from({ length: RING_CAP }, () => ({
    active: false,
    x: 0,
    y: 0,
    r: 8,
    maxR: 90,
    life: 0,
    maxLife: 0.35,
    color: '#ffd470',
  }));

  private pCursor = 0;
  private tCursor = 0;
  private rCursor = 0;

  clear(): void {
    for (let i = 0; i < PARTICLE_CAP; i++) this.particles[i].active = false;
    for (let i = 0; i < TEXT_CAP; i++) this.texts[i].active = false;
    for (let i = 0; i < RING_CAP; i++) this.rings[i].active = false;
  }

  spawnBurst(
    x: number,
    y: number,
    color: string,
    count = 12,
    speed = 220,
    gravity = 320,
    sizeBase = 2.5
  ): void {
    for (let i = 0; i < count; i++) {
      const p = this.particles[this.pCursor];
      this.pCursor = (this.pCursor + 1) % PARTICLE_CAP;
      const a = Math.random() * Math.PI * 2;
      const s = (0.3 + Math.random() * 0.75) * speed;
      const life = 0.24 + Math.random() * 0.38;
      p.active = true;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(a) * s;
      p.vy = Math.sin(a) * s - 40;
      p.gravity = gravity;
      p.life = life;
      p.maxLife = life;
      p.size = sizeBase + Math.random() * 2.5;
      p.color = color;
    }
  }

  spawnRing(x: number, y: number, color = '#ffd470', maxR = 95, dur = 0.3): void {
    const r = this.rings[this.rCursor];
    this.rCursor = (this.rCursor + 1) % RING_CAP;
    r.active = true;
    r.x = x;
    r.y = y;
    r.r = 8;
    r.maxR = maxR;
    r.life = dur;
    r.maxLife = dur;
    r.color = color;
  }

  addText(x: number, y: number, text: string, color = '#e8e1d5', scale = 1): void {
    const t = this.texts[this.tCursor];
    this.tCursor = (this.tCursor + 1) % TEXT_CAP;
    t.active = true;
    t.x = x;
    t.y = y;
    t.vy = -42;
    t.text = text;
    t.color = color;
    t.life = 0.85;
    t.maxLife = 0.85;
    t.scale = scale;
  }

  update(dt: number): void {
    for (let i = 0; i < PARTICLE_CAP; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.life -= dt;
      if (p.life <= 0) p.active = false;
    }
    for (let i = 0; i < TEXT_CAP; i++) {
      const t = this.texts[i];
      if (!t.active) continue;
      t.y += t.vy * dt;
      t.vy *= 0.96;
      t.life -= dt;
      if (t.life <= 0) t.active = false;
    }
    for (let i = 0; i < RING_CAP; i++) {
      const r = this.rings[i];
      if (!r.active) continue;
      r.life -= dt;
      const progress = 1 - Math.max(0, r.life / r.maxLife);
      r.r = 8 + (r.maxR - 8) * progress;
      if (r.life <= 0) r.active = false;
    }
  }
}
