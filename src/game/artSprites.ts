import { ARMOR_SKINS_DEF } from './data';
import { getColoredGlow } from './textures';
import type { ArmorSkinKey, Enemy, Player, RoomProp, WeaponKey } from './types';

export function getTorchGlow(): HTMLCanvasElement | null {
  return getColoredGlow('amber');
}

export function getCrimsonGlow(): HTMLCanvasElement | null {
  return getColoredGlow('crimson');
}

export function getAstralGlow(): HTMLCanvasElement | null {
  return getColoredGlow('astral');
}

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

export function drawGroundShadow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  groundY: number,
  radiusX: number,
  alpha = 0.48
): void {
  ctx.fillStyle = `rgba(4, 3, 6, ${alpha})`;
  ctx.beginPath();
  ctx.ellipse(cx, groundY + 1, radiusX, Math.max(3, radiusX * 0.22), 0, 0, Math.PI * 2);
  ctx.fill();
}

export function drawDetailedPlayer(
  ctx: CanvasRenderingContext2D,
  player: Player,
  weapon: WeaponKey,
  hasWisp: boolean,
  time: number,
  armorSkin: ArmorSkinKey = 'eclipse'
): void {
  const skin = ARMOR_SKINS_DEF[armorSkin] || ARMOR_SKINS_DEF.eclipse;
  // Dash ghost afterimages with trailing cloak silhouette
  for (const af of player.afterimages) {
    ctx.globalAlpha = af.alpha * 0.34;
    const fx = af.x + player.w / 2;
    const fy = af.y + player.h;
    ctx.fillStyle = '#a89688';
    ctx.beginPath();
    ctx.moveTo(fx - af.facing * 4, fy - 38);
    ctx.lineTo(fx - af.facing * 20, fy - 4);
    ctx.lineTo(fx + af.facing * 10, fy - 2);
    ctx.lineTo(fx + af.facing * 8, fy - 38);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#f2e8d5';
    ctx.beginPath();
    ctx.arc(fx, fy - 42, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  if (player.onGround) {
    drawGroundShadow(ctx, player.x + player.w / 2, player.y + player.h, 17, 0.52);
  }

  // Warm character lantern aura (pre-baked radial sprite, no heavy lighter readback)
  const glow = getTorchGlow();
  if (glow) {
    ctx.globalAlpha = 0.42;
    ctx.drawImage(glow, player.x + player.w / 2 - 76, player.y + 20 - 76, 152, 152);
  }

  const blinkAlpha =
    player.invulnT > 0 && Math.floor(player.invulnT * 22) % 2 === 1 && player.dashT <= 0
      ? 0.52
      : 1;
  ctx.globalAlpha = blinkAlpha;

  ctx.save();
  const footX = player.x + player.w / 2;
  const footY = player.y + player.h;
  ctx.translate(footX, footY);
  const lean = Math.max(-0.14, Math.min(0.14, player.vx * 0.00032));
  ctx.rotate(lean);
  ctx.scale(player.squashX, player.squashY);

  const isRunning = player.onGround && Math.abs(player.vx) > 35;
  const stride = isRunning ? Math.sin(player.walkCycle * 2.3) : 0;
  const bob = isRunning
    ? Math.abs(Math.cos(player.walkCycle * 2.3)) * 2.6
    : Math.sin(time * 2.6) * 0.9;
  const flash = player.hitFlashT > 0;
  const capeDir = -player.facing;
  const speedDrag = Math.min(20, Math.abs(player.vx) * 0.045);
  const wave1 = Math.sin(player.capeWave) * 5.5;
  const wave2 = Math.cos(player.capeWave * 0.82) * 4.5;

  // 1. Tattered Asymmetric War Cloak (jagged frayed edges + inner lining)
  ctx.fillStyle = flash ? '#fff5e4' : skin.capeLining;
  ctx.beginPath();
  ctx.moveTo(capeDir * 2, -player.h + 15 - bob);
  ctx.quadraticCurveTo(
    capeDir * (15 + speedDrag),
    -26 + wave1,
    capeDir * (26 + speedDrag),
    -3 + wave2
  );
  ctx.lineTo(capeDir * (18 + speedDrag * 0.6), -7 + wave2 * 0.5);
  ctx.lineTo(capeDir * (13 + speedDrag * 0.4), -1);
  ctx.lineTo(capeDir * 5, -5);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = flash ? '#fff5e4' : skin.capeOuter;
  ctx.beginPath();
  ctx.moveTo(capeDir * 1, -player.h + 14 - bob);
  ctx.quadraticCurveTo(
    capeDir * (13 + speedDrag * 0.9),
    -29 + wave1 * 0.85,
    capeDir * (24 + speedDrag),
    -6 + wave2
  );
  ctx.lineTo(capeDir * (17 + speedDrag * 0.55), -11 + wave2 * 0.4);
  ctx.lineTo(capeDir * (11 + speedDrag * 0.35), -5);
  ctx.lineTo(capeDir * 2, -7);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#09070b';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Flowing tattered shoulder mantle scarf
  ctx.fillStyle = flash ? '#ffffff' : skin.capeLining;
  ctx.beginPath();
  ctx.moveTo(-3, -player.h + 13 - bob);
  ctx.quadraticCurveTo(
    capeDir * (13 + speedDrag * 0.5),
    -player.h + 14 + wave1 * 0.5,
    capeDir * (26 + speedDrag * 0.85),
    -player.h + 20 + wave2
  );
  ctx.lineTo(capeDir * (20 + speedDrag * 0.65), -player.h + 25 + wave2);
  ctx.lineTo(capeDir * (16 + speedDrag * 0.4), -player.h + 21 + wave1 * 0.4);
  ctx.lineTo(0, -player.h + 18 - bob);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 2. Articulated Iron Greaves, Knee Cops & Sabaton Boots
  const drawLeg = (offset: number, dark: boolean) => {
    const hipX = offset * 0.25;
    const kneeX = offset * 0.88 + player.facing * 2;
    const footPosX = offset * 1.15;
    ctx.strokeStyle = '#09070b';
    ctx.lineWidth = 5.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hipX, -15 - bob * 0.4);
    ctx.lineTo(kneeX, -8);
    ctx.lineTo(footPosX, -1.5);
    ctx.stroke();

    ctx.strokeStyle = dark ? '#24262e' : '#3a3e4a';
    ctx.lineWidth = 3.8;
    ctx.stroke();

    // Knee cop & articulated iron sabaton highlight
    ctx.fillStyle = dark ? '#4d525e' : '#717887';
    ctx.fillRect(kneeX - 2.2, -10.5, 4.4, 3.5);
    ctx.fillRect(footPosX - 2.5, -5.5, 6.2, 4);
  };
  drawLeg(-stride * 6 - 2, true);
  drawLeg(stride * 6 + 2, false);
  ctx.lineWidth = 1;

  // 3. Chainmail Skirt & Tattered Crimson/Charcoal Surcoat + Weathered Iron Cuirass
  // Chainmail hem
  ctx.fillStyle = '#3c404a';
  ctx.fillRect(-7.5, -18 - bob * 0.3, 15, 10);
  // Tattered split front tabard
  ctx.fillStyle = flash ? '#ffffff' : skin.capeLining;
  ctx.beginPath();
  ctx.moveTo(-4, -18 - bob * 0.3);
  ctx.lineTo(4, -18 - bob * 0.3);
  ctx.lineTo(5, -5);
  ctx.lineTo(1, -8);
  ctx.lineTo(-2, -4);
  ctx.lineTo(-4.5, -7);
  ctx.closePath();
  ctx.fill();

  // Weathered Steel Cuirass body
  ctx.fillStyle = flash ? '#fff5e4' : skin.plate;
  ctx.beginPath();
  ctx.moveTo(-10, -14 - bob * 0.3);
  ctx.lineTo(-8.8, -player.h + 14 - bob);
  ctx.lineTo(8.8, -player.h + 14 - bob);
  ctx.lineTo(10, -14 - bob * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#09070b';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  if (!flash) {
    ctx.fillStyle = 'rgba(255, 224, 185, 0.14)';
    ctx.beginPath();
    ctx.moveTo(-6, -21 - bob * 0.5);
    ctx.lineTo(-5, -player.h + 15 - bob);
    ctx.lineTo(5, -player.h + 15 - bob);
    ctx.lineTo(6, -21 - bob * 0.5);
    ctx.closePath();
    ctx.fill();
  }

  // Engraved Solar Eclipse Chest Medallion & Cross-Chest Leather Strap
  ctx.strokeStyle = skin.trim;
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.arc(0, -player.h + 22 - bob * 0.7, 4.2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = '#472f22';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-7, -player.h + 15 - bob);
  ctx.lineTo(7, -21 - bob * 0.4);
  ctx.stroke();
  ctx.fillStyle = skin.trim;
  ctx.beginPath();
  ctx.arc(-4.5, -player.h + 17 - bob, 1.8, 0, Math.PI * 2);
  ctx.fill();

  // Buckled Leather Belt & Hip Satchel
  ctx.fillStyle = '#38251a';
  ctx.fillRect(-9.5, -19.5 - bob * 0.4, 19, 3.2);
  ctx.fillStyle = skin.trim;
  ctx.fillRect(-2, -20 - bob * 0.4, 4, 4.2);
  ctx.fillStyle = '#4b3324';
  ctx.fillRect(-player.facing * 8 - 2.5, -17.5 - bob * 0.4, 5.5, 6);
  ctx.strokeStyle = '#0c090e';
  ctx.lineWidth = 0.9;
  ctx.strokeRect(-player.facing * 8 - 2.5, -17.5 - bob * 0.4, 5.5, 6);

  // Layered Lamellar Shoulder Pauldrons with Rivets & Torch Rim-Light
  for (const side of [-1, 1] as const) {
    const pxP = side * 6.8;
    const pyP = -player.h + 16.5 - bob;
    ctx.fillStyle = flash ? '#ffffff' : side === player.facing ? '#5a6270' : skin.plate;
    ctx.beginPath();
    ctx.ellipse(pxP, pyP, 7.2, 5.2, side * -0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 224, 178, 0.24)';
    ctx.beginPath();
    ctx.ellipse(pxP, pyP - 1.5, 4.8, 2, side * -0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = side === player.facing ? skin.trim : '#120f16';
    ctx.lineWidth = 1.1;
    ctx.stroke();
  }

  // 4. Jagged Crowned Gothic Fluted Visor Helm & Molten Eye Slits
  // Helm dome & pointed visor bevel
  ctx.fillStyle = flash ? '#ffffff' : skin.plate;
  ctx.beginPath();
  ctx.moveTo(-7.2, -player.h + 2 - bob);
  ctx.lineTo(7.2, -player.h + 2 - bob);
  ctx.lineTo(7.5, -player.h + 11 - bob);
  ctx.lineTo(0, -player.h + 15.5 - bob);
  ctx.lineTo(-7.5, -player.h + 11 - bob);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#09070b';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Shadowed side of fluted helm
  if (!flash) {
    ctx.fillStyle = 'rgba(10, 9, 14, 0.42)';
    ctx.beginPath();
    ctx.moveTo(-7.2, -player.h + 2 - bob);
    ctx.lineTo(0, -player.h + 2 - bob);
    ctx.lineTo(0, -player.h + 15.5 - bob);
    ctx.lineTo(-7.5, -player.h + 11 - bob);
    ctx.closePath();
    ctx.fill();
  }

  // Iron Jagged Crown Spikes atop the Helm
  ctx.fillStyle = flash ? '#ffffff' : skin.trim;
  ctx.beginPath();
  ctx.moveTo(-7, -player.h + 3 - bob);
  ctx.lineTo(-8, -player.h - 4 - bob);
  ctx.lineTo(-3.5, -player.h + 0.5 - bob);
  ctx.lineTo(0, -player.h - 6.5 - bob);
  ctx.lineTo(3.5, -player.h + 0.5 - bob);
  ctx.lineTo(8, -player.h - 4 - bob);
  ctx.lineTo(7, -player.h + 3 - bob);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#0c090e';
  ctx.lineWidth = 0.9;
  ctx.stroke();

  // Vertical Breather Visor Grille Slits
  ctx.strokeStyle = '#100d14';
  ctx.lineWidth = 1;
  for (let gx = -3; gx <= 4; gx += 2.2) {
    ctx.beginPath();
    ctx.moveTo(player.facing * 1.2 + gx, -player.h + 9.2 - bob);
    ctx.lineTo(player.facing * 1.2 + gx * 0.85, -player.h + 13.5 - bob);
    ctx.stroke();
  }

  // Fierce Glowing Ember Eye Slit
  const eyeX = player.facing === 1 ? 1.5 : -6.2;
  ctx.fillStyle = '#0d090e';
  ctx.fillRect(eyeX - 0.6, -player.h + 5.8 - bob, 5.6, 2.8);
  ctx.fillStyle = skin.eye;
  ctx.fillRect(eyeX, -player.h + 6.2 - bob, 4.4, 2);
  ctx.fillStyle = '#fff0a8';
  ctx.fillRect(eyeX + (player.facing === 1 ? 1.6 : 0.6), -player.h + 6.5 - bob, 2, 1.3);

  // 5. Weapon (Idle, Guard, or Off-hand Dagger)
  if (player.attackT <= 0) {
    ctx.save();
    ctx.translate(player.facing * 7, -23 - bob);
    if (player.parryT > 0 || player.guardT > 0) {
      ctx.rotate(player.facing === 1 ? -1.18 : Math.PI + 1.18);
    } else {
      ctx.rotate(player.facing === 1 ? 0.34 : Math.PI - 0.34);
    }
    drawWeaponSprite(ctx, weapon, 0.88);
    ctx.restore();

    if (weapon === 'eclipse_daggers' || weapon === 'twin_hammers') {
      ctx.save();
      ctx.translate(-player.facing * 6, -21 - bob);
      ctx.rotate(player.facing === 1 ? 2.45 : Math.PI - 2.45);
      drawWeaponSprite(ctx, weapon, weapon === 'twin_hammers' ? 0.78 : 0.74);
      ctx.restore();
    }
  }

  // Golden Riposte Buff Aura after a Perfect Parry
  if (player.riposteBuffT > 0) {
    ctx.strokeStyle = `rgba(255, 212, 112, ${0.45 + Math.sin(time * 12) * 0.2})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(0, -player.h * 0.5, 18, 28, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  ctx.restore();
  ctx.globalAlpha = 1;

  // 6. Parry / Guard Ornamental Golden Rune Ward
  if (player.parryT > 0 || player.guardT > 0) {
    const px = player.x + player.w / 2 + player.facing * 15;
    const py = player.y + 22;
    ctx.save();
    ctx.strokeStyle = player.parryT > 0 ? 'rgba(255, 212, 112, 0.92)' : '#968b7c';
    ctx.lineWidth = player.parryT > 0 ? 4.5 : 2.5;
    ctx.beginPath();
    ctx.arc(px, py, 27, -1.2, 1.2, player.facing === -1);
    ctx.stroke();
    if (player.parryT > 0) {
      ctx.strokeStyle = 'rgba(255, 248, 210, 0.92)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(px, py, 21, -0.95, 0.95, player.facing === -1);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 7. Tapered Crescent Weapon Slash Ribbon + Blade Motion
  if (player.attackT > 0) {
    const prog = 1 - player.attackT / Math.max(0.01, player.attackTotalT);
    const isHeavy = player.attackMove === 'heavy' || player.attackMove === 'light3';
    const reach =
      (weapon === 'ash_halberd'
        ? 88
        : weapon === 'scythe_eclipse'
        ? 84
        : weapon === 'belfry_greatsword'
        ? 78
        : weapon === 'twin_hammers'
        ? 56
        : weapon === 'eclipse_daggers'
        ? 50
        : 62) + (isHeavy ? 14 : 0);

    ctx.save();
    ctx.translate(player.x + player.w / 2, player.y + 22);
    ctx.scale(player.facing, 1);

    const outerCol =
      player.attackMove === 'heavy'
        ? 'rgba(235, 112, 42, 0.78)'
        : player.attackMove === 'light3'
        ? 'rgba(255, 212, 112, 0.88)'
        : 'rgba(220, 232, 246, 0.72)';
    const innerCol = player.attackMove === 'heavy' ? '#ffe08a' : '#ffffff';

    if (player.attackMove === 'plunge') {
      drawCrescentRibbon(ctx, 0, 14, reach * 0.72, 0.12, Math.PI - 0.12, 14, outerCol, innerCol);
    } else if (player.attackMove === 'launcher') {
      drawCrescentRibbon(ctx, 6, 0, reach * 0.85, -1.35, 0.72, 14, outerCol, innerCol);
    } else {
      const sweepDir = player.attackMove === 'light2' ? -1 : 1;
      const headAngle =
        sweepDir === 1
          ? -1.25 + Math.min(1, prog * 1.35) * 2.45
          : 1.25 - Math.min(1, prog * 1.35) * 2.45;
      const tailAngle = headAngle - sweepDir * (1.75 * (1 - prog * 0.55));

      const a0 = Math.min(tailAngle, headAngle);
      const a1 = Math.max(tailAngle, headAngle);
      drawCrescentRibbon(
        ctx,
        6,
        0,
        reach * 0.8,
        a0,
        a1,
        isHeavy ? 18 : 13,
        outerCol,
        innerCol
      );

      ctx.save();
      ctx.rotate(headAngle);
      ctx.translate(reach * 0.34, 0);
      drawWeaponSprite(ctx, weapon, 0.92);
      ctx.restore();
    }
    ctx.restore();
  }

  // 8. Orbital Flame Wisp Companion
  if (hasWisp) {
    const wx = player.x + player.w / 2 + Math.cos(player.wispAngle) * 44;
    const wy = player.y + 18 + Math.sin(player.wispAngle * 1.4) * 16;
    if (glow) {
      ctx.globalAlpha = 0.65;
      ctx.drawImage(glow, wx - 28, wy - 28, 56, 56);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = '#ffd470';
    ctx.beginPath();
    ctx.arc(wx, wy, 4.5 + Math.sin(time * 10) * 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(wx, wy, 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCrescentRibbon(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  a0: number,
  a1: number,
  thickness: number,
  outerCol: string,
  innerCol: string
): void {
  const steps = 14;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = outerCol;
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = a0 + (a1 - a0) * t;
    const taper = Math.sin(t * Math.PI);
    const r = radius + thickness * 0.48 * taper;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  for (let i = steps; i >= 0; i--) {
    const t = i / steps;
    const a = a0 + (a1 - a0) * t;
    const taper = Math.sin(t * Math.PI);
    const r = radius - thickness * 0.62 * taper;
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();

  // Secondary incandescent inner arc
  ctx.strokeStyle = innerCol;
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy, radius + thickness * 0.28, a0 + (a1 - a0) * 0.12, a1 - (a1 - a0) * 0.04);
  ctx.stroke();

  ctx.strokeStyle = '#ffffff';
  ctx.globalAlpha = 0.72;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(cx, cy, radius + thickness * 0.36, a0 + (a1 - a0) * 0.28, a1 - (a1 - a0) * 0.06);
  ctx.stroke();
  ctx.restore();
}

export function drawDetailedEnemy(
  ctx: CanvasRenderingContext2D,
  e: Enemy,
  player: Player,
  time: number,
  highContrastTelegraphs = false,
  showEnemyBars = true
): void {
  if (e.state === 'dead') {
    ctx.globalAlpha = Math.max(0, e.deadT / 0.35);
  } else if (!e.flying) {
    drawGroundShadow(ctx, e.x + e.w / 2, e.y + e.h, e.w * 0.55, 0.46);
  }

  ctx.save();
  const cx = e.x + e.w / 2;
  const cy = e.y + e.h;
  ctx.translate(cx, cy);
  if (e.state === 'dead') {
    ctx.rotate(e.facing * -0.68 * (1 - e.deadT / 0.35));
  }

  // Elite golden / blazing additive aura
  if (e.elite !== 'none' && e.state !== 'dead') {
    const eliteGlow = getColoredGlow(e.elite === 'blazing' ? 'amber' : 'gold');
    if (eliteGlow) {
      ctx.globalAlpha = 0.52;
      ctx.drawImage(eliteGlow, -e.w * 1.1, -e.h * 1.15, e.w * 2.2, e.h * 1.3);
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = e.elite === 'blazing' ? '#ff8b3d' : '#ffd470';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(0, -e.h / 2, e.w * 0.74, e.h * 0.62, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  const flash = e.hitFlashT > 0;
  const stag = e.state === 'staggered';
  const chill = e.chillT > 0;
  const primary = flash ? '#fff6e6' : stag ? '#ffd470' : chill ? '#7ab8ff' : e.color;
  const ink = '#0b080d';
  const stride = Math.abs(e.vx) > 20 ? Math.sin(time * 10 + e.id) * 4.5 : 0;

  if (e.kind === 'watcher') {
    const hover = Math.sin(time * 4 + e.id) * 5;
    const flap = Math.sin(time * 10.5 + e.id) * 8;
    ctx.translate(0, hover);

    // 3-tier articulated dark-steel feathered wings with bronze rib spines
    for (const side of [-1, 1] as const) {
      ctx.fillStyle = flash ? '#fff6e6' : '#252f3d';
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(side * 8, -e.h * 0.56);
      ctx.quadraticCurveTo(side * e.w * 0.85, -e.h * 1.24 + flap, side * e.w * 1.38, -e.h * 0.9 + flap);
      ctx.lineTo(side * e.w * 1.12, -e.h * 0.52 + flap * 0.65);
      ctx.lineTo(side * e.w * 0.84, -e.h * 0.28 + flap * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#b58d46';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(side * 10, -e.h * 0.58);
      ctx.lineTo(side * e.w * 1.22, -e.h * 0.85 + flap * 0.9);
      ctx.stroke();
    }

    // Rotating outer brass astrolabe gimbal
    ctx.strokeStyle = '#d4a853';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.arc(0, -e.h * 0.56, e.w * 0.56, time * 1.6, time * 1.6 + Math.PI * 1.45);
    ctx.stroke();

    // Shaded obsidian-bronze censer sphere
    ctx.fillStyle = flash ? '#fff6e6' : '#2c3645';
    ctx.beginPath();
    ctx.ellipse(0, -e.h * 0.56, e.w * 0.44, e.h * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    if (!flash) {
      ctx.fillStyle = 'rgba(130, 152, 180, 0.28)';
      ctx.beginPath();
      ctx.ellipse(-3, -e.h * 0.68, e.w * 0.24, e.h * 0.18, -0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Inner eye socket & tracking molten iris
    ctx.fillStyle = '#09070b';
    ctx.beginPath();
    ctx.arc(e.facing * 4, -e.h * 0.58, 7.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#9c7838';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = e.state === 'windup' ? '#ff2b44' : '#ff9842';
    ctx.beginPath();
    ctx.arc(e.facing * 4.8, -e.h * 0.58, 4.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff2c2';
    ctx.beginPath();
    ctx.arc(e.facing * 5.2, -e.h * 0.6, 1.6, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.kind === 'penitent') {
    // Hunched skeletal ash pilgrim in dark weathered shroud + bone rosary + cracked ivory mask + sickle
    ctx.fillStyle = '#141018';
    ctx.fillRect(-5 + stride, -11, 4, 11);
    ctx.fillRect(2 - stride, -11, 4, 11);

    // Gritty dark-ash layered shroud with vertical shading (no flat bright grey)
    ctx.fillStyle = flash ? '#fff6e6' : stag ? '#ffd470' : '#352e34';
    ctx.beginPath();
    ctx.moveTo(-e.w * 0.64, -2);
    ctx.lineTo(-e.w * 0.46, -e.h * 0.72);
    ctx.quadraticCurveTo(e.facing * 4, -e.h - 4, e.w * 0.42, -e.h * 0.7);
    ctx.lineTo(e.w * 0.58, -4);
    ctx.lineTo(e.w * 0.25, -9);
    ctx.lineTo(0, -2);
    ctx.lineTo(-e.w * 0.28, -8);
    ctx.closePath();
    ctx.fill();
    if (!flash && !stag) {
      ctx.fillStyle = 'rgba(12, 9, 15, 0.45)';
      ctx.fillRect(-e.w * 0.48, -14, e.w * 0.96, 9);
    }
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.3;
    ctx.stroke();

    // Tattered inner crimson liturgical sash & pale bone rib straps
    ctx.fillStyle = '#5e1a26';
    ctx.fillRect(-3, -e.h * 0.58, 6, e.h * 0.36);
    ctx.fillStyle = '#cbbca8';
    ctx.fillRect(-6, -e.h * 0.54, 12, 2);
    ctx.fillRect(-5, -e.h * 0.46, 10, 2);

    // Cracked ivory penitent mask
    ctx.fillStyle = flash ? '#ffffff' : '#dfd2be';
    ctx.beginPath();
    ctx.moveTo(e.facing * 2 - 6, -e.h + 5);
    ctx.lineTo(e.facing * 2 + 6, -e.h + 5);
    ctx.lineTo(e.facing * 2 + 4.5, -e.h + 18);
    ctx.lineTo(e.facing * 2 - 4.5, -e.h + 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(40, 28, 24, 0.25)';
    ctx.fillRect(e.facing * 2 - 5, -e.h + 6, 4, 11);
    ctx.fillStyle = e.state === 'windup' ? '#ff3344' : '#ff9c40';
    ctx.fillRect(e.facing * 4 - 1.5, -e.h + 9, 3.8, 3);

    // Curved rusted executioner sickle
    ctx.save();
    ctx.translate(e.facing * 11, -e.h * 0.46);
    ctx.strokeStyle = '#9aa4b0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 11, -0.9, 1.5, e.facing === -1);
    ctx.stroke();
    ctx.strokeStyle = '#7c202c';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, 12.5, 0.2, 1.4, e.facing === -1);
    ctx.stroke();
    ctx.restore();
  } else if (e.kind === 'pyromancer') {
    // Ornate liturgical crimson cultist with horned mitre & solar orb staff
    ctx.fillStyle = primary;
    ctx.beginPath();
    ctx.moveTo(-e.w * 0.62, -2);
    ctx.lineTo(-e.w * 0.42, -e.h * 0.66);
    ctx.lineTo(e.w * 0.42, -e.h * 0.66);
    ctx.lineTo(e.w * 0.62, -2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.3;
    ctx.stroke();

    // Gold stole embroidery
    ctx.fillStyle = '#d4a853';
    ctx.fillRect(-3, -e.h * 0.65, 6, e.h * 0.58);

    // Horned liturgical mitre crown
    ctx.fillStyle = '#5c1824';
    ctx.beginPath();
    ctx.moveTo(-8, -e.h + 15);
    ctx.lineTo(-5, -e.h - 6);
    ctx.lineTo(0, -e.h + 4);
    ctx.lineTo(5, -e.h - 6);
    ctx.lineTo(8, -e.h + 15);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#d4a853';
    ctx.stroke();

    ctx.fillStyle = e.state === 'windup' ? '#ff3344' : '#ffd470';
    ctx.fillRect(e.facing * 3 - 2, -e.h + 11, 4, 2.5);

    // Gnarled staff + miniature swirling solar orb
    ctx.fillStyle = '#473024';
    ctx.fillRect(e.facing * 12, -e.h + 4, 3.5, e.h - 5);
    const orbX = e.facing * 13.5;
    const orbY = -e.h + 2;
    const ag = getColoredGlow('amber');
    if (ag) {
      ctx.globalAlpha = 0.72;
      ctx.drawImage(ag, orbX - 24, orbY - 24, 48, 48);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = '#ff8c3b';
    ctx.beginPath();
    ctx.arc(orbX, orbY, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff5c4';
    ctx.beginPath();
    ctx.arc(orbX, orbY, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.kind === 'specter') {
    // Floating translucent wraith with fractured porcelain halo + astral claws
    const floatY = Math.sin(time * 4.2 + e.id) * 4;
    ctx.translate(0, floatY);

    ctx.fillStyle = flash ? '#ffffff' : 'rgba(110, 74, 175, 0.85)';
    ctx.beginPath();
    ctx.moveTo(-e.w * 0.52, -e.h * 0.68);
    ctx.quadraticCurveTo(0, -e.h - 6, e.w * 0.52, -e.h * 0.68);
    ctx.lineTo(e.w * 0.62, -6);
    ctx.lineTo(e.w * 0.2, -14);
    ctx.lineTo(0, -2);
    ctx.lineTo(-e.w * 0.25, -13);
    ctx.lineTo(-e.w * 0.6, -5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#d4b8ff';
    ctx.lineWidth = 1.1;
    ctx.stroke();

    // Fractured floating halo shards
    for (let s = 0; s < 3; s++) {
      const sa = time * 1.8 + (s * Math.PI * 2) / 3;
      ctx.fillStyle = '#e8dcff';
      ctx.fillRect(Math.cos(sa) * 14 - 2, -e.h + 6 + Math.sin(sa) * 5, 4, 4);
    }

    // Hollow skull visage
    ctx.fillStyle = '#efe8f8';
    ctx.beginPath();
    ctx.ellipse(e.facing * 2, -e.h + 12, 6, 7.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#180f24';
    ctx.fillRect(e.facing * 3 - 2, -e.h + 10, 4, 3);
    ctx.fillStyle = '#d4b8ff';
    ctx.fillRect(e.facing * 3.5 - 1, -e.h + 11, 2, 1.5);
  } else {
    // Armored Warriors & Colossal Bosses with volumetric armor gradients, tabards & gothic helms
    const isTall = e.isBoss;
    // Articulated armored greaves with knee guards
    ctx.fillStyle = '#17131b';
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.2;
    ctx.fillRect(-e.w * 0.3 + stride, -e.h * 0.26, e.w * 0.22, e.h * 0.26);
    ctx.strokeRect(-e.w * 0.3 + stride, -e.h * 0.26, e.w * 0.22, e.h * 0.26);
    ctx.fillRect(e.w * 0.08 - stride, -e.h * 0.26, e.w * 0.22, e.h * 0.26);
    ctx.strokeRect(e.w * 0.08 - stride, -e.h * 0.26, e.w * 0.22, e.h * 0.26);
    ctx.fillStyle = '#6b5a4a';
    ctx.fillRect(-e.w * 0.3 + stride, -e.h * 0.22, e.w * 0.22, 3);
    ctx.fillRect(e.w * 0.08 - stride, -e.h * 0.22, e.w * 0.22, 3);

    // Flowing Cape / Tattered Waist Tabard
    if (isTall) {
      ctx.fillStyle = e.kind === 'mother' ? '#5e1624' : e.kind === 'sovereign' ? '#2c1e16' : '#261e29';
      ctx.beginPath();
      ctx.moveTo(-e.w * 0.48, -e.h * 0.84);
      ctx.quadraticCurveTo(-e.w * 0.85, -e.h * 0.4, -e.w * 0.78, -4);
      ctx.lineTo(e.w * 0.78, -4);
      ctx.quadraticCurveTo(e.w * 0.85, -e.h * 0.4, e.w * 0.48, -e.h * 0.84);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillStyle = e.kind === 'flagellant' ? '#4a1b20' : '#2a2029';
      ctx.beginPath();
      ctx.moveTo(-e.w * 0.26, -e.h * 0.36);
      ctx.lineTo(e.w * 0.26, -e.h * 0.36);
      ctx.lineTo(e.w * 0.18, -4);
      ctx.lineTo(0, -10);
      ctx.lineTo(-e.w * 0.18, -4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Tapered Armored Cuirass with metallic two-tone bevel shading
    ctx.fillStyle =
      flash || stag || chill ? primary : e.kind === 'flagellant' ? '#5c4534' : primary;
    ctx.beginPath();
    ctx.moveTo(-e.w * 0.36, -e.h * 0.24);
    ctx.lineTo(-e.w * 0.46, -e.h + 15);
    ctx.lineTo(e.w * 0.46, -e.h + 15);
    ctx.lineTo(e.w * 0.36, -e.h * 0.24);
    ctx.closePath();
    ctx.fill();
    if (!flash && !stag && !chill) {
      ctx.fillStyle = 'rgba(10, 8, 14, 0.36)';
      ctx.fillRect(-e.w * 0.36, -e.h * 0.48, e.w * 0.72, e.h * 0.24);
    }
    ctx.stroke();

    // Specular torso chestplate ridge & brass belt
    ctx.fillStyle = 'rgba(255, 240, 212, 0.14)';
    ctx.fillRect(-e.w * 0.2, -e.h + 18, e.w * 0.2, e.h * 0.42);
    ctx.fillStyle = '#c89b44';
    ctx.fillRect(-e.w * 0.4, -e.h * 0.38, e.w * 0.8, isTall ? 5 : 3);

    // Sculpted Shoulder Pauldrons with upper specular bevel
    for (const side of [-1, 1] as const) {
      ctx.fillStyle = e.kind === 'flagellant' && !flash ? '#6e5642' : primary;
      ctx.beginPath();
      ctx.ellipse(side * e.w * 0.42, -e.h + (isTall ? 22 : 17), isTall ? 15 : 9, isTall ? 11 : 7, side * 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 238, 208, 0.2)';
      ctx.beginPath();
      ctx.ellipse(side * e.w * 0.42, -e.h + (isTall ? 19 : 15), isTall ? 9 : 5, isTall ? 4 : 2.5, side * 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = isTall ? '#d4a853' : ink;
      ctx.stroke();
    }

    // Tapered Gothic Helm / Visor
    ctx.fillStyle = e.kind === 'flagellant' && !flash ? '#524034' : primary;
    ctx.beginPath();
    ctx.moveTo(-e.w * 0.26, -e.h + 16);
    ctx.lineTo(-e.w * 0.2, -e.h - 2);
    ctx.lineTo(0, -e.h - 5);
    ctx.lineTo(e.w * 0.2, -e.h - 2);
    ctx.lineTo(e.w * 0.26, -e.h + 16);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.stroke();

    // Archetype Gear & Boss Crowns
    if (e.isBoss) {
      ctx.fillStyle = e.phase === 2 ? '#ff4d63' : '#ffd470';
      ctx.beginPath();
      ctx.moveTo(-e.w * 0.28, -e.h);
      ctx.lineTo(-e.w * 0.42, -e.h - 20);
      ctx.lineTo(-e.w * 0.14, -e.h - 4);
      ctx.lineTo(0, -e.h - 28);
      ctx.lineTo(e.w * 0.14, -e.h - 4);
      ctx.lineTo(e.w * 0.42, -e.h - 20);
      ctx.lineTo(e.w * 0.28, -e.h);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = e.phase === 2 ? 'rgba(255, 77, 99, 0.78)' : 'rgba(212, 168, 83, 0.68)';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(0, -e.h * 0.62, e.w * 0.88, time * 0.75, time * 0.75 + Math.PI * 1.4);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -e.h * 0.62, e.w * 0.74, -time * 0.9, -time * 0.9 + Math.PI * 1.1);
      ctx.stroke();

      if (e.kind === 'sovereign') {
        for (let k = 0; k < 6; k++) {
          const sa = -Math.PI * 0.88 + (k / 5) * Math.PI * 0.76 + Math.sin(time * 2 + k) * 0.06;
          const sx = Math.cos(sa) * (e.w * 0.96);
          const sy = -e.h * 0.62 + Math.sin(sa) * (e.w * 0.96);
          ctx.save();
          ctx.translate(sx, sy);
          ctx.rotate(sa + Math.PI * 0.5);
          ctx.fillStyle = '#ffd470';
          ctx.fillRect(-1.5, -14, 3, 24);
          ctx.restore();
        }
      }
      ctx.lineWidth = 1;

      ctx.save();
      ctx.translate(e.facing * e.w * 0.44, -e.h * 0.5);
      ctx.rotate(e.facing === 1 ? -1.15 : Math.PI + 1.15);
      drawWeaponSprite(ctx, e.kind === 'archon' ? 'belfry_greatsword' : 'ash_halberd', 1.45);
      ctx.restore();
    } else if (e.kind === 'lancer') {
      ctx.fillStyle = '#9c2634';
      ctx.beginPath();
      ctx.moveTo(-e.facing * 4, -e.h);
      ctx.quadraticCurveTo(-e.facing * 18, -e.h - 10, -e.facing * 20, -e.h + 10);
      ctx.closePath();
      ctx.fill();

      const shX = e.facing === 1 ? e.w * 0.34 : -e.w * 0.34 - 13;
      ctx.fillStyle = '#3b424f';
      ctx.fillRect(shX, -e.h + 12, 13, e.h - 16);
      ctx.strokeStyle = '#d4a853';
      ctx.lineWidth = 1.6;
      ctx.strokeRect(shX, -e.h + 12, 13, e.h - 16);
      ctx.fillStyle = '#d4a853';
      ctx.fillRect(shX + 4, -e.h * 0.55, 5, 5);
      ctx.lineWidth = 1;

      ctx.save();
      ctx.translate(e.facing * 4, -e.h * 0.45);
      ctx.rotate(e.facing === 1 ? -0.15 : Math.PI + 0.15);
      drawWeaponSprite(ctx, 'ash_halberd', 0.8);
      ctx.restore();
    } else if (e.kind === 'flagellant') {
      // Glowing ember furnace chest slit & heavy spiked censer mace
      ctx.fillStyle = '#ff7b29';
      ctx.fillRect(-4, -e.h * 0.62, 8, 9);
      ctx.fillStyle = '#fff0a8';
      ctx.fillRect(-2, -e.h * 0.6, 4, 5);

      ctx.fillStyle = '#535b66';
      ctx.fillRect(e.facing * (e.w * 0.42), -e.h + 4, e.facing * 5, 36);
      ctx.fillStyle = '#9c7838';
      ctx.beginPath();
      ctx.arc(e.facing * (e.w * 0.45), -e.h + 4, 8.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = ink;
      ctx.stroke();
      ctx.fillStyle = '#ff7b29';
      ctx.beginPath();
      ctx.arc(e.facing * (e.w * 0.45), -e.h + 4, 3.8, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.kind === 'arbalest') {
      ctx.fillStyle = '#5c4636';
      ctx.fillRect(e.facing * 4, -e.h * 0.56, e.facing * 22, 4.5);
      ctx.strokeStyle = '#d4dce4';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(e.facing * 20, -e.h * 0.54, 11, -1.05, 1.05, e.facing === -1);
      ctx.stroke();
      ctx.lineWidth = 1;
    }

    // Glowing Visor Eyes
    ctx.fillStyle = e.state === 'windup' ? '#ff2b44' : e.isBoss ? '#ffd470' : '#ff8c3b';
    const eyeX = e.facing === 1 ? e.w * 0.08 : -e.w * 0.24;
    ctx.fillRect(eyeX, -e.h + 7, 6, 3.5);
  }

  // Windup Telegraph Ring & Arbalest Aim Laser
  if (e.state === 'windup') {
    ctx.save();
    ctx.strokeStyle = highContrastTelegraphs ? '#ffeb3b' : 'rgba(255, 68, 85, 0.92)';
    ctx.lineWidth = highContrastTelegraphs ? 4.0 : 2.6;
    ctx.beginPath();
    ctx.arc(0, -e.h - 16, (highContrastTelegraphs ? 12 : 9) + Math.sin(time * 24) * 2.5, 0, Math.PI * 2);
    ctx.stroke();

    if (e.kind === 'arbalest') {
      ctx.strokeStyle = highContrastTelegraphs ? 'rgba(255, 235, 59, 0.92)' : 'rgba(255, 68, 85, 0.72)';
      ctx.lineWidth = highContrastTelegraphs ? 2.4 : 1.3;
      ctx.setLineDash([7, 4]);
      ctx.beginPath();
      ctx.moveTo(0, -e.h * 0.56);
      ctx.lineTo(player.x + player.w / 2 - cx, player.y + player.h / 2 - cy);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }

  ctx.restore();

  // Crisp Enemy HP, Stagger & Status Badges
  if (!e.isBoss && e.state !== 'dead' && showEnemyBars && (e.hp < e.maxHp || e.stagger > 0 || e.elite !== 'none')) {
    const barW = Math.max(e.w + 8, 38);
    const bx = e.x + e.w / 2 - barW / 2;
    ctx.fillStyle = 'rgba(10, 8, 13, 0.9)';
    ctx.fillRect(bx - 1, e.y - 16, barW + 2, 8);
    ctx.fillStyle = '#c4303e';
    ctx.fillRect(bx, e.y - 15, barW * Math.max(0, e.hp / e.maxHp), 4);
    ctx.fillStyle = '#ffd470';
    ctx.fillRect(bx, e.y - 10, barW * Math.min(1, e.stagger / e.maxStagger), 2);

    let badgeX = bx;
    if (e.burnT > 0) {
      ctx.fillStyle = '#ff7b29';
      ctx.fillRect(badgeX, e.y - 22, 5, 4);
      badgeX += 7;
    }
    if (e.chillT > 0) {
      ctx.fillStyle = '#7ab8ff';
      ctx.fillRect(badgeX, e.y - 22, 5, 4);
      badgeX += 7;
    }
    if (e.sunderT > 0) {
      ctx.fillStyle = '#ffd470';
      ctx.fillRect(badgeX, e.y - 22, 5, 4);
    }
  }
  ctx.globalAlpha = 1;
}

export function drawDetailedProp(ctx: CanvasRenderingContext2D, pr: RoomProp, time: number): void {
  drawGroundShadow(ctx, pr.x + pr.w / 2, pr.y + pr.h, pr.w * 0.52, 0.42);

  if (pr.type === 'chest' || pr.type === 'gilded_chest') {
    const gilded = pr.type === 'gilded_chest';
    if (gilded && !pr.opened) {
      const g = getColoredGlow('gold');
      if (g) {
        ctx.globalAlpha = 0.58;
        ctx.drawImage(g, pr.x + pr.w / 2 - 56, pr.y + pr.h / 2 - 56, 112, 112);
        ctx.globalAlpha = 1;
      }
    }
    ctx.fillStyle = pr.opened ? '#261e1a' : gilded ? '#966824' : '#5e4024';
    ctx.fillRect(pr.x, pr.y + 8, pr.w, pr.h - 8);
    ctx.beginPath();
    ctx.ellipse(pr.x + pr.w / 2, pr.y + 8, pr.w / 2, 8, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = gilded ? '#ffd470' : '#b88d48';
    ctx.lineWidth = 1.6;
    ctx.strokeRect(pr.x, pr.y + 8, pr.w, pr.h - 8);
    ctx.fillStyle = gilded ? '#ffd470' : '#968262';
    ctx.fillRect(pr.x + 6, pr.y + 3, 3, pr.h - 3);
    ctx.fillRect(pr.x + pr.w - 9, pr.y + 3, 3, pr.h - 3);
    if (!pr.opened) {
      ctx.fillRect(pr.x + pr.w / 2 - 3, pr.y + 11, 6, 8);
    }
    ctx.lineWidth = 1;
  } else if (pr.type === 'urn' && !pr.broken) {
    ctx.fillStyle = '#5c4337';
    ctx.beginPath();
    ctx.ellipse(pr.x + pr.w / 2, pr.y + pr.h * 0.62, pr.w * 0.46, pr.h * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#120d12';
    ctx.stroke();
    ctx.fillStyle = '#8b6852';
    ctx.fillRect(pr.x + 4, pr.y, pr.w - 8, 5);
    ctx.fillStyle = '#d4a853';
    ctx.fillRect(pr.x + 3, pr.y + 13, pr.w - 6, 2);
  } else if (pr.type === 'brazier') {
    const cx = pr.x + pr.w / 2;
    if (!pr.used) {
      const g = getTorchGlow();
      if (g) {
        ctx.globalAlpha = 0.82;
        ctx.drawImage(g, Math.round(cx - 104), Math.round(pr.y - 90), 208, 208);
        ctx.globalAlpha = 1;
      }
    }
    // Wrought-iron clawed feet & ribbed bowl
    ctx.fillStyle = '#1b1517';
    ctx.fillRect(pr.x + 7, pr.y + 20, 4, 18);
    ctx.fillRect(pr.x + pr.w - 11, pr.y + 20, 4, 18);
    ctx.fillRect(cx - 2, pr.y + 20, 4, 16);
    ctx.fillStyle = '#382c2a';
    ctx.beginPath();
    ctx.moveTo(pr.x - 1, pr.y + 10);
    ctx.lineTo(pr.x + pr.w + 1, pr.y + 10);
    ctx.lineTo(pr.x + pr.w - 5, pr.y + 22);
    ctx.lineTo(pr.x + 5, pr.y + 22);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#6b5340';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.lineWidth = 1;

    if (!pr.used) {
      const fl = Math.sin(time * 9.5 + pr.x) * 3.5;
      ctx.fillStyle = '#c43e22';
      ctx.beginPath();
      ctx.moveTo(pr.x + 3, pr.y + 10);
      ctx.quadraticCurveTo(cx - 6, pr.y - 12, cx + fl, pr.y - 24);
      ctx.quadraticCurveTo(cx + 8, pr.y - 8, pr.x + pr.w - 3, pr.y + 10);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#ff8c2b';
      ctx.beginPath();
      ctx.moveTo(pr.x + 7, pr.y + 10);
      ctx.quadraticCurveTo(cx - 2, pr.y - 7, cx + fl * 0.65, pr.y - 16);
      ctx.quadraticCurveTo(cx + 4, pr.y - 5, pr.x + pr.w - 7, pr.y + 10);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#fff2b0';
      ctx.beginPath();
      ctx.arc(cx, pr.y + 5, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (pr.type === 'shrine') {
    if (!pr.used) {
      const cg = getCrimsonGlow();
      if (cg) {
        ctx.globalAlpha = 0.75;
        ctx.drawImage(cg, pr.x + pr.w / 2 - 80, pr.y - 56, 160, 160);
        ctx.globalAlpha = 1;
      }
    }
    ctx.fillStyle = '#262028';
    ctx.fillRect(pr.x + 4, pr.y + 18, pr.w - 8, pr.h - 18);
    ctx.fillStyle = '#4a3f4e';
    ctx.fillRect(pr.x, pr.y + pr.h - 8, pr.w, 8);
    const hover = pr.used ? 0 : Math.sin(time * 3) * 3.5;
    ctx.fillStyle = pr.used ? '#4a3d42' : '#e03c4e';
    ctx.beginPath();
    ctx.moveTo(pr.x + pr.w / 2, pr.y - 10 + hover);
    ctx.lineTo(pr.x + pr.w - 5, pr.y + 12 + hover);
    ctx.lineTo(pr.x + pr.w / 2, pr.y + 23 + hover);
    ctx.lineTo(pr.x + 5, pr.y + 12 + hover);
    ctx.closePath();
    ctx.fill();
    if (!pr.used) {
      ctx.fillStyle = 'rgba(255, 220, 226, 0.65)';
      ctx.beginPath();
      ctx.moveTo(pr.x + pr.w / 2, pr.y - 6 + hover);
      ctx.lineTo(pr.x + pr.w / 2 + 5, pr.y + 11 + hover);
      ctx.lineTo(pr.x + pr.w / 2, pr.y + 18 + hover);
      ctx.closePath();
      ctx.fill();
    }
  } else if (pr.type === 'merchant') {
    const g = getTorchGlow();
    if (g) {
      ctx.globalAlpha = 0.68;
      ctx.drawImage(g, pr.x - 60, pr.y - 30, 120, 120);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = '#3d3028';
    ctx.fillRect(pr.x + 16, pr.y + 12, 16, 26);
    ctx.fillStyle = '#2a303c';
    ctx.beginPath();
    ctx.moveTo(pr.x + 2, pr.y + pr.h);
    ctx.lineTo(pr.x + 8, pr.y + 10);
    ctx.lineTo(pr.x + 26, pr.y + 10);
    ctx.lineTo(pr.x + 30, pr.y + pr.h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#53453c';
    ctx.beginPath();
    ctx.arc(pr.x + 17, pr.y + 10, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#6b5235';
    ctx.fillRect(pr.x - 4, pr.y + 4, 3, pr.h - 4);
    ctx.fillStyle = '#ffd470';
    ctx.beginPath();
    ctx.arc(pr.x - 6, pr.y + 18 + Math.sin(time * 3) * 1.5, 4.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (pr.type === 'lore') {
    if (!pr.used) {
      const ag = getAstralGlow();
      if (ag) {
        ctx.globalAlpha = 0.72;
        ctx.drawImage(ag, pr.x + pr.w / 2 - 64, pr.y - 34, 128, 128);
        ctx.globalAlpha = 1;
      }
    }
    ctx.fillStyle = '#2d2a34';
    ctx.beginPath();
    ctx.moveTo(pr.x, pr.y + pr.h);
    ctx.lineTo(pr.x + 2, pr.y + 8);
    ctx.lineTo(pr.x + pr.w / 2, pr.y);
    ctx.lineTo(pr.x + pr.w - 2, pr.y + 8);
    ctx.lineTo(pr.x + pr.w, pr.y + pr.h);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#120f16';
    ctx.stroke();
    ctx.fillStyle = pr.used ? '#6e645c' : '#8ab8e6';
    ctx.fillRect(pr.x + 8, pr.y + 13, pr.w - 16, 3);
    ctx.fillRect(pr.x + 7, pr.y + 21, pr.w - 14, 3);
    ctx.fillRect(pr.x + 9, pr.y + 29, pr.w - 18, 3);
  } else if (pr.type === 'npc' && !pr.used) {
    const ag = getAstralGlow();
    if (ag) {
      ctx.globalAlpha = 0.65;
      ctx.drawImage(ag, pr.x + pr.w / 2 - 60, pr.y - 28, 120, 120);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = '#3e5a7a';
    ctx.beginPath();
    ctx.moveTo(pr.x, pr.y + pr.h);
    ctx.lineTo(pr.x + 4, pr.y + 14);
    ctx.lineTo(pr.x + pr.w - 4, pr.y + 14);
    ctx.lineTo(pr.x + pr.w, pr.y + pr.h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e8e1d5';
    ctx.fillRect(pr.x + 7, pr.y + 2, pr.w - 14, 13);
  } else if (pr.type === 'exit') {
    // Gothic stone pillars & keystone arch
    ctx.fillStyle = '#241d26';
    ctx.fillRect(pr.x - 9, pr.y + 12, 11, pr.h - 12);
    ctx.fillRect(pr.x + pr.w - 2, pr.y + 12, 11, pr.h - 12);
    ctx.fillStyle = '#3b2f38';
    ctx.fillRect(pr.x - 11, pr.y + 10, 15, 5);
    ctx.fillRect(pr.x + pr.w - 4, pr.y + 10, 15, 5);

    ctx.fillStyle = pr.locked ? '#181014' : '#0f0b14';
    ctx.beginPath();
    ctx.moveTo(pr.x, pr.y + pr.h);
    ctx.lineTo(pr.x, pr.y + 24);
    ctx.quadraticCurveTo(pr.x + pr.w / 2, pr.y - 14, pr.x + pr.w, pr.y + 24);
    ctx.lineTo(pr.x + pr.w, pr.y + pr.h);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = pr.locked ? '#822834' : '#d4a853';
    ctx.lineWidth = 3.2;
    ctx.stroke();
    ctx.lineWidth = 1;

    // Keystone crest
    ctx.fillStyle = pr.locked ? '#5e2029' : '#d4a853';
    ctx.fillRect(pr.x + pr.w / 2 - 4, pr.y + 2, 8, 8);

    if (pr.locked) {
      ctx.strokeStyle = '#a82835';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(pr.x, pr.y + 28);
      ctx.lineTo(pr.x + pr.w, pr.y + 62);
      ctx.moveTo(pr.x + pr.w, pr.y + 28);
      ctx.lineTo(pr.x, pr.y + 62);
      ctx.stroke();
      ctx.lineWidth = 1;
    } else {
      const g = getColoredGlow('gold');
      if (g) {
        ctx.globalAlpha = 0.82;
        ctx.drawImage(g, Math.round(pr.x + pr.w / 2 - 84), Math.round(pr.y + pr.h / 2 - 84), 168, 168);
        ctx.globalAlpha = 1;
      }
      ctx.strokeStyle = 'rgba(255, 222, 130, 0.92)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(pr.x + pr.w / 2, pr.y + pr.h * 0.56, 18 + Math.sin(time * 4) * 2, time * 1.6, time * 1.6 + Math.PI * 1.45);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(pr.x + pr.w / 2, pr.y + pr.h * 0.56, 10, -time * 2.2, -time * 2.2 + Math.PI * 1.2);
      ctx.stroke();
      ctx.fillStyle = '#fff5cc';
      ctx.beginPath();
      ctx.arc(pr.x + pr.w / 2, pr.y + pr.h * 0.56, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 1;
    }
  }
}
