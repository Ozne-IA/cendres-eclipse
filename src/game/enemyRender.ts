import { drawGroundShadow } from './renderPrimitives';
import { getColoredGlow } from './textures';
import type { Enemy, Player } from './types';
import { drawWeaponSprite } from './weaponRender';

export function drawAttackWarning(
  ctx: CanvasRenderingContext2D,
  enemy: Enemy,
  player: Player,
  highContrast: boolean
): void {
  const x = enemy.x + enemy.w / 2;
  const y = enemy.y - 34;
  const size = highContrast ? 18 : 14;
  const ink = '#120a10';
  const edge = highContrast ? '#ffeb3b' : '#ff8b72';

  ctx.save();
  ctx.lineJoin = 'round';
  if (enemy.kind === 'arbalest') {
    ctx.setLineDash([7, 5]);
    ctx.beginPath();
    ctx.moveTo(x, enemy.y + enemy.h * 0.44);
    ctx.lineTo(player.x + player.w / 2, player.y + player.h / 2);
    ctx.strokeStyle = ink;
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.strokeStyle = edge;
    ctx.lineWidth = highContrast ? 3 : 2;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x + size, y + size * 0.72);
  ctx.lineTo(x - size, y + size * 0.72);
  ctx.closePath();
  ctx.fillStyle = ink;
  ctx.fill();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.fillStyle = highContrast ? '#ffffff' : '#fff2de';
  ctx.fillRect(x - 1.5, y - size * 0.42, 3, size * 0.55);
  ctx.beginPath();
  ctx.arc(x, y + size * 0.4, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawDetailedEnemy(
  ctx: CanvasRenderingContext2D,
  e: Enemy,
  time: number,
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

  // Elite trait visual aura (blazing = ember flame, armored = steel shield rim, swift = astral wind ring)
  if (e.elite !== 'none' && e.state !== 'dead') {
    const eliteGlow = getColoredGlow(e.elite === 'blazing' ? 'amber' : 'gold');
    if (eliteGlow) {
      ctx.globalAlpha = 0.52;
      ctx.drawImage(eliteGlow, -e.w * 1.1, -e.h * 1.15, e.w * 2.2, e.h * 1.3);
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle =
      e.elite === 'blazing' ? '#ff8b3d' : e.elite === 'armored' ? '#8ab8e6' : '#ffd470';
    ctx.lineWidth = e.elite === 'armored' ? 2.2 : 1.6;
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
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(e.facing * 4 - 0.5, -e.h + 9.5, 1.4, 1.4);

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
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(e.facing * 3 - 1, -e.h + 11.5, 1.6, 1.2);

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

    // Glowing Visor Eyes with incandescence specular core
    ctx.fillStyle = e.state === 'windup' ? '#ff2b44' : e.isBoss ? '#ffd470' : '#ff8c3b';
    const eyeX = e.facing === 1 ? e.w * 0.08 : -e.w * 0.24;
    ctx.fillRect(eyeX, -e.h + 7, 6, 3.5);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(eyeX + (e.facing === 1 ? 3 : 1), -e.h + 8, 2, 1.6);
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
      badgeX += 7;
    }
    if (e.elite === 'armored' && e.sunderT <= 0) {
      ctx.fillStyle = '#8ab8e6';
      ctx.fillRect(badgeX, e.y - 22, 5, 4);
    }
  }
  ctx.globalAlpha = 1;
}
