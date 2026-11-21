import { ARMOR_SKINS_DEF } from './data';
import { drawGroundShadow, getTorchGlow } from './renderPrimitives';
import { getColoredGlow } from './textures';
import type { ArmorSkinKey, Player, WeaponKey } from './types';
import { drawWeaponSprite } from './weaponRender';

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
    ctx.fillStyle = flash ? '#fff5e4' : skin.capeOuter;
  ctx.beginPath();
  ctx.moveTo(capeDir * 1, -player.h + 14 - bob);
  ctx.quadraticCurveTo(
    capeDir * (13 + speedDrag * 0.9),
    -29 + wave1 * 0.85,
    capeDir * (24 + speedDrag),
    -6 + wave2
  );
  // Jagged frayed edge (cinematic polish)
  ctx.lineTo(capeDir * (21 + speedDrag * 0.7), -4 + wave2 * 0.6);
  ctx.lineTo(capeDir * (18 + speedDrag * 0.55), -9 + wave2 * 0.3);
  ctx.lineTo(capeDir * (15 + speedDrag * 0.4), -3);
  ctx.lineTo(capeDir * (11 + speedDrag * 0.35), -7);
  ctx.lineTo(capeDir * 2, -7);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#09070b';
  ctx.lineWidth = 1.2;
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

  // Layered Lamellar Shoulder Pauldrons with Rivets & Torch Rim-Light (cinematic polish)
  for (const side of [-1, 1] as const) {
    const pxP = side * 6.8;
    const pyP = -player.h + 16.5 - bob;
    ctx.fillStyle = flash ? '#ffffff' : side === player.facing ? '#5a6270' : skin.plate;
    ctx.beginPath();
    ctx.ellipse(pxP, pyP, 7.2, 5.2, side * -0.22, 0, Math.PI * 2);
    ctx.fill();

    // Stronger rim light on the facing shoulder
    if (!flash) {
      ctx.fillStyle = side === player.facing
        ? 'rgba(255, 210, 150, 0.38)'
        : 'rgba(255, 224, 178, 0.18)';
      ctx.beginPath();
      ctx.ellipse(pxP, pyP - 1.6, 5.1, 2.3, side * -0.22, 0, Math.PI * 2);
      ctx.fill();
    }

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

  // Fierce Glowing Ember Eye Sllit (cinematic polish)
  const eyeX = player.facing === 1 ? 1.5 : -6.2;
  // Soft outer amber glow for stronger presence at distance
  const eyeGlow = getColoredGlow('amber');
  if (eyeGlow && !flash) {
    ctx.globalAlpha = 0.5;
    ctx.drawImage(eyeGlow, eyeX - 13, -player.h - 1 - bob, 30, 30);
    ctx.globalAlpha = blinkAlpha;
  }
  ctx.fillStyle = '#0d090e';
  ctx.fillRect(eyeX - 0.6, -player.h + 5.8 - bob, 5.6, 2.8);
  ctx.fillStyle = skin.eye;
  ctx.fillRect(eyeX, -player.h + 6.2 - bob, 4.4, 2);
  // Hot core highlight
  ctx.fillStyle = '#fff0a8';
  ctx.fillRect(eyeX + (player.facing === 1 ? 1.6 : 0.6), -player.h + 6.5 - bob, 2, 1.3);
  // Extra intense inner ember
  ctx.fillStyle = 'rgba(255, 190, 70, 0.95)';
  ctx.fillRect(eyeX + (player.facing === 1 ? 2.0 : 1.0), -player.h + 6.7 - bob, 1.2, 0.8);

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
