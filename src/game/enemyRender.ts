import { createHiResStamp, dot, drawGroundShadow, mkGrad, poly } from './renderPrimitives';
import { getColoredGlow } from './textures';
import type { Enemy, Player } from './types';
import { drawWeaponSprite } from './weaponRender';

type TintMode = 'normal' | 'flash' | 'stag' | 'chill';

const enemyBodyStampCache = new Map<string, HTMLCanvasElement>();

function tintOverrideColor(tint: TintMode): string | null {
  if (tint === 'flash') return '#fff6e6';
  if (tint === 'stag') return '#ffd470';
  if (tint === 'chill') return '#7ab8ff';
  return null;
}

function drawGothicCrown(
  ctx: CanvasRenderingContext2D,
  yBase: number,
  hw: number,
  hMain: number,
  fill: string | CanvasGradient,
  stroke: string
): void {
  poly(
    ctx,
    [
      -hw, yBase,
      -hw * 1.24, yBase - hMain * 0.56,
      -hw * 0.72, yBase - hMain * 0.25,
      -hw * 0.48, yBase - hMain * 0.78,
      -hw * 0.18, yBase - hMain * 0.28,
      0, yBase - hMain,
      hw * 0.18, yBase - hMain * 0.28,
      hw * 0.48, yBase - hMain * 0.78,
      hw * 0.72, yBase - hMain * 0.25,
      hw * 1.24, yBase - hMain * 0.56,
      hw, yBase,
    ],
    fill,
    stroke,
    1.15
  );
}

function drawDomedHelm(
  ctx: CanvasRenderingContext2D,
  wBot: number,
  wTop: number,
  yBot: number,
  ySpring: number,
  yPeak: number,
  fill: string | CanvasGradient,
  stroke: string,
  lw = 1.25
): void {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(-wBot, yBot);
  ctx.lineTo(-wTop, ySpring);
  ctx.quadraticCurveTo(0, yPeak, wTop, ySpring);
  ctx.lineTo(wBot, yBot);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lw;
  ctx.stroke();
}

