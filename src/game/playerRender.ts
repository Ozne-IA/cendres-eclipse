import { ARMOR_SKINS_DEF } from './data';
import { createHiResStamp, dot, drawGroundShadow, getTorchGlow, mkGrad, poly } from './renderPrimitives';
import { getColoredGlow } from './textures';
import type { ArmorSkinKey, Player, WeaponKey } from './types';
import { drawWeaponSprite } from './weaponRender';

interface PilgrimSpriteSet {
  cuirass: HTMLCanvasElement;
  helm: HTMLCanvasElement;
  pauldronFront: HTMLCanvasElement;
  pauldronBack: HTMLCanvasElement;
}

const pilgrimSpriteCache = new Map<string, PilgrimSpriteSet>();

function getPilgrimSprites(skinKey: ArmorSkinKey, flash: boolean): PilgrimSpriteSet | null {
  if (typeof document === 'undefined') return null;
  const cacheKey = `${skinKey}:${flash ? 1 : 0}`;
  const cached = pilgrimSpriteCache.get(cacheKey);
  if (cached) return cached;

  const skin = ARMOR_SKINS_DEF[skinKey] || ARMOR_SKINS_DEF.eclipse;

  // 1. Cuirass + Chainmail Skirt + Baldric + Tattered Surcoat (44x48 logical, origin at 22, 40)
  const [cuirass, cctx] = createHiResStamp(44, 48);
  const flashCol = flash ? '#fff5e4' : null;
  if (cctx) {
    cctx.translate(22, 40);

    // Rolled travel bedroll / pack silhouette behind back shoulder
    cctx.fillStyle = flash ? '#fff5e4' : '#332620';
    cctx.beginPath();
    cctx.ellipse(-9.5, -24, 5.2, 7.2, -0.35, 0, Math.PI * 2);
    cctx.fill();
    cctx.strokeStyle = '#09070b';
    cctx.lineWidth = 1.1;
    cctx.stroke();

    // Chainmail hauberk skirt with stippled ring weave
    cctx.fillStyle = flash ? '#fff5e4' : '#2d313b';
    cctx.fillRect(-8.5, -13, 17, 13);
    if (!flash) {
      cctx.fillStyle = 'rgba(220, 232, 248, 0.22)';
      for (let cy = -11; cy <= -2; cy += 3) {
        for (let cx = -7 + ((cy & 1) ? 1.5 : 0); cx <= 6; cx += 3) {
          cctx.fillRect(cx, cy, 1.5, 1.5);
        }
      }
    }

    // Tattered split front crimson/lining surcoat
    poly(cctx, [-5.5, -13, 5.5, -13, 7, 3, 2.5, -2, 0, 5, -3, -1, -6.5, 2], flash ? '#ffffff' : skin.capeLining, '#09070b', 1);

    // Sculpted Fluted Steel Cuirass
    const plateGrad = mkGrad(cctx, -11, -30, 11, -10, flashCol, [
      [0, '#181a22'],
      [0.45, skin.plate],
      [0.82, '#5a6170'],
      [1, '#22252e'],
    ]);
    poly(cctx, [-10, -12, -11, -28, -6, -32, 7, -32, 11, -26, 9.5, -12], plateGrad, '#09070b', 1.25);

    if (!flash) {
      // Specular chest ridge + battle scratch marks
      poly(cctx, [1.5, -30, 8.5, -26, 7, -14, 1, -14], 'rgba(255, 232, 198, 0.2)');

      cctx.strokeStyle = 'rgba(255, 240, 215, 0.28)';
      cctx.lineWidth = 0.7;
      cctx.beginPath();
      cctx.moveTo(2, -26);
      cctx.lineTo(6, -23);
      cctx.moveTo(-4, -20);
      cctx.lineTo(1, -18);
      cctx.stroke();

      // Engraved Solar Eclipse Breastplate Medallion
      dot(cctx, 1.5, -22, 4.4, undefined, skin.trim, 1.2);
      dot(cctx, 1.5, -22, 2.5, '#0c0a10');

      // Diagonal weathered leather cross-baldric + brass brooch
      cctx.strokeStyle = '#3b251a';
      cctx.lineWidth = 2.8;
      cctx.beginPath();
      cctx.moveTo(-8.5, -30);
      cctx.lineTo(8, -14);
      cctx.stroke();
      cctx.strokeStyle = '#684531';
      cctx.lineWidth = 0.9;
      cctx.beginPath();
      cctx.moveTo(-8.2, -30.6);
      cctx.lineTo(8.2, -14.6);
      cctx.stroke();

      dot(cctx, -5.5, -28, 2.2, skin.trim);
    }

    // Heavy buckled belt & hip leather pouch
    cctx.fillStyle = flash ? '#fff5e4' : '#332016';
    cctx.fillRect(-10, -14.5, 20, 3.6);
    cctx.fillStyle = flash ? '#ffffff' : skin.trim;
    cctx.fillRect(0.5, -15, 4.5, 4.6);
    cctx.fillStyle = flash ? '#fff5e4' : '#4a3122';
    cctx.fillRect(-9.5, -13, 6.5, 7);
    cctx.strokeStyle = '#09070b';
    cctx.lineWidth = 0.9;
    cctx.strokeRect(-9.5, -13, 6.5, 7);
  }

  // 2. Gothic Crowned Armet Visor Helm (36x36 logical, origin at 18, 28)
  const [helm, hctx] = createHiResStamp(36, 36);
  if (hctx) {
    hctx.translate(18, 28);

    hctx.fillStyle = flash ? '#fff5e4' : '#242730';
    hctx.fillRect(-5.5, -4, 11, 5);

    const hGrad = mkGrad(hctx, -8, -21, 9, -2, flashCol, [
      [0, '#16181f'],
      [0.45, skin.plate],
      [0.84, '#6e7788'],
      [1, '#232630'],
    ]);
    hctx.fillStyle = hGrad;
    hctx.beginPath();
    hctx.moveTo(-7.2, -14);
    hctx.quadraticCurveTo(-5, -21.5, 1.2, -21.5);
    hctx.quadraticCurveTo(7.8, -20.5, 8.6, -13);
    hctx.lineTo(10, -7.5);
    hctx.lineTo(3.2, -1.5);
    hctx.lineTo(-6.8, -4.5);
    hctx.closePath();
    hctx.fill();
    hctx.strokeStyle = '#09070b';
    hctx.lineWidth = 1.2;
    hctx.stroke();

    if (!flash) {
      hctx.strokeStyle = 'rgba(255, 234, 204, 0.36)';
      hctx.lineWidth = 0.9;
      hctx.beginPath();
      hctx.moveTo(0, -19.5);
      hctx.quadraticCurveTo(6.5, -18.5, 8.5, -8.5);
      hctx.stroke();

      hctx.strokeStyle = '#0b080e';
      hctx.lineWidth = 1;
      for (let gx = 1; gx <= 6.5; gx += 1.7) {
        hctx.beginPath();
        hctx.moveTo(gx, -8.8);
        hctx.lineTo(gx - 0.8, -4.2);
        hctx.stroke();
      }
    }

    const crownGrad = mkGrad(hctx, -7, -27, 7, -15, flashCol, [
      [0, '#3a322d'],
      [0.5, '#7a6346'],
      [1, '#2d2622'],
    ]);
    poly(
      hctx,
      [-6.8, -16, -8, -22, -4.4, -18.5, -2.5, -24.5, 0, -19.2, 1.8, -26.5, 3.8, -18.8, 7.2, -22.5, 6.6, -15.5],
      crownGrad,
      '#09070b',
      0.95
    );

    // Deep shadowed visor eye slit + blazing molten ember iris
    hctx.fillStyle = '#09070b';
    hctx.fillRect(0.6, -13.2, 7.6, 2.7);
    hctx.fillStyle = flash ? '#ffffff' : skin.eye;
    hctx.fillRect(2, -12.7, 5, 1.7);
    hctx.fillStyle = '#fff5bd';
    hctx.fillRect(4.3, -12.4, 2.1, 1.1);
  }

  // 3. Layered Lamellar Shoulder Pauldrons (front & back, 26x24 logical, origin at 13, 12)
  const buildPauldron = (isFront: boolean): HTMLCanvasElement => {
    const [pc, pctx] = createHiResStamp(26, 24);
    if (pctx) {
      pctx.translate(13, 12);
      const grad = mkGrad(
        pctx,
        -7,
        -7,
        7,
        7,
        flashCol,
        isFront
          ? [
              [0, '#727a8a'],
              [0.5, skin.plate],
              [1, '#181a22'],
            ]
          : [
              [0, '#3a3f4b'],
              [1, '#14151c'],
            ]
      );
      // Upper main plate
      pctx.fillStyle = grad;
      pctx.beginPath();
      pctx.ellipse(0, -1.5, 8.2, 5.6, -0.18, 0, Math.PI * 2);
      pctx.fill();
      pctx.strokeStyle = '#09070b';
      pctx.lineWidth = 1.1;
      pctx.stroke();

      // Overlapping lower lame plate
      pctx.beginPath();
      pctx.ellipse(0, 3, 6.8, 3.6, -0.15, 0, Math.PI * 2);
      pctx.fill();
      pctx.stroke();

      if (!flash) {
        pctx.strokeStyle = isFront ? skin.trim : '#2d2930';
        pctx.lineWidth = 1.05;
        pctx.beginPath();
        pctx.arc(0, -1.5, 6.2, Math.PI * 1.15, Math.PI * 1.9);
        pctx.stroke();

        // Steel rivets
        pctx.fillStyle = isFront ? '#ffd470' : '#6e6a70';
        pctx.beginPath();
        pctx.arc(-4.5, -2, 0.9, 0, Math.PI * 2);
        pctx.arc(4.5, -1, 0.9, 0, Math.PI * 2);
        pctx.fill();
      }
    }
    return pc;
  };

  const set: PilgrimSpriteSet = {
    cuirass,
    helm,
    pauldronFront: buildPauldron(true),
    pauldronBack: buildPauldron(false),
  };
  pilgrimSpriteCache.set(cacheKey, set);
  return set;
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

  // Dash ghost afterimages with trailing tattered cloak & visor ember
  for (const af of player.afterimages) {
    ctx.globalAlpha = af.alpha * 0.36;
    const fx = af.x + player.w / 2;
    const fy = af.y + player.h;
    ctx.fillStyle = skin.capeLining;
    ctx.beginPath();
    ctx.moveTo(fx - af.facing * 4, fy - 42);
    ctx.lineTo(fx - af.facing * 24, fy - 3);
    ctx.lineTo(fx + af.facing * 9, fy - 2);
    ctx.lineTo(fx + af.facing * 8, fy - 42);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = skin.eye;
    ctx.fillRect(fx + af.facing * 2, fy - 48, 5, 2);
  }
  ctx.globalAlpha = 1;

  if (player.onGround) {
    drawGroundShadow(ctx, player.x + player.w / 2, player.y + player.h, 18, 0.54);
  }

  const glow = getTorchGlow();
  if (glow) {
    ctx.globalAlpha = 0.44;
    ctx.drawImage(glow, player.x + player.w / 2 - 78, player.y + 18 - 78, 156, 156);
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
  const lean = Math.max(-0.16, Math.min(0.16, player.vx * 0.00035));
  ctx.rotate(lean);
  ctx.scale(player.squashX, player.squashY);

  const isRunning = player.onGround && Math.abs(player.vx) > 35;
  const stride = isRunning ? Math.sin(player.walkCycle * 2.3) : 0;
  const bob = isRunning
    ? Math.abs(Math.cos(player.walkCycle * 2.3)) * 2.8
    : Math.sin(time * 2.6) * 0.9;
  const flash = player.hitFlashT > 0;
  const capeDir = -player.facing;
  const speedDrag = Math.min(24, Math.abs(player.vx) * 0.05);
  const wave1 = Math.sin(player.capeWave) * 5.8;
  const wave2 = Math.cos(player.capeWave * 0.85) * 4.8;

  // 1. Flowing Tattered Asymmetrical War Cloak & Inner Lining
  ctx.fillStyle = flash ? '#fff5e4' : skin.capeLining;
  ctx.beginPath();
  ctx.moveTo(capeDir * 2, -41 - bob);
  ctx.quadraticCurveTo(
    capeDir * (17 + speedDrag),
    -26 + wave1,
    capeDir * (29 + speedDrag),
    -2 + wave2
  );
  ctx.lineTo(capeDir * (21 + speedDrag * 0.6), -7 + wave2 * 0.5);
  ctx.lineTo(capeDir * (14 + speedDrag * 0.4), -1);
  ctx.lineTo(capeDir * 5, -5);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = flash ? '#fff5e4' : skin.capeOuter;
  ctx.beginPath();
  ctx.moveTo(capeDir * 1, -42 - bob);
  ctx.quadraticCurveTo(
    capeDir * (15 + speedDrag * 0.9),
    -29 + wave1 * 0.85,
    capeDir * (27 + speedDrag),
    -5 + wave2
  );
  ctx.lineTo(capeDir * (23 + speedDrag * 0.72), -2 + wave2 * 0.6);
  ctx.lineTo(capeDir * (19 + speedDrag * 0.56), -10 + wave2 * 0.3);
  ctx.lineTo(capeDir * (14 + speedDrag * 0.4), -3);
  ctx.lineTo(capeDir * (9 + speedDrag * 0.25), -8);
  ctx.lineTo(capeDir * 2, -7);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#09070b';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // 2. Articulated Iron Greaves, Knee Cops & Pointed Sabatons
  const drawLeg = (offset: number, dark: boolean) => {
    const hipX = offset * 0.24;
    const kneeX = offset * 0.9 + player.facing * 2.2;
    const footPosX = offset * 1.18;
    ctx.strokeStyle = '#09070b';
    ctx.lineWidth = 6.4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(hipX, -17 - bob * 0.4);
    ctx.lineTo(kneeX, -9);
    ctx.lineTo(footPosX, -1.8);
    ctx.stroke();

    ctx.strokeStyle = flash ? '#fff5e4' : dark ? '#20222a' : '#3a3f4d';
    ctx.lineWidth = 4.2;
    ctx.stroke();

    // Articulated knee-cop & pointed iron sabaton
    ctx.fillStyle = flash ? '#ffffff' : dark ? '#4c5260' : '#7b8394';
    ctx.fillRect(kneeX - 2.6, -11.5, 5.2, 3.8);
    ctx.beginPath();
    ctx.moveTo(footPosX - 2.5, -5.2);
    ctx.lineTo(footPosX + player.facing * 5.2, -2.5);
    ctx.lineTo(footPosX + player.facing * 5.2, -0.5);
    ctx.lineTo(footPosX - 2.5, -0.5);
    ctx.closePath();
    ctx.fill();
  };
  drawLeg(-stride * 6.5 - 2, true);
  drawLeg(stride * 6.5 + 2, false);
  ctx.lineWidth = 1;

  // 3. Pre-baked 2x Supersampled Armored Body, Helm & Pauldrons (oriented by facing)
  const sprites = getPilgrimSprites(armorSkin, flash);
  if (sprites) {
    ctx.save();
    ctx.scale(player.facing, 1);

    // Back shoulder pauldron
    ctx.drawImage(sprites.pauldronBack, -20, -48 - bob, 26, 24);

    // Engraved Solar Eclipse Cuirass + Chainmail + Surcoat
    ctx.drawImage(sprites.cuirass, -22, -55 - bob, 44, 48);

    // Gothic Crowned Armet Visor Helm
    ctx.drawImage(sprites.helm, -18, -66 - bob, 36, 36);

    // Front lamellar pauldron catching rim light
    ctx.drawImage(sprites.pauldronFront, -5, -48 - bob, 26, 24);

    ctx.restore();
  }

  // Tattered Crimson Shoulder Mantle draped across front shoulder
  ctx.fillStyle = flash ? '#fff5e4' : skin.capeLining;
  ctx.beginPath();
  ctx.moveTo(capeDir * 1, -41 - bob);
  ctx.quadraticCurveTo(capeDir * 11, -42 - bob, capeDir * (19 + speedDrag * 0.45), -33 + wave1 * 0.35);
  ctx.lineTo(capeDir * (12 + speedDrag * 0.3), -29 + wave1 * 0.25);
  ctx.quadraticCurveTo(capeDir * 4, -36 - bob, -capeDir * 4, -35 - bob);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#09070b';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Ambient ember glow around visor eye
  const eyeGlow = getColoredGlow('amber');
  if (eyeGlow && !flash) {
    ctx.globalAlpha = 0.48;
    ctx.drawImage(eyeGlow, player.facing * 4 - 14, -64 - bob, 28, 28);
    ctx.globalAlpha = blinkAlpha;
  }

  // 4. Gauntleted Weapon Arm & Idle/Guard Weapon
  if (player.attackT <= 0) {
    ctx.save();
    ctx.translate(player.facing * 7.5, -26 - bob);
    if (player.parryT > 0 || player.guardT > 0) {
      ctx.rotate(player.facing === 1 ? -1.18 : Math.PI + 1.18);
    } else {
      ctx.rotate(player.facing === 1 ? 0.34 : Math.PI - 0.34);
    }
    drawWeaponSprite(ctx, weapon, 0.92);
    ctx.restore();

    if (weapon === 'eclipse_daggers' || weapon === 'twin_hammers') {
      ctx.save();
      ctx.translate(-player.facing * 6, -24 - bob);
      ctx.rotate(player.facing === 1 ? 2.45 : Math.PI - 2.45);
      drawWeaponSprite(ctx, weapon, weapon === 'twin_hammers' ? 0.8 : 0.76);
      ctx.restore();
    }
  }

  // Golden Riposte Buff Aura after a Perfect Parry
  if (player.riposteBuffT > 0) {
    ctx.strokeStyle = `rgba(255, 212, 112, ${0.48 + Math.sin(time * 12) * 0.22})`;
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.ellipse(0, -player.h * 0.54, 19, 30, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  ctx.restore();
  ctx.globalAlpha = 1;

  // 5. Parry / Guard Ornamental Golden Rune Ward
  if (player.parryT > 0 || player.guardT > 0) {
    const px = player.x + player.w / 2 + player.facing * 16;
    const py = player.y + 20;
    ctx.save();
    ctx.strokeStyle = player.parryT > 0 ? 'rgba(255, 212, 112, 0.94)' : '#968b7c';
    ctx.lineWidth = player.parryT > 0 ? 4.5 : 2.5;
    ctx.beginPath();
    ctx.arc(px, py, 28, -1.2, 1.2, player.facing === -1);
    ctx.stroke();
    if (player.parryT > 0) {
      ctx.strokeStyle = 'rgba(255, 248, 210, 0.94)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(px, py, 21, -0.95, 0.95, player.facing === -1);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 6. Tapered Crescent Weapon Slash Ribbon + Blade Motion
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
    ctx.translate(player.x + player.w / 2, player.y + 20);
    ctx.scale(player.facing, 1);

    const outerCol =
      player.attackMove === 'heavy'
        ? 'rgba(235, 112, 42, 0.8)'
        : player.attackMove === 'light3'
        ? 'rgba(255, 212, 112, 0.9)'
        : 'rgba(220, 232, 246, 0.74)';
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
      drawWeaponSprite(ctx, weapon, 0.94);
      ctx.restore();
    }
    ctx.restore();
  }

  // 7. Orbital Flame Wisp Companion
  if (hasWisp) {
    const wx = player.x + player.w / 2 + Math.cos(player.wispAngle) * 44;
    const wy = player.y + 18 + Math.sin(player.wispAngle * 1.4) * 16;
    if (glow) {
      ctx.globalAlpha = 0.65;
      ctx.drawImage(glow, wx - 28, wy - 28, 56, 56);
      ctx.globalAlpha = 1;
    }
    dot(ctx, wx, wy, 4.5 + Math.sin(time * 10) * 1, '#ffd470');
    dot(ctx, wx, wy, 2, '#ffffff');
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
