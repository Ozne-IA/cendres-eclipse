interface Position {
  x: number;
  y: number;
  angle?: number;
}

export type PositionInterpolator = <T extends Pick<Position, 'x' | 'y'>>(position: T) => T;

export class RenderInterpolation {
  private previous = new WeakMap<Position, Position>();

  capture(position: Position): void {
    let previous = this.previous.get(position);
    if (!previous) {
      previous = { x: position.x, y: position.y };
      this.previous.set(position, previous);
    }
    previous.x = position.x;
    previous.y = position.y;
    previous.angle = position.angle;
  }

  forget(position: Position): void {
    this.previous.delete(position);
  }

  clear(): void {
    this.previous = new WeakMap();
  }

  interpolate<T extends Position>(current: T, alpha: number): T {
    const previous = this.previous.get(current);
    if (!previous || alpha === 1) return current;
    const x = previous.x + (current.x - previous.x) * alpha;
    const y = previous.y + (current.y - previous.y) * alpha;
    if (previous.angle !== undefined && current.angle !== undefined && previous.angle !== current.angle) {
      const angle = previous.angle + (current.angle - previous.angle) * alpha;
      return { ...current, x, y, angle };
    }
    return x === current.x && y === current.y ? current : { ...current, x, y };
  }
}