function getArmoredBodyStamp(e: Enemy, tint: TintMode): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const phase = e.isBoss ? e.phase : 1;
  const key = `${e.kind}:${Math.round(e.w)}:${Math.round(e.h)}:${phase}:${tint}`;
  const cached = enemyBodyStampCache.get(key);
  if (cached) return cached;

  const padX = Math.max(24, Math.round(e.w * 0.55));
  const padTop = e.isBoss ? 48 : 24;
  const padBot = 12;
  const cw = Math.round(e.w + padX * 2);
  const ch = Math.round(e.h + padTop + padBot);
  const [c, ctx] = createHiResStamp(cw, ch);
  if (!ctx) return null;

  ctx.translate(cw / 2, ch - padBot);

  const w = e.w;
  const h = e.h;
  const over = tintOverrideColor(tint);
  const ink = '#09060c';

  if (e.kind === 'penitent') {
    const shroudGrad = mkGrad(ctx, -w * 0.6, -h, w * 0.6, 0, over, [
      [0, '#443a42'],
      [0.55, '#261f26'],
      [1, '#110d13'],
    ]);
    ctx.fillStyle = shroudGrad;
    ctx.beginPath();
    ctx.moveTo(-w * 0.66, -2);
    ctx.lineTo(-w * 0.48, -h * 0.72);
    ctx.quadraticCurveTo(0, -h - 5, w * 0.44, -h * 0.7);
    ctx.lineTo(w * 0.6, -4);
    ctx.lineTo(w * 0.28, -10);
    ctx.lineTo(0, -2);
    ctx.lineTo(-w * 0.28, -9);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.3;
    ctx.stroke();

    if (!over) {
      ctx.fillStyle = '#5c1824';
      ctx.fillRect(-3.5, -h * 0.6, 7, h * 0.38);
      ctx.fillStyle = '#cfc0aa';
      for (let ry = -h * 0.56; ry <= -h * 0.36; ry += 5) ctx.fillRect(-6.5, ry, 13, 2);
      ctx.fillStyle = '#735a42';
      ctx.fillRect(-w * 0.42, -h * 0.28, w * 0.84, 3);
    }
  } else if (e.kind === 'flagellant') {
    const armorGrad = mkGrad(ctx, -w * 0.5, -h, w * 0.5, -h * 0.2, over, [
      [0, '#2a221f'],
      [0.45, '#4c3e36'],
      [0.78, '#665246'],
      [1, '#1a1416'],
    ]);

    // Heavy iron-studded leather apron
    poly(ctx, [-w * 0.34, -h * 0.38, w * 0.34, -h * 0.38, w * 0.4, -3, 0, -8, -w * 0.4, -3], over ?? '#2e1a1a', ink, 1.3);

    // Broad hunched furnace cuirass with contoured shoulders
    ctx.fillStyle = armorGrad;
    ctx.beginPath();
    ctx.moveTo(-w * 0.42, -h * 0.24);
    ctx.lineTo(-w * 0.52, -h + 15);
    ctx.quadraticCurveTo(0, -h + 7, w * 0.52, -h + 15);
    ctx.lineTo(w * 0.42, -h * 0.24);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.stroke();

    if (!over) {
      // Riveted iron harness bands
      ctx.strokeStyle = '#786250';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(-w * 0.38, -h + 17);
      ctx.lineTo(w * 0.38, -h + 17);
      ctx.moveTo(-w * 0.36, -h * 0.38);
      ctx.lineTo(w * 0.36, -h * 0.38);
      ctx.stroke();
    }

    // Spiked Iron Pauldrons
    for (const side of [-1, 1] as const) {
      ctx.fillStyle = over ?? '#4a3d36';
      ctx.beginPath();
      ctx.ellipse(side * w * 0.44, -h + 19, 10.5, 7.6, side * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1.25;
      ctx.stroke();
      poly(
        ctx,
        [side * w * 0.44 - 2, -h + 12, side * (w * 0.44 + 4.5), -h + 4, side * w * 0.44 + 3, -h + 14],
        over ?? '#9aa4b0',
        ink,
        0.9
      );
    }

    // Roaring furnace grate in chest
    ctx.fillStyle = '#120a09';
    ctx.fillRect(-7, -h * 0.68, 14, 15);
    ctx.fillStyle = over ?? '#ff6f24';
    ctx.fillRect(-5.5, -h * 0.66, 11, 11);
    ctx.fillStyle = '#fff0a8';
    ctx.fillRect(-3, -h * 0.63, 6, 6);
    ctx.fillStyle = '#241c1a';
    ctx.fillRect(-2, -h * 0.68, 1.8, 15);
    ctx.fillRect(1.2, -h * 0.68, 1.8, 15);

    const helmGrad = mkGrad(ctx, -w * 0.28, -h - 4, w * 0.28, -h + 16, over, [
      [0, '#2b2421'],
      [0.55, '#5b4c42'],
      [1, '#1e1918'],
    ]);
    drawDomedHelm(ctx, w * 0.27, w * 0.25, -h + 16, -h + 4, -h - 7, helmGrad, ink);
    if (!over) {
      ctx.strokeStyle = '#8b7662';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -h - 2);
      ctx.lineTo(0, -h + 15);
      ctx.stroke();
    }
  } else if (e.kind === 'pyromancer') {
    const robeGrad = mkGrad(ctx, -w * 0.5, -h, w * 0.5, 0, over, [
      [0, '#6e1c2a'],
      [0.55, '#3b111b'],
      [1, '#17080e'],
    ]);
    poly(
      ctx,
      [-w * 0.66, -2, -w * 0.42, -h * 0.68, w * 0.42, -h * 0.68, w * 0.66, -2, w * 0.22, -6, 0, -1, -w * 0.22, -6],
      robeGrad,
      ink,
      1.3
    );

    if (!over) {
      ctx.fillStyle = '#c89b4b';
      ctx.fillRect(-3.5, -h * 0.67, 7, h * 0.56);
      ctx.fillStyle = '#1f1219';
      ctx.fillRect(-1.5, -h * 0.64, 3, h * 0.5);
      poly(
        ctx,
        [-w * 0.54, -h * 0.54, -w * 0.36, -h * 0.7, w * 0.36, -h * 0.7, w * 0.54, -h * 0.54],
        '#471520',
        ink,
        1.2
      );
    }

    poly(ctx, [-9, -h + 16, -6, -h - 8, 0, -h + 3, 6, -h - 8, 9, -h + 16], over ?? '#5c1824', over ? ink : '#d4a853', 1.2);
  } else if (e.isBoss) {
    if (e.kind === 'archon') {
      const plateGrad = mkGrad(ctx, -w * 0.5, -h, w * 0.5, -h * 0.2, over, [
        [0, '#161213'],
        [0.35, '#3b2d22'],
        [0.68, '#5d452c'],
        [1, '#1e1715'],
      ]);
      const trimCol = phase === 2 ? '#ff4d63' : '#d4a853';

      // Heavy layered tassets
      poly(
        ctx,
        [-w * 0.44, -h * 0.36, w * 0.44, -h * 0.36, w * 0.5, -6, w * 0.16, -12, 0, -4, -w * 0.16, -12, -w * 0.5, -6],
        over ?? '#1b1615',
        ink,
        1.5
      );

      // Sculpted Ribbed Cathedral Cuirass
      poly(
        ctx,
        [-w * 0.4, -h * 0.24, -w * 0.52, -h + 22, -w * 0.2, -h + 13, w * 0.2, -h + 13, w * 0.52, -h + 22, w * 0.4, -h * 0.24],
        plateGrad,
        ink,
        1.5
      );

      if (!over) {
        // Central steel keel & tarnished bronze breastplate ribs
        ctx.fillStyle = 'rgba(18, 14, 14, 0.55)';
        ctx.fillRect(-3.5, -h + 14, 7, h * 0.54);
        ctx.strokeStyle = trimCol;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(0, -h * 0.56, w * 0.17, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#0d090b';
        ctx.beginPath();
        ctx.arc(0, -h * 0.56, w * 0.1, 0, Math.PI * 2);
        ctx.fill();

        // Gothic chest ribs & Phase 2 magma fissures
        ctx.strokeStyle = phase === 2 ? '#ff6a3d' : '#a88240';
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        for (const side of [-1, 1] as const) {
          ctx.moveTo(side * w * 0.18, -h * 0.68);
          ctx.lineTo(side * w * 0.38, -h * 0.58);
          ctx.moveTo(side * w * 0.18, -h * 0.5);
          ctx.lineTo(side * w * 0.35, -h * 0.42);
        }
        ctx.stroke();
        if (phase === 2) {
          ctx.strokeStyle = '#ff5436';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(-w * 0.24, -h * 0.72);
          ctx.lineTo(-4, -h * 0.58);
          ctx.lineTo(w * 0.22, -h * 0.44);
          ctx.moveTo(w * 0.2, -h * 0.74);
          ctx.lineTo(2, -h * 0.54);
          ctx.stroke();
        }
      }

      // Towering Cathedral-Spire Pauldrons
      for (const side of [-1, 1] as const) {
        poly(
          ctx,
          [side * w * 0.24, -h + 24, side * w * 0.58, -h + 20, side * w * 0.64, -h + 6, side * w * 0.44, -h - 3, side * w * 0.26, -h + 13],
          plateGrad,
          ink,
          1.4
        );
        if (!over) {
          ctx.strokeStyle = trimCol;
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.moveTo(side * w * 0.3, -h + 18);
          ctx.lineTo(side * w * 0.44, -h + 4);
          ctx.lineTo(side * w * 0.55, -h + 16);
          ctx.stroke();
        }
      }

      const helmGrad = mkGrad(ctx, -w * 0.22, -h - 6, w * 0.22, -h + 18, over, [
        [0, '#1b1819'],
        [0.55, '#463d39'],
        [1, '#231e1d'],
      ]);
      drawDomedHelm(ctx, w * 0.23, w * 0.21, -h + 18, -h + 3, -h - 9, helmGrad, ink, 1.4);

      const crownGrad = mkGrad(ctx, -w * 0.24, -h - 28, w * 0.24, -h, over, [
        [0, '#362b23'],
        [0.5, phase === 2 ? '#a83328' : '#8a683a'],
        [1, '#2a211b'],
      ]);
      drawGothicCrown(ctx, -h + 1, w * 0.22, 26, crownGrad, ink);
    } else if (e.kind === 'mother') {
      const robeGrad = mkGrad(ctx, 0, -h, 0, 0, over, [
        [0, phase === 2 ? '#6e1628' : '#4a1522'],
        [0.55, '#260d16'],
        [1, '#0d070b'],
      ]);
      poly(
        ctx,
        [-w * 0.56, -4, -w * 0.36, -h + 22, w * 0.36, -h + 22, w * 0.56, -4, w * 0.2, -10, 0, -2, -w * 0.2, -10],
        robeGrad,
        ink,
        1.5
      );

      if (!over) {
        ctx.strokeStyle = '#d4a853';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(-w * 0.24, -h + 28);
        ctx.quadraticCurveTo(0, -h * 0.52, w * 0.24, -h + 28);
        ctx.stroke();
        ctx.fillStyle = '#d4a853';
        ctx.fillRect(-3, -h + 28, 6, h * 0.46);
      }

      poly(
        ctx,
        [-w * 0.32, -h + 24, -w * 0.24, -h - 8, 0, -h - 24, w * 0.24, -h - 8, w * 0.32, -h + 24],
        over ?? '#1c0b12',
        ink,
        1.4
      );
      ctx.fillStyle = over ?? '#c89b4b';
      ctx.beginPath();
      ctx.ellipse(0, -h + 8, w * 0.15, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      // Le Souverain de l'Éclipse: blackened obsidian-and-gilt eternal monarch
      const obsGrad = mkGrad(ctx, -w * 0.5, -h, w * 0.5, 0, over, [
        [0, '#12101a'],
        [0.5, '#2b2434'],
        [0.85, '#4b3b2c'],
        [1, '#120e16'],
      ]);
      const trim = over ? ink : phase === 2 ? '#ff4d63' : '#d4a853';
      poly(ctx, [-w * 0.42, -h * 0.22, -w * 0.52, -h + 18, w * 0.52, -h + 18, w * 0.42, -h * 0.22], obsGrad, trim, 1.6);

      if (!over) {
        ctx.strokeStyle = trim;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, -h * 0.56, w * 0.22, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#07050a';
        ctx.beginPath();
        ctx.arc(0, -h * 0.56, w * 0.14, 0, Math.PI * 2);
        ctx.fill();
      }

      for (const side of [-1, 1] as const) {
        poly(
          ctx,
          [side * w * 0.26, -h + 24, side * w * 0.62, -h + 12, side * w * 0.48, -h - 8, side * w * 0.26, -h + 12],
          obsGrad,
          trim,
          1.4
        );
      }

      drawDomedHelm(ctx, w * 0.22, w * 0.2, -h + 18, -h + 2, -h - 9, over ?? '#1f1a26', trim);

      drawGothicCrown(ctx, -h, w * 0.22, 30, over ?? (phase === 2 ? '#ff4d63' : '#c89b4b'), ink);
    }
  } else {
    // Lancer & Arbalest weathered armored torsos
    const isLancer = e.kind === 'lancer';
    const plateGrad = mkGrad(
      ctx,
      -w * 0.45,
      -h,
      w * 0.45,
      -h * 0.2,
      over,
      isLancer
        ? [
            [0, '#222630'],
            [0.5, '#464d5c'],
            [1, '#1a1c24'],
          ]
        : [
            [0, '#2d2522'],
            [0.5, '#4c3e38'],
            [1, '#1b1518'],
          ]
    );

    poly(ctx, [-w * 0.3, -h * 0.36, w * 0.3, -h * 0.36, w * 0.24, -4, 0, -10, -w * 0.24, -4], over ?? (isLancer ? '#4f1722' : '#262028'), ink, 1.2);
    poly(ctx, [-w * 0.36, -h * 0.24, -w * 0.46, -h + 15, w * 0.46, -h + 15, w * 0.36, -h * 0.24], plateGrad, ink, 1.2);

    if (!over) {
      ctx.fillStyle = '#c89b4b';
      ctx.fillRect(-w * 0.38, -h * 0.36, w * 0.76, 3);
    }

    for (const side of [-1, 1] as const) {
      ctx.fillStyle = over ?? (isLancer ? '#535b6b' : '#4a3d38');
      ctx.beginPath();
      ctx.ellipse(side * w * 0.42, -h + 17, 8.5, 6.2, side * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    drawDomedHelm(ctx, w * 0.27, w * 0.23, -h + 16, -h + 2, -h - 8, over ?? (isLancer ? '#474f5e' : '#352b2d'), ink, 1.2);
  }

  enemyBodyStampCache.set(key, c);
  return c;
}

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

  poly(ctx, [x, y - size, x + size, y + size * 0.72, x - size, y + size * 0.72], ink, ink, 6);
  ctx.strokeStyle = edge;
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.fillStyle = highContrast ? '#ffffff' : '#fff2de';
  ctx.fillRect(x - 1.5, y - size * 0.42, 3, size * 0.55);
  dot(ctx, x, y + size * 0.4, 1.8);
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
    drawGroundShadow(ctx, e.x + e.w / 2, e.y + e.h, e.w * 0.55, 0.48);
  }

  ctx.save();
  const cx = e.x + e.w / 2;
  const cy = e.y + e.h;
  ctx.translate(cx, cy);
  if (e.state === 'dead') {
    ctx.rotate(e.facing * -0.68 * (1 - e.deadT / 0.35));
  }

  // Diegetic Elite Visual Traits
  if (e.elite !== 'none' && e.state !== 'dead') {
    const eliteGlow = getColoredGlow(e.elite === 'blazing' ? 'amber' : e.elite === 'armored' ? 'astral' : 'gold');
    if (eliteGlow) {
      ctx.globalAlpha = 0.54;
      ctx.drawImage(eliteGlow, -e.w * 1.15, -e.h * 1.15, e.w * 2.3, e.h * 1.3);
      ctx.globalAlpha = 1;
    }
    if (e.elite === 'blazing') {
      for (let k = 0; k < 3; k++) {
        const a = time * 3.5 + k * 2.1;
        dot(ctx, Math.cos(a) * e.w * 0.65, -e.h * 0.6 + Math.sin(a * 1.5) * 14, 2.5, k % 2 === 0 ? '#ffd470' : '#ff6a1f');
      }
    } else if (e.elite === 'armored') {
      ctx.strokeStyle = '#8ab8e6';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(0, -e.h * 0.5, e.w * 0.72, e.h * 0.58, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
    } else {
      ctx.strokeStyle = 'rgba(255, 212, 112, 0.72)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, -e.h * 0.55, e.w * 0.74, time * 4, time * 4 + Math.PI * 1.2);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
  }

  const flash = e.hitFlashT > 0;
  const stag = e.state === 'staggered';
  const chill = e.chillT > 0;
  const tint: TintMode = flash ? 'flash' : stag ? 'stag' : chill ? 'chill' : 'normal';
  const ink = '#09060c';
  const stride = Math.abs(e.vx) > 20 ? Math.sin(time * 10 + e.id) * 4.5 : 0;

  if (e.kind === 'watcher') {
    const hover = Math.sin(time * 4 + e.id) * 5;
    const flap = Math.sin(time * 10.5 + e.id) * 8;
    ctx.translate(0, hover);

    // 3-tier articulated dark-steel razor feathered wings with brass ribs
    for (const side of [-1, 1] as const) {
      const wGrad = ctx.createLinearGradient(0, -e.h * 0.9, side * e.w * 1.4, -e.h * 0.3);
      wGrad.addColorStop(0, flash ? '#fff6e6' : '#333f52');
      wGrad.addColorStop(1, flash ? '#fff6e6' : '#161b24');
      ctx.fillStyle = wGrad;
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

      ctx.strokeStyle = '#c89b4b';
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
    ctx.arc(0, -e.h * 0.56, e.w * 0.58, time * 1.6, time * 1.6 + Math.PI * 1.45);
    ctx.stroke();

    // Shaded obsidian-bronze censer sphere
    const cGrad = ctx.createRadialGradient(-4, -e.h * 0.66, 2, 0, -e.h * 0.56, e.w * 0.5);
    cGrad.addColorStop(0, flash ? '#fff6e6' : '#526073');
    cGrad.addColorStop(0.55, flash ? '#fff6e6' : '#262e3b');
    cGrad.addColorStop(1, flash ? '#fff6e6' : '#10131a');
    ctx.fillStyle = cGrad;
    ctx.beginPath();
    ctx.ellipse(0, -e.h * 0.56, e.w * 0.44, e.h * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = ink;
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Inner eye socket & molten tracking iris
    dot(ctx, e.facing * 4, -e.h * 0.58, 7.2, '#09070b', '#9c7838', 1);
    dot(ctx, e.facing * 4.8, -e.h * 0.58, 4.2, e.state === 'windup' ? '#ff2b44' : '#ff9842');
    dot(ctx, e.facing * 5.2, -e.h * 0.6, 1.6, '#fff2c2');
  } else if (e.kind === 'specter') {
    // Floating astral wraith with exposed ribcage, fractured porcelain halo & shadow claws
    const floatY = Math.sin(time * 4.2 + e.id) * 4;
    ctx.translate(0, floatY);

    const spGrad = ctx.createLinearGradient(0, -e.h, 0, 0);
    spGrad.addColorStop(0, flash ? '#ffffff' : 'rgba(138, 96, 212, 0.92)');
    spGrad.addColorStop(0.65, flash ? '#ffffff' : 'rgba(64, 38, 118, 0.78)');
    spGrad.addColorStop(1, 'rgba(32, 18, 60, 0.25)');
    ctx.fillStyle = spGrad;
    ctx.beginPath();
    ctx.moveTo(-e.w * 0.54, -e.h * 0.68);
    ctx.quadraticCurveTo(0, -e.h - 6, e.w * 0.54, -e.h * 0.68);
    ctx.lineTo(e.w * 0.64, -5);
    ctx.lineTo(e.w * 0.22, -14);
    ctx.lineTo(0, -2);
    ctx.lineTo(-e.w * 0.25, -13);
    ctx.lineTo(-e.w * 0.62, -5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#d4b8ff';
    ctx.lineWidth = 1.1;
    ctx.stroke();

    // Pale exposed skeletal rib markings
    ctx.fillStyle = 'rgba(232, 220, 255, 0.55)';
    for (let rb = -e.h * 0.54; rb <= -e.h * 0.36; rb += 4.5) {
      ctx.fillRect(-5, rb, 10, 1.6);
    }

    // Fractured floating halo shards
    for (let s = 0; s < 3; s++) {
      const sa = time * 1.8 + (s * Math.PI * 2) / 3;
      ctx.fillStyle = '#e8dcff';
      ctx.fillRect(Math.cos(sa) * 14 - 2, -e.h + 6 + Math.sin(sa) * 5, 4, 4);
    }

    // Hollow porcelain skull visage
    ctx.fillStyle = '#efe8f8';
    ctx.beginPath();
    ctx.ellipse(e.facing * 2, -e.h + 12, 6, 7.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#180f24';
    ctx.fillRect(e.facing * 3 - 2, -e.h + 10, 4, 3);
    ctx.fillStyle = '#d4b8ff';
    ctx.fillRect(e.facing * 3.5 - 1, -e.h + 11, 2, 1.5);
  } else {
    // Grounded & Boss Archetypes using 2x pre-baked painterly armor stamps + animated limbs/weapons
    const isTall = e.isBoss;

    // Articulated armored legs / greaves
    if (e.kind !== 'pyromancer' && e.kind !== 'mother') {
      ctx.fillStyle = flash ? '#fff6e6' : '#17131b';
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1.2;
      const legW = Math.max(4.5, e.w * 0.21);
      const legH = e.kind === 'penitent' ? 12 : e.h * 0.26;
      ctx.fillRect(-e.w * 0.3 + stride, -legH, legW, legH);
      ctx.strokeRect(-e.w * 0.3 + stride, -legH, legW, legH);
      ctx.fillRect(e.w * 0.08 - stride, -legH, legW, legH);
      ctx.strokeRect(e.w * 0.08 - stride, -legH, legW, legH);
      if (e.kind !== 'penitent' && !flash) {
        ctx.fillStyle = '#6b5a4a';
        ctx.fillRect(-e.w * 0.3 + stride, -legH + 3, legW, 3);
        ctx.fillRect(e.w * 0.08 - stride, -legH + 3, legW, 3);
      }
    }

    // Dynamic Flowing Boss Mantle / Six-Wing Seraph Silhouette (behind body stamp)
    if (isTall) {
      const wave = Math.sin(time * 2.4 + e.id) * 6;
      if (e.kind === 'mother') {
        // 6 tattered ash & crimson wings unfurling behind the Matriarch
        for (const side of [-1, 1] as const) {
          for (let tier = 0; tier < 3; tier++) {
            const lift = -e.h * (0.78 - tier * 0.14) + Math.sin(time * 3 + tier) * 5;
            ctx.fillStyle = flash ? '#fff6e6' : e.phase === 2 ? '#78182a' : '#3a1420';
            ctx.beginPath();
            ctx.moveTo(side * 10, -e.h * 0.65);
            ctx.quadraticCurveTo(side * e.w * (0.95 - tier * 0.1), lift - 24, side * e.w * (1.28 - tier * 0.16), lift + 8);
            ctx.lineTo(side * e.w * (0.85 - tier * 0.1), lift + 24);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = ink;
            ctx.lineWidth = 1.2;
            ctx.stroke();
          }
        }
      } else {
        // Billowing royal war mantle behind Archon & Sovereign
        ctx.fillStyle = flash ? '#fff6e6' : e.kind === 'sovereign' ? '#1a1220' : '#261816';
        ctx.beginPath();
        ctx.moveTo(-e.w * 0.48, -e.h * 0.84);
        ctx.quadraticCurveTo(-e.w * 0.92, -e.h * 0.4, -e.w * 0.82 + wave * 0.5, -4);
        ctx.lineTo(e.w * 0.82 + wave * 0.5, -4);
        ctx.quadraticCurveTo(e.w * 0.92, -e.h * 0.4, e.w * 0.48, -e.h * 0.84);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = e.kind === 'sovereign' ? '#c89b4b' : ink;
        ctx.lineWidth = 1.3;
        ctx.stroke();
      }
    }

    // Draw pre-baked 2x supersampled painterly body stamp
    const bodyStamp = getArmoredBodyStamp(e, tint);
    if (bodyStamp) {
      const cw = bodyStamp.width / 2;
      const ch = bodyStamp.height / 2;
      ctx.drawImage(bodyStamp, -cw / 2, -ch + 12, cw, ch);
    }

    // Archetype-specific dynamic face masks, halos, shields, staffs & weapons
    if (e.kind === 'penitent') {
      // Cracked weeping ivory mask + curved executioner sickle
      ctx.fillStyle = flash ? '#ffffff' : '#dfd2be';
      ctx.beginPath();
      ctx.moveTo(e.facing * 2 - 6, -e.h + 5);
      ctx.lineTo(e.facing * 2 + 6, -e.h + 5);
      ctx.lineTo(e.facing * 2 + 4.5, -e.h + 18);
      ctx.lineTo(e.facing * 2 - 4.5, -e.h + 18);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = ink;
      ctx.stroke();
      ctx.fillStyle = e.state === 'windup' ? '#ff3344' : '#ff9c40';
      ctx.fillRect(e.facing * 4 - 1.5, -e.h + 9, 3.8, 3);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(e.facing * 4 - 0.5, -e.h + 9.5, 1.4, 1.4);

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
      ctx.fillStyle = e.state === 'windup' ? '#ff3344' : '#ffd470';
      ctx.fillRect(e.facing * 3 - 2, -e.h + 11, 4, 2.5);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(e.facing * 3 - 1, -e.h + 11.5, 1.6, 1.2);

      // Gnarled staff + swirling solar plasma orb
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
    } else if (e.isBoss) {
      // Rotating sacred astrolabe halos + Sovereign floating relic blades + Colossal Relic Weapon
      const haloColor = e.phase === 2 ? 'rgba(255, 77, 99, 0.82)' : 'rgba(212, 168, 83, 0.72)';
      ctx.strokeStyle = haloColor;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(0, -e.h * 0.64, e.w * 0.88, time * 0.75, time * 0.75 + Math.PI * 1.4);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, -e.h * 0.64, e.w * 0.74, -time * 0.9, -time * 0.9 + Math.PI * 1.1);
      ctx.stroke();

      if (e.kind === 'sovereign') {
        for (let k = 0; k < 6; k++) {
          const sa = -Math.PI * 0.88 + (k / 5) * Math.PI * 0.76 + Math.sin(time * 2 + k) * 0.06;
          const sx = Math.cos(sa) * (e.w * 0.98);
          const sy = -e.h * 0.62 + Math.sin(sa) * (e.w * 0.98);
          ctx.save();
          ctx.translate(sx, sy);
          ctx.rotate(sa + Math.PI * 0.5);
          poly(ctx, [0, -18, 2.5, 6, 0, 12, -2.5, 6], e.phase === 2 ? '#ff6a7a' : '#ffd470');
          ctx.restore();
        }
      }
      ctx.lineWidth = 1;

      ctx.save();
      ctx.translate(e.facing * e.w * 0.44, -e.h * 0.5);
      ctx.rotate(e.facing === 1 ? -1.15 : Math.PI + 1.15);
      drawWeaponSprite(ctx, e.kind === 'archon' ? 'belfry_greatsword' : 'ash_halberd', 1.48);
      ctx.restore();

      // Piercing Boss Eyes
      ctx.fillStyle = e.state === 'windup' ? '#ff2b44' : e.phase === 2 ? '#ff6a7a' : '#ffd470';
      const eyeX = e.facing === 1 ? e.w * 0.06 : -e.w * 0.18;
      ctx.fillRect(eyeX, -e.h + 7, 7, 3.5);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(eyeX + (e.facing === 1 ? 3 : 1), -e.h + 8, 2.2, 1.6);
    } else if (e.kind === 'lancer') {
      // Scarlet crest plume, embossed eclipse tower shield & ash halberd
      ctx.fillStyle = '#9c2634';
      ctx.beginPath();
      ctx.moveTo(-e.facing * 4, -e.h - 2);
      ctx.quadraticCurveTo(-e.facing * 18, -e.h - 12, -e.facing * 21, -e.h + 10);
      ctx.closePath();
      ctx.fill();

      const shX = e.facing === 1 ? e.w * 0.34 : -e.w * 0.34 - 14;
      ctx.fillStyle = mkGrad(ctx, shX, -e.h + 12, shX + 14, -4, null, [
        [0, '#5a6373'],
        [1, '#262b36'],
      ]);
      ctx.fillRect(shX, -e.h + 12, 14, e.h - 16);
      ctx.strokeStyle = '#d4a853';
      ctx.lineWidth = 1.6;
      ctx.strokeRect(shX, -e.h + 12, 14, e.h - 16);
      dot(ctx, shX + 7, -e.h * 0.54, 3, '#d4a853');
      ctx.lineWidth = 1;

      ctx.save();
      ctx.translate(e.facing * 4, -e.h * 0.45);
      ctx.rotate(e.facing === 1 ? -0.15 : Math.PI + 0.15);
      drawWeaponSprite(ctx, 'ash_halberd', 0.82);
      ctx.restore();
    } else if (e.kind === 'flagellant') {
      // Heavy forged haft + spiked iron-bronze censer greatmace head
      const hx = e.facing * (e.w * 0.45);
      const hy = -e.h + 4;
      ctx.fillStyle = '#3a414d';
      ctx.fillRect(hx - 2.2, hy, 4.4, 36);
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1;
      ctx.strokeRect(hx - 2.2, hy, 4.4, 36);
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        poly(
          ctx,
          [
            hx + Math.cos(a - 0.25) * 6,
            hy + Math.sin(a - 0.25) * 6,
            hx + Math.cos(a) * 13,
            hy + Math.sin(a) * 13,
            hx + Math.cos(a + 0.25) * 6,
            hy + Math.sin(a + 0.25) * 6,
          ],
          '#758090',
          ink,
          0.9
        );
      }
      dot(ctx, hx, hy, 8.5, '#47362b', ink, 1);
      dot(ctx, hx, hy, 3.8, '#ff7b29');
      dot(ctx, hx, hy, 1.6, '#fff0a8');
    } else if (e.kind === 'arbalest') {
      // Repeating heavy steel-prod crossbow
      ctx.fillStyle = '#5c4636';
      ctx.fillRect(e.facing * 4, -e.h * 0.56, e.facing * 23, 4.5);
      ctx.strokeStyle = '#d4dce4';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(e.facing * 21, -e.h * 0.54, 11.5, -1.05, 1.05, e.facing === -1);
      ctx.stroke();
      ctx.lineWidth = 1;
    }

    if (e.kind === 'lancer' || e.kind === 'flagellant' || e.kind === 'arbalest') {
      const eyeX = e.facing === 1 ? e.w * 0.04 : -e.w * 0.24;
      ctx.fillStyle = ink;
      ctx.fillRect(eyeX - 1, -e.h + 6, 9, 4.5);
      ctx.fillStyle = e.state === 'windup' ? '#ff2b44' : '#ff8c3b';
      ctx.fillRect(eyeX, -e.h + 7, 7, 2.5);
    }
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
    for (const [on, col] of [
      [e.burnT > 0, '#ff7b29'],
      [e.chillT > 0, '#7ab8ff'],
      [e.sunderT > 0, '#ffd470'],
      [e.elite === 'armored' && e.sunderT <= 0, '#8ab8e6'],
    ] as const) {
      if (on) {
        ctx.fillStyle = col;
        ctx.fillRect(badgeX, e.y - 22, 5, 4);
        badgeX += 7;
      }
    }
  }
  ctx.globalAlpha = 1;
}
