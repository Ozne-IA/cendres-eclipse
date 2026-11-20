import type { AttackMove, Player } from './types';
import type { VfxSystem } from './vfx';

export function startAttack(player: Player, vfx: VfxSystem, reach: number, move: AttackMove, duration: number): void {
  player.attackMove = move;
  player.attackT = duration;
  player.attackTotalT = duration;
  player.attackHitIds.clear();
  player.squashX = 1.15;
  player.squashY = 0.9;

  const isHeavy = move === 'heavy' || move === 'light3' || move === 'plunge';
  const arcCol =
    move === 'heavy' || move === 'plunge'
      ? '#ff6a1f'
      : move === 'light3' || move === 'dash_strike'
      ? '#ffd470'
      : '#9fd0ff';
  const coreCol = move === 'heavy' ? '#ffe08a' : '#ffffff';
  const cx = player.x + player.w / 2;
  const cy = player.y + 22;
  const radius = reach * 0.8 + (isHeavy ? 14 : 2);
  if (move === 'plunge') {
    vfx.spawnSlashArc(cx, cy + 12, radius * 0.85, 0.15, Math.PI - 0.15, player.facing, arcCol, coreCol, 22, 0.24);
  } else if (move === 'launcher') {
    vfx.spawnSlashArc(cx, cy, radius * 0.9, -1.45, 0.65, player.facing, arcCol, coreCol, 18, 0.22);
  } else {
    vfx.spawnSlashArc(cx, cy, radius, -1.25, 1.15, player.facing, arcCol, coreCol, isHeavy ? 22 : 14, isHeavy ? 0.24 : 0.18);
  }
  vfx.spawnBladeSparks(cx, cy, player.facing, isHeavy ? 14 : 7, arcCol);
  if (move === 'heavy' && player.onGround) {
    vfx.spawnGroundFissure(
      cx + player.facing * 42,
      player.y + player.h,
      68,
      '#ff7b29',
      1.15
    );
  }
}
