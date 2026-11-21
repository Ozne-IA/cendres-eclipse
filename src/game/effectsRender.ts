import { renderBloodDecals, renderBloodDroplets, type BloodSystem } from './bloodDecals';
import type { ParticlePool } from './particles';
import type { GameSettings, RoomData } from './types';
import { renderGroundFissuresVfx, renderWorldVfx, type VfxSystem } from './vfx';

export function renderGroundEffects(
  ctx: CanvasRenderingContext2D,
  platforms: RoomData['platforms'],
  camX: number,
  W: number,
  bloodIntensity: GameSettings['bloodIntensity'],
  vfxQuality: GameSettings['vfxQuality'],
  blood?: BloodSystem,
  vfx?: VfxSystem,
): void {
  // 8b. Persistent Floor Blood Splatter Decals & Active Ground Ember Fissures
  if (blood && bloodIntensity !== 'off') {
    if (bloodIntensity === 'medium') ctx.save(), (ctx.globalAlpha = 0.6);
    renderBloodDecals(ctx, blood, platforms, camX, W);
    if (bloodIntensity === 'medium') ctx.restore();
  }
  if (vfx) {
    renderGroundFissuresVfx(ctx, vfx, camX, W, vfxQuality);
  }
}

export function renderWorldEffects(
  ctx: CanvasRenderingContext2D,
  particles: ParticlePool,
  camX: number,
  W: number,
  bloodIntensity: GameSettings['bloodIntensity'],
  vfxQuality: GameSettings['vfxQuality'],
  blood?: BloodSystem,
  vfx?: VfxSystem,
): void {
  // 13. Shockwave Rings, Velocity-Aligned Sparks & Floating Texts
  for (const r of particles.rings) {
    if (!r.active) continue;
    ctx.globalAlpha = Math.max(0, r.life / r.maxLife);
    ctx.strokeStyle = r.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.lineWidth = 1;

  for (const pt of particles.particles) {
    if (!pt.active) continue;
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.strokeStyle = pt.color;
    ctx.lineWidth = Math.max(1.4, pt.size * 0.72);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y);
    ctx.lineTo(pt.x - pt.vx * 0.024, pt.y - pt.vy * 0.024);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.lineWidth = 1;

  if (vfx) {
    renderWorldVfx(ctx, vfx, camX, W, vfxQuality);
  }

  if (blood && bloodIntensity === 'high') {
    renderBloodDroplets(ctx, blood, camX, W);
  }

  ctx.textAlign = 'center';
  ctx.lineJoin = 'round';
  for (const ft of particles.texts) {
    if (!ft.active) continue;
    ctx.globalAlpha = Math.min(1, (ft.life / ft.maxLife) * 1.45);
    const emphasis = 1 + Math.max(0, ft.life / ft.maxLife - 0.8);
    ctx.font = `700 ${Math.round(15 * ft.scale * emphasis)}px "JetBrains Mono", monospace`;
    ctx.lineWidth = 3.5;
    ctx.strokeStyle = '#100c14';
    ctx.strokeText(ft.text, ft.x, ft.y);
    ctx.fillStyle = ft.color;
    ctx.fillText(ft.text, ft.x, ft.y);
  }
  ctx.globalAlpha = 1;
}
