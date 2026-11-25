import { getColoredGlow } from './textures';

export function getTorchGlow(): HTMLCanvasElement | null {
  return getColoredGlow('amber');
}

export function drawGroundShadow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  groundY: number,
  radiusX: number,
  alpha = 0.48
): void {
  ctx.fillStyle = `rgba(4, 3, 6, ${alpha})`;
  ctx.beginPath();
  ctx.ellipse(cx, groundY + 1, radiusX, Math.max(3, radiusX * 0.22), 0, 0, Math.PI * 2);
  ctx.fill();
}

export function createHiResStamp(
  w: number,
  h: number
): [HTMLCanvasElement, CanvasRenderingContext2D | null] {
  const c = document.createElement('canvas');
  c.width = w * 2;
  c.height = h * 2;
  const ctx = c.getContext('2d');
  if (ctx) ctx.scale(2, 2);
  return [c, ctx];
}

export function poly(
  ctx: CanvasRenderingContext2D,
  pts: readonly number[],
  fill?: string | CanvasGradient,
  stroke?: string,
  lw = 1.3
): void {
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}

export function mkGrad(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  over: string | null,
  stops: readonly [number, string][]
): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  if (over) {
    g.addColorStop(0, over);
    g.addColorStop(1, over);
  } else {
    for (const [pos, col] of stops) g.addColorStop(pos, col);
  }
  return g;
}

export function dot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  fill?: string | CanvasGradient,
  stroke?: string,
  lw = 1.2
): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
}
