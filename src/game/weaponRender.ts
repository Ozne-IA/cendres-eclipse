import type { WeaponKey } from './types';

// 2x supersampled pre-baked weapon stamps for crisp metallic bevels and zero per-frame gradient churn
const weaponStamps = new Map<WeaponKey, HTMLCanvasElement>();

function getWeaponStamp(weapon: WeaponKey): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const cached = weaponStamps.get(weapon);
  if (cached) return cached;

  const scale = 2;
  const w = 136;
  const h = 56;
  const c = document.createElement('canvas');
  c.width = w * scale;
  c.height = h * scale;
  const ctx = c.getContext('2d');
  if (!ctx) return null;

  ctx.scale(scale, scale);
  // Origin at (24, 28) -> pommel left, tip right
  ctx.translate(24, 28);

  if (weapon === 'belfry_greatsword') {
    // Pommel & leather grip
    ctx.fillStyle = '#38251a';
    ctx.fillRect(-14, -2.5, 16, 5);
    ctx.fillStyle = '#d4a853';
    ctx.beginPath();
    ctx.arc(-16, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();
    // Ornate notched cathedral crossguard
    ctx.fillStyle = '#8f692a';
    ctx.fillRect(1, -11, 5, 22);
    ctx.fillStyle = '#f2cc78';
    ctx.fillRect(2, -10, 2, 20);

    // Broad dual-toned steel blade
    const bGrad = ctx.createLinearGradient(6, -6, 6, 6);
    bGrad.addColorStop(0, '#eef4fa');
    bGrad.addColorStop(0.45, '#b6c0cc');
    bGrad.addColorStop(0.5, '#68717d');
    bGrad.addColorStop(1, '#929ca8');
    ctx.fillStyle = bGrad;
    ctx.beginPath();
    ctx.moveTo(6, -6.5);
    ctx.lineTo(42, -4.5);
    ctx.lineTo(44, -2.5);
    ctx.lineTo(47, -4.5);
    ctx.lineTo(66, -3.5);
    ctx.lineTo(78, 0);
    ctx.lineTo(66, 3.5);
    ctx.lineTo(6, 6.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#141118';
    ctx.lineWidth = 1.1;
    ctx.stroke();

    // Central fuller + gold inlay rune
    ctx.fillStyle = '#404854';
    ctx.fillRect(9, -1.2, 46, 2.4);
    ctx.fillStyle = '#ffd470';
    ctx.fillRect(12, -0.5, 18, 1);
  } else if (weapon === 'eclipse_daggers') {
    // Curved obsidian & gold twin fang
    ctx.fillStyle = '#2d1e1c';
    ctx.fillRect(-9, -2, 10, 4);
    ctx.fillStyle = '#d4a853';
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4, -3);
    ctx.lineTo(4, 3);
    ctx.lineTo(0, 6);
    ctx.closePath();
    ctx.fill();

    const dGrad = ctx.createLinearGradient(4, -5, 34, 4);
    dGrad.addColorStop(0, '#f5d996');
    dGrad.addColorStop(0.45, '#c89b4b');
    dGrad.addColorStop(1, '#3a2d40');
    ctx.fillStyle = dGrad;
    ctx.beginPath();
    ctx.moveTo(4, -3.5);
    ctx.quadraticCurveTo(22, -7.5, 38, 1.5);
    ctx.quadraticCurveTo(20, 4, 4, 2.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#141118';
    ctx.lineWidth = 1;
    ctx.stroke();
    // Bright cutting edge
    ctx.strokeStyle = '#fff3cf';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(6, -3);
    ctx.quadraticCurveTo(22, -6.8, 36, 1.2);
    ctx.stroke();
  } else if (weapon === 'ash_halberd') {
    // Long ash shaft with brass ferrule & crimson tassel
    ctx.fillStyle = '#473024';
    ctx.fillRect(-16, -2, 68, 4);
    ctx.fillStyle = '#241812';
    ctx.fillRect(-16, 0.5, 68, 1.5);
    // Brass collar
    ctx.fillStyle = '#d4a853';
    ctx.fillRect(42, -3.5, 6, 7);
    // Crimson silk tassel
    ctx.fillStyle = '#9c2634';
    ctx.beginPath();
    ctx.moveTo(43, 3.5);
    ctx.lineTo(35, 13);
    ctx.lineTo(41, 13);
    ctx.closePath();
    ctx.fill();

    // Spear tip
    const sGrad = ctx.createLinearGradient(48, -4, 48, 4);
    sGrad.addColorStop(0, '#eef4fa');
    sGrad.addColorStop(0.5, '#b8c3cf');
    sGrad.addColorStop(1, '#6d7785');
    ctx.fillStyle = sGrad;
    ctx.beginPath();
    ctx.moveTo(48, -3.2);
    ctx.lineTo(78, 0);
    ctx.lineTo(48, 3.2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#141118';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Crescent axe head
    ctx.fillStyle = sGrad;
    ctx.beginPath();
    ctx.moveTo(42, 2.5);
    ctx.quadraticCurveTo(56, 14, 34, 18);
    ctx.quadraticCurveTo(43, 9, 38, 2.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Flowing crimson silk tassel & ash shaft -> handled in ash_halberd above
  } else if (weapon === 'scythe_eclipse') {
    // Dark lacquered curved pole + crescent eclipse scythe blade
    ctx.fillStyle = '#251a22';
    ctx.fillRect(-16, -2, 68, 4);
    ctx.fillStyle = '#d4a853';
    ctx.fillRect(40, -3.5, 6, 7);

    const scGrad = ctx.createLinearGradient(42, -6, 66, 26);
    scGrad.addColorStop(0, '#eef4fa');
    scGrad.addColorStop(0.55, '#a8b6c8');
    scGrad.addColorStop(1, '#4c3e5e');
    ctx.fillStyle = scGrad;
    ctx.beginPath();
    ctx.moveTo(43, -3);
    ctx.quadraticCurveTo(72, -4, 70, 22);
    ctx.quadraticCurveTo(56, 8, 44, 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#120d16';
    ctx.lineWidth = 1.1;
    ctx.stroke();

    // Moon rune along the inner edge
    ctx.strokeStyle = '#ffd470';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(48, -1);
    ctx.quadraticCurveTo(64, 1, 65, 16);
    ctx.stroke();
    ctx.lineWidth = 1;
  } else if (weapon === 'twin_hammers') {
    // Bronze & basalt heavy warhammer head
    ctx.fillStyle = '#38251a';
    ctx.fillRect(-12, -2.5, 42, 5);
    ctx.fillStyle = '#d4a853';
    ctx.fillRect(22, -4, 4, 8);

    const hGrad = ctx.createLinearGradient(26, -14, 46, 14);
    hGrad.addColorStop(0, '#c89b4b');
    hGrad.addColorStop(0.5, '#68594c');
    hGrad.addColorStop(1, '#362d32');
    ctx.fillStyle = hGrad;
    ctx.beginPath();
    ctx.moveTo(26, -13);
    ctx.lineTo(44, -15);
    ctx.lineTo(46, 15);
    ctx.lineTo(26, 13);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#120d16';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Glowing furnace core
    ctx.fillStyle = '#ff7b29';
    ctx.fillRect(31, -5, 10, 10);
    ctx.fillStyle = '#ffd470';
    ctx.fillRect(34, -2.5, 4, 5);
  } else {
    // Clay Blade: Runic dark-iron bastard sword with swept filigree guard & molten ember inscriptions
    ctx.fillStyle = '#332018';
    ctx.fillRect(-12, -2.2, 13, 4.4);
    ctx.fillStyle = '#c89b4b';
    ctx.beginPath();
    ctx.arc(-14, 0, 3.6, 0, Math.PI * 2);
    ctx.fill();
    // Swept cathedral crossguard
    ctx.fillStyle = '#8b6a38';
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(5, -7);
    ctx.lineTo(5, 7);
    ctx.lineTo(0, 10);
    ctx.lineTo(2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e5bd72';
    ctx.fillRect(1.5, -8, 1.8, 16);

    const cGrad = ctx.createLinearGradient(4, -5, 4, 5);
    cGrad.addColorStop(0, '#eef4fa');
    cGrad.addColorStop(0.45, '#aeb8c4');
    cGrad.addColorStop(0.52, '#4b525c');
    cGrad.addColorStop(1, '#7c8591');
    ctx.fillStyle = cGrad;
    ctx.beginPath();
    ctx.moveTo(4.5, -4.6);
    ctx.lineTo(44, -2.8);
    ctx.lineTo(56, 0);
    ctx.lineTo(44, 2.8);
    ctx.lineTo(4.5, 4.6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#100c14';
    ctx.lineWidth = 1.1;
    ctx.stroke();

    // Glowing molten ember runes along the blade fuller
    ctx.fillStyle = '#ff6a1f';
    ctx.fillRect(8, -0.9, 26, 1.8);
    ctx.fillStyle = '#ffe08a';
    for (let rx = 10; rx <= 30; rx += 5) {
      ctx.fillRect(rx, -0.5, 2.6, 1);
    }
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

  // Blade buried into ash/stone
  const grad = ctx.createLinearGradient(-3, -38, 3, -38);
  grad.addColorStop(0, '#8d96a2');
  grad.addColorStop(0.5, '#3b414a');
  grad.addColorStop(1, '#68717d');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(-3.2, -38);
  ctx.lineTo(3.2, -38);
  ctx.lineTo(2.4, 2);
  ctx.lineTo(-2.4, 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#0c090e';
  ctx.lineWidth = 1;
  ctx.stroke();

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
