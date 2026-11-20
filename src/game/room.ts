import type { Platform } from './types';

export function updatePlatforms(platforms: Platform[], simTime: number, dt: number): void {
  // Update Moving Platforms
  for (const p of platforms) {
    if (p.type === 'moving' && p.baseX !== undefined && p.baseY !== undefined) {
      const oldX = p.x;
      const oldY = p.y;
      const ph = (p.phase || 0) + simTime * (p.moveSpeed || 1);
      p.x = p.baseX + Math.sin(ph) * (p.moveRangeX || 0);
      p.y = p.baseY + Math.cos(ph) * (p.moveRangeY || 0);
      p.vx = (p.x - oldX) / dt;
      p.vy = (p.y - oldY) / dt;
    }
    if (p.type === 'crumble' && p.broken && p.respawnT !== undefined) {
      p.respawnT -= dt;
      if (p.respawnT <= 0) {
        p.broken = false;
        p.crumbleT = 0;
      }
    }
  }
}
