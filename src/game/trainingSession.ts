import { MELEE_CHARGE_SPEED } from './enemyAI';
import { TRAINING_EXERCISES, type TrainingExerciseId, type TrainingExerciseSnapshot } from './trainingExercises';
import type { Player, Projectile, RoomData } from './types';

export const COURSE_TIME = 20;
export const COURSE_MARKERS = [
  { x: 225, height: 0 },
  { x: 470, height: 78 },
  { x: 745, height: 0 },
] as const;

export type TrainingCombatAction = 'parry' | 'riposte' | 'hitTaken' | 'meleeHit' | 'artHit' | 'perfectDodge';
export type TrainingProjectileAction = 'reflected' | 'artCast' | 'enemyHit' | 'dashContact';

export class TrainingSession {
  readonly target: number;
  progress = 0;
  failed = false;
  remaining = COURSE_TIME;
  private markerContact = -1;
  private dashContacts = 0;
  private dashPerfect = false;
  private artAttack = false;
  private revision = 0;

  constructor(readonly id: TrainingExerciseId) {
    this.target = TRAINING_EXERCISES.find((exercise) => exercise.id === id)!.target;
  }

  get complete(): boolean {
    return this.progress === this.target;
  }

  get version(): number {
    return this.revision;
  }

  private setProgress(progress: number): void {
    if (this.progress === progress) return;
    this.progress = progress;
    this.revision++;
  }

  private fail(): void {
    this.failed = true;
    this.revision++;
  }

  onCombatAction = (action: TrainingCombatAction): void => {
    if (this.complete || this.failed) return;
    if (this.id === 'dodge' && action === 'perfectDodge') {
      this.dashPerfect = true;
      this.revision++;
    }
    if (action === 'hitTaken') {
      if (this.id === 'parry') this.setProgress(0);
      if (this.id === 'riposte') this.fail();
    }
    if ((this.id === 'parry' && action === 'parry') || (this.id === 'riposte' && action === 'riposte')) {
      this.setProgress(this.progress + 1);
    }
    if (this.id === 'art' && (action === 'artHit' || (action === 'meleeHit' && this.artAttack))) {
      this.setProgress(1);
    }
  };

  onProjectileAction = (action: TrainingProjectileAction, shot: Projectile): void => {
    if (this.complete || this.failed) return;
    if (this.id === 'reflect') {
      if (action === 'reflected') {
        shot.trainingOrigin = 'reflection';
        shot.color = '#ffd470';
      }
      if (action === 'enemyHit' && shot.trainingOrigin === 'reflection') this.setProgress(this.progress + 1);
    }
    if (this.id === 'dodge' && action === 'dashContact') {
      this.dashContacts++;
      if (this.dashPerfect && this.dashContacts === 2) this.setProgress(1);
    }
    if (this.id === 'art') {
      if (action === 'artCast') shot.trainingOrigin = 'art';
      if (action === 'enemyHit' && shot.trainingOrigin === 'art') this.setProgress(1);
    }
  };

  beginDash(): void {
    this.dashContacts = 0;
    this.dashPerfect = false;
  }

  setArtAttack(active: boolean): void {
    this.artAttack = active;
  }

  updateCourse(player: Player, groundY: number, dt: number): void {
    if (this.id !== 'movement' || this.complete || this.failed) return;
    this.remaining = Math.max(0, this.remaining - dt);
    if (this.remaining < 1e-9) {
      this.remaining = 0;
      this.fail();
      return;
    }

    const contact = COURSE_MARKERS.findIndex(({ x, height }) => {
      const y = groundY - height;
      return player.x < x + 20 && player.x + player.w > x - 20 && player.y < y && player.y + player.h > y - 52;
    });
    if (contact >= 0 && contact !== this.markerContact) {
      if (contact === this.progress) {
        this.setProgress(this.progress + 1);
      } else {
        this.setProgress(0);
        this.remaining = COURSE_TIME;
        this.revision++;
      }
    }
    this.markerContact = contact;
  }

  private parryWindowOpen(player: Player, room: RoomData, window: number): boolean {
    return room.enemies.some((enemy) => {
      if (enemy.state !== 'windup' && enemy.state !== 'attack') return false;
      if (player.y + player.h <= enemy.y || player.y >= enemy.y + enemy.h) return false;
      const gap = Math.max(player.x - (enemy.x + enemy.w), enemy.x - (player.x + player.w), 0);
      if (enemy.state === 'windup') return enemy.stateT + Math.max(0, gap - 10) / MELEE_CHARGE_SPEED <= window;
      if (gap < 10) return true;
      const towardsPlayer = (player.x + player.w / 2 - enemy.x - enemy.w / 2) * enemy.vx > 0;
      return towardsPlayer && (gap - 10) / Math.abs(enemy.vx) <= Math.min(enemy.stateT, window);
    });
  }

  snapshot(player: Player, room: RoomData, parryWindow: number, criticalReady: boolean, artCost: number): TrainingExerciseSnapshot {
    return {
      id: this.id,
      complete: this.complete,
      progress: this.progress,
      target: this.target,
      failed: this.failed,
      remainingSeconds: this.id === 'movement' ? Math.ceil(this.remaining) : undefined,
      parryWindowOpen: this.id === 'parry' ? this.parryWindowOpen(player, room, parryWindow) : undefined,
      riposteSeconds: this.id === 'riposte' ? Math.ceil(player.riposteBuffT * 10) / 10 : undefined,
      criticalReady: this.id === 'dodge' ? criticalReady : undefined,
      artCost: this.id === 'art' ? artCost : undefined,
    };
  }
}
