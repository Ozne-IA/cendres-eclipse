import type { Enemy, Player, RoomProp, WeaponKey } from './types';

let torchGlow: HTMLCanvasElement | null = null;
let crimsonGlow: HTMLCanvasElement | null = null;
let astralGlow: HTMLCanvasElement | null = null;

function makeGlowCanvas(r: number, g: number, b: number, innerA: number, midA: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = 192;
  c.height = 192;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  const grad = ctx.createRadialGradient(96, 96, 2, 96, 96, 96);
  grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${innerA})`);
  grad.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, ${midA})`);
  grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 192, 192);
  return c;
}

export function getTorchGlow(): HTMLCanvasElement | null {
  if (!torchGlow) torchGlow = makeGlowCanvas(255, 152, 62, 0.34, 0.13);
  return torchGlow;
}

export function getCrimsonGlow(): HTMLCanvasElement | null {
  if (!crimsonGlow) crimsonGlow = makeGlowCanvas(212, 52, 72, 0.32, 0.11);
  return crimsonGlow;
}

export function getAstralGlow(): HTMLCanvasElement | null {
  if (!astralGlow) astralGlow = makeGlowCanvas(122, 184, 255, 0.28, 0.09);
  return astralGlow;
}

export function drawWeaponSprite(
  ctx: CanvasRenderingContext2D,
  weapon: WeaponKey,
  lengthScale = 1
): void {
  ctx.save();
  ctx.scale(lengthScale, lengthScale);
  if (weapon === 'belfry_greatsword') {
    // Broad fuller blade + brass crossguard
    ctx.fillStyle = '#5c4428';
    ctx.fillRect(-6, -2, 8, 4);
    ctx.fillStyle = '#d4a853';
    ctx.fillRect(2, -7, 4, 14);
    ctx.fillStyle = '#c8d0d8';
    ctx.beginPath();
    ctx.moveTo(6, -4.5);
    ctx.lineTo(36, -3);
    ctx.lineTo(42, 0);
    ctx.lineTo(36, 3);
    ctx.lineTo(6, 4.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#5e6670';
    ctx.fillRect(8, -1, 24, 2);
  } else if (weapon === 'eclipse_daggers') {
    // Curved twin eclipse fang
    ctx.fillStyle = '#d4a853';
    ctx.fillRect(0, -4, 3, 8);
    ctx.fillStyle = '#f2d99b';
    ctx.beginPath();
    ctx.moveTo(3, -3);
    ctx.quadraticCurveTo(16, -5, 24, 1);
    ctx.quadraticCurveTo(15, 3, 3, 2);
    ctx.closePath();
    ctx.fill();
  } else if (weapon === 'ash_halberd') {
    // Long ash-wood shaft + crescent axe head + spear tip
    ctx.fillStyle = '#5c4132';
    ctx.fillRect(-10, -1.5, 44, 3);
    ctx.fillStyle = '#b9c3ce';
    ctx.beginPath();
    ctx.moveTo(28, -2);
    ctx.lineTo(46, 0);
    ctx.lineTo(28, 2);
    ctx.closePath();
    ctx.fill();
    // Crescent axe blade
    ctx.fillStyle = '#dce3eb';
    ctx.beginPath();
    ctx.moveTo(24, 1);
    ctx.quadraticCurveTo(32, 11, 20, 13);
    ctx.quadraticCurveTo(25, 6, 22, 1);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#d4a853';
    ctx.fillRect(23, -3, 3, 6);
  } else {
    // Clay Blade: balanced bastard sword with ember-rune fuller
    ctx.fillStyle = '#4a3525';
    ctx.fillRect(-5, -1.5, 7, 3);
    ctx.fillStyle = '#d4a853';
    ctx.fillRect(2, -5.5, 3, 11);
    ctx.fillStyle = '#cfd6de';
    ctx.beginPath();
    ctx.moveTo(5, -2.5);
    ctx.lineTo(28, -1.8);
    ctx.lineTo(33, 0);
    ctx.lineTo(28, 1.8);
    ctx.lineTo(5, 2.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#e06b2b';
    ctx.fillRect(8, -0.6, 12, 1.2);
  }
  ctx.restore();
}

export function drawDetailedPlayer(
  ctx: CanvasRenderingContext2D,
  player: Player,
  weapon: WeaponKey,
  hasWisp: boolean,
  time: number
): void {
  // Dash ghost afterimages
  for (const af of player.afterimages) {
    ctx.globalAlpha = af.alpha * 0.36;
    ctx.fillStyle = '#a89688';
    ctx.beginPath();
    ctx.moveTo(af.x + 4, af.y + 48);
    ctx.lineTo(af.x + 8, af.y + 12);
    ctx.lineTo(af.x + 22, af.y + 12);
    ctx.lineTo(af.x + 25, af.y + 48);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#dfd4c2';
    ctx.fillRect(af.x + 6, af.y + 1, 16, 13);
  }
  ctx.globalAlpha = 1;

  if (player.invulnT > 0 && Math.floor(player.invulnT * 22) % 2 === 1 && player.dashT <= 0) {
    ctx.globalAlpha = 0.52;
  }

  // Soft warm character lantern aura
  const glow = getTorchGlow();
  if (glow) {
    ctx.globalAlpha = (ctx.globalAlpha || 1) * 0.45;
    ctx.drawImage(glow, player.x + player.w / 2 - 68, player.y + 20 - 68, 136, 136);
    ctx.globalAlpha = player.invulnT > 0 && Math.floor(player.invulnT * 22) % 2 === 1 && player.dashT <= 0 ? 0.52 : 1;
  }

  ctx.save();
  const footX = player.x + player.w / 2;
  const footY = player.y + player.h;
  ctx.translate(footX, footY);
  ctx.scale(player.squashX, player.squashY);

  const isRunning = player.onGround && Math.abs(player.vx) > 35;
  const stride = isRunning ? Math.sin(player.walkCycle * 2.2) : 0;
  const bob = isRunning ? Math.abs(Math.cos(player.walkCycle * 2.2)) * 2.5 : Math.sin(time * 2.6) * 0.8;

  // 1. Billowing Multi-Fold Cloak & Crimson Scarf
  const capeDir = -player.facing;
  const wave1 = Math.sin(player.capeWave) * 5;
  const wave2 = Math.cos(player.capeWave * 0.8) * 4;
  ctx.fillStyle = player.hitFlashT > 0 ? '#fff5e4' : '#261b22';
  ctx.beginPath();
  ctx.moveTo(capeDir * 2, -player.h + 15 - bob);
  ctx.quadraticCurveTo(
    capeDir * (14 + Math.abs(player.vx) * 0.03),
    -28 + wave1,
    capeDir * (21 + Math.abs(player.vx) * 0.04),
    -6 + wave2
  );
  ctx.lineTo(capeDir * 4, -5);
  ctx.closePath();
  ctx.fill();

  // Crimson scarf ribbon
  ctx.strokeStyle = player.hitFlashT > 0 ? '#ffffff' : '#9c2634';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(0, -player.h + 15 - bob);
  ctx.quadraticCurveTo(capeDir * 14, -player.h + 17 + wave1 * 0.6, capeDir * 22, -player.h + 23 + wave2);
  ctx.stroke();
  ctx.lineWidth = 1;

  // 2. Articulated Legs / Greaves
  ctx.fillStyle = '#1b171f';
  ctx.fillRect(-7 + stride * 5, -14, 5, 14);
  ctx.fillRect(2 - stride * 5, -14, 5, 14);
  ctx.fillStyle = '#5c4b3c'; // bronze knee/shin trim
  ctx.fillRect(-7 + stride * 5, -8, 5, 3);
  ctx.fillRect(2 - stride * 5, -8, 5, 3);

  // 3. Layered Tunic & Bronze Chestplate
  ctx.fillStyle = player.hitFlashT > 0 ? '#fff5e4' : player.dashT > 0 ? '#8c7e72' : '#3d2c34';
  ctx.beginPath();
  ctx.moveTo(-11, -11);
  ctx.lineTo(-9, -player.h + 14 - bob);
  ctx.lineTo(9, -player.h + 14 - bob);
  ctx.lineTo(11, -11);
  ctx.closePath();
  ctx.fill();

  // Gold belt & trim
  ctx.fillStyle = '#c49645';
  ctx.fillRect(-10, -19 - bob * 0.4, 20, 2.5);
  // Shoulder Pauldron
  ctx.fillStyle = '#6c737d';
  ctx.beginPath();
  ctx.arc(player.facing * 6, -player.h + 16 - bob, 6, Math.PI, 0);
  ctx.fill();
  ctx.strokeStyle = '#d4a853';
  ctx.strokeRect(-4, -player.h + 15 - bob, 8, 9);

  // 4. Sculpted Porcelain-Clay Mask & Hood
  ctx.fillStyle = '#261b22';
  ctx.beginPath();
  ctx.arc(0, -player.h + 8 - bob, 10, Math.PI * 0.85, Math.PI * 2.15);
  ctx.fill();

  ctx.fillStyle = player.hitFlashT > 0 ? '#ffffff' : '#e4dac8';
  ctx.beginPath();
  ctx.moveTo(-7, -player.h + 2 - bob);
  ctx.lineTo(7, -player.h + 2 - bob);
  ctx.lineTo(6, -player.h + 13 - bob);
  ctx.lineTo(0, -player.h + 16 - bob);
  ctx.lineTo(-6, -player.h + 13 - bob);
  ctx.closePath();
  ctx.fill();

  // Mask cheek shadow & glowing ember eye slit
  ctx.fillStyle = '#8d8073';
  ctx.fillRect(-4, -player.h + 11 - bob, 8, 1.5);
  ctx.fillStyle = '#ff7b29';
  const eyeX = player.facing === 1 ? 1.5 : -5.5;
  ctx.fillRect(eyeX, -player.h + 6.5 - bob, 4, 3);
  ctx.fillStyle = '#ffd470';
  ctx.fillRect(eyeX + 1, -player.h + 7 - bob, 2, 1.5);

  // 5. Weapon (Idle or Guard Pose)
  if (player.attackT <= 0) {
    ctx.save();
    ctx.translate(player.facing * 7, -23 - bob);
    if (player.parryT > 0 || player.guardT > 0) {
      ctx.rotate(player.facing === 1 ? -1.15 : Math.PI + 1.15);
    } else {
      ctx.rotate(player.facing === 1 ? 0.32 : Math.PI - 0.32);
    }
    drawWeaponSprite(ctx, weapon, 0.92);
    ctx.restore();
  }

  ctx.restore();
  ctx.globalAlpha = 1;

  // 6. Parry / Guard Energy Crescent
  if (player.parryT > 0 || player.guardT > 0) {
    const px = player.x + player.w / 2 + player.facing * 14;
    const py = player.y + 22;
    ctx.save();
    ctx.strokeStyle = player.parryT > 0 ? '#ffd470' : '#968b7c';
    ctx.lineWidth = player.parryT > 0 ? 4 : 2.5;
    ctx.beginPath();
    ctx.arc(px, py, 26, -1.18, 1.18, player.facing === -1);
    ctx.stroke();
    if (player.parryT > 0) {
      ctx.strokeStyle = 'rgba(255, 245, 200, 0.75)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(px, py, 21, -0.95, 0.95, player.facing === -1);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 7. Dynamic Crescent Sword Slash Ribbon
  if (player.attackT > 0) {
    const prog = 1 - player.attackT / Math.max(0.01, player.attackTotalT);
    const isHeavy = player.attackMove === 'heavy' || player.attackMove === 'light3';
    const reach =
      (weapon === 'ash_halberd'
        ? 86
        : weapon === 'belfry_greatsword'
        ? 76
        : weapon === 'eclipse_daggers'
        ? 48
        : 60) + (isHeavy ? 14 : 0);

    ctx.save();
    ctx.translate(player.x + player.w / 2, player.y + 22);
    ctx.scale(player.facing, 1);

    const outerCol =
      player.attackMove === 'heavy'
        ? 'rgba(224, 107, 43, 0.85)'
        : player.attackMove === 'light3'
        ? 'rgba(255, 212, 112, 0.92)'
        : 'rgba(220, 226, 234, 0.78)';
    const innerCol =
      player.attackMove === 'heavy' ? '#ffd470' : '#ffffff';

    ctx.lineCap = 'round';
    if (player.attackMove === 'plunge') {
      ctx.strokeStyle = outerCol;
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.arc(0, 14, reach * 0.7, 0.1, Math.PI - 0.1);
      ctx.stroke();
    } else if (player.attackMove === 'launcher') {
      ctx.strokeStyle = outerCol;
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(6, 0, reach * 0.85, 0.75, -1.35, true);
      ctx.stroke();
    } else {
      const sweepDir = player.attackMove === 'light2' ? -1 : 1;
      const startA = sweepDir === 1 ? -1.35 + prog * 0.55 : 1.35 - prog * 0.55;
      const endA = sweepDir === 1 ? 1.15 : -1.15;

      // Outer glowing arc
      ctx.strokeStyle = outerCol;
      ctx.lineWidth = isHeavy ? 11 : 7;
      ctx.beginPath();
      ctx.arc(6, 0, reach * 0.78, startA, endA, sweepDir === -1);
      ctx.stroke();

      // Bright razor core
      ctx.strokeStyle = innerCol;
      ctx.lineWidth = isHeavy ? 3.5 : 2;
      ctx.beginPath();
      ctx.arc(6, 0, reach * 0.81, startA + sweepDir * 0.2, endA, sweepDir === -1);
      ctx.stroke();

      // Animated weapon blade at swing tip
      ctx.save();
      ctx.rotate(endA);
      ctx.translate(reach * 0.42, 0);
      drawWeaponSprite(ctx, weapon, 0.95);
      ctx.restore();
    }
    ctx.restore();
  }

  // 8. Orbital Flame Wisp Companion
  if (hasWisp) {
    const wx = player.x + player.w / 2 + Math.cos(player.wispAngle) * 44;
    const wy = player.y + 18 + Math.sin(player.wispAngle * 1.4) * 16;
    ctx.fillStyle = 'rgba(255, 152, 66, 0.3)';
    ctx.beginPath();
    ctx.arc(wx, wy, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd470';
    ctx.beginPath();
    ctx.arc(wx, wy, 4.5 + Math.sin(time * 10) * 1, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawDetailedEnemy(
  ctx: CanvasRenderingContext2D,
  e: Enemy,
  player: Player,
  time: number
): void {
  if (e.state === 'dead') {
    ctx.globalAlpha = Math.max(0, e.deadT / 0.35);
  }

  ctx.save();
  const cx = e.x + e.w / 2;
  const cy = e.y + e.h;
  ctx.translate(cx, cy);
  if (e.state === 'dead') {
    ctx.rotate(e.facing * -0.68 * (1 - e.deadT / 0.35));
  }

  // Elite golden / blazing aura
  if (e.elite !== 'none' && e.state !== 'dead') {
    ctx.strokeStyle = e.elite === 'blazing' ? '#e06b2b' : '#ffd470';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, -e.h / 2, e.w * 0.72, e.h * 0.6, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
  }

  const flash = e.hitFlashT > 0;
  const stag = e.state === 'staggered';
  const chill = e.chillT > 0;
  const primary = flash ? '#fff6e6' : stag ? '#ffd470' : chill ? '#7ab8ff' : e.color;
  const darkTrim = flash ? '#ffffff' : '#18131a';
  const stride = Math.abs(e.vx) > 20 ? Math.sin(time * 10 + e.id) * 4 : 0;

  if (e.kind === 'watcher') {
    const hover = Math.sin(time * 4 + e.id) * 5;
    const flap = Math.sin(time * 10 + e.id) * 7;
    ctx.translate(0, hover);
    // Feathered ash wings
    ctx.fillStyle = flash ? '#fff6e6' : '#3a4b5c';
    ctx.beginPath();
    ctx.moveTo(-8, -e.h * 0.6);
    ctx.lineTo(-e.w * 1.15, -e.h * 0.95 + flap);
    ctx.lineTo(-e.w * 0.8, -e.h * 0.35 + flap * 0.5);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(8, -e.h * 0.6);
    ctx.lineTo(e.w * 1.15, -e.h * 0.95 + flap);
    ctx.lineTo(e.w * 0.8, -e.h * 0.35 + flap * 0.5);
    ctx.closePath();
    ctx.fill();

    // Brass iron censer core
    ctx.fillStyle = primary;
    ctx.beginPath();
    ctx.ellipse(0, -e.h * 0.55, e.w * 0.45, e.h * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d4a853';
    ctx.stroke();
    // Glowing eye
    ctx.fillStyle = e.state === 'windup' ? '#ff3344' : '#ff9842';
    ctx.beginPath();
    ctx.arc(e.facing * 4, -e.h * 0.58, 4.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (e.kind === 'penitent' || e.kind === 'pyromancer' || e.kind === 'specter') {
    // Hunched/tall hooded cultist robe + limbs
    ctx.fillStyle = darkTrim;
    ctx.fillRect(-6 + stride, -10, 4, 10);
    ctx.fillRect(2 - stride, -10, 4, 10);

    ctx.fillStyle = primary;
    ctx.beginPath();
    ctx.moveTo(-e.w * 0.56, -4);
    ctx.lineTo(-e.w * 0.44, -e.h * 0.68);
    ctx.lineTo(e.facing * 3, -e.h - 4);
    ctx.lineTo(e.w * 0.44, -e.h * 0.68);
    ctx.lineTo(e.w * 0.56, -4);
    ctx.closePath();
    ctx.fill();

    // Sash & Hood shadow
    ctx.fillStyle = darkTrim;
    ctx.fillRect(-e.w * 0.35, -e.h * 0.45, e.w * 0.7, 3);
    ctx.beginPath();
    ctx.arc(e.facing * 2, -e.h + 13, 6, 0, Math.PI * 2);
    ctx.fill();

    // Weapon in hand
    if (e.kind === 'penitent') {
      // Rusted curved sickle
      ctx.strokeStyle = '#c4ccd4';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(e.facing * 12, -e.h * 0.48, 10, -0.8, 1.4, e.facing === -1);
      ctx.stroke();
      ctx.lineWidth = 1;
    } else if (e.kind === 'pyromancer') {
      // Ember staff
      ctx.fillStyle = '#593e2e';
      ctx.fillRect(e.facing * 10, -e.h + 4, 3, e.h - 6);
      ctx.fillStyle = '#ff8c3b';
      ctx.beginPath();
      ctx.arc(e.facing * 11.5, -e.h + 2, 5.5, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Specter eclipse halo
      ctx.strokeStyle = '#b49ee0';
      ctx.beginPath();
      ctx.arc(0, -e.h - 6, 9, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Glowing eyes
    ctx.fillStyle = e.state === 'windup' ? '#ff3344' : e.kind === 'specter' ? '#d4b8ff' : '#ffd470';
    ctx.fillRect(e.facing * 3 - 2, -e.h + 12, 4, 3);
  } else {
    // Armored Warriors & Bosses (Flagellant, Lancer, Arbalest, Archon, Mother, Sovereign)
    const isTall = e.isBoss;
    // Legs
    ctx.fillStyle = '#17131a';
    ctx.fillRect(-e.w * 0.28 + stride, -e.h * 0.25, e.w * 0.2, e.h * 0.25);
    ctx.fillRect(e.w * 0.08 - stride, -e.h * 0.25, e.w * 0.2, e.h * 0.25);

    // Mantle for bosses
    if (isTall) {
      ctx.fillStyle = e.kind === 'mother' ? '#4a1722' : '#2a222b';
      ctx.beginPath();
      ctx.moveTo(-e.w * 0.45, -e.h * 0.85);
      ctx.lineTo(-e.w * 0.72, -6);
      ctx.lineTo(e.w * 0.72, -6);
      ctx.lineTo(e.w * 0.45, -e.h * 0.85);
      ctx.closePath();
      ctx.fill();
    }

    // Armored Torso & Pauldrons
    ctx.fillStyle = primary;
    ctx.fillRect(-e.w * 0.42, -e.h + 14, e.w * 0.84, e.h * 0.64);
    ctx.fillStyle = darkTrim;
    ctx.fillRect(-e.w * 0.42, -e.h * 0.42, e.w * 0.84, 4);
    // Pauldrons
    ctx.fillStyle = primary;
    ctx.fillRect(-e.w * 0.56, -e.h + 14, e.w * 1.12, isTall ? 16 : 10);
    // Helm
    ctx.fillRect(-e.w * 0.28, -e.h, e.w * 0.56, 16);

    // Boss Crowns & Halos
    if (e.isBoss) {
      ctx.fillStyle = e.phase === 2 ? '#ff4d63' : '#ffd470';
      ctx.beginPath();
      ctx.moveTo(-e.w * 0.3, -e.h);
      ctx.lineTo(-e.w * 0.42, -e.h - 18);
      ctx.lineTo(-e.w * 0.12, -e.h);
      ctx.lineTo(0, -e.h - 24);
      ctx.lineTo(e.w * 0.12, -e.h);
      ctx.lineTo(e.w * 0.42, -e.h - 18);
      ctx.lineTo(e.w * 0.3, -e.h);
      ctx.fill();

      // Sovereign / Mother orbital halo
      ctx.strokeStyle = e.phase === 2 ? 'rgba(255, 77, 99, 0.65)' : 'rgba(212, 168, 83, 0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -e.h * 0.62, e.w * 0.85, time * 0.7, time * 0.7 + Math.PI * 1.3);
      ctx.stroke();
      ctx.lineWidth = 1;
    }

    // Archetype Gear
    if (e.kind === 'lancer') {
      const shX = e.facing === 1 ? e.w * 0.36 : -e.w * 0.36 - 11;
      ctx.fillStyle = '#474f5c';
      ctx.fillRect(shX, -e.h + 12, 11, e.h - 16);
      ctx.strokeStyle = '#d4a853';
      ctx.strokeRect(shX, -e.h + 12, 11, e.h - 16);
      ctx.fillStyle = '#d4a853';
      ctx.fillRect(shX + 3, -e.h * 0.55, 5, 5);
    } else if (e.kind === 'flagellant') {
      // Heavy spiked mace / flail
      ctx.fillStyle = '#7c8591';
      ctx.fillRect(e.facing * (e.w * 0.45), -e.h + 4, e.facing * 5, 36);
      ctx.fillStyle = '#d4a853';
      ctx.beginPath();
      ctx.arc(e.facing * (e.w * 0.48), -e.h + 4, 7, 0, Math.PI * 2);
      ctx.fill();
    } else if (e.kind === 'arbalest') {
      // Crossbow
      ctx.fillStyle = '#5c4636';
      ctx.fillRect(e.facing * 4, -e.h * 0.56, e.facing * 20, 4);
      ctx.strokeStyle = '#c4ccd4';
      ctx.beginPath();
      ctx.arc(e.facing * 18, -e.h * 0.54, 10, -1, 1, e.facing === -1);
      ctx.stroke();
    } else if (e.isBoss) {
      // Colossal boss greathammer / blade
      ctx.fillStyle = '#cfd6de';
      ctx.fillRect(e.facing * (e.w * 0.44), -e.h - 8, e.facing * 8, 66);
      ctx.fillStyle = '#d4a853';
      ctx.fillRect(e.facing * (e.w * 0.34), -e.h + 38, e.facing * 22, 5);
    }

    // Visor Eyes
    ctx.fillStyle = e.state === 'windup' ? '#ff3344' : '#0b0a0e';
    const eyeX = e.facing === 1 ? e.w * 0.08 : -e.w * 0.24;
    ctx.fillRect(eyeX, -e.h + 7, 6, 4);
  }

  // Windup Telegraph Ring & Arbalest Aim Line
  if (e.state === 'windup') {
    ctx.strokeStyle = '#ff4455';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, -e.h - 16, 9 + Math.sin(time * 24) * 2.5, 0, Math.PI * 2);
    ctx.stroke();

    if (e.kind === 'arbalest') {
      ctx.strokeStyle = 'rgba(255, 68, 85, 0.58)';
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(0, -e.h * 0.56);
      ctx.lineTo(player.x + player.w / 2 - cx, player.y + player.h / 2 - cy);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.lineWidth = 1;
  }

  ctx.restore();

  // Enemy HP & Stagger bars
  if (!e.isBoss && e.state !== 'dead' && (e.hp < e.maxHp || e.stagger > 0)) {
    ctx.fillStyle = '#120e14';
    ctx.fillRect(e.x, e.y - 13, e.w, 5);
    ctx.fillStyle = '#c4303e';
    ctx.fillRect(e.x, e.y - 13, e.w * Math.max(0, e.hp / e.maxHp), 5);
    if (e.stagger > 0) {
      ctx.fillStyle = '#e5b85c';
      ctx.fillRect(e.x, e.y - 7, e.w * Math.min(1, e.stagger / e.maxStagger), 2);
    }
  }
  ctx.globalAlpha = 1;
}

export function drawDetailedProp(ctx: CanvasRenderingContext2D, pr: RoomProp, time: number): void {
  if (pr.type === 'chest' || pr.type === 'gilded_chest') {
    const gilded = pr.type === 'gilded_chest';
    if (gilded && !pr.opened) {
      const g = getTorchGlow();
      if (g) ctx.drawImage(g, pr.x + pr.w / 2 - 48, pr.y + pr.h / 2 - 48, 96, 96);
    }
    // Arched lid + iron straps
    ctx.fillStyle = pr.opened ? '#2a221d' : gilded ? '#8f6321' : '#5e4024';
    ctx.fillRect(pr.x, pr.y + 8, pr.w, pr.h - 8);
    ctx.beginPath();
    ctx.ellipse(pr.x + pr.w / 2, pr.y + 8, pr.w / 2, 8, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = gilded ? '#ffd470' : '#b88d48';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(pr.x, pr.y + 8, pr.w, pr.h - 8);
    // Straps & Lock
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
    ctx.ellipse(pr.x + pr.w / 2, pr.y + pr.h * 0.62, pr.w * 0.45, pr.h * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8b6852';
    ctx.fillRect(pr.x + 4, pr.y, pr.w - 8, 5);
    ctx.fillStyle = '#d4a853';
    ctx.fillRect(pr.x + 3, pr.y + 13, pr.w - 6, 2);
  } else if (pr.type === 'brazier') {
    if (!pr.used) {
      const g = getTorchGlow();
      if (g) ctx.drawImage(g, pr.x + pr.w / 2 - 80, pr.y - 72, 160, 160);
    }
    ctx.fillStyle = '#2d2421';
    ctx.fillRect(pr.x + 6, pr.y + 18, pr.w - 12, 20);
    ctx.fillStyle = '#473a34';
    ctx.beginPath();
    ctx.moveTo(pr.x, pr.y + 10);
    ctx.lineTo(pr.x + pr.w, pr.y + 10);
    ctx.lineTo(pr.x + pr.w - 5, pr.y + 20);
    ctx.lineTo(pr.x + 5, pr.y + 20);
    ctx.closePath();
    ctx.fill();
    if (!pr.used) {
      const fl = Math.sin(time * 10) * 3;
      ctx.fillStyle = '#e06b2b';
      ctx.beginPath();
      ctx.moveTo(pr.x + 4, pr.y + 10);
      ctx.lineTo(pr.x + pr.w / 2 + fl, pr.y - 16);
      ctx.lineTo(pr.x + pr.w - 4, pr.y + 10);
      ctx.fill();
      ctx.fillStyle = '#ffd470';
      ctx.beginPath();
      ctx.arc(pr.x + pr.w / 2, pr.y + 4, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (pr.type === 'shrine') {
    if (!pr.used) {
      const cg = getCrimsonGlow();
      if (cg) ctx.drawImage(cg, pr.x + pr.w / 2 - 70, pr.y - 50, 140, 140);
    }
    ctx.fillStyle = '#262028';
    ctx.fillRect(pr.x + 4, pr.y + 18, pr.w - 8, pr.h - 18);
    ctx.fillStyle = '#473c4a';
    ctx.fillRect(pr.x, pr.y + pr.h - 8, pr.w, 8);
    const hover = pr.used ? 0 : Math.sin(time * 3) * 3;
    ctx.fillStyle = pr.used ? '#4a3d42' : '#d43848';
    ctx.beginPath();
    ctx.moveTo(pr.x + pr.w / 2, pr.y - 8 + hover);
    ctx.lineTo(pr.x + pr.w - 6, pr.y + 12 + hover);
    ctx.lineTo(pr.x + pr.w / 2, pr.y + 22 + hover);
    ctx.lineTo(pr.x + 6, pr.y + 12 + hover);
    ctx.closePath();
    ctx.fill();
  } else if (pr.type === 'merchant') {
    const g = getTorchGlow();
    if (g) ctx.drawImage(g, pr.x - 54, pr.y - 26, 108, 108);
    // Heavy pack + hooded cloak + hanging lantern
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
    // Lantern staff
    ctx.fillStyle = '#6b5235';
    ctx.fillRect(pr.x - 4, pr.y + 4, 3, pr.h - 4);
    ctx.fillStyle = '#ffd470';
    ctx.beginPath();
    ctx.arc(pr.x - 6, pr.y + 18 + Math.sin(time * 3) * 1.5, 4.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (pr.type === 'lore') {
    if (!pr.used) {
      const ag = getAstralGlow();
      if (ag) ctx.drawImage(ag, pr.x + pr.w / 2 - 58, pr.y - 30, 116, 116);
    }
    ctx.fillStyle = '#33303a';
    ctx.beginPath();
    ctx.moveTo(pr.x, pr.y + pr.h);
    ctx.lineTo(pr.x + 2, pr.y + 8);
    ctx.lineTo(pr.x + pr.w / 2, pr.y);
    ctx.lineTo(pr.x + pr.w - 2, pr.y + 8);
    ctx.lineTo(pr.x + pr.w, pr.y + pr.h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = pr.used ? '#6e645c' : '#8ab8e6';
    ctx.fillRect(pr.x + 8, pr.y + 13, pr.w - 16, 3);
    ctx.fillRect(pr.x + 7, pr.y + 21, pr.w - 14, 3);
    ctx.fillRect(pr.x + 9, pr.y + 29, pr.w - 18, 3);
  } else if (pr.type === 'npc' && !pr.used) {
    const ag = getAstralGlow();
    if (ag) ctx.drawImage(ag, pr.x + pr.w / 2 - 54, pr.y - 24, 108, 108);
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
    // Ornate Gothic Portal Archway
    ctx.fillStyle = '#251e26';
    ctx.fillRect(pr.x - 6, pr.y + 14, 8, pr.h - 14);
    ctx.fillRect(pr.x + pr.w - 2, pr.y + 14, 8, pr.h - 14);
    ctx.fillStyle = pr.locked ? '#181014' : '#120e17';
    ctx.beginPath();
    ctx.moveTo(pr.x, pr.y + pr.h);
    ctx.lineTo(pr.x, pr.y + 24);
    ctx.quadraticCurveTo(pr.x + pr.w / 2, pr.y - 10, pr.x + pr.w, pr.y + 24);
    ctx.lineTo(pr.x + pr.w, pr.y + pr.h);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = pr.locked ? '#822834' : '#d4a853';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.lineWidth = 1;

    if (pr.locked) {
      // Crimson seal chains
      ctx.strokeStyle = '#a82835';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pr.x, pr.y + 28);
      ctx.lineTo(pr.x + pr.w, pr.y + 62);
      ctx.moveTo(pr.x + pr.w, pr.y + 28);
      ctx.lineTo(pr.x, pr.y + 62);
      ctx.stroke();
      ctx.lineWidth = 1;
    } else {
      const g = getTorchGlow();
      if (g) ctx.drawImage(g, pr.x + pr.w / 2 - 70, pr.y + pr.h / 2 - 70, 140, 140);
      ctx.strokeStyle = 'rgba(255, 212, 112, 0.7)';
      ctx.beginPath();
      ctx.arc(pr.x + pr.w / 2, pr.y + pr.h * 0.56, 16 + Math.sin(time * 4) * 2, time * 1.4, time * 1.4 + Math.PI * 1.4);
      ctx.stroke();
    }
  }
}
