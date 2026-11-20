import type { Projectile } from './types';

// Limit retained idle storage while allowing every attack in a burst to spawn.
export const PROJECTILE_RESERVE = 64;

export class ProjectilePool {
  private idle: Projectile[] = [];

  acquire(active: Projectile[]): Projectile {
    const shot = this.idle.pop() ?? {
      x: 0, y: 0, vx: 0, vy: 0, r: 0, dmg: 0,
      friendly: false, color: '', kind: 'orb', life: 0,
    };
    shot.telegraphT = undefined;
    active.push(shot);
    return shot;
  }

  release(active: Projectile[], index: number): void {
    const shot = active[index];
    // Keep draw and collision order stable, without allocating a splice result.
    for (let i = index + 1; i < active.length; i++) active[i - 1] = active[i];
    active.pop();
    if (this.idle.length < PROJECTILE_RESERVE) this.idle.push(shot);
  }

  clear(active: Projectile[]): void {
    while (active.length) this.release(active, active.length - 1);
  }
}
