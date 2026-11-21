import { drawAttackWarning, drawDetailedEnemy } from './enemyRender';
import { drawDetailedPlayer } from './playerRender';
import type { PositionInterpolator } from './renderInterpolation';
import { getColoredGlow } from './textures';
import type { ArmorSkinKey, Enemy, Player, RoomData, RunState, WeaponKey } from './types';

export function renderEnemiesAndShadows(
  ctx: CanvasRenderingContext2D,
  room: RoomData,
  player: Player,
  camX: number,
  W: number,
  time: number,
  showEnemyBars: boolean,
  interpolate: PositionInterpolator,
): void {
  const visibleEnemies: Enemy[] = [];
  // 9b. Dynamic Ground Contact Shadows (Anchor characters and bosses to the gothic architecture)
  for (const entity of room.enemies) {
    const e = interpolate(entity);
    if (e.x + e.w < camX - 120 || e.x > camX + W + 120) continue;
    visibleEnemies.push(e);
    if (e.state !== 'dead') {
      drawCharacterGroundShadow(ctx, e.x, e.y, e.w, e.h, room, !!e.flying);
    }
  }
  drawCharacterGroundShadow(ctx, player.x, player.y, player.w, player.h, room, false);

  // 10. Enemies & Bosses
  for (const e of visibleEnemies) {
    drawDetailedEnemy(ctx, e, time, showEnemyBars);
  }
}

export function renderProjectiles(
  ctx: CanvasRenderingContext2D,
  projectiles: RoomData['projectiles'],
  interpolate: PositionInterpolator,
): void {
  // 11. Luminous Projectiles
  for (const entity of projectiles) {
    const pr = interpolate(entity);
    if (pr.kind === 'eruption') {
      if (pr.telegraphT && pr.telegraphT > 0) {
        ctx.strokeStyle = '#ff5a36';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(pr.x, pr.y, pr.r, 8, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 1;
      } else {
        ctx.fillStyle = 'rgba(255, 110, 48, 0.85)';
        ctx.fillRect(pr.x - pr.r * 0.65, pr.y - 115, pr.r * 1.3, 115);
        ctx.fillStyle = '#fff0a8';
        ctx.fillRect(pr.x - pr.r * 0.25, pr.y - 105, pr.r * 0.5, 105);
      }
    } else if (pr.kind === 'crescent') {
      ctx.save();
      ctx.translate(pr.x, pr.y);
      ctx.rotate(Math.atan2(pr.vy, pr.vx));
      ctx.strokeStyle = pr.friendly ? '#ffd470' : '#ff4d63';
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.arc(0, 0, pr.r + 5, -1.1, 1.1);
      ctx.stroke();
      ctx.restore();
    } else {
      const pg = getColoredGlow(pr.friendly ? 'gold' : 'amber');
      if (pg) {
        ctx.globalAlpha = 0.72;
        ctx.drawImage(pg, pr.x - pr.r * 3.5, pr.y - pr.r * 3.5, pr.r * 7, pr.r * 7);
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = pr.friendly ? '#fff0b2' : pr.color;
      ctx.beginPath();
      ctx.arc(pr.x, pr.y, pr.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function renderPlayer(
  ctx: CanvasRenderingContext2D,
  player: Player,
  weapon: WeaponKey,
  run: RunState | null,
  time: number,
  armorSkin?: ArmorSkinKey,
): void {
  // 11b. Pilgrim Cinder Lantern Glow (Subtle warm radiant aura around protagonist)
  const pilgrimAura = getColoredGlow('amber');
  if (pilgrimAura) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const auraPulse = 0.22 + Math.sin(time * 3.2) * 0.04;
    ctx.globalAlpha = auraPulse;
    const auraR = 150;
    ctx.drawImage(
      pilgrimAura,
      Math.round(player.x + player.w * 0.5 - auraR),
      Math.round(player.y + player.h * 0.5 - auraR),
      auraR * 2,
      auraR * 2
    );
    ctx.restore();
  }

  // 12. Articulated Protagonist
  drawDetailedPlayer(
    ctx,
    player,
    weapon,
    !!(run && run.blessings.includes('orbital_wisp')),
    time,
    armorSkin || 'eclipse'
  );
}

export function renderAttackWarnings(
  ctx: CanvasRenderingContext2D,
  enemies: RoomData['enemies'],
  player: Player,
  camX: number,
  W: number,
  highContrast: boolean,
  interpolate: PositionInterpolator,
): void {
  for (const entity of enemies) {
    if (entity.state !== 'windup') continue;
    const enemy = interpolate(entity);
    if (enemy.x + enemy.w < camX - 120 || enemy.x > camX + W + 120) continue;
    drawAttackWarning(ctx, enemy, player, highContrast);
  }
}

/**
 * Projects a soft, dynamic ground contact shadow anchoring characters and enemies to the terrain.
 */
function drawCharacterGroundShadow(
  ctx: CanvasRenderingContext2D,
  charX: number,
  charY: number,
  charW: number,
  charH: number,
  room: RoomData,
  isFlying = false
): void {
  const feetX = charX + charW * 0.5;
  const feetY = charY + charH;
  let groundY = room.groundY;
  let minDiff = groundY - feetY;

  for (const p of room.platforms) {
    if (p.broken) continue;
    if (feetX >= p.x && feetX <= p.x + p.w) {
      const diff = p.y - feetY;
      if (diff >= -8 && diff < minDiff) {
        minDiff = diff;
        groundY = p.y;
      }
    }
  }

  const dist = Math.max(0, groundY - feetY);
  const maxDist = isFlying ? 280 : 180;
  if (dist > maxDist) return;

  const factor = 1 - dist / maxDist;
  const baseAlpha = isFlying ? 0.32 : 0.55;
  const shadowAlpha = baseAlpha * factor;
  const shadowW = Math.max(8, (charW * 0.88 + dist * 0.06) * factor);
  const shadowH = Math.max(2.5, charW * 0.24 * factor);

  ctx.save();
  ctx.fillStyle = `rgba(3, 2, 5, ${shadowAlpha.toFixed(3)})`;
  ctx.beginPath();
  ctx.ellipse(feetX, groundY + 1.2, shadowW * 0.5, shadowH * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
