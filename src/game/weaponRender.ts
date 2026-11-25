import { createHiResStamp, mkGrad, poly } from './renderPrimitives';
import type { WeaponKey } from './types';

// 2x supersampled pre-baked weapon stamps for crisp metallic bevels and zero per-frame gradient churn
const weaponStamps = new Map<WeaponKey, HTMLCanvasElement>();

function getWeaponStamp(weapon: WeaponKey): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const cached = weaponStamps.get(weapon);
  if (cached) return cached;

  const w = 136;
  const h = 56;
  const [c, ctx] = createHiResStamp(w, h);
  if (!ctx) return null;

  ctx.translate(24, 28);

  if (weapon === 'belfry_greatsword') {
    ctx.fillStyle = '#38251a';
    ctx.fillRect(-14, -2.5, 16, 5);
    ctx.fillStyle = '#d4a853';
    ctx.beginPath();
    ctx.arc(-16, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8f692a';
    ctx.fillRect(1, -11, 5, 22);
    ctx.fillStyle = '#f2cc78';
    ctx.fillRect(2, -10, 2, 20);

    const bGrad = mkGrad(ctx, 6, -6, 6, 6, null, [
      [0, '#eef4fa'],
      [0.45, '#b6c0cc'],
      [0.5, '#68717d'],
      [1, '#929ca8'],
    ]);
    poly(ctx, [6, -6.5, 42, -4.5, 44, -2.5, 47, -4.5, 66, -3.5, 78, 0, 66, 3.5, 6, 6.5], bGrad, '#141118', 1.1);

    ctx.fillStyle = '#404854';
    ctx.fillRect(9, -1.2, 46, 2.4);
    ctx.fillStyle = '#ffd470';
    ctx.fillRect(12, -0.5, 18, 1);
  } else if (weapon === 'eclipse_daggers') {
    ctx.fillStyle = '#2d1e1c';
    ctx.fillRect(-9, -2, 10, 4);
    poly(ctx, [0, -6, 4, -3, 4, 3, 0, 6], '#d4a853');

    ctx.fillStyle = mkGrad(ctx, 4, -5, 34, 4, null, [
      [0, '#f5d996'],
      [0.45, '#c89b4b'],
      [1, '#3a2d40'],
    ]);
    ctx.beginPath();
    ctx.moveTo(4, -3.5);
    ctx.quadraticCurveTo(22, -7.5, 38, 1.5);
    ctx.quadraticCurveTo(20, 4, 4, 2.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#141118';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.strokeStyle = '#fff3cf';
    ctx.beginPath();
    ctx.moveTo(6, -3);
    ctx.quadraticCurveTo(22, -6.8, 36, 1.2);
    ctx.stroke();
  } else if (weapon === 'ash_halberd') {
    ctx.fillStyle = '#473024';
    ctx.fillRect(-16, -2, 68, 4);
    ctx.fillStyle = '#241812';
    ctx.fillRect(-16, 0.5, 68, 1.5);
    ctx.fillStyle = '#d4a853';
    ctx.fillRect(42, -3.5, 6, 7);
    poly(ctx, [43, 3.5, 35, 13, 41, 13], '#9c2634');

    const sGrad = mkGrad(ctx, 48, -4, 48, 4, null, [
      [0, '#eef4fa'],
      [0.5, '#b8c3cf'],
      [1, '#6d7785'],
    ]);
    poly(ctx, [48, -3.2, 78, 0, 48, 3.2], sGrad, '#141118', 1);

    ctx.fillStyle = sGrad;
    ctx.beginPath();
    ctx.moveTo(42, 2.5);
    ctx.quadraticCurveTo(56, 14, 34, 18);
    ctx.quadraticCurveTo(43, 9, 38, 2.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (weapon === 'scythe_eclipse') {
    ctx.fillStyle = '#251a22';
    ctx.fillRect(-16, -2, 68, 4);
    ctx.fillStyle = '#d4a853';
    ctx.fillRect(40, -3.5, 6, 7);

    ctx.fillStyle = mkGrad(ctx, 42, -6, 66, 26, null, [
      [0, '#eef4fa'],
      [0.55, '#a8b6c8'],
      [1, '#4c3e5e'],
    ]);
    ctx.beginPath();
    ctx.moveTo(43, -3);
    ctx.quadraticCurveTo(72, -4, 70, 22);
    ctx.quadraticCurveTo(56, 8, 44, 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#120d16';
    ctx.lineWidth = 1.1;
    ctx.stroke();

    ctx.strokeStyle = '#ffd470';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(48, -1);
    ctx.quadraticCurveTo(64, 1, 65, 16);
    ctx.stroke();
    ctx.lineWidth = 1;
  } else if (weapon === 'twin_hammers') {
    ctx.fillStyle = '#38251a';
    ctx.fillRect(-12, -2.5, 42, 5);
    ctx.fillStyle = '#d4a853';
    ctx.fillRect(22, -4, 4, 8);

    const hGrad = mkGrad(ctx, 26, -14, 46, 14, null, [
      [0, '#c89b4b'],
      [0.5, '#68594c'],
      [1, '#362d32'],
    ]);
    poly(ctx, [26, -13, 44, -15, 46, 15, 26, 13], hGrad, '#120d16', 1.2);

    ctx.fillStyle = '#ff7b29';
    ctx.fillRect(31, -5, 10, 10);
    ctx.fillStyle = '#ffd470';
    ctx.fillRect(34, -2.5, 4, 5);
  } else {
    ctx.fillStyle = '#332018';
    ctx.fillRect(-12, -2.2, 13, 4.4);
    ctx.fillStyle = '#c89b4b';
    ctx.beginPath();
    ctx.arc(-14, 0, 3.6, 0, Math.PI * 2);
    ctx.fill();
    poly(ctx, [0, -10, 5, -7, 5, 7, 0, 10, 2, 0], '#8b6a38');
    ctx.fillStyle = '#e5bd72';
    ctx.fillRect(1.5, -8, 1.8, 16);

    const cGrad = mkGrad(ctx, 4, -5, 4, 5, null, [
      [0, '#eef4fa'],
      [0.45, '#aeb8c4'],
      [0.52, '#4b525c'],
      [1, '#7c8591'],
    ]);
    poly(ctx, [4.5, -4.6, 44, -2.8, 56, 0, 44, 2.8, 4.5, 4.6], cGrad, '#100c14', 1.1);

    ctx.fillStyle = '#ff6a1f';
    ctx.fillRect(8, -0.9, 26, 1.8);
    ctx.fillStyle = '#ffe08a';
    for (let rx = 10; rx <= 30; rx += 5) ctx.fillRect(rx, -0.5, 2.6, 1);
  }

  weaponStamps.set(weapon, c);
  return c;
}

export function drawWeaponSprite(
  ctx: CanvasRenderingContext2D,
  weapon: WeaponKey,
  lengthScale = 1
): void {
  const stamp = getWeaponStamp(weapon);
  if (!stamp) return;
  const w = 136 * lengthScale;
  const h = 56 * lengthScale;
  ctx.drawImage(stamp, -24 * lengthScale, -28 * lengthScale, w, h);
}

export function drawPlantedRelicSword(
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  angle: number,
  scale = 1,
  emberGlow = true
): void {
  ctx.save();
  ctx.translate(x, groundY);
  ctx.rotate(angle);
  ctx.scale(scale, scale);

  const grad = mkGrad(ctx, -3, -38, 3, -38, null, [
    [0, '#8d96a2'],
    [0.5, '#3b414a'],
    [1, '#68717d'],
  ]);
  poly(ctx, [-3.2, -38, 3.2, -38, 2.4, 2, -2.4, 2], grad, '#0c090e', 1);

  if (emberGlow) {
    ctx.fillStyle = 'rgba(255, 112, 42, 0.65)';
    ctx.fillRect(-0.8, -28, 1.6, 22);
  }

  // Crossguard & leather hilt
  ctx.fillStyle = '#5a4635';
  ctx.fillRect(-10, -41, 20, 3.5);
  ctx.fillStyle = '#2d1e18';
  ctx.fillRect(-2, -52, 4, 11);
  ctx.fillStyle = '#8b6a3c';
  ctx.beginPath();
  ctx.arc(0, -54, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
