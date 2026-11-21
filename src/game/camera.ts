import type { Player, RoomData } from './types';

export class RoomCamera {
  x = 0;
  y = 0;

  reset(): void {
    this.x = 0;
    this.y = 0;
  }

  follow(
    player: Pick<Player, 'x' | 'y' | 'w' | 'h'>,
    room: Pick<RoomData, 'width' | 'height'>,
    width: number,
    height: number,
    dt: number
  ): void {
    const targetCamX = Math.max(0, Math.min(room.width - width, player.x + player.w / 2 - width * 0.42));
    const targetCamY = Math.max(0, Math.min(room.height - height, player.y + player.h / 2 - height * 0.56));
    this.x += (targetCamX - this.x) * Math.min(1, dt * 8);
    this.y += (targetCamY - this.y) * Math.min(1, dt * 8);
  }
}
